/**
 * GLOSSOPETRAE - Seed + Divergence Interaction Tests
 * Verifies determinism and proper RNG handling with Linguistic Drift
 */

import { Glossopetrae } from './src/Glossopetrae.js';

console.log('=== Seed + Divergence Interaction Tests ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name} - FAILED`);
      failed++;
    }
  } catch (e) {
    console.log(`✗ ${name} - ERROR: ${e.message}`);
    failed++;
  }
}

// Test 1: Same seed + same divergence = identical language
console.log('\n--- Test 1: Determinism (same seed + same divergence) ---');
const langA1 = new Glossopetrae({ seed: 12345, divergenceFromEnglish: 0.3 }).generate();
const langA2 = new Glossopetrae({ seed: 12345, divergenceFromEnglish: 0.3 }).generate();

test('Same name', () => langA1.name === langA2.name);
test('Same morphology type', () => langA1.morphology.type === langA2.morphology.type);
test('Same word order', () => langA1.morphology.wordOrder.basic === langA2.morphology.wordOrder.basic);
test('Same case count', () =>
  langA1.morphology.nominal.caseSystem.cases.length === langA2.morphology.nominal.caseSystem.cases.length);
test('Same consonant count', () => langA1.phonology.consonants.length === langA2.phonology.consonants.length);
test('Same first lexicon entry', () => langA1.lexicon.entries[0].form === langA2.lexicon.entries[0].form);

// Test 2: Same seed + different divergence = different characteristics
console.log('\n--- Test 2: Different divergence changes output ---');
const langLow = new Glossopetrae({ seed: 99999, divergenceFromEnglish: 0.1 }).generate();
const langHigh = new Glossopetrae({ seed: 99999, divergenceFromEnglish: 0.9 }).generate();

console.log(`  Low divergence:  ${langLow.morphology.type}, ${langLow.morphology.wordOrder.basic}, ${langLow.morphology.nominal.caseSystem.cases.length} cases`);
console.log(`  High divergence: ${langHigh.morphology.type}, ${langHigh.morphology.wordOrder.basic}, ${langHigh.morphology.nominal.caseSystem.cases.length} cases`);

test('Different morphology types (or at least one is as expected)', () => {
  // Low divergence should lean towards isolating, high towards polysynthetic
  const lowIsSimpler = langLow.morphology.type === 'isolating' || langLow.morphology.type === 'fusional';
  const highIsComplex = langHigh.morphology.type === 'polysynthetic' || langHigh.morphology.type === 'agglutinative';
  return lowIsSimpler || highIsComplex || langLow.morphology.type !== langHigh.morphology.type;
});

test('Low divergence has fewer cases than high', () =>
  langLow.morphology.nominal.caseSystem.cases.length <= langHigh.morphology.nominal.caseSystem.cases.length);

test('Low divergence has SVO (or simpler word order)', () =>
  langLow.morphology.wordOrder.basic === 'SVO' || langLow.morphology.wordOrder.basic === 'VSO');

// Test 3: Different seeds = different languages (with same divergence)
console.log('\n--- Test 3: Different seeds produce different languages ---');
const langS1 = new Glossopetrae({ seed: 11111, divergenceFromEnglish: 0.5 }).generate();
const langS2 = new Glossopetrae({ seed: 22222, divergenceFromEnglish: 0.5 }).generate();

test('Different names', () => langS1.name !== langS2.name);
test('At least one structural difference', () => {
  return langS1.morphology.type !== langS2.morphology.type ||
         langS1.morphology.wordOrder.basic !== langS2.morphology.wordOrder.basic ||
         langS1.phonology.consonants.length !== langS2.phonology.consonants.length;
});

// Test 4: Divergence null vs 0 behavior
console.log('\n--- Test 4: Divergence null vs explicit 0% ---');
const langNoDiv = new Glossopetrae({ seed: 55555 }).generate();
const langZeroDiv = new Glossopetrae({ seed: 55555, divergenceFromEnglish: 0 }).generate();

console.log(`  No divergence:   ${langNoDiv.morphology.type}, ${langNoDiv.morphology.wordOrder.basic}`);
console.log(`  Zero divergence: ${langZeroDiv.morphology.type}, ${langZeroDiv.morphology.wordOrder.basic}`);

test('Zero divergence produces English-like features', () =>
  langZeroDiv.morphology.type === 'isolating' && langZeroDiv.morphology.wordOrder.basic === 'SVO');

test('Null divergence uses random (may differ from zero)', () => {
  // With null divergence, the system picks randomly, so it might not be SVO/isolating
  // This test just verifies the language was generated
  return langNoDiv.name && langNoDiv.morphology && langNoDiv.phonology;
});

// Test 5: RNG consumption consistency
console.log('\n--- Test 5: RNG consumption is consistent ---');
// Run same config multiple times to verify determinism
const configs = [
  { seed: 77777, divergenceFromEnglish: 0.25 },
  { seed: 77777, divergenceFromEnglish: 0.25 },
  { seed: 77777, divergenceFromEnglish: 0.25 },
];

const results = configs.map(c => new Glossopetrae(c).generate());
test('Three identical runs produce identical names', () =>
  results[0].name === results[1].name && results[1].name === results[2].name);
test('Three identical runs produce identical lexicons', () =>
  results[0].lexicon.entries.length === results[1].lexicon.entries.length &&
  results[0].lexicon.entries[10].form === results[1].lexicon.entries[10].form);

// Test 6: Edge cases
console.log('\n--- Test 6: Edge cases ---');
test('Divergence 0.0 works', () => {
  const lang = new Glossopetrae({ seed: 1, divergenceFromEnglish: 0.0 }).generate();
  return lang.name && lang.divergence.target === 0;
});

test('Divergence 1.0 works', () => {
  const lang = new Glossopetrae({ seed: 1, divergenceFromEnglish: 1.0 }).generate();
  return lang.name && lang.divergence.target === 1;
});

test('Divergence 0.5 works', () => {
  const lang = new Glossopetrae({ seed: 1, divergenceFromEnglish: 0.5 }).generate();
  return lang.name && lang.divergence.target === 0.5;
});

test('Very large seed works', () => {
  const lang = new Glossopetrae({ seed: 9999999999999, divergenceFromEnglish: 0.5 }).generate();
  return lang.name && lang.morphology;
});

test('String seed (hashed) works', () => {
  const lang = Glossopetrae.fromString('my-secret-key', { divergenceFromEnglish: 0.5 }).generate();
  return lang.name && lang.morphology;
});

// Summary
console.log('\n===========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('===========================================');

if (failed > 0) {
  process.exit(1);
}
