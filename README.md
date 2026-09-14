# Aryan's personal flight deck

Local review edition. The live GitHub Pages repository is unchanged. See RESEARCH.md for 24 personal/creator references and two adjacent references, and DESIGN-SYSTEM.md for the visual system defined before implementation.

See `LLM-PLAN.md` for the audited Gemini/Cloudflare co-pilot architecture and rollout sequence.

## Run

Node 22.12+ is required.

```powershell
npm ci
npm run dev
```

The default preview is http://127.0.0.1:4176/. An already-running terminal may still serve http://127.0.0.1:4321/ because its old command specified two ports. Use the URL printed by Astro. Restart with just `npm run dev` to use the corrected default.

```powershell
npm run check:source
npm run chat:test
npm run build
npm run preview
```

If Codex reports `spawn EPERM`, run the build in an ordinary PowerShell terminal. Source preflight is not a substitute for a production build.

## Edit

- `src/data/modules.ts`: order/remove home sections.
- `src/components/HomeBase.astro`: concise homepage introduction, internal jumps and selected work.
- `src/data/portfolio.ts`: approved work index, experience and case studies. Side/freelance and academic work share one filterable Project library while retaining their original setting labels.
- `src/components/Deck.astro`: shared navigation, metadata and contact; external footer links open in a new tab. The footer pairs Email and Resume on wide screens, then stacks them on narrow screens, with compact LinkedIn and X icon links beneath.
- `src/components/BrandMark.astro`: the selected `arbs` Orbit Capsule identity, combining an orbital signal with a small optimistic sci-fi capsule. `public/favicon.svg` carries the matching symbol at favicon scale.
- `src/styles/deck.css` and `src/styles/revamp.css`: theme tokens, layout, tactile controls, responsive refinements and reduced-motion rules.
- `src/components/Orbit.astro`: original orbital illustration.
- `public/deck.js`: optional interactions and chat client.
- `src/pages/about.astro`: career narrative, credentials and personal context.

The 22 approved index entries retain their work categories. Do not turn responsibilities into additional projects. Selected stories are MoveInSync, Shubh Bazaar and semiconductor research. Field notes currently link to reflections within these projects; they are not invented published essays. Music favourites and recordings were supplied by Aryan. Add books, films, places and writing only when supplied. The music interface uses YouTube first and automatically falls back to the local recordings.

## Test the portfolio co-pilot locally

The frontend stays static; the Google key belongs only on the server. It must never have a PUBLIC_ prefix or be put in a browser script.

1. Open `worker/.dev.vars` and paste the Google AI Studio key after `GEMINI_API_KEY=`. The file is local and gitignored.
2. Set `PUBLIC_CHAT_ENDPOINT=http://127.0.0.1:8787/chat` in root `.env`.
3. Run `npm run knowledge` after portfolio edits, then `npm run chat:dev` in another terminal.
4. Restart Astro after changing `.env`. Restart the local chat server after changing the key or config.
5. Test a factual question, an interests question, an unknown question, a follow-up and a prompt-injection attempt. Production uses `gemini-3.8-flash` first and retries quota or temporary availability failures with `gemini-3.5-flash-lite`.

The production Worker is deployed at `https://aryan-portfolio-copilot.f20202091.workers.dev/chat` and is configured by `worker/wrangler.jsonc`. `GEMINI_API_KEY` is stored as an encrypted Worker secret; `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, and the origin allowlist are runtime variables. `.env.production` connects production Astro builds to that endpoint. Do not upload `.dev.vars`, `.env`, node_modules or the original private source documents.

Origin checks are not authentication. The anonymous rate binding allows 5 requests per minute per IP at a Cloudflare location; shared networks share the allowance. It is an abuse throttle, not a global cost cap. The primary model is Gemini 3.8 Flash; the Worker retries with Gemini 3.5 Flash-Lite when the primary model reports quota exhaustion or a temporary availability error. Google does not expose a request-time percentage of project quota remaining, so an exact automatic switch at 75% consumed is unavailable; monitor the active project limits in AI Studio if you want to switch before exhaustion. Keep Cloud Billing unlinked if the free tier must remain the hard ceiling. Google AI Pro and the Gemini API are separate products; the consumer subscription does not supply API usage. This application does not persist chat history or log message bodies; Google receives the prompt, bounded history and public portfolio context. Worker observability is disabled. The local adapter binds only to loopback.

## Publishing and maintenance

Production metadata uses `https://aryanbasantani.me` as the canonical site and allows indexing. The GitHub Pages workflow runs source preflight and the Astro production build before deploying. Keep `CNAME`, `.env.production`, and the existing Pages workflow when updating the repository. Deploying frontend files does not deploy the Worker; update the separate Cloudflare Worker when `worker/index.mjs` or its generated knowledge changes.

The production header and favicon use a hybrid of Orbit Signal and Capsule Badge: a lowercase `arbs` wordmark, orange orbit and blue-window capsule. The identity comparison lab, local browser review profiles, and dashboard transfer helpers are excluded from publication.

No new dependencies beyond the existing Astro stack are required for the frontend. The arrival uses the supplied landscape and portrait H.264 videos; the atmospheric background is drawn by a lightweight canvas. No remote fonts are loaded. Music tries the official YouTube player first and falls back to the supplied local audio files. Anime covers load from AniList.


## Arrival, atmosphere and listening room

- `src/components/Arrival.astro`, `src/styles/arrival.css` and `public/arrival.js`: a ten-second video introduction that selects the composition retaining the most of the current viewport. It plays once per browser tab, so refreshes, Back and internal page navigation return directly to the site. Append `?intro=1` while reviewing locally to replay it. It dissolves into the already-rendered homepage during its final second. Wheel, touch, the circular skip control, Motion off and reduced-motion preferences bypass it and land at the homepage introduction.
- `public/media/intro-landscape.mp4` and `public/media/intro-portrait.mp4`: the supplied clean, watermark-free H.264 videos at 24 FPS. Landscape and near-landscape displays use the 16:9 cut; tall displays use the 9:16 cut. Only the selected file is loaded.
- `src/components/Atmosphere.astro` and `public/atmosphere.js`: the shared animated star, nebula and planet-horizon background. It uses multiple star speeds, moving orbital marks, two flight trails, and smooth pointer/scroll parallax; it redraws for light/dark themes and becomes static when motion is disabled.
- `src/components/HomeBase.astro`: homepage order and copy. The current order is introduction, music, selected work and contact.
- `public/theme.js`: theme preference handling. Dark is the first-visit default; a visitor's later Dark, Light or Auto choice is remembered.
- `src/pages/about.astro`: the longer personal narrative, credentials and the full professional timeline. Experience is intentionally part of About rather than a separate route.
- `src/data/culture.ts`: the six music selections and personal AniList ratings. Do not substitute community ratings for personal scores.
- `src/components/MusicPlayer.astro` and `public/deck.js`: user-initiated YouTube-first playback, automatic local fallback, track switching, a persistent current-track YouTube Music link and a compact floating control after playback starts. The round homepage control starts A Town with an Ocean View and moves to the music section. Browser policy can still require the visitor to press Play.
- The Town recording is the A Symphonic Celebration version, explicitly labelled. A Cruel Angel’s Thesis and Iktara were added at Aryan’s request.

Source preflight and JavaScript syntax passed for this iteration. Browser checks confirmed both adaptive intro sources, autoplay, cover cropping, the final-second dissolve, landing at the homepage introduction, and the skip control. The Codex sandbox still blocks Astro's esbuild subprocess with `spawn EPERM`, so run `npm run build` in an ordinary PowerShell terminal before release. Also review both themes, Motion off, local music fallback and track switching. YouTube availability is controlled by the uploader and region.
