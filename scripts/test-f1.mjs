import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeF1Data } from './sync-f1.mjs';

let checks = 0;

// 1. Snapshot JSON validity
const snapshot = JSON.parse(await readFile(new URL('../src/data/f1-snapshot.json', import.meta.url), 'utf8'));
assert.equal(snapshot.season, '2026');
assert.equal(snapshot.drivers.length, 4);
assert.equal(snapshot.constructors.length, 4);
assert(snapshot.nextRace?.name.includes('Qatar'));
checks++;

// 2. Normalize mocked Jolpica payload mid-season
const schedule = {
  MRData: {
    RaceTable: {
      season: '2026',
      Races: [
        { round: '21', raceName: 'Las Vegas Grand Prix', date: '2026-11-21', time: '04:00:00Z', Circuit: { circuitName: 'Las Vegas Strip Circuit', Location: { locality: 'Las Vegas', country: 'USA' } } },
        { round: '22', raceName: 'Qatar Grand Prix', date: '2026-11-29', time: '16:00:00Z', Circuit: { circuitName: 'Lusail International Circuit', Location: { locality: 'Al Daayen', country: 'Qatar' } } },
        { round: '23', raceName: 'Abu Dhabi Grand Prix', date: '2026-12-06', time: '13:00:00Z', Circuit: { circuitName: 'Yas Marina Circuit', Location: { locality: 'Abu Dhabi', country: 'UAE' } } },
      ],
    },
  },
};
const drivers = {
  MRData: {
    StandingsTable: {
      StandingsLists: [{
        round: '21',
        DriverStandings: [
          { position: '1', points: '402', Driver: { code: 'ANT', givenName: 'Kimi', familyName: 'Antonelli' }, Constructors: [{ name: 'Mercedes' }] },
          { position: '2', points: '304', Driver: { code: 'VER', givenName: 'Max', familyName: 'Verstappen' }, Constructors: [{ name: 'Red Bull' }] },
        ],
      }],
    },
  },
};
const constructors = {
  MRData: {
    StandingsTable: {
      StandingsLists: [{
        round: '21',
        ConstructorStandings: [
          { position: '1', points: '666', Constructor: { name: 'Mercedes' } },
          { position: '2', points: '517', Constructor: { name: 'Ferrari' } },
          { position: '3', points: '440', Constructor: { name: 'Red Bull' } },
        ],
      }],
    },
  },
};

const normalized = normalizeF1Data(schedule, drivers, constructors, Date.parse('2026-11-27T12:00:00Z'));
assert.equal(normalized.nextRace.round, 22);
assert.equal(normalized.nextRace.name, 'Qatar Grand Prix');
assert.equal(normalized.roundCompleted, 21);
assert.equal(normalized.totalRounds, 3);
assert.equal(normalized.drivers[1].code, 'VER');
assert.equal(normalized.drivers[1].points, 304);
assert.equal(normalized.constructors[2].name, 'Red Bull');
checks++;

// 3. End-of-season handles null nextRace gracefully
const offSeason = normalizeF1Data(schedule, drivers, constructors, Date.parse('2026-12-20T12:00:00Z'));
assert.equal(offSeason.nextRace, null);
assert.equal(offSeason.roundCompleted, 21);
checks++;

// 4. Empty upstream payload stays safe
const empty = normalizeF1Data({}, {}, {}, Date.parse('2026-11-27T12:00:00Z'));
assert.deepEqual(empty.drivers, []);
assert.deepEqual(empty.constructors, []);
assert.equal(empty.nextRace, null);
checks++;

console.log(`${checks} F1 sync checks passed; Jolpica-F1 responses mocked, no live network call.`);
