/**
 * GLOSSOPETRAE Test Script
 * Run with: node test.mjs
 */

import { Glossopetrae, PRESETS } from './src/Glossopetrae.js';

console.log('========================================');
console.log('   GLOSSOPETRAE v3.0 - Test Suite');
console.log('========================================\n');

// Test 1: Basic generation
console.log('Test 1: Basic language generation...');
try {
  const lang1 = Glossopetrae.quick(12345);
  console.log(`  Created: ${lang1.name}`);
  console.log(`  Seed: ${lang1.seed}`);
  console.log(`  Consonants: ${lang1.phonology.consonants.length}`);
  console.log(`  Vowels: ${lang1.phonology.vowels.length}`);
  console.log(`  Lexicon entries: ${lang1.lexicon.stats.totalEntries}`);
  console.log('  PASS\n');
} catch (e) {
  console.log(`  FAIL: ${e.message}\n`);
}

// Test 2: Preset generation
console.log('Test 2: Preset (Turkic) generation...');
try {
  const engine = new Glossopetrae({ ...PRESETS.turkic, seed: 54321 });
  const lang2 = engine.generate();
  console.log(`  Created: ${lang2.name}`);
  console.log(`  Type: ${lang2.morphology.type}`);
  console.log(`  Word Order: ${lang2.morphology.wordOrder.basic}`);
  console.log(`  Cases: ${lang2.morphology.nominal.caseSystem.cases.length}`);
  console.log('  PASS\n');
} catch (e) {
  console.log(`  FAIL: ${e.message}\n`);
}

// Test 3: Stone document generation
console.log('Test 3: Stone document generation...');
try {
  const lang3 = Glossopetrae.quick(99999);
  const stone = lang3.stone;
  console.log(`  Stone length: ${stone.length} characters`);
  console.log(`  Contains phonology section: ${stone.includes('Phonology')}`);
  console.log(`  Contains morphology section: ${stone.includes('Morphology')}`);
  console.log(`  Contains lexicon section: ${stone.includes('Lexicon')}`);
  console.log('  PASS\n');
} catch (e) {
  console.log(`  FAIL: ${e.message}\n`);
}

// Test 4: Translation
console.log('Test 4: Translation engine...');
try {
  const lang4 = Glossopetrae.quick(11111);
  const translation = lang4.translationEngine.translateToConlang('The woman sees the dog.');
  console.log(`  English: "The woman sees the dog."`);
  console.log(`  ${lang4.name}: "${translation.target}"`);
  console.log('  PASS\n');
} catch (e) {
  console.log(`  FAIL: ${e.message}\n`);
}

// Test 5: Deterministic generation
console.log('Test 5: Deterministic generation (same seed = same language)...');
try {
  const langA = Glossopetrae.quick(77777);
  const langB = Glossopetrae.quick(77777);
  const match = langA.name === langB.name &&
                langA.phonology.consonants.length === langB.phonology.consonants.length &&
                langA.morphology.type === langB.morphology.type;
  console.log(`  Language A: ${langA.name}`);
  console.log(`  Language B: ${langB.name}`);
  console.log(`  Match: ${match}`);
  console.log(match ? '  PASS\n' : '  FAIL\n');
} catch (e) {
  console.log(`  FAIL: ${e.message}\n`);
}

// Test 6: Show sample lexicon
console.log('Test 6: Sample lexicon entries...');
try {
  const lang6 = Glossopetrae.quick(33333);
  const entries = lang6.lexicon.entries.slice(0, 10);
  console.log('  First 10 entries:');
  for (const entry of entries) {
    console.log(`    ${entry.lemma.padEnd(15)} = ${entry.gloss}`);
  }
  console.log('  PASS\n');
} catch (e) {
  console.log(`  FAIL: ${e.message}\n`);
}

console.log('========================================');
console.log('   All tests completed!');
console.log('========================================');
console.log('\nOpen index.html in a browser to use the web interface.');
