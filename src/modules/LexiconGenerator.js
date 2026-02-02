/**
 * GLOSSOPETRAE - Lexicon Generator Module
 *
 * Generates vocabulary for the constructed language, organized by
 * semantic field and with full paradigm generation.
 */

import { SEMANTIC_FIELDS, getAllConcepts, getCoreConcepts } from '../data/semantics.js';

export class LexiconGenerator {
  constructor(random, syllableForge, morphology, config = {}) {
    this.random = random;
    this.syllableForge = syllableForge;
    this.morphology = morphology;
    this.config = {
      coreOnly: config.coreOnly ?? false,
      minEditDistance: config.minEditDistance ?? 2,
      attributeModifier: config.attributeModifier || null,  // Function to modify entries for special attributes
      ...config,
    };

    this.generatedForms = new Set();
    this.lexicon = new Map();
  }

  generate() {
    const concepts = this.config.coreOnly ? getCoreConcepts() : getAllConcepts();

    // Generate entries for each concept
    for (const concept of concepts) {
      const entry = this._generateEntry(concept);
      this.lexicon.set(concept.english, entry);
    }

    // Generate function words
    this._generateFunctionWords();

    // Organize by semantic field
    const byField = this._organizeByField();

    // Generate paradigm examples
    const paradigmExamples = this._generateParadigmExamples();

    // Store reference to internal lexicon Map for lookup methods
    const lexiconMap = this.lexicon;

    return {
      entries: Array.from(this.lexicon.values()),
      byField,
      byClass: this._organizeByClass(),
      paradigmExamples,
      stats: this._generateStats(),
      // Expose lookup methods on the returned object
      lookup: (english) => lexiconMap.get(english),
      getEntries: () => Array.from(lexiconMap.values()),
      getByClass: (wordClass) => Array.from(lexiconMap.values()).filter(e => e.class === wordClass),
    };
  }

  _generateEntry(concept) {
    const syllableCount = this.random.int(concept.syllables[0], concept.syllables[1]);
    const form = this._generateUniqueForm(syllableCount);

    let entry = {
      lemma: form,
      gloss: concept.english,
      class: concept.class,
      field: concept.field,
      syllables: syllableCount,
      frequency: concept.frequency || 'normal',
    };

    // Generate paradigm based on word class
    if (concept.class === 'noun' || concept.class === 'pronoun') {
      entry.paradigm = this._generateNounParadigm(form);
    } else if (concept.class === 'verb') {
      entry.paradigm = this._generateVerbParadigm(form);
    } else if (concept.class === 'adjective') {
      entry.paradigm = this._generateAdjectiveParadigm(form);
    }

    // Apply attribute modifier if present (for special attributes like stealth, hyperefficient)
    if (this.config.attributeModifier) {
      entry = this.config.attributeModifier(entry);
    }

    return entry;
  }

  _generateUniqueForm(syllableCount) {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const form = this.syllableForge.generateWord(syllableCount);

      // Check uniqueness
      if (!this.generatedForms.has(form)) {
        // Check minimum edit distance from existing forms
        if (this._isSufficientlyDistinct(form)) {
          this.generatedForms.add(form);
          return form;
        }
      }

      attempts++;
    }

    // Fallback: generate longer word
    const longerForm = this.syllableForge.generateWord(syllableCount + 1);
    this.generatedForms.add(longerForm);
    return longerForm;
  }

  _isSufficientlyDistinct(form) {
    for (const existing of this.generatedForms) {
      if (this._editDistance(form, existing) < this.config.minEditDistance) {
        return false;
      }
    }
    return true;
  }

  _editDistance(a, b) {
    // Levenshtein distance
    const m = a.length;
    const n = b.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  _generateNounParadigm(lemma) {
    const paradigm = { lemma };
    const cases = this.morphology.nominal.caseSystem.cases;
    const numbers = this.morphology.nominal.numberSystem.categories;

    if (cases.length === 0 && numbers.length <= 1) {
      return paradigm;
    }

    paradigm.forms = {};

    for (const num of numbers) {
      for (const cas of cases) {
        const key = `${cas.abbr}.${num.abbr}`;
        const form = this._inflectNoun(lemma, cas, num);
        paradigm.forms[key] = form;
      }
    }

    // If no cases, just show number
    if (cases.length === 0) {
      for (const num of numbers) {
        paradigm.forms[num.abbr] = lemma + num.suffix;
      }
    }

    return paradigm;
  }

  _inflectNoun(lemma, cas, num) {
    let form = lemma;

    // Apply number suffix (often before case)
    if (num.suffix) {
      form += num.suffix;
    }

    // Apply case suffix
    if (cas.suffix) {
      form += cas.suffix;
    }

    return form;
  }

  _generateVerbParadigm(lemma) {
    const paradigm = { lemma };
    const tenses = this.morphology.verbal.tenses.tenses;
    const agreement = this.morphology.verbal.agreement;

    if (tenses.length === 0 && !agreement.hasAgreement) {
      return paradigm;
    }

    paradigm.forms = {};

    // Generate a subset for the paradigm display
    const tensesToShow = tenses.slice(0, 3);  // Show up to 3 tenses

    if (agreement.marksSubject) {
      const markers = agreement.subjectMarkers.slice(0, 6);  // 1SG, 2SG, 3SG, 1PL, 2PL, 3PL

      for (const tense of tensesToShow) {
        for (const marker of markers) {
          const key = `${tense.abbr}.${marker.label}`;
          const form = this._inflectVerb(lemma, tense, marker);
          paradigm.forms[key] = form;
        }
      }
    } else {
      // Just tense
      for (const tense of tensesToShow) {
        paradigm.forms[tense.abbr] = lemma + tense.suffix;
      }
    }

    return paradigm;
  }

  _inflectVerb(lemma, tense, agreement) {
    let form = lemma;

    // Apply tense
    if (tense.suffix) {
      form += tense.suffix;
    }

    // Apply agreement
    if (agreement && agreement.affix) {
      form += agreement.affix;
    }

    return form;
  }

  _generateAdjectiveParadigm(lemma) {
    const paradigm = { lemma };
    const nounClasses = this.morphology.nominal.nounClasses;

    // Check if adjectives agree
    if (nounClasses.count > 0 && nounClasses.agreementOn?.includes('adjectives')) {
      paradigm.forms = {};
      const cases = this.morphology.nominal.caseSystem.cases.slice(0, 2);  // NOM, ACC

      for (const cas of cases) {
        paradigm.forms[cas.abbr] = lemma + (cas.suffix || '');
      }
    }

    return paradigm;
  }

  _generateFunctionWords() {
    // Conjunctions
    const conjunctions = ['and', 'or', 'but', 'if', 'because'];
    for (const conj of conjunctions) {
      if (!this.lexicon.has(conj)) {
        this.lexicon.set(conj, {
          lemma: this._generateUniqueForm(1),
          gloss: conj,
          class: 'conjunction',
          field: 'Connectors',
        });
      }
    }

    // Particles
    const particles = ['not', 'yes', 'no'];
    for (const part of particles) {
      if (!this.lexicon.has(part)) {
        this.lexicon.set(part, {
          lemma: this._generateUniqueForm(1),
          gloss: part,
          class: 'particle',
          field: 'Connectors',
        });
      }
    }

    // Question particle (if language uses one)
    if (this.random.bool(0.6)) {
      this.lexicon.set('Q', {
        lemma: this._generateUniqueForm(1),
        gloss: 'question particle',
        class: 'particle',
        field: 'Questions',
      });
    }

    // Copula (if not zero-copula)
    if (this.random.bool(0.7)) {
      this.lexicon.set('be (copula)', {
        lemma: this._generateUniqueForm(1),
        gloss: 'to be (copula)',
        class: 'verb',
        field: 'BasicVerbs',
        isCopula: true,
      });
    }
  }

  _organizeByField() {
    const byField = {};

    for (const entry of this.lexicon.values()) {
      const field = entry.field || 'Other';
      if (!byField[field]) {
        byField[field] = [];
      }
      byField[field].push(entry);
    }

    return byField;
  }

  _organizeByClass() {
    const byClass = {};

    for (const entry of this.lexicon.values()) {
      const cls = entry.class || 'other';
      if (!byClass[cls]) {
        byClass[cls] = [];
      }
      byClass[cls].push(entry);
    }

    return byClass;
  }

  _generateParadigmExamples() {
    const examples = [];

    // Pick a noun to show full paradigm
    const nouns = Array.from(this.lexicon.values()).filter(e => e.class === 'noun' && e.paradigm?.forms);
    if (nouns.length > 0) {
      const noun = this.random.pick(nouns);
      examples.push({
        type: 'noun',
        word: noun.gloss,
        lemma: noun.lemma,
        paradigm: noun.paradigm,
      });
    }

    // Pick a verb to show conjugation
    const verbs = Array.from(this.lexicon.values()).filter(e => e.class === 'verb' && e.paradigm?.forms);
    if (verbs.length > 0) {
      const verb = this.random.pick(verbs);
      examples.push({
        type: 'verb',
        word: verb.gloss,
        lemma: verb.lemma,
        paradigm: verb.paradigm,
      });
    }

    return examples;
  }

  _generateStats() {
    const entries = Array.from(this.lexicon.values());

    return {
      totalEntries: entries.length,
      byClass: {
        nouns: entries.filter(e => e.class === 'noun').length,
        verbs: entries.filter(e => e.class === 'verb').length,
        adjectives: entries.filter(e => e.class === 'adjective').length,
        pronouns: entries.filter(e => e.class === 'pronoun').length,
        other: entries.filter(e => !['noun', 'verb', 'adjective', 'pronoun'].includes(e.class)).length,
      },
      avgSyllables: entries.reduce((sum, e) => sum + (e.syllables || 1), 0) / entries.length,
      semanticFields: Object.keys(this._organizeByField()).length,
    };
  }

  // Public method to look up a word
  lookup(english) {
    return this.lexicon.get(english);
  }

  // Public method to get all entries
  getEntries() {
    return Array.from(this.lexicon.values());
  }

  // Get entries by class
  getByClass(wordClass) {
    return Array.from(this.lexicon.values()).filter(e => e.class === wordClass);
  }
}
