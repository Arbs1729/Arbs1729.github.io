(() => {
  const button = document.getElementById('theme-toggle');
  const label = document.getElementById('theme-label');
  if (!button || !label) return;
  const modes = ['system', 'light', 'dark'];
  const names = { system: 'Auto', light: 'Light', dark: 'Dark' };
  let preference = 'system';
  try {
    const stored = localStorage.getItem('aryan-theme');
    if (modes.includes(stored)) preference = stored;
  } catch {}
  function apply() {
    if (preference === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = preference;
    label.textContent = names[preference];
    const next = modes[(modes.indexOf(preference) + 1) % modes.length];
    button.setAttribute('aria-label', `Colour theme: ${preference}. Switch to ${next}.`);
    button.title = `Colour theme: ${preference}. Switch to ${next}.`;
  }
  apply();
  button.hidden = false;
  button.addEventListener('click', () => {
    preference = modes[(modes.indexOf(preference) + 1) % modes.length];
    try { localStorage.setItem('aryan-theme', preference); } catch {}
    apply();
  });
  window.addEventListener('storage', event => {
    if (event.key === 'aryan-theme' || event.key === null) {
      preference = modes.includes(event.newValue) ? event.newValue : 'system';
      apply();
    }
  });
})();
