// Local development adapter for the same Worker handler. Never bind publicly.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import worker from './index.mjs';

function stripJsoncComments(text) {
  return text.replace(/("(?:\\.|[^"\\])*")|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g, (match, str) => str || '');
}

const config = JSON.parse(stripJsoncComments(await readFile(new URL('./wrangler.jsonc', import.meta.url), 'utf8')));
const devSecrets = {};
try {
  const source = await readFile(new URL('./.dev.vars', import.meta.url), 'utf8');
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) devSecrets[key] = value;
  }
} catch {}

function makeLimiter(limit) {
  let count = 0;
  let expires = 0;
  return {
    async limit() {
      if (Date.now() > expires) {
        count = 0;
        expires = Date.now() + 60000;
      }
      return { success: ++count <= limit };
    },
  };
}

const env = {
  ...config.vars,
  ...devSecrets,
  CHAT_LIMITER: makeLimiter(5),
  BOOKING_LIMITER: makeLimiter(20),
};

createServer(async (req, res) => {
  try {
    const request = new Request(`http://127.0.0.1:8787${req.url}`, {
      method: req.method,
      headers: req.headers,
      ...(!['GET', 'HEAD'].includes(req.method) ? { body: req, duplex: 'half' } : {}),
    });
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  } catch {
    res.writeHead(500);
    res.end('{"error":"Local service error"}');
  }
}).listen(8787, '127.0.0.1', () => {
  console.log(
    `Local Worker ready: http://127.0.0.1:8787 (/chat ${devSecrets.GEMINI_API_KEY ? 'key configured' : 'key not configured'}, /booking/* ready)`,
  );
});
