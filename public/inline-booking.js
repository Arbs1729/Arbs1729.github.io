(() => {
  if (globalThis.__aryanInlineBookingBooted) return;
  globalThis.__aryanInlineBookingBooted = true;

  const DEFAULT_BOOKING_URL = 'https://calendly.com/aryanbasantani1729/let-s-chat';
  const DEFAULT_IST_HOURS = [
    { h: 19, m: 30 },
    { h: 20, m: 0 },
    { h: 21, m: 0 },
    { h: 23, m: 0 },
  ];

  function detectTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }

  function formatTzWithOffset(tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
      const off = parts.find(p => p.type === 'timeZoneName')?.value || '';
      return off ? `${tz} (${off})` : tz;
    } catch {
      return tz;
    }
  }

  function dayKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function localDayKey(date, tz) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function formatSlot24(iso, tz) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  }

  function formatDateHeading(key) {
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const wd = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(dt);
    const mo = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(dt);
    return `${wd} ${d} ${mo}`;
  }

  function groupSlotsByDay(rawSlots, tz, bookingUrl) {
    const map = new Map();
    const now = Date.now() + 60_000;
    const base = bookingUrl.replace(/\/+$/, '');
    for (const s of rawSlots) {
      const startIso = s.startTime || s.start || s.start_time;
      if (!startIso) continue;
      const ts = Date.parse(startIso);
      if (!Number.isFinite(ts) || ts < now) continue;
      const lk = localDayKey(new Date(ts), tz);
      const list = map.get(lk) || [];
      list.push({
        start: new Date(ts).toISOString(),
        rawIso: startIso,
        label: formatSlot24(ts, tz),
        schedulingUrl: s.schedulingUrl || `${base}/${encodeURIComponent(startIso)}`,
      });
      map.set(lk, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    }
    return map;
  }

  function buildFallbackSlotsForMonth(year, month, tz, bookingUrl) {
    const raw = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = dayKey(year, month, day);
      for (const { h, m } of DEFAULT_IST_HOURS) {
        const rawIso = `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+05:30`;
        raw.push({ startTime: rawIso });
      }
    }
    return groupSlotsByDay(raw, tz, bookingUrl);
  }

  function mountInlineBooking() {
    const root = document.querySelector('[data-inline-booking]');
    if (!root || root.dataset.ibBound === 'true') return;
    root.dataset.ibBound = 'true';

    const apiBase = (root.dataset.apiBase || '').replace(/\/+$/, '');
    const bookingUrl = (root.dataset.bookingUrl || DEFAULT_BOOKING_URL).replace(/\/+$/, '');
    const tz = detectTimeZone();

    let snapshot = null;
    try { snapshot = JSON.parse(root.dataset.snapshot || 'null'); } catch {}

    const prevBtn = root.querySelector('[data-ib-prev]');
    const nextBtn = root.querySelector('[data-ib-next]');
    const monthLabel = root.querySelector('[data-ib-month-label]');
    const daysGrid = root.querySelector('[data-ib-days]');
    const dateHeading = root.querySelector('[data-ib-date-heading]');
    const slotsBox = root.querySelector('[data-ib-slots]');
    const tzEl = root.querySelector('[data-ib-tz]');
    const sourceEl = root.querySelector('[data-ib-source]');
    const form = root.querySelector('[data-ib-form]');
    const cancelBtn = root.querySelector('[data-ib-cancel]');
    const submitBtn = root.querySelector('[data-ib-submit]');
    const errorEl = root.querySelector('[data-ib-error]');
    const confirmedEl = root.querySelector('[data-ib-confirmed]');
    const confirmedText = root.querySelector('[data-ib-confirmed-text]');

    if (tzEl) tzEl.textContent = formatTzWithOffset(tz);

    const today = new Date();
    const todayKey = localDayKey(today, tz);
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();
    let selectedDay = '';
    let selectedSlot = null;
    let bookingMode = 'fallback'; // 'native' | 'public-slots' | 'snapshot' | 'fallback'
    let slotsByDay = new Map();

    function pickDefaultDay() {
      const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
      const sorted = [...slotsByDay.keys()].filter(k => k.startsWith(prefix)).sort();
      if (selectedDay && slotsByDay.has(selectedDay) && selectedDay.startsWith(prefix)) return;
      selectedDay = sorted[0] || '';
      selectedSlot = null;
      if (form) form.hidden = true;
    }

    function updateSourceBadge() {
      if (!sourceEl) return;
      if (bookingMode === 'native' || bookingMode === 'public-slots') {
        sourceEl.textContent = 'LIVE AVAILABILITY · CALENDLY';
        sourceEl.hidden = false;
      } else if (bookingMode === 'snapshot') {
        sourceEl.textContent = 'SYNCED WITH CALENDLY';
        sourceEl.hidden = false;
      } else {
        sourceEl.hidden = true;
      }
    }

    function renderSlots() {
      if (!slotsBox) return;
      slotsBox.replaceChildren();
      if (!selectedDay) {
        if (dateHeading) dateHeading.textContent = 'No open times this month';
        const empty = document.createElement('p');
        empty.className = 'ib-empty';
        empty.textContent = 'Try the next month with → above.';
        slotsBox.append(empty);
        return;
      }

      if (dateHeading) dateHeading.textContent = formatDateHeading(selectedDay);
      const slots = slotsByDay.get(selectedDay) || [];
      if (!slots.length) {
        const empty = document.createElement('p');
        empty.className = 'ib-empty';
        empty.textContent = 'No open slots on this date.';
        slotsBox.append(empty);
        return;
      }

      slots.forEach(slot => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ib-slot-btn';
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', String(selectedSlot?.start === slot.start));
        btn.textContent = slot.label;
        btn.addEventListener('click', () => {
          selectedSlot = slot;
          window.AryanStation?.pulse?.('detent');
          renderSlots();
          if (confirmedEl) confirmedEl.hidden = true;
          if (errorEl) errorEl.hidden = true;
          if (form) {
            form.hidden = false;
            form.querySelector('input[name="name"]')?.focus();
          }
          if (submitBtn) {
            submitBtn.textContent = bookingMode === 'native'
              ? `Confirm ${slot.label}`
              : `Continue to confirm ${slot.label}`;
          }
        });
        slotsBox.append(btn);
      });
    }

    function renderMonth() {
      if (!daysGrid) return;
      const monthDt = new Date(Date.UTC(viewYear, viewMonth, 1, 12, 0, 0));
      if (monthLabel) {
        monthLabel.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDt);
      }

      const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      daysGrid.replaceChildren();

      for (let i = 0; i < firstDow; i++) {
        const pad = document.createElement('span');
        pad.className = 'ib-day-pad';
        pad.setAttribute('aria-hidden', 'true');
        daysGrid.append(pad);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const key = dayKey(viewYear, viewMonth, d);
        const hasSlots = (slotsByDay.get(key) || []).length > 0;
        const isPast = key < todayKey;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ib-day-btn';
        if (key === selectedDay) btn.classList.add('is-selected');
        if (key === todayKey) btn.classList.add('is-today');
        btn.textContent = String(d);
        btn.disabled = isPast || !hasSlots;
        btn.setAttribute('aria-pressed', String(key === selectedDay));
        btn.setAttribute('aria-label', `${formatDateHeading(key)}${hasSlots ? ', available' : ', unavailable'}`);
        btn.addEventListener('click', () => {
          selectedDay = key;
          selectedSlot = null;
          if (form) form.hidden = true;
          if (confirmedEl) confirmedEl.hidden = true;
          window.AryanStation?.pulse?.('switch');
          renderMonth();
          renderSlots();
        });
        daysGrid.append(btn);
      }

      const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
      if (prevBtn) prevBtn.disabled = isCurrentMonth;
    }

    async function loadMonth() {
      const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
      bookingMode = 'fallback';
      slotsByDay = new Map();

      // 1. Live Worker availability (supports both paid native API AND free public Calendly slot proxy!)
      if (apiBase) {
        try {
          const startDate = new Date(viewYear, viewMonth, 1);
          const endDate = new Date(viewYear, viewMonth + 1, 0);
          const url = new URL(`${apiBase}/booking/availability`);
          url.searchParams.set('start', dayKey(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
          url.searchParams.set('end', dayKey(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()));
          url.searchParams.set('timezone', tz);
          url.searchParams.set('public', '1');
          const res = await fetch(url.href, { signal: AbortSignal.timeout(7000) });
          if (res.ok) {
            const payload = await res.json();
            if ((payload.mode === 'native' || payload.mode === 'public-slots') && Array.isArray(payload.slots)) {
              bookingMode = payload.mode;
              slotsByDay = groupSlotsByDay(payload.slots, tz, payload.fallbackUrl || bookingUrl);
              updateSourceBadge();
              pickDefaultDay();
              renderMonth();
              renderSlots();
              return;
            }
          }
        } catch {}
      }

      // 2. Real Calendly snapshot synced via GitHub Pro Actions (scripts/sync-calendly.mjs)
      if (snapshot && Array.isArray(snapshot.slots) && snapshot.slots.length) {
        const snapMap = groupSlotsByDay(snapshot.slots, tz, snapshot.bookingUrl || bookingUrl);
        const hasMonthSlots = [...snapMap.keys()].some(k => k.startsWith(monthPrefix));
        if (hasMonthSlots) {
          bookingMode = 'snapshot';
          slotsByDay = snapMap;
          updateSourceBadge();
          pickDefaultDay();
          renderMonth();
          renderSlots();
          return;
        }
      }

      // 3. Graceful fallback schedule (pre-fills exact date & visitor info straight into Calendly)
      slotsByDay = buildFallbackSlotsForMonth(viewYear, viewMonth, tz, bookingUrl);
      updateSourceBadge();
      pickDefaultDay();
      renderMonth();
      renderSlots();
    }

    prevBtn?.addEventListener('click', () => {
      if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) return;
      viewMonth -= 1;
      if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
      selectedDay = '';
      window.AryanStation?.pulse?.('switch');
      loadMonth();
    });

    nextBtn?.addEventListener('click', () => {
      viewMonth += 1;
      if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
      selectedDay = '';
      window.AryanStation?.pulse?.('switch');
      loadMonth();
    });

    cancelBtn?.addEventListener('click', () => {
      selectedSlot = null;
      if (form) form.hidden = true;
      renderSlots();
    });

    form?.addEventListener('submit', async e => {
      e.preventDefault();
      if (!selectedSlot) return;
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const email = String(fd.get('email') || '').trim();
      const note = String(fd.get('note') || '').trim();

      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (errorEl) {
          errorEl.textContent = 'Please enter your name and a valid email address.';
          errorEl.hidden = false;
        }
        return;
      }
      if (errorEl) errorEl.hidden = true;

      if (bookingMode === 'native' && apiBase) {
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Booking…'; }
        try {
          const res = await fetch(`${apiBase}/booking/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startTime: selectedSlot.start, name, email, note, timezone: tz }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Could not confirm slot');
          form.hidden = true;
          if (confirmedEl && confirmedText) {
            confirmedText.textContent = `Booked for ${formatDateHeading(selectedDay)} at ${selectedSlot.label}. Calendar invite sent to ${email}.`;
            confirmedEl.hidden = false;
          }
          window.AryanStation?.pulse?.('mode');
        } catch (err) {
          if (errorEl) {
            errorEl.textContent = err instanceof Error ? err.message : 'Unable to book this slot right now.';
            errorEl.hidden = false;
          }
        } finally {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = `Confirm ${selectedSlot.label}`; }
        }
        return;
      }

      // Calendly Free handoff: jump directly to exact slot (when live/synced) or exact date,
      // passing BOTH URL params AND Calendly.initInlineWidget prefill object so zero fields are re-typed!
      try {
        const directBase = (bookingMode === 'public-slots' || bookingMode === 'snapshot') && selectedSlot.schedulingUrl
          ? selectedSlot.schedulingUrl
          : bookingUrl;
        const target = new URL(directBase);
        target.searchParams.set('month', selectedDay.slice(0, 7));
        target.searchParams.set('date', selectedDay);
        target.searchParams.set('name', name);
        target.searchParams.set('email', email);
        if (note) target.searchParams.set('a1', note);
        window.AryanStation?.pulse?.('mode');
        if (window.AryanBooking?.open) {
          window.AryanBooking.open(target.href, { name, email, note });
        } else {
          window.open(target.href, '_blank', 'noopener,noreferrer');
        }
      } catch {
        window.open(bookingUrl, '_blank', 'noopener,noreferrer');
      }
    });

    loadMonth();
  }

  document.addEventListener('astro:page-load', mountInlineBooking);
  mountInlineBooking();
})();
