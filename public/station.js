(() => {
  if (globalThis.__aryanStationBooted) return;
  globalThis.__aryanStationBooted = true;

  const PREFS_KEY = 'aryan-station-prefs-v1';
  const REDUCED_MOTION = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let audioCtx = null;
  let glideRaf = 0;

  function computeClockSolarValue(date = new Date()) {
    const hour = date.getHours() + date.getMinutes() / 60;
    // Smooth cosine curve: 12:00 noon -> 5 (brightest day), 06:00 / 18:00 -> 50 (terminator), 00:00 -> 95 (deep night)
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

  function bindConsole() {
    // On first visit in auto mode, honor saved manual aryan-theme only if user explicitly clicked header toggle
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
      let val = prefs.skyMode === 'auto' ? computeClockSolarValue() : prefs.warmth;
      // Keep slider coherent if user toggled Dark/Light via header button
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
      const duration = 340;
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

    function updateScroll() {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.max(0, Math.round((window.scrollY / maxScroll) * 100)));
      document.documentElement.style.setProperty('--scroll-pct', String(pct));
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
        glideSliderTo(10, { manual: true, persistTheme: true });
      });

      nightBtn?.addEventListener('click', () => {
        pulse('detent');
        glideSliderTo(92, { manual: true, persistTheme: true });
      });

      syncTimeBtn?.addEventListener('click', () => {
        pulse('detent');
        try { localStorage.removeItem('aryan-theme'); } catch {}
        const clockVal = computeClockSolarValue();
        glideSliderTo(clockVal, { manual: false, persistTheme: false });
      });

      // Keep local system time gently updated every minute when in auto mode
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

      window.addEventListener('scroll', updateScroll, { passive: true });
      document.addEventListener('aryan:musicstate', reflectMusic);

      // Sync when header theme button toggles manually
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

  window.AryanStation = { pulse, vibrate, computeClockSolarValue };
  document.addEventListener('astro:before-swap', event => {
    if (event.newDocument?.documentElement) applyHtmlFlags(event.newDocument.documentElement);
  });
  document.addEventListener('astro:page-load', bindConsole);
  document.addEventListener('astro:after-swap', () => applyHtmlFlags());
  bindConsole();
})();
