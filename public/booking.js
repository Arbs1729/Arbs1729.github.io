(() => {
  if (globalThis.__aryanBookingBooted) return;
  globalThis.__aryanBookingBooted = true;

  const DEFAULT_BOOKING_URL = 'https://calendly.com/aryanbasantani1729/let-s-chat';
  const CALENDLY_WIDGET_SRC = 'https://assets.calendly.com/assets/external/widget.js';
  const MAX_OFFSET_DAYS = 56;
  const WINDOW_DAYS = 7;

  let calendlyScriptPromise = null;

  function sanitizeUrl(value) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed || /[\u0000-\u001f\u007f]/.test(trimmed)) return '';
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return '';
      return parsed.href;
    } catch {
      return '';
    }
  }

  function detectTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }

  function toUtcDateString(date) {
    return date.toISOString().slice(0, 10);
  }

  function toLocalDayKey(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function formatTimeLabel(isoString, timeZone) {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(isoString));
  }

  function formatFullSlot(isoString, timeZone) {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(isoString));
  }

  function isDarkTheme() {
    const explicit = document.documentElement.dataset.theme;
    if (explicit === 'dark') return true;
    if (explicit === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  }

  function buildEmbedUrl(baseUrl) {
    const safe = sanitizeUrl(baseUrl) || DEFAULT_BOOKING_URL;
    try {
      const url = new URL(safe);
      url.searchParams.set('hide_gdpr_banner', '1');
      if (isDarkTheme()) {
        url.searchParams.set('background_color', '252d29');
        url.searchParams.set('text_color', 'eee9db');
        url.searchParams.set('primary_color', 'ff976c');
      } else {
        url.searchParams.set('background_color', 'f6f1e5');
        url.searchParams.set('text_color', '252923');
        url.searchParams.set('primary_color', 'aa391d');
      }
      return url.href;
    } catch {
      return safe;
    }
  }

  function loadCalendlyWidget() {
    if (window.Calendly && typeof window.Calendly.initInlineWidget === 'function') {
      return Promise.resolve(window.Calendly);
    }
    if (calendlyScriptPromise) return calendlyScriptPromise;

    calendlyScriptPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        calendlyScriptPromise = null;
        reject(new Error('Calendly widget timed out'));
      }, 8000);

      const finish = () => {
        clearTimeout(timer);
        if (window.Calendly && typeof window.Calendly.initInlineWidget === 'function') {
          resolve(window.Calendly);
        } else {
          calendlyScriptPromise = null;
          reject(new Error('Calendly widget unavailable'));
        }
      };

      const existing = document.querySelector('script[data-calendly-widget-script]');
      if (existing) {
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', () => {
          clearTimeout(timer);
          calendlyScriptPromise = null;
          reject(new Error('Calendly widget failed'));
        }, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = CALENDLY_WIDGET_SRC;
      script.async = true;
      script.dataset.calendlyWidgetScript = 'true';
      script.onload = finish;
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        calendlyScriptPromise = null;
        reject(new Error('Calendly widget blocked'));
      };
      document.head.append(script);
    });

    return calendlyScriptPromise;
  }

  function getFocusable(container) {
    return [...container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter(el => !el.hidden && el.offsetParent !== null);
  }

  function setupSheet() {
    const sheet = document.querySelector('[data-booking-sheet]');
    if (!sheet || sheet.dataset.bookingBound === 'true') return null;
    sheet.dataset.bookingBound = 'true';

    const dialog = sheet.querySelector('.booking-dialog');
    const extLink = sheet.querySelector('[data-booking-ext]');
    const loadingEl = sheet.querySelector('[data-booking-loading]');
    const nativeEl = sheet.querySelector('[data-booking-native]');
    const pickerEl = sheet.querySelector('[data-booking-picker]');
    const tzEl = sheet.querySelector('[data-booking-tz]');
    const prevBtn = sheet.querySelector('[data-booking-prev]');
    const nextBtn = sheet.querySelector('[data-booking-next]');
    const rangeEl = sheet.querySelector('[data-booking-range]');
    const daysEl = sheet.querySelector('[data-booking-days]');
    const slotsEl = sheet.querySelector('[data-booking-slots]');
    const formEl = sheet.querySelector('[data-booking-form]');
    const chosenEl = sheet.querySelector('[data-booking-chosen]');
    const errorEl = sheet.querySelector('[data-booking-error]');
    const submitBtn = sheet.querySelector('[data-booking-submit]');
    const confirmedEl = sheet.querySelector('[data-booking-confirmed]');
    const confirmTimeEl = sheet.querySelector('[data-booking-confirm-time]');
    const confirmLinksEl = sheet.querySelector('[data-booking-confirm-links]');
    const embedEl = sheet.querySelector('[data-booking-embed]');
    const embedMount = sheet.querySelector('[data-booking-embed-mount]');
    const embedFallback = sheet.querySelector('[data-booking-embed-fallback]');
    const fallbackLink = sheet.querySelector('[data-booking-fallback-link]');
    const statusEl = sheet.querySelector('[data-booking-status]');

    const apiBase = (sheet.dataset.apiBase || '').replace(/\/+$/, '');
    const defaultUrl = sanitizeUrl(sheet.dataset.bookingUrl) || DEFAULT_BOOKING_URL;
    const timeZone = detectTimeZone();

    const state = {
      open: false,
      mode: null,
      windowOffsetDays: 0,
      slotsByDay: new Map(),
      windowDays: [],
      selectedDayKey: null,
      selectedSlot: null,
      embedUrlMounted: '',
      embedThemeDark: null,
      submitting: false,
      previousFocus: null,
      controller: null,
    };

    function setStatus(message) {
      if (statusEl) statusEl.textContent = message || '';
    }

    function setError(message) {
      if (!errorEl) return;
      errorEl.textContent = message || '';
      errorEl.hidden = !message;
    }

    function setExternalUrl(url) {
      const safe = sanitizeUrl(url) || defaultUrl;
      if (extLink) extLink.href = safe;
      if (fallbackLink) fallbackLink.href = safe;
    }

    function showSection(section) {
      if (loadingEl) loadingEl.hidden = section !== 'loading';
      if (nativeEl) nativeEl.hidden = section !== 'native';
      if (embedEl) embedEl.hidden = section !== 'embed';
    }

    function showNativeStep(step) {
      if (pickerEl) pickerEl.hidden = step !== 'picker';
      if (formEl) formEl.hidden = step !== 'form';
      if (confirmedEl) confirmedEl.hidden = step !== 'confirmed';
    }

    function computeWindowDates() {
      const base = new Date();
      base.setUTCHours(0, 0, 0, 0);
      const start = new Date(base.getTime() + state.windowOffsetDays * 86_400_000);
      const end = new Date(start.getTime() + (WINDOW_DAYS - 1) * 86_400_000);
      const days = [];
      for (let i = 0; i < WINDOW_DAYS; i++) {
        const d = new Date(start.getTime() + i * 86_400_000);
        days.push({
          date: d,
          key: toLocalDayKey(d, timeZone),
          weekday: new Intl.DateTimeFormat(undefined, { timeZone, weekday: 'short' }).format(d),
          dayNum: new Intl.DateTimeFormat(undefined, { timeZone, day: 'numeric' }).format(d),
          month: new Intl.DateTimeFormat(undefined, { timeZone, month: 'short' }).format(d),
        });
      }
      return { start: toUtcDateString(start), end: toUtcDateString(end), days };
    }

    function renderSlotsForDay(dayKey) {
      if (!slotsEl) return;
      const slots = state.slotsByDay.get(dayKey) || [];
      slotsEl.replaceChildren();

      if (!slots.length) {
        const empty = document.createElement('p');
        empty.className = 'booking-empty';
        empty.textContent = 'No open times on this day. Try another day or jump to next week.';
        slotsEl.append(empty);
        return;
      }

      const frag = document.createDocumentFragment();
      for (const slot of slots) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'booking-slot-btn';
        btn.setAttribute('role', 'option');
        const isSelected = state.selectedSlot?.startTime === slot.startTime;
        btn.setAttribute('aria-selected', String(isSelected));
        btn.textContent = formatTimeLabel(slot.startTime, timeZone);
        btn.addEventListener('click', () => {
          state.selectedSlot = slot;
          if (chosenEl) chosenEl.textContent = formatFullSlot(slot.startTime, timeZone);
          setError('');
          showNativeStep('form');
          formEl?.querySelector('input[name="name"]')?.focus();
        });
        frag.append(btn);
      }
      slotsEl.append(frag);
    }

    function renderDayGrid() {
      if (!daysEl) return;
      daysEl.replaceChildren();
      const frag = document.createDocumentFragment();

      for (const day of state.windowDays) {
        const count = (state.slotsByDay.get(day.key) || []).length;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'booking-day-btn';
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', String(state.selectedDayKey === day.key));
        btn.disabled = count === 0;

        const wk = document.createElement('span');
        wk.className = 'booking-day-wk mono';
        wk.textContent = day.weekday;

        const num = document.createElement('strong');
        num.className = 'booking-day-num';
        num.textContent = day.dayNum;

        const meta = document.createElement('small');
        meta.className = 'booking-day-meta';
        meta.textContent = count > 0 ? `${count} open` : day.month;

        btn.append(wk, num, meta);
        btn.addEventListener('click', () => {
          state.selectedDayKey = day.key;
          renderDayGrid();
          renderSlotsForDay(day.key);
        });
        frag.append(btn);
      }
      daysEl.append(frag);
    }

    function renderNativeSlots(slots) {
      state.slotsByDay = new Map();
      for (const slot of slots) {
        if (!slot?.startTime) continue;
        const ts = Date.parse(slot.startTime);
        if (!Number.isFinite(ts)) continue;
        const key = toLocalDayKey(new Date(ts), timeZone);
        const list = state.slotsByDay.get(key) || [];
        list.push(slot);
        state.slotsByDay.set(key, list);
      }

      // Include any extra local day keys from slots shifted across UTC midnight
      const seenKeys = new Set(state.windowDays.map(d => d.key));
      for (const key of state.slotsByDay.keys()) {
        if (!seenKeys.has(key)) {
          const sample = new Date(state.slotsByDay.get(key)[0].startTime);
          state.windowDays.push({
            date: sample,
            key,
            weekday: new Intl.DateTimeFormat(undefined, { timeZone, weekday: 'short' }).format(sample),
            dayNum: new Intl.DateTimeFormat(undefined, { timeZone, day: 'numeric' }).format(sample),
            month: new Intl.DateTimeFormat(undefined, { timeZone, month: 'short' }).format(sample),
          });
          seenKeys.add(key);
        }
      }

      const firstOpen = state.windowDays.find(d => (state.slotsByDay.get(d.key) || []).length > 0);
      state.selectedDayKey = firstOpen ? firstOpen.key : (state.windowDays[0]?.key || null);

      if (tzEl) tzEl.textContent = `Times in ${timeZone}`;
      if (rangeEl && state.windowDays.length) {
        const first = state.windowDays[0];
        const last = state.windowDays[state.windowDays.length - 1];
        rangeEl.textContent = `${first.month} ${first.dayNum} – ${last.month} ${last.dayNum}`;
      }
      if (prevBtn) prevBtn.disabled = state.windowOffsetDays <= 0;
      if (nextBtn) nextBtn.disabled = state.windowOffsetDays >= MAX_OFFSET_DAYS;

      renderDayGrid();
      renderSlotsForDay(state.selectedDayKey);
      showNativeStep('picker');
      showSection('native');
      setStatus(slots.length ? `${slots.length} open time${slots.length === 1 ? '' : 's'} shown in your local timezone.` : 'No open slots in this 7-day window.');
    }

    async function mountEmbed(url, prefill = null) {
      state.mode = 'embed';
      const safeBase = sanitizeUrl(url) || defaultUrl;
      setExternalUrl(safeBase);
      showSection('embed');
      setStatus(prefill?.name || prefill?.email
        ? 'Your selected time and details are pre-filled below — click Schedule Event to confirm.'
        : 'Interactive Calendly calendar loaded on-site.');

      const dark = isDarkTheme();
      const cacheKey = `${safeBase}|${dark}|${prefill?.name || ''}|${prefill?.email || ''}|${prefill?.note || ''}`;
      if (state.embedCacheKey === cacheKey && embedMount?.childElementCount) {
        return;
      }

      if (embedFallback) embedFallback.hidden = true;
      if (embedMount) {
        embedMount.hidden = false;
        embedMount.replaceChildren();
      }

      const prefillObj = {};
      if (prefill?.name) prefillObj.name = prefill.name;
      if (prefill?.email) prefillObj.email = prefill.email;
      if (prefill?.note) prefillObj.customAnswers = { a1: prefill.note };

      try {
        const Calendly = await loadCalendlyWidget();
        if (!state.open || !embedMount) return;
        embedMount.replaceChildren();
        const opts = {
          url: buildEmbedUrl(safeBase),
          parentElement: embedMount,
        };
        if (Object.keys(prefillObj).length) opts.prefill = prefillObj;
        Calendly.initInlineWidget(opts);
        state.embedUrlMounted = safeBase;
        state.embedPrefillMounted = prefill;
        state.embedCacheKey = cacheKey;
        state.embedThemeDark = dark;
      } catch {
        if (embedMount) embedMount.hidden = true;
        if (embedFallback) embedFallback.hidden = false;
        setStatus('Inline calendar could not load here — use the direct link above.');
      }
    }

    async function loadAvailability() {
      state.controller?.abort();
      const { start, end, days } = computeWindowDates();
      state.windowDays = days;
      setError('');

      if (!apiBase) {
        await mountEmbed(defaultUrl);
        return;
      }

      showSection('loading');
      setStatus('Checking availability…');
      const controller = new AbortController();
      state.controller = controller;
      const timer = setTimeout(() => controller.abort(), 12000);

      try {
        const url = `${apiBase}/booking/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        const data = await response.json();
        if (state.controller !== controller) return;

        if (!response.ok) {
          await mountEmbed(data?.fallbackUrl || defaultUrl);
          return;
        }

        if (data.mode === 'native' && Array.isArray(data.slots)) {
          state.mode = 'native';
          setExternalUrl(data.fallbackUrl || defaultUrl);
          renderNativeSlots(data.slots);
          return;
        }

        await mountEmbed(data.url || defaultUrl);
      } catch {
        if (state.controller !== controller) return;
        await mountEmbed(defaultUrl);
      } finally {
        clearTimeout(timer);
        if (state.controller === controller) state.controller = null;
      }
    }

    async function handleBookingSubmit(event) {
      event.preventDefault();
      if (state.submitting || !state.selectedSlot || !formEl) return;

      const formData = new FormData(formEl);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const note = String(formData.get('note') || '').trim();

      if (!name || name.length > 120) {
        setError('Please enter your name.');
        formEl.querySelector('input[name="name"]')?.focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        setError('Please enter a valid email address.');
        formEl.querySelector('input[name="email"]')?.focus();
        return;
      }
      if (note.length > 500) {
        setError('Please keep your note under 500 characters.');
        return;
      }

      state.submitting = true;
      setError('');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Booking…';
      }

      try {
        const response = await fetch(`${apiBase}/booking/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            startTime: state.selectedSlot.startTime,
            name,
            email,
            timezone: timeZone,
            note,
          }),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          setError(data?.error || 'Could not confirm this slot. Please try another time.');
          if (response.status === 409) {
            state.selectedSlot = null;
            setTimeout(() => loadAvailability(), 1200);
          }
          return;
        }

        if (confirmTimeEl) {
          confirmTimeEl.textContent = formatFullSlot(data.startTime || state.selectedSlot.startTime, timeZone);
        }
        if (confirmLinksEl) {
          confirmLinksEl.replaceChildren();
          const links = [
            { label: 'Reschedule', href: sanitizeUrl(data.rescheduleUrl) },
            { label: 'Cancel', href: sanitizeUrl(data.cancelUrl) },
          ].filter(item => item.href);
          for (const item of links) {
            const a = document.createElement('a');
            a.className = 'booking-link-pill mono';
            a.href = item.href;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = `${item.label} ↗`;
            confirmLinksEl.append(a);
          }
        }
        formEl.reset();
        showNativeStep('confirmed');
        setStatus('Booking confirmed.');
      } catch {
        setError('Connection failed. Please try again or use “Open in new tab ↗”.');
      } finally {
        state.submitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm booking';
        }
      }
    }

    function open(triggerUrl, prefill = null) {
      const hasDirectTarget = Boolean(
        prefill || (triggerUrl && sanitizeUrl(triggerUrl) && sanitizeUrl(triggerUrl) !== sanitizeUrl(defaultUrl)),
      );
      if (state.open && !hasDirectTarget) return;
      state.open = true;
      if (!state.previousFocus) state.previousFocus = document.activeElement;
      if (triggerUrl) setExternalUrl(triggerUrl);
      sheet.hidden = false;
      document.body.classList.add('booking-open');

      const closeBtn = sheet.querySelector('.booking-close');
      (closeBtn || dialog)?.focus();

      if (hasDirectTarget) {
        mountEmbed(triggerUrl || defaultUrl, prefill);
        return;
      }

      if (state.mode === 'embed' && state.embedThemeDark === isDarkTheme() && embedMount?.childElementCount) {
        showSection('embed');
      } else {
        state.windowOffsetDays = 0;
        state.selectedSlot = null;
        loadAvailability();
      }
    }

    function close() {
      if (!state.open) return;
      state.open = false;
      state.controller?.abort();
      sheet.hidden = true;
      document.body.classList.remove('booking-open');
      if (state.previousFocus instanceof HTMLElement) {
        try { state.previousFocus.focus(); } catch {}
      }
      state.previousFocus = null;
    }

    sheet.querySelectorAll('[data-booking-close]').forEach(el => {
      el.addEventListener('click', close);
    });
    sheet.querySelector('[data-booking-done]')?.addEventListener('click', close);

    const goBackToPicker = () => {
      setError('');
      showNativeStep('picker');
    };
    sheet.querySelector('[data-booking-back]')?.addEventListener('click', goBackToPicker);
    sheet.querySelector('[data-booking-back-btn]')?.addEventListener('click', goBackToPicker);

    prevBtn?.addEventListener('click', () => {
      if (state.windowOffsetDays <= 0) return;
      state.windowOffsetDays = Math.max(0, state.windowOffsetDays - WINDOW_DAYS);
      loadAvailability();
    });
    nextBtn?.addEventListener('click', () => {
      if (state.windowOffsetDays >= MAX_OFFSET_DAYS) return;
      state.windowOffsetDays = Math.min(MAX_OFFSET_DAYS, state.windowOffsetDays + WINDOW_DAYS);
      loadAvailability();
    });

    formEl?.addEventListener('submit', handleBookingSubmit);

    function handleKeydown(event) {
      if (!state.open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'Tab' && dialog) {
        const focusable = getFocusable(dialog);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    function handleThemeChange() {
      if (state.mode === 'embed' && state.open && state.embedUrlMounted) {
        mountEmbed(state.embedUrlMounted, state.embedPrefillMounted || null);
      }
    }

    return {
      open,
      close,
      handleKeydown,
      handleThemeChange,
      isConnected: () => sheet.isConnected,
    };
  }

  let controller = null;
  function ensureController() {
    if (!controller || !controller.isConnected()) {
      controller = setupSheet();
    }
    return controller;
  }

  document.addEventListener('keydown', event => controller?.handleKeydown(event));
  document.addEventListener('aryan:themechange', () => controller?.handleThemeChange());
  document.addEventListener('astro:before-preparation', () => controller?.close());

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const trigger = event.target instanceof Element ? event.target.closest('[data-open-booking]') : null;
    if (!trigger) return;
    const ctrl = ensureController();
    if (!ctrl) return;
    event.preventDefault();
    const href = trigger.getAttribute('href') || trigger.dataset.bookingUrl || '';
    ctrl.open(href);
  });

  document.addEventListener('astro:page-load', ensureController);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureController, { once: true });
  } else {
    ensureController();
  }

  globalThis.AryanBooking = {
    open(url, prefill) {
      ensureController()?.open(url, prefill);
    },
    close() {
      controller?.close();
    },
  };
})();
