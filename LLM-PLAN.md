# Portfolio co-pilot plan

## Current baseline

The site already has a floating, keyboard-accessible chat panel on every main page. It opens and closes without navigation, supports prompt shortcuts, Cancel, Clear, Escape, focus return, a safe unconfigured state, and a compact mobile layout.

The existing Cloudflare Worker already:

- keeps the Google key on the server;
- accepts only `/chat` POST requests from configured browser origins;
- bounds the request body, question length, conversation history, upstream response, and request time;
- sends only the generated public portfolio knowledge and the last six conversation messages to Gemini;
- instructs the model to avoid invented facts, private facts, hiring verdicts and financial advice;
- uses a Cloudflare rate-limit binding and hides provider errors from visitors;
- stores no conversation history or message bodies.

`scripts/knowledge.mjs` generates `worker/knowledge.json` from the public portfolio data. This remains the single source of truth after project-taxonomy or copy changes.

## Recommended v1

Use the current lightweight request/response architecture rather than adding a database, vector search or an agent framework. The public knowledge base is small enough to send as bounded context, and the bot does not need tools or web browsing.

1. Use Gemini 3.8 Flash for primary answers and Gemini 3.5 Flash-Lite as the automatic quota/availability fallback. Both models stay configurable without editing application code.
2. Keep chats ephemeral in the browser tab. Do not save prompts, answers, IP addresses or visitor profiles.
3. Keep the assistant limited to public Work, About and Interests content. It may explain fit for a role category using that evidence, but it should avoid making hiring predictions.
4. Add source links to each response and render the Worker-provided sources in the panel.
5. Keep `GEMINI_API_KEY` in `worker/.dev.vars` locally and store the production value as a Cloudflare Worker secret.
6. Limit anonymous traffic to five requests per minute per IP. Turnstile remains an optional later layer if public abuse becomes a problem; it is not required for local testing.
7. Treat the Cloudflare rate binding as traffic control rather than an exact cost cap. Keep Cloud Billing unlinked on the Gemini API project so the free-tier quota is the hard ceiling. Google does not expose a live quota-remaining percentage to an individual API request, so the Worker cannot detect an exact 75% threshold. It falls back when the primary model returns quota exhaustion or a temporary availability error.
8. Enable sampled operational logs only if needed, recording status, latency and coarse error category without prompts or answers.

## Implementation sequence after decisions

1. Finalize the Work taxonomy and regenerate public knowledge.
2. Tighten the Worker configuration, required secret, response schema and security headers.
3. Improve response grounding and render contextual source links in the chat panel.
4. Add the selected abuse-control mode and visitor-facing privacy note.
5. Configure the local Google key in `worker/.dev.vars` and the local frontend endpoint in root `.env`.
6. Run the existing Worker tests plus factual, unknown, follow-up, prompt-injection, rate-limit, timeout, mobile, keyboard and unavailable-state tests.
7. Prepare a separate Worker deployment and production endpoint. Deploy only after explicit approval.

## Decisions made

- Project index: filterable **Project library**.
- Public scope: the whole site, including Work, About and Interests.
- Models: Gemini 3.8 Flash primary, Gemini 3.5 Flash-Lite fallback.
- Launch policy: local testing first, then a free-tier public preview only after review; no Google Cloud Billing link.
- Abuse control: five requests per minute per IP; Turnstile deferred unless public traffic makes it useful.
- Deployment: the approved Worker is live at `https://aryan-portfolio-copilot.f20202091.workers.dev/chat`; the secret, model variables, origin allowlist, rate binding, and disabled observability setting are configured.

## Current limitations to preserve visibly

- The live Worker is configured; the frontend must be built with the production endpoint before the published portfolio can use it.
- Google can receive the visitor's question, bounded conversation history and public portfolio context.
- Model answers may still be wrong, so case-study and page links remain the primary evidence.
- The current Cloudflare rate counter is permissive and local to a Cloudflare location; it is not a global billing ledger.
