#!/usr/bin/env node
/**
 * Keyless Calendly Public Availability Sync for https://calendly.com/aryanbasantani1729/let-s-chat
 *
 * Fetches real available days and time slots from Calendly's public scheduling range API
 * (works on Calendly Free — no paid API token required) and writes normalized JSON to
 * src/data/calendly-snapshot.json for instant, zero-flash rendering in InlineBooking.astro.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BOOKING_URL = (process.env.CALENDLY_BOOKING_URL || 'https://calendly.com/aryanbasantani1729/let-s-chat').trim();
const TIMEZONE = (process.env.CALENDLY_TIMEZONE || 'Asia/Kolkata').trim();
const DAYS_AHEAD = Math.min(60, Math.max(14, Number(process.env.CALENDLY_DAYS_AHEAD) || 45));
const OUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/calendly-snapshot.json');

export function parseBookingSlugs(urlStr) {
  const parsed = new URL(urlStr);
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts.length < 2) throw new Error(`Invalid Calendly booking URL: ${urlStr}`);
  return { profileSlug: parts[0], eventTypeSlug: parts[1] };
}

export function normalizeCalendlyRange(rangeJson, bookingUrl) {
  const days = Array.isArray(rangeJson?.days) ? rangeJson.days : [];
  const base = bookingUrl.replace(/\/+$/, '');
  const slots = [];
  for (const day of days) {
    if (!day || day.status !== 'available' || !Array.isArray(day.spots)) continue;
    for (const spot of day.spots) {
      if (!spot || (spot.status && spot.status !== 'available') || spot.invitees_remaining === 0) continue;
      if (typeof spot.start_time !== 'string' || !Number.isFinite(Date.parse(spot.start_time))) continue;
      slots.push({
        startTime: spot.start_time,
        schedulingUrl: `${base}/${encodeURIComponent(spot.start_time)}`,
      });
    }
  }
  slots.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  return slots;
}

export async function fetchPublicCalendlySlots(bookingUrl, { timezone = 'Asia/Kolkata', daysAhead = 45, fetchImpl = fetch } = {}) {
  const { profileSlug, eventTypeSlug } = parseBookingSlugs(bookingUrl);
  const lookupUrl = `https://calendly.com/api/booking/event_types/lookup?event_type_slug=${encodeURIComponent(eventTypeSlug)}&profile_slug=${encodeURIComponent(profileSlug)}`;
  const lookupRes = await fetchImpl(lookupUrl, {
    headers: { Accept: 'application/json', 'User-Agent': 'aryanbasantani.me-sync/1.0' },
    signal: AbortSignal.timeout(12000),
  });
  if (!lookupRes.ok) throw new Error(`Calendly lookup failed (${lookupRes.status})`);
  const lookupData = await lookupRes.json();
  const uuid = lookupData?.uuid;
  if (!uuid || typeof uuid !== 'string') throw new Error('Calendly event UUID missing from lookup response');

  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 86_400_000);
  const rangeStart = now.toISOString().slice(0, 10);
  const rangeEnd = end.toISOString().slice(0, 10);

  const rangeUrl = `https://calendly.com/api/booking/event_types/${encodeURIComponent(uuid)}/calendar/range?timezone=${encodeURIComponent(timezone)}&diagnostics=false&range_start=${rangeStart}&range_end=${rangeEnd}`;
  const rangeRes = await fetchImpl(rangeUrl, {
    headers: { Accept: 'application/json', 'User-Agent': 'aryanbasantani.me-sync/1.0' },
    signal: AbortSignal.timeout(12000),
  });
  if (!rangeRes.ok) throw new Error(`Calendly range fetch failed (${rangeRes.status})`);
  const rangeData = await rangeRes.json();

  return {
    syncedAt: new Date().toISOString(),
    bookingUrl: bookingUrl.replace(/\/+$/, ''),
    timezone,
    slots: normalizeCalendlyRange(rangeData, bookingUrl),
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const snapshot = await fetchPublicCalendlySlots(BOOKING_URL, { timezone: TIMEZONE, daysAhead: DAYS_AHEAD });
  await writeFile(OUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`Synced ${snapshot.slots.length} real Calendly slots to ${OUT_PATH}`);
}
