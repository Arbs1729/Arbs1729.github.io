(() => {
  const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
  const CACHE_TTL_MS = 30 * 60 * 1000;
  const MAX_TOP_RATED = 24;
  const DEFAULT_USER = 'arbs42';

  const QUERY = `query ($name: String!) {
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
          title {
            english
            romaji
          }
          coverImage {
            large
            medium
            color
          }
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
          title {
            english
            romaji
          }
          coverImage {
            large
            medium
            color
          }
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
          title {
            english
            romaji
          }
          coverImage {
            large
            medium
            color
          }
        }
      }
    }
  }
}`;

  const FORMAT_LABELS = {
    MOVIE: 'Film',
    TV: 'Series',
    TV_SHORT: 'Series · Short',
    OVA: 'Series · OVA',
    ONA: 'Series · ONA',
    SPECIAL: 'Series · Special',
    MUSIC: 'Series · Music',
  };

  function sanitizeUserName(value) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return /^[a-zA-Z0-9_-]{1,40}$/.test(trimmed) ? trimmed : DEFAULT_USER;
  }

  function cacheKeyFor(userName = DEFAULT_USER) {
    return `aryan-anilist-${sanitizeUserName(userName).toLowerCase()}-v1`;
  }

  function sanitizeUrl(value) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed || /[\u0000-\u001f\u007f]/.test(trimmed)) return '';
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:') return '';
      if (parsed.username || parsed.password) return '';
      return parsed.href;
    } catch {
      return '';
    }
  }

  function sanitizeColor(value) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : '';
  }

  function pickTitle(titleObj) {
    const english = typeof titleObj?.english === 'string' ? titleObj.english.trim() : '';
    const romaji = typeof titleObj?.romaji === 'string' ? titleObj.romaji.trim() : '';
    return english || romaji || 'Untitled';
  }

  function formatLabel(rawFormat) {
    return FORMAT_LABELS[rawFormat] || 'Series';
  }

  function formatCategory(rawFormat) {
    return rawFormat === 'MOVIE' ? 'Film' : 'Series';
  }

  function normalizeScore(rawScore) {
    const num = Number(rawScore);
    if (!Number.isFinite(num) || num <= 0) return null;
    const clamped = Math.min(10, Math.max(0, num));
    return Math.round(clamped * 10) / 10;
  }

  function formatScoreText(score) {
    if (score === null || score === undefined) return '';
    const num = Number(score);
    if (!Number.isFinite(num) || num <= 0) return '';
    return Number.isInteger(num) ? String(num) : num.toFixed(1).replace(/\.0$/, '');
  }

  function normalizeCount(value) {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
  }

  function computeProgressPercent(progress, episodes) {
    const safeProgress = Number.isFinite(Number(progress)) ? Math.max(0, Math.floor(Number(progress))) : 0;
    const safeEpisodes = Number.isFinite(Number(episodes)) && Number(episodes) > 0 ? Math.floor(Number(episodes)) : null;
    if (!safeEpisodes) return null;
    return Math.min(100, Math.max(0, Math.round((safeProgress / safeEpisodes) * 100)));
  }

  function formatProgressLabel(progress, episodes) {
    const safeProgress = Number.isFinite(Number(progress)) ? Math.max(0, Math.floor(Number(progress))) : 0;
    const safeEpisodes = Number.isFinite(Number(episodes)) && Number(episodes) > 0 ? Math.floor(Number(episodes)) : null;
    return safeEpisodes ? `EP ${safeProgress} / ${safeEpisodes}` : `EP ${safeProgress}`;
  }

  function normalizeMediaBase(media) {
    if (!media || typeof media !== 'object') return null;
    const id = Number(media.id);
    if (!Number.isInteger(id) || id <= 0) return null;
    const episodes = Number.isInteger(Number(media.episodes)) && Number(media.episodes) > 0 ? Number(media.episodes) : null;
    const seasonYear = Number.isInteger(Number(media.seasonYear)) && Number(media.seasonYear) > 1900 ? Number(media.seasonYear) : null;
    const cover = sanitizeUrl(media.coverImage?.large) || sanitizeUrl(media.coverImage?.medium);
    const url = sanitizeUrl(media.siteUrl) || `https://anilist.co/anime/${id}/`;
    const rawFormat = typeof media.format === 'string' ? media.format : 'TV';
    return {
      id,
      title: pickTitle(media.title),
      url,
      cover,
      coverColor: sanitizeColor(media.coverImage?.color),
      format: formatLabel(rawFormat),
      formatCategory: formatCategory(rawFormat),
      rawFormat,
      episodes,
      seasonYear,
    };
  }

  function dedupeEntries(collection, mode) {
    const lists = Array.isArray(collection?.lists) ? collection.lists : [];
    const byId = new Map();
    let order = 0;

    for (const list of lists) {
      const entries = Array.isArray(list?.entries) ? list.entries : [];
      for (const entry of entries) {
        const base = normalizeMediaBase(entry?.media);
        if (!base) continue;
        const score = normalizeScore(entry?.score);
        const progress = normalizeCount(entry?.progress);
        const updatedAt = normalizeCount(entry?.updatedAt);
        const item = {
          ...base,
          score,
          progress,
          updatedAt,
          progressPercent: computeProgressPercent(progress, base.episodes),
          progressLabel: formatProgressLabel(progress, base.episodes),
          _order: order++,
        };

        const existing = byId.get(base.id);
        if (!existing) {
          byId.set(base.id, item);
          continue;
        }

        if (mode === 'watching') {
          const betterUpdate = item.updatedAt > existing.updatedAt;
          const sameUpdateBetterProgress = item.updatedAt === existing.updatedAt && item.progress > existing.progress;
          const betterScore = item.updatedAt === existing.updatedAt && item.progress === existing.progress && (item.score ?? -1) > (existing.score ?? -1);
          if (betterUpdate || sameUpdateBetterProgress || betterScore) {
            byId.set(base.id, { ...item, _order: existing._order });
          }
        } else if ((item.score ?? -1) > (existing.score ?? -1)) {
          byId.set(base.id, { ...item, _order: existing._order });
        }
      }
    }

    const items = [...byId.values()];
    if (mode === 'watching') {
      items.sort((a, b) => (b.updatedAt - a.updatedAt) || (a._order - b._order));
    } else {
      items.sort((a, b) => ((b.score ?? -1) - (a.score ?? -1)) || (a._order - b._order));
    }
    return items.map(({ _order, ...rest }) => rest);
  }

  function normalizeAniListPayload(raw, userName = DEFAULT_USER, now = Date.now()) {
    const safeUser = sanitizeUserName(userName);
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid AniList response payload.');
    }
    const data = raw.data && typeof raw.data === 'object' ? raw.data : raw;
    const hasUsableData = Boolean(data.User || data.watching || data.completed);
    if (!hasUsableData) {
      const firstError = Array.isArray(raw.errors) && raw.errors[0]?.message
        ? String(raw.errors[0].message)
        : 'AniList returned no profile data.';
      throw new Error(firstError);
    }

    const watching = dedupeEntries(data.watching, 'watching');
    const completed = dedupeEntries(data.completed, 'completed');

    const scoreById = new Map();
    for (const entry of completed) {
      if (entry.score !== null) scoreById.set(entry.id, entry.score);
    }
    for (const entry of watching) {
      if (entry.score !== null && !scoreById.has(entry.id)) {
        scoreById.set(entry.id, entry.score);
      }
    }

    const favNodes = Array.isArray(data.User?.favourites?.anime?.nodes)
      ? data.User.favourites.anime.nodes
      : [];
    const seenFavs = new Set();
    const favorites = [];
    for (const node of favNodes) {
      const base = normalizeMediaBase(node);
      if (!base || seenFavs.has(base.id)) continue;
      seenFavs.add(base.id);
      const avg = Number(node?.averageScore);
      favorites.push({
        ...base,
        score: scoreById.has(base.id) ? scoreById.get(base.id) : null,
        averageScore: Number.isFinite(avg) && avg > 0 ? Math.round(avg) : null,
      });
    }

    const ratedCompleted = completed.filter(item => item.score !== null);
    const topSource = ratedCompleted.length ? ratedCompleted : completed;
    const topRated = topSource.slice(0, MAX_TOP_RATED);

    const stats = data.User?.statistics?.anime;
    const meanScoreNum = Number(stats?.meanScore);
    const user = {
      name: safeUser,
      siteUrl: sanitizeUrl(data.User?.siteUrl) || `https://anilist.co/user/${encodeURIComponent(safeUser)}/`,
      animeCount: normalizeCount(stats?.count),
      episodesWatched: normalizeCount(stats?.episodesWatched),
      meanScore: Number.isFinite(meanScoreNum) && meanScoreNum > 0 ? Math.round(meanScoreNum * 10) / 10 : null,
    };

    return {
      user,
      watching,
      favorites,
      topRated,
      fetchedAt: now,
    };
  }

  function readCache(userName = DEFAULT_USER, storage = globalThis.localStorage, now = Date.now()) {
    if (!storage) return null;
    try {
      const raw = storage.getItem(cacheKeyFor(userName));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !parsed.data || typeof parsed.fetchedAt !== 'number') {
        return null;
      }
      if (!parsed.data.user || !Array.isArray(parsed.data.topRated)) return null;
      return {
        data: parsed.data,
        fetchedAt: parsed.fetchedAt,
        fresh: now - parsed.fetchedAt < CACHE_TTL_MS,
      };
    } catch {
      return null;
    }
  }

  function writeCache(userName = DEFAULT_USER, data, storage = globalThis.localStorage, now = Date.now()) {
    if (!storage || !data) return false;
    try {
      storage.setItem(cacheKeyFor(userName), JSON.stringify({
        version: 1,
        fetchedAt: now,
        data,
      }));
      return true;
    } catch {
      return false;
    }
  }

  async function fetchAniList(userName = DEFAULT_USER, fetchImpl = globalThis.fetch, now = Date.now()) {
    if (typeof fetchImpl !== 'function') {
      throw new Error('Fetch API is unavailable.');
    }
    const safeUser = sanitizeUserName(userName);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { name: safeUser },
      }),
    };
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      options.signal = AbortSignal.timeout(10000);
    }
    const response = await fetchImpl(ANILIST_ENDPOINT, options);
    if (!response.ok) {
      throw new Error(`AniList request failed (${response.status}).`);
    }
    const json = await response.json();
    return normalizeAniListPayload(json, safeUser, now);
  }

  async function loadAniListData({
    userName = DEFAULT_USER,
    storage = globalThis.localStorage,
    fetchImpl = globalThis.fetch,
    force = false,
    now = Date.now(),
    onStaleData = null,
  } = {}) {
    const safeUser = sanitizeUserName(userName);
    const cached = force ? null : readCache(safeUser, storage, now);

    if (cached && cached.fresh) {
      return { data: cached.data, source: 'cache', stale: false };
    }

    if (cached && !cached.fresh && typeof onStaleData === 'function') {
      onStaleData(cached.data);
    }

    try {
      const fresh = await fetchAniList(safeUser, fetchImpl, now);
      writeCache(safeUser, fresh, storage, now);
      return { data: fresh, source: 'live', stale: false };
    } catch (error) {
      if (cached) {
        return { data: cached.data, source: 'cache-fallback', stale: true, error };
      }
      return { data: null, source: 'offline-fallback', stale: false, error };
    }
  }

  function createCardElement(item, variant = 'top') {
    const safeHref = sanitizeUrl(item.url);
    const card = document.createElement(safeHref ? 'a' : 'article');
    card.className = variant === 'watching' ? 'screen-card anilist-watching-card' : 'screen-card';
    card.dataset.format = item.format || 'Series';
    if (safeHref) {
      card.href = safeHref;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    }

    const coverBox = document.createElement('div');
    coverBox.className = 'screen-cover';
    if (item.coverColor) {
      coverBox.style.backgroundColor = item.coverColor;
    }

    const safeCover = sanitizeUrl(item.cover);
    if (safeCover) {
      const img = document.createElement('img');
      img.src = safeCover;
      img.alt = '';
      img.width = 150;
      img.height = 220;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      coverBox.append(img);
    }

    const scoreText = formatScoreText(item.score);
    if (scoreText) {
      const badge = document.createElement('span');
      badge.append(document.createTextNode(scoreText));
      const denom = document.createElement('small');
      denom.textContent = '/10';
      badge.append(denom);
      coverBox.append(badge);
    } else if (variant === 'favorite') {
      const badge = document.createElement('span');
      badge.className = 'anilist-fav-badge';
      badge.textContent = '★ Fav';
      coverBox.append(badge);
    } else if (variant === 'watching') {
      const badge = document.createElement('span');
      badge.className = 'anilist-live-badge';
      badge.textContent = 'Watching';
      coverBox.append(badge);
    }

    card.append(coverBox);

    if (variant === 'watching') {
      const progressWrap = document.createElement('div');
      progressWrap.className = 'anilist-progress';

      const progressMeta = document.createElement('div');
      progressMeta.className = 'anilist-progress-meta';
      const epLabel = document.createElement('span');
      epLabel.textContent = item.progressLabel || formatProgressLabel(item.progress, item.episodes);
      progressMeta.append(epLabel);
      if (typeof item.progressPercent === 'number') {
        const pct = document.createElement('span');
        pct.textContent = `${item.progressPercent}%`;
        progressMeta.append(pct);
      }

      const track = document.createElement('div');
      track.className = 'anilist-progress-track';
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', `${item.title} progress`);
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
      const fill = document.createElement('i');
      if (typeof item.progressPercent === 'number') {
        track.setAttribute('aria-valuenow', String(item.progressPercent));
        fill.style.width = `${item.progressPercent}%`;
      } else {
        track.classList.add('is-ongoing');
        fill.style.width = '35%';
      }
      track.append(fill);
      progressWrap.append(progressMeta, track);
      card.append(progressWrap);
    }

    const meta = document.createElement('small');
    meta.textContent = item.seasonYear ? `${item.format} · ${item.seasonYear}` : item.format;
    const heading = document.createElement('h3');
    heading.textContent = item.title;
    card.append(meta, heading);

    return card;
  }

  function applyActiveTopFilter(root) {
    const activeBtn = root.querySelector('.screen-filters button[aria-pressed="true"]');
    const filter = activeBtn?.dataset.screenFilter || 'all';
    const topStrip = root.querySelector('[data-anilist-top-strip]');
    if (!topStrip) return;
    topStrip.querySelectorAll('.screen-card').forEach(card => {
      const fmt = card.dataset.format || '';
      card.hidden = filter !== 'all' && !fmt.startsWith(filter);
    });
  }

  function renderShelf(root, data, { source = 'live', stale = false } = {}) {
    if (!root || !data) return;

    const statusEl = root.querySelector('[data-anilist-status]');
    const statsEl = root.querySelector('[data-anilist-stats]');
    const profileLink = root.querySelector('[data-anilist-profile]');
    const liveDot = root.querySelector('[data-anilist-dot]');

    if (statusEl) {
      if (source === 'cache-fallback' || stale) {
        statusEl.textContent = `Cached AniList sync · @${data.user.name}`;
      } else {
        statusEl.textContent = `Synced live with AniList · @${data.user.name}`;
      }
    }
    if (liveDot) {
      liveDot.classList.toggle('is-live', source === 'live' || source === 'cache');
      liveDot.classList.toggle('is-stale', source === 'cache-fallback' || stale);
    }
    if (statsEl) {
      const parts = [];
      if (data.user.animeCount > 0) parts.push(`${data.user.animeCount.toLocaleString()} anime`);
      if (data.user.episodesWatched > 0) parts.push(`${data.user.episodesWatched.toLocaleString()} eps`);
      if (data.user.meanScore) parts.push(`${data.user.meanScore} avg`);
      statsEl.textContent = parts.join(' · ');
      statsEl.hidden = parts.length === 0;
    }
    if (profileLink && data.user.siteUrl) {
      const safeProfile = sanitizeUrl(data.user.siteUrl);
      if (safeProfile) profileLink.href = safeProfile;
    }

    const watchingSection = root.querySelector('[data-anilist-watching]');
    const watchingStrip = root.querySelector('[data-anilist-watching-strip]');
    const watchingCount = root.querySelector('[data-anilist-watching-count]');
    if (watchingSection && watchingStrip) {
      if (data.watching.length > 0) {
        const fragment = document.createDocumentFragment();
        for (const item of data.watching) {
          fragment.append(createCardElement(item, 'watching'));
        }
        watchingStrip.replaceChildren(fragment);
        if (watchingCount) watchingCount.textContent = String(data.watching.length);
        watchingSection.hidden = false;
      } else {
        watchingStrip.replaceChildren();
        watchingSection.hidden = true;
      }
    }

    const favSection = root.querySelector('[data-anilist-favorites]');
    const favStrip = root.querySelector('[data-anilist-favorites-strip]');
    const favCount = root.querySelector('[data-anilist-favorites-count]');
    if (favSection && favStrip) {
      if (data.favorites.length > 0) {
        const fragment = document.createDocumentFragment();
        for (const item of data.favorites) {
          fragment.append(createCardElement(item, 'favorite'));
        }
        favStrip.replaceChildren(fragment);
        if (favCount) favCount.textContent = String(data.favorites.length);
        favSection.hidden = false;
      } else {
        favStrip.replaceChildren();
        favSection.hidden = true;
      }
    }

    const topStrip = root.querySelector('[data-anilist-top-strip]');
    const topCount = root.querySelector('[data-anilist-top-count]');
    if (topStrip && data.topRated.length > 0) {
      const fragment = document.createDocumentFragment();
      for (const item of data.topRated) {
        fragment.append(createCardElement(item, 'top'));
      }
      topStrip.replaceChildren(fragment);
      if (topCount) topCount.textContent = String(data.topRated.length);
      applyActiveTopFilter(root);
    }
  }

  async function hydrateRoot(root, { force = false } = {}) {
    if (!root || root.dataset.anilistLoading === 'true') return;
    const userName = sanitizeUserName(root.dataset.anilistUser || DEFAULT_USER);
    const refreshBtn = root.querySelector('[data-anilist-refresh]');
    const statusEl = root.querySelector('[data-anilist-status]');

    root.dataset.anilistLoading = 'true';
    if (refreshBtn) {
      refreshBtn.hidden = false;
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Syncing…';
    }

    try {
      const result = await loadAniListData({
        userName,
        force,
        onStaleData: staleData => renderShelf(root, staleData, { source: 'cache', stale: true }),
      });

      if (result.data) {
        renderShelf(root, result.data, { source: result.source, stale: result.stale });
      } else if (statusEl) {
        statusEl.textContent = `Showing saved AniList snapshot · @${userName}`;
      }
    } finally {
      delete root.dataset.anilistLoading;
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh';
      }
    }
  }

  function bindAll() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-anilist-root]').forEach(root => {
      if (root.dataset.anilistBound === 'true') return;
      root.dataset.anilistBound = 'true';
      const refreshBtn = root.querySelector('[data-anilist-refresh]');
      if (refreshBtn) {
        refreshBtn.hidden = false;
        refreshBtn.addEventListener('click', () => hydrateRoot(root, { force: true }));
      }
      hydrateRoot(root, { force: false });
    });
  }

  const api = {
    ANILIST_ENDPOINT,
    CACHE_TTL_MS,
    QUERY,
    sanitizeUserName,
    cacheKeyFor,
    sanitizeUrl,
    sanitizeColor,
    pickTitle,
    formatLabel,
    formatCategory,
    normalizeScore,
    formatScoreText,
    computeProgressPercent,
    formatProgressLabel,
    dedupeEntries,
    normalizeAniListPayload,
    readCache,
    writeCache,
    fetchAniList,
    loadAniListData,
    renderShelf,
    hydrateRoot,
    bindAll,
  };

  globalThis.AryanAniList = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined' && !globalThis.__aryanAniListBooted) {
    globalThis.__aryanAniListBooted = true;
    document.addEventListener('astro:page-load', bindAll);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindAll, { once: true });
    } else {
      bindAll();
    }
  }
})();
