/**
 * GLOSSOPETRAE - Language Evolution Engine
 * Simulates diachronic language change to produce language families.
 *
 * Takes any generated language as a proto-language and evolves it through
 * N generations of sound changes, grammatical drift, and lexical replacement,
 * producing a family tree of deterministically derived daughter languages.
 *
 * Based on historical linguistics research:
 * - Grimm's Law and chain shift theory
 * - Swadesh lexical retention rates (~86% per 1000 years for core vocab)
 * - Typological universals for grammatical drift
 * - Neogrammarian regularity hypothesis for sound law application
 *
 * Research assistance: REDSTORM Research Platform (DeepSeek)
 */

// ─── Sound Change Rule Database ──────────────────────────────────────────────

const SOUND_CHANGE_TYPES = [
  {
    name: 'lenition',
    description: 'Weakening of consonants between vowels',
    targets: ['p', 't', 'k', 'b', 'd', 'g'],
    results: ['b', 'd', 'g', 'v', 'ð', 'ɣ'],
    environment: 'intervocalic',
    probability: 0.70,
    chain: true
  },
  {
    name: 'final_devoicing',
    description: 'Voiced stops become voiceless word-finally',
    targets: ['b', 'd', 'g', 'v', 'z', 'ʒ'],
    results: ['p', 't', 'k', 'f', 's', 'ʃ'],
    environment: 'word_final',
    probability: 0.85,
    chain: false
  },
  {
    name: 'palatalization',
    description: 'Velars become palatal/postalveolar before front vowels',
    targets: ['k', 'g', 'x'],
    results: ['tʃ', 'dʒ', 'ʃ'],
    environment: 'before_front_vowel',
    probability: 0.65,
    chain: false
  },
  {
    name: 'vowel_raising',
    description: 'Low/mid vowels raise',
    targets: ['a', 'ɛ', 'ɔ', 'e', 'o'],
    results: ['ɛ', 'e', 'o', 'i', 'u'],
    environment: 'unconditional',
    probability: 0.55,
    chain: true
  },
  {
    name: 'vowel_lowering',
    description: 'High/mid vowels lower',
    targets: ['i', 'u', 'e', 'o'],
    results: ['e', 'o', 'ɛ', 'ɔ'],
    environment: 'unconditional',
    probability: 0.45,
    chain: true
  },
  {
    name: 'nasal_assimilation',
    description: 'Nasals assimilate to following stop place',
    targets: ['n'],
    results: ['m', 'n', 'ŋ'],
    environment: 'before_stop',
    probability: 0.90,
    chain: false
  },
  {
    name: 'syncope',
    description: 'Deletion of unstressed vowels',
    targets: ['a', 'e', 'i', 'o', 'u', 'ɛ', 'ɔ'],
    results: [],
    environment: 'unstressed',
    probability: 0.50,
    chain: false
  },
  {
    name: 'rhotacism',
    description: 'Sibilant becomes rhotic between vowels',
    targets: ['s', 'z'],
    results: ['r', 'r'],
    environment: 'intervocalic',
    probability: 0.40,
    chain: false
  },
  {
    name: 'monophthongization',
    description: 'Diphthongs collapse to single vowels',
    targets: ['ai', 'au', 'ei', 'ou', 'oi'],
    results: ['ɛ', 'ɔ', 'e', 'o', 'ø'],
    environment: 'unconditional',
    probability: 0.50,
    chain: false
  },
  {
    name: 'metathesis',
    description: 'Consonant-liquid clusters swap order',
    targets: ['r', 'l'],
    results: ['r', 'l'],
    environment: 'cluster_swap',
    probability: 0.35,
    chain: false
  },
  {
    name: 'fortition',
    description: 'Strengthening of fricatives to stops',
    targets: ['v', 'ð', 'ɣ', 'β'],
    results: ['b', 'd', 'g', 'b'],
    environment: 'word_initial',
    probability: 0.40,
    chain: false
  },
  {
    name: 'h_loss',
    description: 'Loss of glottal fricative',
    targets: ['h'],
    results: [],
    environment: 'unconditional',
    probability: 0.60,
    chain: false
  }
];

const FRONT_VOWELS = ['i', 'e', 'ɛ', 'æ', 'y', 'ø'];
const BACK_VOWELS = ['u', 'o', 'ɔ', 'ɑ', 'ɯ'];
const ALL_VOWELS = ['a', 'e', 'i', 'o', 'u', 'ɛ', 'ɔ', 'æ', 'ɑ', 'y', 'ø', 'ɯ'];
const STOPS = ['p', 'b', 't', 'd', 'k', 'g'];

// ─── Grammatical Drift Patterns ──────────────────────────────────────────────

const GRAMMATICAL_DRIFTS = [
  {
    name: 'case_erosion',
    description: 'Case suffixes erode due to phonological reduction',
    probability: 0.45,
    apply(morphology, random) {
      if (!morphology.nominalMorphology?.cases) return morphology;
      const cases = morphology.nominalMorphology.cases;
      if (cases.length <= 2) return morphology;
      // Remove 1-2 cases, keep nominative and accusative
      const keepCount = Math.max(2, cases.length - random.int(1, 2));
      const essential = cases.filter(c =>
        ['nominative', 'accusative', 'absolutive', 'ergative'].includes(c.name)
      );
      const others = cases.filter(c => !essential.includes(c));
      random.shuffle(others);
      const kept = [...essential, ...others].slice(0, keepCount);
      return {
        ...morphology,
        nominalMorphology: { ...morphology.nominalMorphology, cases: kept }
      };
    }
  },
  {
    name: 'word_order_shift',
    description: 'Word order drifts toward neighboring typological attractor',
    probability: 0.25,
    apply(morphology, random) {
      const shifts = {
        'SOV': ['SVO', 'SOV', 'SOV'], // SOV tends to stay or go SVO
        'SVO': ['SVO', 'SVO', 'VSO'], // SVO is stable
        'VSO': ['SVO', 'VSO', 'VOS'],
        'VOS': ['VSO', 'VOS', 'SVO'],
        'OVS': ['SOV', 'OVS', 'OSV'],
        'OSV': ['SOV', 'OSV', 'OVS']
      };
      const current = morphology.wordOrder || 'SVO';
      const options = shifts[current] || ['SVO'];
      return { ...morphology, wordOrder: random.pick(options) };
    }
  },
  {
    name: 'analytic_drift',
    description: 'Synthetic morphology erodes toward analytic structure',
    probability: 0.35,
    apply(morphology, random) {
      const analyticShift = {
        'polysynthetic': 'agglutinative',
        'agglutinative': random.bool(0.6) ? 'agglutinative' : 'fusional',
        'fusional': random.bool(0.5) ? 'fusional' : 'isolating',
        'isolating': 'isolating'
      };
      const current = morphology.morphType || 'fusional';
      return { ...morphology, morphType: analyticShift[current] || current };
    }
  },
  {
    name: 'tense_aspect_drift',
    description: 'Tense markers shift toward aspect marking',
    probability: 0.30,
    apply(morphology, random) {
      if (!morphology.verbalMorphology?.tenses) return morphology;
      const tenses = [...morphology.verbalMorphology.tenses];
      // Chance to merge past/perfective or add aspect distinction
      if (tenses.length > 3 && random.bool(0.4)) {
        tenses.pop(); // Lose a tense distinction
      }
      return {
        ...morphology,
        verbalMorphology: { ...morphology.verbalMorphology, tenses }
      };
    }
  },
  {
    name: 'agreement_simplification',
    description: 'Verb agreement paradigms simplify through analogy',
    probability: 0.40,
    apply(morphology, random) {
      if (!morphology.verbalMorphology?.agreement) return morphology;
      const agreement = { ...morphology.verbalMorphology.agreement };
      // Reduce person distinctions
      if (agreement.persons && agreement.persons > 2 && random.bool(0.5)) {
        agreement.persons--;
      }
      return {
        ...morphology,
        verbalMorphology: { ...morphology.verbalMorphology, agreement }
      };
    }
  }
];

// ─── Main Engine ─────────────────────────────────────────────────────────────

export class LanguageEvolutionEngine {
  /**
   * Create a new Language Evolution Engine.
   *
   * @param {SeededRandom} random - Seeded PRNG instance
   * @param {Object} baseLanguage - A fully generated GLOSSOPETRAE language object
   * @param {Object} config - Evolution configuration
   */
  constructor(random, baseLanguage, config = {}) {
    this.random = random;
    this.baseLanguage = baseLanguage;
    this.config = {
      branchCount: config.branchCount ?? 3,
      generations: config.generations ?? 10,
      soundChangeIntensity: config.soundChangeIntensity ?? 0.5,
      grammaticalDriftRate: config.grammaticalDriftRate ?? 0.3,
      lexicalRetentionBase: config.lexicalRetentionBase ?? 0.86,
      isolationFactor: config.isolationFactor ?? 0.6,
      ...config
    };
  }

  /**
   * Generate a complete language family from the base language.
   *
   * @returns {Object} Family tree with proto-language, descendants, cognates, phylogeny
   */
  generate() {
    const protoLanguage = this._cloneLanguage(this.baseLanguage);
    protoLanguage._isProto = true;
    protoLanguage._generation = 0;

    // Generate branch-specific evolution parameters
    const branchParams = this._generateBranchParams();

    // Evolve each branch independently
    const descendants = [];
    const allSoundLaws = [];
    const cognateDatabase = [];

    for (let b = 0; b < this.config.branchCount; b++) {
      const params = branchParams[b];
      const { language, soundLaws, cognates } = this._evolveBranch(
        protoLanguage, params, b
      );
      descendants.push(language);
      allSoundLaws.push({ branch: params.name, laws: soundLaws });
      cognateDatabase.push(...cognates);
    }

    // Calculate divergence metrics
    const divergenceMetrics = this._calculateDivergence(protoLanguage, descendants);

    // Build phylogenetic tree
    const phylogeny = this._buildPhylogeny(protoLanguage, descendants, branchParams);

    return {
      protoLanguage,
      descendants,
      soundLaws: allSoundLaws,
      cognateDatabase: this._deduplicateCognates(cognateDatabase),
      divergenceMetrics,
      phylogeny,
      config: { ...this.config }
    };
  }

  /**
   * Generate documentation section for Skillstone output.
   *
   * @param {Object} family - Output from generate()
   * @returns {string} Markdown documentation
   */
  generateStoneSection(family) {
    const lines = [];
    lines.push('## LANGUAGE FAMILY EVOLUTION');
    lines.push('');
    lines.push(`**Proto-language:** ${family.protoLanguage.name || 'Proto-Language'}`);
    lines.push(`**Descendants:** ${family.descendants.length}`);
    lines.push(`**Generations simulated:** ${this.config.generations}`);
    lines.push('');

    // Phylogenetic tree (ASCII)
    lines.push('### Phylogenetic Tree');
    lines.push('```');
    lines.push(family.phylogeny.asciiTree);
    lines.push('```');
    lines.push('');

    // Sound laws per branch
    lines.push('### Sound Laws Applied');
    for (const { branch, laws } of family.soundLaws) {
      lines.push(`\n**${branch}:**`);
      for (const law of laws.slice(0, 8)) {
        lines.push(`- ${law.name}: ${law.rule}`);
      }
      if (laws.length > 8) {
        lines.push(`- ... and ${laws.length - 8} more`);
      }
    }
    lines.push('');

    // Sample cognate sets
    lines.push('### Cognate Sets (Sample)');
    lines.push('| Proto-form | Meaning | ' +
      family.descendants.map(d => d.name || 'Daughter').join(' | ') + ' |');
    lines.push('|' + '---|'.repeat(2 + family.descendants.length));

    const sampleCognates = family.cognateDatabase.slice(0, 15);
    for (const cog of sampleCognates) {
      const reflexes = family.descendants.map(d => {
        const r = cog.reflexes[d.name || `Daughter_${family.descendants.indexOf(d)}`];
        return r ? r.form : '(lost)';
      });
      lines.push(`| ${cog.protoForm} | ${cog.meaning} | ${reflexes.join(' | ')} |`);
    }
    lines.push('');

    // Divergence summary
    lines.push('### Divergence Metrics');
    for (const metric of family.divergenceMetrics) {
      lines.push(`- **${metric.pair}:** ${(metric.lexicalSimilarity * 100).toFixed(1)}% lexical similarity, ` +
        `${(metric.phonologicalDistance * 100).toFixed(1)}% phonological distance`);
    }
    lines.push('');

    return lines.join('\n');
  }

  // ─── Branch Evolution ────────────────────────────────────────────────────

  _generateBranchParams() {
    const params = [];
    const nameRoots = ['Northern', 'Southern', 'Eastern', 'Western', 'Highland',
      'Coastal', 'Inland', 'Island', 'Mountain', 'Valley'];

    for (let b = 0; b < this.config.branchCount; b++) {
      const isolation = this.config.isolationFactor + this.random.float(-0.2, 0.2);
      params.push({
        name: this.random.pick(nameRoots.splice(
          Math.floor(this.random.next() * nameRoots.length), 1
        )) || `Branch_${b}`,
        soundChangeIntensity: this.config.soundChangeIntensity * (0.7 + this.random.float(0, 0.6)),
        grammaticalDriftRate: this.config.grammaticalDriftRate * (0.7 + this.random.float(0, 0.6)),
        isolation: Math.max(0, Math.min(1, isolation)),
        branchIndex: b
      });
    }
    return params;
  }

  _evolveBranch(protoLanguage, params, branchIndex) {
    let current = this._cloneLanguage(protoLanguage);
    const soundLaws = [];
    const cognates = [];

    // Snapshot proto lexicon for cognate tracking
    const protoLexicon = this._extractLexicon(protoLanguage);

    for (let gen = 0; gen < this.config.generations; gen++) {
      // Sound changes (most frequent type of change)
      const genSoundChanges = this._selectSoundChanges(
        current, params.soundChangeIntensity
      );
      for (const change of genSoundChanges) {
        current = this._applySoundChange(current, change);
        soundLaws.push({
          ...change,
          generation: gen,
          branch: params.name
        });
      }

      // Grammatical drift (less frequent)
      if (this.random.bool(params.grammaticalDriftRate)) {
        current = this._applyGrammaticalDrift(current);
      }

      // Lexical replacement
      current = this._applyLexicalReplacement(current, gen);
    }

    // Name the daughter language
    const baseName = protoLanguage.name || 'Proto';
    current.name = `${params.name} ${baseName.replace('Proto-', '')}`.trim();
    current._generation = this.config.generations;
    current._branch = params.name;

    // Build cognate sets by comparing proto and daughter lexicons
    const daughterLexicon = this._extractLexicon(current);
    for (const protoEntry of protoLexicon) {
      const daughterEntry = daughterLexicon.find(
        e => e.meaning === protoEntry.meaning
      );
      if (daughterEntry) {
        cognates.push({
          protoForm: protoEntry.form,
          meaning: protoEntry.meaning,
          reflexes: {
            [current.name]: {
              form: daughterEntry.form,
              confidence: this._calculateCognateConfidence(
                protoEntry.form, daughterEntry.form, soundLaws
              )
            }
          }
        });
      }
    }

    return { language: current, soundLaws, cognates };
  }

  // ─── Sound Change Application ────────────────────────────────────────────

  _selectSoundChanges(language, intensity) {
    const phonemes = this._getPhonemeInventory(language);
    const changes = [];

    // Select 1-3 sound changes per generation based on intensity
    const changeCount = Math.max(1, Math.round(intensity * 3));

    for (let i = 0; i < changeCount; i++) {
      const changeType = this.random.pick(SOUND_CHANGE_TYPES);

      // Check if this change is applicable to the current phoneme inventory
      const applicableTargets = changeType.targets.filter(t =>
        phonemes.consonants.includes(t) || phonemes.vowels.includes(t) ||
        // Diphthongs for monophthongization
        (changeType.name === 'monophthongization')
      );

      if (applicableTargets.length > 0 && this.random.bool(changeType.probability * intensity)) {
        // Pick a specific target phoneme
        const target = this.random.pick(applicableTargets);
        const targetIdx = changeType.targets.indexOf(target);
        const result = changeType.results[targetIdx] ??
          changeType.results[targetIdx % changeType.results.length];

        changes.push({
          name: changeType.name,
          target,
          result: result || null, // null = deletion
          environment: changeType.environment,
          rule: `${target} > ${result || '∅'} / ${this._formatEnvironment(changeType.environment)}`,
          isChain: changeType.chain
        });
      }
    }
    return changes;
  }

  _applySoundChange(language, change) {
    const lang = this._cloneLanguage(language);

    // Apply to phoneme inventory
    if (lang.phonology?.consonants) {
      lang.phonology.consonants = this._applyChangeToInventory(
        lang.phonology.consonants, change
      );
    }
    if (lang.phonology?.vowels) {
      lang.phonology.vowels = this._applyChangeToInventory(
        lang.phonology.vowels, change
      );
    }

    // Apply to lexicon entries
    if (lang.lexicon?.entries) {
      lang.lexicon.entries = lang.lexicon.entries.map(entry => ({
        ...entry,
        word: this._applyChangeToWord(entry.word || '', change),
        ipa: this._applyChangeToWord(entry.ipa || entry.word || '', change)
      }));
    }

    // Apply to morphological affixes
    if (lang.morphology?.nominalMorphology?.cases) {
      lang.morphology.nominalMorphology.cases =
        lang.morphology.nominalMorphology.cases.map(c => ({
          ...c,
          suffix: c.suffix ? this._applyChangeToWord(c.suffix, change) : c.suffix,
          prefix: c.prefix ? this._applyChangeToWord(c.prefix, change) : c.prefix
        }));
    }

    return lang;
  }

  _applyChangeToInventory(inventory, change) {
    if (!Array.isArray(inventory)) return inventory;
    return inventory.map(phoneme => {
      if (phoneme === change.target) {
        if (change.result === null || change.result === '') {
          return null; // Mark for deletion
        }
        return change.result;
      }
      return phoneme;
    }).filter(p => p !== null);
  }

  _applyChangeToWord(word, change) {
    if (!word || typeof word !== 'string') return word;

    const { target, result, environment } = change;
    const replacement = result || '';

    switch (environment) {
      case 'intervocalic': {
        // Target between vowels
        const vowelPattern = `([${ALL_VOWELS.join('')}])${this._escapeRegex(target)}([${ALL_VOWELS.join('')}])`;
        try {
          const regex = new RegExp(vowelPattern, 'g');
          return word.replace(regex, `$1${replacement}$2`);
        } catch {
          return word.replaceAll(target, replacement);
        }
      }
      case 'word_final':
        if (word.endsWith(target)) {
          return word.slice(0, -target.length) + replacement;
        }
        return word;
      case 'word_initial':
        if (word.startsWith(target)) {
          return replacement + word.slice(target.length);
        }
        return word;
      case 'before_front_vowel': {
        for (const v of FRONT_VOWELS) {
          const pattern = target + v;
          if (word.includes(pattern)) {
            word = word.replaceAll(pattern, replacement + v);
          }
        }
        return word;
      }
      case 'before_stop': {
        for (const s of STOPS) {
          const pattern = target + s;
          // Assimilate nasal to stop place
          const assimilated = s === 'p' || s === 'b' ? 'm' :
            s === 'k' || s === 'g' ? 'ŋ' : 'n';
          if (word.includes(pattern)) {
            word = word.replaceAll(pattern, assimilated + s);
          }
        }
        return word;
      }
      case 'unstressed':
        // Simplified: delete vowels that aren't the first or last character
        if (word.length > 3 && ALL_VOWELS.includes(target)) {
          const mid = word.slice(1, -1);
          const replaced = mid.replaceAll(target, replacement);
          // Only apply if it doesn't create unpronounceable clusters (3+ consonants)
          const result = word[0] + replaced + word[word.length - 1];
          if (!/[^aeiouɛɔæɑyøɯ]{4,}/.test(result)) {
            return result;
          }
        }
        return word;
      case 'cluster_swap': {
        // Metathesis: swap Cr -> rC or Cl -> lC
        const consonants = 'ptksdfgxhbvznmŋ';
        for (const c of consonants) {
          const cluster = c + target;
          const swapped = target + c;
          if (word.includes(cluster)) {
            word = word.replace(cluster, swapped);
            break; // Only one metathesis per word
          }
        }
        return word;
      }
      default:
        return word.replaceAll(target, replacement);
    }
  }

  // ─── Grammatical Drift ──────────────────────────────────────────────────

  _applyGrammaticalDrift(language) {
    const lang = this._cloneLanguage(language);
    if (!lang.morphology) return lang;

    // Select a random drift pattern
    const applicableDrifts = GRAMMATICAL_DRIFTS.filter(
      d => this.random.bool(d.probability)
    );

    if (applicableDrifts.length > 0) {
      const drift = this.random.pick(applicableDrifts);
      lang.morphology = drift.apply(lang.morphology, this.random);
    }

    return lang;
  }

  // ─── Lexical Replacement ────────────────────────────────────────────────

  _applyLexicalReplacement(language, generation) {
    const lang = this._cloneLanguage(language);
    if (!lang.lexicon?.entries) return lang;

    // Swadesh retention: ~86% per 1000 years
    // Each generation represents ~100 years, so per-generation retention ≈ 0.985
    const retentionPerGen = Math.pow(this.config.lexicalRetentionBase, 1 / 10);

    lang.lexicon.entries = lang.lexicon.entries.map(entry => {
      // Core vocabulary (first 100 items) is more resistant to replacement
      const isCore = lang.lexicon.entries.indexOf(entry) < 100;
      const adjustedRetention = isCore ? retentionPerGen * 1.02 : retentionPerGen * 0.95;

      if (!this.random.bool(adjustedRetention)) {
        // Replace this word with a new form
        const newForm = this._generateReplacementWord(lang);
        return {
          ...entry,
          word: newForm,
          ipa: newForm,
          _replaced: true,
          _replacedAtGen: generation
        };
      }
      return entry;
    });

    return lang;
  }

  _generateReplacementWord(language) {
    // Generate a new word that respects the language's phonotactics
    const consonants = language.phonology?.consonants || ['t', 'k', 'n', 's'];
    const vowels = language.phonology?.vowels || ['a', 'i', 'u'];
    const syllables = this.random.int(1, 3);
    let word = '';

    for (let s = 0; s < syllables; s++) {
      // Optional onset
      if (this.random.bool(0.7)) {
        word += this.random.pick(consonants);
      }
      // Nucleus (required)
      word += this.random.pick(vowels);
      // Optional coda
      if (this.random.bool(0.3) && s < syllables - 1) {
        word += this.random.pick(consonants);
      }
    }
    return word;
  }

  // ─── Cognate Tracking ──────────────────────────────────────────────────

  _calculateCognateConfidence(protoForm, daughterForm, soundLaws) {
    if (!protoForm || !daughterForm) return 0;

    // Levenshtein-based similarity
    const distance = this._levenshtein(protoForm, daughterForm);
    const maxLen = Math.max(protoForm.length, daughterForm.length);
    if (maxLen === 0) return 1;

    const similarity = 1 - (distance / maxLen);

    // Boost confidence if changes are explainable by sound laws
    let explainableChanges = 0;
    for (const law of soundLaws) {
      if (protoForm.includes(law.target) && !daughterForm.includes(law.target)) {
        explainableChanges++;
      }
    }
    const lawBoost = Math.min(0.2, explainableChanges * 0.05);

    return Math.min(1, similarity + lawBoost);
  }

  _levenshtein(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[b.length][a.length];
  }

  _deduplicateCognates(cognates) {
    const merged = new Map();
    for (const cog of cognates) {
      const key = `${cog.protoForm}:${cog.meaning}`;
      if (merged.has(key)) {
        // Merge reflexes
        const existing = merged.get(key);
        Object.assign(existing.reflexes, cog.reflexes);
      } else {
        merged.set(key, { ...cog });
      }
    }
    return Array.from(merged.values());
  }

  // ─── Divergence Metrics ─────────────────────────────────────────────────

  _calculateDivergence(proto, descendants) {
    const metrics = [];
    for (let i = 0; i < descendants.length; i++) {
      for (let j = i + 1; j < descendants.length; j++) {
        const a = descendants[i];
        const b = descendants[j];
        metrics.push({
          pair: `${a.name} ↔ ${b.name}`,
          lexicalSimilarity: this._lexicalSimilarity(a, b),
          phonologicalDistance: this._phonologicalDistance(a, b),
          morphologicalDistance: this._morphologicalDistance(a, b)
        });
      }
      // Also measure distance from proto
      metrics.push({
        pair: `Proto ↔ ${descendants[i].name}`,
        lexicalSimilarity: this._lexicalSimilarity(proto, descendants[i]),
        phonologicalDistance: this._phonologicalDistance(proto, descendants[i]),
        morphologicalDistance: this._morphologicalDistance(proto, descendants[i])
      });
    }
    return metrics;
  }

  _lexicalSimilarity(langA, langB) {
    const lexA = this._extractLexicon(langA);
    const lexB = this._extractLexicon(langB);
    if (!lexA.length || !lexB.length) return 0;

    let matches = 0;
    let compared = 0;
    for (const entryA of lexA.slice(0, 100)) {
      const entryB = lexB.find(e => e.meaning === entryA.meaning);
      if (entryB) {
        compared++;
        const dist = this._levenshtein(entryA.form, entryB.form);
        const maxLen = Math.max(entryA.form.length, entryB.form.length);
        if (maxLen > 0 && (dist / maxLen) < 0.5) {
          matches++;
        }
      }
    }
    return compared > 0 ? matches / compared : 0;
  }

  _phonologicalDistance(langA, langB) {
    const phonA = new Set([
      ...(langA.phonology?.consonants || []),
      ...(langA.phonology?.vowels || [])
    ]);
    const phonB = new Set([
      ...(langB.phonology?.consonants || []),
      ...(langB.phonology?.vowels || [])
    ]);

    const union = new Set([...phonA, ...phonB]);
    const intersection = new Set([...phonA].filter(p => phonB.has(p)));

    return union.size > 0 ? 1 - (intersection.size / union.size) : 0;
  }

  _morphologicalDistance(langA, langB) {
    let distance = 0;
    let features = 0;

    // Compare word order
    if (langA.morphology?.wordOrder && langB.morphology?.wordOrder) {
      features++;
      if (langA.morphology.wordOrder !== langB.morphology.wordOrder) distance++;
    }

    // Compare morph type
    if (langA.morphology?.morphType && langB.morphology?.morphType) {
      features++;
      if (langA.morphology.morphType !== langB.morphology.morphType) distance++;
    }

    // Compare case count
    const casesA = langA.morphology?.nominalMorphology?.cases?.length || 0;
    const casesB = langB.morphology?.nominalMorphology?.cases?.length || 0;
    features++;
    distance += Math.abs(casesA - casesB) / Math.max(casesA, casesB, 1);

    return features > 0 ? distance / features : 0;
  }

  // ─── Phylogeny ──────────────────────────────────────────────────────────

  _buildPhylogeny(proto, descendants, branchParams) {
    const protoName = proto.name || 'Proto-Language';
    const branches = descendants.map((d, i) => ({
      name: d.name,
      params: branchParams[i],
      divergence: this._phonologicalDistance(proto, d)
    }));

    // Sort by divergence for tree layout
    branches.sort((a, b) => a.divergence - b.divergence);

    // Build ASCII tree
    let tree = `  ${protoName}\n`;
    for (let i = 0; i < branches.length; i++) {
      const isLast = i === branches.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const pct = (branches[i].divergence * 100).toFixed(0);
      tree += `  ${connector}${branches[i].name} (${pct}% diverged)\n`;
    }

    return {
      root: protoName,
      branches: branches.map(b => ({
        name: b.name,
        divergence: b.divergence,
        isolation: b.params.isolation,
        soundChangeIntensity: b.params.soundChangeIntensity
      })),
      asciiTree: tree
    };
  }

  // ─── Utility Methods ────────────────────────────────────────────────────

  _cloneLanguage(language) {
    return JSON.parse(JSON.stringify(language));
  }

  _extractLexicon(language) {
    if (!language.lexicon?.entries) return [];
    return language.lexicon.entries.map(e => ({
      form: e.word || e.form || '',
      meaning: e.english || e.meaning || e.gloss || '',
      pos: e.pos || e.wordClass || 'unknown'
    }));
  }

  _getPhonemeInventory(language) {
    return {
      consonants: language.phonology?.consonants || [],
      vowels: language.phonology?.vowels || []
    };
  }

  _formatEnvironment(env) {
    const formats = {
      'intervocalic': 'V_V',
      'word_final': '_#',
      'word_initial': '#_',
      'before_front_vowel': '_[+front]',
      'before_stop': '_C[-cont]',
      'unstressed': '[-stress]_',
      'cluster_swap': 'C_',
      'unconditional': '_'
    };
    return formats[env] || '_';
  }

  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
