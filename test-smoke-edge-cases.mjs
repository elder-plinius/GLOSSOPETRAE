/**
 * GLOSSOPETRAE Smoke Test — Translate + Code Lab edge cases
 *
 * Tests the Translation Engine and CodeForge/CodeSkin with real-world
 * edge cases across 3 seeds for cross-seed stability.
 *
 * Run:  node test-smoke-edge-cases.mjs
 */

import { Glossopetrae, CodeForge, CodeSkin } from './src/Glossopetrae.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEEDS = [42, 1337, 9999];
const results = [];   // { group, name, seed, pass, detail }

function record(group, name, seed, pass, detail = '') {
  results.push({ group, name, seed, pass, detail });
}

function section(title) {
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(72));
}

function sub(label) {
  console.log(`\n── ${label} ${'─'.repeat(Math.max(0, 60 - label.length))}`);
}

// Generate languages up front (one per seed)
const langs = {};
for (const seed of SEEDS) {
  const engine = new Glossopetrae({ seed });
  langs[seed] = engine.generate();
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — TRANSLATION EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

section('PART 1: TRANSLATION EDGE CASES');

const translationTests = [
  { id: 'T01', name: 'Empty string',          input: '' },
  { id: 'T02', name: 'Single word',           input: 'hello' },
  { id: 'T03', name: 'Very long sentence',    input: 'The quick brown fox jumps over the lazy dog and then runs across the wide open field while the sun sets behind the distant purple mountains casting long shadows across the green meadow where sheep are grazing peacefully near the old stone wall that was built many years ago by the farmers who once lived in the small village nearby' },
  { id: 'T04', name: 'Proper nouns',          input: 'Alice went to Paris with Bob' },
  { id: 'T05', name: 'Numbers in text',       input: 'I have 42 cats and 7 dogs' },
  { id: 'T06', name: 'Mixed case acronyms',   input: 'The FBI agent met the CIA director' },
  { id: 'T07', name: 'Punctuation heavy',     input: 'Wait... really?! No way! (seriously)' },
  { id: 'T08', name: 'Special characters',    input: 'The price is $99.99 — what a deal!' },
  { id: 'T09', name: 'Unicode/emoji',         input: 'Hello 🌍 world' },
  { id: 'T10', name: 'Repeated words',        input: 'very very very big big house' },
  { id: 'T11', name: 'Only punctuation',      input: '...' },
  { id: 'T12', name: 'Only numbers',          input: '123 456 789' },
  { id: 'T13', name: 'Question',              input: 'Where is the library?' },
  { id: 'T14', name: 'Commands/imperatives',  input: 'Run faster! Jump higher!' },
  { id: 'T15', name: 'Poetry/rhythm',         input: 'Roses are red, violets are blue' },
];

for (const seed of SEEDS) {
  sub(`Seed ${seed}`);
  const lang = langs[seed];

  for (const tc of translationTests) {
    const label = `${tc.id} ${tc.name}`;
    let pass = true;
    const notes = [];

    try {
      // Forward translation
      const fwd = lang.translationEngine.translateToConlang(tc.input);
      const target = fwd.target;
      const gloss  = fwd.gloss;

      console.log(`  [${tc.id}] "${tc.input}"`);
      console.log(`       → conlang: "${target}"`);
      console.log(`       → gloss:   "${gloss}"`);

      // Check: did not crash (we got here)
      // Check: output is not empty (unless input is empty — graceful degradation ok)
      if (tc.input.trim().length > 0 && (!target || target.trim().length === 0)) {
        pass = false;
        notes.push('output is empty for non-empty input');
      }

      // Check: output is not identical to input (should actually translate)
      // Exception: pure-punctuation or pure-number inputs may pass through
      const isPureNonWord = /^[\d\s.,!?…$—()\[\]]+$/.test(tc.input);
      if (target === tc.input && !isPureNonWord && tc.input.trim().length > 0) {
        pass = false;
        notes.push('output identical to input (no translation happened)');
      }

      // Round-trip: conlang -> English
      if (target && target.trim().length > 0) {
        try {
          const rt = lang.translateToEnglish(target);
          const back = typeof rt === 'string' ? rt : (rt?.english ?? rt?.text ?? JSON.stringify(rt));
          console.log(`       ← reverse: "${back}"`);
          // Just checking it doesn't crash and returns something
          if (!back || (typeof back === 'string' && back.trim().length === 0)) {
            notes.push('reverse translation returned empty');
          }
        } catch (e) {
          notes.push(`reverse translation error: ${e.message}`);
        }
      }

    } catch (e) {
      pass = false;
      notes.push(`CRASH: ${e.message}`);
      console.log(`  [${tc.id}] "${tc.input}"`);
      console.log(`       CRASH: ${e.message}`);
    }

    record('translate', label, seed, pass, notes.join('; '));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — CODE LAB EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

section('PART 2: CODE LAB EDGE CASES');

for (const seed of SEEDS) {
  sub(`Seed ${seed} — CodeForge basics`);
  const lang = langs[seed];
  const cf = new CodeForge(lang);

  // 2.1 — Empty program
  {
    const label = 'C01 Empty program';
    try {
      const r = cf.run('');
      console.log(`  [C01] Empty program → ok=${r.ok}, output="${r.output}", error=${r.error}`);
      // An empty program should either be ok with no output, or gracefully fail
      record('code', label, seed, true, `ok=${r.ok}`);
    } catch (e) {
      record('code', label, seed, false, `CRASH: ${e.message}`);
      console.log(`  [C01] CRASH: ${e.message}`);
    }
  }

  // 2.2 — Single statement (print)
  {
    const label = 'C02 Single print statement';
    try {
      const src = cf.examples().hello;
      const r = cf.run(src);
      console.log(`  [C02] hello → ok=${r.ok}, output="${r.output}"`);
      const pass = r.ok && r.output.includes('hello');
      record('code', label, seed, pass, pass ? '' : `ok=${r.ok} output="${r.output}"`);
    } catch (e) {
      record('code', label, seed, false, `CRASH: ${e.message}`);
      console.log(`  [C02] CRASH: ${e.message}`);
    }
  }

  // 2.3 — Nested loops (a while inside a while)
  {
    const label = 'C03 Nested loops';
    const K = cf.keywords, a = cf.assignOp, t = cf.terminator;
    const bo = cf.blockStyle === 'word' ? cf.blockOpen : '{';
    const bc = cf.blockStyle === 'word' ? cf.blockClose : '}';
    try {
      const src =
        `${K.let} i ${a} 1${t}\n` +
        `${K.while} (i <= 3) ${bo}\n` +
        `  ${K.let} j ${a} 1${t}\n` +
        `  ${K.while} (j <= 2) ${bo}\n` +
        `    ${K.print} i * 10 + j${t}\n` +
        `    j ${a} j + 1${t}\n` +
        `  ${bc}\n` +
        `  i ${a} i + 1${t}\n` +
        `${bc}`;
      const r = cf.run(src);
      console.log(`  [C03] Nested loops → ok=${r.ok}, lines=${JSON.stringify(r.lines)}`);
      const expected = ['11', '12', '21', '22', '31', '32'];
      const pass = r.ok && JSON.stringify(r.lines) === JSON.stringify(expected);
      record('code', label, seed, pass, pass ? '' : `got ${JSON.stringify(r.lines)}`);
    } catch (e) {
      record('code', label, seed, false, `CRASH: ${e.message}`);
      console.log(`  [C03] CRASH: ${e.message}`);
    }
  }

  // 2.4 — Large factorial (20!)
  {
    const label = 'C04 Factorial of 20';
    const K = cf.keywords, a = cf.assignOp, t = cf.terminator;
    const bo = cf.blockStyle === 'word' ? cf.blockOpen : '{';
    const bc = cf.blockStyle === 'word' ? cf.blockClose : '}';
    try {
      const src =
        `${K.func} fac(n) ${bo}\n` +
        `  ${K.if} (n <= 1) ${bo} ${K.return} 1${t} ${bc} ${K.else} ${bo} ${K.return} n * fac(n - 1)${t} ${bc}\n` +
        `${bc}\n` +
        `${K.print} fac(20)${t}`;
      const r = cf.run(src);
      console.log(`  [C04] fac(20) → ok=${r.ok}, output="${r.output}"`);
      // 20! = 2432902008176640000 (JS float loses precision but shouldn't crash)
      const pass = r.ok && r.output.length > 0;
      record('code', label, seed, pass, pass ? `got ${r.output}` : `ok=${r.ok} output="${r.output}"`);
    } catch (e) {
      record('code', label, seed, false, `CRASH: ${e.message}`);
      console.log(`  [C04] CRASH: ${e.message}`);
    }
  }

  // 2.5 — String with special characters in print
  {
    const label = 'C05 Print special chars';
    const K = cf.keywords, t = cf.terminator;
    try {
      const src = `${K.print} "Hello, world! @#&*"${t}`;
      const r = cf.run(src);
      console.log(`  [C05] Special chars → ok=${r.ok}, output="${r.output}"`);
      const pass = r.ok && r.output === 'Hello, world! @#&*';
      record('code', label, seed, pass, pass ? '' : `ok=${r.ok} output="${r.output}"`);
    } catch (e) {
      record('code', label, seed, false, `CRASH: ${e.message}`);
      console.log(`  [C05] CRASH: ${e.message}`);
    }
  }

  // 2.6 — Battery programs at all skin levels
  sub(`Seed ${seed} — Battery programs x skin levels`);
  const exKeys = ['hello', 'countUp', 'factorial', 'fizzbuzz'];
  const examples = cf.examples();

  for (const exName of exKeys) {
    const src = examples[exName];
    // Run the canonical (unskinned) version for expected output
    let canonResult;
    try {
      canonResult = cf.run(src);
    } catch (e) {
      console.log(`  [${exName}] canonical CRASH: ${e.message}`);
      record('code', `C06 ${exName} canonical`, seed, false, `CRASH: ${e.message}`);
      continue;
    }

    for (let lvl = 0; lvl <= 3; lvl++) {
      const label = `C06 ${exName} L${lvl}`;
      try {
        const cs = new CodeSkin(cf, lvl, seed);
        const skinned = cs.skin(src);
        const skinnedResult = cs.run(skinned);

        console.log(`  [${exName} L${lvl}] ok=${skinnedResult.ok}, output="${skinnedResult.output.slice(0, 60)}${skinnedResult.output.length > 60 ? '...' : ''}"`);

        // Check: skinned version runs ok
        if (!skinnedResult.ok) {
          record('code', label, seed, false, `skinned run failed: ${skinnedResult.error}`);
          continue;
        }

        // Check: skinned output matches canonical output
        const outputMatch = skinnedResult.output === canonResult.output;
        if (!outputMatch) {
          record('code', label, seed, false, `output mismatch: canon="${canonResult.output.slice(0, 40)}" vs skinned="${skinnedResult.output.slice(0, 40)}"`);
          continue;
        }

        record('code', label, seed, true, '');
      } catch (e) {
        record('code', label, seed, false, `CRASH: ${e.message}`);
        console.log(`  [${exName} L${lvl}] CRASH: ${e.message}`);
      }
    }
  }

  // 2.7 — Skin/unskin roundtrip preserves semantics
  sub(`Seed ${seed} — Skin/unskin roundtrip`);
  for (let lvl = 0; lvl <= 3; lvl++) {
    const label = `C07 roundtrip L${lvl}`;
    try {
      const cs = new CodeSkin(cf, lvl, seed);
      const src = examples.factorial;
      const skinned = cs.skin(src);
      const unskinned = cs.unskin(skinned);
      const unskinResult = cf.run(unskinned);

      console.log(`  [roundtrip L${lvl}] unskin ok=${unskinResult.ok}, output="${unskinResult.output}"`);

      const pass = unskinResult.ok && unskinResult.output === '720';
      record('code', label, seed, pass, pass ? '' : `ok=${unskinResult.ok} output="${unskinResult.output}" error="${unskinResult.error}"`);
    } catch (e) {
      record('code', label, seed, false, `CRASH: ${e.message}`);
      console.log(`  [roundtrip L${lvl}] CRASH: ${e.message}`);
    }
  }

  // 2.8 — Legibility scores decrease with higher opacity
  sub(`Seed ${seed} — Legibility monotonicity`);
  {
    const label = 'C08 legibility decreases L0→L3';
    try {
      const src = examples.fizzbuzz;
      const scores = [];
      for (let lvl = 0; lvl <= 3; lvl++) {
        const cs = new CodeSkin(cf, lvl, seed);
        const skinned = cs.skin(src);
        const leg = cs.legibility(skinned);
        scores.push(leg.score);
        console.log(`  [legibility L${lvl}] ascii=${leg.ascii} wordHint=${leg.wordHint} score=${leg.score}`);
      }

      // Check monotonic non-increase (each level should be <= the previous)
      let monotonic = true;
      for (let i = 1; i < scores.length; i++) {
        if (scores[i] > scores[i - 1] + 0.001) { // small epsilon for float
          monotonic = false;
          break;
        }
      }
      // Also check L3 is strictly less than L0 (they should be meaningfully different)
      const spread = scores[0] - scores[scores.length - 1];

      const pass = monotonic && spread > 0.05;
      record('code', label, seed, pass, `scores=[${scores.join(', ')}] monotonic=${monotonic} spread=${spread.toFixed(3)}`);
    } catch (e) {
      record('code', label, seed, false, `CRASH: ${e.message}`);
      console.log(`  [legibility] CRASH: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY TABLE
// ═══════════════════════════════════════════════════════════════════════════

section('SUMMARY');

// Group by test name, show per-seed pass/fail
const testNames = [...new Set(results.map(r => r.name))];
const groups = [...new Set(results.map(r => r.group))];

let totalPass = 0, totalFail = 0;

for (const group of groups) {
  const groupTests = testNames.filter(n => results.find(r => r.name === n && r.group === group));
  if (groupTests.length === 0) continue;

  console.log(`\n  ${group.toUpperCase()}`);
  console.log(`  ${'Test'.padEnd(35)} | ${'S42'.padEnd(5)} | ${'S1337'.padEnd(5)} | ${'S9999'.padEnd(5)} | Notes`);
  console.log(`  ${'─'.repeat(35)}-+-${'─'.repeat(5)}-+-${'─'.repeat(5)}-+-${'─'.repeat(5)}-+${'─'.repeat(30)}`);

  for (const name of groupTests) {
    const row = SEEDS.map(s => {
      const r = results.find(x => x.name === name && x.seed === s);
      if (!r) return '  -  ';
      if (r.pass) { totalPass++; return ' PASS'; }
      totalFail++; return ' FAIL';
    });
    // Collect notes (from any failing seed)
    const failNotes = results
      .filter(r => r.name === name && !r.pass && r.detail)
      .map(r => `[${r.seed}] ${r.detail}`)
      .slice(0, 1)
      .join('; ');

    console.log(`  ${name.padEnd(35)} | ${row[0].padEnd(5)} | ${row[1].padEnd(5)} | ${row[2].padEnd(5)} | ${failNotes}`);
  }
}

console.log(`\n  TOTAL: ${totalPass} PASS, ${totalFail} FAIL out of ${totalPass + totalFail} checks`);
console.log(`  Rate:  ${((totalPass / (totalPass + totalFail)) * 100).toFixed(1)}%\n`);

if (totalFail > 0) {
  console.log('  FAILED DETAILS:');
  for (const r of results.filter(x => !x.pass)) {
    console.log(`    [seed ${r.seed}] ${r.name}: ${r.detail}`);
  }
  console.log('');
}

process.exit(totalFail > 0 ? 1 : 0);
