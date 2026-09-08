# Aryan Basantani — portfolio

Astro static portfolio at https://aryanbasantani.me. Node 22.12 or newer required.

## Local development

Run `npm ci`, then `npm run dev` (http://127.0.0.1:4175).
Run `npm run check:source` and `npm run build` before release. `npm run preview` serves the static build.

## Editing

- `src/data/portfolio.ts`: profile, experience, five stories, grouped 22-entry index, future personal entries.
- `src/pages/index.astro`: homepage; three selected stories.
- `src/pages/about.astro`: narrative, education, interests.
- `src/pages/work/[slug].astro`: shared case-study template.
- `src/styles/global.css`: warm light/dark themes and responsive layouts.
- `src/layouts/Base.astro`: common navigation, contact and metadata.
- `public/`: redacted resume, project artwork, favicon, theme script and domain files.

Add only evidenced work. Retain client anonymity and group attribution. Keep routine responsibilities within their parent experience. Never replace the redacted resume with an original containing a phone number or private information. Empty personalEntries produce no filler; add real writing, photographs or experiments when ready.

## Deployment and rollback

Pushes to main trigger the GitHub Pages workflow: Node 22, clean dependency install, source preflight, Astro build, artifact upload and deployment. Domain: aryanbasantani.me. The production sitemap is generated from story data.

The prior Eleventy release is retained at tag `pre-astro-2026-09-08` (commit ceda35b). To roll back, revert the Astro migration commit with Git and push the revert to main; that restores the prior source and workflow without rewriting history.

## Migration validation

The approved local Astro review built nine HTML pages successfully in normal PowerShell. Source checks, 117 local references/anchors, theme persistence, a keyboard-operated disclosure and narrow-page geometry were checked. No-JavaScript and reduced-motion paths were inspected in source; physical-device visual review remains useful. Production metadata and sitemap were added for this release and are built by CI.
