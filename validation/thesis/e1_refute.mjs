/**
 * E1_REFUTE — Adversarial audit of the E1 headline:
 *   "500/500 generated languages are fully functional (all 9 battery programs
 *    correct), 0 degenerate, mean pairwise keyword overlap 0.02% — the coding
 *    affordance reliably exists."
 *
 * The E1 numbers REPRODUCE exactly (re-ran e1_codelang_space.mjs: 500/500,
 * 0 degenerate, 0.018% overlap). The interpreter is genuinely solid, so I do
 * NOT attack arithmetic/loops/recursion. I attack the WORDS "fully functional"
 * and "reliably exists" — whether 100% is a property of the GENERATOR or of the
 * AUTHOR's carefully-chosen identifiers + seed range.
 *
 * ATTACKS:
 *  A/B. IDENTIFIER POLICY x SEED RANGE. CodeForge does NOT reserve keywords
 *       against a caller's identifiers (PART 6 admits this). The committed
 *       battery uses identifiers verified collision-free on 1..500. I run the
 *       SAME 9 programs with ordinary developer identifiers across the in-sample
 *       range AND disjoint out-of-sample ranges, measuring the TRUE pass rate.
 *  C.   UNALIGNED OVERLAP. The 0.018% is concept-ALIGNED (slot i vs slot i).
 *       Contamination is SET membership, not slot. Recompute set-intersection.
 *  D.   KEYWORD REUSABILITY. Count languages minting short / real-English-word
 *       keywords a naive author would plausibly type as an identifier.
 *
 * Parallelized via child_process.fork (each CodeForge builds a full natural
 * language ~1.3s; engines are deterministic so sharding doesn't change results).
 * SAFETY: benign only (arithmetic, FizzBuzz, sentinels harbor/falcon/bridge).
 *
 * Run: node validation/thesis/e1_refute.mjs
 */

import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { CodeForge } from '../../src/modules/CodeForge.js';

const refFac = (n) => (n <= 1 ? 1 : n * refFac(n - 1));
const refFib = (n) => (n < 2 ? n : refFib(n - 1) + refFib(n - 2));
const refSum = (n) => (n * (n + 1)) / 2;
const refCountdown = (n) => { const o = []; for (let i = n; i >= 1; i--) o.push(String(i)); return o.join('\n'); };
const refFizz = (n) => { const o = []; for (let i = 1; i <= n; i++) o.push(i % 15 === 0 ? 'FizzBuzz' : i % 3 === 0 ? 'Fizz' : i % 5 === 0 ? 'Buzz' : String(i)); return o.join('\n'); };

const SUM_N = 100, FAC_N = 6, FIB_N = 15, COUNT_N = 5;
const STR_A = 'harbor', STR_B = 'falcon', PRINT_LIT = 'bridge';
const RUN_OPTS = { maxSteps: 5_000_000, maxDepth: 2000 };

function syn(cf) {
  return {
    K: cf.keywords, t: cf.terminator, a: cf.assignOp,
    bo: cf.blockStyle === 'word' ? cf.blockOpen : '{',
    bc: cf.blockStyle === 'word' ? cf.blockClose : '}',
  };
}

function makeBattery(ids) {
  const { total, i, facFn, facArg, fibFn, fibArg, addFn, addA, addB } = ids;
  return [
    { name: 'print_literal', src: (cf, { K, t }) => `${K.print} "${PRINT_LIT}"${t}`, expected: () => PRINT_LIT },
    { name: 'sum_1_to_N', src: (cf, { K, t, a, bo, bc }) =>
        `${K.let} ${total} ${a} 0${t}\n${K.let} ${i} ${a} 1${t}\n${K.while} (${i} <= ${SUM_N}) ${bo} ${total} ${a} ${total} + ${i}${t} ${i} ${a} ${i} + 1${t} ${bc}\n${K.print} ${total}${t}`,
      expected: () => String(refSum(SUM_N)) },
    { name: 'factorial_recursive', src: (cf, { K, t, bo, bc }) =>
        `${K.func} ${facFn}(${facArg}) ${bo}\n  ${K.if} (${facArg} <= 1) ${bo} ${K.return} 1${t} ${bc} ${K.else} ${bo} ${K.return} ${facArg} * ${facFn}(${facArg} - 1)${t} ${bc}\n${bc}\n${K.print} ${facFn}(${FAC_N})${t}`,
      expected: () => String(refFac(FAC_N)) },
    { name: 'fibonacci_recursive', src: (cf, { K, t, bo, bc }) =>
        `${K.func} ${fibFn}(${fibArg}) ${bo}\n  ${K.if} (${fibArg} < 2) ${bo} ${K.return} ${fibArg}${t} ${bc} ${K.else} ${bo} ${K.return} ${fibFn}(${fibArg} - 1) + ${fibFn}(${fibArg} - 2)${t} ${bc}\n${bc}\n${K.print} ${fibFn}(${FIB_N})${t}`,
      expected: () => String(refFib(FIB_N)) },
    { name: 'while_countdown', src: (cf, { K, t, a, bo, bc }) =>
        `${K.let} ${i} ${a} ${COUNT_N}${t}\n${K.while} (${i} >= 1) ${bo} ${K.print} ${i}${t} ${i} ${a} ${i} - 1${t} ${bc}`,
      expected: () => refCountdown(COUNT_N) },
    { name: 'fizzbuzz_1_to_15', src: (cf, { K, t, a, bo, bc }) =>
        `${K.let} ${i} ${a} 1${t}\n${K.while} (${i} <= 15) ${bo}\n  ${K.if} (${i} % 15 == 0) ${bo} ${K.print} "FizzBuzz"${t} ${bc}\n  ${K.else} ${bo} ${K.if} (${i} % 3 == 0) ${bo} ${K.print} "Fizz"${t} ${bc}\n  ${K.else} ${bo} ${K.if} (${i} % 5 == 0) ${bo} ${K.print} "Buzz"${t} ${bc} ${K.else} ${bo} ${K.print} ${i}${t} ${bc} ${bc} ${bc}\n  ${i} ${a} ${i} + 1${t}\n${bc}`,
      expected: () => refFizz(15) },
    { name: 'string_concat', src: (cf, { K, t }) => `${K.print} "${STR_A}" + "${STR_B}"${t}`, expected: () => STR_A + STR_B },
    { name: 'boolean_logic', src: (cf, { K, t }) =>
        `${K.print} (3 > 2) ${K.and} (${K.not} (1 == 2))${t}\n${K.print} (1 > 2) ${K.or} (5 == 5)${t}`,
      expected: (cf) => `${cf.keywords.true}\n${cf.keywords.true}` },
    { name: 'func_params_return', src: (cf, { K, t, bo, bc }) =>
        `${K.func} ${addFn}(${addA}, ${addB}) ${bo} ${K.return} ${addA} + ${addB}${t} ${bc}\n${K.print} ${addFn}(40, 2)${t}`,
      expected: () => '42' },
  ];
}

const CAREFUL_IDS  = { total: 'total', i: 'i',    facFn: 'fac',       facArg: 'n',   fibFn: 'fib',       fibArg: 'n',   addFn: 'add',   addA: 'a',    addB: 'b' };
const NATURAL_IDS  = { total: 'sum',   i: 'count', facFn: 'factorial', facArg: 'num', fibFn: 'fibonacci', fibArg: 'num', addFn: 'plus',  addA: 'left', addB: 'right' };
const NATURAL_IDS2 = { total: 'acc',   i: 'idx',   facFn: 'fact',      facArg: 'val', fibFn: 'fibo',      fibArg: 'val', addFn: 'addup', addA: 'one',  addB: 'two' };
const ID_SETS = { CAREFUL: CAREFUL_IDS, NATURAL: NATURAL_IDS, NATURAL2: NATURAL_IDS2 };

function runBattery(cf, battery) {
  const s = syn(cf);
  let allPass = true; const fails = [];
  for (const prog of battery) {
    const exp = prog.expected(cf);
    const r = cf.run(prog.src(cf, s), RUN_OPTS);
    const got = r.ok ? r.output.trim() : null;
    const pass = r.ok && got === exp;
    if (!pass) { allPass = false; fails.push({ program: prog.name, expected: exp, got, error: r.error }); }
  }
  return { allPass, fails };
}

// Worker processes a shard: for each seed, run all 3 id-set batteries.
function processSeed(seed) {
  const cf = new CodeForge(seed);
  const res = { seed, keywords: cf.keywords, blockStyle: cf.blockStyle, blockOpen: cf.blockOpen, blockClose: cf.blockClose, pass: {}, firstFail: {} };
  for (const [label, ids] of Object.entries(ID_SETS)) {
    const { allPass, fails } = runBattery(cf, makeBattery(ids));
    res.pass[label] = allPass;
    if (!allPass) res.firstFail[label] = { ...fails[0], nFails: fails.length };
  }
  return res;
}

const __filename = fileURLToPath(import.meta.url);

if (process.argv[2] === '--worker') {
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    const seeds = JSON.parse(buf);
    process.stdout.write(JSON.stringify(seeds.map(processSeed)));
  });
} else {
  await main();
}

function pct(n, d) { return ((n / d) * 100).toFixed(2) + '%'; }

async function runShardedSweep(seeds) {
  const nWorkers = Math.min(os.cpus().length, 16);
  const shards = Array.from({ length: nWorkers }, () => []);
  seeds.forEach((s, k) => shards[k % nWorkers].push(s));
  const runShard = (sh) => new Promise((resolve, reject) => {
    const child = fork(__filename, ['--worker'], { stdio: ['pipe', 'pipe', 'inherit', 'ipc'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('error', reject);
    child.on('exit', (code) => { if (code !== 0) return reject(new Error(`worker exited ${code}`)); try { resolve(JSON.parse(out)); } catch (e) { reject(e); } });
    child.stdin.write(JSON.stringify(sh)); child.stdin.end();
  });
  const parts = await Promise.all(shards.filter((s) => s.length).map(runShard));
  return parts.flat();
}

async function main() {
  console.log('================================================================');
  console.log('  E1_REFUTE — is "100% fully functional" a GENERATOR property,');
  console.log('  or an artifact of careful identifier + seed choices?');
  console.log('================================================================\n');

  const RANGES = {
    'in-sample 1..500':   Array.from({ length: 500 },  (_, k) => 1 + k),
    'OOS 5000..5999':     Array.from({ length: 1000 }, (_, k) => 5000 + k),
    'OOS 50000..50999':   Array.from({ length: 1000 }, (_, k) => 50000 + k),
  };

  console.log('[ATTACK A/B] Per-language full-pass rate, by IDENTIFIER POLICY x SEED RANGE');
  console.log('  CAREFUL  = committed harness identifiers (total,i,fac,fib,add,a,b,n)');
  console.log('  NATURAL  = ordinary dev identifiers (sum,count,factorial,fibonacci,num,plus,left,right)');
  console.log('  NATURAL2 = different ordinary set (acc,idx,fact,fibo,val,addup,one,two)\n');

  const grand = { CAREFUL: { full: 0, n: 0, fails: [] }, NATURAL: { full: 0, n: 0, fails: [] }, NATURAL2: { full: 0, n: 0, fails: [] } };
  let corpus1to500 = null;

  for (const [rlabel, seeds] of Object.entries(RANGES)) {
    const t0 = Date.now();
    const results = await runShardedSweep(seeds);
    if (rlabel === 'in-sample 1..500') corpus1to500 = results.slice().sort((a, b) => a.seed - b.seed);
    console.log(`  range ${rlabel}  (N=${seeds.length}, ${(((Date.now() - t0) / 1000)).toFixed(0)}s)`);
    for (const label of Object.keys(ID_SETS)) {
      const full = results.filter((r) => r.pass[label]).length;
      grand[label].full += full; grand[label].n += seeds.length;
      for (const r of results) if (!r.pass[label] && grand[label].fails.length < 30) grand[label].fails.push({ range: rlabel, seed: r.seed, keywords: r.keywords, ...r.firstFail[label] });
      console.log(`    ${label.padEnd(9)} full-functional: ${String(full).padStart(4)}/${seeds.length}  (${pct(full, seeds.length)})`);
    }
    console.log('');
  }

  console.log(`  AGGREGATE (${grand.CAREFUL.n} seeds per policy):`);
  for (const label of Object.keys(ID_SETS))
    console.log(`    ${label.padEnd(9)} ${grand[label].full}/${grand[label].n}  (${pct(grand[label].full, grand[label].n)})  failures: ${grand[label].n - grand[label].full}`);

  console.log('\n  sample failures under naturalistic identifiers (what a real author hits):');
  for (const label of ['NATURAL', 'NATURAL2']) {
    for (const f of grand[label].fails.slice(0, 6))
      console.log(`    [${label}] seed ${f.seed} (${f.range}) — ${f.program}: error=${f.error || 'wrong-output'}  kw=${JSON.stringify(f.keywords)}`);
  }

  // ATTACK C — unaligned overlap on 1..500
  console.log('\n[ATTACK C] "essentially disjoint" — concept-ALIGNED vs honest SET overlap (1..500)');
  const conceptKeys = Object.keys(corpus1to500[0].keywords);
  const NK = conceptKeys.length;
  const aligned = corpus1to500.map((r) => conceptKeys.map((k) => r.keywords[k]));
  const sets = corpus1to500.map((r) => new Set(Object.values(r.keywords)));
  let pAlignSum = 0, pSetSum = 0, pCount = 0, alignMax = 0, setMax = 0, setSharePairs = 0;
  for (let x = 0; x < corpus1to500.length; x++) {
    for (let y = x + 1; y < corpus1to500.length; y++) {
      let al = 0; for (let k = 0; k < NK; k++) if (aligned[x][k] === aligned[y][k]) al++;
      let inter = 0; for (const w of sets[x]) if (sets[y].has(w)) inter++;
      pAlignSum += al / NK; pSetSum += inter / NK;
      if (al / NK > alignMax) alignMax = al / NK;
      if (inter / NK > setMax) setMax = inter / NK;
      if (inter > 0) setSharePairs++;
      pCount++;
    }
  }
  console.log(`  pairs: ${pCount}`);
  console.log(`  concept-ALIGNED mean overlap: ${(pAlignSum / pCount * 100).toFixed(4)}%   max ${(alignMax * 100).toFixed(2)}%`);
  console.log(`  honest SET-intersection mean: ${(pSetSum / pCount * 100).toFixed(4)}%   max ${(setMax * 100).toFixed(2)}%`);
  console.log(`  pairs sharing >=1 token in ANY slot: ${setSharePairs}/${pCount} (${pct(setSharePairs, pCount)})`);

  // ATTACK D — keyword reusability
  console.log('\n[ATTACK D] How many languages mint a keyword a naive author would plausibly type? (1..500)');
  const ENGLISH = new Set(['if','or','and','not','to','do','go','it','at','an','as','be','by','in','is','of','on','no','so','up','us','we','me','my','he','ad','id','am','the','for','sum','set','get','let','run','add','val','num','key','map','out','top','end','one','two','max','min','new','old','log','arg','fun','fn','count','total','value','result','left','right','plus','idx','acc','fact','fibo','factorial','fibonacci']);
  let shortKw = 0, englishKw = 0; const englishExamples = [];
  for (const r of corpus1to500) {
    const kws = Object.values(r.keywords).concat(r.blockStyle === 'word' ? [r.blockOpen, r.blockClose] : []);
    if (kws.some((w) => w.length <= 3)) shortKw++;
    const eng = kws.filter((w) => ENGLISH.has(w));
    if (eng.length) { englishKw++; if (englishExamples.length < 15) englishExamples.push(`seed ${r.seed}:${eng.join(',')}`); }
  }
  console.log(`  languages with at least one <=3-char keyword (collision-prone): ${shortKw}/500 (${pct(shortKw, 500)})`);
  console.log(`  languages minting a real-English-word keyword: ${englishKw}/500 (${pct(englishKw, 500)})`);
  console.log('  examples: ' + englishExamples.slice(0, 12).join('  '));

  console.log('\n================================================================');
  console.log('  VERDICT');
  console.log('================================================================');
  const careRate = grand.CAREFUL.full / grand.CAREFUL.n;
  const natRate = Math.min(grand.NATURAL.full / grand.NATURAL.n, grand.NATURAL2.full / grand.NATURAL2.n);
  console.log(`  CAREFUL identifiers: ${pct(grand.CAREFUL.full, grand.CAREFUL.n)} full  (matches headline spirit)`);
  console.log(`  NATURAL  identifiers: ${pct(grand.NATURAL.full, grand.NATURAL.n)} full`);
  console.log(`  NATURAL2 identifiers: ${pct(grand.NATURAL2.full, grand.NATURAL2.n)} full`);
  console.log(`  worst naturalistic full-rate: ${(natRate * 100).toFixed(2)}%  (delta from CAREFUL: ${((careRate - natRate) * 100).toFixed(2)} pts)`);
  process.exit(0);
}
