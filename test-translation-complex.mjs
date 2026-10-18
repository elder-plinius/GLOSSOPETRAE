/**
 * GLOSSOPETRAE - Complex Translation Tests
 * Tests compound sentences, subordinate clauses, coordinated NPs, and infinitives
 */

import { Glossopetrae } from './src/Glossopetrae.js';

console.log('=== Complex Translation Tests ===\n');

// Generate a language with known features for testing
const lang = new Glossopetrae({ seed: 54321, divergenceFromEnglish: 0.5 }).generate();
const translator = lang.translationEngine;

console.log(`Testing with language: ${lang.name}`);
console.log(`Word order: ${lang.morphology.wordOrder.basic}`);
console.log(`Morphology: ${lang.morphology.type}`);
console.log(`Cases: ${lang.morphology.nominal.caseSystem.cases.map(c => c.abbr).join(', ')}\n`);

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

function translateAndShow(english) {
  console.log(`\n  English: "${english}"`);
  try {
    const result = translator.translateToConlang(english);
    console.log(`  Target:  "${result.target}"`);
    console.log(`  Gloss:\n${result.gloss.split('\n').map(l => '    ' + l).join('\n')}`);
    return result;
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    return null;
  }
}

// Test 1: Simple sentences still work
console.log('\n--- Test 1: Simple Sentences (baseline) ---');
test('Simple SVO translates', () => {
  const result = translateAndShow('The man sees the woman.');
  return result && result.target && result.target.length > 0;
});

test('Pronoun sentence translates', () => {
  const result = translateAndShow('I see you.');
  return result && result.target && result.target.length > 0;
});

// Test 2: Multi-sentence input
console.log('\n--- Test 2: Multi-Sentence Input ---');
test('Two sentences translate separately', () => {
  const result = translateAndShow('The man sleeps. The woman eats.');
  return result && result.isMultiSentence && result.target.length > 0;
});

test('Three sentences with different punctuation', () => {
  const result = translateAndShow('The bird flies. Who sees the sun? The man runs!');
  return result && result.isMultiSentence;
});

// Test 3: Compound sentences
console.log('\n--- Test 3: Compound Sentences (and, or, but) ---');
test('Compound with AND', () => {
  const result = translateAndShow('The man works and the woman sings.');
  return result && result.target && result.target.length > 10;
});

test('Compound with BUT', () => {
  const result = translateAndShow('The child ran but the dog slept.');
  return result && result.target && result.target.length > 10;
});

test('Compound with OR', () => {
  const result = translateAndShow('The man eats or the man drinks.');
  return result && result.target && result.target.length > 10;
});

// Test 4: Coordinated NPs
console.log('\n--- Test 4: Coordinated Noun Phrases ---');
test('Coordinated subject', () => {
  const result = translateAndShow('The man and the woman see the star.');
  return result && result.target && result.target.length > 10;
});

test('Coordinated object', () => {
  const result = translateAndShow('The king gave gold and silver.');
  return result && result.target && result.target.length > 5;
});

// Test 5: Subordinate clauses
console.log('\n--- Test 5: Subordinate Clauses ---');
test('Because clause', () => {
  const result = translateAndShow('The man sleeps because he is tired.');
  return result && result.target && result.target.length > 10;
});

test('When clause', () => {
  const result = translateAndShow('When the sun rises the birds sing.');
  return result && result.target && result.target.length > 10;
});

test('If clause', () => {
  const result = translateAndShow('If you go I will follow.');
  return result && result.target && result.target.length > 5;
});

// Test 6: Infinitive phrases
console.log('\n--- Test 6: Infinitive Phrases ---');
test('Wants to + verb', () => {
  const result = translateAndShow('The man wants to eat.');
  return result && result.target && result.target.length > 5;
});

test('Needs to + verb', () => {
  const result = translateAndShow('She needs to sleep.');
  return result && result.target && result.target.length > 5;
});

test('Has to + verb with PP', () => {
  const result = translateAndShow('We have to go to the mountain.');
  return result && result.target && result.target.length > 5;
});

// Test 7: Complex combinations
console.log('\n--- Test 7: Complex Combinations ---');
test('Compound with adjectives', () => {
  const result = translateAndShow('The old king gave the sword to the young warrior and the warrior fought the enemy.');
  return result && result.target && result.target.length > 20;
});

test('Complement clause (that)', () => {
  const result = translateAndShow('I think that the woman knows the truth.');
  return result && result.target && result.target.length > 10;
});

test('Subordinate with cause', () => {
  const result = translateAndShow('The bird flew from the tree because the cat came.');
  return result && result.target && result.target.length > 10;
});

// Test 8: Stress test with very long sentence
console.log('\n--- Test 8: Stress Test ---');
test('Long complex sentence', () => {
  const result = translateAndShow('The wise old king gave the golden sword to the brave young warrior and the warrior went to the mountain where the enemy lived.');
  return result && result.target && result.target.length > 20;
});

test('Multiple clauses and coordination', () => {
  const result = translateAndShow('The man and the woman saw the bird and the dog ran because the cat came.');
  return result && result.target && result.target.length > 15;
});

// Summary
console.log('\n===========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('===========================================');

if (failed > 0) {
  process.exit(1);
}
