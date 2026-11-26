(() => {
  const arrival = document.querySelector('#arrival');
  const video = document.querySelector('#arrival-video');
  const skip = document.querySelector('#skip-arrival');
  const audio = document.querySelector('#arrival-audio');
  if (!arrival || !video || !skip) return;

  window.__aryanArrivalAbort?.abort();
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  window.__aryanArrivalAbort = lifecycle;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const arrivalKey = 'aryan-arrival-seen';
  const sourceCacheKey = 'aryan-intro-source-v1';
  const sourceCacheTtl = 45 * 60 * 1000;
  const DISSOLVE_MS = 900;
  const STALL_TIMEOUT_MS = 3500;
  const forceArrival = new URLSearchParams(location.search).get('intro') === '1';
  let seenThisTab = false;
  try { seenThisTab = sessionStorage.getItem(arrivalKey) === '1'; } catch {}

  const sources = { landscape: arrival.dataset.landscapeSrc, portrait: arrival.dataset.portraitSrc };
  const posters = { landscape: arrival.dataset.landscapePoster, portrait: arrival.dataset.portraitPoster };
  const sourceRatios = { landscape: 16 / 9, portrait: 9 / 16 };
  let selected = arrival.dataset.format || '';
  let finished = false;
  let revealing = false;
  let revealStartedAt = 0;
  let transitionTimer = 0;
  let resizeTimer = 0;
  let scrollSettleTimer = 0;
  let stallTimer = 0;
  let pinTop = false;

  const holdAtTop = () => {
    if (pinTop && window.scrollY > 0) window.scrollTo(0, 0);
  };

  const clearStallTimer = () => {
    clearTimeout(stallTimer);
    stallTimer = 0;
  };

  const armStallFallback = () => {
    clearStallTimer();
    if (finished || revealing) return;
    const startTime = video.currentTime;
    stallTimer = setTimeout(() => {
      if (finished || revealing) return;
      if (video.readyState < 3 || Math.abs(video.currentTime - startTime) < 0.12) {
        complete(false);
      }
    }, STALL_TIMEOUT_MS);
  };

  const targetRate = () => (video.duration && video.duration > 8.5 ? 1.25 : 1);

  const retainedFrame = (viewportRatio, sourceRatio) => Math.min(viewportRatio / sourceRatio, sourceRatio / viewportRatio);
  const closestSource = () => {
    const ratio = Math.max(innerWidth, 1) / Math.max(innerHeight, 1);
    return retainedFrame(ratio, sourceRatios.landscape) >= retainedFrame(ratio, sourceRatios.portrait) ? 'landscape' : 'portrait';
  };

  const cachedSource = () => {
    const best = closestSource();
    try {
      const cached = JSON.parse(localStorage.getItem(sourceCacheKey) || 'null');
      if (cached?.variant === best && Date.now() - cached.ts < sourceCacheTtl) return cached.variant;
      localStorage.setItem(sourceCacheKey, JSON.stringify({ variant: best, ts: Date.now() }));
    } catch {}
    return best;
  };

  const setAudioState = muted => {
    video.muted = muted;
    if (!audio) return;
    audio.setAttribute('aria-pressed', String(!muted));
    audio.setAttribute('aria-label', muted ? 'Unmute intro' : 'Mute intro');
    audio.querySelector('span').textContent = muted ? '🔇' : '🔊';
  };

  const cleanPageState = (resetScroll = true, settleScroll = true) => {
    document.documentElement.classList.remove('arrival-active', 'arrival-revealing');
    if (!resetScroll) {
      pinTop = false;
      removeEventListener('scroll', holdAtTop);
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    clearTimeout(scrollSettleTimer);
    if (!settleScroll) {
      pinTop = false;
      removeEventListener('scroll', holdAtTop);
      return;
    }
    scrollSettleTimer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      pinTop = false;
      removeEventListener('scroll', holdAtTop);
    }, 450);
  };

  const reveal = () => {
    if (revealing || finished) return;
    clearStallTimer();
    revealing = true;
    revealStartedAt = performance.now();
    arrival.classList.add('is-transitioning');
    document.documentElement.classList.add('arrival-revealing');
    document.dispatchEvent(new CustomEvent('aryan:arrivalreveal'));
  };

  const complete = (immediate = false) => {
    if (finished) return;
    clearStallTimer();
    if (!immediate && !revealing) reveal();
    finished = true;
    clearTimeout(transitionTimer);
    if (immediate) {
      video.pause();
      arrival.hidden = true;
      cleanPageState();
      document.dispatchEvent(new CustomEvent('aryan:arrivalcomplete'));
      return;
    }
    const remaining = Math.max(0, DISSOLVE_MS - (performance.now() - revealStartedAt));
    transitionTimer = setTimeout(() => {
      video.pause();
      arrival.hidden = true;
      cleanPageState();
      document.dispatchEvent(new CustomEvent('aryan:arrivalcomplete'));
    }, remaining);
  };

  const play = async () => {
    if (finished) return;
    video.playbackRate = targetRate();
    try { await video.play(); }
    catch {
      arrival.classList.add('is-ready');
      armStallFallback();
    }
  };

  const selectVideo = (preserveProgress = false) => {
    const next = cachedSource();
    if (next === selected || revealing || finished) return;
    const progress = preserveProgress && video.duration ? video.currentTime / video.duration : 0;
    selected = next;
    arrival.dataset.format = next;
    arrival.classList.remove('is-ready');
    if (posters[next]) video.poster = posters[next];
    video.src = sources[next];
    video.load();
    armStallFallback();
    video.addEventListener('loadedmetadata', () => {
      video.playbackRate = targetRate();
      if (progress > 0 && video.duration) video.currentTime = Math.min(video.duration * progress, video.duration - .2);
    }, { once: true });
  };

  const replay = () => {
    finished = false;
    revealing = false;
    revealStartedAt = 0;
    clearTimeout(transitionTimer);
    arrival.classList.remove('is-transitioning');
    arrival.hidden = false;
    setAudioState(true);
    video.currentTime = 0;
    video.playbackRate = targetRate();
    pinTop = true;
    window.scrollTo(0, 0);
    addEventListener('scroll', holdAtTop, { passive: true, signal });
    document.documentElement.classList.add('arrival-active');
    document.documentElement.classList.remove('arrival-revealing');
    selectVideo();
    armStallFallback();
    play();
  };

  skip.addEventListener('click', event => { event.preventDefault(); complete(true); }, { signal });
  audio?.addEventListener('click', () => setAudioState(!video.muted), { signal });
  video.addEventListener('loadedmetadata', () => { video.playbackRate = targetRate(); }, { signal });
  video.addEventListener('canplay', () => { arrival.classList.add('is-ready'); play(); }, { signal });
  video.addEventListener('playing', () => { arrival.classList.add('is-ready'); clearStallTimer(); }, { signal });
  video.addEventListener('waiting', armStallFallback, { signal });
  video.addEventListener('stalled', armStallFallback, { signal });
  video.addEventListener('error', () => complete(true), { signal });
  video.addEventListener('ended', () => complete(false), { signal });
  video.addEventListener('timeupdate', () => {
    if (video.currentTime > 0.15) clearStallTimer();
    const rate = video.playbackRate || 1;
    const leadSeconds = (DISSOLVE_MS / 1000) * rate;
    if (video.duration && video.currentTime >= video.duration - leadSeconds) reveal();
  }, { signal });

  document.addEventListener('aryan:introreplay', replay, { signal });
  document.addEventListener('astro:before-swap', () => {
    clearStallTimer();
    clearTimeout(transitionTimer);
    clearTimeout(resizeTimer);
    clearTimeout(scrollSettleTimer);
    pinTop = false;
    removeEventListener('scroll', holdAtTop);
    document.documentElement.classList.remove('arrival-active', 'arrival-revealing');
    lifecycle.abort();
  }, { once: true, signal });

  try { sessionStorage.setItem(arrivalKey, '1'); } catch {}
  if (reduced.matches || location.hash || (seenThisTab && !forceArrival)) {
    arrival.hidden = true;
    finished = true;
    cleanPageState(!location.hash, false);
    document.dispatchEvent(new CustomEvent('aryan:arrivalcomplete'));
    return;
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  pinTop = true;
  window.scrollTo(0, 0);
  addEventListener('scroll', holdAtTop, { passive: true, signal });
  requestAnimationFrame(holdAtTop);
  document.documentElement.classList.add('arrival-active');
  setAudioState(true);
  selectVideo();
  armStallFallback();
  if (video.readyState >= 2) {
    arrival.classList.add('is-ready');
    play();
  }

  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => selectVideo(true), 180);
  }, { passive: true, signal });

  const moveOn = event => { event.preventDefault(); complete(true); };
  addEventListener('wheel', moveOn, { once: true, passive: false, signal });
  addEventListener('touchmove', moveOn, { once: true, passive: false, signal });
})();
