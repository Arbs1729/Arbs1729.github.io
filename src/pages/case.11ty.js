import layout from '../components/layout.js';
import workVisual from '../components/work-visual.js';
import { cases } from '../data/work.js';
import { escape as e, facts } from '../components/utils.js';
export default class {
  data() { return { cases, pagination: { data: 'cases', size: 1, alias: 'work' }, permalink: data => `work/${data.work.slug}/index.html` }; }
  render({ work }) {
    const next = cases[(cases.findIndex(item => item.slug === work.slug) + 1) % cases.length];
    const code = `if (order.payment_status === "paid") {
  return {
    paymentStatus: "paid",
    state: "COMPLETED",
    changed: false
  };
}`;
    return layout({title: work.shortTitle, description: work.deck, path: `/work/${work.slug}/`, article: true, content: `
      <article class="case-study"><header class="case-header"><a class="back-link" href="/#selected">← Selected work</a><div class="case-kicker"><span class="eyebrow">${e(work.number)} / ${e(work.organisation)}</span><span class="work-status">${e(work.kind)}</span></div><h1>${e(work.title)}</h1><p class="case-deck">${e(work.deck)}</p><dl class="case-meta"><div><dt>My role</dt><dd>${e(work.role)}</dd></div><div><dt>When</dt><dd>${e(work.period)}</dd></div><div><dt>Focus</dt><dd>${e(work.tags.join(' · '))}</dd></div></dl></header>
      ${workVisual(work.visual, true)}${facts(work.facts, 'case-facts')}
      <div class="case-body"><aside class="case-nav"><span class="eyebrow">In this story</span><a href="#context">The context</a><a href="#decisions">The decisions</a><a href="#outcome">The outcome</a><a href="#reflection">What stays with me</a>${work.link ? `<a class="external-project" href="${e(work.link)}">Visit the live project ↗</a>` : ''}</aside><div class="case-prose">
        <section id="context"><p class="eyebrow">01 / Context</p><h2>The problem<br><em>around the work.</em></h2><p>${e(work.context)}</p><div class="constraint-note"><h3>What made it interesting</h3><p>${e(work.constraints)}</p></div></section>
        <section id="decisions"><p class="eyebrow">02 / Decisions & approach</p><h2>How the work<br><em>took shape.</em></h2><div class="decisions">${work.decisions.map((decision, index) => `<div><span class="decision-number">0${index + 1}</span><div><h3>${e(decision.title)}</h3><p>${e(decision.text)}</p></div></div>`).join('')}</div>
        ${work.slug === 'shubh-bazaar' ? `<figure class="code-evidence"><figcaption>From the project’s payment reconciliation implementation</figcaption><pre><code>${e(code)}</code></pre><p>A recorded payment success is treated as a terminal state. Re-checking it does not change it.</p></figure>` : ''}</section>
        <section id="outcome"><p class="eyebrow">03 / Outcome & evidence</p><h2>What came<br><em>out of it.</em></h2><p>${e(work.outcome)}</p><div class="evidence-note"><span class="eyebrow">The evidence</span><p>${e(work.evidence)}</p></div></section>
        <section id="reflection"><p class="eyebrow">04 / Reflection</p><h2>What stays<br><em>with me.</em></h2><p>${e(work.takeaway)}</p></section>
        <details class="source-note"><summary>About the source material</summary><p>${e(work.source)}</p></details>
      </div></div></article>
      <a class="next-story" href="/work/${e(next.slug)}/"><span class="eyebrow">Next story / ${e(next.organisation)}</span><span>${e(next.shortTitle)}<span aria-hidden="true">↗</span></span></a>
    `});
  }
}
