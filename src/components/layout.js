import { profile } from '../data/profile.js';
import contact from './contact.js';
import { escape as e } from './utils.js';

export default function layout({ content, title = profile.shortName, description = profile.description, path = '/', article = false }) {
  const fullTitle = title === profile.shortName ? `${title} — Product, technology & finance` : `${title} — ${profile.shortName}`;
  const canonical = process.env.SITE_URL ? new URL(path, process.env.SITE_URL).href : '';
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark"><title>${e(fullTitle)}</title>
  <meta name="description" content="${e(description)}"><meta name="author" content="${e(profile.name)}">
  <meta property="og:title" content="${e(fullTitle)}"><meta property="og:description" content="${e(description)}">
  <meta property="og:type" content="${article ? 'article' : 'website'}"><meta property="og:site_name" content="${e(profile.shortName)}">
  <meta name="twitter:card" content="summary"><meta name="twitter:title" content="${e(fullTitle)}"><meta name="twitter:description" content="${e(description)}">
  ${canonical && path !== '/404.html' ? `<link rel="canonical" href="${e(canonical)}"><meta property="og:url" content="${e(canonical)}">` : '<meta name="robots" content="noindex, nofollow">'}
  <link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/styles.css">
  <script>try { const theme = localStorage.getItem('aryan-theme'); if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme; } catch {}</script>
</head><body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="site-shell">
    <header class="masthead">
      <a href="/" class="signature" aria-label="Aryan Basantani, home">aryan<span aria-hidden="true">.</span></a>
      <div class="masthead-caption">A personal collection<br>Product · technology · finance</div>
      <nav aria-label="Main navigation">
        <a href="/#selected">Selected work</a><a href="/work/"${path === '/work/' ? ' aria-current="page"' : ''}>Index</a>
        <a href="/about/"${path === '/about/' ? ' aria-current="page"' : ''}>About</a><a href="#contact">Contact <span aria-hidden="true">↗</span></a>
      </nav>
      <button class="theme-toggle" id="theme-toggle" type="button" hidden aria-label="Colour theme: system. Switch to light."><span aria-hidden="true">◐</span><span id="theme-label">Auto</span></button>
    </header>
    <main id="main">${content}</main>
    ${contact()}
    <footer class="footer"><span>${e(profile.name)}</span><span>Built with attention. Still evolving.</span><a href="#">Back to top ↑</a></footer>
  </div><script src="/theme.js" defer></script>
</body></html>`;
}
