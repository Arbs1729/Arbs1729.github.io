(() => {
  if (window.__aryanDeckBooted) return;
  window.__aryanDeckBooted = true;

  document.documentElement.classList.add('js');
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const MUSIC_KEY = 'aryan-music-state-v2';
  const musicRoot = $('[data-global-music]');

  const setupGlobalMusic = root => {
    if (!root) return null;

    let catalog = [];
    try { catalog = JSON.parse(root.dataset.catalog || '[]'); } catch {}
    if (!catalog.length) return null;

    const mount = $('[data-youtube-mount]', root);
    const fallback = $('[data-video-fallback]', root);
    const audio = $('[data-global-audio]', root);
    const title = $('[data-shelf-title]', root);
    const meta = $('[data-shelf-meta]', root);
    const current = $('[data-shelf-current]', root);
    const duration = $('[data-shelf-duration]', root);
    const progress = $('[data-shelf-progress]', root);
    const toggle = $('[data-shelf-toggle]', root);
    const previous = $('[data-shelf-prev]', root);
    const next = $('[data-shelf-next]', root);
    const minimize = $('[data-shelf-minimize]', root);
    const close = $('[data-shelf-close]', root);
    const youtubeLink = $('[data-shelf-youtube]', root);

    let restored = null;
    try { restored = JSON.parse(sessionStorage.getItem(MUSIC_KEY) || 'null'); } catch {}

    const validIndex = Number.isInteger(restored?.index) && restored.index >= 0 && restored.index < catalog.length
      ? restored.index : 0;

    const state = {
      index: validIndex,
      currentTime: Math.max(0, Number(restored?.time) || 0),
      engaged: Boolean(restored?.engaged),
      minimized: Boolean(restored?.minimized),
      mode: restored?.mode === 'local' ? 'local' : 'youtube',
      playing: false,
    };

    let player = null;
    let playerReady = false;
    let pending = null;
    let youtubeReady = null;
    let saveTimer = 0;

    const formatTime = seconds => {
      const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
      const mins = Math.floor(safe / 60);
      const secs = String(safe % 60).padStart(2, '0');
      return `${mins}:${secs}`;
    };

    const getTime = () => {
      if (state.mode === 'local') return Number.isFinite(audio.currentTime) ? audio.currentTime : state.currentTime;
      if (playerReady) {
        try { return Number(player.getCurrentTime()) || state.currentTime; } catch {}
      }
      return state.currentTime;
    };

    const getDuration = () => {
      if (state.mode === 'local') return Number.isFinite(audio.duration) ? audio.duration : 0;
      if (playerReady) {
        try { return Number(player.getDuration()) || 0; } catch {}
      }
      return 0;
    };

    const snapshot = () => ({
      index: state.index,
      currentTime: getTime(),
      engaged: state.engaged,
      minimized: state.minimized,
      mode: state.mode,
      playing: state.playing,
      track: catalog[state.index],
    });

    const save = () => {
      state.currentTime = getTime();
      try {
        sessionStorage.setItem(MUSIC_KEY, JSON.stringify({
          index: state.index,
          time: state.currentTime,
          engaged: state.engaged,
          minimized: state.minimized,
          mode: state.mode,
        }));
      } catch {}
    };

    const emit = () => {
      document.dispatchEvent(new CustomEvent('aryan:musicstate', { detail: snapshot() }));
    };

    const setPlaying = value => {
      state.playing = Boolean(value);
      root.classList.toggle('is-playing', state.playing);
      toggle.textContent = state.playing ? 'Ⅱ' : '▶';
      toggle.setAttribute('aria-label', `${state.playing ? 'Pause' : 'Play'} ${catalog[state.index].title}`);
      emit();
    };

    const updateTrackUI = () => {
      const track = catalog[state.index];
      root.dataset.activeIndex = String(state.index);
      title.textContent = track.title;
      meta.textContent = `${track.artist} · ${track.album}`;
      youtubeLink.href = `https://music.youtube.com/watch?v=${track.youtubeId}`;
      toggle.setAttribute('aria-label', `${state.playing ? 'Pause' : 'Play'} ${track.title}`);
    };

    const showShelf = () => {
      root.hidden = false;
      root.classList.toggle('is-minimized', state.minimized);
      updateTrackUI();
    };

    const updateProgress = () => {
      if (!state.engaged) return;
      const now = getTime();
      const total = getDuration();
      state.currentTime = now;
      current.textContent = formatTime(now);
      duration.textContent = formatTime(total);
      progress.value = total > 0 ? String(Math.round((now / total) * 1000)) : '0';
    };

    const loadYouTube = () => youtubeReady ||= new Promise((resolve, reject) => {
      if (window.YT?.Player) { resolve(window.YT); return; }
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        try { previousReady?.(); } catch {}
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error('YouTube player unavailable'));
      };
      if (!document.querySelector('script[data-youtube-iframe-api]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.dataset.youtubeIframeApi = 'true';
        script.onerror = () => reject(new Error('YouTube API failed to load'));
        document.head.append(script);
      }
      setTimeout(() => reject(new Error('YouTube player timed out')), 9000);
    });

    const seekLocalWhenReady = seconds => {
      const apply = () => {
        try {
          const max = Number.isFinite(audio.duration) ? Math.max(0, audio.duration - .1) : seconds;
          audio.currentTime = Math.min(seconds, max);
        } catch {}
      };
      if (audio.readyState >= 1) apply();
      else audio.addEventListener('loadedmetadata', apply, { once: true });
    };

    const useLocal = async (autoplay = false, startSeconds = state.currentTime) => {
      state.mode = 'local';
      try { player?.pauseVideo(); } catch {}
      root.classList.add('is-local');
      fallback.hidden = false;
      const track = catalog[state.index];
      const nextSrc = new URL(track.audio, location.origin).href;
      if (audio.src !== nextSrc) audio.src = track.audio;
      seekLocalWhenReady(startSeconds);
      state.currentTime = startSeconds;
      showShelf();
      updateProgress();
      save();
      emit();
      if (autoplay) {
        try { await audio.play(); }
        catch { setPlaying(false); }
      } else {
        audio.pause();
        setPlaying(false);
      }
    };

    const runPending = () => {
      if (!playerReady || !pending) return;
      const action = pending;
      pending = null;
      const track = catalog[action.index];
      try {
        const command = {
          videoId: track.youtubeId,
          startSeconds: Math.max(0, action.startSeconds || 0),
        };
        if (action.autoplay) player.loadVideoById(command);
        else player.cueVideoById(command);
      } catch {
        useLocal(action.autoplay, action.startSeconds || 0);
      }
    };

    const ensureYouTube = async (autoplay = false, startSeconds = state.currentTime) => {
      state.mode = 'youtube';
      root.classList.remove('is-local');
      fallback.hidden = true;
      showShelf();
      pending = { index: state.index, autoplay, startSeconds };
      updateTrackUI();
      save();
      emit();

      if (playerReady) {
        runPending();
        return;
      }

      try {
        const YT = await loadYouTube();
        if (player) return;
        player = new YT.Player(mount, {
          width: '100%',
          height: '100%',
          videoId: catalog[state.index].youtubeId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            playsinline: 1,
            rel: 0,
            enablejsapi: 1,
            origin: location.origin,
          },
          events: {
            onReady: event => {
              playerReady = true;
              try { event.target.getIframe().title = 'Persistent YouTube music player'; } catch {}
              runPending();
              updateProgress();
            },
            onStateChange: event => {
              if (state.mode !== 'youtube') return;
              if (event.data === 1) setPlaying(true);
              if (event.data === 2) setPlaying(false);
              if (event.data === 0) {
                setPlaying(false);
                state.currentTime = 0;
                updateProgress();
                save();
              }
            },
            onAutoplayBlocked: () => setPlaying(false),
            onError: () => useLocal(state.playing || Boolean(pending?.autoplay), getTime()),
          },
        });
      } catch {
        useLocal(autoplay, startSeconds);
      }
    };

    const select = (index, autoplay = true, startSeconds = 0) => {
      const nextIndex = (Number(index) + catalog.length) % catalog.length;
      try { audio.pause(); } catch {}
      state.index = nextIndex;
      state.currentTime = Math.max(0, Number(startSeconds) || 0);
      state.engaged = true;
      root.hidden = false;
      updateTrackUI();
      ensureYouTube(autoplay, state.currentTime);
    };

    const togglePlayback = async () => {
      if (!state.engaged) {
        select(state.index, true, state.currentTime);
        return;
      }

      showShelf();
      if (state.mode === 'local') {
        if (audio.paused) {
          try { await audio.play(); } catch { setPlaying(false); }
        } else audio.pause();
        return;
      }

      if (!playerReady) {
        await ensureYouTube(true, state.currentTime);
        return;
      }

      try {
        if (player.getPlayerState() === 1) player.pauseVideo();
        else player.playVideo();
      } catch {
        useLocal(true, state.currentTime);
      }
    };

    const skip = direction => {
      const wasPlaying = state.playing;
      select(state.index + direction, wasPlaying, 0);
    };

    const setMinimized = value => {
      state.minimized = Boolean(value);
      root.classList.toggle('is-minimized', state.minimized);
      minimize.textContent = state.minimized ? '□' : '−';
      minimize.setAttribute('aria-label', state.minimized ? 'Expand music player' : 'Minimize music player');
      minimize.title = state.minimized ? 'Expand' : 'Minimize';
      save();
      emit();
    };

    const closeShelf = () => {
      state.currentTime = getTime();
      if (state.mode === 'local') audio.pause();
      else {
        try { player?.pauseVideo(); } catch {}
      }
      state.engaged = false;
      state.minimized = false;
      state.playing = false;
      root.hidden = true;
      save();
      emit();
    };

    toggle.addEventListener('click', togglePlayback);
    previous.addEventListener('click', () => skip(-1));
    next.addEventListener('click', () => skip(1));
    minimize.addEventListener('click', () => setMinimized(!state.minimized));
    close.addEventListener('click', closeShelf);

    progress.addEventListener('change', () => {
      const total = getDuration();
      if (!total) return;
      const nextTime = total * (Number(progress.value) / 1000);
      state.currentTime = nextTime;
      if (state.mode === 'local') audio.currentTime = nextTime;
      else if (playerReady) {
        try { player.seekTo(nextTime, true); } catch {}
      }
      updateProgress();
      save();
    });

    audio.addEventListener('playing', () => setPlaying(true));
    audio.addEventListener('pause', () => { if (!audio.ended) setPlaying(false); });
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', () => {
      state.currentTime = 0;
      setPlaying(false);
      save();
    });

    updateTrackUI();
    setPlaying(false);

    if (state.engaged) {
      showShelf();
      if (state.mode === 'local') useLocal(false, state.currentTime);
      else ensureYouTube(false, state.currentTime);
    } else {
      root.hidden = true;
    }

    saveTimer = window.setInterval(() => {
      if (state.engaged) {
        updateProgress();
        save();
      }
    }, 3000);

    const persistNow = () => { if (state.engaged) save(); };
    addEventListener('pagehide', persistNow);
    addEventListener('beforeunload', persistNow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) persistNow(); });

    return {
      select,
      toggle: togglePlayback,
      startFirst: () => select(0, true, 0),
      snapshot,
      sync: () => { updateProgress(); emit(); },
      destroy: () => clearInterval(saveTimer),
    };
  };

  const music = setupGlobalMusic(musicRoot);
  window.AryanMusic = music;

  const syncPageMusic = () => {
    if (!music) return;
    const state = music.snapshot();
    $$('[data-music-player]').forEach(root => {
      const tracks = $$('[data-track]', root);
      const selected = tracks[state.index] || tracks[0];
      const title = $('[data-track-title]', root);
      const meta = $('[data-track-meta]', root);
      const play = $('[data-play-toggle]', root);
      const status = $('[data-player-state]', root);
      const currentLink = $('[data-current-youtube]', root);

      tracks.forEach((track, index) => track.setAttribute('aria-pressed', String(index === state.index)));
      if (selected) {
        title.textContent = selected.dataset.title;
        meta.textContent = `${selected.dataset.artist} · ${selected.dataset.album}`;
        currentLink.href = `https://music.youtube.com/watch?v=${selected.dataset.youtube}`;
      }
      play.hidden = false;
      play.textContent = state.playing ? 'Pause' : 'Play';
      if (!state.engaged) status.textContent = 'Ready — press play.';
      else if (state.playing) status.textContent = '';
      else if (state.mode === 'local') status.textContent = 'Paused · local preview.';
      else status.textContent = 'Paused.';
    });
  };

  const bindMusicPage = () => {
    $$('[data-music-player]').forEach(root => {
      if (root.dataset.musicBound === 'true') return;
      root.dataset.musicBound = 'true';
      const tracks = $$('[data-track]', root);
      tracks.forEach((button, index) => button.addEventListener('click', () => music?.select(index, true, 0)));
      $('[data-play-toggle]', root)?.addEventListener('click', () => music?.toggle());
    });

    $$('[data-start-music]').forEach(control => {
      if (control.dataset.musicBound === 'true') return;
      control.dataset.musicBound = 'true';
      control.addEventListener('click', () => music?.startFirst());
    });

    syncPageMusic();
  };

  const bindIntroReplay = () => {
    const button = $('#intro-replay');
    if (!button || button.dataset.deckBound === 'true') return;
    button.dataset.deckBound = 'true';
    button.hidden = false;
    const label = $('#intro-replay-label', button);
    const onHome = document.body.classList.contains('immersive-home');
    let hasPlayed = false;
    try { hasPlayed = sessionStorage.getItem('aryan-arrival-seen') === '1'; } catch {}

    const reflect = () => {
      label.textContent = hasPlayed ? 'Replay intro' : 'Play intro';
      button.setAttribute('aria-label', hasPlayed ? 'Replay intro animation' : 'Play intro animation');
    };

    button.addEventListener('click', () => {
      if (!onHome) {
        location.href = '/?intro=1';
        return;
      }
      hasPlayed = true;
      reflect();
      document.dispatchEvent(new CustomEvent('aryan:introreplay'));
    });
    reflect();
  };

  document.addEventListener('aryan:arrivalcomplete', () => {
    const button = $('#intro-replay');
    const label = button ? $('#intro-replay-label', button) : null;
    if (button && label) {
      label.textContent = 'Replay intro';
      button.setAttribute('aria-label', 'Replay intro animation');
    }
  });

  const bindScreenFilters = () => {
    const filters = $('.screen-filters');
    if (!filters || filters.dataset.deckBound === 'true') return;
    filters.dataset.deckBound = 'true';
    filters.hidden = false;
    filters.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      $$('.screen-card').forEach(card => {
        card.hidden = button.dataset.screenFilter !== 'all' && !card.dataset.format.startsWith(button.dataset.screenFilter);
      });
    }));
  };

  const bindLibraryFilters = () => {
    $$('[data-library-filters]').forEach(filterBar => {
      if (filterBar.dataset.deckBound === 'true') return;
      filterBar.dataset.deckBound = 'true';
      filterBar.hidden = false;
      const library = filterBar.closest('#library');
      const entries = library ? $$('[data-library-category]', library) : [];
      filterBar.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
        const selectedCategory = button.dataset.libraryFilter;
        filterBar.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        entries.forEach(entry => {
          entry.hidden = selectedCategory !== 'all' && entry.dataset.libraryCategory !== selectedCategory;
        });
      }));
    });
  };

  const bindPage = () => {
    if (!document.body.classList.contains('immersive-home')) {
      try { sessionStorage.setItem('aryan-arrival-seen', '1'); } catch {}
    }
    bindIntroReplay();
    bindMusicPage();
    bindScreenFilters();
    bindLibraryFilters();
  };

  document.addEventListener('aryan:musicstate', syncPageMusic);
  document.addEventListener('astro:page-load', bindPage);
  bindPage();

  const setupChat = () => {
    const launcher = $('#chat-launcher');
    const panel = $('#chat-panel');
    if (!launcher || !panel || launcher.dataset.chatBound === 'true') return;
    launcher.dataset.chatBound = 'true';
    launcher.hidden = false;

    let previousFocus = null;
    const setChat = open => {
      panel.hidden = !open;
      launcher.setAttribute('aria-expanded', String(open));
      if (open) {
        previousFocus = document.activeElement;
        $('#chat-input')?.focus();
      } else if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };

    launcher.addEventListener('click', () => setChat(panel.hidden));
    $('#close-chat')?.addEventListener('click', () => setChat(false));
    addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) setChat(false);
    });

    const form = $('#chat-form');
    const consoleNode = $('.chat-console', panel);
    const endpoint = consoleNode?.dataset.endpoint || '';
    if (!form) return;

    let controller = null;
    let history = [];
    let generation = 0;

    const append = (message, kind) => {
      const p = document.createElement('p');
      p.className = `${kind}-message`;
      p.textContent = message;
      $('#chat-log')?.append(p);
      const log = $('#chat-log');
      if (log) log.scrollTop = log.scrollHeight;
    };

    const appendSources = sources => {
      if (!Array.isArray(sources) || !sources.length) return;
      const nav = document.createElement('nav');
      nav.className = 'chat-sources';
      nav.setAttribute('aria-label', 'Related portfolio pages');
      sources.forEach(source => {
        if (!source || typeof source.label !== 'string' || typeof source.url !== 'string' || !source.url.startsWith('/')) return;
        const link = document.createElement('a');
        link.href = source.url;
        link.textContent = source.label;
        nav.append(link);
      });
      if (nav.childElementCount) $('#chat-log')?.append(nav);
    };

    const busy = value => {
      const send = $('#send-chat');
      if (send) send.disabled = value;
      const cancel = $('#cancel-chat');
      if (cancel) cancel.hidden = !value;
      form.setAttribute('aria-busy', String(value));
      panel.querySelectorAll('[data-prompt]').forEach(button => { button.disabled = value; });
    };

    const clear = $('#clear-chat');
    if (clear) {
      clear.hidden = false;
      clear.addEventListener('click', () => {
        generation++;
        controller?.abort();
        history = [];
        $('#chat-log')?.replaceChildren();
        append('Ask about a role, project, or where my experience might fit.', 'bot');
        const status = $('#chat-status');
        if (status) status.textContent = 'Conversation cleared.';
      });
    }

    $('#cancel-chat')?.addEventListener('click', () => controller?.abort());
    panel.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {
      const input = $('#chat-input');
      if (input) input.value = button.dataset.prompt;
      form.requestSubmit();
    }));

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (controller) return;
      const input = $('#chat-input');
      const question = input?.value.trim() || '';
      if (!question) return;
      const status = $('#chat-status');

      if (!endpoint) {
        if (status) status.textContent = 'The AI guide is unavailable right now.';
        return;
      }

      const turn = generation;
      append(question, 'user');
      input.value = '';
      controller = new AbortController();
      busy(true);
      if (status) status.textContent = 'Checking the portfolio…';
      const timeout = setTimeout(() => controller?.abort(), 25000);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: question, history: history.slice(-6) }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (turn !== generation) return;
        if (!response.ok || typeof data.answer !== 'string') throw new Error(data.error || 'The guide is unavailable right now.');
        append(data.answer, 'bot');
        appendSources(data.sources);
        history.push(
          { role: 'user', text: question },
          { role: 'model', text: data.answer.slice(0, 2000) },
        );
        if (status) status.textContent = 'Answered from the public portfolio. Use the related pages for detail.';
      } catch (error) {
        if (turn === generation && status) {
          status.textContent = error.name === 'AbortError' ? 'Request stopped.' : 'The guide is unavailable right now. Try again later.';
        }
      } finally {
        clearTimeout(timeout);
        controller = null;
        busy(false);
      }
    });
  };

  setupChat();
})();
