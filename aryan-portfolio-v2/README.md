# Aryan’s personal portfolio

A warm, editorial home for product, technology, and finance work. Built with Eleventy 3.1.6, reusable JavaScript templates, and plain CSS. It generates static HTML with no client framework, database, analytics, or external font requests.

## Run locally

Use Node.js 18 or newer (a current LTS release is preferable). Open a terminal in this folder:

```sh
npm ci
npm run dev
```

Visit **http://localhost:4174/**. Leave the terminal running; stop it with Ctrl+C. In the delivered local folder, dependencies are already installed. The ZIP excludes dependencies, so run `npm ci` after extracting it elsewhere.

```sh
npm run build
npm run check
```

The finished static site is generated in `dist/`. Serve that directory from a web server rather than opening its HTML files directly: links and assets use paths from the site root. The included `dist/` is ready to preview without rebuilding.

## What’s inside

- **Home:** positioning, five selected stories, a subject index, and three personal notes.
- **Selected work:** MoveInSync analytics leads, followed by Shubh Bazaar, JPMorgan credit-risk workflows, semiconductor research, and the fintech client engagement.
- **Work index:** 25 entries across Products & systems, Finance & markets, Strategy & analytical research, and Communities & learning. Entries have explicit work settings and skill tags. Selected stories also appear here intentionally.
- **About:** career narrative, selected experience, BITS education, exam credentials, and community work.
- **Contact:** Gmail, supplied LinkedIn profile, and a public résumé PDF with the phone removed. The Shubh Bazaar case links to the supplied live site. No GitHub link is shown.

The résumé includes the clarified end dates (Kearney: March 2026; MoveInSync: September 2025), the conservative JPMorgan figure (~90%), and the correct Shubh Bazaar link. Original source documents were left untouched.

## Edit guide

| File | What to change |
| --- | --- |
| `src/data/profile.js` | Name, email, LinkedIn, description, experience, future personal entries |
| `src/data/work.js` | Case-study copy, evidence, facts, tags, and all index entries |
| `src/pages/index.11ty.js` | Main positioning and homepage structure |
| `src/pages/about.11ty.js` | Career narrative, education, and community copy |
| `src/components/personal-notes.js` | Anime, F1, and macro/geopolitics notes |
| `src/components/work-visual.js` | Labelled scope diagrams and project artwork |
| `src/components/layout.js` | Shared navigation, metadata, and page shell |
| `src/components/contact.js` | Contact invitation and links |
| `src/styles/global.css` | Palette, type, spacing, responsive layout, print and reduced motion |
| `public/` | Résumé, favicon, theme script, and project media |

To add a full case study, add an object to `cases` in `work.js`, following the existing structure. Add its index entry to the right `workGroups` group and use the same `slug`. The case route and next-story navigation generate automatically. Update the homepage’s “Five stories” sentence if the selection count changes.

For a smaller project, add just an index entry. Leave `slug` out until a real case page exists; the entry remains readable without a dead link.

### Grow the personal side

`personalEntries` starts empty. Add real writing, reading notes, photography, or experiments when ready; no placeholder section is rendered before then. An entry uses this shape:

```js
{
  kind: 'Writing',
  title: 'Your actual title',
  description: 'A short description in your own voice.',
  href: '/notes/your-actual-slug/'
}
```

Create the corresponding page in `src/pages/` and wrap its content with the shared `layout()` function, or use an actual external link. The build checker catches missing local targets.

Useful next materials: an excerpt from the semiconductor report/workbook with dates and assumptions; redacted MoveInSync screenshots or an example metric-to-record journey; fintech feature artifacts; a short piece of writing; a reading note; or photographs you want to share. The current site leaves these unfilled instead of inventing them.

## Design and source decisions

The palette pairs cream, graphite, rust, and muted green with a warm charcoal dark mode. Serif headings and small editorial annotations give work and personal interests a shared visual identity. Typography uses local system fonts. Motion is limited to small interaction transitions and scrolling, with a reduced-motion override.

Inspiration was reviewed from [Maggie Appleton](https://maggieappleton.com/), [Brian Lovin](https://brianlovin.com/), and [Paco Coursey](https://paco.me/). The borrowed principles are a legible body of work, a concise introduction, and personal interests that sit naturally beside professional material. Layouts and graphics were created for this portfolio.

The MoveInSync case centres on the decision to replace a separate catalogue of 100+ reports with one vertical-specific suite for ETS Cab, Shuttle, and Rentlz. It distinguishes the documented customer reach from qualitative improvements in demos, conversion, and operational visibility. The finance case describes the documented methodology without inventing valuation results or current investment recommendations.

The Shubh artwork and payment-reconciliation excerpt come from the supplied project. Other work visuals are labelled explanatory schematics, not product screenshots. Shubh is identified as a live side/freelance project built end to end with AI assistance. Employer, client, academic, and community work are clearly distinguished. Source notes on the case pages explain the evidence boundaries.

Astro compilation failed in this Windows execution environment with `spawn EPERM`. Following the requested one final attempt, the site was completed in Eleventy. The delivered project has no Astro or esbuild dependency.

## Themes, accessibility, and metadata

The theme control cycles **Auto → Light → Dark**. Auto follows system preference, including changes while the page is open. An explicit choice is stored locally and restored before the first paint. If storage is unavailable, the button still works for the current page. Without JavaScript, system colours and all content, navigation, case-study sections, and contact links still work; the theme control remains hidden.

Pages use semantic landmarks, one primary heading, meaningful image descriptions, a skip link, visible keyboard focus, and native links/details controls. Layout rules cover narrow screens and larger displays. Images reserve their dimensions and load lazily.

For a future public build, set `SITE_URL` to the real root domain. In PowerShell:

```powershell
$env:SITE_URL = 'https://your-real-domain.example'
npm run build
```

Replace the example with your actual domain. Without `SITE_URL`, pages are marked `noindex, nofollow` for local review. With it, normal pages receive canonical and Open Graph URLs; the 404 remains excluded from indexing. SEO descriptions and social title/description metadata are page-specific. No invented public URL or social image is included. Hosting must serve `dist/` at the domain root and use `404.html` for missing pages.

## Validation

Validated on 6 September 2026:

- Production build: nine HTML pages and all five public assets.
- 164 internal link/asset targets, section anchors, unique IDs, headings, accessible label references, image descriptions/dimensions, and page metadata.
- Five selected stories and 25 indexed entries, including the clarified MoveInSync transport offerings and JPMorgan figure.
- Theme cycling, saved preference, invalid preferences, blocked storage, and cross-tab updates, using the actual theme script in a simulated environment.
- Core text/background colour combinations in both palettes meet 4.5:1; the lowest tested ratio is 4.55:1.
- HTTP responses from the local server and the generated pages.
- The public résumé’s redacted text/links and its rendered layout were checked separately.

Browser visual testing, viewport/zoom testing, and screen-reader testing have not been performed. The responsive and focus rules are implemented, but the checks above are not a claim of a complete accessibility audit. External sites and the live payment system have not been audited. `npm run check` performs local checks without contacting external services.
