# Architecture & Operational Reference

Detailed implementation, deployment, and content notes for [aryanbasantani.me](https://aryanbasantani.me).

## Project Structure

- `src/pages/` — Static Astro routes (`/`, `/work/`, `/work/[slug]/`, `/interests/`, `/about/`, `/404`, `/sitemap.xml`).
- `src/components/` — Shared layout (`Deck.astro`), homepage (`HomeBase.astro`), arrival video (`Arrival.astro`), background canvas (`Atmosphere.astro`), music players (`MusicPlayer.astro`, `GlobalMusicPlayer.astro`), AI chat widget (`ChatWidget.astro`), and brand mark (`BrandMark.astro`).
- `src/data/` — Structured portfolio data (`portfolio.ts`) and music/anime picks (`culture.ts`).
- `src/styles/` — Stylesheets (`global.css`, `deck.css`, `revamp.css`, `arrival.css`).
- `public/` — Vanilla JS runtime (`arrival.js`, `atmosphere.js`, `deck.js`, `theme.js`), `CNAME`, `robots.txt`, `favicon.svg`, `resume.pdf`, and media assets.
- `worker/` — Cloudflare Worker (`index.mjs`, `wrangler.jsonc`, `local.mjs`, generated `knowledge.json`).
- `scripts/` — Source preflight (`preflight.mjs`), knowledge generator (`knowledge.mjs`), and mocked Worker test suite (`test-worker.mjs`).
- `docs/` — Design system (`DESIGN-SYSTEM.md`), reference research (`RESEARCH.md`), LLM rollout plan (`LLM-PLAN.md`), and historical review notes (`REVIEW-NOTES.md`).

## Arrival, Atmosphere & Audio

- **Arrival intro (`src/components/Arrival.astro`, `src/styles/arrival.css`, `public/arrival.js`):**
  - Plays once per browser tab (`sessionStorage`), skipped on refresh, deep links (`#hash`), `prefers-reduced-motion`, or wheel/touch/Skip interaction. Append `?intro=1` locally to replay.
  - Selects `intro-landscape.mp4` (16:9) or `intro-portrait.mp4` (9:16) based on viewport retention, with instant WebP first-frame posters.
  - Videos are 30 FPS H.264 (`+faststart`) with the intended speed baked in, played at `1.0x` for smooth 60 Hz frame pacing, with a 3.5s stall fallback and a GPU-composited `opacity + scale` dissolve.
- **Background atmosphere (`public/atmosphere.js`):**
  - Lightweight 2D canvas drawing nebulae, drifting stars, planet horizon, orbital band, and flight trails. Automatically pauses while the opaque intro covers the viewport, and freezes under reduced motion.
- **Persistent music player (`GlobalMusicPlayer.astro`, `MusicPlayer.astro`, `public/deck.js`):**
  - Persists across Astro `<ClientRouter />` navigations. Uses the official YouTube IFrame API first and automatically falls back to local recordings in `public/media/audio/` on embed error, load failure, or silent playback timeout.
- **Theme handling (`public/theme.js`):**
  - Dark is the first-visit default; Dark, Light, and Auto choices persist in `localStorage` and across Astro view transitions (`astro:before-swap` / `astro:after-swap`).

## Content Guidelines

- `src/data/portfolio.ts` holds the 22 approved work index entries and 5 case studies (3 selected on the homepage: MoveInSync, Shubh Bazaar, semiconductor research). Preserve employer, freelance, academic, client, and community boundaries.
- `src/data/culture.ts` holds the 6 soundtrack selections and personal AniList ratings. Do not substitute community scores for personal ratings.

## Portfolio Co-Pilot (Cloudflare Worker)

The frontend stays completely static. The Gemini API key belongs only on the server (never with a `PUBLIC_` prefix or in browser code).

- **Production endpoint:** configured in `.env.production` (`PUBLIC_CHAT_ENDPOINT`).
- **Models (`worker/wrangler.jsonc` & `worker/index.mjs`):**
  - Primary: `gemini-4-neon` (`thinkingLevel: low`)
  - Fallback: `gemini-4-hydrogen` (`thinkingLevel: medium`) on `403`, `404`, `429`, or `5xx`
- **Security & limits:**
  - CORS origin allowlist (`ALLOWED_ORIGINS`), strict payload/message/history caps, and Cloudflare IP rate limiting (`5 req / 60s`).
  - No chat history or PII is persisted or logged; Worker observability is disabled.

### Local Co-Pilot Testing

1. Put `GEMINI_API_KEY=<key>` in `worker/.dev.vars` (gitignored).
2. Set `PUBLIC_CHAT_ENDPOINT=http://127.0.0.1:8787/chat` in root `.env` (gitignored).
3. After changing `src/data/portfolio.ts` or `src/data/culture.ts`, run `npm run knowledge` to regenerate `worker/knowledge.json`.
4. Run `npm run chat:dev` in one terminal and `npm run dev` in another.

## Deployment & CI

- **Frontend (GitHub Pages):** Every push to `main` triggers `.github/workflows/deploy.yml`, which runs `npm run check:source` and `npm run build`, then publishes `./dist` (including `public/CNAME`).
- **Backend (Cloudflare Worker):** Deploying GitHub Pages does **not** redeploy the Worker. Deploy `worker/` separately via Wrangler whenever `worker/index.mjs`, `worker/wrangler.jsonc`, or `worker/knowledge.json` changes.
