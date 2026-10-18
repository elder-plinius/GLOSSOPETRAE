/**
 * GLOSSOPETRAE - Exporter Module
 *
 * Gets a generated language OUT of the tool, in formats worldbuilders
 * and language learners actually use:
 *
 *   toAnkiCSV()        - semicolon-separated flashcards (conlang->english
 *                        and english->conlang), core vocabulary first
 *   toDictionaryJSON() - full machine-readable lexicon with paradigms
 *   toGrammarHTML()    - complete standalone printable reference grammar
 *                        ("A Grammar of X" monograph style)
 *   toCSV()            - plain lemma,gloss,class,field dump
 *
 * All methods return strings; nothing touches the DOM or filesystem.
 * Output is deterministic for a given language object (no timestamps).
 *
 * Zero dependencies. Pure ESM. Node >= 18 and browser safe.
 */

import { getConsonantManner } from '../data/phonemes.js';

/** Semantic fields considered "core vocabulary" for learning. */
const CORE_FIELDS = ['Pronouns', 'BasicVerbs', 'Body', 'Nature', 'Numbers'];

/** Canonical place-of-articulation column order for consonant grids. */
const PLACE_ORDER = [
  'bilabial', 'labiodental', 'dental', 'alveolar', 'postalveolar',
  'palatal', 'velar', 'uvular', 'glottal', 'labial-velar',
];

/** Canonical manner row order, with display labels. */
const MANNER_ORDER = [
  ['stops', 'Plosive'],
  ['nasals', 'Nasal'],
  ['affricates', 'Affricate'],
  ['fricatives', 'Fricative'],
  ['liquids', 'Liquid'],
  ['glides', 'Glide'],
];

/** Vowel chart axes. */
const HEIGHT_ORDER = ['close', 'near-close', 'close-mid', 'mid', 'open-mid', 'near-open', 'open'];
const BACKNESS_ORDER = ['front', 'central', 'back'];

/** Example sentences used in the syntax chapter. */
const SYNTAX_EXAMPLES = [
  'The woman sees the dog.',
  'The man gave the child a stone.',
  'The big wolf sleeps in the forest.',
  'I do not understand you.',
  'The king built a city near the river.',
  'The children will walk to the mountain.',
];

export class Exporter {
  /**
   * @param {object} language - A generated GLOSSOPETRAE language object.
   */
  constructor(language) {
    if (!language || !language.lexicon || !Array.isArray(language.lexicon.entries)) {
      throw new Error('Exporter requires a language with a lexicon');
    }
    this.language = language;
  }

  // ============================================
  // ANKI FLASHCARDS
  // ============================================

  /**
   * Export Anki-importable flashcards (semicolon-separated:
   * front;back;tags). Each lexical entry yields two cards:
   * conlang -> english and english -> conlang.
   *
   * @param {object} [opts]
   * @param {'core'|'all'} [opts.deck='core'] - 'core' restricts to the
   *   core semantic fields; 'all' exports everything, core fields first.
   * @param {number} [opts.limit] - Cap on the number of lexical entries
   *   (cards = 2 x entries).
   * @returns {string} CSV text with a front;back;tags header row.
   */
  toAnkiCSV(opts = {}) {
    const deck = opts.deck || 'core';
    const limit = Number.isFinite(opts.limit) ? opts.limit : Infinity;

    let entries = this._orderedEntries();
    if (deck === 'core') {
      entries = entries.filter((e) => CORE_FIELDS.includes(e.field));
    }
    entries = entries.filter((e) => e.lemma && e.gloss).slice(0, limit);

    const langTag = this._tagify(this.language.name || 'conlang');
    const lines = ['front;back;tags'];

    for (const entry of entries) {
      const fieldTag = this._tagify(entry.field || 'misc');
      const baseTags = `glossopetrae ${langTag} ${fieldTag}`;
      lines.push(
        [
          this._escapeAnki(entry.lemma),
          this._escapeAnki(entry.gloss),
          this._escapeAnki(`${baseTags} conlang-to-english`),
        ].join(';'),
      );
      lines.push(
        [
          this._escapeAnki(entry.gloss),
          this._escapeAnki(entry.lemma),
          this._escapeAnki(`${baseTags} english-to-conlang`),
        ].join(';'),
      );
    }

    return lines.join('\n');
  }

  // ============================================
  // DICTIONARY JSON
  // ============================================

  /**
   * Export the full lexicon (with paradigms) as pretty-printed JSON.
   * The metadata header carries name, seed and version only - no
   * generation date, so output is fully deterministic.
   *
   * @returns {string} JSON text.
   */
  toDictionaryJSON() {
    const lang = this.language;
    const entries = lang.lexicon.entries.map((e) => ({
      lemma: e.lemma,
      gloss: e.gloss,
      class: e.class || null,
      field: e.field || null,
      syllables: e.syllables ?? null,
      frequency: e.frequency || null,
      paradigm: e.paradigm || null,
    }));

    const doc = {
      meta: {
        name: lang.name || 'Unnamed',
        seed: lang.seed ?? null,
        version: lang.version || null,
        generator: 'GLOSSOPETRAE',
        entryCount: entries.length,
      },
      typology: {
        morphologicalType: this._morphTypeLabel(),
        wordOrder: this._wordOrder().basic || null,
        alignment: this._caseSystem().alignment || null,
        consonants: (lang.phonology?.consonants || []).length,
        vowels: (lang.phonology?.vowels || []).length,
      },
      entries,
    };

    return JSON.stringify(doc, null, 2);
  }

  // ============================================
  // PLAIN CSV
  // ============================================

  /**
   * Export the whole lexicon as plain comma-separated values:
   * lemma,gloss,class,field (one header row + one row per entry).
   *
   * @returns {string} CSV text without a trailing newline.
   */
  toCSV() {
    const lines = ['lemma,gloss,class,field'];
    for (const e of this.language.lexicon.entries) {
      lines.push(
        [
          this._escapeCsv(e.lemma),
          this._escapeCsv(e.gloss),
          this._escapeCsv(e.class),
          this._escapeCsv(e.field),
        ].join(','),
      );
    }
    return lines.join('\n');
  }

  // ============================================
  // REFERENCE GRAMMAR (HTML)
  // ============================================

  /**
   * Export a complete, standalone, print-friendly HTML reference grammar
   * in descriptive-grammar monograph style: numbered sections, phonology
   * tables (consonant grid by place/manner, vowel chart), phonotactics,
   * prosody, morphology with real paradigm tables, syntax with glossed
   * example sentences, a 200-entry core dictionary and a texts appendix
   * placeholder. Inline CSS only; no external resources.
   *
   * @returns {string} Full HTML document.
   */
  toGrammarHTML() {
    const name = this._esc(this.language.name || 'Unnamed');

    const body = [
      this._htmlTitlePage(),
      this._htmlSectionIntro(),
      this._htmlSectionPhonology(),
      this._htmlSectionMorphology(),
      this._htmlSectionSyntax(),
      this._htmlSectionDictionary(),
      this._htmlSectionTexts(),
    ].join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A Grammar of ${name}</title>
<style>${this._grammarCss()}</style>
</head>
<body>
${body}
</body>
</html>`;
  }

  // ============================================
  // GRAMMAR: CSS
  // ============================================

  /** @private */
  _grammarCss() {
    return `
  :root { --ink: #1a1a1a; --rule: #888; --accent: #5a3a22; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: var(--ink);
    max-width: 46em;
    margin: 0 auto;
    padding: 2em 1.5em 4em;
    line-height: 1.55;
    font-size: 12pt;
  }
  .title-page { text-align: center; padding: 6em 0 4em; page-break-after: always; }
  .title-page h1 { font-size: 2.6em; margin: 0.2em 0; letter-spacing: 0.02em; }
  .title-page .subtitle { font-style: italic; font-size: 1.2em; color: var(--accent); }
  .title-page .imprint { margin-top: 6em; font-size: 0.9em; color: #555; }
  h2 { font-size: 1.5em; border-bottom: 2px solid var(--ink); padding-bottom: 0.2em; margin-top: 2.2em; page-break-after: avoid; }
  h3 { font-size: 1.15em; margin-top: 1.6em; page-break-after: avoid; }
  h4 { font-size: 1em; font-variant: small-caps; margin-top: 1.2em; page-break-after: avoid; }
  table { border-collapse: collapse; margin: 1em 0; font-size: 0.95em; page-break-inside: avoid; }
  th, td { border: 1px solid var(--rule); padding: 0.3em 0.7em; text-align: left; vertical-align: top; }
  th { background: #f0ece4; font-weight: bold; }
  td.ipa, span.ipa { font-family: 'Charis SIL', 'Doulos SIL', Georgia, serif; }
  .conlang { font-style: italic; }
  .gloss-block { font-family: 'Courier New', monospace; font-size: 0.85em; white-space: pre; overflow-x: auto; background: #faf8f4; border-left: 3px solid var(--accent); padding: 0.6em 0.9em; margin: 0.8em 0; }
  .example { margin: 1em 0 1.4em; }
  .example .en { color: #444; }
  .dict { column-count: 2; column-gap: 2.5em; font-size: 0.92em; }
  .dict p { margin: 0 0 0.25em; text-indent: -1.2em; padding-left: 1.2em; break-inside: avoid; }
  .dict b { font-style: italic; font-weight: bold; }
  .pos { font-variant: small-caps; color: #666; font-size: 0.85em; }
  .note { font-size: 0.9em; color: #555; font-style: italic; }
  .placeholder { border: 1px dashed var(--rule); padding: 1em 1.2em; color: #666; font-style: italic; }
  @media print {
    body { max-width: none; padding: 0; font-size: 11pt; }
    h2 { page-break-before: always; }
    .title-page { page-break-before: avoid; }
    a { color: inherit; text-decoration: none; }
  }`;
  }

  // ============================================
  // GRAMMAR: SECTIONS
  // ============================================

  /** @private */
  _htmlTitlePage() {
    const lang = this.language;
    const name = this._esc(lang.name || 'Unnamed');
    const seed = this._esc(String(lang.seed ?? 'n/a'));
    const version = this._esc(lang.version || '3.x');
    return `<div class="title-page">
  <div class="subtitle">Studies in Procedural Xenolinguistics</div>
  <h1>A Grammar of ${name}</h1>
  <div class="subtitle">A Descriptive Reference</div>
  <div class="imprint">
    GLOSSOPETRAE v${version}<br>
    Language seed ${seed}<br>
    Generated documentation &mdash; suitable for print
  </div>
</div>`;
  }

  /** @private */
  _htmlSectionIntro() {
    const lang = this.language;
    const phon = lang.phonology || {};
    const stats = lang.lexicon.stats || {};
    const wo = this._wordOrder();
    const cs = this._caseSystem();
    const prosody = lang.prosody || {};

    const rows = [
      ['Morphological type', this._morphTypeLabel()],
      ['Basic word order', this._safe(wo.basic)],
      ['Morphosyntactic alignment', this._safe(cs.alignment)],
      ['Consonant phonemes', String((phon.consonants || []).length)],
      ['Vowel phonemes', String((phon.vowels || []).length)],
      ['Grammatical cases', String((cs.cases || []).length)],
      ['Lexicon size', String(lang.lexicon.entries.length) + ' entries'],
      ['Mean word length', this._num(stats.avgSyllables, 2) + ' syllables'],
      ['Prosodic profile', this._safe(prosody.summary)],
    ];

    return `<h2>1. Introduction</h2>
<p>This volume is a descriptive reference grammar of <b>${this._esc(lang.name || 'the language')}</b>,
a procedurally generated language produced by the GLOSSOPETRAE engine from seed
${this._esc(String(lang.seed ?? 'n/a'))}. The description proceeds in the conventional order:
phonology (&sect;2), morphology (&sect;3), syntax (&sect;4), followed by a core
lexicon (&sect;5) and a text appendix (&sect;6). All forms cited are drawn from the
generated lexicon and paradigms; nothing in this document is illustrative filler.</p>
<h3>1.1 Typological overview</h3>
<table>
<tr><th>Feature</th><th>Value</th></tr>
${rows.map(([k, v]) => `<tr><td>${this._esc(k)}</td><td>${this._esc(v)}</td></tr>`).join('\n')}
</table>
<p class="note">${this._esc(this._safe(wo.description, ''))}</p>`;
  }

  /** @private */
  _htmlSectionPhonology() {
    const parts = [`<h2>2. Phonology</h2>`];
    parts.push(this._htmlConsonantGrid());
    parts.push(this._htmlVowelChart());
    parts.push(this._htmlRomanizationTable());
    parts.push(this._htmlPhonotactics());
    parts.push(this._htmlProsody());
    return parts.join('\n');
  }

  /**
   * Consonant inventory as a place x manner grid (IPA), with romanization
   * in parentheses where it differs from the IPA symbol.
   * @private
   */
  _htmlConsonantGrid() {
    const consonants = this.language.phonology?.consonants || [];

    // Bucket phonemes by manner/place.
    const grid = new Map(); // manner -> place -> [phoneme]
    const placesPresent = new Set();
    const unplaced = [];

    for (const c of consonants) {
      const manner = getConsonantManner(c);
      const place = c.place;
      if (!manner || !place || !PLACE_ORDER.includes(place)) {
        unplaced.push(c);
        continue;
      }
      placesPresent.add(place);
      if (!grid.has(manner)) grid.set(manner, new Map());
      const row = grid.get(manner);
      if (!row.has(place)) row.set(place, []);
      row.get(place).push(c);
    }

    const places = PLACE_ORDER.filter((p) => placesPresent.has(p));

    const cell = (phonemes) => {
      if (!phonemes || phonemes.length === 0) return '';
      // Voiceless before voiced, IPA with romanization note.
      const sorted = phonemes.slice().sort((a, b) =>
        (a.voice === 'voiceless' ? 0 : 1) - (b.voice === 'voiceless' ? 0 : 1));
      return sorted
        .map((p) => {
          const ipa = this._esc(p.ipa);
          const roman = p.roman && p.roman !== p.ipa
            ? ` <span class="note">&lang;${this._esc(p.roman)}&rang;</span>`
            : '';
          return `<span class="ipa">${ipa}</span>${roman}`;
        })
        .join('&ensp;');
    };

    const headerCells = places
      .map((p) => `<th>${this._esc(this._titleCase(p))}</th>`)
      .join('');

    const bodyRows = MANNER_ORDER
      .filter(([key]) => grid.has(key))
      .map(([key, label]) => {
        const row = grid.get(key);
        const cells = places.map((p) => `<td>${cell(row.get(p))}</td>`).join('');
        return `<tr><th>${this._esc(label)}</th>${cells}</tr>`;
      })
      .join('\n');

    const extra = unplaced.length > 0
      ? `<p class="note">Additional segments: ${unplaced
          .map((c) => `<span class="ipa">${this._esc(c.ipa)}</span>`)
          .join(', ')}.</p>`
      : '';

    return `<h3>2.1 Consonants</h3>
<p>The language has ${consonants.length} consonant phonemes, arranged below by place
(columns) and manner (rows) of articulation. Romanized spellings are given in
angle brackets where they differ from the IPA value.</p>
<table>
<tr><th></th>${headerCells}</tr>
${bodyRows}
</table>
${extra}`;
  }

  /** @private */
  _htmlVowelChart() {
    const vowels = this.language.phonology?.vowels || [];

    const grid = new Map(); // height -> backness -> [vowel]
    const heightsPresent = new Set();
    for (const v of vowels) {
      const h = HEIGHT_ORDER.includes(v.height) ? v.height : 'mid';
      const b = BACKNESS_ORDER.includes(v.backness) ? v.backness : 'central';
      heightsPresent.add(h);
      if (!grid.has(h)) grid.set(h, new Map());
      if (!grid.get(h).has(b)) grid.get(h).set(b, []);
      grid.get(h).get(b).push(v);
    }

    const heights = HEIGHT_ORDER.filter((h) => heightsPresent.has(h));

    const cell = (vs) =>
      (vs || [])
        .map((v) => {
          const roman = v.roman && v.roman !== v.ipa
            ? ` <span class="note">&lang;${this._esc(v.roman)}&rang;</span>`
            : '';
          const round = v.rounded ? ' <span class="note">(rd.)</span>' : '';
          return `<span class="ipa">${this._esc(v.ipa)}</span>${roman}${round}`;
        })
        .join('&ensp;');

    const rows = heights
      .map((h) => {
        const cells = BACKNESS_ORDER
          .map((b) => `<td>${cell(grid.get(h)?.get(b))}</td>`)
          .join('');
        return `<tr><th>${this._esc(this._titleCase(h))}</th>${cells}</tr>`;
      })
      .join('\n');

    return `<h3>2.2 Vowels</h3>
<p>The vowel system comprises ${vowels.length} qualities.</p>
<table>
<tr><th></th><th>Front</th><th>Central</th><th>Back</th></tr>
${rows}
</table>`;
  }

  /** @private */
  _htmlRomanizationTable() {
    const romanization = this.language.phonology?.romanization || {};
    const pairs = Object.entries(romanization).filter(([ipa, roman]) => ipa !== roman);
    if (pairs.length === 0) {
      return `<h3>2.3 Romanization</h3>
<p>The romanization used throughout this grammar is a one-to-one transliteration
of the phonemic inventory; every symbol is written as its IPA value.</p>`;
    }
    const rows = pairs
      .map(([ipa, roman]) =>
        `<tr><td class="ipa">${this._esc(ipa)}</td><td>&lang;${this._esc(roman)}&rang;</td></tr>`)
      .join('\n');
    return `<h3>2.3 Romanization</h3>
<p>All cited forms use a practical romanization. Symbols not listed below are
written as their IPA values.</p>
<table>
<tr><th>IPA</th><th>Romanized</th></tr>
${rows}
</table>`;
  }

  /** @private */
  _htmlPhonotactics() {
    const pt = this.language.phonotactics || {};
    const template = pt.template || {};
    const processes = Array.isArray(pt.processes) ? pt.processes : [];
    const clusterNote = pt.clusterRules?.principle;

    const processRows = processes
      .map((p) =>
        `<tr><td>${this._esc(this._safe(p.name))}</td><td>${this._esc(this._safe(p.rule))}</td><td>${this._esc(this._safe(p.description))}</td></tr>`)
      .join('\n');

    const constraints = Array.isArray(pt.constraints) ? pt.constraints : [];
    const constraintItems = constraints
      .flatMap((c) =>
        (c.restrictions || []).map(
          (r) => `<li>${this._esc(this._safe(c.position))}: ${this._esc(r)}</li>`))
      .join('\n');

    return `<h3>2.4 Phonotactics</h3>
<p>The maximal syllable is <b>${this._esc(this._safe(template.formula))}</b>
&mdash; ${this._esc(this._safe(template.description))}.
${clusterNote ? this._esc(clusterNote) + '.' : ''}</p>
${processes.length > 0 ? `<h4>Phonological processes</h4>
<table>
<tr><th>Process</th><th>Rule</th><th>Description</th></tr>
${processRows}
</table>` : ''}
${constraintItems ? `<h4>Positional constraints</h4><ul>${constraintItems}</ul>` : ''}`;
  }

  /** @private */
  _htmlProsody() {
    const prosody = this.language.prosody || {};
    const parts = [`<h3>2.5 Prosody</h3>`];

    if (prosody.stress) {
      parts.push(`<p><b>Stress.</b> ${this._esc(this._safe(prosody.stress.description))}.
${prosody.stress.secondary?.present
  ? 'Secondary stress: ' + this._esc(this._safe(prosody.stress.secondary.pattern)) + '.'
  : ''}</p>`);
    }
    if (prosody.hasTone && prosody.tone) {
      const tones = Array.isArray(prosody.tone.tones) ? prosody.tone.tones : [];
      const toneRows = tones
        .map((t) =>
          `<tr><td>${this._esc(this._safe(t.name))}</td><td>${this._esc(this._safe(t.contour ?? t.mark))}</td><td>${this._esc(this._safe(t.description, ''))}</td></tr>`)
        .join('\n');
      parts.push(`<p><b>Tone.</b> ${this._esc(this._safe(prosody.tone.description, 'The language is tonal'))}.</p>
${toneRows ? `<table><tr><th>Tone</th><th>Contour</th><th>Notes</th></tr>${toneRows}</table>` : ''}`);
    } else {
      parts.push(`<p><b>Tone.</b> The language is not tonal.</p>`);
    }
    if (prosody.rhythm) {
      parts.push(`<p><b>Rhythm.</b> ${this._esc(this._safe(prosody.rhythm.description))}
(cf. ${this._esc(this._safe(prosody.rhythm.examples, 'natural-language parallels'))}).</p>`);
    }
    if (prosody.intonation && Array.isArray(prosody.intonation.patterns)) {
      const rows = prosody.intonation.patterns
        .map((p) =>
          `<tr><td>${this._esc(this._safe(p.type))}</td><td>${this._esc(this._safe(p.contour))}</td><td>${this._esc(this._safe(p.description, ''))}</td></tr>`)
        .join('\n');
      parts.push(`<h4>Intonation contours</h4>
<table><tr><th>Sentence type</th><th>Contour</th><th>Use</th></tr>${rows}</table>`);
    }
    return parts.join('\n');
  }

  /** @private */
  _htmlSectionMorphology() {
    const parts = [`<h2>3. Morphology</h2>`];
    parts.push(`<p>${this._esc(this.language.name || 'The language')} is
${this._esc(this._morphTypeLabel())} in overall type. This chapter describes nominal
inflection (&sect;3.1), verbal inflection (&sect;3.2), derivation (&sect;3.3) and
adpositions (&sect;3.4), with full paradigms drawn from the generated lexicon.</p>`);
    parts.push(this._htmlNominalMorphology());
    parts.push(this._htmlVerbalMorphology());
    parts.push(this._htmlDerivation());
    parts.push(this._htmlAdpositions());
    return parts.join('\n');
  }

  /** @private */
  _htmlNominalMorphology() {
    const nominal = this.language.morphology?.nominal || {};
    const cs = nominal.caseSystem || {};
    const cases = Array.isArray(cs.cases) ? cs.cases : [];
    const numbers = nominal.numberSystem?.categories || [];
    const parts = [`<h3>3.1 Nominal morphology</h3>`];

    if (cases.length > 0) {
      const rows = cases
        .map((c) =>
          `<tr><td>${this._esc(this._titleCase(this._safe(c.name)))}</td><td>${this._esc(this._safe(c.abbr))}</td><td>${this._esc(this._safe(c.function))}</td><td class="conlang">${c.suffix ? '-' + this._esc(c.suffix) : '&empty;'}</td></tr>`)
        .join('\n');
      parts.push(`<p>${this._esc(this._safe(cs.description, 'Nouns inflect for case'))}.</p>
<table>
<tr><th>Case</th><th>Abbr.</th><th>Function</th><th>Suffix</th></tr>
${rows}
</table>`);
    } else {
      parts.push(`<p>There is no morphological case marking; grammatical relations are
expressed by word order and adpositions.</p>`);
    }

    if (numbers.length > 1) {
      const numRows = numbers
        .map((n) =>
          `<tr><td>${this._esc(this._titleCase(this._safe(n.name)))}</td><td>${this._esc(this._safe(n.abbr))}</td><td class="conlang">${n.suffix ? '-' + this._esc(n.suffix) : '&empty;'}</td></tr>`)
        .join('\n');
      parts.push(`<p>${this._esc(this._safe(nominal.numberSystem?.description, 'Nouns mark number'))}.</p>
<table><tr><th>Number</th><th>Abbr.</th><th>Suffix</th></tr>${numRows}</table>`);
    }

    if (nominal.nounClasses && nominal.nounClasses.count > 0) {
      parts.push(`<p><b>Noun classes.</b> ${this._esc(this._safe(nominal.nounClasses.description))}.</p>`);
    }
    if (nominal.definiteness) {
      parts.push(`<p><b>Definiteness.</b> ${this._esc(this._safe(nominal.definiteness.description))}.</p>`);
    }

    const noun = this._findParadigmEntry('noun');
    if (noun) {
      parts.push(this._htmlParadigmTable(
        `Declension of <span class="conlang">${this._esc(noun.lemma)}</span> &lsquo;${this._esc(noun.gloss)}&rsquo;`,
        noun.paradigm.forms,
      ));
    }
    return parts.join('\n');
  }

  /** @private */
  _htmlVerbalMorphology() {
    const verbal = this.language.morphology?.verbal || {};
    const parts = [`<h3>3.2 Verbal morphology</h3>`];

    const tamTable = (title, items, key) => {
      if (!items || !Array.isArray(items[key]) || items[key].length === 0) return '';
      const rows = items[key]
        .map((t) =>
          `<tr><td>${this._esc(this._titleCase(this._safe(t.name)))}</td><td>${this._esc(this._safe(t.abbr))}</td><td class="conlang">${t.suffix ? '-' + this._esc(t.suffix) : '&empty;'}</td></tr>`)
        .join('\n');
      return `<h4>${this._esc(title)}</h4>
<p class="note">${this._esc(this._safe(items.description, ''))}</p>
<table><tr><th>Category</th><th>Abbr.</th><th>Suffix</th></tr>${rows}</table>`;
    };

    parts.push(tamTable('Tense', verbal.tenses, 'tenses'));
    parts.push(tamTable('Aspect', verbal.aspects, 'aspects'));
    parts.push(tamTable('Mood', verbal.moods, 'moods'));
    parts.push(tamTable('Voice', verbal.voices, 'voices'));

    if (verbal.agreement) {
      parts.push(`<p><b>Agreement.</b> ${this._esc(this._safe(verbal.agreement.description))}.</p>`);
    }
    if (verbal.evidentiality && verbal.evidentiality.count > 0) {
      parts.push(`<p><b>Evidentiality.</b> ${this._esc(this._safe(verbal.evidentiality.description))}.</p>`);
    }

    const verb = this._findParadigmEntry('verb');
    if (verb) {
      parts.push(this._htmlParadigmTable(
        `Conjugation of <span class="conlang">${this._esc(verb.lemma)}</span> &lsquo;${this._esc(verb.gloss)}&rsquo;`,
        verb.paradigm.forms,
      ));
    }
    return parts.filter(Boolean).join('\n');
  }

  /** @private */
  _htmlDerivation() {
    const derivational = this.language.morphology?.derivational || {};
    const processes = Array.isArray(derivational.processes) ? derivational.processes : [];
    if (processes.length === 0) {
      return `<h3>3.3 Derivation</h3>
<p>No productive derivational morphology is recorded.</p>`;
    }
    const rows = processes
      .map((p) =>
        `<tr><td>${this._esc(this._titleCase(this._safe(p.name)))}</td><td>${this._esc(this._safe(p.input))} &rarr; ${this._esc(this._safe(p.output))}</td><td class="conlang">${this._esc(this._safe(p.affixType, 'suffix'))} -${this._esc(this._safe(p.affix))}</td><td>${this._esc(this._safe(p.meaning))}</td></tr>`)
      .join('\n');
    return `<h3>3.3 Derivation</h3>
<table>
<tr><th>Process</th><th>Category change</th><th>Affix</th><th>Meaning</th></tr>
${rows}
</table>`;
  }

  /** @private */
  _htmlAdpositions() {
    const adpositions = this.language.morphology?.adpositions || [];
    const type = this._wordOrder().adpositionType || 'adposition';
    if (!Array.isArray(adpositions) || adpositions.length === 0) {
      return `<h3>3.4 Adpositions</h3><p>No dedicated adposition inventory is recorded.</p>`;
    }
    const rows = adpositions
      .map((a) =>
        `<tr><td class="conlang">${this._esc(this._safe(a.form))}</td><td>${this._esc(this._safe(a.meaning))}</td></tr>`)
      .join('\n');
    return `<h3>3.4 Adpositions</h3>
<p>The language uses ${this._esc(type)}s.</p>
<table><tr><th>Form</th><th>Meaning</th></tr>${rows}</table>`;
  }

  /** @private */
  _htmlSectionSyntax() {
    const wo = this._wordOrder();
    const parts = [`<h2>4. Syntax</h2>`];

    const rows = [
      ['Basic constituent order', this._safe(wo.basic)],
      ['Adjective position', this._safe(wo.adjectivePosition) + ' the noun'],
      ['Genitive position', this._safe(wo.genitivePosition) + ' the noun'],
      ['Adposition type', this._safe(wo.adpositionType)],
      ['Pro-drop', wo.proDrop ? 'yes' : 'no'],
    ];
    parts.push(`<p>${this._esc(this._safe(wo.description, ''))}</p>
<table><tr><th>Parameter</th><th>Setting</th></tr>
${rows.map(([k, v]) => `<tr><td>${this._esc(k)}</td><td>${this._esc(v)}</td></tr>`).join('\n')}
</table>`);

    parts.push(`<h3>4.1 Example sentences</h3>
<p>The following sentences were produced by the language&rsquo;s own translation
engine and are shown with interlinear glosses.</p>`);

    let exampleNum = 0;
    for (const sentence of SYNTAX_EXAMPLES) {
      const ex = this._tryTranslate(sentence);
      if (!ex) continue;
      exampleNum++;
      parts.push(`<div class="example">
<p>(${exampleNum})&ensp;<span class="conlang">${this._esc(ex.target)}</span><br>
<span class="en">&lsquo;${this._esc(sentence)}&rsquo;</span></p>
<div class="gloss-block">${this._esc(ex.gloss)}</div>
</div>`);
    }
    if (exampleNum === 0) {
      parts.push(`<p class="note">No example sentences could be generated for this language.</p>`);
    }
    return parts.join('\n');
  }

  /** @private */
  _htmlSectionDictionary() {
    const entries = this._orderedEntries()
      .filter((e) => e.lemma && e.gloss)
      .slice(0, 200);

    const items = entries
      .map((e) => {
        const pos = this._posAbbr(e.class);
        return `<p><b>${this._esc(e.lemma)}</b> <span class="pos">${this._esc(pos)}</span> ${this._esc(e.gloss)}</p>`;
      })
      .join('\n');

    return `<h2>5. Core Dictionary</h2>
<p>The ${entries.length} highest-priority entries of the lexicon (core semantic
fields first: ${CORE_FIELDS.join(', ')}), of ${this.language.lexicon.entries.length}
entries in total. The full lexicon is available in the machine-readable
dictionary export.</p>
<div class="dict">
${items}
</div>`;
  }

  /** @private */
  _htmlSectionTexts() {
    return `<h2>6. Texts</h2>
<p class="placeholder">Appendix placeholder &mdash; canonical showcase texts (the Tower of
Babel, the North Wind and the Sun, UDHR Article 1, Schleicher&rsquo;s Fable and
others) can be generated with the companion TextLibrary module and inserted
here as interlinear specimens.</p>`;
  }

  // ============================================
  // SHARED HELPERS
  // ============================================

  /**
   * Lexicon entries with core semantic fields first (stable order).
   * @private
   */
  _orderedEntries() {
    const entries = this.language.lexicon.entries;
    const core = [];
    const rest = [];
    for (const e of entries) {
      (CORE_FIELDS.includes(e.field) ? core : rest).push(e);
    }
    core.sort(
      (a, b) => CORE_FIELDS.indexOf(a.field) - CORE_FIELDS.indexOf(b.field),
    );
    return core.concat(rest);
  }

  /**
   * First lexicon entry of a class that has a non-empty paradigm.
   * @private
   */
  _findParadigmEntry(wordClass) {
    return (
      this.language.lexicon.entries.find(
        (e) =>
          e.class === wordClass &&
          e.paradigm &&
          e.paradigm.forms &&
          Object.keys(e.paradigm.forms).length > 0,
      ) || null
    );
  }

  /**
   * Render a paradigm's forms map as a two-column table.
   * @private
   */
  _htmlParadigmTable(captionHtml, forms) {
    const rows = Object.entries(forms)
      .map(([key, form]) =>
        `<tr><td>${this._esc(key)}</td><td class="conlang">${this._esc(this._safe(form))}</td></tr>`)
      .join('\n');
    return `<h4>${captionHtml}</h4>
<table><tr><th>Form</th><th>Realization</th></tr>${rows}</table>`;
  }

  /**
   * Translate a sentence, returning null on any failure or suspicious
   * output (so the grammar never contains error artifacts).
   * @private
   */
  _tryTranslate(sentence) {
    const engine = this.language.translationEngine;
    if (!engine || typeof engine.translateToConlang !== 'function') return null;
    try {
      const r = engine.translateToConlang(sentence);
      const target = r && typeof r.target === 'string' ? r.target.trim() : '';
      const gloss = r && typeof r.gloss === 'string' ? r.gloss : '';
      if (!target || /undefined|\[object/i.test(target + gloss)) return null;
      return { target, gloss };
    } catch {
      return null;
    }
  }

  /** @private */
  _morphTypeLabel() {
    const morphology = this.language.morphology || {};
    if (morphology.type) return morphology.type;
    const desc = morphology.typeDescription;
    if (desc && desc !== 'Unknown type') return desc;
    return 'mixed/unclassified';
  }

  /** @private */
  _wordOrder() {
    return this.language.morphology?.wordOrder || {};
  }

  /** @private */
  _caseSystem() {
    return this.language.morphology?.nominal?.caseSystem || {};
  }

  /** @private */
  _posAbbr(wordClass) {
    const map = {
      noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.',
      pronoun: 'pron.', particle: 'part.', conjunction: 'conj.',
      adposition: 'adp.', numeral: 'num.', number: 'num.',
    };
    return map[wordClass] || (wordClass ? String(wordClass) + '.' : '?');
  }

  /** HTML-escape a value. @private */
  _esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Guard against null/undefined leaking into output. @private */
  _safe(value, fallback = '—') {
    if (value === null || value === undefined || value === '') return fallback;
    return String(value);
  }

  /** Format a number with fixed decimals (never NaN). @private */
  _num(value, decimals = 2) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(decimals) : '—';
  }

  /** @private */
  _titleCase(value) {
    const s = this._safe(value, '');
    return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
  }

  /**
   * Escape a field for semicolon-separated Anki CSV: wrap in double
   * quotes when it contains a separator, quote or newline; inner quotes
   * are doubled.
   * @private
   */
  _escapeAnki(value) {
    const s = String(value ?? '');
    if (/[;"\n\r]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  /**
   * Escape a field for comma-separated CSV (RFC 4180 style).
   * @private
   */
  _escapeCsv(value) {
    const s = String(value ?? '');
    if (/[,"\n\r]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  /** Turn a value into a safe single Anki tag. @private */
  _tagify(value) {
    return String(value ?? 'misc')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'misc';
  }
}

export default Exporter;
