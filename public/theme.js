(() => {
  if (window.__aryanThemeBooted) return;
  window.__aryanThemeBooted = true;

  const modes = ['system', 'light', 'dark'];
  const names = { system: 'Auto', light: 'Light', dark: 'Dark' };

  function localClockTheme() {
    const h = new Date().getHours();
    return h >= 6 && h < 18 ? 'light' : 'dark';
  }

  let preference = localClockTheme();
  try {
    const stored = localStorage.getItem('aryan-theme');
    if (modes.includes(stored)) preference = stored;
  } catch {}

  function applyTo(root = document.documentElement) {
    if (preference === 'system') delete root.dataset.theme;
    else root.dataset.theme = preference;
  }

  function syncButton() {
    const button = document.getElementById('theme-toggle');
    const label = document.getElementById('theme-label');
    if (!button || !label) return;
    label.textContent = names[preference];
    const next = modes[(modes.indexOf(preference) + 1) % modes.length];
    button.setAttribute('aria-label', `Colour theme: ${preference}. Switch to ${next}.`);
    button.title = `Colour theme: ${preference}. Switch to ${next}.`;
    button.hidden = false;
    if (button.dataset.themeBound !== 'true') {
      button.dataset.themeBound = 'true';
      button.addEventListener('click', () => {
        preference = modes[(modes.indexOf(preference) + 1) % modes.length];
        try { localStorage.setItem('aryan-theme', preference); } catch {}
        apply();
      });
    }
  }

  function apply() {
    applyTo(document.documentElement);
    syncButton();
    document.dispatchEvent(new CustomEvent('aryan:themechange', { detail: { preference } }));
  }

  window.AryanTheme = {
    get: () => preference,
    localClockTheme,
    set: (next, { persist = true } = {}) => {
      if (!modes.includes(next)) return;
      preference = next;
      if (persist) {
        try { localStorage.setItem('aryan-theme', preference); } catch {}
      }
      apply();
    },
  };

  apply();

  document.addEventListener('astro:before-swap', event => {
    if (event.newDocument?.documentElement) applyTo(event.newDocument.documentElement);
  });
  document.addEventListener('astro:after-swap', () => apply());

  window.addEventListener('storage', event => {
    if (event.key === 'aryan-theme' || event.key === null) {
      preference = modes.includes(event.newValue) ? event.newValue : localClockTheme();
      apply();
    }
  });
})();
