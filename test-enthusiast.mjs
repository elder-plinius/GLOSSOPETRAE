/**
 * GLOSSOPETRAE Enthusiast Modules Test Suite
 * Tests TextLibrary, NameForge and Exporter.
 *
 * Run with: node test-enthusiast.mjs
 * Side effect: writes grammar-preview.html (seed 42) to the repo root.
 */

import { writeFileSync } from 'node:fs';
import { Glossopetrae } from './src/Glossopetrae.js';
import { TextLibrary } from './src/modules/TextLibrary.js';
import { NameForge } from './src/modules/NameForge.js';
import { Exporter } from './src/modules/Exporter.js';

console.log('================================================');
console.log('  GLOSSOPETRAE - Enthusiast Modules Test Suite');
console.log('================================================\n');

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`);
  }
}

/** Quote-aware split of one semicolon-separated CSV line. */
function splitAnkiLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else if (ch === '"' && current === '') {
      inQuotes = true;
    } else if (ch === ';') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// Silence the generator's progress logging during language construction.
function quietGenerate(seed) {
  const orig = console.log;
  console.log = () => {};
  try {
    return Glossopetrae.quick(seed);
  } finally {
    console.log = orig;
  }
}

const lang42 = quietGenerate(42);
const lang7 = quietGenerate(7);

// ============================================
// 1. TextLibrary
// ============================================
console.log('--- TextLibrary ---');

const EXPECTED_TEXT_IDS = ['babel', 'northwind', 'udhr1', 'schleicher', 'colorless', 'pliny'];

for (const [seed, lang] of [[42, lang42], [7, lang7]]) {
  const library = new TextLibrary(lang);

  const listing = library.list();
  check(`seed ${seed}: list() has 6 texts`, listing.length === 6);
  check(
    `seed ${seed}: list() ids are canonical`,
    EXPECTED_TEXT_IDS.every((id) => listing.some((t) => t.id === id)),
  );
  check(
    `seed ${seed}: list() sentenceCounts positive`,
    listing.every((t) => Number.isInteger(t.sentenceCount) && t.sentenceCount > 0),
  );

  const texts = library.getTexts();
  check(`seed ${seed}: getTexts() returns 6 texts`, texts.length === 6);

  for (const text of texts) {
    const total = text.lines.length;
    const ok = text.lines.filter(
      (l) => !l.error && l.conlang && typeof l.gloss === 'string' && l.gloss.trim().length > 0,
    );
    const rate = ok.length / total;
    check(
      `seed ${seed}: "${text.id}" >= 80% sentences translated (${ok.length}/${total})`,
      rate >= 0.8,
      text.lines.filter((l) => l.error).map((l) => l.error).join(' | '),
    );
    check(
      `seed ${seed}: "${text.id}" english source preserved`,
      text.english.length === total && text.lines.every((l, i) => l.english === text.english[i]),
    );
  }

  const babel = library.getText('babel');
  check(`seed ${seed}: getText('babel') works`, !!babel && babel.id === 'babel');
  check(`seed ${seed}: getText('nope') returns null`, library.getText('nope') === null);
}

// Honest success-rate report
{
  const library = new TextLibrary(lang42);
  console.log('\n  Translation success per text (seed 42):');
  for (const text of library.getTexts()) {
    const ok = text.lines.filter((l) => !l.error).length;
    console.log(`    ${text.id.padEnd(11)} ${ok}/${text.lines.length}`);
  }
  console.log();
}

// ============================================
// 2. NameForge
// ============================================
console.log('--- NameForge ---');

function isCapitalized(name) {
  for (const ch of name) {
    if (ch.toLowerCase() !== ch.toUpperCase()) {
      return ch === ch.toUpperCase();
    }
  }
  return false;
}

for (const [seed, lang] of [[42, lang42], [7, lang7]]) {
  const forge = new NameForge(lang);
  const persons = forge.generate('person', 20);
  const places = forge.generate('place', 20);

  check(`seed ${seed}: 20 person names generated`, persons.length === 20);
  check(`seed ${seed}: 20 place names generated`, places.length === 20);
  check(
    `seed ${seed}: all names non-empty strings`,
    [...persons, ...places].every((n) => typeof n.name === 'string' && n.name.length > 0),
  );
  check(
    `seed ${seed}: all names capitalized`,
    [...persons, ...places].every((n) => isCapitalized(n.name)),
    [...persons, ...places].filter((n) => !isCapitalized(n.name)).map((n) => n.name).join(', '),
  );
  check(
    `seed ${seed}: meanings reference real lexicon glosses`,
    [...persons, ...places].every(
      (n) =>
        n.components.length > 0 &&
        n.components.every((c) => {
          const entry = lang.lexicon.lookup(c.gloss);
          return !!entry && n.meaning.includes(c.gloss);
        }),
    ),
  );

  // Determinism: a fresh forge over the same language reproduces the batch.
  const forge2 = new NameForge(lang);
  const persons2 = forge2.generate('person', 20);
  const places2 = forge2.generate('place', 20);
  check(
    `seed ${seed}: deterministic (same seed -> same batches)`,
    JSON.stringify(persons) === JSON.stringify(persons2) &&
      JSON.stringify(places) === JSON.stringify(places2),
  );

  // Gendered and feature-targeted generation.
  const forge3 = new NameForge(lang);
  const female = forge3.personName({ gender: 'female', style: 'compound' });
  const male = forge3.personName({ gender: 'male', style: 'simple' });
  check(
    `seed ${seed}: gendered names well-formed`,
    isCapitalized(female.name) && isCapitalized(male.name) &&
      female.components.length === 2 && male.components.length === 1,
  );
  const river = forge3.placeName({ feature: 'river' });
  check(
    `seed ${seed}: placeName(river) carries feature + 2 components`,
    river.feature === 'river' && river.components.length === 2 && isCapitalized(river.name),
  );

  const endonym = forge3.nameLanguage();
  check(
    `seed ${seed}: nameLanguage() endonym "${endonym.name}" = "${endonym.meaning}"`,
    isCapitalized(endonym.name) && endonym.meaning.length > 0 && endonym.components.length > 0,
  );
}

{
  const forge = new NameForge(lang42);
  const sample = forge.generate('person', 5).map((n) => `${n.name} (${n.meaning})`);
  const placeSample = forge.generate('place', 3).map((n) => `${n.name} (${n.meaning})`);
  console.log('\n  Sample person names (seed 42): ' + sample.join(', '));
  console.log('  Sample place names  (seed 42): ' + placeSample.join(', ') + '\n');
}

// ============================================
// 3. Exporter
// ============================================
console.log('--- Exporter ---');

const exporter = new Exporter(lang42);

// --- Anki CSV ---
{
  const csv = exporter.toAnkiCSV({ deck: 'all', limit: 50 });
  const lines = csv.split('\n');
  check('AnkiCSV: header row present', lines[0] === 'front;back;tags');
  check('AnkiCSV: 2 cards per entry (50 entries -> 101 lines)', lines.length === 101);
  const parsed = lines.map(splitAnkiLine);
  check('AnkiCSV: every row has exactly 3 columns', parsed.every((f) => f.length === 3));
  check(
    'AnkiCSV: no empty fronts/backs',
    parsed.slice(1).every((f) => f[0].length > 0 && f[1].length > 0),
  );
  check(
    'AnkiCSV: tags include direction markers',
    parsed.slice(1).every((f) => /conlang-to-english|english-to-conlang/.test(f[2])),
  );

  const coreCsv = exporter.toAnkiCSV({ deck: 'core' });
  const coreLines = coreCsv.split('\n');
  check('AnkiCSV: core deck non-empty and smaller than full lexicon', coreLines.length > 1 &&
    coreLines.length < lang42.lexicon.entries.length * 2 + 1);
}

// --- Anki CSV escaping with hostile glosses ---
{
  const weird = {
    lemma: 'te;st"x',
    gloss: 'say "hello; world"\nloudly',
    class: 'verb',
    field: 'BasicVerbs',
  };
  const hostileLang = {
    ...lang42,
    lexicon: { ...lang42.lexicon, entries: [weird] },
  };
  const csv = new Exporter(hostileLang).toAnkiCSV({ deck: 'core' });
  // Re-join physical lines: the quoted newline keeps the record logically intact,
  // so parse the full text after the header as one record stream.
  const body = csv.slice(csv.indexOf('\n') + 1);
  const records = [];
  {
    let current = '';
    let inQuotes = false;
    for (const ch of body) {
      if (ch === '"') inQuotes = !inQuotes;
      if (ch === '\n' && !inQuotes) {
        records.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current) records.push(current);
  }
  check('AnkiCSV escaping: hostile entry yields 2 records', records.length === 2);
  const fields = splitAnkiLine(records[0].replace(/\n/g, '\n'));
  check(
    'AnkiCSV escaping: round-trips quotes, semicolons, newline',
    fields.length === 3 && fields[0] === weird.lemma && fields[1] === weird.gloss,
    JSON.stringify(fields),
  );
}

// --- Dictionary JSON ---
{
  const json = exporter.toDictionaryJSON();
  let parsed = null;
  try {
    parsed = JSON.parse(json);
  } catch {
    parsed = null;
  }
  check('DictionaryJSON: parses', !!parsed);
  check('DictionaryJSON: >= 1000 entries', !!parsed && parsed.entries.length >= 1000);
  check(
    'DictionaryJSON: meta carries name/seed/version',
    !!parsed && parsed.meta.name === lang42.name && parsed.meta.seed === 42 && !!parsed.meta.version,
  );
  check(
    'DictionaryJSON: deterministic (no generated date)',
    !!parsed && !('generated' in parsed.meta) && !('date' in parsed.meta) &&
      exporter.toDictionaryJSON() === json,
  );
  check(
    'DictionaryJSON: entries keep paradigms',
    !!parsed && parsed.entries.some((e) => e.paradigm && e.paradigm.forms),
  );
}

// --- Grammar HTML ---
{
  const html = exporter.toGrammarHTML();
  check('GrammarHTML: contains Phonology section', html.includes('Phonology'));
  check('GrammarHTML: contains Morphology section', html.includes('Morphology'));
  check('GrammarHTML: contains Dictionary section', html.includes('Dictionary'));
  check('GrammarHTML: contains Syntax section', html.includes('Syntax'));
  check('GrammarHTML: contains title page', html.includes(`A Grammar of ${lang42.name}`));
  check(
    'GrammarHTML: balanced <html> tags',
    (html.match(/<html/g) || []).length === 1 && (html.match(/<\/html>/g) || []).length === 1,
  );
  check(
    'GrammarHTML: balanced <table> tags',
    (html.match(/<table/g) || []).length === (html.match(/<\/table>/g) || []).length,
  );
  check("GrammarHTML: no '[object Object]'", !html.includes('[object Object]'));
  check("GrammarHTML: no 'undefined' strings", !html.includes('undefined'));
  check("GrammarHTML: no 'NaN' artifacts", !/\bNaN\b/.test(html));
  check('GrammarHTML: print stylesheet present', html.includes('@media print'));
  check('GrammarHTML: no external resources', !/src=|href=|url\(|@import/.test(html));

  // Also exercise a second seed for robustness.
  const html7 = new Exporter(lang7).toGrammarHTML();
  check(
    'GrammarHTML (seed 7): renders clean',
    html7.includes('Phonology') && !html7.includes('undefined') && !html7.includes('[object Object]'),
  );

  writeFileSync(new URL('./grammar-preview.html', import.meta.url), html, 'utf8');
  console.log('\n  Wrote grammar-preview.html (seed 42) for visual inspection.\n');
}

// --- Plain CSV ---
{
  const csv = exporter.toCSV();
  const lines = csv.split('\n');
  check(
    `PlainCSV: line count == lexicon size + 1 (${lines.length})`,
    lines.length === lang42.lexicon.entries.length + 1,
  );
  check('PlainCSV: header row', lines[0] === 'lemma,gloss,class,field');
}

// ============================================
// Summary
// ============================================
console.log('================================================');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('================================================');

process.exit(failed > 0 ? 1 : 0);
