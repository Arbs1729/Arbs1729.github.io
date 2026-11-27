#!/usr/bin/env node
/**
 * Scheduled / build-time Formula 1 sync script powered by the free keyless Jolpica-F1 API.
 * Recommended schedule on GitHub Pro: twice weekly (Monday post-race + Friday pre-weekend).
 *
 * Usage:
 *   node scripts/sync-f1.mjs
 */
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://api.jolpi.ca/ergast/f1/current';
const OUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/f1-snapshot.json');

export function normalizeF1Data(scheduleJson, driversJson, constructorsJson, nowMs = Date.now()) {
  const raceTable = scheduleJson?.MRData?.RaceTable;
  const races = Array.isArray(raceTable?.Races) ? raceTable.Races : [];
  const season = String(raceTable?.season || new Date(nowMs).getUTCFullYear());
  const totalRounds = races.length;

  let nextRace = null;
  let completedByDate = 0;
  for (const race of races) {
    const iso = `${race.date}T${race.time || '14:00:00Z'}`;
    const ts = Date.parse(iso);
    if (Number.isFinite(ts) && ts + 3 * 3600_000 >= nowMs) {
      if (!nextRace) {
        nextRace = {
          round: Number(race.round) || completedByDate + 1,
          name: String(race.raceName || 'Grand Prix'),
          circuit: String(race.Circuit?.circuitName || ''),
          locality: String(race.Circuit?.Location?.locality || ''),
          country: String(race.Circuit?.Location?.country || ''),
          date: String(race.date || ''),
          time: String(race.time || '14:00:00Z'),
        };
      }
    } else if (Number.isFinite(ts)) {
      completedByDate++;
    }
  }

  const dList = driversJson?.MRData?.StandingsTable?.StandingsLists?.[0];
  const cList = constructorsJson?.MRData?.StandingsTable?.StandingsLists?.[0];
  const roundCompleted = Number(dList?.round || cList?.round || completedByDate) || 0;

  const drivers = (dList?.DriverStandings || []).slice(0, 4).map((entry, idx) => ({
    pos: Number(entry.position) || idx + 1,
    code: String(entry.Driver?.code || entry.Driver?.familyName?.slice(0, 3) || 'DRV').toUpperCase(),
    name: `${entry.Driver?.givenName || ''} ${entry.Driver?.familyName || ''}`.trim() || 'Driver',
    team: String(entry.Constructors?.[0]?.name || ''),
    points: Number(entry.points) || 0,
  }));

  const constructors = (cList?.ConstructorStandings || []).slice(0, 4).map((entry, idx) => ({
    pos: Number(entry.position) || idx + 1,
    name: String(entry.Constructor?.name || 'Team'),
    points: Number(entry.points) || 0,
  }));

  return {
    season,
    syncedAt: new Date(nowMs).toISOString(),
    roundCompleted,
    totalRounds: totalRounds || Math.max(roundCompleted, 24),
    nextRace,
    drivers,
    constructors,
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  const [schedule, drivers, constructors] = await Promise.all([
    fetchJson(`${BASE}.json`),
    fetchJson(`${BASE}/driverstandings.json`),
    fetchJson(`${BASE}/constructorstandings.json`),
  ]);
  const snapshot = normalizeF1Data(schedule, drivers, constructors);
  await writeFile(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`Synced F1 ${snapshot.season} (R${snapshot.roundCompleted}/${snapshot.totalRounds}) -> ${OUT_PATH}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(err => {
    console.error('F1 sync failed:', err.message);
    process.exit(1);
  });
}
