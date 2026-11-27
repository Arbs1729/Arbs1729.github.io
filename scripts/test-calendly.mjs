import assert from 'node:assert/strict';
import { parseBookingSlugs, normalizeCalendlyRange, fetchPublicCalendlySlots } from './sync-calendly.mjs';

// 1. Parse slugs from Calendly URL
const slugs = parseBookingSlugs('https://calendly.com/aryanbasantani1729/let-s-chat');
assert.deepEqual(slugs, { profileSlug: 'aryanbasantani1729', eventTypeSlug: 'let-s-chat' });

// 2. Normalize range payload: skips unavailable days/spots and builds direct slot URLs
const normalized = normalizeCalendlyRange({
  days: [
    { date: '2026-12-01', status: 'unavailable', spots: [] },
    {
      date: '2026-12-02',
      status: 'available',
      spots: [
        { status: 'available', start_time: '2026-12-02T20:00:00+05:30', invitees_remaining: 1 },
        { status: 'unavailable', start_time: '2026-12-02T20:30:00+05:30', invitees_remaining: 0 },
        { status: 'available', start_time: '2026-12-02T19:30:00+05:30', invitees_remaining: 1 },
      ],
    },
  ],
}, 'https://calendly.com/aryanbasantani1729/let-s-chat');

assert.equal(normalized.length, 2);
assert.equal(normalized[0].startTime, '2026-12-02T19:30:00+05:30');
assert.equal(
  normalized[0].schedulingUrl,
  'https://calendly.com/aryanbasantani1729/let-s-chat/2026-12-02T19%3A30%3A00%2B05%3A30',
);

// 3. Full mocked fetchPublicCalendlySlots round-trip
let calls = 0;
const mockFetch = async url => {
  calls += 1;
  if (url.includes('/event_types/lookup')) {
    return new Response(JSON.stringify({ uuid: 'evt-uuid-123' }), { status: 200 });
  }
  if (url.includes('/evt-uuid-123/calendar/range')) {
    return new Response(JSON.stringify({
      days: [{
        date: '2026-12-03',
        status: 'available',
        spots: [{ status: 'available', start_time: '2026-12-03T19:30:00+05:30', invitees_remaining: 1 }],
      }],
    }), { status: 200 });
  }
  return new Response('Not found', { status: 404 });
};

const snap = await fetchPublicCalendlySlots('https://calendly.com/aryanbasantani1729/let-s-chat', { fetchImpl: mockFetch });
assert.equal(calls, 2);
assert.equal(snap.slots.length, 1);
assert.equal(snap.slots[0].startTime, '2026-12-03T19:30:00+05:30');

console.log('4 Calendly public sync checks passed; responses mocked, no live network call.');
