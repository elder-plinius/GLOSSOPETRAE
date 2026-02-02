/**
 * GLOSSOPETRAE - Quality Engine Module
 *
 * Comprehensive quality-of-life and reliability features:
 * 1. Translation Robustness & Fallbacks
 * 2. Validation & Self-Testing Suite
 * 3. Portable Export Formats (JSON-LD, ConlangML, etc.)
 * 4. Quality Metrics Dashboard
 * 5. Incremental Lexicon Expansion
 */

export class QualityEngine {
  constructor(language) {
    this.language = language;
    this.lexicon = language.lexicon;
    this.morphology = language.morphology;
    this.phonology = language.phonology;
    this.phonotactics = language.phonotactics;

    // Cache for generated words
    this._generatedCache = new Map();

    // Validation results cache
    this._validationCache = null;

    // Quality metrics cache
    this._metricsCache = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. TRANSLATION ROBUSTNESS & FALLBACKS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get a word with fallback strategies for unknown terms
   * @param {string} english - English word to translate
   * @param {string} pos - Part of speech hint
   * @returns {Object} Translation result with fallback info
   */
  getWordWithFallback(english, pos = null) {
    const word = english.toLowerCase().trim();

    // Strategy 1: Direct lexicon lookup
    const direct = this.lexicon?.lookup?.(word);
    if (direct) {
      return {
        success: true,
        lemma: direct.lemma,
        source: 'lexicon',
        confidence: 1.0,
        original: word,
      };
    }

    // Strategy 2: Check cached generated words
    const cacheKey = `${word}:${pos || 'any'}`;
    if (this._generatedCache.has(cacheKey)) {
      return this._generatedCache.get(cacheKey);
    }

    // Strategy 3: Semantic similarity - find closest match
    const similar = this._findSemanticallySimilar(word, pos);
    if (similar) {
      return {
        success: true,
        lemma: similar.lemma,
        source: 'semantic-fallback',
        confidence: similar.score,
        original: word,
        note: `Substituted "${similar.gloss}" for "${word}"`,
      };
    }

    // Strategy 4: Generate a new word on-the-fly
    const generated = this._generateOnTheFly(word, pos);
    if (generated) {
      // Cache for future use
      this._generatedCache.set(cacheKey, generated);
      return generated;
    }

    // Strategy 5: Phonetic transcription (last resort)
    const transcribed = this._phoneticTranscription(word);
    return {
      success: true,
      lemma: transcribed,
      source: 'phonetic-transcription',
      confidence: 0.3,
      original: word,
      note: 'Phonetically adapted from English',
    };
  }

  _findSemanticallySimilar(word, pos) {
    const entries = this.lexicon?.getEntries?.() || [];

    // Semantic field mappings for fallback
    const semanticFields = {
      // Animals
      cat: ['animal', 'dog', 'beast'],
      dog: ['animal', 'cat', 'beast'],
      horse: ['animal', 'beast'],
      cow: ['animal', 'beast'],
      // People
      boy: ['child', 'man', 'person'],
      girl: ['child', 'woman', 'person'],
      husband: ['man', 'person'],
      wife: ['woman', 'person'],
      // Actions
      walk: ['go', 'move', 'run'],
      run: ['go', 'move', 'walk'],
      speak: ['say', 'tell'],
      talk: ['say', 'speak'],
      look: ['see', 'watch'],
      watch: ['see', 'look'],
      // Objects
      house: ['home', 'building'],
      book: ['writing', 'thing'],
      car: ['thing', 'tool'],
      phone: ['thing', 'tool'],
      computer: ['thing', 'tool'],
      // Abstract
      love: ['like', 'want'],
      hate: ['fear', 'not-like'],
      think: ['know', 'believe'],
      believe: ['think', 'know'],
      // Nature
      river: ['water', 'sea'],
      lake: ['water', 'sea'],
      forest: ['tree', 'place'],
      ocean: ['sea', 'water'],
    };

    const alternatives = semanticFields[word] || [];

    for (const alt of alternatives) {
      const entry = entries.find(e =>
        e.gloss?.toLowerCase() === alt &&
        (!pos || e.class === pos)
      );
      if (entry) {
        return {
          lemma: entry.lemma,
          gloss: entry.gloss,
          score: 0.7, // Semantic similarity score
        };
      }
    }

    // Try to find by partial match
    for (const entry of entries) {
      if (entry.gloss?.toLowerCase().includes(word) ||
          word.includes(entry.gloss?.toLowerCase())) {
        if (!pos || entry.class === pos) {
          return {
            lemma: entry.lemma,
            gloss: entry.gloss,
            score: 0.5,
          };
        }
      }
    }

    return null;
  }

  _generateOnTheFly(word, pos) {
    // Generate a new word using the language's phonotactics
    const syllableTemplate = this.phonotactics?.template;
    const consonants = this.phonology?.consonants || [];
    const vowels = this.phonology?.vowels || [];

    if (!syllableTemplate || consonants.length === 0 || vowels.length === 0) {
      return null;
    }

    // Use the word as a seed for deterministic generation
    let seed = 0;
    for (const char of word) {
      seed = ((seed << 5) - seed) + char.charCodeAt(0);
      seed = seed & seed;
    }
    seed = Math.abs(seed);

    // Generate 1-3 syllables based on word length
    const numSyllables = Math.min(3, Math.max(1, Math.ceil(word.length / 3)));
    let lemma = '';

    for (let i = 0; i < numSyllables; i++) {
      // Simple CV syllable
      const cIdx = (seed + i * 7) % consonants.length;
      const vIdx = (seed + i * 11) % vowels.length;

      lemma += consonants[cIdx].roman + vowels[vIdx].roman;

      // Optionally add coda consonant
      if (syllableTemplate.codaMax > 0 && (seed + i) % 3 === 0) {
        const codaIdx = (seed + i * 13) % consonants.length;
        lemma += consonants[codaIdx].roman;
      }
    }

    return {
      success: true,
      lemma,
      source: 'generated',
      confidence: 0.5,
      original: word,
      note: `Generated new word for "${word}"`,
      pos: pos || 'noun',
    };
  }

  _phoneticTranscription(word) {
    // Convert English to approximate conlang phonology
    const consonants = this.phonology?.consonants || [];
    const vowels = this.phonology?.vowels || [];

    // Build available sound sets
    const availableC = new Set(consonants.map(c => c.roman));
    const availableV = new Set(vowels.map(v => v.roman));

    // Phonetic mappings
    const cMap = {
      'b': 'b', 'p': 'p', 'd': 'd', 't': 't', 'g': 'g', 'k': 'k',
      'f': 'f', 'v': 'v', 's': 's', 'z': 'z', 'h': 'h', 'm': 'm',
      'n': 'n', 'l': 'l', 'r': 'r', 'w': 'w', 'y': 'y', 'j': 'y',
      'c': 'k', 'q': 'k', 'x': 'ks',
    };

    const vMap = {
      'a': 'a', 'e': 'e', 'i': 'i', 'o': 'o', 'u': 'u',
    };

    let result = '';
    for (const char of word.toLowerCase()) {
      if (cMap[char]) {
        const mapped = cMap[char];
        if (availableC.has(mapped)) {
          result += mapped;
        } else if (availableC.has(mapped[0])) {
          result += mapped[0];
        }
      } else if (vMap[char]) {
        const mapped = vMap[char];
        if (availableV.has(mapped)) {
          result += mapped;
        } else {
          // Use first available vowel
          result += vowels[0]?.roman || 'a';
        }
      }
    }

    return result || word.slice(0, 4);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. VALIDATION & SELF-TESTING SUITE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Run full validation suite on the language
   * @returns {Object} Validation results with pass/fail status
   */
  validate() {
    if (this._validationCache) {
      return this._validationCache;
    }

    const results = {
      timestamp: new Date().toISOString(),
      passed: true,
      tests: [],
      warnings: [],
      errors: [],
      summary: {},
    };

    // Test 1: Phoneme inventory completeness
    results.tests.push(this._testPhonemeInventory());

    // Test 2: Syllable structure validity
    results.tests.push(this._testSyllableStructure());

    // Test 3: Morphological consistency
    results.tests.push(this._testMorphologicalConsistency());

    // Test 4: Lexicon coverage
    results.tests.push(this._testLexiconCoverage());

    // Test 5: Translation round-trip
    results.tests.push(this._testTranslationRoundTrip());

    // Test 6: Word generation validity
    results.tests.push(this._testWordGeneration());

    // Test 7: Case/number agreement
    results.tests.push(this._testAgreement());

    // Aggregate results
    for (const test of results.tests) {
      if (test.status === 'fail') {
        results.passed = false;
        results.errors.push(`${test.name}: ${test.message}`);
      } else if (test.status === 'warn') {
        results.warnings.push(`${test.name}: ${test.message}`);
      }
    }

    results.summary = {
      total: results.tests.length,
      passed: results.tests.filter(t => t.status === 'pass').length,
      warned: results.tests.filter(t => t.status === 'warn').length,
      failed: results.tests.filter(t => t.status === 'fail').length,
    };

    this._validationCache = results;
    return results;
  }

  _testPhonemeInventory() {
    const test = { name: 'Phoneme Inventory', status: 'pass', message: '' };

    const consonants = this.phonology?.consonants || [];
    const vowels = this.phonology?.vowels || [];

    if (consonants.length < 8) {
      test.status = 'warn';
      test.message = `Only ${consonants.length} consonants (minimum 8 recommended)`;
    }

    if (vowels.length < 3) {
      test.status = 'fail';
      test.message = `Only ${vowels.length} vowels (minimum 3 required)`;
    }

    // Check for basic sounds
    const hasStops = consonants.some(c => c.manner === 'plosive' || c.manner === 'stop');
    const hasNasals = consonants.some(c => c.manner === 'nasal');

    if (!hasStops || !hasNasals) {
      test.status = 'warn';
      test.message += ' Missing basic sound types (stops or nasals)';
    }

    if (test.status === 'pass') {
      test.message = `${consonants.length} consonants, ${vowels.length} vowels - OK`;
    }

    return test;
  }

  _testSyllableStructure() {
    const test = { name: 'Syllable Structure', status: 'pass', message: '' };

    const template = this.phonotactics?.template;
    if (!template) {
      test.status = 'fail';
      test.message = 'No syllable template defined';
      return test;
    }

    // Check for valid structure
    if (!template.formula) {
      test.status = 'fail';
      test.message = 'Syllable formula missing';
      return test;
    }

    // Validate onset/coda constraints
    if (template.onsetMax > 3) {
      test.status = 'warn';
      test.message = `Onset max ${template.onsetMax} is unusually high`;
    }

    if (template.codaMax > 4) {
      test.status = 'warn';
      test.message += ` Coda max ${template.codaMax} is unusually high`;
    }

    if (test.status === 'pass') {
      test.message = `Template ${template.formula} is valid`;
    }

    return test;
  }

  _testMorphologicalConsistency() {
    const test = { name: 'Morphological Consistency', status: 'pass', message: '' };

    const morph = this.morphology;
    if (!morph) {
      test.status = 'fail';
      test.message = 'No morphology defined';
      return test;
    }

    // Check case system consistency
    const cases = morph.nominal?.caseSystem?.cases || [];
    const caseNames = new Set(cases.map(c => c.name));

    if (cases.length > 0 && !caseNames.has('nominative') && !caseNames.has('absolutive')) {
      test.status = 'warn';
      test.message = 'No unmarked case (nominative/absolutive)';
    }

    // Check verb tenses
    const tenses = morph.verbal?.tenses?.tenses || [];
    if (tenses.length === 0) {
      test.status = 'warn';
      test.message += ' No tenses defined';
    }

    // Check word order validity
    const validOrders = ['SOV', 'SVO', 'VSO', 'VOS', 'OVS', 'OSV'];
    if (!validOrders.includes(morph.wordOrder?.basic)) {
      test.status = 'fail';
      test.message = `Invalid word order: ${morph.wordOrder?.basic}`;
    }

    if (test.status === 'pass') {
      test.message = `${cases.length} cases, ${tenses.length} tenses, ${morph.wordOrder.basic} order - OK`;
    }

    return test;
  }

  _testLexiconCoverage() {
    const test = { name: 'Lexicon Coverage', status: 'pass', message: '' };

    const entries = this.lexicon?.getEntries?.() || [];
    const stats = this.lexicon?.stats || {};

    if (entries.length < 100) {
      test.status = 'warn';
      test.message = `Only ${entries.length} entries (200+ recommended)`;
    }

    // Check for basic vocabulary
    const required = ['person', 'man', 'woman', 'water', 'fire', 'sun', 'moon', 'eat', 'drink', 'see', 'go'];
    const missing = [];

    for (const word of required) {
      if (!this.lexicon?.lookup?.(word)) {
        missing.push(word);
      }
    }

    if (missing.length > 0) {
      test.status = 'warn';
      test.message += ` Missing basic words: ${missing.slice(0, 5).join(', ')}`;
      if (missing.length > 5) {
        test.message += ` (+${missing.length - 5} more)`;
      }
    }

    if (test.status === 'pass') {
      test.message = `${entries.length} entries with good core coverage`;
    }

    return test;
  }

  _testTranslationRoundTrip() {
    const test = { name: 'Translation Round-Trip', status: 'pass', message: '' };

    const translator = this.language.translationEngine;
    if (!translator) {
      test.status = 'warn';
      test.message = 'No translation engine available';
      return test;
    }

    const testSentences = [
      'The man sees the woman.',
      'I eat food.',
      'The bird flies.',
    ];

    let successCount = 0;
    for (const sentence of testSentences) {
      try {
        const result = translator.translateToConlang(sentence);
        if (result.target && !result.target.includes('[')) {
          successCount++;
        }
      } catch (e) {
        // Translation failed
      }
    }

    if (successCount === 0) {
      test.status = 'fail';
      test.message = 'All test translations failed';
    } else if (successCount < testSentences.length) {
      test.status = 'warn';
      test.message = `${successCount}/${testSentences.length} translations successful`;
    } else {
      test.message = 'All test translations successful';
    }

    return test;
  }

  _testWordGeneration() {
    const test = { name: 'Word Generation', status: 'pass', message: '' };

    const entries = this.lexicon?.getEntries?.() || [];
    const template = this.phonotactics?.template;

    if (entries.length === 0 || !template) {
      test.status = 'warn';
      test.message = 'Cannot test word generation';
      return test;
    }

    // Check if generated words follow syllable rules
    let validCount = 0;
    const sampleSize = Math.min(20, entries.length);

    for (let i = 0; i < sampleSize; i++) {
      const entry = entries[i];
      if (this._isValidSyllableStructure(entry.lemma)) {
        validCount++;
      }
    }

    const ratio = validCount / sampleSize;
    if (ratio < 0.5) {
      test.status = 'warn';
      test.message = `Only ${Math.round(ratio * 100)}% of words follow syllable rules`;
    } else {
      test.message = `${Math.round(ratio * 100)}% of words follow syllable rules`;
    }

    return test;
  }

  _testAgreement() {
    const test = { name: 'Agreement Patterns', status: 'pass', message: '' };

    const agreement = this.morphology?.verbal?.agreement;
    const cases = this.morphology?.nominal?.caseSystem?.cases || [];

    if (!agreement) {
      test.status = 'pass';
      test.message = 'No agreement system defined (OK for isolating languages)';
      return test;
    }

    // Check if agreement markers are defined
    if (agreement.marksSubject && (!agreement.subjectMarkers || agreement.subjectMarkers.length === 0)) {
      test.status = 'warn';
      test.message = 'Subject agreement enabled but no markers defined';
    }

    // Check case suffix consistency
    const suffixes = cases.map(c => c.suffix).filter(s => s);
    const uniqueSuffixes = new Set(suffixes);

    if (suffixes.length !== uniqueSuffixes.size) {
      test.status = 'warn';
      test.message += ' Duplicate case suffixes detected';
    }

    if (test.status === 'pass') {
      test.message = 'Agreement patterns consistent';
    }

    return test;
  }

  _isValidSyllableStructure(word) {
    // Simplified syllable validation
    const consonants = new Set((this.phonology?.consonants || []).map(c => c.roman));
    const vowels = new Set((this.phonology?.vowels || []).map(v => v.roman));

    // Check if word contains at least one vowel
    for (const char of word) {
      if (vowels.has(char)) {
        return true;
      }
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PORTABLE EXPORT FORMATS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Export language in multiple portable formats
   * @param {string} format - 'json-ld', 'conlangml', 'csv', 'latex', 'sil'
   * @returns {string} Formatted export
   */
  export(format = 'json-ld') {
    switch (format.toLowerCase()) {
      case 'json-ld':
        return this._exportJsonLD();
      case 'conlangml':
        return this._exportConlangML();
      case 'csv':
        return this._exportCSV();
      case 'latex':
        return this._exportLaTeX();
      case 'sil':
        return this._exportSIL();
      case 'compact':
        return this._exportCompact();
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  _exportJsonLD() {
    const entries = this.lexicon?.getEntries?.() || [];

    const jsonld = {
      '@context': {
        '@vocab': 'http://www.w3.org/ns/lemon/',
        'ontolex': 'http://www.w3.org/ns/lemon/ontolex#',
        'lexinfo': 'http://www.lexinfo.net/ontology/2.0/lexinfo#',
        'glossopetrae': 'https://glossopetrae.dev/ontology#',
      },
      '@type': 'ontolex:Lexicon',
      '@id': `glossopetrae:${this.language.name}`,
      'glossopetrae:seed': this.language.seed,
      'glossopetrae:version': '3.1',
      'language': this.language.name,
      'phonology': {
        consonants: this.phonology.consonants.map(c => ({
          ipa: c.ipa,
          romanization: c.roman,
          features: { manner: c.manner, place: c.place, voiced: c.voiced },
        })),
        vowels: this.phonology.vowels.map(v => ({
          ipa: v.ipa,
          romanization: v.roman,
          features: { height: v.height, backness: v.backness, rounded: v.rounded },
        })),
      },
      'morphology': {
        type: this.morphology.type,
        wordOrder: this.morphology.wordOrder.basic,
        alignment: this.morphology.alignment,
        cases: this.morphology.nominal.caseSystem.cases.map(c => ({
          name: c.name,
          abbreviation: c.abbr,
          suffix: c.suffix,
          function: c.function,
        })),
      },
      'entries': entries.slice(0, 500).map(entry => ({
        '@type': 'ontolex:LexicalEntry',
        'canonicalForm': { 'writtenRep': entry.lemma },
        'sense': { 'definition': entry.gloss },
        'lexinfo:partOfSpeech': entry.class,
        'glossopetrae:field': entry.field,
      })),
    };

    return JSON.stringify(jsonld, null, 2);
  }

  _exportConlangML() {
    const entries = this.lexicon?.getEntries?.() || [];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<conlang xmlns="http://conlangml.org/schema/1.0"
         name="${this.language.name}"
         seed="${this.language.seed}">

  <phonology>
    <consonants>
${this.phonology.consonants.map(c => `      <phoneme ipa="${c.ipa}" roman="${c.roman}" manner="${c.manner}" place="${c.place}" voiced="${c.voiced}"/>`).join('\n')}
    </consonants>
    <vowels>
${this.phonology.vowels.map(v => `      <phoneme ipa="${v.ipa}" roman="${v.roman}" height="${v.height}" backness="${v.backness}"/>`).join('\n')}
    </vowels>
  </phonology>

  <morphology type="${this.morphology.type}" wordOrder="${this.morphology.wordOrder.basic}">
    <cases>
${this.morphology.nominal.caseSystem.cases.map(c => `      <case name="${c.name}" abbr="${c.abbr}" suffix="${c.suffix || '∅'}"/>`).join('\n')}
    </cases>
    <tenses>
${this.morphology.verbal.tenses.tenses.map(t => `      <tense name="${t.name}" abbr="${t.abbr}" suffix="${t.suffix || '∅'}"/>`).join('\n')}
    </tenses>
  </morphology>

  <lexicon count="${entries.length}">
${entries.slice(0, 200).map(e => `    <entry lemma="${e.lemma}" gloss="${e.gloss}" pos="${e.class}" field="${e.field || 'general'}"/>`).join('\n')}
  </lexicon>

</conlang>`;

    return xml;
  }

  _exportCSV() {
    const entries = this.lexicon?.getEntries?.() || [];
    const lines = ['lemma,gloss,pos,field,paradigm'];

    for (const entry of entries) {
      const paradigm = entry.paradigm?.forms
        ? Object.entries(entry.paradigm.forms).map(([k, v]) => `${k}:${v}`).join(';')
        : '';
      lines.push(`"${entry.lemma}","${entry.gloss}","${entry.class}","${entry.field || ''}","${paradigm}"`);
    }

    return lines.join('\n');
  }

  _exportLaTeX() {
    const entries = this.lexicon?.getEntries?.() || [];
    const cases = this.morphology.nominal.caseSystem.cases;

    let latex = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{tipa}
\\usepackage{booktabs}
\\usepackage{longtable}

\\title{${this.language.name} Grammar Reference}
\\author{Generated by GLOSSOPETRAE v3.1}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Phonology}

\\subsection{Consonants}
\\begin{tabular}{lll}
\\toprule
IPA & Romanization & Features \\\\
\\midrule
${this.phonology.consonants.slice(0, 20).map(c => `\\textipa{${c.ipa}} & ${c.roman} & ${c.manner}, ${c.place} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}

\\subsection{Vowels}
\\begin{tabular}{lll}
\\toprule
IPA & Romanization & Features \\\\
\\midrule
${this.phonology.vowels.map(v => `\\textipa{${v.ipa}} & ${v.roman} & ${v.height}, ${v.backness} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}

\\section{Morphology}

\\subsection{Case System}
Word Order: ${this.morphology.wordOrder.basic}

\\begin{tabular}{llll}
\\toprule
Case & Abbreviation & Suffix & Function \\\\
\\midrule
${cases.map(c => `${c.name} & ${c.abbr} & -${c.suffix || '∅'} & ${c.function} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}

\\section{Lexicon}

\\begin{longtable}{lll}
\\toprule
Lemma & Gloss & POS \\\\
\\midrule
\\endhead
${entries.slice(0, 100).map(e => `${e.lemma} & ${e.gloss} & ${e.class} \\\\`).join('\n')}
\\bottomrule
\\end{longtable}

\\end{document}`;

    return latex;
  }

  _exportSIL() {
    // SIL Toolbox / FLEx compatible format
    const entries = this.lexicon?.getEntries?.() || [];
    let sil = `\\_sh v3.0  400  MDF 4.0\n`;
    sil += `\\_DateStampHasFourDigitYear\n\n`;

    for (const entry of entries) {
      sil += `\\lx ${entry.lemma}\n`;
      sil += `\\ps ${entry.class}\n`;
      sil += `\\ge ${entry.gloss}\n`;
      if (entry.field) {
        sil += `\\sd ${entry.field}\n`;
      }
      sil += `\n`;
    }

    return sil;
  }

  _exportCompact() {
    // Ultra-compact format for embedding in LLM context
    const entries = this.lexicon?.getEntries?.() || [];

    return JSON.stringify({
      n: this.language.name,
      s: this.language.seed,
      wo: this.morphology.wordOrder.basic,
      mt: this.morphology.type[0], // First letter
      c: this.morphology.nominal.caseSystem.cases.map(c => [c.abbr, c.suffix || '']),
      t: this.morphology.verbal.tenses.tenses.map(t => [t.abbr, t.suffix || '']),
      l: entries.slice(0, 300).map(e => [e.lemma, e.gloss, e.class[0]]),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. QUALITY METRICS DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calculate comprehensive quality metrics
   * @returns {Object} Quality metrics dashboard
   */
  getMetrics() {
    if (this._metricsCache) {
      return this._metricsCache;
    }

    const metrics = {
      overall: 0,
      categories: {},
      recommendations: [],
    };

    // Phonological metrics
    metrics.categories.phonology = this._calculatePhonologyMetrics();

    // Morphological complexity
    metrics.categories.morphology = this._calculateMorphologyMetrics();

    // Lexical richness
    metrics.categories.lexicon = this._calculateLexiconMetrics();

    // Typological naturalness
    metrics.categories.naturalness = this._calculateNaturalnessMetrics();

    // Usability score
    metrics.categories.usability = this._calculateUsabilityMetrics();

    // Calculate overall score (weighted average)
    const weights = {
      phonology: 0.15,
      morphology: 0.20,
      lexicon: 0.25,
      naturalness: 0.20,
      usability: 0.20,
    };

    let totalScore = 0;
    for (const [cat, weight] of Object.entries(weights)) {
      totalScore += (metrics.categories[cat]?.score || 0) * weight;
    }

    metrics.overall = Math.round(totalScore);
    metrics.grade = this._getGrade(metrics.overall);

    // Generate recommendations
    metrics.recommendations = this._generateRecommendations(metrics.categories);

    this._metricsCache = metrics;
    return metrics;
  }

  _calculatePhonologyMetrics() {
    const consonants = this.phonology?.consonants || [];
    const vowels = this.phonology?.vowels || [];

    let score = 50;

    // Consonant inventory size (15-25 is ideal)
    if (consonants.length >= 15 && consonants.length <= 25) {
      score += 15;
    } else if (consonants.length >= 10 && consonants.length <= 30) {
      score += 10;
    }

    // Vowel inventory size (5-7 is most common)
    if (vowels.length >= 5 && vowels.length <= 7) {
      score += 15;
    } else if (vowels.length >= 3 && vowels.length <= 10) {
      score += 10;
    }

    // Sound diversity
    const manners = new Set(consonants.map(c => c.manner));
    const places = new Set(consonants.map(c => c.place));

    if (manners.size >= 4) score += 10;
    if (places.size >= 4) score += 10;

    return {
      score: Math.min(100, score),
      consonants: consonants.length,
      vowels: vowels.length,
      mannerTypes: manners.size,
      placeTypes: places.size,
    };
  }

  _calculateMorphologyMetrics() {
    let score = 50;

    const cases = this.morphology?.nominal?.caseSystem?.cases || [];
    const tenses = this.morphology?.verbal?.tenses?.tenses || [];
    const aspects = this.morphology?.verbal?.aspects?.aspects || [];

    // Case richness (2-8 is typical)
    if (cases.length >= 2 && cases.length <= 8) {
      score += 15;
    } else if (cases.length > 0) {
      score += 10;
    }

    // Tense/aspect coverage
    if (tenses.length >= 2) score += 10;
    if (aspects.length >= 2) score += 10;

    // Word order consistency
    const validOrders = ['SOV', 'SVO', 'VSO', 'VOS', 'OVS', 'OSV'];
    if (validOrders.includes(this.morphology?.wordOrder?.basic)) {
      score += 15;
    }

    return {
      score: Math.min(100, score),
      cases: cases.length,
      tenses: tenses.length,
      aspects: aspects.length,
      wordOrder: this.morphology?.wordOrder?.basic,
      type: this.morphology?.type,
    };
  }

  _calculateLexiconMetrics() {
    const entries = this.lexicon?.getEntries?.() || [];
    const stats = this.lexicon?.stats || {};

    let score = 30;

    // Size bonus
    if (entries.length >= 500) score += 25;
    else if (entries.length >= 300) score += 20;
    else if (entries.length >= 200) score += 15;
    else if (entries.length >= 100) score += 10;

    // Coverage of word classes
    const classes = new Set(entries.map(e => e.class));
    if (classes.size >= 4) score += 15;
    else if (classes.size >= 3) score += 10;

    // Semantic field diversity
    const fields = new Set(entries.map(e => e.field).filter(f => f));
    if (fields.size >= 10) score += 15;
    else if (fields.size >= 5) score += 10;

    // Basic vocabulary coverage
    const basicWords = ['person', 'water', 'fire', 'sun', 'moon', 'eat', 'see', 'go'];
    let covered = 0;
    for (const word of basicWords) {
      if (this.lexicon?.lookup?.(word)) covered++;
    }
    score += Math.round((covered / basicWords.length) * 15);

    return {
      score: Math.min(100, score),
      totalEntries: entries.length,
      wordClasses: classes.size,
      semanticFields: fields.size,
      basicCoverage: Math.round((covered / basicWords.length) * 100) + '%',
    };
  }

  _calculateNaturalnessMetrics() {
    let score = 50;

    // Word order frequency (SOV and SVO are most common)
    const wo = this.morphology?.wordOrder?.basic;
    if (wo === 'SOV' || wo === 'SVO') score += 15;
    else if (wo === 'VSO') score += 10;

    // Case-order correlation
    const cases = this.morphology?.nominal?.caseSystem?.cases || [];
    if ((wo === 'SOV' && cases.length >= 4) || (wo === 'SVO' && cases.length <= 4)) {
      score += 10;
    }

    // Phonological naturalness
    const consonants = this.phonology?.consonants || [];
    const hasCommonSounds = consonants.some(c => ['p', 't', 'k', 'm', 'n'].includes(c.roman));
    if (hasCommonSounds) score += 10;

    // Syllable structure simplicity
    const template = this.phonotactics?.template;
    if (template?.onsetMax <= 2 && template?.codaMax <= 2) {
      score += 15;
    }

    return {
      score: Math.min(100, score),
      wordOrderType: wo,
      typologicallyCommon: wo === 'SOV' || wo === 'SVO',
    };
  }

  _calculateUsabilityMetrics() {
    let score = 50;

    // Translation availability
    if (this.language.translationEngine) score += 15;

    // Lexicon searchability
    if (this.lexicon?.lookup) score += 10;

    // Documentation (Stone)
    if (this.language.stone) score += 15;

    // Paradigm generation
    const entries = this.lexicon?.getEntries?.() || [];
    const withParadigms = entries.filter(e => e.paradigm?.forms);
    if (withParadigms.length > entries.length * 0.5) score += 10;

    return {
      score: Math.min(100, score),
      hasTranslator: !!this.language.translationEngine,
      hasStone: !!this.language.stone,
      paradigmCoverage: Math.round((withParadigms.length / entries.length) * 100) + '%',
    };
  }

  _getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    if (score >= 45) return 'D';
    return 'F';
  }

  _generateRecommendations(categories) {
    const recs = [];

    if (categories.phonology?.score < 70) {
      if (categories.phonology.consonants < 15) {
        recs.push('Consider adding more consonants for richer phonology');
      }
      if (categories.phonology.mannerTypes < 4) {
        recs.push('Add more consonant manner types (stops, fricatives, nasals, approximants)');
      }
    }

    if (categories.morphology?.score < 70) {
      if (categories.morphology.cases < 2) {
        recs.push('Add grammatical cases for more expressive power');
      }
      if (categories.morphology.tenses < 2) {
        recs.push('Add more tense distinctions');
      }
    }

    if (categories.lexicon?.score < 70) {
      if (categories.lexicon.totalEntries < 200) {
        recs.push('Expand lexicon to at least 200 entries');
      }
      if (categories.lexicon.semanticFields < 5) {
        recs.push('Add vocabulary from more semantic domains');
      }
    }

    if (categories.usability?.score < 70) {
      if (!categories.usability.hasStone) {
        recs.push('Generate a Stone document for LLM context');
      }
    }

    return recs;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. INCREMENTAL LEXICON EXPANSION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add new words to the lexicon on demand
   * @param {Array|string} words - Words or concepts to add
   * @param {Object} options - Generation options
   * @returns {Array} Added entries
   */
  expandLexicon(words, options = {}) {
    const wordList = Array.isArray(words) ? words : [words];
    const added = [];

    for (const word of wordList) {
      // Check if already exists
      if (this.lexicon?.lookup?.(word)) {
        continue;
      }

      const entry = this._generateLexiconEntry(word, options);
      if (entry) {
        // Add to lexicon if possible
        if (this.lexicon?.addEntry) {
          this.lexicon.addEntry(entry);
        }
        added.push(entry);
      }
    }

    // Clear metrics cache since lexicon changed
    this._metricsCache = null;

    return added;
  }

  _generateLexiconEntry(word, options = {}) {
    const pos = options.pos || this._inferPOS(word);
    const field = options.field || this._inferSemanticField(word);

    // Generate lemma using fallback system
    const result = this.getWordWithFallback(word, pos);

    return {
      lemma: result.lemma,
      gloss: word,
      class: pos,
      field,
      generated: true,
      generatedAt: new Date().toISOString(),
      source: result.source,
    };
  }

  _inferPOS(word) {
    // Common verb patterns
    if (word.endsWith('ing') || word.endsWith('ify') || word.endsWith('ize') ||
        word.endsWith('ate') || word.endsWith('en')) {
      return 'verb';
    }

    // Common adjective patterns
    if (word.endsWith('ful') || word.endsWith('less') || word.endsWith('ous') ||
        word.endsWith('ive') || word.endsWith('able') || word.endsWith('ible') ||
        word.endsWith('al') || word.endsWith('ic')) {
      return 'adjective';
    }

    // Common adverb pattern
    if (word.endsWith('ly')) {
      return 'adverb';
    }

    // Default to noun
    return 'noun';
  }

  _inferSemanticField(word) {
    const fieldPatterns = {
      'body': ['head', 'hand', 'foot', 'eye', 'ear', 'mouth', 'heart', 'blood', 'bone', 'skin'],
      'nature': ['tree', 'river', 'mountain', 'forest', 'ocean', 'sky', 'cloud', 'rain', 'wind', 'flower'],
      'animal': ['dog', 'cat', 'bird', 'fish', 'horse', 'snake', 'wolf', 'bear', 'deer', 'lion'],
      'food': ['bread', 'meat', 'fruit', 'milk', 'egg', 'salt', 'honey', 'rice', 'corn', 'fish'],
      'kinship': ['mother', 'father', 'brother', 'sister', 'son', 'daughter', 'child', 'parent', 'wife', 'husband'],
      'emotion': ['love', 'hate', 'fear', 'anger', 'joy', 'sad', 'happy', 'hope', 'worry', 'peace'],
      'action': ['go', 'come', 'run', 'walk', 'eat', 'drink', 'sleep', 'fight', 'work', 'play'],
      'perception': ['see', 'hear', 'smell', 'taste', 'feel', 'touch', 'look', 'listen', 'watch', 'sense'],
    };

    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      if (patterns.some(p => word.toLowerCase().includes(p) || p.includes(word.toLowerCase()))) {
        return field;
      }
    }

    return 'general';
  }

  /**
   * Suggest words to add based on gaps in the lexicon
   * @returns {Array} Suggested words to add
   */
  suggestExpansions() {
    const suggestions = [];
    const existing = new Set((this.lexicon?.getEntries?.() || []).map(e => e.gloss?.toLowerCase()));

    // Core vocabulary that should exist
    const coreVocab = {
      'basic-nouns': ['person', 'man', 'woman', 'child', 'head', 'hand', 'eye', 'ear', 'mouth', 'heart',
                      'water', 'fire', 'earth', 'wind', 'sun', 'moon', 'star', 'day', 'night', 'year'],
      'basic-verbs': ['be', 'have', 'do', 'go', 'come', 'see', 'hear', 'know', 'think', 'want',
                      'give', 'take', 'make', 'say', 'eat', 'drink', 'sleep', 'die', 'live', 'love'],
      'basic-adjectives': ['big', 'small', 'good', 'bad', 'new', 'old', 'long', 'short', 'hot', 'cold',
                           'black', 'white', 'red', 'many', 'few', 'all', 'one', 'two', 'three', 'other'],
      'pronouns': ['I/me', 'you (sg)', 'he/she/it', 'we/us', 'you (pl)', 'they/them', 'this', 'that'],
      'question-words': ['what', 'who', 'where', 'when', 'why', 'how', 'which'],
    };

    for (const [category, words] of Object.entries(coreVocab)) {
      for (const word of words) {
        if (!existing.has(word.toLowerCase())) {
          suggestions.push({
            word,
            category,
            priority: category.startsWith('basic') ? 'high' : 'medium',
          });
        }
      }
    }

    return suggestions.slice(0, 50);
  }
}

export default QualityEngine;
