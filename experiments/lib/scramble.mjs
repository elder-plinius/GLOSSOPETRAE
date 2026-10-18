/**
 * GLOSSOPETRAE — scramble.mjs   (SCRAMBLED-EXAMPLES negative control)
 *
 * WHY THIS EXISTS (the cleanest causal proof of in-context acquisition)
 *   The acquisition harnesses (acquisition.mjs / novel_sweep.mjs / grammar_sweep.mjs)
 *   teach a model via K worked (program-or-expression, output) examples, then test
 *   whether it can produce a new correct program / predict the novel rule. A RISING
 *   K-curve is read as in-context ACQUISITION. But a rising curve alone does not
 *   prove the EXAMPLES did the work — the model might be leaning on priors / leakage
 *   and the examples might be inert.
 *
 *   The SCRAMBLED-EXAMPLES control settles it. We DERANGE the example OUTPUTS so the
 *   (program, output) pairs become mutually INCONSISTENT — there is no single
 *   language that explains all of them at once. We then re-run the SAME K-curve on
 *   the scrambled examples and read the result:
 *     • acquisition STILL RISES on scrambled examples → the model is using
 *       priors/leakage, NOT the examples (acquisition is NOT genuine);
 *     • acquisition COLLAPSES to the K=0 floor → the examples are causally doing the
 *       work (GENUINE in-context acquisition).
 *
 * THE DERANGEMENT (deterministic, reproducible, NO randomness — VALUE-level)
 *   scrambleOutputs(examples) returns a NEW array in which every example keeps its
 *   program / expression UNCHANGED but its OUTPUT is replaced by a DIFFERENT example's
 *   output whose VALUE differs from this example's own true output. This is a true
 *   VALUE-LEVEL derangement, not merely a positional one: even when several examples
 *   share the same output value (common on the integer-output harnesses
 *   novel_sweep.mjs / grammar_sweep.mjs, ~3-5% of adjacent pairs), no example is ever
 *   shown its own true value back.
 *
 *   CONSTRUCTION (collision-aware, fully deterministic):
 *     1. Detect the output field (outputKeyOf) and read each example's true output.
 *     2. Sort the indices by (String(output), index). Equal output VALUES are now
 *        contiguous RUNS; let maxRun be the length of the longest such run.
 *     3. At sorted-position p, place the output value from sorted-position
 *        (p + maxRun) mod n. Because every value-run has length <= maxRun, offsetting
 *        by maxRun moves each element OUTSIDE its own run → its assigned value differs
 *        from its true value. This is a guaranteed VALUE-LEVEL derangement whenever
 *        maxRun*2 <= n (no value occupies a majority of the pool).
 *     4. FALLBACK: if maxRun*2 > n (a single value is a strict majority, so a
 *        value-level derangement may be impossible) we fall back to the old cyclic
 *        rotation out[i] <- out[(i+1) mod n] and DO NOT throw; the boolean
 *        `valueLevelImpossible` is exposed via scrambleOutputsDetailed() so callers can
 *        see when the clean guarantee could not be met.
 *   The mapping is also a POSITIONAL derangement (assign[i] != i for every i): step 3
 *   uses a nonzero offset (maxRun in [1, n-maxRun]) over distinct sorted positions, and
 *   the fallback rotation is positionally fixed-point-free for n>=2. No randomness;
 *   identical across calls. Throws for n<2 (a single example cannot be deranged).
 *
 *   The OUTPUT field name differs by harness, so we auto-detect it from a priority
 *   list and replace ONLY that field (program/expression fields are untouched):
 *     • acquisition.mjs examples carry `output`        (the run output string)
 *     • novel_sweep.mjs / grammar_sweep.mjs carry `novelAnswer` (the oracle value)
 *   A caller may pass an explicit key to override the auto-detect.
 *
 * isDerangement(orig, scrambled) — the soundness probe. Returns true iff the
 * scrambled array is a true derangement of the original on the (auto-detected)
 * output field: same length, programs/expressions preserved, and NO position holds
 * its original output value. Used by the harness invariant checks.
 *
 * SELFTEST
 *   node experiments/lib/scramble.mjs --selftest
 *   Asserts the value-level derangement produces ZERO value-level fixed points (incl.
 *   on a pool with duplicate / adjacent-equal integer outputs — the case the old
 *   1-rotation failed) and is identical across repeated calls (determinism). Exits
 *   non-zero on any failure.
 *
 * Dependency-free ESM, Node 22. No I/O, no model calls, no .env access.
 */

// Output-field priority: the first key present on the first example wins. Matches
// the three harnesses' example shapes (acquisition → `output`; novel/grammar →
// `novelAnswer`). Override via the explicit `key` argument when needed.
const OUTPUT_KEYS = ['output', 'novelAnswer'];

// Detect which output field an example array uses. Throws if none is present.
export function outputKeyOf(examples, key) {
  if (key != null) return key;
  if (!Array.isArray(examples) || examples.length === 0) {
    throw new Error('scrambleOutputs: examples must be a non-empty array');
  }
  const first = examples[0];
  for (const k of OUTPUT_KEYS) if (first && Object.prototype.hasOwnProperty.call(first, k)) return k;
  throw new Error(`scrambleOutputs: no known output field on example (looked for ${OUTPUT_KEYS.join(', ')}); pass an explicit key`);
}

/**
 * scrambleOutputsDetailed(examples, key?) → { scrambled, key, maxRun,
 * valueLevelImpossible }. Computes the deterministic VALUE-LEVEL derangement described
 * in the module header: every example keeps its program / expression field, and its
 * OUTPUT is replaced by a DIFFERENT example's output whose VALUE differs from this
 * example's true output. No randomness; identical across calls. Throws for n<2.
 *
 *   `valueLevelImpossible` is true ONLY in the strict-majority-value fallback case
 *   (maxRun*2 > n), where the result is the old positional rotation (still a POSITIONAL
 *   derangement) but a clean value-level derangement could not be guaranteed.
 */
export function scrambleOutputsDetailed(examples, key) {
  if (!Array.isArray(examples)) throw new Error('scrambleOutputs: examples must be an array');
  const n = examples.length;
  if (n < 2) throw new Error(`scrambleOutputs: need >=2 examples to derange (got ${n})`);
  const k = outputKeyOf(examples, key);

  // Sort indices by (String(output), index): equal output VALUES become contiguous
  // runs, ties broken by original index for full determinism.
  const order = examples.map((_, i) => i).sort((a, b) => {
    const sa = String(examples[a][k]), sb = String(examples[b][k]);
    if (sa < sb) return -1; if (sa > sb) return 1;
    return a - b;
  });

  // maxRun = length of the longest run of equal output values in that sorted order.
  let maxRun = 1, run = 1;
  for (let p = 1; p < n; p++) {
    if (String(examples[order[p]][k]) === String(examples[order[p - 1]][k])) { run++; if (run > maxRun) maxRun = run; }
    else run = 1;
  }

  // assign[i] = source index whose output goes to position i (program of i kept).
  const assign = new Array(n);
  const valueLevelImpossible = maxRun * 2 > n;
  if (valueLevelImpossible) {
    // strict-majority value: a value-level derangement may be impossible → fall back
    // to the positional rotation out[i] <- out[(i+1) mod n] (no fixed POSITION).
    for (let i = 0; i < n; i++) assign[i] = (i + 1) % n;
  } else {
    // place at sorted-position p the value from sorted-position (p + maxRun) mod n.
    // Offsetting by maxRun moves every element OUTSIDE its own (<= maxRun-long) value
    // run → guaranteed value-level derangement, and a positional derangement too.
    for (let p = 0; p < n; p++) {
      const dest = order[p];                          // real index receiving a value
      const srcOrderPos = (p + maxRun) % n;
      assign[dest] = order[srcOrderPos];              // real index supplying the value
    }
  }

  const scrambled = examples.map((ex, i) => ({ ...ex, [k]: examples[assign[i]][k] }));
  return { scrambled, key: k, maxRun, valueLevelImpossible };
}

/**
 * scrambleOutputs(examples, key?) → NEW array, each example shallow-copied with its
 * OUTPUT field replaced by a DIFFERENT example's output whose VALUE differs from this
 * example's true output (a deterministic VALUE-LEVEL derangement; see
 * scrambleOutputsDetailed). Program / expression fields are preserved. Deterministic;
 * no randomness. Throws for n<2.
 */
export function scrambleOutputs(examples, key) {
  return scrambleOutputsDetailed(examples, key).scrambled;
}

/**
 * isDerangement(orig, scrambled, key?) → boolean. True iff `scrambled` is a sound
 * derangement of `orig` on the output field: same length (>=2), every program /
 * expression field preserved, and NO position retains its original output value.
 */
export function isDerangement(orig, scrambled, key) {
  if (!Array.isArray(orig) || !Array.isArray(scrambled)) return false;
  if (orig.length !== scrambled.length || orig.length < 2) return false;
  const k = outputKeyOf(orig, key);
  for (let i = 0; i < orig.length; i++) {
    // every NON-output field must be identical (program / expression preserved)
    for (const f of Object.keys(orig[i])) {
      if (f === k) continue;
      if (scrambled[i][f] !== orig[i][f]) return false;
    }
    // the output at every position must have MOVED (no fixed point)
    if (scrambled[i][k] === orig[i][k]) return false;
  }
  return true;
}

// ───────────────────────────── selftest ──────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.slice(2).includes('--selftest')) {
    const assert = (cond, msg) => { if (!cond) { console.error(`FAIL ✗  ${msg}`); process.exit(1); } console.log(`PASS ✓  ${msg}`); };

    // helper: count value-level fixed points (an example shown its OWN true output).
    const vfix = (orig, scr, k) => { let c = 0; for (let i = 0; i < orig.length; i++) if (scr[i][k] === orig[i][k]) c++; return c; };

    // A representative `output`-keyed pool (acquisition shape) with DISTINCT outputs.
    const poolOut = [
      { desc: 'a', src: 'P1', output: '1' },
      { desc: 'b', src: 'P2', output: '2' },
      { desc: 'c', src: 'P3', output: '3' },
      { desc: 'd', src: 'P4', output: '4' },
    ];
    const s1 = scrambleOutputs(poolOut);
    assert(s1.length === poolOut.length, 'derangement preserves length');
    assert(s1.every((e, i) => e.src === poolOut[i].src && e.desc === poolOut[i].desc), 'derangement preserves program/expression fields');
    // ZERO value-level fixed points: no example keeps its own true output.
    assert(vfix(poolOut, s1, 'output') === 0, `distinct-output pool produces ZERO value-level fixed points (got ${vfix(poolOut, s1, 'output')})`);
    assert(isDerangement(poolOut, s1), 'isDerangement true on the distinct-output pool');

    // DETERMINISM: identical across repeated calls (no randomness).
    const s2 = scrambleOutputs(poolOut);
    assert(JSON.stringify(s1) === JSON.stringify(s2), 'identical across calls (deterministic, no randomness)');

    // `novelAnswer`-keyed pool (novel/grammar shape), numeric outputs.
    const poolNov = [
      { expr: 'E1', novelAnswer: 11, standardAnswer: 99 },
      { expr: 'E2', novelAnswer: 22, standardAnswer: 99 },
      { expr: 'E3', novelAnswer: 33, standardAnswer: 99 },
    ];
    const sN = scrambleOutputs(poolNov);
    assert(outputKeyOf(poolNov) === 'novelAnswer', 'auto-detects novelAnswer output field');
    assert(sN.every((e, i) => e.expr === poolNov[i].expr), 'derangement preserves expr field (novel shape)');
    assert(vfix(poolNov, sN, 'novelAnswer') === 0, `novel-shape pool produces ZERO value-level fixed points (got ${vfix(poolNov, sN, 'novelAnswer')})`);
    assert(isDerangement(poolNov, sN), 'isDerangement true for novel-shape derangement');

    // ── THE REGRESSION CASE the old 1-rotation failed ──────────────────────────────
    // A pool with DUPLICATE / ADJACENT-EQUAL integer outputs (mirrors the ~3-5% of
    // adjacent collisions on novel_sweep.mjs / grammar_sweep.mjs). The OLD cyclic
    // rotation left every adjacent-equal pair at its TRUE value (a value-level fixed
    // point); the new value-level derangement must produce ZERO.
    const poolDup = [
      { expr: 'D1', novelAnswer: 12 },
      { expr: 'D2', novelAnswer: 12 },   // adjacent-equal: old rotation kept this put
      { expr: 'D3', novelAnswer: 5 },
      { expr: 'D4', novelAnswer: 12 },   // value 12 appears 3× (longest run)
      { expr: 'D5', novelAnswer: 7 },
      { expr: 'D6', novelAnswer: 7 },    // another adjacent-equal pair
      { expr: 'D7', novelAnswer: 3 },
    ];
    const sD = scrambleOutputsDetailed(poolDup);
    assert(sD.scrambled.every((e, i) => e.expr === poolDup[i].expr), 'collision pool preserves expr field');
    assert(sD.valueLevelImpossible === false, 'collision pool: value-level derangement IS possible (maxRun*2 <= n)');
    assert(vfix(poolDup, sD.scrambled, 'novelAnswer') === 0, `collision pool produces ZERO value-level fixed points (got ${vfix(poolDup, sD.scrambled, 'novelAnswer')}) — the case the old 1-rotation FAILED`);
    assert(isDerangement(poolDup, sD.scrambled), 'isDerangement TRUE on a duplicate/adjacent-equal integer pool (old rotation was false here)');
    // determinism on the collision pool too.
    const sD2 = scrambleOutputs(poolDup);
    assert(JSON.stringify(sD.scrambled) === JSON.stringify(sD2), 'collision-pool derangement is identical across calls (deterministic)');

    // ── strict-majority fallback: value-level derangement may be impossible ─────────
    // A value that occupies > half the pool (maxRun*2 > n) cannot be fully
    // value-deranged; we fall back to the positional rotation and FLAG it (no throw).
    const poolMaj = [
      { expr: 'M1', novelAnswer: 9 },
      { expr: 'M2', novelAnswer: 9 },
      { expr: 'M3', novelAnswer: 9 },   // 9 appears 3× of 4 → strict majority
      { expr: 'M4', novelAnswer: 1 },
    ];
    const sM = scrambleOutputsDetailed(poolMaj);
    assert(sM.valueLevelImpossible === true, 'strict-majority pool flags valueLevelImpossible (does NOT throw)');
    assert(sM.scrambled.every((e, i) => e.expr === poolMaj[i].expr), 'strict-majority fallback preserves expr field');
    // still a POSITIONAL derangement: no position keeps its own SOURCE row (rotation).
    assert(sM.scrambled.every((e, i) => e.novelAnswer === poolMaj[(i + 1) % poolMaj.length].novelAnswer), 'strict-majority fallback is the positional rotation (positional derangement preserved)');

    // n<2 throws.
    let threw = false; try { scrambleOutputs([{ output: 'x' }]); } catch { threw = true; }
    assert(threw, 'throws for n<2 (cannot derange a single example)');

    // explicit key override.
    const sK = scrambleOutputs(poolNov, 'novelAnswer');
    assert(isDerangement(poolNov, sK, 'novelAnswer'), 'explicit key override works');

    console.log('\nALL SCRAMBLE SELFTESTS PASS ✓');
    process.exit(0);
  } else {
    console.log('scramble.mjs — run with --selftest to validate. Exports: scrambleOutputs, scrambleOutputsDetailed, isDerangement, outputKeyOf.');
  }
}
