(() => {
  const arrival = document.querySelector('#arrival');
  const video = document.querySelector('#arrival-video');
  const skip = document.querySelector('#skip-arrival');
  const audio = document.querySelector('#arrival-audio');
  if (!arrival || !video || !skip) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const arrivalKey = 'aryan-arrival-seen';
  const sourceCacheKey = 'aryan-intro-source-v1';
  const sourceCacheTtl = 45 * 60 * 1000;
  const forceArrival = new URLSearchParams(location.search).get('intro') === '1';
  let seenThisTab = false;
  try { seenThisTab = sessionStorage.getItem(arrivalKey) === '1'; } catch {}

  const sources = { landscape: arrival.dataset.landscapeSrc, portrait: arrival.dataset.portraitSrc };
  const sourceRatios = { landscape: 16 / 9, portrait: 9 / 16 };
  let selected = arrival.dataset.format || '';
  let finished = false;
  let revealing = false;
  let revealStartedAt = 0;
  let transitionTimer = 0;
  let resizeTimer = 0;
  let scrollSettleTimer = 0;
  let pinTop = false;

  const holdAtTop = () => {
    if (pinTop && window.scrollY > 0) window.scrollTo(0, 0);
  };

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
    }, 500);
  };

  const reveal = () => {
    if (revealing || finished) return;
    revealing = true;
    revealStartedAt = performance.now();
    arrival.classList.add('is-transitioning');
    document.documentElement.classList.add('arrival-revealing');
  };

  const complete = (immediate = false) => {
    if (finished) return;
    if (!immediate && !revealing) reveal();
    finished = true;
    clearTimeout(transitionTimer);
    video.pause();
    if (immediate) {
      arrival.hidden = true;
      cleanPageState();
      document.dispatchEvent(new CustomEvent('aryan:arrivalcomplete'));
      return;
    }
    const remaining = Math.max(0, 760 - (performance.now() - revealStartedAt));
    transitionTimer = setTimeout(() => {
      arrival.hidden = true;
      cleanPageState();
      document.dispatchEvent(new CustomEvent('aryan:arrivalcomplete'));
    }, remaining);
  };

  const play = async () => {
    video.playbackRate = 1.45;
    try { await video.play(); }
    catch { arrival.classList.add('is-ready'); }
  };

  const selectVideo = (preserveProgress = false) => {
    const next = cachedSource();
    if (next === selected || revealing || finished) return;
    const progress = preserveProgress && video.duration ? video.currentTime / video.duration : 0;
    selected = next;
    arrival.dataset.format = next;
    arrival.classList.remove('is-ready');
    video.src = sources[next];
    video.load();
    video.addEventListener('loadedmetadata', () => {
      if (progress > 0 && video.duration) video.currentTime = Math.min(video.duration * progress, video.duration - .2);
    }, { once: true });
  };

  const replay = () => {
    finished = false;
    revealing = false;
    revealStartedAt = 0;
    arrival.classList.remove('is-transitioning');
    arrival.hidden = false;
    setAudioState(true);
    video.currentTime = 0;
    video.playbackRate = 1.45;
    pinTop = true;
    window.scrollTo(0, 0);
    addEventListener('scroll', holdAtTop, { passive: true });
    document.documentElement.classList.add('arrival-active');
    document.documentElement.classList.remove('arrival-revealing');
    selectVideo();
    play();
  };

  skip.addEventListener('click', event => { event.preventDefault(); complete(true); });
  audio?.addEventListener('click', () => setAudioState(!video.muted));
  video.addEventListener('canplay', () => { arrival.classList.add('is-ready'); play(); });
  video.addEventListener('error', () => complete(true));
  video.addEventListener('ended', () => complete());
  video.addEventListener('timeupdate', () => {
    if (video.duration && video.currentTime >= video.duration - 1.05) reveal();
  });
  document.addEventListener('aryan:introreplay', replay);

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
  addEventListener('scroll', holdAtTop, { passive: true });
  requestAnimationFrame(holdAtTop);
  document.documentElement.classList.add('arrival-active');
  setAudioState(true);
  selectVideo();

  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => selectVideo(true), 180);
  }, { passive: true });

  const moveOn = event => { event.preventDefault(); complete(true); };
  addEventListener('wheel', moveOn, { once: true, passive: false });
  addEventListener('touchmove', moveOn, { once: true, passive: false });
})();
