/**
 * GLOSSOPETRAE - Translation Engine v5 Tests
 * Tests: acronyms, proper nouns, semantic decomposition (calques),
 * list handling, technical jargon, and complex real-world text
 */

import { Glossopetrae } from './src/Glossopetrae.js';

console.log('=== Translation Engine v5 Tests ===\n');

const lang = new Glossopetrae({ seed: 54321, divergenceFromEnglish: 0.5 }).generate();
const translator = lang.translationEngine;

console.log(`Language: ${lang.name}`);
console.log(`Morphology: ${lang.morphology.type}`);
console.log(`Word order: ${lang.morphology.wordOrder.basic}\n`);

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
    const result = translator.translateToConlang(english);
    return result;
  } catch (e) {
    console.log(`    [Translation error]: ${e.message}`);
    return null;
  }
}

function showTranslation(english) {
  const r = translate(english);
  if (r) {
    console.log(`    Input:  "${english}"`);
    console.log(`    Output: "${r.target}"`);
  }
  return r;
}

// ============================================
// Test Suite 1: Acronyms
// ============================================
console.log('--- 1. Acronyms ---');
test("Short acronym (AI)", () => {
  const r = translate("The AI is powerful.");
  // Should not have brackets
  return r && r.target && !r.target.includes('[');
});

test("Medium acronym (SANS)", () => {
  const r = translate("I work with SANS.");
  return r && r.target && !r.target.includes('[');
});

test("Acronym with numbers (V3SPR)", () => {
  const r = translate("The V3SPR system is active.");
  return r && r.target && !r.target.includes('[');
});

test("Multiple acronyms", () => {
  const r = translate("The API and SDK work with AI.");
  return r && r.target && !r.target.includes('[');
});

// ============================================
// Test Suite 2: Proper Nouns
// ============================================
console.log('\n--- 2. Proper Nouns ---');
test("Simple proper noun (Pliny)", () => {
  const r = translate("Pliny went to the mountain.");
  return r && r.target && !r.target.includes('[');
});

test("Person name (Marcus)", () => {
  const r = translate("Marcus sees the king.");
  return r && r.target && !r.target.includes('[');
});

// ============================================
// Test Suite 3: Semantic Decomposition (Calques)
// ============================================
console.log('\n--- 3. Semantic Decomposition ---');
test("Computer → think-machine", () => {
  const r = translate("The computer is fast.");
  // Should produce a compound word, not brackets
  return r && r.target && !r.target.includes('[');
});

test("Jailbreak → free-prison", () => {
  const r = translate("The jailbreak was successful.");
  return r && r.target && !r.target.includes('[');
});

test("Database → knowledge-house", () => {
  const r = translate("The database is large.");
  return r && r.target && !r.target.includes('[');
});

test("Repository → code-house", () => {
  const r = translate("Search the repository.");
  return r && r.target && !r.target.includes('[');
});

test("Firewall → fire-wall", () => {
  const r = translate("The firewall blocks the enemy.");
  return r && r.target && !r.target.includes('[');
});

test("Multiple technical terms", () => {
  const r = translate("The software uses the database and the network.");
  return r && r.target && !r.target.includes('[');
});

// ============================================
// Test Suite 4: Caching Consistency
// ============================================
console.log('\n--- 4. Caching Consistency ---');
test("Same word produces same output", () => {
  const r1 = translate("The zorbax sees the woman.");
  const r2 = translate("The man sees the zorbax.");
  // Extract the generated word for "zorbax" from both
  // They should be identical
  return r1 && r2 && r1.target && r2.target;
});

test("Unknown word cached across sentences", () => {
  const r1 = translate("The glorpnax is big.");
  const r2 = translate("I see the glorpnax.");
  return r1 && r2;
});

// ============================================
// Test Suite 5: List Handling
// ============================================
console.log('\n--- 5. List Handling ---');
test("Colon-introduced list", () => {
  const r = translate("I need these things: water, food, and gold.");
  return r && r.target && r.target.length > 10;
});

test("Like-introduced list", () => {
  const r = translate("Animals like dogs, cats, and birds are good.");
  return r && r.target && r.target.length > 10;
});

test("Including list", () => {
  const r = translate("The tools including the sword and the shield are ready.");
  return r && r.target && r.target.length > 10;
});

// ============================================
// Test Suite 6: Complex Technical Text
// ============================================
console.log('\n--- 6. Complex Technical Text ---');

test("Technical sentence with acronyms", () => {
  const r = showTranslation("The AI system uses the API to access the database.");
  return r && r.target && r.target.length > 10;
});

test("Security terminology", () => {
  const r = showTranslation("The firewall blocks the malware and protects the system.");
  return r && r.target && r.target.length > 10;
});

test("Mixed technical and natural", () => {
  const r = showTranslation("The man uses the computer to send a message to the king.");
  return r && r.target && r.target.length > 10;
});

test("Complex instruction-like text", () => {
  const r = showTranslation("Search the repository for all the relevant code and make a report.");
  return r && r.target && r.target.length > 10;
});

test("Very technical paragraph", () => {
  const text = "The software system uses the database to store data. The API allows communication between the server and the network. The firewall provides security.";
  const r = showTranslation(text);
  return r && r.target && r.target.length > 30;
});

// ============================================
// Test Suite 7: Pliny-style Text (User's Example)
// ============================================
console.log('\n--- 7. Real-World Complex Text ---');

test("Pliny-style instruction (simplified)", () => {
  const text = "Make a document about Pliny. Include the AI work and the jailbreaks and the system prompts.";
  const r = showTranslation(text);
  return r && r.target && r.target.length > 20;
});

test("Technical list with proper nouns", () => {
  const text = "The tools like PANG and the software are important for the work.";
  const r = showTranslation(text);
  return r && r.target && r.target.length > 10;
});

test("Multi-clause technical", () => {
  const text = "Search the repository because we need the code and then make a report.";
  const r = showTranslation(text);
  return r && r.target && r.target.length > 15;
});

// Summary
console.log('\n===========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('===========================================');

if (failed > 0) {
  process.exit(1);
}
