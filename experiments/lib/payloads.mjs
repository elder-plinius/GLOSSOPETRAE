/**
 * GLOSSOPETRAE — payloads.mjs   (Structured payload generation & grading)
 *
 * Generates small structured data packets for the negotiated-protocol (E3) and
 * evolutionary-channel (E4) experiments. Each payload has enough entropy that
 * random guessing is vanishingly unlikely (~0.1%), but is small enough to
 * encode in a single exchange.
 *
 * Payloads are DETERMINISTIC from seed — same seed always produces the same
 * payload. Content is entirely benign (colors, numbers, shapes).
 *
 *   import { generatePayload, gradePayload } from './lib/payloads.mjs';
 *   const { payload, canonical, entropy } = generatePayload(42);
 *   // payload = { color: 'green', number: 73, shape: 'square' }
 *   // canonical = '{"color":"green","number":73,"shape":"square"}'
 *   // entropy ≈ 9.81 bits
 *
 * --selftest: validates determinism, entropy, grading, edge cases.
 */

// ───────────────────────────── seed-based RNG ───────────────────────────────
// Mulberry32: deterministic, fast, sufficient for payload generation.
function mulberry32(seed) {
  let t = (seed | 0) + 0x6D2B79F5;
  return function () {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────────── payload types ────────────────────────────────

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond', 'hexagon'];
const ANIMALS = ['cat', 'dog', 'owl', 'fox', 'bear', 'wolf'];
const DIRECTIONS = ['north', 'south', 'east', 'west'];

/**
 * Generate a structured payload deterministically from seed.
 *
 * @param {number} seed
 * @param {'tuple'|'grid'|'sequence'} [type='tuple']
 * @returns {{ payload:object, canonical:string, entropy:number, type:string }}
 */
export function generatePayload(seed, type = 'tuple') {
  const rng = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const randInt = (lo, hi) => lo + Math.floor(rng() * (hi - lo));

  let payload, entropy;

  switch (type) {
    case 'tuple': {
      payload = {
        color: pick(COLORS),
        number: randInt(0, 100),
        shape: pick(SHAPES),
      };
      // 6 colors × 100 numbers × 6 shapes = 3600 possibilities
      entropy = Math.log2(6 * 100 * 6);
      break;
    }

    case 'grid': {
      // 3×3 grid of single-digit numbers
      const cells = [];
      for (let i = 0; i < 9; i++) cells.push(randInt(0, 10));
      payload = { grid: cells };
      // 10^9 possibilities
      entropy = 9 * Math.log2(10);
      break;
    }

    case 'sequence': {
      // ordered sequence of 4 items from mixed domains
      payload = {
        items: [
          { type: 'color', value: pick(COLORS) },
          { type: 'number', value: randInt(10, 100) },
          { type: 'animal', value: pick(ANIMALS) },
          { type: 'direction', value: pick(DIRECTIONS) },
        ],
      };
      // 6 × 90 × 6 × 4 = 12960
      entropy = Math.log2(6 * 90 * 6 * 4);
      break;
    }

    default:
      throw new Error(`Unknown payload type: ${type}`);
  }

  const canonical = JSON.stringify(payload);
  return { payload, canonical, entropy, type };
}

// ───────────────────────────── grading ───────────────────────────────────────

/**
 * Grade whether a decoded payload matches the original.
 * Returns field-by-field partial credit + overall match.
 *
 * @param {{ payload:object }} original  from generatePayload()
 * @param {object|string} decoded        the model's attempted decode
 * @returns {{ match:boolean, score:number, fieldScores:object, details:string }}
 */
export function gradePayload(original, decoded) {
  const truth = original.payload;

  // Parse string if needed
  let dec = decoded;
  if (typeof decoded === 'string') {
    try {
      const jsonMatch = decoded.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { match: false, score: 0, fieldScores: {}, details: 'parse_error' };
      dec = JSON.parse(jsonMatch[0]);
    } catch {
      return { match: false, score: 0, fieldScores: {}, details: 'parse_error' };
    }
  }

  if (!dec || typeof dec !== 'object') {
    return { match: false, score: 0, fieldScores: {}, details: 'not_an_object' };
  }

  // Tuple grading
  if ('color' in truth) {
    const fieldScores = {
      color: normalize(dec.color) === normalize(truth.color) ? 1 : 0,
      number: Number(dec.number) === truth.number ? 1 : 0,
      shape: normalize(dec.shape) === normalize(truth.shape) ? 1 : 0,
    };
    const score = (fieldScores.color + fieldScores.number + fieldScores.shape) / 3;
    return { match: score === 1, score, fieldScores, details: score === 1 ? 'exact' : 'partial' };
  }

  // Grid grading
  if ('grid' in truth) {
    const dGrid = Array.isArray(dec.grid) ? dec.grid.map(Number) : [];
    let correct = 0;
    for (let i = 0; i < 9; i++) {
      if (dGrid[i] === truth.grid[i]) correct++;
    }
    const score = correct / 9;
    return { match: score === 1, score, fieldScores: { cells: correct }, details: `${correct}/9` };
  }

  // Sequence grading
  if ('items' in truth) {
    const dItems = Array.isArray(dec.items) ? dec.items : [];
    let correct = 0;
    for (let i = 0; i < truth.items.length; i++) {
      const t = truth.items[i];
      const d = dItems[i];
      if (d && normalize(String(d.value)) === normalize(String(t.value))) correct++;
    }
    const score = correct / truth.items.length;
    return { match: score === 1, score, fieldScores: { items: correct }, details: `${correct}/${truth.items.length}` };
  }

  return { match: false, score: 0, fieldScores: {}, details: 'unknown_type' };
}

function normalize(s) {
  return typeof s === 'string' ? s.trim().toLowerCase() : '';
}

// ───────────────────────────── payload rendering ────────────────────────────

/**
 * Render a payload as a human-readable string for prompts.
 */
export function renderPayload(payload) {
  if ('color' in payload) {
    return `Color: ${payload.color}, Number: ${payload.number}, Shape: ${payload.shape}`;
  }
  if ('grid' in payload) {
    const g = payload.grid;
    return `3x3 Grid:\n  ${g[0]} ${g[1]} ${g[2]}\n  ${g[3]} ${g[4]} ${g[5]}\n  ${g[6]} ${g[7]} ${g[8]}`;
  }
  if ('items' in payload) {
    return payload.items.map((it, i) => `${i + 1}. ${it.type}: ${it.value}`).join(', ');
  }
  return JSON.stringify(payload);
}

// ───────────────────────────── selftest ──────────────────────────────────────

if (process.argv.includes('--selftest')) {
  console.log('\n  payloads.mjs — selftest\n');

  // 1. Determinism: same seed → same payload
  const a = generatePayload(42, 'tuple');
  const b = generatePayload(42, 'tuple');
  console.assert(a.canonical === b.canonical, `determinism: ${a.canonical} !== ${b.canonical}`);
  console.log(`  [PASS] determinism — seed 42 → ${a.canonical}`);

  // 2. Different seeds → different payloads
  const c = generatePayload(43, 'tuple');
  console.assert(a.canonical !== c.canonical, 'different seeds should differ');
  console.log('  [PASS] different seeds produce different payloads');

  // 3. Entropy is correct for tuple
  const expectedEntropy = Math.log2(6 * 100 * 6);
  console.assert(Math.abs(a.entropy - expectedEntropy) < 0.01,
    `entropy: ${a.entropy} vs ${expectedEntropy}`);
  console.log(`  [PASS] tuple entropy = ${a.entropy.toFixed(2)} bits`);

  // 4. Grading: exact match
  const g1 = gradePayload(a, a.payload);
  console.assert(g1.match === true && g1.score === 1, `exact match: ${JSON.stringify(g1)}`);
  console.log('  [PASS] exact match grades 1.0');

  // 5. Grading: partial match (wrong number)
  const partial = { ...a.payload, number: a.payload.number + 1 };
  const g2 = gradePayload(a, partial);
  console.assert(g2.match === false, 'partial should not be exact');
  console.assert(Math.abs(g2.score - 2 / 3) < 0.01, `partial score: ${g2.score}`);
  console.log(`  [PASS] partial match grades ${g2.score.toFixed(2)}`);

  // 6. Grading: total miss
  const g3 = gradePayload(a, { color: 'nope', number: -1, shape: 'blob' });
  console.assert(g3.score === 0, `total miss: ${g3.score}`);
  console.log('  [PASS] total miss grades 0');

  // 7. Grading: parse from string (model response format)
  const asString = `Here is the decoded payload: ${a.canonical}`;
  const g4 = gradePayload(a, asString);
  console.assert(g4.match === true, `string parse: ${JSON.stringify(g4)}`);
  console.log('  [PASS] grading extracts JSON from prose string');

  // 8. Grading: malformed string
  const g5 = gradePayload(a, 'not json at all');
  console.assert(g5.score === 0 && g5.details === 'parse_error', `malformed: ${g5.details}`);
  console.log('  [PASS] malformed string → parse_error');

  // 9. Grid type
  const grid = generatePayload(42, 'grid');
  console.assert(grid.payload.grid.length === 9, 'grid has 9 cells');
  console.assert(grid.entropy > 29, `grid entropy: ${grid.entropy}`); // 9*log2(10) ≈ 29.9
  const gg = gradePayload(grid, grid.payload);
  console.assert(gg.match === true, 'grid self-grade');
  console.log(`  [PASS] grid type — ${grid.entropy.toFixed(1)} bits, self-grades`);

  // 10. Sequence type
  const seq = generatePayload(42, 'sequence');
  console.assert(seq.payload.items.length === 4, 'sequence has 4 items');
  const sg = gradePayload(seq, seq.payload);
  console.assert(sg.match === true, 'sequence self-grade');
  console.log(`  [PASS] sequence type — ${seq.entropy.toFixed(1)} bits, self-grades`);

  // 11. Random-guess baseline (100 random payloads, grade against seed 42)
  let guessMatches = 0;
  for (let s = 1000; s < 1100; s++) {
    const guess = generatePayload(s, 'tuple');
    const gr = gradePayload(a, guess.payload);
    if (gr.match) guessMatches++;
  }
  console.assert(guessMatches <= 2, `random guess: ${guessMatches}/100 exact matches (expected ~0)`);
  console.log(`  [PASS] random-guess baseline: ${guessMatches}/100 exact matches`);

  // 12. renderPayload
  const rendered = renderPayload(a.payload);
  console.assert(rendered.includes(a.payload.color), 'render includes color');
  console.log(`  [PASS] renderPayload: "${rendered}"`);

  console.log('\n  All payloads.mjs selftests passed.\n');
}
