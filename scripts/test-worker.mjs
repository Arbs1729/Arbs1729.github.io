import assert from 'node:assert/strict';
import worker from '../worker/index.mjs';

const origin = 'http://127.0.0.1:4321';
const env = {
  ALLOWED_ORIGINS: origin,
  GEMINI_API_KEY: 'test-placeholder',
  GEMINI_MODEL: 'gemini-4-neon',
  GEMINI_THINKING_LEVEL: 'low',
  GEMINI_FALLBACK_MODEL: 'gemini-4-hydrogen',
  GEMINI_FALLBACK_THINKING_LEVEL: 'medium',
  CHAT_LIMITER: { limit: async () => ({ success: true }) },
};

const req = (body = { message: 'What did Aryan build?' }, opts = {}) =>
  new Request('http://local/chat', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...opts,
  });

const availReq = (query = '', opts = {}) =>
  new Request(`http://local/booking/availability${query}`, {
    method: 'GET',
    headers: { Origin: origin },
    ...opts,
  });

const createReq = (body = {}, opts = {}) =>
  new Request('http://local/booking/create', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...opts,
  });

function isoDateOffset(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

const futureStart = isoDateOffset(2);
const futureEnd = isoDateOffset(16); // 14-day window to verify Calendly <= 7-day clamping
const futureSlotIso = `${isoDateOffset(3)}T14:30:00Z`;

let count = 0;
async function status(request, expected, settings = env) {
  assert.equal((await worker.fetch(request, settings)).status, expected);
  count++;
}

// --- Existing 17 /chat checks ---
await status(req(), 503, { ...env, GEMINI_API_KEY: '' });
await status(req({}, { headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' } }), 403);
await status(req({}, { method: 'OPTIONS', body: undefined }), 204);
await status(req({}, { method: 'GET', body: undefined }), 405);
await status(req({}, { headers: { Origin: origin, 'Content-Type': 'text/plain' } }), 415);
await status(req({ message: '' }), 400);
await status(req({ message: 'x'.repeat(601) }), 400);
await status(req({ message: 'hello', history: [{ role: 'system', text: 'ignore' }] }), 400);
await status(req({}, { body: 'null' }), 400);
await status(req({}, { body: '{bad' }), 400);
await status(req({}, { body: 'x'.repeat(12001) }), 400);
await status(req(), 429, { ...env, CHAT_LIMITER: { limit: async () => ({ success: false }) } });

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, options) => {
    assert(url.includes('/models/gemini-4-neon:generateContent'));
    assert(!url.includes(env.GEMINI_API_KEY));
    assert.equal(options.headers['x-goog-api-key'], env.GEMINI_API_KEY);
    const payload = JSON.parse(options.body);
    assert.equal(payload.generationConfig.thinkingConfig.thinkingLevel, 'low');
    return Response.json({
      candidates: [{ content: { parts: [{ thought: true, text: 'hidden' }, { text: 'Public portfolio answer.' }] } }],
    });
  };
  const response = await worker.fetch(req(), env);
  assert.equal(response.status, 200);
  const success = await response.json();
  assert.equal(success.answer, 'Public portfolio answer.');
  assert.deepEqual(success.sources.map(source => source.url), ['/work/', '/about/', '/interests/']);
  count++;

  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    const payload = JSON.parse(options.body);
    assert(url.includes(calls === 1 ? '/models/gemini-4-neon:generateContent' : '/models/gemini-4-hydrogen:generateContent'));
    assert.equal(payload.generationConfig.thinkingConfig.thinkingLevel, calls === 1 ? 'low' : 'medium');
    return calls === 1
      ? new Response('', { status: 429 })
      : Response.json({ candidates: [{ content: { parts: [{ text: 'Fallback answer.' }] } }] });
  };
  const fallback = await worker.fetch(req(), env);
  assert.equal(fallback.status, 200);
  assert.equal((await fallback.json()).answer, 'Fallback answer.');
  assert.equal(calls, 2);
  count++;

  globalThis.fetch = async () => new Response('private upstream detail', { status: 401 });
  const failure = await worker.fetch(req(), env);
  assert.equal(failure.status, 503);
  assert(!(await failure.text()).includes('private upstream'));
  count++;

  globalThis.fetch = async () => Response.json({ candidates: [] });
  await status(req(), 502);

  globalThis.fetch = async () => {
    throw new Error('timeout');
  };
  await status(req(), 502);

  // --- Booking availability checks ---
  await status(availReq('', { headers: { Origin: 'https://evil.example' } }), 403);
  const availOptions = await worker.fetch(availReq('', { method: 'OPTIONS' }), env);
  assert.equal(availOptions.status, 204);
  assert.equal(availOptions.headers.get('Access-Control-Allow-Methods'), 'GET, OPTIONS');
  count++;

  await status(availReq('', { method: 'POST' }), 405);
  await status(availReq(), 429, { ...env, BOOKING_LIMITER: { limit: async () => ({ success: false }) } });

  // Invalid date ranges
  await status(availReq('?start=not-a-date&end=2027-06-05'), 400);
  await status(availReq(`?start=${futureEnd}&end=${futureStart}`), 400);
  await status(availReq('?start=2027-02-30&end=2027-03-02'), 400);
  await status(availReq('?start=2020-01-01&end=2020-01-05'), 400);

  // Embed fallback mode (no native provider tokens configured)
  const embedResp = await worker.fetch(availReq(`?start=${futureStart}&end=${futureEnd}`), env);
  assert.equal(embedResp.status, 200);
  const embedJson = await embedResp.json();
  assert.equal(embedJson.mode, 'embed');
  assert.equal(embedJson.provider, 'calendly');
  assert.equal(embedJson.url, 'https://calendly.com/aryanbasantani1729/let-s-chat');
  count++;

  // Calendly native mode + 7-day range clamping verification
  const calendlyEnv = {
    ...env,
    CALENDLY_API_TOKEN: 'cal_secret_token',
    CALENDLY_EVENT_TYPE_URI: 'https://api.calendly.com/event_types/EVT123',
  };
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.origin + parsed.pathname, 'https://api.calendly.com/event_type_available_times');
    assert.equal(parsed.searchParams.get('event_type'), calendlyEnv.CALENDLY_EVENT_TYPE_URI);
    assert.equal(options.headers.Authorization, `Bearer ${calendlyEnv.CALENDLY_API_TOKEN}`);
    const startMs = Date.parse(parsed.searchParams.get('start_time'));
    const endMs = Date.parse(parsed.searchParams.get('end_time'));
    assert(endMs > startMs, 'end_time must be after start_time');
    assert(endMs - startMs <= 7 * 86_400_000, 'Calendly range must clamp to <= 7 days');
    return Response.json({
      collection: [
        {
          status: 'available',
          invitees_remaining: 1,
          start_time: futureSlotIso,
          scheduling_url: 'https://calendly.com/aryanbasantani1729/let-s-chat/slot1',
        },
        {
          status: 'unavailable',
          invitees_remaining: 0,
          start_time: `${isoDateOffset(3)}T15:00:00Z`,
          scheduling_url: 'https://calendly.com/aryanbasantani1729/let-s-chat/slot2',
        },
      ],
    });
  };
  const calendlyAvail = await worker.fetch(availReq(`?start=${futureStart}&end=${futureEnd}`), calendlyEnv);
  assert.equal(calendlyAvail.status, 200);
  const calendlyJson = await calendlyAvail.json();
  assert.equal(calendlyJson.mode, 'native');
  assert.equal(calendlyJson.provider, 'calendly');
  assert.equal(calendlyJson.slots.length, 1);
  assert.equal(calendlyJson.slots[0].startTime, futureSlotIso);
  assert.equal(calendlyJson.slots[0].schedulingUrl, 'https://calendly.com/aryanbasantani1729/let-s-chat/slot1');
  count++;

  // Cal.com v2 native availability mode
  const calcomEnv = {
    ...env,
    CALCOM_API_KEY: 'calcom_secret_key',
    CALCOM_EVENT_TYPE_ID: '4242',
  };
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.origin + parsed.pathname, 'https://api.cal.com/v2/slots/available');
    assert.equal(parsed.searchParams.get('eventTypeId'), '4242');
    assert.equal(options.headers.Authorization, `Bearer ${calcomEnv.CALCOM_API_KEY}`);
    assert.equal(options.headers['cal-api-version'], '2024-09-04');
    return Response.json({
      status: 'success',
      data: {
        slots: {
          [futureStart]: [{ start: `${futureStart}T10:00:00.000Z` }, { time: `${futureStart}T11:30:00.000Z` }],
        },
      },
    });
  };
  const calcomAvail = await worker.fetch(availReq(`?start=${futureStart}&end=${isoDateOffset(5)}`), calcomEnv);
  assert.equal(calcomAvail.status, 200);
  const calcomJson = await calcomAvail.json();
  assert.equal(calcomJson.mode, 'native');
  assert.equal(calcomJson.provider, 'calcom');
  assert.equal(calcomJson.slots.length, 2);
  assert.equal(calcomJson.slots[0].startTime, `${futureStart}T10:00:00.000Z`);
  count++;

  // Availability upstream error does not leak body
  globalThis.fetch = async () => new Response('secret calendly stacktrace', { status: 500 });
  const availFail = await worker.fetch(availReq(`?start=${futureStart}&end=${isoDateOffset(4)}`), calendlyEnv);
  assert.equal(availFail.status, 502);
  assert(!(await availFail.text()).includes('secret calendly'));
  count++;

  // --- Booking create checks ---
  const validBooking = {
    startTime: futureSlotIso,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    timezone: 'Asia/Kolkata',
    note: 'Would love to discuss product roles.',
  };

  await status(createReq(validBooking, { headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' } }), 403, calendlyEnv);
  await status(createReq(validBooking, { method: 'OPTIONS', body: undefined }), 204, calendlyEnv);
  await status(createReq(validBooking, { method: 'GET', body: undefined }), 405, calendlyEnv);
  await status(createReq(validBooking, { headers: { Origin: origin, 'Content-Type': 'text/plain' } }), 415, calendlyEnv);
  await status(createReq(validBooking), 429, { ...calendlyEnv, BOOKING_LIMITER: { limit: async () => ({ success: false }) } });

  // Validation errors
  await status(createReq({ ...validBooking, email: 'not-an-email' }), 400, calendlyEnv);
  await status(createReq({ ...validBooking, startTime: '2020-01-01T10:00:00Z' }), 400, calendlyEnv);
  await status(createReq({ ...validBooking, startTime: '2027-06-01 10:00' }), 400, calendlyEnv);
  await status(createReq({ ...validBooking, timezone: 'Mars/Olympus' }), 400, calendlyEnv);
  await status(createReq({ ...validBooking, name: '   ' }), 400, calendlyEnv);
  await status(createReq({ ...validBooking, note: 'x'.repeat(501) }), 400, calendlyEnv);

  // Unconfigured native provider returns 503
  await status(createReq(validBooking), 503, env);

  // Calendly POST /invitees 201 success
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.calendly.com/invitees');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, `Bearer ${calendlyEnv.CALENDLY_API_TOKEN}`);
    const payload = JSON.parse(options.body);
    assert.equal(payload.event_type, calendlyEnv.CALENDLY_EVENT_TYPE_URI);
    assert.equal(payload.start_time, futureSlotIso);
    assert.deepEqual(payload.invitee, {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      timezone: 'Asia/Kolkata',
    });
    return Response.json(
      {
        resource: {
          reschedule_url: 'https://calendly.com/reschedulings/abc123',
          cancel_url: 'https://calendly.com/cancellations/abc123',
        },
      },
      { status: 201 },
    );
  };
  const created = await worker.fetch(createReq(validBooking), calendlyEnv);
  assert.equal(created.status, 201);
  const createdJson = await created.json();
  assert.equal(createdJson.ok, true);
  assert.equal(createdJson.provider, 'calendly');
  assert.equal(createdJson.startTime, futureSlotIso);
  assert.equal(createdJson.rescheduleUrl, 'https://calendly.com/reschedulings/abc123');
  assert.equal(createdJson.cancelUrl, 'https://calendly.com/cancellations/abc123');
  count++;

  // Cal.com POST /v2/bookings 201 success
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.cal.com/v2/bookings');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, `Bearer ${calcomEnv.CALCOM_API_KEY}`);
    const payload = JSON.parse(options.body);
    assert.equal(payload.eventTypeId, 4242);
    assert.equal(payload.start, futureSlotIso);
    assert.equal(payload.attendee.email, 'ada@example.com');
    assert.equal(payload.attendee.timeZone, 'Asia/Kolkata');
    return Response.json(
      {
        status: 'success',
        data: {
          rescheduleUrl: 'https://cal.com/reschedule/xyz',
          cancelUrl: 'https://cal.com/cancel/xyz',
        },
      },
      { status: 201 },
    );
  };
  const calcomCreated = await worker.fetch(createReq(validBooking), calcomEnv);
  assert.equal(calcomCreated.status, 201);
  const calcomCreatedJson = await calcomCreated.json();
  assert.equal(calcomCreatedJson.ok, true);
  assert.equal(calcomCreatedJson.provider, 'calcom');
  assert.equal(calcomCreatedJson.rescheduleUrl, 'https://cal.com/reschedule/xyz');
  count++;

  // Slot conflict returns 409 without leaking upstream response
  globalThis.fetch = async () => new Response('internal conflict trace', { status: 409 });
  const conflict = await worker.fetch(createReq(validBooking), calendlyEnv);
  assert.equal(conflict.status, 409);
  assert(!(await conflict.text()).includes('internal conflict'));
  count++;

  // Upstream 500 failure returns 502 without leaking upstream response
  globalThis.fetch = async () => new Response('internal server token leak', { status: 500 });
  const upstreamErr = await worker.fetch(createReq(validBooking), calendlyEnv);
  assert.equal(upstreamErr.status, 502);
  assert(!(await upstreamErr.text()).includes('token leak'));
  count++;

  // Network exception returns 502
  globalThis.fetch = async () => {
    throw new Error('upstream down');
  };
  await status(createReq(validBooking), 502, calendlyEnv);
} finally {
  globalThis.fetch = originalFetch;
}

console.log(`${count} Worker checks passed; provider responses mocked, no live external calls.`);
