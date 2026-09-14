import { readdir, readFile, access } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { transform } from '@astrojs/compiler-rs';
import postcss from 'postcss';
import assert from 'node:assert/strict';

// Source preflight complements, and does not replace, an Astro build/browser review.
async function files(dir) {
  return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(e =>
    e.isDirectory() ? files(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat();
}
const sourceFiles = await files('src');
const deckSource = await readFile('src/components/Deck.astro', 'utf8');
const astroConfig = await readFile('astro.config.mjs', 'utf8');
assert(deckSource.includes('content="index,follow"'), 'Production pages must be indexable.');
assert(deckSource.includes('rel="canonical"'), 'Production pages must include a canonical URL.');
assert(astroConfig.includes("site: 'https://aryanbasantani.me'"), 'Astro site URL must match the production domain.');
for (const file of sourceFiles.filter(f => f.endsWith('.astro'))) {
  const result = transform(await readFile(file, 'utf8'), { filename: file });
  const errors = result.diagnostics.filter(d => d.severity === 1);
  assert.equal(errors.length, 0, `${file}: ${JSON.stringify(errors)}`);
}
for (const css of ['global','deck','arrival','revamp']) postcss.parse(await readFile(`src/styles/${css}.css`, 'utf8'));
const js = stripTypeScriptTypes(await readFile('src/data/portfolio.ts', 'utf8'));
const { groups, stories } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
assert.equal(groups.flatMap(g => g.entries).length, 22);
assert.equal(stories.filter(s => s.selected).length, 3);
assert.equal(new Set(stories.map(s => s.slug)).size, stories.length);
const routes = new Set(stories.map(s => `/work/${s.slug}/`));
for (const entry of groups.flatMap(g => g.entries)) {
  if (entry.href) assert(routes.has(entry.href), `Missing story: ${entry.href}`);
}
for (const path of [
  'public/arrival.js', 'public/atmosphere.js', 'public/deck.js',
  'public/media/intro-landscape.mp4', 'public/media/intro-portrait.mp4',
  'public/media/audio/town-ocean-view.m4a', 'public/media/audio/iktara.m4a',
  'public/media/audio/cruel-angels-thesis.m4a', 'public/media/audio/time.m4a',
  'public/media/audio/one-summers-day.m4a', 'public/media/audio/cha-la-head-cha-la.mp3',
  'public/theme.js', 'public/favicon.svg', 'public/resume.pdf', 'public/media/shubh-storefront.jpg'
]) await access(path);
console.log(`Source preflight passed: ${sourceFiles.filter(f => f.endsWith('.astro')).length} Astro templates, CSS syntax, 22 entries, 5 story routes and required assets. Rendered validation is separate.`);
