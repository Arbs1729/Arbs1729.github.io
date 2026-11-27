#!/usr/bin/env node
/**
 * Scheduled / build-time AniList snapshot generator for https://anilist.co/user/arbs42/
 *
 * Usage:
 *   node scripts/sync-anilist.mjs
 *   ANILIST_USER=arbs42 node scripts/sync-anilist.mjs
 *
 * Writes normalized JSON to src/data/anilist-snapshot.json so Astro renders
 * zero-flash SSR data even offline, while public/anilist.js handles live client SWR.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USER = (process.env.ANILIST_USER || 'arbs42').trim();
const ENDPOINT = 'https://graphql.anilist.co';
const OUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/anilist-snapshot.json');

const QUERY = `
query ($name: String!) {
  User(name: $name) {
    siteUrl
    statistics {
      anime {
        count
        episodesWatched
        meanScore
      }
    }
    favourites {
      anime(page: 1, perPage: 15) {
        nodes {
          id
          siteUrl
          format
          episodes
          seasonYear
          averageScore
          title { english romaji }
          coverImage { large medium color }
        }
      }
    }
  }
  watching: MediaListCollection(userName: $name, type: ANIME, status: CURRENT, sort: UPDATED_TIME_DESC) {
    lists {
      entries {
        score(format: POINT_10_DECIMAL)
        progress
        updatedAt
        media {
          id
          siteUrl
          format
          episodes
          seasonYear
          title { english romaji }
          coverImage { large medium color }
        }
      }
    }
  }
  completed: MediaListCollection(userName: $name, type: ANIME, status: COMPLETED, sort: SCORE_DESC) {
    lists {
      entries {
        score(format: POINT_10_DECIMAL)
        media {
          id
          siteUrl
          format
          episodes
          seasonYear
          title { english romaji }
          coverImage { large medium color }
        }
      }
    }
  }
}`;

const safeHttps = url => (typeof url === 'string' && /^https:\/\//i.test(url) ? url : '');
const mapFormat = fmt => (fmt === 'MOVIE' ? 'Film' : 'Series');

function flattenEntries(collection) {
  const seen = new Set();
  const out = [];
  for (const list of collection?.lists || []) {
    for (const entry of list?.entries || []) {
      const id = entry?.media?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(entry);
    }
  }
  return out;
}

function toCard(media, extra = {}) {
  return {
    id: media.id,
    title: media.title?.english || media.title?.romaji || 'Untitled',
    format: mapFormat(media.format),
    episodes: media.episodes || null,
    year: media.seasonYear || null,
    url: safeHttps(media.siteUrl) || `https://anilist.co/anime/${media.id}/`,
    cover: safeHttps(media.coverImage?.large || media.coverImage?.medium),
    ...extra,
  };
}

async function run() {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { name: USER } }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const { data, errors } = await res.json();
  if (errors?.length && !data?.User) throw new Error(errors[0].message);

  const watchingEntries = flattenEntries(data.watching);
  const completedEntries = flattenEntries(data.completed);
  const scoreById = new Map();
  for (const e of [...completedEntries, ...watchingEntries]) {
    if (e.score > 0 && !scoreById.has(e.media.id)) scoreById.set(e.media.id, e.score);
  }

  const watching = watchingEntries.map(e => toCard(e.media, {
    score: e.score || null,
    progress: e.progress || 0,
    updatedAt: e.updatedAt || null,
  }));

  const favorites = (data.User?.favourites?.anime?.nodes || []).map(node => toCard(node, {
    score: scoreById.get(node.id) ?? (node.averageScore ? Number((node.averageScore / 10).toFixed(1)) : null),
  }));

  const topRated = completedEntries
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(e => toCard(e.media, { score: e.score }));

  const snapshot = {
    user: USER,
    profileUrl: safeHttps(data.User?.siteUrl) || `https://anilist.co/user/${USER}/`,
    syncedAt: new Date().toISOString(),
    stats: {
      count: data.User?.statistics?.anime?.count ?? 0,
      episodesWatched: data.User?.statistics?.anime?.episodesWatched ?? 0,
      meanScore: data.User?.statistics?.anime?.meanScore ?? 0,
    },
    watching,
    favorites,
    topRated,
  };

  await writeFile(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`Synced @${USER}: ${watching.length} watching, ${favorites.length} favorites, ${topRated.length} top rated -> ${OUT_PATH}`);
}

run().catch(err => {
  console.error('AniList sync failed:', err.message);
  process.exit(1);
});
