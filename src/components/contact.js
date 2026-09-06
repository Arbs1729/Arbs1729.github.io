import { profile } from '../data/profile.js';
import { escape as e } from './utils.js';
export default () => `<section class="contact" id="contact" aria-labelledby="contact-title">
  <div><p class="eyebrow">An open conversation</p><h2 id="contact-title">What are you<br /> <em>working on?</em></h2></div>
  <div class="contact-copy"><p>I’m looking for my next role in product and technology, and exploring opportunities where finance is part of the problem.</p><a class="email-link" href="mailto:${e(profile.email)}">${e(profile.email)}<span aria-hidden="true">↗</span></a><div class="contact-links"><a href="${e(profile.linkedin)}">LinkedIn ↗</a><a href="/resume.pdf">Résumé ↓ <span class="sr-only">PDF, opens in this tab</span></a></div></div>
</section>`;
