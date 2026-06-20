/**
 * GLOSSOPETRAE - ReverseTranslator test suite
 *
 * Run: node test-reverse.mjs
 *
 * Validates conlang -> English decoding against the TranslationEngine's
 * actual output across multiple seeds:
 *   1. Round-trip lexical recovery (3 seeds x 15 varied sentences)
 *   2. Morpheme segmentation on random paradigm forms
 *   3. Unknown-word handling
 *   4. Multi-sentence input + punctuation
 */

import { Glossopetrae } from './src/Glossopetrae.js';
import { ReverseTranslator } from './src/modules/ReverseTranslator.js';

// ---------------------------------------------------------------------
// harness
// ---------------------------------------------------------------------

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}${detail ? '  (' + detail + ')' : ''}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? '  (' + detail + ')' : ''}`);
  }
}

/** Generate a language with the noisy progress logging suppressed. */
function quietQuick(seed) {
  const orig = console.log;
  console.log = () => {};
  try {
    return Glossopetrae.quick(seed);
  } finally {
    console.log = orig;
  }
}

/** Deterministic xorshift32 PRNG so "random" paradigm picks are stable. */
function makePrng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------

const SEEDS = [42, 7, 12345];

// 15 varied sentences: declaratives, plurals, past/future, pronouns,
// adjectives, negation, questions. `simple` marks plain SVO declaratives.
const SENTENCES = [
  { text: 'The warrior sees the mountain.', simple: true },
  { text: 'The woman eats the bread.', simple: true },
  { text: 'The child drinks the water.', simple: true },
  { text: 'The man sleeps.', simple: false },
  { text: 'The woman ate the bread.', simple: true },
  { text: 'Yesterday the man ate the fish.', simple: false },
  { text: 'You will see the star.', simple: false },
  { text: 'I see you.', simple: true },
  { text: 'They know us.', simple: true },
  { text: 'The big dog sees the small bird.', simple: true },
  { text: 'The old woman knows the truth.', simple: true },
  { text: 'The women see the children.', simple: false },
  { text: 'The men see the stars.', simple: false },
  { text: 'The man does not sleep.', simple: false },
  { text: 'Do you see the star?', simple: false },
];

// ---------------------------------------------------------------------
// 1. round-trip lexical recovery
// ---------------------------------------------------------------------

console.log('\n=== 1. Round-trip lexical recovery ===');

const languages = new Map();
const allRates = [];
const simpleRates = [];
const examples = [];

for (const seed of SEEDS) {
  const language = quietQuick(seed);
  const reverse = new ReverseTranslator(language);
  languages.set(seed, { language, reverse });

  let seedSum = 0;
  for (let i = 0; i < SENTENCES.length; i++) {
    const { text, simple } = SENTENCES[i];
    const result = reverse.roundTrip(text);
    allRates.push(result.lexicalMatchRate);
    if (simple) simpleRates.push(result.lexicalMatchRate);
    seedSum += result.lexicalMatchRate;
    if (i % 5 === 0) {
      examples.push({ seed, name: language.name, ...result });
    }
  }
  console.log(`  seed ${seed} (${language.name}): avg lexicalMatchRate = ${(seedSum / SENTENCES.length).toFixed(3)}`);
}

const avgAll = allRates.reduce((a, b) => a + b, 0) / allRates.length;
const avgSimple = simpleRates.reduce((a, b) => a + b, 0) / simpleRates.length;

console.log(`\n  overall average (${allRates.length} round-trips): ${avgAll.toFixed(3)}`);
console.log(`  simple-SVO average (${simpleRates.length} round-trips): ${avgSimple.toFixed(3)}`);
check('average lexicalMatchRate >= 0.8', avgAll >= 0.8, avgAll.toFixed(3));
check('simple SVO declaratives >= 0.9', avgSimple >= 0.9, avgSimple.toFixed(3));

console.log('\n  --- example round-trips (human check) ---');
for (const ex of examples) {
  console.log(`  [seed ${ex.seed} / ${ex.name}]`);
  console.log(`    EN:      ${ex.english}`);
  console.log(`    CONLANG: ${ex.conlang}`);
  console.log(`    BACK:    ${ex.back}   (rate ${ex.lexicalMatchRate.toFixed(2)})`);
}

// ---------------------------------------------------------------------
// 2. segmentation on random paradigm forms
// ---------------------------------------------------------------------

console.log('\n=== 2. Morpheme segmentation (30 random paradigm forms per seed) ===');

let segCorrect = 0;
let segTotal = 0;

for (const seed of SEEDS) {
  const { language, reverse } = languages.get(seed);
  const prng = makePrng(seed * 7919 + 17);

  const forms = [];
  for (const entry of language.lexicon.getEntries()) {
    if (!entry.paradigm?.forms) continue;
    for (const form of Object.values(entry.paradigm.forms)) {
      forms.push({ lemma: entry.lemma, gloss: entry.gloss, form });
    }
  }

  let ok = 0;
  const misses = [];
  for (let i = 0; i < 30; i++) {
    const pick = forms[Math.floor(prng() * forms.length)];
    const seg = reverse.segment(pick.form);
    if (seg.lemma === pick.lemma) {
      ok++;
    } else if (misses.length < 2) {
      misses.push(`${pick.form} (${pick.gloss}) -> ${seg.lemma ?? '?'} (${seg.gloss ?? '?'})`);
    }
  }
  segCorrect += ok;
  segTotal += 30;
  console.log(`  seed ${seed}: ${ok}/30 correct lemma${misses.length ? '   misses: ' + misses.join(' | ') : ''}`);
}

const segRate = segCorrect / segTotal;
check('segmentation recovers right lemma >= 90%', segRate >= 0.9,
  `${segCorrect}/${segTotal} = ${(segRate * 100).toFixed(1)}%`);

// segment() returns a usable parse shape
const { reverse: rev42 } = languages.get(42);
const sampleEntry = languages.get(42).language.lexicon.getEntries()
  .find(e => e.class === 'noun' && e.paradigm?.forms && Object.keys(e.paradigm.forms).length > 1);
const sampleForm = Object.values(sampleEntry.paradigm.forms).find(f => f !== sampleEntry.lemma)
  || sampleEntry.lemma;
const sampleSeg = rev42.segment(sampleForm);
check('segment() returns {stem, lemma, gloss, affixes[], confidence}',
  typeof sampleSeg.stem === 'string' && typeof sampleSeg.confidence === 'number' &&
  Array.isArray(sampleSeg.affixes) && sampleSeg.lemma === sampleEntry.lemma,
  `${sampleForm} -> ${sampleSeg.stem}+[${sampleSeg.affixes.map(a => a.form).join(',')}]`);

// ---------------------------------------------------------------------
// 3. unknown words
// ---------------------------------------------------------------------

console.log('\n=== 3. Unknown word handling ===');

{
  const { reverse } = languages.get(42);
  let threw = false;
  let res = null;
  try {
    res = reverse.translateToEnglish('zzzqqqxxx');
  } catch {
    threw = true;
  }
  check('made-up word does not throw', !threw);
  check('made-up word lands in unknownWords',
    !!res && res.unknownWords.includes('zzzqqqxxx'), JSON.stringify(res?.unknownWords));
  check('unknown word is marked in output',
    !!res && res.english.includes('‹zzzqqqxxx›'), res?.english);

  // mixed known + unknown
  const known = reverse.roundTrip('The warrior sees the mountain.').conlang.split(' ');
  const mixed = reverse.translateToEnglish(`${known[0]} zzzqqqxxx ${known.slice(1).join(' ')}`);
  check('mixed known/unknown sentence still decodes known words',
    mixed.english.toLowerCase().includes('warrior') && mixed.unknownWords.length === 1,
    mixed.english);
}

// ---------------------------------------------------------------------
// 4. multi-sentence + punctuation
// ---------------------------------------------------------------------

console.log('\n=== 4. Multi-sentence and punctuation ===');

{
  const { reverse } = languages.get(7);
  const c1 = reverse.roundTrip('The warrior sees the mountain.').conlang;
  const c2 = reverse.roundTrip('The woman ate the bread.').conlang;
  const c3 = reverse.roundTrip('Do you see the star?').conlang;

  let threw = false;
  let res = null;
  try {
    res = reverse.translateToEnglish(`${c1}. ${c2}! ${c3}?`);
  } catch (e) {
    threw = true;
    console.log('  threw:', e.message);
  }
  check('multi-sentence input does not throw', !threw);
  const sentenceCount = res ? (res.english.match(/[.!?]/g) || []).length : 0;
  check('produces per-sentence output (3 sentences)',
    !!res && sentenceCount === 3 && res.gloss.split('\n\n').length === 3,
    res?.english);
  check('question punctuation is preserved', !!res && res.english.trim().endsWith('?'), res?.english);

  // stray commas/quotes should not break tokenization
  let threw2 = false;
  try {
    reverse.translateToEnglish(`"${c1}", (${c2});`);
  } catch {
    threw2 = true;
  }
  check('quotes/commas/parens do not throw', !threw2);
}

// ---------------------------------------------------------------------
// 5. API shape
// ---------------------------------------------------------------------

console.log('\n=== 5. API shape ===');

{
  const { reverse } = languages.get(12345);
  const conlang = reverse.roundTrip('The warrior sees the mountain.').conlang;
  const res = reverse.translateToEnglish(conlang);
  check('translateToEnglish returns {source, english, gloss, words, unknownWords}',
    res.source === conlang && typeof res.english === 'string' &&
    typeof res.gloss === 'string' && Array.isArray(res.words) && Array.isArray(res.unknownWords));
  const w = res.words[0];
  check('words[] entries have {surface, parse:{stem,lemma,gloss,affixes}, confidence}',
    !!w && typeof w.surface === 'string' && typeof w.confidence === 'number' &&
    !!w.parse && 'stem' in w.parse && 'lemma' in w.parse && 'gloss' in w.parse &&
    Array.isArray(w.parse.affixes));
  check('gloss is a 3-line interlinear block', res.gloss.split('\n').length === 3);

  const rt = reverse.roundTrip('I see you.');
  check('roundTrip returns {english, conlang, back, lexicalMatchRate}',
    typeof rt.english === 'string' && typeof rt.conlang === 'string' &&
    typeof rt.back === 'string' && typeof rt.lexicalMatchRate === 'number');

  console.log('\n  --- sample interlinear gloss ---');
  console.log(res.gloss.split('\n').map(l => '  ' + l).join('\n'));
}

// ---------------------------------------------------------------------
// summary
// ---------------------------------------------------------------------

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
process.exitCode = failed === 0 ? 0 : 1;
