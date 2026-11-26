# Aryan Basantani — Portfolio

Personal website and portfolio live at **[aryanbasantani.me](https://aryanbasantani.me)**.

Built with **Astro** (static output + zero frontend framework overhead), vanilla JavaScript, and a **Cloudflare Worker** AI co-pilot powered by Gemini.

## Highlights

- **Adaptive spacecraft intro** — Landscape/portrait 30 FPS arrival sequence with instant poster framing, smooth dissolve, and one-click skip.
- **Work & case studies** — Structured breakdown of product, finance, engineering, and consulting work ([`/work/`](https://aryanbasantani.me/work/)).
- **Persistent soundtrack & interests** — YouTube-first music player with automatic local audio fallback, plus anime, F1, and macro notes ([`/interests/`](https://aryanbasantani.me/interests/)).
- **Grounded AI co-pilot** — Floating portfolio Q&A assistant backed by a rate-limited Cloudflare Worker (`gemini-4-neon` primary, `gemini-4-hydrogen` fallback).
- **Dark / Light / Auto themes** — Persisted seamlessly across client-side page transitions.

## Quick Start

Requires **Node.js 22.12+**.

```bash
npm ci
npm run dev        # Local server at http://127.0.0.1:4176/ (use ?intro=1 to replay intro)
```

### Verification Commands

```bash
npm run check:source   # Validate Astro templates, CSS syntax, routes & required assets
npm run chat:test      # Run mocked Cloudflare Worker unit tests
npm run knowledge      # Regenerate worker/knowledge.json after editing portfolio data
npm run build          # Production static build into dist/
```

## Documentation

For deeper technical details, content rules, and deployment steps, see [`docs/`](docs/):

- [**Architecture & Deployment Guide**](docs/ARCHITECTURE.md) — Project map, intro/audio/theme mechanics, local Worker setup, and CI/CD.
- [**Design System**](docs/DESIGN-SYSTEM.md) — Visual direction, colour palette, and atmosphere notes.
- [**AI Co-Pilot Plan**](docs/LLM-PLAN.md) — Security boundaries, prompt grounding, and rollout design.
- [**Reference Research**](docs/RESEARCH.md) — Portfolio benchmark notes.
- [**Review Notes**](docs/REVIEW-NOTES.md) — Historical iteration checkpoints.
