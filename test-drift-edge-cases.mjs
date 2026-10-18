/**
 * GLOSSOPETRAE - Linguistic Drift Edge Case Tests
 * Comprehensive validation of drift feature accuracy
 */

import { Glossopetrae } from './src/Glossopetrae.js';

console.log('=== Linguistic Drift Edge Case Tests ===\n');

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

// Test 1: 0% drift should be maximally English-like
console.log('\n--- Test Suite 1: Minimal Drift (0%) ---');
const eng0 = new Glossopetrae({ seed: 42, divergenceFromEnglish: 0 });
const lang0 = eng0.generate();

test('0% drift: SVO word order', () => lang0.morphology.wordOrder.basic === 'SVO');
test('0% drift: Isolating morphology', () => lang0.morphology.type === 'isolating');
test('0% drift: Minimal cases (0-2)', () => lang0.morphology.nominal.caseSystem.cases.length <= 2);
test('0% drift: No tones', () => !lang0.prosody.hasTone);
test('0% drift: Stone includes drift info', () => lang0.stone.includes('Linguistic Drift'));
test('0% drift: Stone shows 0%', () => lang0.stone.includes('0%'));

// Test 2: 100% drift should be maximally exotic
console.log('\n--- Test Suite 2: Maximum Drift (100%) ---');
const eng100 = new Glossopetrae({ seed: 42, divergenceFromEnglish: 1.0 });
const lang100 = eng100.generate();

test('100% drift: Non-SVO word order', () => lang100.morphology.wordOrder.basic !== 'SVO');
test('100% drift: Non-isolating morphology', () => lang100.morphology.type !== 'isolating');
test('100% drift: Rich case system (6+)', () => lang100.morphology.nominal.caseSystem.cases.length >= 6);
test('100% drift: Stone includes drift info', () => lang100.stone.includes('Linguistic Drift'));
test('100% drift: Stone shows 100%', () => lang100.stone.includes('100%'));

// Test 3: Check exotic phonemes at high drift
console.log('\n--- Test Suite 3: Phoneme Inventory at High Drift ---');
// Run multiple seeds to check for exotic phonemes (stochastic)
let hasExoticPhoneme = false;
const exoticPhonemes = ['q', 'ɢ', 'ʔ', 'ħ', 'ʕ', 'ʈ', 'ɖ', 'ɬ', 'ɮ', 'pʼ', 'tʼ', 'kʼ', 'ɓ', 'ɗ', 'ǀ', 'ǃ'];
for (let seed = 1; seed <= 10; seed++) {
  const eng = new Glossopetrae({ seed: seed * 1000, divergenceFromEnglish: 0.95 });
  const lang = eng.generate();
  const consonantIPAs = lang.phonology.consonants.map(c => c.ipa);
  if (exoticPhonemes.some(p => consonantIPAs.includes(p))) {
    hasExoticPhoneme = true;
    break;
  }
}
test('High drift includes exotic phonemes (across 10 seeds)', () => hasExoticPhoneme);

// Test 4: Verify linguistic accuracy - morphological type correlates with case count
console.log('\n--- Test Suite 4: Linguistic Coherence ---');
const eng50 = new Glossopetrae({ seed: 999, divergenceFromEnglish: 0.5 });
const lang50 = eng50.generate();

test('Medium drift: Morphology type is valid', () =>
  ['isolating', 'agglutinative', 'fusional', 'polysynthetic'].includes(lang50.morphology.type));
test('Medium drift: Word order is valid', () =>
  ['SVO', 'SOV', 'VSO', 'VOS', 'OVS', 'OSV'].includes(lang50.morphology.wordOrder.basic));
test('Medium drift: Alignment is valid', () =>
  ['nominative-accusative', 'ergative-absolutive', 'active-stative', 'tripartite', 'neutral'].includes(lang50.morphology.alignment));

// Test 5: Verify syllable structure at extreme drift (forceSimple)
console.log('\n--- Test Suite 5: Syllable Structure at Extreme Drift ---');
// At 95%+ drift with the right RNG, forceSimple should kick in
let foundSimpleSyllables = false;
for (let seed = 1; seed <= 20; seed++) {
  const eng = new Glossopetrae({ seed: seed * 500, divergenceFromEnglish: 0.95 });
  const lang = eng.generate();
  // Check if syllable structure is simple (maxCoda = 0)
  if (lang.phonotactics.template.codaMax === 0) {
    foundSimpleSyllables = true;
    break;
  }
}
test('Extreme drift can produce CV-only syllables', () => foundSimpleSyllables);

// Test 6: Verify tones can be enabled at high drift
console.log('\n--- Test Suite 6: Tone System at High Drift ---');
let foundTones = false;
for (let seed = 1; seed <= 15; seed++) {
  const eng = new Glossopetrae({ seed: seed * 777, divergenceFromEnglish: 0.85 });
  const lang = eng.generate();
  if (lang.prosody.hasTone) {
    foundTones = true;
    break;
  }
}
test('High drift can produce tonal languages', () => foundTones);

// Test 7: Verify divergence scoring accuracy
console.log('\n--- Test Suite 7: Divergence Scoring ---');
test('Low drift has low actual score', () => lang0.divergence.actual < 0.3);
test('High drift has high actual score', () => lang100.divergence.actual > 0.5);
test('Actual score <= 1.0', () => lang100.divergence.actual <= 1.0);

// Test 8: Verify different seeds produce different languages
console.log('\n--- Test Suite 8: Seed Determinism with Drift ---');
const langA = new Glossopetrae({ seed: 12345, divergenceFromEnglish: 0.7 }).generate();
const langB = new Glossopetrae({ seed: 12345, divergenceFromEnglish: 0.7 }).generate();
const langC = new Glossopetrae({ seed: 54321, divergenceFromEnglish: 0.7 }).generate();

test('Same seed + drift = same language', () => langA.name === langB.name);
test('Different seeds = different languages', () => langA.name !== langC.name);

// Summary
console.log('\n===========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('===========================================');

if (failed > 0) {
  process.exit(1);
}
