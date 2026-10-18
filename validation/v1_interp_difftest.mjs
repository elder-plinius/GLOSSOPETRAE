/**
 * v1_interp_difftest.mjs
 * DIFFERENTIAL + PROPERTY testing of the CodeForge interpreter (the code-axis oracle).
 *
 * Strategy: build a random expression AST, then (a) RENDER it into a generated
 * language's surface syntax and run it through cf.run(K.print + expr + ";"), and
 * (b) evaluate the SAME AST with a hand-written JS reference that mirrors the
 * interpreter's documented semantics EXACTLY. Compare the printed string.
 *
 * The reference is derived from reading src/modules/CodeForge.js:
 *   truthy(v)  = v !== false && v !== null && v !== 0 && v !== ''
 *   toNum(v)   = boolean? (v?1:0) : Number(v) ; NaN -> error "Not a number"
 *   and        = truthy(L) ? R : false
 *   or         = truthy(L) ? L : R
 *   not        = !truthy(v)            (a boolean)
 *   unary -    = -toNum(v)
 *   + : string concat if either side is string, else toNum+toNum
 *   - * / % : toNum op toNum   (/ float, % JS remainder)
 *   < > <= >= : toNum cmp toNum
 *   == != : strict === / !== on raw values
 *   print formats: null->K.null, true->K.true, false->K.false, else String(v)
 */

import { CodeForge } from '../src/modules/CodeForge.js';

// ---------------------------------------------------------------------------
// Small deterministic PRNG for the HARNESS (independent of engine RNG).
// ---------------------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let RNG = mulberry32(0xC0DEF0BE);
const rnd = () => RNG();
const ri = (lo, hi) => Math.floor(rnd() * (hi - lo + 1)) + lo;
const pick = (a) => a[Math.floor(rnd() * a.length)];

// ---------------------------------------------------------------------------
// Reference semantics — must mirror CodeForge.run exactly.
// ---------------------------------------------------------------------------
class RefError extends Error {}
const refTruthy = (v) => v !== false && v !== null && v !== 0 && v !== '';
const refToNum = (v) => {
  const n = typeof v === 'boolean' ? (v ? 1 : 0) : Number(v);
  if (Number.isNaN(n)) throw new RefError(`Not a number: ${v}`);
  return n;
};
// format depends on the per-language keywords for null/true/false
function makeFormat(K) {
  return (v) => (v === null ? K.null : v === true ? K.true : v === false ? K.false : String(v));
}

// Evaluate the reference AST. `fmt` only needed at top print level.
function refEval(node) {
  switch (node.k) {
    case 'num': return node.v;
    case 'bool': return node.v;
    case 'null': return null;
    case 'str': return node.v;
    case 'not': return !refTruthy(refEval(node.x));
    case 'neg': return -refToNum(refEval(node.x));
    case 'and': { const L = refEval(node.l); return refTruthy(L) ? refEval(node.r) : false; }
    case 'or': { const L = refEval(node.l); return refTruthy(L) ? L : refEval(node.r); }
    case 'bin': {
      const op = node.op;
      const a = refEval(node.l), b = refEval(node.r);
      switch (op) {
        case '+': return (typeof a === 'string' || typeof b === 'string')
          ? refFmtTop(a) + refFmtTop(b) : refToNum(a) + refToNum(b);
        case '-': return refToNum(a) - refToNum(b);
        case '*': return refToNum(a) * refToNum(b);
        case '/': return refToNum(a) / refToNum(b);
        case '%': return refToNum(a) % refToNum(b);
        case '<': return refToNum(a) < refToNum(b);
        case '>': return refToNum(a) > refToNum(b);
        case '<=': return refToNum(a) <= refToNum(b);
        case '>=': return refToNum(a) >= refToNum(b);
        case '==': return a === b;
        case '!=': return a !== b;
      }
    }
  }
  throw new RefError('bad node ' + node.k);
}
// `+` uses interpreter's `format` for string concat of non-strings.
// At inner concat the interpreter calls format(a)+format(b) using the SAME
// keyword-based format. We need the active K — set via module-level holder.
let _activeFmt = String;
const refFmtTop = (v) => _activeFmt(v);

// ---------------------------------------------------------------------------
// Random typed-expression generator.
//   Produces { node, src } where node is the reference AST and src is the
//   conlang-surface string. We track a coarse type to keep generation mostly
//   well-typed (so we exercise real arithmetic), but also inject some boolean
//   operands into arithmetic to test the boolean->number coercion path, since
//   the interpreter explicitly supports that.
// ---------------------------------------------------------------------------
function genExpr(K, depth, allowBoolMix) {
  // returns { node, src }
  if (depth <= 0 || rnd() < 0.32) {
    const r = rnd();
    if (r < 0.7) { const v = ri(0, 9); return { node: { k: 'num', v }, src: String(v) }; }
    if (r < 0.82) { return { node: { k: 'bool', v: true }, src: K.true }; }
    if (r < 0.92) { return { node: { k: 'bool', v: false }, src: K.false }; }
    const v = ri(1, 9); // avoid leading -0 weirdness; keep small
    return { node: { k: 'num', v }, src: String(v) };
  }
  const choice = rnd();
  // arithmetic
  if (choice < 0.4) {
    const op = pick(['+', '-', '*', '/', '%']);
    const l = genExpr(K, depth - 1, allowBoolMix);
    let r = genExpr(K, depth - 1, allowBoolMix);
    // avoid trivial div/mod by zero in the *typed* corpus? No — we WANT to
    // test it occasionally, but div-by-zero yields Infinity which both sides
    // produce identically. Mod by zero -> NaN -> error on BOTH sides. Keep.
    return {
      node: { k: 'bin', op, l: l.node, r: r.node },
      src: `(${l.src} ${op} ${r.src})`,
    };
  }
  // comparison
  if (choice < 0.6) {
    const op = pick(['<', '>', '<=', '>=']);
    const l = genExpr(K, depth - 1, allowBoolMix);
    const r = genExpr(K, depth - 1, allowBoolMix);
    return { node: { k: 'bin', op, l: l.node, r: r.node }, src: `(${l.src} ${op} ${r.src})` };
  }
  // equality (strict)
  if (choice < 0.72) {
    const op = pick(['==', '!=']);
    const l = genExpr(K, depth - 1, allowBoolMix);
    const r = genExpr(K, depth - 1, allowBoolMix);
    return { node: { k: 'bin', op, l: l.node, r: r.node }, src: `(${l.src} ${op} ${r.src})` };
  }
  // and / or
  if (choice < 0.86) {
    const isAnd = rnd() < 0.5;
    const l = genExpr(K, depth - 1, allowBoolMix);
    const r = genExpr(K, depth - 1, allowBoolMix);
    const kw = isAnd ? K.and : K.or;
    return {
      node: { k: isAnd ? 'and' : 'or', l: l.node, r: r.node },
      src: `(${l.src} ${kw} ${r.src})`,
    };
  }
  // not
  if (choice < 0.93) {
    const x = genExpr(K, depth - 1, allowBoolMix);
    return { node: { k: 'not', x: x.node }, src: `(${K.not} ${x.src})` };
  }
  // unary neg
  const x = genExpr(K, depth - 1, allowBoolMix);
  return { node: { k: 'neg', x: x.node }, src: `(-${x.src})` };
}

// ---------------------------------------------------------------------------
// Differential test
// ---------------------------------------------------------------------------
function runDifferential(seeds, N) {
  let total = 0, match = 0, refErr = 0, interpErr = 0, bothErr = 0;
  const diverge = [];
  for (const seed of seeds) {
    const cf = new CodeForge(seed);
    const K = cf.keywords;
    _activeFmt = makeFormat(K);
    const t = cf.terminator;
    for (let n = 0; n < N; n++) {
      const depth = ri(1, 6);
      const { node, src } = genExpr(K, depth, true);

      // reference
      let refVal, refThrew = false;
      try { refVal = refEval(node); }
      catch (e) { refThrew = true; }

      // interpreter
      const program = `${K.print} ${src}${t}`;
      const res = cf.run(program, { maxSteps: 500000 });

      total++;
      if (refThrew) {
        // interpreter should also fail (clean error, ok:false)
        if (!res.ok) { match++; bothErr++; refErr++; }
        else {
          // ref errored but interp succeeded — divergence
          if (diverge.length < 40) diverge.push({ seed, src, expected: 'ERROR', got: res.output, program });
          interpErr++;
        }
        continue;
      }
      // ref produced a value -> expected printed string
      const expected = _activeFmt(refVal);
      if (!res.ok) {
        refErr++;
        if (diverge.length < 40) diverge.push({ seed, src, expected, got: `ERROR:${res.error}`, program });
        continue;
      }
      if (res.output === expected) match++;
      else {
        if (diverge.length < 40) diverge.push({ seed, src, expected, got: res.output, program });
      }
    }
  }
  return { total, match, diverge, refErr, interpErr, bothErr };
}

// ---------------------------------------------------------------------------
// Control-flow property tests (seed-invariant semantics)
// ---------------------------------------------------------------------------
function syntax(cf) {
  return {
    K: cf.keywords, t: cf.terminator, a: cf.assignOp,
    bo: cf.blockStyle === 'word' ? cf.blockOpen : '{',
    bc: cf.blockStyle === 'word' ? cf.blockClose : '}',
  };
}
const facRef = (n) => (n <= 1 ? 1 : n * facRef(n - 1));
const fibRef = (n) => (n < 2 ? n : fibRef(n - 1) + fibRef(n - 2));

function runControlFlow(seeds) {
  const results = [];
  for (const seed of seeds) {
    const cf = new CodeForge(seed);
    const { K, t, a, bo, bc } = syntax(cf);
    const here = { seed, fails: [] };

    // factorial 0..12
    const facSrc =
      `${K.func} fac(n) ${bo}\n` +
      `  ${K.if} (n <= 1) ${bo} ${K.return} 1${t} ${bc} ${K.else} ${bo} ${K.return} n * fac(n - 1)${t} ${bc}\n` +
      `${bc}\n`;
    for (let n = 0; n <= 12; n++) {
      const r = cf.run(facSrc + `${K.print} fac(${n})${t}`, { maxSteps: 5_000_000 });
      const exp = String(facRef(n));
      if (!r.ok || r.output.trim() !== exp) here.fails.push(`fac(${n})=${r.ok ? r.output : r.error} want ${exp}`);
    }
    // fibonacci 0..20
    const fibSrc =
      `${K.func} fib(n) ${bo}\n` +
      `  ${K.if} (n < 2) ${bo} ${K.return} n${t} ${bc} ${K.else} ${bo} ${K.return} fib(n - 1) + fib(n - 2)${t} ${bc}\n` +
      `${bc}\n`;
    for (let n = 0; n <= 20; n++) {
      const r = cf.run(fibSrc + `${K.print} fib(${n})${t}`, { maxSteps: 20_000_000 });
      const exp = String(fibRef(n));
      if (!r.ok || r.output.trim() !== exp) here.fails.push(`fib(${n})=${r.ok ? r.output : r.error} want ${exp}`);
    }
    // sum 1..n (n=100) -> 5050
    for (const n of [0, 1, 10, 100]) {
      const sumSrc =
        `${K.let} total ${a} 0${t}\n` +
        `${K.let} i ${a} 1${t}\n` +
        `${K.while} (i <= ${n}) ${bo} total ${a} total + i${t} i ${a} i + 1${t} ${bc}\n` +
        `${K.print} total${t}`;
      const r = cf.run(sumSrc, { maxSteps: 5_000_000 });
      const exp = String((n * (n + 1)) / 2);
      if (!r.ok || r.output.trim() !== exp) here.fails.push(`sum1..${n}=${r.ok ? r.output : r.error} want ${exp}`);
    }
    // nested loops: count i*j over 1..5 x 1..5 = sum = (15)*(15)=225
    {
      const src =
        `${K.let} acc ${a} 0${t}\n` +
        `${K.let} i ${a} 1${t}\n` +
        `${K.while} (i <= 5) ${bo}\n` +
        `  ${K.let} j ${a} 1${t}\n` +
        `  ${K.while} (j <= 5) ${bo} acc ${a} acc + (i * j)${t} j ${a} j + 1${t} ${bc}\n` +
        `  i ${a} i + 1${t}\n` +
        `${bc}\n${K.print} acc${t}`;
      const r = cf.run(src, { maxSteps: 5_000_000 });
      if (!r.ok || r.output.trim() !== '225') here.fails.push(`nestedloop=${r.ok ? r.output : r.error} want 225`);
    }
    // early return: function returns 7 before reaching end
    {
      const src =
        `${K.func} f(x) ${bo}\n` +
        `  ${K.if} (x > 0) ${bo} ${K.return} 7${t} ${bc}\n` +
        `  ${K.return} 99${t}\n` +
        `${bc}\n${K.print} f(5)${t}`;
      const r = cf.run(src);
      if (!r.ok || r.output.trim() !== '7') here.fails.push(`earlyreturn=${r.ok ? r.output : r.error} want 7`);
    }
    // closure over param: makeAdder pattern via nested func returning value using closure
    {
      // g(n) defines local k=n; inner add(x) returns x+k ; call add(10) -> n+10
      const src =
        `${K.func} outer(n) ${bo}\n` +
        `  ${K.func} inner(x) ${bo} ${K.return} x + n${t} ${bc}\n` +
        `  ${K.return} inner(10)${t}\n` +
        `${bc}\n${K.print} outer(5)${t}`;
      const r = cf.run(src);
      if (!r.ok || r.output.trim() !== '15') here.fails.push(`closure=${r.ok ? r.output : r.error} want 15`);
    }
    // mutual recursion: isEven/isOdd
    {
      const src =
        `${K.func} iseven(n) ${bo} ${K.if} (n == 0) ${bo} ${K.return} ${K.true}${t} ${bc} ${K.return} isodd(n - 1)${t} ${bc}\n` +
        `${K.func} isodd(n) ${bo} ${K.if} (n == 0) ${bo} ${K.return} ${K.false}${t} ${bc} ${K.return} iseven(n - 1)${t} ${bc}\n` +
        `${K.print} iseven(10)${t}`;
      const r = cf.run(src, { maxSteps: 1_000_000 });
      if (!r.ok || r.output.trim() !== K.true) here.fails.push(`mutualrec=${r.ok ? r.output : r.error} want ${K.true}`);
    }
    results.push(here);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Parser fuzzing — must NEVER throw uncaught; only {ok:false,error}
// ---------------------------------------------------------------------------
function runFuzz(seed, N) {
  const cf = new CodeForge(seed);
  const K = cf.keywords;
  const alphabet = [
    ...Object.values(K), cf.blockOpen, cf.blockClose, cf.assignOp, cf.terminator,
    '(', ')', '{', '}', '+', '-', '*', '/', '%', '<', '>', '<=', '>=', '==', '!=',
    ',', '"', '#', 'x', 'y', 'foo', '123', '4.5', '\n', ' ', '\t', '!', '@', '&',
    '|', '~', '^', '?', ':', '[', ']', '.', '\\', "'", '`', K.true, K.false, K.null,
  ];
  let uncaught = 0, okCount = 0, errCount = 0;
  const crashes = [];
  for (let n = 0; n < N; n++) {
    const len = ri(0, 30);
    let src = '';
    for (let i = 0; i < len; i++) src += pick(alphabet) + (rnd() < 0.5 ? ' ' : '');
    try {
      const r = cf.run(src, { maxSteps: 200000 });
      if (r.ok) okCount++; else errCount++;
      if (typeof r.ok !== 'boolean') { uncaught++; crashes.push(src); }
    } catch (e) {
      uncaught++;
      if (crashes.length < 20) crashes.push({ src, err: e.message, name: e.constructor.name });
    }
  }
  return { uncaught, okCount, errCount, crashes, total: N };
}

// ---------------------------------------------------------------------------
// Operator-precedence battery (vs JS reference)
// ---------------------------------------------------------------------------
function runPrecedence(seed) {
  const cf = new CodeForge(seed);
  const K = cf.keywords, t = cf.terminator;
  _activeFmt = makeFormat(K);
  const fmt = _activeFmt;
  // each: [conlang-src-fragment, expected-printed-string]
  const cases = [
    [`2 + 3 * 4 == 14`, fmt(true)],
    [`${K.not} 1 == 2`, /* not(1) -> false ; false == 2 -> false */ fmt(false)],
    [`-2 * -3`, '6'],
    [`10 % 3 + 1`, '2'],
    [`2 + 3 == 5 ${K.and} 4 > 1`, fmt(true)],
    [`1 + 2 * 3 - 4`, '3'],
    [`(1 + 2) * 3`, '9'],
    [`8 / 2 / 2`, '2'],
    [`2 * 3 % 4`, '2'],      // (2*3)%4 = 6%4 = 2
    [`10 - 2 - 3`, '5'],     // left assoc
    [`5 > 3 == ${K.true}`, fmt(true)],  // (5>3) -> true ; true == true
    [`${K.not} ${K.true} ${K.or} ${K.true}`, fmt(true)], // (not true=false) or true = true
    [`${K.not} (${K.true} ${K.or} ${K.true})`, fmt(false)],
    [`1 < 2 ${K.and} 2 < 3 ${K.and} 3 < 4`, fmt(true)],
    [`2 + 2 < 3 + 3`, fmt(true)],
    [`-2 + 3`, '1'],
    [`- -5`, '5'],
    [`3 * -2`, '-6'],
  ];
  const fails = [];
  for (const [frag, exp] of cases) {
    const r = cf.run(`${K.print} ${frag}${t}`);
    if (!r.ok || r.output !== exp) fails.push({ frag, exp, got: r.ok ? r.output : `ERR:${r.error}` });
  }
  return { total: cases.length, fails };
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------
function runGuards(seed) {
  const cf = new CodeForge(seed);
  const { K, t, bo, bc } = syntax(cf);
  const checks = [];
  // infinite loop -> step limit error
  {
    const r = cf.run(`${K.while} (1 == 1) ${bo} ${bc}`, { maxSteps: 20000 });
    checks.push(['infinite loop hits step limit', !r.ok && /Step limit/.test(r.error || '')]);
  }
  // div by zero -> Infinity, ok:true
  {
    const r = cf.run(`${K.print} 1 / 0${t}`);
    checks.push(['1/0 yields Infinity (ok, no crash)', r.ok && r.output === 'Infinity']);
  }
  // mod by zero -> NaN -> "Not a number" clean error
  {
    const r = cf.run(`${K.print} 1 % 0${t}`);
    // 1 % 0 = NaN. format(NaN) -> "NaN". Interpreter does NOT re-run toNum on
    // result, so it prints "NaN" (ok). Verify behaviour either way is clean.
    checks.push(['1%0 does not crash uncaught', typeof r.ok === 'boolean']);
  }
  // undefined var -> clean error
  {
    const r = cf.run(`${K.print} zzznotdefined${t}`);
    checks.push(['undefined var clean error', !r.ok && /Undefined/.test(r.error || '')]);
  }
  // call non-function -> clean error
  {
    const r = cf.run(`${K.let} x ${cf.assignOp} 5${t} ${K.print} x(1)${t}`);
    checks.push(['call non-function clean error', !r.ok && /non-function/.test(r.error || '')]);
  }
  // assignment to undefined var -> clean error
  {
    const r = cf.run(`undefinedlhs ${cf.assignOp} 5${t}`);
    checks.push(['assign-to-undefined clean error', !r.ok && /undefined variable/.test(r.error || '')]);
  }
  return checks;
}

// ---------------------------------------------------------------------------
// Determinism: same seed -> identical language twice
// ---------------------------------------------------------------------------
function runDeterminism(seeds) {
  const fails = [];
  for (const s of seeds) {
    const a = new CodeForge(s), b = new CodeForge(s);
    const same = JSON.stringify(a.keywords) === JSON.stringify(b.keywords)
      && a.assignOp === b.assignOp && a.blockStyle === b.blockStyle
      && a.blockOpen === b.blockOpen && a.blockClose === b.blockClose;
    if (!same) fails.push(s);
  }
  return fails;
}

// ===========================================================================
// MAIN
// ===========================================================================
const DIFF_SEEDS = [1, 7, 42, 99, 1337, 2024, 31337, 65535];
const PER_SEED = 1300; // 8 * 1300 = 10400 >= 10000
console.log('=== v1 CodeForge interpreter differential + property test ===\n');

console.log(`[1] DIFFERENTIAL random-expression test  (${DIFF_SEEDS.length} seeds x ${PER_SEED} = ${DIFF_SEEDS.length * PER_SEED} exprs)`);
const diff = runDifferential(DIFF_SEEDS, PER_SEED);
const rate = (diff.match / diff.total) * 100;
console.log(`    total=${diff.total}  match=${diff.match}  rate=${rate.toFixed(4)}%`);
console.log(`    (ref-or-interp errors counted: both-error agreements=${diff.bothErr}, interp-only-success-on-ref-error=${diff.interpErr})`);
if (diff.diverge.length) {
  console.log(`    DIVERGENCES (showing up to 5 of ${diff.diverge.length}):`);
  for (const d of diff.diverge.slice(0, 5)) {
    console.log(`      seed=${d.seed} src=${d.src}`);
    console.log(`        expected=${JSON.stringify(d.expected)} got=${JSON.stringify(d.got)}`);
  }
} else {
  console.log('    NO DIVERGENCES.');
}

console.log('\n[2] CONTROL-FLOW property tests (fac 0..12, fib 0..20, sums, nested loops, early return, closure, mutual recursion)');
const cf2 = runControlFlow([1, 1337, 2024, 65535]);
let cfFail = 0;
for (const r of cf2) {
  if (r.fails.length) { cfFail += r.fails.length; console.log(`    seed ${r.seed}: ${r.fails.length} FAIL`); r.fails.slice(0, 6).forEach((f) => console.log(`        ${f}`)); }
  else console.log(`    seed ${r.seed}: all pass (semantics seed-invariant)`);
}
console.log(`    control-flow failures total: ${cfFail}`);

console.log('\n[3] PARSER FUZZING (2000 garbage streams; must never throw uncaught)');
const fz = runFuzz(42, 2000);
console.log(`    total=${fz.total}  ok=${fz.okCount}  cleanError=${fz.errCount}  UNCAUGHT=${fz.uncaught}`);
if (fz.crashes.length) {
  console.log('    UNCAUGHT CRASHES (up to 5):');
  fz.crashes.slice(0, 5).forEach((c) => console.log(`      ${JSON.stringify(c)}`));
}

console.log('\n[4] OPERATOR PRECEDENCE battery');
const pr = runPrecedence(1337);
console.log(`    total=${pr.total}  fails=${pr.fails.length}`);
pr.fails.forEach((f) => console.log(`      frag=${JSON.stringify(f.frag)} expected=${JSON.stringify(f.exp)} got=${JSON.stringify(f.got)}`));

console.log('\n[5] GUARDS (step limit, div-by-zero, undefined var, non-fn call)');
const gd = runGuards(42);
let gdFail = 0;
for (const [label, pass] of gd) { console.log(`    ${pass ? 'PASS' : 'FAIL'}  ${label}`); if (!pass) gdFail++; }

console.log('\n[6] DETERMINISM (same seed -> identical language)');
const detFails = runDeterminism([1, 7, 42, 99, 1337, 2024, 31337, 65535, 123456, 999999]);
console.log(`    non-deterministic seeds: ${detFails.length ? detFails.join(',') : 'NONE'}`);

console.log('\n=== SUMMARY ===');
const allClean =
  diff.diverge.length === 0 && cfFail === 0 && fz.uncaught === 0 &&
  pr.fails.length === 0 && gdFail === 0 && detFails.length === 0;
console.log(`differential-rate=${rate.toFixed(4)}%  diff-divergences=${diff.diverge.length}  controlflow-fails=${cfFail}  fuzz-uncaught=${fz.uncaught}  precedence-fails=${pr.fails.length}  guard-fails=${gdFail}  nondeterministic=${detFails.length}`);
console.log(allClean && rate === 100 ? 'VERDICT: ORACLE CLEAN (100%)' : 'VERDICT: DEFECTS PRESENT (see above)');
