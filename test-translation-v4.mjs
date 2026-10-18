/**
 * GLOSSOPETRAE - Translation Engine v4 Tests
 * Tests: passive voice, modals, time expressions, reflexives,
 * comparatives/superlatives, degree adverbs, unknown word handling
 */

import { Glossopetrae } from './src/Glossopetrae.js';

console.log('=== Translation Engine v4 Tests ===\n');

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
// Test Suite 1: Passive Voice
// ============================================
console.log('--- 1. Passive Voice ---');
test("Simple passive (was seen)", () => {
  const r = translate("The man was seen.");
  return r && r.target && r.target.length > 0;
});

test("Passive with agent (was seen by)", () => {
  const r = translate("The man was seen by the woman.");
  return r && r.target && r.target.length > 0;
});

test("Past participle passive (has been eaten)", () => {
  const r = translate("The food has been eaten.");
  return r && r.target && r.target.length > 0;
});

test("Passive with past participle verb", () => {
  const r = translate("The house was built by the man.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 2: Modal Verbs
// ============================================
console.log('\n--- 2. Modal Verbs ---');
test("Can + verb", () => {
  const r = translate("The man can see the bird.");
  return r && r.target && r.target.length > 0;
});

test("Could + verb", () => {
  const r = translate("She could hear the music.");
  return r && r.target && r.target.length > 0;
});

test("May + verb", () => {
  const r = translate("They may go to the mountain.");
  return r && r.target && r.target.length > 0;
});

test("Might + verb", () => {
  const r = translate("I might see you tomorrow.");
  return r && r.target && r.target.length > 0;
});

test("Must + verb", () => {
  const r = translate("The warrior must fight the enemy.");
  return r && r.target && r.target.length > 0;
});

test("Should + verb", () => {
  const r = translate("You should eat the food.");
  return r && r.target && r.target.length > 0;
});

test("Will + verb", () => {
  const r = translate("The king will give the sword.");
  return r && r.target && r.target.length > 0;
});

test("Would + verb", () => {
  const r = translate("I would go to the house.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 3: Time Expressions
// ============================================
console.log('\n--- 3. Time Expressions ---');
test("Yesterday", () => {
  const r = translate("Yesterday the man saw the bird.");
  return r && r.target && r.target.length > 0;
});

test("Today", () => {
  const r = translate("Today I eat the food.");
  return r && r.target && r.target.length > 0;
});

test("Tomorrow", () => {
  const r = translate("Tomorrow we will go to the mountain.");
  return r && r.target && r.target.length > 0;
});

test("Now", () => {
  const r = translate("Now the woman sees the child.");
  return r && r.target && r.target.length > 0;
});

test("Always", () => {
  const r = translate("The king always gives gold.");
  return r && r.target && r.target.length > 0;
});

test("Never", () => {
  const r = translate("I never see the enemy.");
  return r && r.target && r.target.length > 0;
});

test("Often", () => {
  const r = translate("She often goes to the house.");
  return r && r.target && r.target.length > 0;
});

test("Sometimes", () => {
  const r = translate("Sometimes the bird sings.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 4: Reflexive Pronouns
// ============================================
console.log('\n--- 4. Reflexive Pronouns ---');
test("Myself", () => {
  const r = translate("I see myself.");
  return r && r.target && r.target.length > 0;
});

test("Yourself", () => {
  const r = translate("You hurt yourself.");
  return r && r.target && r.target.length > 0;
});

test("Himself", () => {
  const r = translate("The man sees himself.");
  return r && r.target && r.target.length > 0;
});

test("Herself", () => {
  const r = translate("The woman knows herself.");
  return r && r.target && r.target.length > 0;
});

test("Themselves", () => {
  const r = translate("They hurt themselves.");
  return r && r.target && r.target.length > 0;
});

test("Ourselves", () => {
  const r = translate("We see ourselves.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 5: Comparative/Superlative
// ============================================
console.log('\n--- 5. Comparative/Superlative ---');
test("Bigger", () => {
  const r = translate("The man is bigger.");
  return r && r.target && r.target.length > 0;
});

test("Biggest", () => {
  const r = translate("The king is the biggest.");
  return r && r.target && r.target.length > 0;
});

test("Better", () => {
  const r = translate("This sword is better.");
  return r && r.target && r.target.length > 0;
});

test("Best", () => {
  const r = translate("The warrior is the best.");
  return r && r.target && r.target.length > 0;
});

test("Older", () => {
  const r = translate("The woman is older than the man.");
  return r && r.target && r.target.length > 0;
});

test("Strongest", () => {
  const r = translate("The king is the strongest.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 6: Degree Adverbs
// ============================================
console.log('\n--- 6. Degree Adverbs ---');
test("Very", () => {
  const r = translate("The man is very big.");
  return r && r.target && r.target.length > 0;
});

test("Extremely", () => {
  const r = translate("The enemy is extremely strong.");
  return r && r.target && r.target.length > 0;
});

test("Quite", () => {
  const r = translate("The house is quite old.");
  return r && r.target && r.target.length > 0;
});

test("Completely", () => {
  const r = translate("The food is completely gone.");
  return r && r.target && r.target.length > 0;
});

test("Almost", () => {
  const r = translate("I almost see the bird.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 7: Unknown Word Handling
// ============================================
console.log('\n--- 7. Unknown Word Handling ---');
test("Unknown noun gets transliterated", () => {
  const r = translate("The zorbax sees the woman.");
  // Should not crash and should produce something
  return r && r.target && r.target.length > 0;
});

test("Unknown verb gets transliterated", () => {
  const r = translate("The man blixifies the food.");
  return r && r.target && r.target.length > 0;
});

test("Technical term handling", () => {
  const r = translate("The computer processes the data.");
  return r && r.target && r.target.length > 0;
});

test("Mixed known and unknown", () => {
  const r = translate("The man and the glorpnax went to the house.");
  return r && r.target && r.target.length > 0;
});

// ============================================
// Test Suite 8: Complex Combinations
// ============================================
console.log('\n--- 8. Complex Combinations ---');
test("Modal + passive", () => {
  const r = translate("The food can be eaten by the man.");
  return r && r.target && r.target.length > 0;
});

test("Time + modal + verb", () => {
  const r = translate("Tomorrow I must see the king.");
  return r && r.target && r.target.length > 0;
});

test("Degree + comparative", () => {
  const r = translate("The man is very much bigger.");
  return r && r.target && r.target.length > 0;
});

test("Time + reflexive", () => {
  const r = translate("Yesterday I hurt myself.");
  return r && r.target && r.target.length > 0;
});

test("Modal + negation + time", () => {
  const r = translate("Tomorrow I cannot see the enemy.");
  return r && r.target && r.target.length > 0;
});

test("Full complex sentence", () => {
  const r = translate("Yesterday the old king could not see himself because he was very tired.");
  return r && r.target && r.target.length > 10;
});

test("Multiple modals and time", () => {
  const r = translate("Tomorrow the warrior must fight and he should win.");
  return r && r.target && r.target.length > 10;
});

test("Passive with time and agent", () => {
  const r = translate("Yesterday the food was eaten by the children.");
  return r && r.target && r.target.length > 5;
});

// Summary
console.log('\n===========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('===========================================');

if (failed > 0) {
  process.exit(1);
}
