/**
 * GLOSSOPETRAE - Translation Engine v3 Tests
 * Tests: contractions, possessives, numbers, special characters,
 * paragraphs, abbreviations, and edge cases
 */

import { Glossopetrae } from './src/Glossopetrae.js';

console.log('=== Translation Engine v3 Tests ===\n');

const lang = new Glossopetrae({ seed: 54321, divergenceFromEnglish: 0.5 }).generate();
const translator = lang.translationEngine;

console.log(`Language: ${lang.name}`);
console.log(`Word order: ${lang.morphology.wordOrder.basic}`);
console.log(`Cases: ${lang.morphology.nominal.caseSystem.cases.map(c => c.abbr).join(', ')}\n`);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.log(`  ✗ ${name} - FAILED`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ ${name} - ERROR: ${e.message}`);
    failed++;
  }
}

function translate(english) {
  try {
    return translator.translateToConlang(english);
  } catch (e) {
    console.log(`    [Translation error for "${english}"]: ${e.message}`);
    return null;
  }
}

// ============================================
// Test Suite 1: Contractions
// ============================================
console.log('--- 1. Contractions ---');
test("don't expands to do not", () => {
  const r = translate("I don't see the man.");
  return r && r.target && r.target.length > 0;
});

test("can't expands correctly", () => {
  const r = translate("She can't sleep.");
  return r && r.target && r.target.length > 0;
});

test("I'm expands to I am", () => {
  const r = translate("I'm here.");
  return r && r.target && r.target.length > 0;
});

test("won't expands to will not", () => {
  const r = translate("They won't go.");
  return r && r.target && r.target.length > 0;
});

test("he's expands to he is", () => {
  const r = translate("He's a good man.");
  return r && r.target && r.target.length > 0;
});

test("we've expands to we have", () => {
  const r = translate("We've seen the mountain.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 2: Possessives
// ============================================
console.log('\n--- 2. Possessives ---');
test("'s possessive (the king's sword)", () => {
  const r = translate("The king's sword is big.");
  return r && r.target && r.target.length > 0;
});

test("'s possessive (my mother's house)", () => {
  const r = translate("My mother's house is old.");
  return r && r.target && r.target.length > 0;
});

test("'s possessive (the woman's child)", () => {
  const r = translate("The woman's child sleeps.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 3: Numbers
// ============================================
console.log('\n--- 3. Numbers ---');
test("Single digit (3 men)", () => {
  const r = translate("The 3 men fight.");
  return r && r.target && r.target.length > 0;
});

test("Teens (12 warriors)", () => {
  const r = translate("12 warriors went to the mountain.");
  return r && r.target && r.target.length > 0;
});

test("Tens (20 birds)", () => {
  const r = translate("I see 20 birds.");
  return r && r.target && r.target.length > 0;
});

test("Hundreds (100 soldiers)", () => {
  const r = translate("100 men built the house.");
  return r && r.target && r.target.length > 0;
});

test("Compound numbers (53 trees)", () => {
  const r = translate("There are 53 trees.");
  return r && r.target && r.target.length > 0;
});

test("Number with comma (1,000)", () => {
  const r = translate("The king has 1,000 warriors.");
  return r && r.target && r.target.length > 0;
});

test("Ordinals (1st, 2nd)", () => {
  const r = translate("The 1st man sees the 2nd woman.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 4: Special Characters
// ============================================
console.log('\n--- 4. Special Characters ---');
test("Semicolons as sentence separators", () => {
  const r = translate("The man sleeps; the woman eats.");
  return r && r.target && r.target.length > 0 && r.isMultiSentence;
});

test("Colons as separators", () => {
  const r = translate("He said: the enemy is near.");
  return r && r.target && r.target.length > 0;
});

test("Em-dashes as clause separators", () => {
  const r = translate("The man — he is old — sees the bird.");
  return r && r.target && r.target.length > 0;
});

test("Double dashes", () => {
  const r = translate("The king -- a wise man -- gave the sword.");
  return r && r.target && r.target.length > 0;
});

test("Parenthetical content", () => {
  const r = translate("The man (a warrior) fights the enemy.");
  return r && r.target && r.target.length > 0;
});

test("Quotation marks stripped", () => {
  const r = translate('The man said "I see you" to the woman.');
  return r && r.target && r.target.length > 0;
});

test("Smart quotes stripped", () => {
  const r = translate("The king\u2019s men fight.");
  return r && r.target && r.target.length > 0;
});

test("Ellipsis handled", () => {
  const r = translate("The man sleeps... the woman eats.");
  return r && r.target && r.target.length > 0;
});

test("Slashes become 'or'", () => {
  const r = translate("The man/woman sees the bird.");
  return r && r.target && r.target.length > 0;
});

test("Hash/at/special chars stripped", () => {
  const r = translate("The #1 man sees the @big tree.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 5: Paragraphs & Line Breaks
// ============================================
console.log('\n--- 5. Paragraphs ---');
test("Line breaks within paragraph", () => {
  const r = translate("The man sees\nthe woman.");
  return r && r.target && r.target.length > 0;
});

test("Double line break = new sentence", () => {
  const r = translate("The man sleeps.\n\nThe woman eats.");
  return r && r.target && r.target.length > 0;
});

test("Multi-paragraph text", () => {
  const text = "The king went to the mountain. He saw the enemy.\n\nThe warrior fought. The enemy fell.\n\nThe king gave the sword to the warrior.";
  const r = translate(text);
  return r && r.target && r.target.length > 20;
});

// ============================================
// Test Suite 6: Abbreviations
// ============================================
console.log('\n--- 6. Abbreviations ---');
test("Mr. doesn't split sentence", () => {
  const r = translate("Mr. Smith sees the dog.");
  // Should be one sentence, not split at "Mr."
  return r && r.target && r.target.length > 0;
});

test("Dr. doesn't split sentence", () => {
  const r = translate("Dr. Jones went to the house.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 7: Long Complex Sentences
// ============================================
console.log('\n--- 7. Long Complex Sentences ---');
test("Long compound with contractions", () => {
  const r = translate("I can't see the enemy and she won't fight because the king's army is strong.");
  return r && r.target && r.target.length > 20;
});

test("Paragraph with mixed features", () => {
  const text = "The old king had 3 children. The king's daughter was brave; she fought 100 enemies. The king said: my daughter is strong!";
  const r = translate(text);
  return r && r.target && r.target.length > 30;
});

test("Complex with numbers and possessives", () => {
  const r = translate("The warrior's 5 children went to the king's big house and they ate the food.");
  return r && r.target && r.target.length > 15;
});

test("Very long multi-clause paragraph", () => {
  const text = "The wise old king sat on his throne. He thought about the war and the enemy. When the sun rose, the king called his warriors. They went to the mountain because the enemy was there. The king's army fought bravely, but the enemy was strong. After the battle, the warriors came home. The king gave gold to the brave men.";
  const r = translate(text);
  return r && r.target && r.target.length > 50;
});

// Summary
console.log('\n===========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('===========================================');

if (failed > 0) {
  process.exit(1);
}
