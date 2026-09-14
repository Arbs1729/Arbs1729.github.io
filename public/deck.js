(() => {
  document.documentElement.classList.add('js');
  const $ = (selector, scope = document) => scope.querySelector(selector);
  if (!document.body.classList.contains('immersive-home')) {
    try { sessionStorage.setItem('aryan-arrival-seen', '1'); } catch {}
  }

  const motion = $('#motion-toggle');
  if (motion) {
    motion.hidden = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const reflect = () => {
      const off = document.documentElement.dataset.motion === 'off' || reduced.matches;
      motion.setAttribute('aria-pressed', String(!off));
      $('span', motion).textContent = reduced.matches ? 'reduced' : off ? 'off' : 'on';
      motion.disabled = reduced.matches;
      motion.title = reduced.matches ? 'Your system preference reduces decorative motion' : 'Toggle decorative motion';
      document.dispatchEvent(new CustomEvent('aryan:motionchange', { detail: { off } }));
    };
    reduced.addEventListener('change', reflect);
    motion.addEventListener('click', () => {
      const off = document.documentElement.dataset.motion !== 'off';
      document.documentElement.dataset.motion = off ? 'off' : 'on';
      try { localStorage.setItem('deck-motion', off ? 'off' : 'on'); } catch {}
      reflect();
    });
    reflect();
  }

  const musicRoots = [...document.querySelectorAll('[data-music-player]')];
  let youtubeReady;
  const loadYouTube = () => youtubeReady ||= new Promise((resolve, reject) => {
    if (window.YT?.Player) { resolve(window.YT); return; }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT); };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = reject;
    document.head.append(script);
    setTimeout(() => reject(new Error('player unavailable')), 8000);
  });

  musicRoots.forEach(root => {
    const audio = $('[data-local-audio]', root);
    const stage = $('[data-youtube-stage]', root);
    const mount = $('[data-youtube-player]', root);
    const state = $('[data-player-state]', root);
    const title = $('[data-track-title]', root);
    const meta = $('[data-track-meta]', root);
    const play = $('[data-play-toggle]', root);
    const currentLink = $('[data-current-youtube]', root);
    const tracks = [...root.querySelectorAll('[data-track]')];
    const floating = $('[data-music-float]', root.parentElement || document) || $('[data-music-float]');
    // Scroll-reveal transforms on the music section create a containing block.
    // Move this control to the body so it remains fixed to the viewport.
    if (floating) document.body.append(floating);
    const floatTitle = floating ? $('[data-float-title]', floating) : null;
    const floatToggle = floating ? $('[data-float-toggle]', floating) : null;
    let selected = tracks[0];
    let player = null;
    let mode = 'youtube';
    let loadTimer = 0;
    let autoplayRequested = false;
    let engaged = false;
    let playing = false;

    const setState = message => { state.textContent = message; };
    const clearLoadTimer = () => { clearTimeout(loadTimer); loadTimer = 0; };
    const updateFloating = () => {
      if (!floating) return;
      floating.hidden = !engaged;
      floating.classList.toggle('is-playing', playing);
      if (floatTitle) floatTitle.textContent = selected.dataset.title;
      if (floatToggle) {
        floatToggle.textContent = playing ? 'Ⅱ' : '▶';
        floatToggle.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${selected.dataset.title}`);
      }
    };
    const setPlaying = value => {
      playing = value;
      play.textContent = value ? 'Pause' : 'Play';
      updateFloating();
    };
    const updateSelection = button => {
      selected = button;
      tracks.forEach(track => track.setAttribute('aria-pressed', String(track === selected)));
      title.textContent = selected.dataset.title;
      meta.textContent = `${selected.dataset.artist} · ${selected.dataset.album}`;
      currentLink.href = `https://music.youtube.com/watch?v=${selected.dataset.youtube}`;
      updateFloating();
    };
    const fallback = async (tryPlay = false) => {
      clearLoadTimer(); mode = 'local';
      try { player?.pauseVideo(); } catch {}
      stage.hidden = true; audio.hidden = false; play.hidden = false;
      if (!audio.src.endsWith(selected.dataset.audio)) audio.src = selected.dataset.audio;
      if (tryPlay) {
        engaged = true; updateFloating();
        try { await audio.play(); setState(''); }
        catch { setPlaying(false); setState('Press play to start.'); }
      } else setState('Ready — press play.');
    };
    const armFallback = () => {
      clearLoadTimer();
      loadTimer = setTimeout(() => { if (mode === 'youtube') fallback(autoplayRequested); }, 6500);
    };
    const useYouTube = async (tryPlay = false) => {
      mode = 'youtube'; autoplayRequested = autoplayRequested || tryPlay;
      engaged = engaged || tryPlay; updateFloating();
      audio.pause(); audio.hidden = true; stage.hidden = false; play.hidden = false;
      setState('Loading…'); armFallback();
      try {
        const YT = await loadYouTube();
        if (!player) {
          player = new YT.Player(mount, {
            width: 380, height: 214, videoId: selected.dataset.youtube,
            playerVars: { autoplay: tryPlay ? 1 : 0, controls: 1, playsinline: 1, rel: 0, origin: location.origin },
            events: {
              onReady: event => {
                event.target.getIframe().title = 'Selected music track on YouTube';
                if (mode !== 'youtube') return;
                if (tryPlay || autoplayRequested) event.target.loadVideoById(selected.dataset.youtube);
                else { clearLoadTimer(); setState('Ready — press play.'); }
              },
              onStateChange: event => {
                if (mode !== 'youtube') return;
                if (event.data === 1) { clearLoadTimer(); setPlaying(true); setState(''); }
                if (event.data === 2) { clearLoadTimer(); setPlaying(false); setState('Paused.'); }
                if (event.data === 0) { clearLoadTimer(); setPlaying(false); play.textContent = 'Play again'; setState('Finished. Choose another track or play it again.'); }
              },
              onAutoplayBlocked: () => { clearLoadTimer(); setPlaying(false); setState('Ready — press play to start the soundtrack.'); },
              onError: () => fallback(autoplayRequested),
            },
          });
        } else {
          player.loadVideoById(selected.dataset.youtube);
        }
      } catch { fallback(autoplayRequested); }
    };

    audio.hidden = true;
    stage.hidden = true;
    play.hidden = false;
    updateSelection(selected);
    setState('Ready — press play.');

    tracks.forEach(button => button.addEventListener('click', () => {
      updateSelection(button); autoplayRequested = true;
      useYouTube(true);
    }));
    const togglePlayback = async () => {
      engaged = true; updateFloating();
      if (mode === 'local') {
        if (audio.paused) { try { await audio.play(); } catch { setState('Playback could not start. Open this track in YouTube Music.'); } }
        else audio.pause();
      } else if (player) {
        try { if (player.getPlayerState() === 1) player.pauseVideo(); else player.playVideo(); } catch { fallback(true); }
      } else useYouTube(true);
    };
    play.addEventListener('click', togglePlayback);
    floatToggle?.addEventListener('click', togglePlayback);
    audio.addEventListener('playing', () => { setPlaying(true); setState(''); });
    audio.addEventListener('pause', () => { if (!audio.ended) { setPlaying(false); if (engaged) setState('Paused.'); } });
    audio.addEventListener('waiting', () => setState('Loading…'));
    audio.addEventListener('error', () => setState('Playback is unavailable here. Open this track in YouTube Music.'));
    audio.addEventListener('ended', () => { setPlaying(false); play.textContent = 'Play again'; setState('Finished. Choose another track or play it again.'); });
    document.addEventListener('aryan:musicstart', () => {
      updateSelection(tracks[0]);
      autoplayRequested = true;
      engaged = true;
      useYouTube(true);
    });
  });

  document.querySelectorAll('[data-start-music]').forEach(control => control.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('aryan:musicstart'));
  }));

  const filters = $('.screen-filters');
  if (filters) {
    filters.hidden = false;
    filters.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      document.querySelectorAll('.screen-card').forEach(card => { card.hidden = button.dataset.screenFilter !== 'all' && !card.dataset.format.startsWith(button.dataset.screenFilter); });
    }));
  }

  document.querySelectorAll('[data-library-filters]').forEach(filterBar => {
    filterBar.hidden = false;
    const library = filterBar.closest('#library');
    const entries = [...library.querySelectorAll('[data-library-category]')];
    filterBar.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      const selectedCategory = button.dataset.libraryFilter;
      filterBar.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      entries.forEach(entry => { entry.hidden = selectedCategory !== 'all' && entry.dataset.libraryCategory !== selectedCategory; });
    }));
  });

  const launcher = $('#chat-launcher');
  const panel = $('#chat-panel');
  if (!launcher || !panel) return;
  launcher.hidden = false;
  let previousFocus = null;
  const setChat = open => {
    panel.hidden = !open; launcher.setAttribute('aria-expanded', String(open));
    if (open) { previousFocus = document.activeElement; $('#chat-input')?.focus(); }
    else if (previousFocus instanceof HTMLElement) previousFocus.focus();
  };
  launcher.addEventListener('click', () => setChat(panel.hidden));
  $('#close-chat').addEventListener('click', () => setChat(false));
  addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) setChat(false); });

  const form = $('#chat-form');
  const consoleNode = $('.chat-console', panel);
  const endpoint = consoleNode.dataset.endpoint;
  let controller = null, history = [], generation = 0;
  const append = (message, kind) => { const p = document.createElement('p'); p.className = `${kind}-message`; p.textContent = message; $('#chat-log').append(p); $('#chat-log').scrollTop = $('#chat-log').scrollHeight; };
  const appendSources = sources => {
    if (!Array.isArray(sources) || !sources.length) return;
    const nav = document.createElement('nav'); nav.className = 'chat-sources'; nav.setAttribute('aria-label', 'Related portfolio pages');
    sources.forEach(source => {
      if (!source || typeof source.label !== 'string' || typeof source.url !== 'string' || !source.url.startsWith('/')) return;
      const link = document.createElement('a'); link.href = source.url; link.textContent = source.label; nav.append(link);
    });
    if (nav.childElementCount) $('#chat-log').append(nav);
  };
  const busy = value => { $('#send-chat').disabled = value; $('#cancel-chat').hidden = !value; form.setAttribute('aria-busy', String(value)); panel.querySelectorAll('[data-prompt]').forEach(button => button.disabled = value); };
  $('#clear-chat').hidden = false;
  $('#clear-chat').addEventListener('click', () => { generation++; controller?.abort(); history = []; $('#chat-log').replaceChildren(); append('Ask about a role, project, or where my experience might fit.', 'bot'); $('#chat-status').textContent = 'Conversation cleared.'; });
  $('#cancel-chat').addEventListener('click', () => controller?.abort());
  panel.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { $('#chat-input').value = button.dataset.prompt; form.requestSubmit(); }));
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (controller) return;
    const question = $('#chat-input').value.trim(); if (!question) return;
    if (!endpoint) { $('#chat-status').textContent = 'The AI guide is not connected in this preview yet. The portfolio pages remain available.'; return; }
    const turn = generation; append(question, 'user'); $('#chat-input').value = ''; controller = new AbortController(); busy(true); $('#chat-status').textContent = 'Checking the portfolio…';
    const timeout = setTimeout(() => controller?.abort(), 25000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: question, history: history.slice(-6) }), signal: controller.signal });
      const data = await response.json(); if (turn !== generation) return;
      if (!response.ok || typeof data.answer !== 'string') throw new Error(data.error || 'The guide is unavailable right now.');
      append(data.answer, 'bot'); appendSources(data.sources); history.push({ role: 'user', text: question }, { role: 'model', text: data.answer.slice(0, 2000) }); $('#chat-status').textContent = 'Answered from the public portfolio. Use the related pages for detail.';
    } catch (error) { if (turn === generation) $('#chat-status').textContent = error.name === 'AbortError' ? 'Request stopped.' : 'The guide is unavailable right now. Try again later.'; }
    finally { clearTimeout(timeout); controller = null; busy(false); }
  });
})();
