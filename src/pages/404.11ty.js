import layout from '../components/layout.js';
export default class {
  data() { return { permalink: '404.html' }; }
  render() { return layout({ title: 'Page not found', path: '/404.html', content: '<section class="page-intro"><p class="eyebrow">404 / A loose page</p><h1>Nothing here.<br><em>Plenty elsewhere.</em></h1><p>This page may have moved. The work index is a good place to start.</p><a class="text-link" href="/work/">Explore the index →</a><a class="text-link" href="/">Back home →</a></section>' }); }
}
