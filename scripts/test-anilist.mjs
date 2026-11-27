import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import '../public/anilist.js';

const anilist = globalThis.AryanAniList;
assert(anilist, 'Expected public/anilist.js to attach globalThis.AryanAniList');

let passed = 0;
function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
    })
    .catch(err => {
      console.error(`FAIL: ${name}`);
      throw err;
    });
}

function makeMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    _map: map,
  };
}

const sampleGraphQLResponse = {
  data: {
    User: {
      siteUrl: 'https://anilist.co/user/arbs42',
      statistics: {
        anime: {
          count: 112,
          episodesWatched: 3420,
          meanScore: 84.64,
        },
      },
      favourites: {
        anime: {
          nodes: [
            {
              id: 813,
              siteUrl: 'https://anilist.co/anime/813',
              format: 'TV',
              episodes: 291,
              seasonYear: 1989,
              averageScore: 80,
              title: { english: 'Dragon Ball Z', romaji: 'Dragon Ball Z' },
              coverImage: { large: 'https://s4.anilist.co/file/dbz-l.png', medium: 'https://s4.anilist.co/file/dbz-m.png', color: '#e47825' },
            },
            {
              id: 21,
              siteUrl: 'https://anilist.co/anime/21',
              format: 'TV',
              episodes: null,
              seasonYear: 1999,
              averageScore: 88,
              title: { english: null, romaji: 'ONE PIECE' },
              coverImage: { large: 'https://s4.anilist.co/file/op-l.png', medium: 'https://s4.anilist.co/file/op-m.png', color: 'javascript:bad' },
            },
            {
              id: 9999,
              siteUrl: 'https://anilist.co/anime/9999',
              format: 'MOVIE',
              episodes: 1,
              seasonYear: 2001,
              averageScore: 86,
              title: { english: 'Spirited Away', romaji: 'Sen to Chihiro' },
              coverImage: { large: 'https://s4.anilist.co/file/sa-l.png', medium: '', color: '#123abc' },
            },
            // Duplicate favorite should be deduped
            {
              id: 813,
              siteUrl: 'https://anilist.co/anime/813',
              format: 'TV',
              episodes: 291,
              seasonYear: 1989,
              averageScore: 80,
              title: { english: 'Dragon Ball Z', romaji: 'Dragon Ball Z' },
              coverImage: { large: 'https://s4.anilist.co/file/dbz-l.png', medium: '', color: '#e47825' },
            },
          ],
        },
      },
    },
    watching: {
      lists: [
        {
          entries: [
            {
              score: 8.5,
              progress: 14,
              updatedAt: 1700000100,
              media: {
                id: 154587,
                siteUrl: 'https://anilist.co/anime/154587',
                format: 'TV',
                episodes: 28,
                seasonYear: 2023,
                title: { english: 'Frieren: Beyond Journey’s End', romaji: 'Sousou no Frieren' },
                coverImage: { large: 'https://s4.anilist.co/file/frieren.jpg', medium: '', color: '#abc' },
              },
            },
            {
              score: 9,
              progress: 1120,
              updatedAt: 1700000500,
              media: {
                id: 21,
                siteUrl: 'https://anilist.co/anime/21',
                format: 'TV',
                episodes: null,
                seasonYear: 1999,
                title: { english: null, romaji: 'ONE PIECE' },
                coverImage: { large: 'https://s4.anilist.co/file/op-l.png', medium: '', color: '#112233' },
              },
            },
          ],
        },
        // Split custom list containing duplicate watching entry with newer updatedAt & higher progress
        {
          entries: [
            {
              score: 9.5,
              progress: 21,
              updatedAt: 1700000900,
              media: {
                id: 154587,
                siteUrl: 'https://anilist.co/anime/154587',
                format: 'TV',
                episodes: 28,
                seasonYear: 2023,
                title: { english: 'Frieren: Beyond Journey’s End', romaji: 'Sousou no Frieren' },
                coverImage: { large: 'https://s4.anilist.co/file/frieren.jpg', medium: '', color: '#abc' },
              },
            },
          ],
        },
      ],
    },
    completed: {
      lists: [
        {
          entries: [
            {
              score: 9.5,
              media: {
                id: 813,
                siteUrl: 'https://anilist.co/anime/813',
                format: 'TV',
                episodes: 291,
                seasonYear: 1989,
                title: { english: 'Dragon Ball Z', romaji: 'Dragon Ball Z' },
                coverImage: { large: 'https://s4.anilist.co/file/dbz-l.png', medium: '', color: '#e47825' },
              },
            },
            {
              score: 10,
              media: {
                id: 578,
                siteUrl: 'https://anilist.co/anime/578',
                format: 'MOVIE',
                episodes: 1,
                seasonYear: 1988,
                title: { english: 'Grave of the Fireflies', romaji: 'Hotaru no Haka' },
                coverImage: { large: 'https://s4.anilist.co/file/gotf.jpg', medium: '', color: '#222222' },
              },
            },
          ],
        },
        // Split custom list with duplicate DBZ entry having lower score (should keep higher 9.5)
        {
          entries: [
            {
              score: 8,
              media: {
                id: 813,
                siteUrl: 'https://anilist.co/anime/813',
                format: 'TV',
                episodes: 291,
                seasonYear: 1989,
                title: { english: 'Dragon Ball Z', romaji: 'Dragon Ball Z' },
                coverImage: { large: 'https://s4.anilist.co/file/dbz-l.png', medium: '', color: '#e47825' },
              },
            },
            // Unscored completed item should be omitted when scored items exist
            {
              score: 0,
              media: {
                id: 777,
                siteUrl: 'https://anilist.co/anime/777',
                format: 'OVA',
                episodes: 2,
                seasonYear: 2010,
                title: { english: 'Unscored OVA', romaji: 'Unscored OVA' },
                coverImage: { large: 'https://s4.anilist.co/file/ova.jpg', medium: '', color: '#333333' },
              },
            },
          ],
        },
      ],
    },
  },
};

await check('GraphQL response parsing & normalization', () => {
  const normalized = anilist.normalizeAniListPayload(sampleGraphQLResponse, 'arbs42', 1700001000000);
  assert.equal(normalized.user.name, 'arbs42');
  assert.equal(normalized.user.siteUrl, 'https://anilist.co/user/arbs42');
  assert.equal(normalized.user.animeCount, 112);
  assert.equal(normalized.user.episodesWatched, 3420);
  assert.equal(normalized.user.meanScore, 84.6);

  // Top rated sorted by score DESC, Film vs Series mapped properly, unscored filtered out
  assert.equal(normalized.topRated.length, 2);
  assert.equal(normalized.topRated[0].title, 'Grave of the Fireflies');
  assert.equal(normalized.topRated[0].score, 10);
  assert.equal(normalized.topRated[0].format, 'Film');
  assert.equal(normalized.topRated[1].title, 'Dragon Ball Z');
  assert.equal(normalized.topRated[1].score, 9.5);
  assert.equal(normalized.topRated[1].format, 'Series');
});

await check('Deduplication across split lists (watching + completed + favorites)', () => {
  const normalized = anilist.normalizeAniListPayload(sampleGraphQLResponse, 'arbs42');
  // Watching: Frieren deduped to newer updatedAt (1700000900, progress 21), sorted ahead of One Piece (1700000500)
  assert.equal(normalized.watching.length, 2);
  assert.equal(normalized.watching[0].id, 154587);
  assert.equal(normalized.watching[0].progress, 21);
  assert.equal(normalized.watching[0].progressPercent, 75);
  assert.equal(normalized.watching[0].progressLabel, 'EP 21 / 28');
  assert.equal(normalized.watching[1].id, 21);
  assert.equal(normalized.watching[1].title, 'ONE PIECE');
  assert.equal(normalized.watching[1].progressPercent, null);
  assert.equal(normalized.watching[1].progressLabel, 'EP 1120');

  // Favorites deduped
  assert.equal(normalized.favorites.length, 3);
});

await check('Favorite score enrichment from completed and watching lists', () => {
  const normalized = anilist.normalizeAniListPayload(sampleGraphQLResponse, 'arbs42');
  const dbz = normalized.favorites.find(item => item.id === 813);
  const op = normalized.favorites.find(item => item.id === 21);
  const spirited = normalized.favorites.find(item => item.id === 9999);
  assert.equal(dbz.score, 9.5, 'Favorite completed score should enrich from completed list');
  assert.equal(op.score, 9, 'Favorite watching score should fall back to watching list');
  assert.equal(spirited.score, null, 'Unlisted favorite should stay null personal score');
  assert.equal(op.coverColor, '', 'Invalid CSS color string must be rejected');
});

await check('Episode progress percentage clamping', () => {
  assert.equal(anilist.computeProgressPercent(0, 12), 0);
  assert.equal(anilist.computeProgressPercent(6, 12), 50);
  assert.equal(anilist.computeProgressPercent(12, 12), 100);
  assert.equal(anilist.computeProgressPercent(25, 12), 100, 'Overflow progress must clamp at 100');
  assert.equal(anilist.computeProgressPercent(-5, 12), 0, 'Negative progress must clamp at 0');
  assert.equal(anilist.computeProgressPercent(10, null), null, 'Unknown episode count returns null percent');
  assert.equal(anilist.computeProgressPercent(10, 0), null, 'Zero episode count returns null percent');
  assert.equal(anilist.formatProgressLabel(-3, 24), 'EP 0 / 24');
  assert.equal(anilist.formatProgressLabel(42, null), 'EP 42');
});

await check('HTTPS-only URL and color sanitization', () => {
  assert.equal(anilist.sanitizeUrl('https://anilist.co/user/arbs42/'), 'https://anilist.co/user/arbs42/');
  assert.equal(anilist.sanitizeUrl('http://anilist.co/anime/1'), '');
  assert.equal(anilist.sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(anilist.sanitizeUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(anilist.sanitizeUrl('//evil.example/img.png'), '');
  assert.equal(anilist.sanitizeUrl('https://user:pass@anilist.co/anime/1'), '');
  assert.equal(anilist.sanitizeUrl('https://anilist.co/a\nb'), '');
  assert.equal(anilist.sanitizeUrl(null), '');

  assert.equal(anilist.sanitizeColor('#e47825'), '#e47825');
  assert.equal(anilist.sanitizeColor('#abc'), '#abc');
  assert.equal(anilist.sanitizeColor('red; background:url(javascript:1)'), '');

  // Malicious URLs inside GraphQL media payload get stripped/replaced safely
  const malicious = anilist.normalizeAniListPayload({
    data: {
      User: { siteUrl: 'javascript:alert(1)', statistics: { anime: { count: 1, episodesWatched: 1 } }, favourites: { anime: { nodes: [] } } },
      watching: { lists: [] },
      completed: {
        lists: [{
          entries: [{
            score: 10,
            media: {
              id: 42,
              siteUrl: 'javascript:evil()',
              format: 'TV',
              title: { english: '<img src=x onerror=alert(1)>' },
              coverImage: { large: 'http://insecure.example/a.jpg', medium: 'data:image/svg+xml,<svg/>', color: 'expression(1)' },
            },
          }],
        }],
      },
    },
  }, 'arbs42');
  assert.equal(malicious.user.siteUrl, 'https://anilist.co/user/arbs42/');
  assert.equal(malicious.topRated[0].url, 'https://anilist.co/anime/42/');
  assert.equal(malicious.topRated[0].cover, '');
  assert.equal(malicious.topRated[0].coverColor, '');
});

await check('Cache key, fresh cache hit, stale-while-revalidate, and force refresh', async () => {
  assert.equal(anilist.cacheKeyFor('arbs42'), 'aryan-anilist-arbs42-v1');
  const storage = makeMemoryStorage();
  const baseTime = 1700000000000;
  let fetchCalls = 0;

  const mockFetch = async (url, options) => {
    fetchCalls++;
    assert.equal(url, 'https://graphql.anilist.co');
    assert.equal(options.method, 'POST');
    const body = JSON.parse(options.body);
    assert.equal(body.variables.name, 'arbs42');
    return Response.json(sampleGraphQLResponse);
  };

  // Cold fetch populates cache
  const first = await anilist.loadAniListData({ userName: 'arbs42', storage, fetchImpl: mockFetch, now: baseTime });
  assert.equal(first.source, 'live');
  assert.equal(fetchCalls, 1);
  assert(storage.getItem('aryan-anilist-arbs42-v1'), 'Expected localStorage cache write');

  // Fresh cache hit within 30-minute TTL makes zero network requests
  const cached = anilist.readCache('arbs42', storage, baseTime + 5 * 60 * 1000);
  assert(cached && cached.fresh);
  assert.equal(cached.fetchedAt, baseTime);
  const second = await anilist.loadAniListData({
    userName: 'arbs42',
    storage,
    fetchImpl: async () => { throw new Error('Should not fetch while cache is fresh'); },
    now: baseTime + 5 * 60 * 1000,
  });
  assert.equal(second.source, 'cache');
  assert.equal(second.stale, false);

  // Stale cache (>30m) emits onStaleData immediately then refreshes live
  let staleDelivered = false;
  const third = await anilist.loadAniListData({
    userName: 'arbs42',
    storage,
    fetchImpl: mockFetch,
    now: baseTime + anilist.CACHE_TTL_MS + 1000,
    onStaleData: staleData => {
      staleDelivered = staleData.user.name === 'arbs42';
    },
  });
  assert.equal(staleDelivered, true, 'Expected stale-while-revalidate callback');
  assert.equal(third.source, 'live');
  assert.equal(fetchCalls, 2);

  // Manual force refresh bypasses fresh cache
  const forced = await anilist.loadAniListData({
    userName: 'arbs42',
    storage,
    fetchImpl: mockFetch,
    force: true,
    now: Date.now(),
  });
  assert.equal(forced.source, 'live');
  assert.equal(fetchCalls, 3);
});

await check('Offline fallback (no cache + stale cache fallback + GraphQL errors)', async () => {
  const emptyStorage = makeMemoryStorage();
  const offline = await anilist.loadAniListData({
    userName: 'arbs42',
    storage: emptyStorage,
    fetchImpl: async () => { throw new Error('Network unreachable'); },
  });
  assert.equal(offline.data, null);
  assert.equal(offline.source, 'offline-fallback');

  // Stale cache falls back gracefully when live fetch fails
  const staleStorage = makeMemoryStorage();
  const seed = anilist.normalizeAniListPayload(sampleGraphQLResponse, 'arbs42', 1000);
  anilist.writeCache('arbs42', seed, staleStorage, 1000);
  const staleFallback = await anilist.loadAniListData({
    userName: 'arbs42',
    storage: staleStorage,
    fetchImpl: async () => new Response('Rate limited', { status: 429 }),
    now: 1000 + anilist.CACHE_TTL_MS + 5000,
  });
  assert.equal(staleFallback.source, 'cache-fallback');
  assert.equal(staleFallback.stale, true);
  assert.equal(staleFallback.data.user.name, 'arbs42');

  // GraphQL error-only response throws on normalize
  assert.throws(() => anilist.normalizeAniListPayload({ errors: [{ message: 'User not found' }] }, 'missing'));
});

await check('Strict XSS-safe DOM hygiene (no innerHTML in public/anilist.js)', async () => {
  const source = await readFile(new URL('../public/anilist.js', import.meta.url), 'utf8');
  assert(!/\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/.test(source), 'public/anilist.js must never use innerHTML or similar unsafe sinks');
});

console.log(`${passed} AniList checks passed; GraphQL responses mocked, no live network call.`);
