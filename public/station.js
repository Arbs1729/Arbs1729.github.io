(() => {
  if (globalThis.__aryanStationBooted) return;
  globalThis.__aryanStationBooted = true;

  const PREFS_KEY = 'aryan-station-prefs-v1';
  const REDUCED_MOTION = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let audioCtx = null;
  let prefs = { hud: true, stars: true, click: false, warmth: null };

  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if (typeof saved.hud === 'boolean') prefs.hud = saved.hud;
      if (typeof saved.stars === 'boolean') prefs.stars = saved.stars;
      if (typeof saved.click === 'boolean') prefs.click = saved.click;
      if (typeof saved.warmth === 'number') prefs.warmth = saved.warmth;
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

  function applyHtmlFlags(root = document.documentElement) {
    if (!root) return;
    root.dataset.hud = prefs.hud ? 'on' : 'off';
    root.dataset.stars = prefs.stars ? 'on' : 'off';
    const level = typeof prefs.warmth === 'number' ? prefs.warmth : (currentThemeIsDark() ? 88 : 12);
    root.style.setProperty('--station-night', String(level / 100));
  }

  function syncThemeFromSlider(val) {
    const n = Math.min(100, Math.max(0, Number(val) || 0));
    const prevDark = currentThemeIsDark();
    const nextDark = n >= 50;
    prefs.warmth = n;
    document.documentElement.style.setProperty('--station-night', String(n / 100));

    if (nextDark !== prevDark) {
      const nextTheme = nextDark ? 'dark' : 'light';
      if (window.AryanTheme?.set) {
        window.AryanTheme.set(nextTheme);
      } else {
        document.documentElement.dataset.theme = nextTheme;
        try { localStorage.setItem('aryan-theme', nextTheme); } catch {}
        const label = document.getElementById('theme-label');
        if (label) label.textContent = nextDark ? 'Dark' : 'Light';
      }
      pulse('mode');
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

  function bindConsole() {
    applyHtmlFlags();
    const consoleEl = document.querySelector('[data-station-console]');
    if (!consoleEl) return;

    const dialBtn = consoleEl.querySelector('[data-station-dial]');
    const dialNeedle = consoleEl.querySelector('[data-dial-needle]');
    const dialLabel = consoleEl.querySelector('[data-dial-label]');
    const slider = consoleEl.querySelector('[data-light-slider]');
    const lightLabel = consoleEl.querySelector('[data-light-label]');
    const depthPct = consoleEl.querySelector('[data-depth-pct]');
    const depthFill = consoleEl.querySelector('[data-depth-fill]');
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
      const val = typeof prefs.warmth === 'number'
        ? ((dark && prefs.warmth < 50) ? 88 : (!dark && prefs.warmth >= 50) ? 12 : prefs.warmth)
        : (dark ? 88 : 12);
      prefs.warmth = val;
      if (slider && Number(slider.value) !== val) slider.value = String(val);
      if (lightLabel) {
        lightLabel.textContent = val < 50
          ? `DAY · ${Math.round((50 - val) * 2)}%`
          : `NIGHT · ${Math.round((val - 50) * 2)}%`;
      }
      document.documentElement.style.setProperty('--station-night', String(val / 100));
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
      if (musicBtn) musicBtn.setAttribute('aria-pressed', String(playing));
      if (trackLabel) {
        trackLabel.textContent = playing ? 'Playing' : 'Play';
      }
    }

    function updateScroll() {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.max(0, Math.round((window.scrollY / maxScroll) * 100)));
      if (depthPct) depthPct.textContent = `${String(pct).padStart(2, '0')}%`;
      if (depthFill) depthFill.style.width = `${pct}%`;

      anchors = getPageAnchors();
      const pivot = window.scrollY + window.innerHeight * 0.32;
      let nearest = 0;
      anchors.forEach((a, i) => {
        const top = a.el.getBoundingClientRect().top + window.scrollY;
        if (pivot >= top - 40) nearest = i;
      });
      if (nearest !== activeIdx) reflectDial(nearest);
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

      slider?.addEventListener('input', () => {
        syncThemeFromSlider(slider.value);
        reflectLight();
      });
      slider?.addEventListener('change', () => pulse('detent'));

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

      window.addEventListener('scroll', updateScroll, { passive: true });
      document.addEventListener('aryan:musicstate', reflectMusic);

      // Sync when header theme button toggles
      const themeObserver = new MutationObserver(() => reflectLight());
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      // Tactile haptic micro-pulse on interactive room/button clicks
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
    updateScroll();
  }

  window.AryanStation = { pulse, vibrate };
  document.addEventListener('astro:before-swap', event => {
    if (event.newDocument?.documentElement) applyHtmlFlags(event.newDocument.documentElement);
  });
  document.addEventListener('astro:page-load', bindConsole);
  document.addEventListener('astro:after-swap', () => applyHtmlFlags());
  bindConsole();
})();
