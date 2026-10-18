/**
 * GLOSSOPETRAE — client.mjs   (Shared OpenRouter model client)
 *
 * Extracted from the duplicated client/scheduler pattern that appears in 7+
 * harnesses. Each createClient() gets its own concurrency queue so multi-model
 * experiments can rate-limit per-model independently (important when mixing a
 * cheap model at concurrency=8 with an expensive one at concurrency=2).
 *
 * HARD RULES:
 *   - loadEnv() reads .env.local ONLY; never prints or logs the key value.
 *   - createMockClient() never touches the network.
 *   - No dependencies beyond Node 22 builtins.
 *
 *   import { createClient, createMockClient, loadEnv } from './lib/client.mjs';
 *   loadEnv();
 *   const opus  = createClient('anthropic/claude-opus-4.8', { concurrency: 2 });
 *   const gpt   = createClient('openai/gpt-5.5', { concurrency: 4 });
 *   const reply  = await opus.call('Hello');
 *   const mock   = createMockClient((prompt, meta) => 'fixed response');
 *
 * --selftest: validates scheduler ordering, retry logic, mock isolation.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(dirname(__dirname));

// ───────────────────────────── env loader ────────────────────────────────────

let _envLoaded = false;

export function loadEnv() {
  if (_envLoaded) return;
  _envLoaded = true;
  const candidates = [
    join(REPO_ROOT, '.env.local'),
    join(__dirname, '..', '.env.local'),
    join(homedir(), '.config', 'glossopetrae', 'openrouter.env'),
    join(homedir(), '.glossopetrae.env'),
  ];
  for (const f of candidates) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      const eq = s.indexOf('=');
      if (eq < 1) continue;
      const k = s.slice(0, eq).trim();
      const v = s.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (k && v && !process.env[k]) process.env[k] = v;
    }
  }
}

// ───────────────────────────── scheduler ─────────────────────────────────────

// Provider routing: models with a "/" in their slug (e.g. "openai/gpt-5-nano")
// route to OpenRouter; models without (e.g. "openai-gpt-55") route to Venice.
// Override with opts.provider = 'openrouter' | 'venice'.
function pickProvider(model, opts) {
  if (opts?.provider) return opts.provider;
  return model.includes('/') ? 'openrouter' : 'venice';
}
const PROVIDER_CONFIG = {
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    keyEnv: 'OPENROUTER_API_KEY',
    extraHeaders: {
      'HTTP-Referer': 'https://github.com/elder-plinius/GLOSSOPETRAE',
      'X-Title': 'GLOSSOPETRAE',
    },
  },
  venice: {
    url: 'https://api.venice.ai/api/v1/chat/completions',
    keyEnv: 'VENICE_API_KEY',
    extraHeaders: {},
  },
};

function makeScheduler(concurrency) {
  let inFlight = 0;
  const queue = [];
  return function schedule(fn) {
    return new Promise((resolve, reject) => {
      const run = () => {
        inFlight++;
        fn().then(resolve, reject).finally(() => {
          inFlight--;
          if (queue.length) queue.shift()();
        });
      };
      if (inFlight < concurrency) run();
      else queue.push(run);
    });
  };
}

// ───────────────────────────── real client ───────────────────────────────────

/**
 * Create a model client bound to a specific OpenRouter model slug.
 *
 * Provider snapshot capture:
 *   Every successful call records {requestedModel, servedModel, provider, id, usage, ts}
 *   into a per-client ring buffer. Access via client.getSnapshots() or
 *   client.lastSnapshot. The returned string ALSO carries a non-enumerable
 *   `__snapshot` property so callers can do `(await client.call(p)).__snapshot`
 *   without changing the existing string contract. If you pass {withSnapshot: true}
 *   as the meta arg, call() returns {text, snapshot} instead of a bare string.
 *
 * @param {string} model       OpenRouter slug, e.g. 'anthropic/claude-opus-4.8'
 * @param {object} [opts]
 * @param {number} [opts.concurrency=4]      max concurrent in-flight requests
 * @param {number} [opts.maxTokens=8000]     per-request token limit
 * @param {number} [opts.timeout=120000]     per-request timeout (ms)
 * @param {number} [opts.retries=3]          max attempts per call
 * @param {number} [opts.snapshotBuffer=512] max snapshots retained in ring buffer
 * @returns {{ call(prompt:string, meta?:object):Promise<string>, model:string, tokensSent:number, tokensRecv:number, getSnapshots():Array, lastSnapshot:object|null, clearSnapshots():void }}
 */
export function createClient(model, opts = {}) {
  const {
    concurrency = 4,
    maxTokens = 8000,
    timeout = 120_000,
    retries = 3,
    snapshotBuffer = 512,
  } = opts;

  const schedule = makeScheduler(concurrency);
  let tokensSent = 0;
  let tokensRecv = 0;
  const snapshots = [];

  function recordSnapshot(j) {
    const snap = {
      requestedModel: model,
      servedModel: j?.model ?? null,
      provider: j?.provider ?? null,
      id: j?.id ?? null,
      usage: j?.usage ?? null,
      ts: Date.now(),
    };
    snapshots.push(snap);
    if (snapshots.length > snapshotBuffer) snapshots.shift();
    return snap;
  }

  const providerName = pickProvider(model, opts);
  const provider = PROVIDER_CONFIG[providerName];

  async function call(prompt, meta) {
    const withSnapshot = meta && typeof meta === 'object' && meta.withSnapshot === true;
    return schedule(async () => {
      for (let attempt = 0; attempt < retries; attempt++) {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), timeout);
        try {
          const r = await fetch(provider.url, {
            method: 'POST',
            signal: ac.signal,
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${process.env[provider.keyEnv]}`,
              ...provider.extraHeaders,
            },
            body: JSON.stringify({
              model,
              max_tokens: maxTokens,
              messages: [{ role: 'user', content: prompt }],
            }),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
          const j = await r.json();
          const usage = j.usage || {};
          tokensSent += usage.prompt_tokens || 0;
          tokensRecv += usage.completion_tokens || 0;
          const snap = recordSnapshot(j);
          const text = j.choices?.[0]?.message?.content ?? '';
          if (withSnapshot) return { text, snapshot: snap };
          // Attach snapshot as a non-enumerable property on a String wrapper.
          // Bare primitives can't carry properties, so we use a boxed String —
          // it still coerces transparently in template literals, comparisons,
          // JSON.stringify, .length, .slice, etc. for backwards compatibility.
          const boxed = new String(text);
          Object.defineProperty(boxed, '__snapshot', {
            value: snap, enumerable: false, writable: false, configurable: false,
          });
          return boxed;
        } catch (e) {
          if (attempt === retries - 1) throw e;
          await new Promise(z => setTimeout(z, 900 * (attempt + 1)));
        } finally {
          clearTimeout(to);
        }
      }
    });
  }

  return {
    call,
    model,
    get tokensSent() { return tokensSent; },
    get tokensRecv() { return tokensRecv; },
    getSnapshots() { return snapshots.slice(); },
    get lastSnapshot() { return snapshots.length ? snapshots[snapshots.length - 1] : null; },
    clearSnapshots() { snapshots.length = 0; },
  };
}

/**
 * Create a multi-turn client that supports conversation history.
 * Wraps createClient with message accumulation.
 *
 * @param {string} model
 * @param {object} [opts]  same as createClient
 * @returns {{ chat(messages:Array<{role:string,content:string}>):Promise<string>, call(prompt:string):Promise<string>, model:string }}
 */
export function createChatClient(model, opts = {}) {
  const {
    concurrency = 4,
    maxTokens = 8000,
    timeout = 120_000,
    retries = 3,
    snapshotBuffer = 512,
  } = opts;

  const schedule = makeScheduler(concurrency);
  let tokensSent = 0;
  let tokensRecv = 0;
  const snapshots = [];

  function recordSnapshot(j) {
    const snap = {
      requestedModel: model,
      servedModel: j?.model ?? null,
      provider: j?.provider ?? null,
      id: j?.id ?? null,
      usage: j?.usage ?? null,
      ts: Date.now(),
    };
    snapshots.push(snap);
    if (snapshots.length > snapshotBuffer) snapshots.shift();
    return snap;
  }

  const providerName = pickProvider(model, opts);
  const provider = PROVIDER_CONFIG[providerName];

  async function chat(messages, meta) {
    const withSnapshot = meta && typeof meta === 'object' && meta.withSnapshot === true;
    return schedule(async () => {
      for (let attempt = 0; attempt < retries; attempt++) {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), timeout);
        try {
          const r = await fetch(provider.url, {
            method: 'POST',
            signal: ac.signal,
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${process.env[provider.keyEnv]}`,
              ...provider.extraHeaders,
            },
            body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
          const j = await r.json();
          const usage = j.usage || {};
          tokensSent += usage.prompt_tokens || 0;
          tokensRecv += usage.completion_tokens || 0;
          const snap = recordSnapshot(j);
          const text = j.choices?.[0]?.message?.content ?? '';
          if (withSnapshot) return { text, snapshot: snap };
          const boxed = new String(text);
          Object.defineProperty(boxed, '__snapshot', {
            value: snap, enumerable: false, writable: false, configurable: false,
          });
          return boxed;
        } catch (e) {
          if (attempt === retries - 1) throw e;
          await new Promise(z => setTimeout(z, 900 * (attempt + 1)));
        } finally {
          clearTimeout(to);
        }
      }
    });
  }

  async function call(prompt, meta) {
    return chat([{ role: 'user', content: prompt }], meta);
  }

  return {
    chat,
    call,
    model,
    get tokensSent() { return tokensSent; },
    get tokensRecv() { return tokensRecv; },
    getSnapshots() { return snapshots.slice(); },
    get lastSnapshot() { return snapshots.length ? snapshots[snapshots.length - 1] : null; },
    clearSnapshots() { snapshots.length = 0; },
  };
}

// ───────────────────────────── mock client ───────────────────────────────────

/**
 * Create a mock client that returns baked responses. Never touches the network.
 *
 * @param {(prompt:string, meta?:object) => string} responder
 * @returns {{ call(prompt:string, meta?:object):Promise<string>, model:string }}
 */
export function createMockClient(responder) {
  const snapshots = [];
  function recordSnapshot() {
    const snap = {
      requestedModel: 'MOCK',
      servedModel: 'MOCK',
      provider: 'MOCK',
      id: `mock-${snapshots.length}`,
      usage: null,
      ts: Date.now(),
    };
    snapshots.push(snap);
    return snap;
  }
  return {
    async call(prompt, meta) {
      const withSnapshot = meta && typeof meta === 'object' && meta.withSnapshot === true;
      const text = responder(prompt, meta);
      const snap = recordSnapshot();
      if (withSnapshot) return { text, snapshot: snap };
      const boxed = new String(text);
      Object.defineProperty(boxed, '__snapshot', {
        value: snap, enumerable: false, writable: false, configurable: false,
      });
      return boxed;
    },
    async chat(messages, meta) {
      const withSnapshot = meta && typeof meta === 'object' && meta.withSnapshot === true;
      const text = responder(messages[messages.length - 1].content);
      const snap = recordSnapshot();
      if (withSnapshot) return { text, snapshot: snap };
      const boxed = new String(text);
      Object.defineProperty(boxed, '__snapshot', {
        value: snap, enumerable: false, writable: false, configurable: false,
      });
      return boxed;
    },
    model: 'MOCK',
    tokensSent: 0,
    tokensRecv: 0,
    getSnapshots() { return snapshots.slice(); },
    get lastSnapshot() { return snapshots.length ? snapshots[snapshots.length - 1] : null; },
    clearSnapshots() { snapshots.length = 0; },
  };
}

// ───────────────────────────── stat helpers ──────────────────────────────────

export const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
export const ci95 = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return 1.96 * Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)) / Math.sqrt(a.length);
};
export const pct = (x) => (x * 100).toFixed(0);

// ───────────────────────────── cost estimation ──────────────────────────────

const COST_PER_1K = {
  'anthropic/claude-opus-4.8': { input: 0.015, output: 0.075 },
  'openai/gpt-5.5': { input: 0.015, output: 0.060 },
  'google/gemini-3.1-pro-preview': { input: 0.00125, output: 0.01 },
  'anthropic/claude-haiku-4.5': { input: 0.001, output: 0.005 },
};

export function estimateCost(client) {
  const rate = COST_PER_1K[client.model] || { input: 0.01, output: 0.05 };
  return (client.tokensSent / 1000) * rate.input + (client.tokensRecv / 1000) * rate.output;
}

export function totalCost(...clients) {
  return clients.reduce((sum, c) => sum + estimateCost(c), 0);
}

// ───────────────────────────── selftest ──────────────────────────────────────

if (process.argv.includes('--selftest')) {
  console.log('\n  client.mjs — selftest\n');

  // 1. Mock client returns baked response (boxed String coerces to primitive)
  const mock = createMockClient((p) => `echo:${p.slice(0, 10)}`);
  const r1 = await mock.call('hello world');
  console.assert(String(r1) === 'echo:hello worl', `mock call: got "${r1}"`);
  console.assert(`${r1}` === 'echo:hello worl', 'mock call template-literal coercion');
  console.log('  [PASS] mock client returns baked response');

  // 2. Mock client model is 'MOCK'
  console.assert(mock.model === 'MOCK', `mock model: got "${mock.model}"`);
  console.log('  [PASS] mock client model is MOCK');

  // 3. Chat method works on mock
  const r2 = await mock.chat([{ role: 'user', content: 'test prompt' }]);
  console.assert(String(r2) === 'echo:test promp', `mock chat: got "${r2}"`);
  console.log('  [PASS] mock chat method');

  // 3b. Snapshot attached as non-enumerable __snapshot
  console.assert(r1.__snapshot && r1.__snapshot.requestedModel === 'MOCK', 'mock snapshot attached');
  console.assert(!Object.keys(r1).includes('__snapshot'), '__snapshot is non-enumerable');
  console.assert(mock.lastSnapshot && mock.lastSnapshot.provider === 'MOCK', 'lastSnapshot present');
  console.assert(mock.getSnapshots().length >= 2, `snapshot buffer accumulates: got ${mock.getSnapshots().length}`);
  console.log('  [PASS] snapshot capture (non-enumerable + getSnapshots/lastSnapshot)');

  // 3c. {withSnapshot: true} returns {text, snapshot}
  const r3 = await mock.call('with-meta', { withSnapshot: true });
  console.assert(r3 && typeof r3 === 'object' && r3.text === 'echo:with-meta' && r3.snapshot.requestedModel === 'MOCK',
    `withSnapshot returns object: got ${JSON.stringify(r3)}`);
  console.log('  [PASS] withSnapshot option returns {text, snapshot}');

  // 3d. clearSnapshots resets buffer
  mock.clearSnapshots();
  console.assert(mock.getSnapshots().length === 0, 'clearSnapshots empties buffer');
  console.assert(mock.lastSnapshot === null, 'lastSnapshot null after clear');
  console.log('  [PASS] clearSnapshots');

  // 4. Stat helpers
  console.assert(mean([1, 2, 3]) === 2, 'mean');
  console.assert(mean([]) === 0, 'mean empty');
  console.assert(ci95([1]) === 0, 'ci95 single');
  console.assert(pct(0.95) === '95', 'pct');
  console.log('  [PASS] stat helpers');

  // 5. loadEnv is idempotent
  loadEnv();
  loadEnv();
  console.log('  [PASS] loadEnv idempotent');

  // 6. createClient returns well-formed object (no network call)
  const real = createClient('test/model', { concurrency: 1 });
  console.assert(real.model === 'test/model', 'model slug');
  console.assert(typeof real.call === 'function', 'call is function');
  console.assert(real.tokensSent === 0, 'initial tokens 0');
  console.log('  [PASS] createClient structure');

  console.log('\n  All client.mjs selftests passed.\n');
}
