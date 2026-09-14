# Review status — 14 September 2026

## Current review build

The live GitHub Pages site remains unchanged. This folder is the separate Astro review build.

The homepage opens with Aryan's supplied ten-second spacecraft film once per browser tab. Refreshes, returning with Back and moving between portfolio pages skip it; a newly opened tab plays it again. Runtime aspect matching selects the 16:9 or 9:16 version according to how much of the authored frame survives the cover crop. Only the chosen source loads. The last second softens and dissolves into the already-rendered homepage, which is pinned to the opening introduction during and just after the transition. A circular skip control, Motion off, reduced-motion preference, deep links, wheel and touch movement can bypass the film. `?intro=1` is the local review override.

The shared canvas atmosphere now has faster layered star drift, slow nebula movement, pointer and scroll parallax, an animated orbital path, a beacon and two intermittent traffic trails. These effects stop under reduced motion or Motion off.

The homepage now begins with a warmer introduction, followed by music and selected work. Its round music control starts A Town with an Ocean View only after the visitor clicks and then moves to the track selection. Once playback is engaged, a compact viewport-level player remains available away from the music section. The header includes Get in touch. The footer pairs Email and Resume on wide screens, stacks them on narrow screens, uses compact LinkedIn and X logo links, opens every external destination in a new tab, and ends with Made with ❤️.

The introduction now uses a two-column composition on wide screens, with Work, Interests and About in a compact right rail and the page-level music and selected-work controls beneath the copy. On narrow screens, the same controls form two labelled groups separated by rules. The selected identity combines the first two concepts from `/identity-lab/index.html`: a lowercase `arbs` wordmark and orange orbit paired with a small blue-window capsule. The favicon uses the same Orbit Capsule symbol. Dark is now the first-visit default while Dark, Light and Auto remain available and remembered.

The previous content refinements remain in place: fuller professional summaries; expanded MoveInSync and JPMorgan case studies; no process-explainer sentence at the top of Work; and a quieter music player with local fallback, per-track YouTube Music controls and a persistent link for the selected track. The approved 22-entry work index and its employer, freelance, client, academic and community distinctions were preserved.

## Validated locally

- Both supplied videos are ten-second, 24 FPS H.264 files. The site copies are muted and fast-start enabled: 4.4 MB landscape and 5.4 MB portrait.
- Browser at 16:10-ish width selected `intro-landscape.mp4`, played it automatically and used `object-fit: cover`.
- Browser at a tall phone viewport selected `intro-portrait.mp4`, played it automatically and used `object-fit: cover`.
- The transition began during the final second and completed at `Hi, I'm Aryan` with page scroll at zero.
- The skip control completed immediately at the same homepage position.
- A refresh and the Work → Home path skipped the introduction in the same tab.
- An immediate Get in touch click after a returning page load reaches the footer without the arrival script pulling the page back to the top.
- The homepage did not start audio on load. Its round music control moved to the listening section, began the default track and exposed the floating play/pause control.
- The new footer fits Email and Resume on one desktop row, stacks them on a narrow screen, and exposes labelled LinkedIn and X logo controls without horizontal overflow.
- Source preflight passed for 17 Astro templates, CSS syntax, 22 work entries, five story routes and all required assets. JavaScript syntax checks passed.

## Remaining release gates

Astro reached its static build phase, then the Codex sandbox denied esbuild's child process with `spawn EPERM`. Run `npm run build` in an ordinary PowerShell terminal for the final production build. The real Gemini backend and Google key remain intentionally unconfigured. Review the animation, both themes, Motion off, music fallback and keyboard flow before approving publication.
