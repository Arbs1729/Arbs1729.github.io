import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { parseDocument } from 'htmlparser2';
import { cases, workGroups } from '../src/data/work.js';
import layout from '../src/components/layout.js';

const root = path.resolve('dist');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat();
}
function elements(node) {
  return [node, ...(node.children || []).flatMap(elements)].filter(item => item.attribs);
}
const htmlFiles = (await files(root)).filter(file => file.endsWith('.html'));
assert.equal(htmlFiles.length, cases.length + 4, 'Home, about, index, 404, and every selected story must build');
const documents = new Map();
for (const file of htmlFiles) {
  const source = await readFile(file, 'utf8');
  const nodes = elements(parseDocument(source));
  const ids = nodes.map(node => node.attribs.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, `Duplicate ID: ${file}`);
  assert.equal(nodes.filter(node => node.name === 'h1').length, 1, `One page heading: ${file}`);
  assert.equal(nodes.filter(node => node.name === 'main').length, 1, `One main landmark: ${file}`);
  for (const property of ['description', 'og:title', 'og:description', 'twitter:card']) {
    assert(nodes.some(node => node.name === 'meta' && (node.attribs.name === property || node.attribs.property === property) && node.attribs.content), `Missing ${property}: ${file}`);
  }
  assert(nodes.some(node => node.name === 'html' && node.attribs.lang === 'en'));
  for (const img of nodes.filter(node => node.name === 'img')) {
    assert(img.attribs.alt && img.attribs.width && img.attribs.height, `Image needs description and dimensions: ${file}`);
  }
  for (const node of nodes) {
    for (const id of (node.attribs['aria-labelledby'] || '').split(' ').filter(Boolean)) assert(ids.includes(id), `Missing accessible label ${id}`);
  }
  assert(!/tel:|wa\.me|whatsapp:|github\.com|>GitHub|class:list|Astro\.|\{work\./i.test(source), `Unexpected private link or template residue: ${file}`);
  assert(source.includes('mailto:aryanbasantani1729@gmail.com'));
  documents.set(file, { nodes, ids, source });
}
let links = 0;
for (const [file, { nodes }] of documents) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const pageUrl = new URL(relative, 'http://portfolio.local/');
  for (const node of nodes) {
    const target = node.attribs.href || node.attribs.src;
    if (!target) continue;
    const url = new URL(target, pageUrl);
    if (url.origin !== pageUrl.origin) continue;
    let targetFile = path.join(root, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) targetFile = path.join(targetFile, 'index.html');
    assert((await stat(targetFile)).isFile(), `Missing local target ${target} in ${file}`);
    if (url.hash) assert(documents.get(targetFile)?.ids.includes(decodeURIComponent(url.hash.slice(1))), `Missing anchor ${target} in ${file}`);
    links++;
  }
}
const home = documents.get(path.join(root, 'index.html'));
assert.equal(home.nodes.filter(node => node.attribs.class?.split(' ').includes('featured')).length, cases.length);
const index = documents.get(path.join(root, 'work/index.html'));
assert.equal(index.nodes.filter(node => node.attribs.class === 'archive-entry').length, workGroups.reduce((sum, group) => sum + group.entries.length, 0));
assert(!documents.get(path.join(root, 'about/index.html')).source.includes('Feb 2026'));
assert(home.source.includes('ETS Cab') && home.source.includes('Rentlz') && home.source.includes('Shuttle'));
assert(documents.get(path.join(root, 'work/credit-risk-workflows/index.html')).source.includes('~90%'));

// Run the actual browser script with storage and event boundaries, without a browser.
const theme = await readFile('public/theme.js', 'utf8');
function themeHarness(stored, blocked = false) {
  let value = stored;
  const listeners = {};
  const button = { hidden: true, setAttribute(name, value) { this[name] = value; }, addEventListener(name, callback) { listeners[name] = callback; } };
  const label = {};
  const document = { documentElement: { dataset: {} }, getElementById(id) { return id === 'theme-toggle' ? button : label; } };
  const localStorage = { getItem() { if (blocked) throw Error('blocked'); return value; }, setItem(key, next) { if (blocked) throw Error('blocked'); value = next; } };
  vm.runInNewContext(theme, { document, localStorage, window: { addEventListener(name, callback) { listeners[name] = callback; } } });
  return { button, label, document, listeners, stored: () => value };
}
const auto = themeHarness(null);
assert.equal(auto.button.hidden, false);
assert.equal(auto.label.textContent, 'Auto');
for (const [mode, label] of [['light', 'Light'], ['dark', 'Dark'], [undefined, 'Auto']]) {
  auto.listeners.click();
  assert.equal(auto.document.documentElement.dataset.theme, mode);
  assert.equal(auto.label.textContent, label);
}
assert.equal(auto.stored(), 'system');
assert.equal(themeHarness('dark').document.documentElement.dataset.theme, 'dark');
assert.equal(themeHarness('invalid').label.textContent, 'Auto');
const blocked = themeHarness(null, true);
blocked.listeners.click();
assert.equal(blocked.label.textContent, 'Light');
auto.listeners.storage({key: 'aryan-theme', newValue: 'dark'});
assert.equal(auto.label.textContent, 'Dark');
auto.listeners.storage({key: null, newValue: null});
assert.equal(auto.label.textContent, 'Auto');

const css = await readFile('src/styles/global.css', 'utf8');
assert(css.includes('prefers-color-scheme:dark') && css.includes(':root:not([data-theme="light"])'));
assert(css.includes('prefers-reduced-motion:reduce') && css.includes(':focus-visible'));
assert(css.includes('@media(max-width:800px)') && css.includes('@media(max-width:380px)'));
function luminance(hex) {
  const rgb = hex.match(/\w\w/g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function ratio(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
let minimumContrast = Infinity;
for (const selector of [':root', ':root[data-theme="dark"]']) {
  const start = css.indexOf(selector + '{') + selector.length + 1;
  const variables = Object.fromEntries([...css.slice(start, css.indexOf('}', start)).matchAll(/--([\w-]+):#([a-f0-9]{6})/g)].map(match => [match[1], match[2]]));
  for (const foreground of ['ink', 'muted', 'accent']) for (const background of ['paper', 'surface', 'code']) {
    const contrast = ratio(variables[foreground], variables[background]);
    minimumContrast = Math.min(minimumContrast, contrast);
    assert(contrast >= 4.5, `Text contrast ${selector} ${foreground}/${background}: ${contrast.toFixed(2)}`);
  }
  assert(ratio(variables.green, variables['green-paper']) >= 4.5);
}
const previousSite = process.env.SITE_URL;
try {
  delete process.env.SITE_URL;
  assert(layout({content: ''}).includes('noindex, nofollow'));
  process.env.SITE_URL = 'https://portfolio.example';
  assert(layout({content: '', path: '/work/'}).includes('https://portfolio.example/work/'));
  assert(!layout({content: '', path: '/work/'}).includes('noindex, nofollow'));
} finally {
  if (previousSite === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = previousSite;
}
console.log(`Passed: ${htmlFiles.length} static pages; ${links} internal links/assets; ${cases.length} selected stories; ${workGroups.reduce((sum, group) => sum + group.entries.length, 0)} indexed entries.`);
console.log(`Passed: theme cycling, persistence, blocked storage, cross-tab updates; local/public metadata; text contrast (minimum ${minimumContrast.toFixed(2)}:1).`);
console.log('These are build and script checks, not browser visual, responsive, or assistive-technology testing.');
