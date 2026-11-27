(() => {
  if (globalThis.__aryanF1Booted) return;
  globalThis.__aryanF1Booted = true;

  const CACHE_KEY = 'aryan-f1-live-v1';
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
  const BASE = 'https://api.jolpi.ca/ergast/f1/current';

  function formatCountdown(race) {
    if (!race?.date) return 'Off-season · Next calendar TBA';
    const target = Date.parse(`${race.date}T${race.time || '14:00:00Z'}`);
    if (!Number.isFinite(target)) return race.date;
    const diffMs = target - Date.now();
    if (diffMs <= 0 && diffMs > -4 * 3600_000) return 'Lights out / Race weekend live';
    if (diffMs <= -4 * 3600_000) return 'Race weekend completed';
    const days = Math.floor(diffMs / 86_400_000);
    const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
    if (days > 0) return `In ${days}d ${hours}h`;
    const mins = Math.max(1, Math.floor((diffMs % 3_600_000) / 60_000));
    return `In ${hours}h ${mins}m`;
  }

  function renderBars(container, rows, isDriver) {
    if (!container || !Array.isArray(rows) || !rows.length) return;
    const maxPts = Math.max(1, ...rows.map(r => Number(r.points) || 0));
    container.replaceChildren();
    rows.slice(0, 4).forEach(row => {
      const pct = Math.min(100, Math.max(6, Math.round(((Number(row.points) || 0) / maxPts) * 100)));
      const item = document.createElement('div');
      item.className = 'f1-row';
      if (/verstappen|red bull/i.test(`${row.name} ${row.team || ''}`)) item.classList.add('is-fav');

      const top = document.createElement('div');
      top.className = 'f1-row-head';
      const label = document.createElement('span');
      label.className = 'f1-row-name';
      const pos = document.createElement('b');
      pos.className = 'mono';
      pos.textContent = `P${row.pos}`;
      label.append(pos, document.createTextNode(` ${row.name}`));
      if (isDriver && row.team) {
        const team = document.createElement('small');
        team.textContent = ` · ${row.team}`;
        label.append(team);
      }
      const pts = document.createElement('span');
      pts.className = 'mono f1-pts';
      pts.textContent = `${row.points} PTS`;
      top.append(label, pts);

      const gauge = document.createElement('div');
      gauge.className = 'cal-gauge cal-gauge-sm';
      gauge.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('i');
      fill.style.width = `${pct}%`;
      gauge.append(fill);

      item.append(top, gauge);
      container.append(item);
    });
  }

  function applyData(root, data, sourceLabel) {
    const race = data.nextRace;
    const nameEl = root.querySelector('[data-f1-race-name]');
    const circuitEl = root.querySelector('[data-f1-circuit]');
    const countdownEl = root.querySelector('[data-f1-countdown]');
    const roundEl = root.querySelector('[data-f1-round]');
    const gaugeEl = root.querySelector('[data-f1-season-fill]');
    const metaEl = root.querySelector('[data-f1-meta]');

    if (race) {
      if (nameEl) nameEl.textContent = race.name;
      if (circuitEl) circuitEl.textContent = [race.circuit, race.country].filter(Boolean).join(' · ');
      if (countdownEl) countdownEl.textContent = formatCountdown(race);
    } else {
      if (nameEl) nameEl.textContent = `${data.season || ''} Season Complete`.trim();
      if (circuitEl) circuitEl.textContent = 'Awaiting next championship calendar';
      if (countdownEl) countdownEl.textContent = 'Off-season';
    }

    const done = Number(data.roundCompleted) || 0;
    const total = Math.max(1, Number(data.totalRounds) || 24);
    if (roundEl) roundEl.textContent = `RD ${String(done).padStart(2, '0')} / ${total}`;
    if (gaugeEl) gaugeEl.style.width = `${Math.min(100, Math.round((done / total) * 100))}%`;
    if (metaEl && sourceLabel) metaEl.textContent = sourceLabel;

    renderBars(root.querySelector('[data-f1-drivers]'), data.drivers, true);
    renderBars(root.querySelector('[data-f1-constructors]'), data.constructors, false);
  }

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (parsed && Date.now() - parsed.ts < CACHE_TTL_MS && parsed.data) return parsed.data;
    } catch {}
    return null;
  }

  async function fetchLiveF1() {
    const [schRes, drvRes, conRes] = await Promise.all([
      fetch(`${BASE}.json`, { signal: AbortSignal.timeout(9000) }),
      fetch(`${BASE}/driverstandings.json`, { signal: AbortSignal.timeout(9000) }),
      fetch(`${BASE}/constructorstandings.json`, { signal: AbortSignal.timeout(9000) }),
    ]);
    if (!schRes.ok || !drvRes.ok || !conRes.ok) throw new Error('Jolpica unavailable');
    const [scheduleJson, driversJson, constructorsJson] = await Promise.all([schRes.json(), drvRes.json(), conRes.json()]);
    const races = scheduleJson?.MRData?.RaceTable?.Races || [];
    const now = Date.now();
    let nextRace = null;
    for (const r of races) {
      const ts = Date.parse(`${r.date}T${r.time || '14:00:00Z'}`);
      if (Number.isFinite(ts) && ts + 3 * 3600_000 >= now) {
        nextRace = {
          round: Number(r.round) || 1,
          name: r.raceName || 'Grand Prix',
          circuit: r.Circuit?.circuitName || '',
          country: r.Circuit?.Location?.country || '',
          date: r.date || '',
          time: r.time || '14:00:00Z',
        };
        break;
      }
    }
    const dList = driversJson?.MRData?.StandingsTable?.StandingsLists?.[0];
    const cList = constructorsJson?.MRData?.StandingsTable?.StandingsLists?.[0];
    const payload = {
      season: String(scheduleJson?.MRData?.RaceTable?.season || new Date().getUTCFullYear()),
      roundCompleted: Number(dList?.round || cList?.round || 0),
      totalRounds: races.length || 24,
      nextRace,
      drivers: (dList?.DriverStandings || []).slice(0, 4).map((e, i) => ({
        pos: Number(e.position) || i + 1,
        code: (e.Driver?.code || 'DRV').toUpperCase(),
        name: `${e.Driver?.givenName || ''} ${e.Driver?.familyName || ''}`.trim(),
        team: e.Constructors?.[0]?.name || '',
        points: Number(e.points) || 0,
      })),
      constructors: (cList?.ConstructorStandings || []).slice(0, 4).map((e, i) => ({
        pos: Number(e.position) || i + 1,
        name: e.Constructor?.name || 'Team',
        points: Number(e.points) || 0,
      })),
    };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: payload })); } catch {}
    return payload;
  }

  function bindF1() {
    const cards = [...document.querySelectorAll('[data-f1-card]')];
    if (!cards.length) return;

    cards.forEach(root => {
      // Tabs toggle between Drivers & Constructors
      if (root.dataset.f1Bound !== 'true') {
        root.dataset.f1Bound = 'true';
        const tabs = [...root.querySelectorAll('[data-f1-tab]')];
        const panels = {
          drivers: root.querySelector('[data-f1-drivers]'),
          constructors: root.querySelector('[data-f1-constructors]'),
        };
        tabs.forEach(btn => btn.addEventListener('click', () => {
          const target = btn.dataset.f1Tab;
          tabs.forEach(t => t.setAttribute('aria-pressed', String(t === btn)));
          if (panels.drivers) panels.drivers.hidden = target !== 'drivers';
          if (panels.constructors) panels.constructors.hidden = target !== 'constructors';
          window.AryanStation?.pulse?.('switch');
        }));
      }

      // Refresh countdown on SSR snapshot right away
      try {
        const ssr = JSON.parse(root.dataset.f1Snapshot || 'null');
        if (ssr) {
          const cd = root.querySelector('[data-f1-countdown]');
          if (cd && ssr.nextRace) cd.textContent = formatCountdown(ssr.nextRace);
        }
      } catch {}
    });

    const cached = readCache();
    if (cached) {
      cards.forEach(root => applyData(root, cached, 'Synced live · Jolpica-F1'));
      return;
    }

    fetchLiveF1()
      .then(data => cards.forEach(root => applyData(root, data, 'Synced live · Jolpica-F1')))
      .catch(() => {});
  }

  document.addEventListener('astro:page-load', bindF1);
  bindF1();
})();
