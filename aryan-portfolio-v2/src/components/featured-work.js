import { cases } from '../data/work.js';
import workVisual from './work-visual.js';
import { escape as e, tags, facts } from './utils.js';
export default () => `<section class="section selected-section" id="selected" aria-labelledby="selected-title">
  <div class="section-heading"><div><p class="eyebrow">01 / Selected work</p><h2 id="selected-title">A few things<br><em>I’ve worked through.</em></h2></div><p>Five stories. Different settings.<br> A common habit of following the problem.</p></div>
  <div class="selected-grid">${cases.map((work, index) => `<article class="featured${index === 0 ? ' flagship' : ''}">
    <a class="visual-link" href="/work/${e(work.slug)}/" aria-label="Read ${e(work.shortTitle)}">${workVisual(work.visual)}<span class="visual-arrow" aria-hidden="true">↗</span></a>
    <div class="featured-copy"><div class="work-kicker"><span>${e(work.number)} / ${e(work.organisation)}</span><span>${e(work.kind)}</span></div>
    <h3><a href="/work/${e(work.slug)}/">${e(work.shortTitle)}<span aria-hidden="true"> ↗</span></a></h3><p>${e(work.deck)}</p>
    ${index === 0 ? facts(work.facts, 'compact-facts') : ''}${tags(work.tags.slice(0, 3))}
    <a class="text-link" href="/work/${e(work.slug)}/">Read the story <span aria-hidden="true">→</span></a></div>
  </article>`).join('')}</div>
</section>`;
