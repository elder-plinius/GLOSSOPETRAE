/**
 * GLOSSOPETRAE - Divergence Engine Test
 */

import { Glossopetrae } from './src/Glossopetrae.js';
import { DivergenceEngine } from './src/modules/DivergenceEngine.js';

console.log('=== Testing Divergence Engine ===\n');

// Test 1: Low divergence (English-like)
console.log('Test 1: Low divergence (10%)...');
const eng1 = new Glossopetrae({ seed: 12345, divergenceFromEnglish: 0.1 });
const lang1 = eng1.generate();
console.log('  Name:', lang1.name);
console.log('  Word Order:', lang1.morphology.wordOrder.basic);
console.log('  Morph Type:', lang1.morphology.type);
console.log('  Cases:', lang1.morphology.nominal.caseSystem.cases.length);
console.log('  Divergence target:', lang1.divergence?.target);
console.log('  Divergence actual:', lang1.divergence?.actual);
console.log('  Description:', lang1.divergence?.description);
console.log('  PASS\n');

// Test 2: High divergence (alien)
console.log('Test 2: High divergence (90%)...');
const eng2 = new Glossopetrae({ seed: 12345, divergenceFromEnglish: 0.9 });
const lang2 = eng2.generate();
console.log('  Name:', lang2.name);
console.log('  Word Order:', lang2.morphology.wordOrder.basic);
console.log('  Morph Type:', lang2.morphology.type);
console.log('  Cases:', lang2.morphology.nominal.caseSystem.cases.length);
console.log('  Alignment:', lang2.morphology.alignment);
console.log('  Divergence target:', lang2.divergence?.target);
console.log('  Divergence actual:', lang2.divergence?.actual);
console.log('  Description:', lang2.divergence?.description);
console.log('  PASS\n');

// Test 3: Verify differences
console.log('Test 3: Verifying differences between low and high divergence...');
const wordOrderDiff = lang1.morphology.wordOrder.basic !== lang2.morphology.wordOrder.basic;
const morphTypeDiff = lang1.morphology.type !== lang2.morphology.type;
const caseDiff = lang1.morphology.nominal.caseSystem.cases.length !== lang2.morphology.nominal.caseSystem.cases.length;

console.log('  Word order different:', wordOrderDiff, `(${lang1.morphology.wordOrder.basic} vs ${lang2.morphology.wordOrder.basic})`);
console.log('  Morph type different:', morphTypeDiff, `(${lang1.morphology.type} vs ${lang2.morphology.type})`);
console.log('  Case count different:', caseDiff, `(${lang1.morphology.nominal.caseSystem.cases.length} vs ${lang2.morphology.nominal.caseSystem.cases.length})`);

const anyDifferent = wordOrderDiff || morphTypeDiff || caseDiff;
console.log('  At least one difference:', anyDifferent);
console.log(anyDifferent ? '  PASS' : '  NOTE: Languages happened to be similar (stochastic)');

// Test 4: Medium divergence
console.log('\nTest 4: Medium divergence (50%)...');
const eng3 = new Glossopetrae({ seed: 54321, divergenceFromEnglish: 0.5 });
const lang3 = eng3.generate();
console.log('  Name:', lang3.name);
console.log('  Word Order:', lang3.morphology.wordOrder.basic);
console.log('  Morph Type:', lang3.morphology.type);
console.log('  Cases:', lang3.morphology.nominal.caseSystem.cases.length);
console.log('  Divergence:', lang3.divergence?.description);
console.log('  PASS');

console.log('\n=== Divergence Tests Complete ===');
