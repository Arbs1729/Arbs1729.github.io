(() => {
  if (globalThis.__aryanStationBooted) return;
  globalThis.__aryanStationBooted = true;

  const PREFS_KEY = 'aryan-station-prefs-v1';
  const REDUCED_MOTION = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let audioCtx = null;
  let glideRaf = 0;

  // ---------------------------------------------------------------------------
  // Continuous 6-Stop Gradual Palette Engine (0.00 Sunlit Vellum -> 0.46 Golden Hour
  // -> 0.56 Warm Dusk Slate -> 0.78 Indigo Orbit -> 1.00 Deep 90s Orbital Night)
  // High-contrast ink crosses cleanly in the 0.46..0.56 twilight window so text
  // stays crisp & readable at EVERY single slider position.
  // ---------------------------------------------------------------------------
  const PALETTE_STOPS = [
    {
      t: 0.00,
      paper: [243, 234, 213],
      panel: [251, 246, 232],
      surface: [233, 222, 196],
      ink: [36, 31, 25],
      muted: [97, 87, 73],
      accent: [184, 74, 39],
      glow: [204, 90, 51],
      controlSide: [163, 142, 108],
      rule: [122, 98, 66, 0.32],
      spaceWash: [244, 234, 210, 0.56],
      deckTop: [253, 249, 238, 0.88],
      deckBot: [244, 234, 211, 0.88],
      consoleTop: [243, 232, 206],
      consoleBot: [223, 207, 169],
      consoleBorder: [132, 99, 46, 0.48],
      consoleInk: [38, 32, 24],
      consoleMuted: [95, 80, 57],
      bpBgTop: [252, 248, 236, 0.94],
      bpBgBot: [241, 231, 206, 0.92],
      bpBorder: [136, 104, 54, 0.42],
      bpInk: [74, 58, 40],
      bpThin: [92, 72, 48, 0.38],
      bpVector: [46, 96, 136],
      bpLabel: [98, 81, 61, 0.95],
      gridMinor: [132, 108, 74, 0.09],
      gridMajor: [120, 94, 58, 0.19],
      gaugeTrack: [96, 76, 46, 0.16],
      gaugeTick: [96, 76, 46, 0.46],
    },
    {
      t: 0.28,
      paper: [236, 220, 189],
      panel: [246, 234, 208],
      surface: [223, 203, 168],
      ink: [41, 32, 23],
      muted: [104, 86, 66],
      accent: [196, 79, 36],
      glow: [222, 104, 52],
      controlSide: [152, 126, 88],
      rule: [134, 100, 60, 0.36],
      spaceWash: [236, 218, 184, 0.56],
      deckTop: [248, 237, 214, 0.88],
      deckBot: [234, 214, 180, 0.88],
      consoleTop: [236, 219, 184],
      consoleBot: [212, 190, 148],
      consoleBorder: [142, 100, 44, 0.52],
      consoleInk: [41, 32, 22],
      consoleMuted: [102, 82, 54],
      bpBgTop: [247, 236, 212, 0.94],
      bpBgBot: [233, 215, 182, 0.92],
      bpBorder: [146, 104, 50, 0.45],
      bpInk: [78, 56, 36],
      bpThin: [102, 74, 46, 0.4],
      bpVector: [44, 98, 140],
      bpLabel: [102, 78, 52, 0.95],
      gridMinor: [140, 108, 66, 0.09],
      gridMajor: [128, 94, 52, 0.19],
      gaugeTrack: [104, 78, 44, 0.18],
      gaugeTick: [104, 78, 44, 0.48],
    },
    {
      t: 0.47,
      paper: [221, 194, 156],
      panel: [234, 210, 174],
      surface: [206, 176, 136],
      ink: [36, 25, 18],
      muted: [94, 72, 52],
      accent: [194, 70, 30],
      glow: [235, 114, 54],
      controlSide: [134, 102, 68],
      rule: [132, 88, 52, 0.4],
      spaceWash: [218, 186, 144, 0.58],
      deckTop: [238, 215, 180, 0.88],
      deckBot: [218, 186, 146, 0.88],
      consoleTop: [220, 192, 152],
      consoleBot: [192, 160, 118],
      consoleBorder: [146, 94, 42, 0.56],
      consoleInk: [36, 24, 16],
      consoleMuted: [92, 68, 44],
      bpBgTop: [235, 212, 178, 0.94],
      bpBgBot: [216, 188, 148, 0.92],
      bpBorder: [148, 96, 46, 0.48],
      bpInk: [76, 48, 28],
      bpThin: [104, 68, 40, 0.42],
      bpVector: [44, 96, 138],
      bpLabel: [94, 66, 42, 0.95],
      gridMinor: [134, 92, 52, 0.09],
      gridMajor: [122, 82, 44, 0.19],
      gaugeTrack: [96, 66, 36, 0.22],
      gaugeTick: [96, 66, 36, 0.5],
    },
    {
      t: 0.54,
      paper: [40, 39, 52],
      panel: [52, 50, 66],
      surface: [63, 60, 78],
      ink: [246, 234, 212],
      muted: [196, 182, 162],
      accent: [240, 144, 72],
      glow: [248, 176, 102],
      controlSide: [22, 22, 32],
      rule: [238, 182, 112, 0.28],
      spaceWash: [36, 35, 48, 0.58],
      deckTop: [54, 52, 68, 0.82],
      deckBot: [36, 36, 50, 0.86],
      consoleTop: [56, 48, 46],
      consoleBot: [34, 34, 44],
      consoleBorder: [238, 182, 106, 0.42],
      consoleInk: [246, 236, 216],
      consoleMuted: [226, 206, 176],
      bpBgTop: [34, 34, 48, 0.72],
      bpBgBot: [24, 26, 38, 0.76],
      bpBorder: [238, 184, 108, 0.38],
      bpInk: [240, 190, 118],
      bpThin: [240, 190, 118, 0.4],
      bpVector: [116, 202, 222],
      bpLabel: [244, 212, 162, 0.8],
      gridMinor: [238, 194, 128, 0.036],
      gridMajor: [238, 194, 128, 0.082],
      gaugeTrack: [18, 20, 30, 0.78],
      gaugeTick: [238, 192, 118, 0.42],
    },
    {
      t: 0.76,
      paper: [20, 26, 37],
      panel: [28, 36, 49],
      surface: [36, 46, 62],
      ink: [245, 236, 218],
      muted: [182, 175, 160],
      accent: [234, 152, 74],
      glow: [244, 182, 104],
      controlSide: [11, 15, 22],
      rule: [228, 186, 118, 0.24],
      spaceWash: [16, 22, 32, 0.56],
      deckTop: [28, 36, 49, 0.72],
      deckBot: [16, 22, 32, 0.82],
      consoleTop: [40, 36, 34],
      consoleBot: [22, 25, 33],
      consoleBorder: [232, 188, 112, 0.36],
      consoleInk: [245, 236, 218],
      consoleMuted: [224, 208, 178],
      bpBgTop: [16, 23, 34, 0.66],
      bpBgBot: [12, 18, 28, 0.72],
      bpBorder: [232, 184, 108, 0.35],
      bpInk: [236, 188, 116],
      bpThin: [236, 188, 116, 0.38],
      bpVector: [108, 196, 214],
      bpLabel: [242, 212, 162, 0.74],
      gridMinor: [236, 198, 132, 0.03],
      gridMajor: [236, 198, 132, 0.072],
      gaugeTrack: [10, 14, 21, 0.82],
      gaugeTick: [236, 194, 118, 0.42],
    },
    {
      t: 1.00,
      paper: [13, 18, 25],
      panel: [20, 28, 38],
      surface: [27, 36, 48],
      ink: [244, 235, 216],
      muted: [177, 170, 153],
      accent: [229, 154, 74],
      glow: [242, 183, 104],
      controlSide: [8, 11, 16],
      rule: [226, 186, 118, 0.22],
      spaceWash: [11, 16, 23, 0.56],
      deckTop: [22, 30, 40, 0.64],
      deckBot: [12, 18, 26, 0.78],
      consoleTop: [34, 31, 28],
      consoleBot: [18, 21, 26],
      consoleBorder: [232, 188, 112, 0.34],
      consoleInk: [245, 236, 218],
      consoleMuted: [216, 200, 172],
      bpBgTop: [12, 18, 26, 0.62],
      bpBgBot: [9, 14, 22, 0.68],
      bpBorder: [232, 184, 108, 0.34],
      bpInk: [235, 188, 116],
      bpThin: [235, 188, 116, 0.38],
      bpVector: [108, 196, 214],
      bpLabel: [242, 212, 162, 0.72],
      gridMinor: [236, 198, 132, 0.028],
      gridMajor: [236, 198, 132, 0.068],
      gaugeTrack: [9, 13, 18, 0.84],
      gaugeTick: [236, 194, 118, 0.42],
    },
  ];

  function lerpNum(a, b, f) { return a + (b - a) * f; }
  function lerpRgb(c1, c2, f) {
    return `rgb(${Math.round(lerpNum(c1[0], c2[0], f))}, ${Math.round(lerpNum(c1[1], c2[1], f))}, ${Math.round(lerpNum(c1[2], c2[2], f))})`;
  }
  function lerpRgba(c1, c2, f) {
    return `rgba(${Math.round(lerpNum(c1[0], c2[0], f))}, ${Math.round(lerpNum(c1[1], c2[1], f))}, ${Math.round(lerpNum(c1[2], c2[2], f))}, ${lerpNum(c1[3], c2[3], f).toFixed(3)})`;
  }

  function applyGradualPalette(phase, root = document.documentElement) {
    if (!root) return;
    const p = Math.min(1, Math.max(0, phase));
    let s0 = PALETTE_STOPS[0];
    let s1 = PALETTE_STOPS[PALETTE_STOPS.length - 1];
    for (let i = 0; i < PALETTE_STOPS.length - 1; i++) {
      if (p >= PALETTE_STOPS[i].t && p <= PALETTE_STOPS[i + 1].t) {
        s0 = PALETTE_STOPS[i];
        s1 = PALETTE_STOPS[i + 1];
        break;
      }
    }
    const span = Math.max(0.0001, s1.t - s0.t);
    const f = Math.min(1, Math.max(0, (p - s0.t) / span));
    const st = root.style;

    st.setProperty('--paper', lerpRgb(s0.paper, s1.paper, f));
    st.setProperty('--panel', lerpRgb(s0.panel, s1.panel, f));
    st.setProperty('--surface', lerpRgb(s0.surface, s1.surface, f));
    st.setProperty('--ink', lerpRgb(s0.ink, s1.ink, f));
    st.setProperty('--muted', lerpRgb(s0.muted, s1.muted, f));
    st.setProperty('--accent', lerpRgb(s0.accent, s1.accent, f));
    st.setProperty('--glow', lerpRgb(s0.glow, s1.glow, f));
    st.setProperty('--control-side', lerpRgb(s0.controlSide, s1.controlSide, f));
    st.setProperty('--rule', lerpRgba(s0.rule, s1.rule, f));
    st.setProperty('--space-wash', lerpRgba(s0.spaceWash, s1.spaceWash, f));
    st.setProperty('--deck-bg-top', lerpRgba(s0.deckTop, s1.deckTop, f));
    st.setProperty('--deck-bg-bot', lerpRgba(s0.deckBot, s1.deckBot, f));
    st.setProperty('--console-bg-top', lerpRgb(s0.consoleTop, s1.consoleTop, f));
    st.setProperty('--console-bg-bot', lerpRgb(s0.consoleBot, s1.consoleBot, f));
    st.setProperty('--console-border', lerpRgba(s0.consoleBorder, s1.consoleBorder, f));
    st.setProperty('--console-ink', lerpRgb(s0.consoleInk, s1.consoleInk, f));
    st.setProperty('--console-muted', lerpRgb(s0.consoleMuted, s1.consoleMuted, f));
    st.setProperty('--bp-bg', `linear-gradient(180deg, ${lerpRgba(s0.bpBgTop, s1.bpBgTop, f)}, ${lerpRgba(s0.bpBgBot, s1.bpBgBot, f)})`);
    st.setProperty('--bp-border', lerpRgba(s0.bpBorder, s1.bpBorder, f));
    st.setProperty('--bp-ink', lerpRgb(s0.bpInk, s1.bpInk, f));
    st.setProperty('--bp-thin', lerpRgba(s0.bpThin, s1.bpThin, f));
    st.setProperty('--bp-vector', lerpRgb(s0.bpVector, s1.bpVector, f));
    st.setProperty('--bp-label', lerpRgba(s0.bpLabel, s1.bpLabel, f));
    st.setProperty('--grid-minor', lerpRgba(s0.gridMinor, s1.gridMinor, f));
    st.setProperty('--grid-major', lerpRgba(s0.gridMajor, s1.gridMajor, f));
    st.setProperty('--gauge-track', lerpRgba(s0.gaugeTrack, s1.gaugeTrack, f));
    st.setProperty('--gauge-tick', lerpRgba(s0.gaugeTick, s1.gaugeTick, f));
  }

  function computeClockSolarValue(date = new Date()) {
    const hour = date.getHours() + date.getMinutes() / 60;
    const raw = Math.round(50 - Math.cos(((hour - 12) / 12) * Math.PI) * 45);
    return Math.min(96, Math.max(4, raw));
  }

  function formatClockHHMM(date = new Date()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function getSkyZone(val) {
    if (val < 36) return 'day';
    if (val <= 64) return 'terminator';
    return 'night';
  }

  let prefs = {
    hud: true,
    stars: true,
    click: false,
    skyMode: 'auto',
    warmth: computeClockSolarValue(),
  };

  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if (typeof saved.hud === 'boolean') prefs.hud = saved.hud;
      if (typeof saved.stars === 'boolean') prefs.stars = saved.stars;
      if (typeof saved.click === 'boolean') prefs.click = saved.click;
      if (saved.skyMode === 'manual' && typeof saved.warmth === 'number') {
        prefs.skyMode = 'manual';
        prefs.warmth = Math.min(100, Math.max(0, saved.warmth));
      } else {
        prefs.skyMode = 'auto';
        prefs.warmth = computeClockSolarValue();
      }
    }
  } catch {}

  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
  }

  function vibrate(kind) {
    if (REDUCED_MOTION()) return;
    if (typeof navigator?.vibrate !== 'function') return;
    try {
      if (kind === 'detent') navigator.vibrate(10);
      else if (kind === 'mode') navigator.vibrate([10, 22, 14]);
      else navigator.vibrate(7);
    } catch {}
  }

  function playMechanicalClick(kind) {
    if (!prefs.click || REDUCED_MOTION()) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioCtx) audioCtx = new AudioCtor();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      const freq = kind === 'detent' ? 320 : kind === 'mode' ? 240 : 420;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.018);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.022);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.025);
    } catch {}
  }

  function pulse(kind = 'switch') {
    vibrate(kind);
    playMechanicalClick(kind);
  }

  function currentThemeIsDark() {
    const t = document.documentElement.dataset.theme;
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  }

  function applySkyVars(val, root = document.documentElement) {
    if (!root) return;
    const n = Math.min(100, Math.max(0, Number(val) || 0));
    const phase = n / 100;
    const terminator = Math.max(0, 1 - Math.abs(phase - 0.5) * 3.6);
    const zone = getSkyZone(n);
    root.dataset.skyZone = zone;
    root.style.setProperty('--station-night', phase.toFixed(3));
    root.style.setProperty('--sky-phase', phase.toFixed(3));
    root.style.setProperty('--terminator-glow', terminator.toFixed(3));
    applyGradualPalette(phase, root);
    if (root === document.documentElement) {
      document.dispatchEvent(new CustomEvent('aryan:skyphase', {
        detail: { phase, value: n, terminator, zone },
      }));
    }
  }

  function applyHtmlFlags(root = document.documentElement) {
    if (!root) return;
    root.dataset.hud = prefs.hud ? 'on' : 'off';
    root.dataset.stars = prefs.stars ? 'on' : 'off';
    const level = prefs.skyMode === 'auto' ? computeClockSolarValue() : prefs.warmth;
    prefs.warmth = level;
    applySkyVars(level, root);
  }

  function setSkyValue(val, { manual = true, persistTheme = true, silent = false } = {}) {
    const n = Math.min(100, Math.max(0, Math.round(Number(val) || 0)));
    const prevDark = currentThemeIsDark();
    const nextDark = n >= 50;
    prefs.warmth = n;
    prefs.skyMode = manual ? 'manual' : 'auto';
    applySkyVars(n);

    if (nextDark !== prevDark) {
      const nextTheme = nextDark ? 'dark' : 'light';
      if (window.AryanTheme?.set) {
        window.AryanTheme.set(nextTheme, { persist: persistTheme });
      } else {
        document.documentElement.dataset.theme = nextTheme;
        if (persistTheme) {
          try { localStorage.setItem('aryan-theme', nextTheme); } catch {}
        }
        const label = document.getElementById('theme-label');
        if (label) label.textContent = nextDark ? 'Dark' : 'Light';
      }
      if (!silent) pulse('mode');
    }
    savePrefs();
  }

  function getPageAnchors() {
    const main = document.getElementById('main');
    if (!main) return [{ id: 'top', label: '01 · Top', el: document.body }];
    const candidates = [
      { sel: '#home-base', label: '01 · Top' },
      { sel: '#selected-work', label: '02 · Work' },
      { sel: '#listening', label: '03 · Music' },
      { sel: '#experience', label: '02 · Experience' },
      { sel: '#case-studies', label: '03 · Cases' },
      { sel: '#projects', label: '03 · Projects' },
      { sel: '#music', label: '01 · Music' },
      { sel: '#screen', label: '02 · Anime' },
      { sel: '#formula-one', label: '03 · F1' },
      { sel: '#contact', label: '04 · Contact' },
    ];
    const found = [];
    const seen = new Set();
    for (const c of candidates) {
      const el = document.querySelector(c.sel);
      if (el && !seen.has(el)) {
        seen.add(el);
        found.push({ el, label: c.label });
      }
    }
    if (!found.length) return [{ el: document.body, label: '01 · Top' }];
    return found.slice(0, 4).map((item, idx) => ({
      el: item.el,
      label: `0${idx + 1} · ${item.label.replace(/^\d+\s*·\s*/, '')}`,
    }));
  }

  // Interactive Scrollable Left Brass Vernier
  function bindVernier() {
    const vernier = document.querySelector('[data-brass-vernier]');
    const scale = vernier?.querySelector('[data-vernier-scale]');
    if (!vernier || !scale || vernier.dataset.vernierBound === 'true') return;
    vernier.dataset.vernierBound = 'true';

    let dragging = false;
    let activePointerId = null;

    const scrollFromClientY = clientY => {
      const rect = scale.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height)));
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: Math.round(ratio * maxScroll), behavior: 'auto' });
    };

    vernier.addEventListener('pointerdown', e => {
      dragging = true;
      activePointerId = e.pointerId;
      vernier.classList.add('is-dragging');
      try { vernier.setPointerCapture(e.pointerId); } catch {}
      pulse('detent');
      scrollFromClientY(e.clientY);
      e.preventDefault();
    });

    window.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== activePointerId) return;
      scrollFromClientY(e.clientY);
    });

    const stopDrag = e => {
      if (!dragging || e.pointerId !== activePointerId) return;
      dragging = false;
      activePointerId = null;
      vernier.classList.remove('is-dragging');
      try { vernier.releasePointerCapture(e.pointerId); } catch {}
    };
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);

    vernier.addEventListener('keydown', e => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const step = Math.round(maxScroll * 0.12);
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        window.scrollBy({ top: step, behavior: REDUCED_MOTION() ? 'auto' : 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        window.scrollBy({ top: -step, behavior: REDUCED_MOTION() ? 'auto' : 'smooth' });
      } else if (e.key === 'Home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: REDUCED_MOTION() ? 'auto' : 'smooth' });
      } else if (e.key === 'End') {
        e.preventDefault();
        window.scrollTo({ top: maxScroll, behavior: REDUCED_MOTION() ? 'auto' : 'smooth' });
      }
    });
  }

  // Interactive Cassette Deck & All 4 FIG Blueprint Plates
  function bindInteractiveObjects() {
    document.querySelectorAll('[data-cassette-deck]').forEach(deck => {
      if (deck.dataset.cassetteBound === 'true') return;
      deck.dataset.cassetteBound = 'true';
      const trigger = () => {
        pulse('detent');
        deck.classList.remove('is-clicked');
        void deck.offsetWidth;
        deck.classList.add('is-clicked');
        clearTimeout(deck.__cassetteTimer);
        deck.__cassetteTimer = setTimeout(() => deck.classList.remove('is-clicked'), 900);
        const snap = window.AryanMusic?.snapshot?.();
        if (snap && !snap.engaged) window.AryanMusic?.startFirst?.();
        else window.AryanMusic?.toggle?.();
      };
      deck.addEventListener('click', trigger);
      deck.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger();
        }
      });
    });

    document.querySelectorAll('[data-blueprint-plate]').forEach(plate => {
      if (plate.dataset.plateBound === 'true') return;
      plate.dataset.plateBound = 'true';
      const trigger = () => {
        pulse('detent');
        plate.classList.remove('is-active');
        void plate.offsetWidth;
        plate.classList.add('is-active');
        clearTimeout(plate.__plateTimer);
        plate.__plateTimer = setTimeout(() => plate.classList.remove('is-active'), 1600);
      };
      plate.addEventListener('click', trigger);
      plate.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger();
        }
      });
    });
  }

  function bindConsole() {
    try {
      const explicitTheme = localStorage.getItem('aryan-theme');
      if (prefs.skyMode === 'auto' && !explicitTheme) {
        const clockVal = computeClockSolarValue();
        setSkyValue(clockVal, { manual: false, persistTheme: false, silent: true });
      } else {
        applyHtmlFlags();
      }
    } catch {
      applyHtmlFlags();
    }

    bindVernier();
    bindInteractiveObjects();

    const consoleEl = document.querySelector('[data-station-console]');
    if (!consoleEl) return;

    const dialBtn = consoleEl.querySelector('[data-station-dial]');
    const dialNeedle = consoleEl.querySelector('[data-dial-needle]');
    const dialLabel = consoleEl.querySelector('[data-dial-label]');
    const slider = consoleEl.querySelector('[data-light-slider]');
    const lightLabel = consoleEl.querySelector('[data-light-label]');
    const dayBtn = consoleEl.querySelector('[data-set-day]');
    const nightBtn = consoleEl.querySelector('[data-set-night]');
    const syncTimeBtn = consoleEl.querySelector('[data-sync-time]');
    const faderShell = consoleEl.querySelector('.fader-shell-sky');
    const vuBox = consoleEl.querySelector('[data-console-vu]');
    const musicBtn = consoleEl.querySelector('[data-console-music]');
    const trackLabel = consoleEl.querySelector('[data-console-track]');
    const switches = [...consoleEl.querySelectorAll('[data-hw-switch]')];
    const closeBtn = consoleEl.querySelector('[data-console-close]');
    const mobileToggle = document.getElementById('console-toggle');

    const ANGLES = [-120, -40, 40, 120];
    let anchors = getPageAnchors();
    let activeIdx = 0;

    function reflectDial(idx) {
      activeIdx = Math.max(0, Math.min(anchors.length - 1, idx));
      const stepAngles = anchors.length <= 1 ? [0] : anchors.map((_, i) => -120 + (240 * i) / (anchors.length - 1));
      const angle = stepAngles[activeIdx] ?? ANGLES[activeIdx] ?? 0;
      if (dialNeedle) dialNeedle.style.transform = `rotate(${angle}deg)`;
      if (dialLabel) dialLabel.textContent = anchors[activeIdx]?.label || '01 · Top';
    }

    function reflectLight() {
      const dark = currentThemeIsDark();
      let val = prefs.skyMode === 'auto' ? computeClockSolarValue() : prefs.warmth;
      if (dark && val < 50) val = 88;
      else if (!dark && val >= 50) val = 12;
      prefs.warmth = val;

      if (slider && Number(slider.value) !== val) slider.value = String(val);

      const zone = getSkyZone(val);
      if (dayBtn) dayBtn.setAttribute('aria-pressed', String(!dark));
      if (nightBtn) nightBtn.setAttribute('aria-pressed', String(dark));
      if (syncTimeBtn) syncTimeBtn.classList.toggle('is-auto', prefs.skyMode === 'auto');

      if (lightLabel) {
        if (prefs.skyMode === 'auto') {
          const hhmm = formatClockHHMM();
          const tag = zone === 'day' ? 'DAY' : zone === 'terminator' ? 'DUSK' : 'NIGHT';
          lightLabel.textContent = `${hhmm} · ${tag}`;
        } else if (zone === 'terminator') {
          lightLabel.textContent = val < 50 ? 'DAWN / SUNSET' : 'TWILIGHT';
        } else if (!dark) {
          lightLabel.textContent = `DAY · ${Math.round((50 - val) * 2)}%`;
        } else {
          lightLabel.textContent = `NIGHT · ${Math.round((val - 50) * 2)}%`;
        }
      }
      applySkyVars(val);
    }

    function glideSliderTo(targetVal, { manual = true, persistTheme = true } = {}) {
      cancelAnimationFrame(glideRaf);
      const startVal = Number(slider?.value ?? prefs.warmth);
      if (REDUCED_MOTION() || Math.abs(targetVal - startVal) < 2) {
        setSkyValue(targetVal, { manual, persistTheme });
        reflectLight();
        return;
      }
      const startTs = performance.now();
      const duration = 380;
      const step = now => {
        const p = Math.min(1, (now - startTs) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const cur = Math.round(startVal + (targetVal - startVal) * eased);
        setSkyValue(cur, { manual, persistTheme, silent: p < 1 });
        reflectLight();
        if (p < 1) glideRaf = requestAnimationFrame(step);
      };
      glideRaf = requestAnimationFrame(step);
    }

    function reflectSwitches() {
      switches.forEach(btn => {
        const key = btn.dataset.hwSwitch;
        btn.setAttribute('aria-pressed', String(Boolean(prefs[key])));
      });
    }

    function reflectMusic() {
      const snap = window.AryanMusic?.snapshot?.();
      const playing = Boolean(snap?.playing);
      if (vuBox) vuBox.classList.toggle('is-playing', playing);
      document.body.classList.toggle('music-is-playing', playing);
      if (musicBtn) musicBtn.setAttribute('aria-pressed', String(playing));
      if (trackLabel) {
        trackLabel.textContent = playing ? 'Playing' : 'Play';
      }
    }

    function updateScroll(forceDial = false) {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.max(0, Math.round((window.scrollY / maxScroll) * 100)));
      document.documentElement.style.setProperty('--scroll-pct', String(pct));

      const vernier = document.querySelector('[data-brass-vernier]');
      if (vernier) vernier.setAttribute('aria-valuenow', String(pct));
      const vPct = document.querySelector('[data-vernier-pct]');
      if (vPct) vPct.textContent = `${String(pct).padStart(2, '0')}%`;

      anchors = getPageAnchors();
      const pivot = window.scrollY + window.innerHeight * 0.32;
      let nearest = 0;
      anchors.forEach((a, i) => {
        const top = a.el.getBoundingClientRect().top + window.scrollY;
        if (pivot >= top - 40) nearest = i;
      });
      if (forceDial || nearest !== activeIdx) reflectDial(nearest);
    }

    if (consoleEl.dataset.stationBound !== 'true') {
      consoleEl.dataset.stationBound = 'true';

      const stepDial = dir => {
        anchors = getPageAnchors();
        const next = (activeIdx + dir + anchors.length) % anchors.length;
        reflectDial(next);
        pulse('detent');
        const target = anchors[next]?.el;
        if (target) target.scrollIntoView({ behavior: REDUCED_MOTION() ? 'auto' : 'smooth', block: 'start' });
      };

      dialBtn?.addEventListener('click', () => stepDial(1));
      dialBtn?.addEventListener('wheel', e => {
        e.preventDefault();
        stepDial(e.deltaY > 0 ? 1 : -1);
      }, { passive: false });

      slider?.addEventListener('pointerdown', () => faderShell?.classList.add('is-dragging'));
      window.addEventListener('pointerup', () => faderShell?.classList.remove('is-dragging'));
      slider?.addEventListener('input', () => {
        cancelAnimationFrame(glideRaf);
        setSkyValue(slider.value, { manual: true, persistTheme: true });
        reflectLight();
      });
      slider?.addEventListener('change', () => pulse('detent'));

      dayBtn?.addEventListener('click', () => {
        pulse('detent');
        glideSliderTo(8, { manual: true, persistTheme: true });
      });

      nightBtn?.addEventListener('click', () => {
        pulse('detent');
        glideSliderTo(94, { manual: true, persistTheme: true });
      });

      syncTimeBtn?.addEventListener('click', () => {
        pulse('detent');
        try { localStorage.removeItem('aryan-theme'); } catch {}
        const clockVal = computeClockSolarValue();
        glideSliderTo(clockVal, { manual: false, persistTheme: false });
      });

      setInterval(() => {
        if (prefs.skyMode !== 'auto') return;
        const clockVal = computeClockSolarValue();
        setSkyValue(clockVal, { manual: false, persistTheme: false, silent: true });
        reflectLight();
      }, 60_000);

      switches.forEach(btn => btn.addEventListener('click', () => {
        const key = btn.dataset.hwSwitch;
        if (!(key in prefs)) return;
        prefs[key] = !prefs[key];
        applyHtmlFlags();
        savePrefs();
        reflectSwitches();
        pulse('switch');
      }));

      musicBtn?.addEventListener('click', () => {
        pulse('detent');
        const snap = window.AryanMusic?.snapshot?.();
        if (snap && !snap.engaged) window.AryanMusic?.startFirst?.();
        else window.AryanMusic?.toggle?.();
      });

      closeBtn?.addEventListener('click', () => {
        consoleEl.classList.remove('is-open');
        const mt = document.getElementById('console-toggle');
        if (mt) mt.setAttribute('aria-expanded', 'false');
        pulse('switch');
      });

      window.addEventListener('scroll', () => updateScroll(false), { passive: true });
      document.addEventListener('aryan:musicstate', reflectMusic);

      const themeObserver = new MutationObserver(() => reflectLight());
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      document.addEventListener('click', e => {
        const target = e.target instanceof Element ? e.target.closest('.home-paths a, .home-jumps a, .section-action, .footer-cta-btn, .footer-pill-btn') : null;
        if (target) pulse('switch');
      });
    }

    if (mobileToggle && mobileToggle.dataset.consoleToggleBound !== 'true') {
      mobileToggle.dataset.consoleToggleBound = 'true';
      mobileToggle.hidden = false;
      mobileToggle.addEventListener('click', () => {
        const open = !consoleEl.classList.contains('is-open');
        consoleEl.classList.toggle('is-open', open);
        mobileToggle.setAttribute('aria-expanded', String(open));
        pulse('detent');
      });
    }

    anchors = getPageAnchors();
    reflectLight();
    reflectSwitches();
    reflectMusic();
    updateScroll(true);
  }

  window.AryanStation = { pulse, vibrate, computeClockSolarValue, applyGradualPalette };
  document.addEventListener('astro:before-swap', event => {
    if (event.newDocument?.documentElement) applyHtmlFlags(event.newDocument.documentElement);
  });
  document.addEventListener('astro:page-load', bindConsole);
  document.addEventListener('astro:after-swap', () => applyHtmlFlags());
  bindConsole();
})();
