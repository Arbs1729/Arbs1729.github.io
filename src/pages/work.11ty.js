import layout from '../components/layout.js';
import { workGroups } from '../data/work.js';
import { escape as e, tags } from '../components/utils.js';
export default class {
  data() { return { permalink: 'work/index.html' }; }
  render() { return layout({title: 'The work index', path: '/work/', description: 'A complete, tagged collection of Aryan Basantani’s product work, financial analysis, research, independent builds, and community projects.', content: `
    <section class="page-intro"><p class="eyebrow">The wider collection</p><h1>The work<br><em>index.</em></h1><p>A record of things built, investigated, and put into motion. Grouped by the kind of problem, with each project’s setting made explicit.</p></section>
    <div class="archive-layout"><nav class="archive-nav" aria-label="Work subjects"><span class="eyebrow">Browse by subject</span>${workGroups.map(group => `<a href="#${e(group.id)}">${e(group.title)}<span>${group.entries.length}</span></a>`).join('')}</nav>
    <div class="archive-groups">${workGroups.map((group, index) => `<section class="archive-group" id="${e(group.id)}" aria-labelledby="${e(group.id)}-title"><p class="eyebrow">0${index + 1} / ${group.entries.length} entries</p><h2 id="${e(group.id)}-title">${e(group.title)}</h2><p class="group-description">${e(group.description)}</p><div>${group.entries.map(entry => `<article class="archive-entry"><div><p class="entry-type">${e(entry.type)}</p><h3>${entry.slug ? `<a href="/work/${e(entry.slug)}/">${e(entry.title)} <span aria-hidden="true">↗</span></a>` : e(entry.title)}</h3><p>${e(entry.text)}</p></div>${tags(entry.tags)}</article>`).join('')}</div></section>`).join('')}</div></div>
  `}); }
}
