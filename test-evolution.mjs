/**
 * GLOSSOPETRAE - Evolution Engine Test Suite
 * Diachronic sound change, etymologies, and language family derivation.
 */

import { Glossopetrae } from './src/Glossopetrae.js';
import { EvolutionEngine } from './src/modules/EvolutionEngine.js';

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
  }
}

console.log('========================================');
console.log('  EVOLUTION ENGINE TESTS');
console.log('========================================\n');

// ---------------------------------------------------------------------------
console.log('[1] Basic evolution');
const lang = Glossopetrae.quick(42);
const engine = new EvolutionEngine(lang);
const d1 = engine.evolve({ centuries: 6 });

assert(d1.name && d1.name.length >= 2, `descendant has a name (${d1.name})`);
assert(d1.changes.length >= 2, `applied ${d1.changes.length} sound changes (>= 2)`);
assert(d1.changes.every((c) => c.examples.length > 0), 'every change has examples');
assert(d1.lexicon.entries.length === lang.lexicon.entries.length, 'lexicon size preserved');
assert(d1.lexicon.entries.every((e) => e.lemma && e.lemma.length > 0), 'no empty lemmas');
assert(d1.etymologies.length > 0, `${d1.etymologies.length} words changed form`);
assert(typeof d1.summary === 'string' && d1.summary.includes(lang.name), 'summary mentions ancestor');

// ---------------------------------------------------------------------------
console.log('\n[2] Determinism');
const d1b = new EvolutionEngine(Glossopetrae.quick(42)).evolve({ centuries: 6 });
assert(d1.name === d1b.name, 'same seed -> same descendant name');
assert(
  JSON.stringify(d1.lexicon.entries.slice(0, 50)) === JSON.stringify(d1b.lexicon.entries.slice(0, 50)),
  'same seed -> identical evolved lexicon (first 50)'
);
assert(
  JSON.stringify(d1.changes.map((c) => c.id)) === JSON.stringify(d1b.changes.map((c) => c.id)),
  'same seed -> identical rule chain'
);

// ---------------------------------------------------------------------------
console.log('\n[3] Input language not mutated');
const before = JSON.stringify(lang.lexicon.entries.slice(0, 20));
new EvolutionEngine(lang).evolve({ centuries: 10, intensity: 'dramatic' });
assert(JSON.stringify(lang.lexicon.entries.slice(0, 20)) === before, 'proto lexicon untouched after evolve');

// ---------------------------------------------------------------------------
console.log('\n[4] Change count scales with time depth');
const shallow = new EvolutionEngine(lang).evolve({ centuries: 2, seed: 777 });
const deep = new EvolutionEngine(lang).evolve({ centuries: 12, seed: 777 });
assert(
  deep.changes.length >= shallow.changes.length,
  `12 centuries (${deep.changes.length} changes) >= 2 centuries (${shallow.changes.length})`
);

// ---------------------------------------------------------------------------
console.log('\n[5] Etymology chains are coherent');
const sampleEtym = d1.etymologies.slice(0, 30);
let chainsOk = true;
for (const e of sampleEtym) {
  if (!e.proto.startsWith('*')) chainsOk = false;
  if (e.chain.length > 0 && e.chain[e.chain.length - 1].form !== e.modern) chainsOk = false;
}
assert(chainsOk, 'chains start at *proto and end at modern form');
console.log('  Sample etymologies:');
for (const e of sampleEtym.slice(0, 5)) {
  console.log(`    ${e.proto} > ${e.chain.map((c) => c.form).join(' > ')} "${e.gloss}"`);
}

// ---------------------------------------------------------------------------
console.log('\n[6] Phonology consistency');
const phonSet = new Set([
  ...d1.phonology.consonants.map((c) => c.ipa),
  ...d1.phonology.vowels.map((v) => v.ipa),
]);
const romanKeys = new Set(Object.keys(d1.phonology.romanization));
assert([...phonSet].every((p) => romanKeys.has(p)), 'every phoneme has a romanization');
const romans = Object.values(d1.phonology.romanization);
assert(new Set(romans).size === romans.length, 'no romanization collisions');
console.log(`  gained: [${d1.phonology.gained.map((g) => g.ipa).join(' ')}], lost: [${d1.phonology.lost.join(' ')}]`);

// ---------------------------------------------------------------------------
console.log('\n[7] evolveWord closure');
const w = lang.lexicon.entries[50].lemma;
const evolved = d1.evolveWord(w);
assert(evolved === d1.lexicon.entries[50].lemma, `evolveWord matches lexicon evolution (${w} -> ${evolved})`);

// ---------------------------------------------------------------------------
console.log('\n[8] Language family derivation');
const family = new EvolutionEngine(lang).deriveFamily({ daughters: 3, centuries: 8 });
assert(family.daughters.length === 3, '3 daughters derived');
assert(new Set(family.daughters.map((d) => d.name)).size === 3, 'daughter names are distinct');

// Name-collision stress: large families across many seeds must stay unique,
// because the cognate table and family tree key on name.
let allFamiliesUnique = true;
for (const seed of [1, 2, 3, 100, 777, 1234, 9999]) {
  for (const dc of [4, 5, 6]) {
    const f = Glossopetrae.quick(seed).deriveFamily({ daughters: dc, centuries: 10, generations: 2 });
    const ns = f.daughters.map((d) => d.name);
    if (new Set(ns).size !== ns.length) allFamiliesUnique = false;
    if (f.cognates.some((r) => Object.keys(r.reflexes).length !== dc)) allFamiliesUnique = false;
  }
}
assert(allFamiliesUnique, 'daughter names unique + cognate columns intact across 21 families');
assert(family.cognates.length >= 20, `cognate table has ${family.cognates.length} rows (>= 20)`);
const divergent = family.cognates.filter((row) => {
  const forms = Object.values(row.reflexes);
  return new Set(forms).size > 1;
});
assert(
  divergent.length / family.cognates.length >= 0.3,
  `daughters diverge from each other (${divergent.length}/${family.cognates.length} cognate rows differ)`
);
assert(family.tree.children.length === 3, 'family tree has 3 branches');

console.log('  Sample cognate rows:');
for (const row of family.cognates.slice(0, 6)) {
  const refl = Object.entries(row.reflexes).map(([n, f]) => `${n}: ${f}`).join(' | ');
  console.log(`    "${row.gloss}"  ${row.proto}  ->  ${refl}`);
}

// ---------------------------------------------------------------------------
console.log('\n[9] Two-generation family');
const family2 = new EvolutionEngine(lang).deriveFamily({ daughters: 2, centuries: 8, generations: 2 });
const withKids = family2.daughters.find((d) => d.children && d.children.length > 0);
assert(!!withKids, 'first daughter has grandchildren');
assert(family2.tree.children.some((c) => c.children.length > 0), 'tree reflects second generation');

// ---------------------------------------------------------------------------
console.log('\n[10] Morphology evolution & mergers');
const dramatic = new EvolutionEngine(lang).evolve({ centuries: 12, intensity: 'dramatic', seed: 31337 });
assert(Array.isArray(dramatic.morphology.mergers), 'merger detection runs');
const caseList = dramatic.morphology.nominal?.caseSystem?.cases || [];
const erodedCases = caseList.filter((c) => c.protoSuffix !== undefined);
console.log(`  ${erodedCases.length} case suffixes eroded, ${dramatic.morphology.mergers.length} mergers detected`);
for (const m of dramatic.morphology.mergers.slice(0, 3)) console.log(`    merger: ${m.description}`);

// ---------------------------------------------------------------------------
console.log('\n[11] Multiple seeds & presets survive evolution');
let robust = true;
for (const seed of [7, 12345, 999, 31337]) {
  try {
    const l = Glossopetrae.quick(seed);
    const d = new EvolutionEngine(l).evolve({ centuries: 8 });
    if (!d.lexicon.entries.every((e) => e.lemma.length > 0)) robust = false;
  } catch (err) {
    console.log(`    seed ${seed} threw: ${err.message}`);
    robust = false;
  }
}
assert(robust, 'evolution robust across seeds 7, 12345, 999, 31337');

// ---------------------------------------------------------------------------
console.log('\n[12] Rule metadata');
const rules = EvolutionEngine.availableRules();
assert(rules.length >= 15, `${rules.length} rules available (>= 15)`);
assert(rules.every((r) => r.id && r.name && r.description), 'all rules have id/name/description');

// ---------------------------------------------------------------------------
console.log('\n========================================');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('========================================');
process.exit(failed > 0 ? 1 : 0);
