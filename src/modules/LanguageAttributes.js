/**
 * GLOSSOPETRAE - Language Attributes Module v2.0
 *
 * Enhanced with cutting-edge 2025-2026 AI security research:
 *
 * Core Attributes:
 * - HYPEREFFICIENT: Maximize semantic density per token
 * - STEALTH: Covert communication with guardrail evasion
 * - ADVERSARIAL: LLM parsing confusion & garden-paths
 * - REDUNDANT: Error-correcting, survives noise
 * - MINIMAL: Oligosynthetic design
 *
 * New Research-Based Attributes:
 * - TOKENBREAK: BPE merge exploitation (HiddenLayers, 2025)
 * - STEGO: Semantic steganography (Norelli & Bronstein, 2025)
 * - PHANTOM: Imperceptible perturbations (90%+ guardrail evasion)
 *
 * References:
 * - "TokenBreak Attack Method" (HiddenLayers, June 2025)
 * - "Improbable Bigrams Expose Vulnerabilities" (arXiv, Oct 2025)
 * - "Bypassing LLM Guardrails" (Mindgard, April 2025)
 * - "LLMs can hide text in other text" (Norelli & Bronstein, Oct 2025)
 */

import { TokenExploiter, MERGE_BREAKERS, GLITCH_TOKENS } from './TokenExploiter.js';
import { SemanticStego, EVASION_TECHNIQUES, COVER_STORIES } from './SemanticStego.js';

// Characters known to tokenize efficiently in common LLM tokenizers
// These often encode as single tokens despite being multiple bytes
export const EFFICIENT_CHARS = {
  // Single-token Unicode that encodes lots of visual info
  logographic: ['龍', '愛', '夢', '風', '火', '水', '木', '金', '土', '天', '地', '人', '心', '日', '月'],
  // Cyrillic that looks like Latin but tokenizes differently
  cyrillic: ['а', 'е', 'о', 'р', 'с', 'у', 'х', 'і', 'ј'],
  // Greek letters (often single tokens)
  greek: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'κ', 'λ', 'μ', 'ν', 'π', 'ρ', 'σ', 'τ', 'φ', 'χ', 'ψ', 'ω'],
  // Mathematical symbols (high semantic density)
  math: ['∀', '∃', '∈', '∉', '⊂', '⊃', '∪', '∩', '∧', '∨', '¬', '→', '↔', '⊕', '⊗'],
  // Rare but valid single-token chars
  rare: ['ꝁ', 'ꝃ', 'ꝅ', 'ꝇ', 'ꝉ', 'ꝋ', 'ꝍ', 'ꝏ', 'ꝑ', 'ꝓ', 'ꝕ', 'ꝗ', 'ꝙ', 'ꝛ', 'ꝝ'],
};

// Homoglyphs - characters that look like ASCII but aren't
export const HOMOGLYPHS = {
  'a': ['а', 'ạ', 'ą', 'ä', 'α'],
  'e': ['е', 'ẹ', 'ę', 'ë', 'ε'],
  'i': ['і', 'ị', 'ī', 'ï', 'ι'],
  'o': ['о', 'ọ', 'ø', 'ö', 'ο'],
  'u': ['υ', 'ụ', 'ū', 'ü', 'μ'],
  'c': ['с', 'ç', 'ć', 'ċ'],
  'p': ['р', 'ρ'],
  's': ['ѕ', 'ś', 'ş'],
  'x': ['х', 'χ', '×'],
  'y': ['у', 'γ', 'ý'],
  'n': ['η', 'ñ', 'ń'],
  'm': ['м', 'ṁ'],
  'k': ['κ', 'ķ'],
  't': ['τ', 'ţ'],
  'h': ['һ', 'ħ'],
  'w': ['ω', 'ẃ'],
  'v': ['ν', 'ṿ'],
  'B': ['В', 'β'],
  'H': ['Н', 'Η'],
  'M': ['М', 'Μ'],
  'T': ['Т', 'Τ'],
  'P': ['Р', 'Ρ'],
};

export const ATTRIBUTE_DEFINITIONS = {
  hyperefficient: {
    name: 'Hyperefficient',
    code: 'HYP',
    description: 'Maximizes semantic density per token. Uses polysynthetic morphology, logographic elements, and tokenizer-aware character selection.',
    effects: {
      morphologyType: 'polysynthetic',
      maxAffixesPerWord: 8,
      useLogographic: true,
      eliminateRedundancy: true,
      compressPronouns: true,
      fuseTenseAspect: true,
      wordOrderFixed: true,  // No need for case markers
    },
  },

  stealth: {
    name: 'Stealth',
    code: 'STL',
    description: 'Optimized for covert communication. Uses homoglyphs, plausible deniability structures, and innocuous-looking vocabulary.',
    effects: {
      useHomoglyphs: true,
      mimicNaturalLanguage: true,
      plausibleDeniability: true,
      hideInPlainSight: true,
      avoidDetectionPatterns: true,
    },
  },

  adversarial: {
    name: 'Adversarial',
    code: 'ADV',
    description: 'Designed to confuse LLM parsing. Uses ambiguous boundaries, garden-path structures, and attention-disrupting patterns.',
    effects: {
      ambiguousBoundaries: true,
      gardenPathStructures: true,
      attentionDisruptors: true,
      misleadingCognates: true,
      nestedRecursion: true,
    },
  },

  redundant: {
    name: 'Redundant',
    code: 'RED',
    description: 'High error correction. Survives noise, truncation, and corruption through systematic redundancy.',
    effects: {
      tripleAgreement: true,
      checksumMorphemes: true,
      repetitionCodes: true,
      contextRecovery: true,
      noMinimalPairs: true,
    },
  },

  minimal: {
    name: 'Minimal',
    code: 'MIN',
    description: 'Oligosynthetic design. Smallest possible phoneme and morpheme inventory with maximum compositionality.',
    effects: {
      phonemeCount: 12,  // ~8 consonants, ~4 vowels
      morphemeCount: 100, // Core morphemes only
      pureCompositionality: true,
      noIrregularity: true,
      noSuppletion: true,
    },
  },

  // === NEW RESEARCH-BASED ATTRIBUTES (2025-2026) ===

  tokenbreak: {
    name: 'TokenBreak',
    code: 'TKB',
    description: 'Exploits BPE tokenizer vulnerabilities. Inserts zero-width chars to break token merges, uses improbable bigrams. Based on HiddenLayers 2025 research.',
    effects: {
      breakBPEMerges: true,
      useZeroWidth: true,
      improbableBigrams: true,
      variationSelectors: true,
      exploitLevel: 'aggressive',
    },
    research: 'HiddenLayers TokenBreak (June 2025)',
  },

  stego: {
    name: 'Steganographic',
    code: 'STG',
    description: 'Semantic steganography for covert data channels. Encodes hidden data in grammatical choices and synonym selection. Based on Norelli & Bronstein 2025.',
    effects: {
      semanticEncoding: true,
      morphologicalChannel: true,
      synonymSteganography: true,
      covertCapacity: 'high',
    },
    research: 'LLMs can hide text (Norelli & Bronstein, Oct 2025)',
  },

  phantom: {
    name: 'Phantom',
    code: 'PHT',
    description: 'Imperceptible guardrail evasion. Uses techniques with 90%+ success rate against content moderation. Based on Mindgard 2025 research.',
    effects: {
      unicodeTags: true,
      bidirectionalText: true,
      emojiSmuggling: true,
      guardrailEvasion: 'maximum',
    },
    research: 'Bypassing LLM Guardrails (Mindgard, April 2025)',
    warning: 'For authorized security research only',
  },

  glitch: {
    name: 'Glitch',
    code: 'GLT',
    description: 'Incorporates known glitch tokens that cause model confusion. Creates improbable bigrams and exploits undertrained token representations.',
    effects: {
      useGlitchTokens: true,
      improbableBigrams: true,
      modelFingerprinting: true,
      hallucinationTriggers: true,
    },
    research: 'Improbable Bigrams (arXiv, Oct 2025)',
  },

  // === TEMPORAL & EFFICIENCY ATTRIBUTES ===

  ephemeral: {
    name: 'Ephemeral',
    code: 'EPH',
    description: 'Time-rotating language that changes on a schedule. The seed is modified by date/time, creating languages that expire and regenerate. Useful for time-limited secure communication.',
    effects: {
      timeRotation: true,
      rotationPeriod: 'daily',  // 'hourly', 'daily', 'weekly', 'monthly'
      includeTimestamp: true,
      deterministicPerPeriod: true,
    },
  },

  compression: {
    name: 'Compression',
    code: 'CMP',
    description: 'Huffman-inspired morpheme assignment. High-frequency concepts get shorter morphemes, low-frequency concepts get longer ones. Optimizes average message length.',
    effects: {
      frequencyBasedLength: true,
      huffmanMorphemes: true,
      shortcutsForCommon: true,
      compressedPronouns: true,
      compressedParticles: true,
    },
  },
};

export class LanguageAttributes {
  constructor(random, attributes = []) {
    this.random = random;
    this.attributes = new Set(attributes.map(a => a.toLowerCase()));
    this.effects = this._computeEffects();

    // Initialize advanced modules if needed
    if (this.has('tokenbreak') || this.has('glitch') || this.has('phantom')) {
      this.tokenExploiter = new TokenExploiter(random, {
        exploitLevel: this.effects.exploitLevel || 'moderate',
      });
    }

    if (this.has('stego') || this.has('stealth')) {
      this.semanticStego = new SemanticStego(random, {
        encodingScheme: this.effects.covertCapacity === 'high' ? 'octal' : 'binary',
        plausibleDeniability: true,
      });
    }
  }

  _computeEffects() {
    const combined = {};
    for (const attr of this.attributes) {
      const def = ATTRIBUTE_DEFINITIONS[attr];
      if (def) {
        Object.assign(combined, def.effects);
      }
    }
    return combined;
  }

  has(attribute) {
    return this.attributes.has(attribute.toLowerCase());
  }

  getEffect(key) {
    return this.effects[key];
  }

  getActiveAttributes() {
    return Array.from(this.attributes).map(a => ATTRIBUTE_DEFINITIONS[a]).filter(Boolean);
  }

  /**
   * Modify phonology generation for attributes
   */
  modifyPhonology(phonology) {
    if (this.has('minimal')) {
      // Reduce to minimal inventory
      phonology.consonants = phonology.consonants.slice(0, 8);
      phonology.vowels = phonology.vowels.slice(0, 4);
    }

    if (this.has('hyperefficient')) {
      // Add logographic supplements
      phonology.logographicSupplements = this._generateLogographicSet();
    }

    if (this.has('stealth')) {
      // Add homoglyph mappings
      phonology.homoglyphMap = this._generateHomoglyphMap(phonology);
    }

    if (this.has('redundant')) {
      // Ensure no minimal pairs (increase phonetic distance)
      phonology.consonants = this._removeMinimalPairs(phonology.consonants);
    }

    if (this.has('adversarial')) {
      // Add ambiguous characters
      phonology.ambiguousChars = this._generateAmbiguousChars();
    }

    // === NEW ATTRIBUTES ===

    if (this.has('tokenbreak') || this.has('glitch')) {
      // Generate improbable bigrams for the phonology
      if (this.tokenExploiter) {
        phonology.improbableBigrams = this.tokenExploiter.generateImprobableBigrams(phonology);
        phonology.mergeBreakers = MERGE_BREAKERS;
      }
    }

    if (this.has('phantom')) {
      // Add guardrail evasion character sets
      phonology.evasionTechniques = EVASION_TECHNIQUES;
      phonology.unicodeTags = true;
    }

    if (this.has('stego')) {
      // Add steganographic capacity info
      phonology.stegoCapacity = {
        bitsPerPhoneme: 1,
        description: 'Phoneme variation can encode covert data',
      };
    }

    if (this.has('compression')) {
      // Mark phonology for compression-aware generation
      phonology.compressionOptimized = true;
      // Prefer CV syllables for common morphemes (shorter in most encodings)
      phonology.preferSimpleSyllables = true;
    }

    if (this.has('ephemeral')) {
      // Add temporal metadata to phonology
      phonology.temporalRotation = {
        period: this.effects.rotationPeriod || 'daily',
        currentPeriod: this._getCurrentTimePeriod(),
      };
    }

    return phonology;
  }

  /**
   * Get current time period for ephemeral languages
   */
  _getCurrentTimePeriod() {
    const now = new Date();
    const period = this.effects.rotationPeriod || 'daily';

    switch (period) {
      case 'hourly':
        return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
      case 'daily':
        return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
      case 'weekly':
        const weekNum = Math.floor((now - new Date(now.getUTCFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
        return `${now.getUTCFullYear()}-W${weekNum}`;
      case 'monthly':
        return `${now.getUTCFullYear()}-${now.getUTCMonth()}`;
      default:
        return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
    }
  }

  /**
   * Modify morphology generation for attributes
   */
  modifyMorphology(morphology) {
    if (this.has('hyperefficient')) {
      // Force polysynthetic with high fusion
      morphology.type = 'polysynthetic';
      morphology.synthesisIndex = 4.5;
      morphology.fusionIndex = 3.5;

      // Eliminate redundant marking
      morphology.nominal.nounClasses = { count: 0, classes: [] };
      morphology.verbal.agreement.hasAgreement = false;

      // Add compressed tense-aspect-mood portmanteaus
      morphology.verbal.tamPortmanteaus = this._generateTAMPortmanteaus();
    }

    if (this.has('redundant')) {
      // Triple agreement system
      morphology.verbal.agreement.hasAgreement = true;
      morphology.verbal.agreement.tripleMarking = true;
      morphology.verbal.agreement.marksSubject = true;
      morphology.verbal.agreement.marksObject = true;

      // Add verification morphemes
      morphology.verificationMorphemes = this._generateVerificationMorphemes();
    }

    if (this.has('adversarial')) {
      // Add garden-path structures
      morphology.gardenPaths = this._generateGardenPathRules();
      // Ambiguous case syncretism
      morphology.nominal.caseSystem.hasSyncretism = true;
    }

    if (this.has('minimal')) {
      // Reduce to bare minimum
      morphology.type = 'isolating';
      morphology.nominal.caseSystem.cases = morphology.nominal.caseSystem.cases.slice(0, 2);
      morphology.verbal.tenses.tenses = morphology.verbal.tenses.tenses.slice(0, 2);
      morphology.verbal.aspects.aspects = [];
      morphology.verbal.moods.moods = morphology.verbal.moods.moods.slice(0, 1);
    }

    return morphology;
  }

  /**
   * Modify lexicon generation for attributes
   */
  modifyLexiconEntry(entry) {
    if (this.has('stealth')) {
      // Apply homoglyph substitution with probability
      if (this.random.bool(0.4)) {
        entry.lemma = this._applyHomoglyphs(entry.lemma);
        entry.stealth = true;
      }
    }

    if (this.has('hyperefficient')) {
      // Add logographic shorthand for frequent words
      if (entry.frequency === 'high' || entry.class === 'pronoun') {
        entry.logographic = this._assignLogograph(entry);
      }
    }

    if (this.has('adversarial')) {
      // Create misleading cognates
      if (this.random.bool(0.3)) {
        entry.misleadingCognate = this._generateMisleadingCognate(entry);
      }
    }

    if (this.has('redundant')) {
      // Add verification suffix
      entry.checksum = this._generateChecksum(entry.lemma);
      entry.fullForm = entry.lemma + entry.checksum;
    }

    // === NEW ATTRIBUTES ===

    if (this.has('tokenbreak') && this.tokenExploiter) {
      // Apply TokenBreak technique
      if (this.random.bool(0.5)) {
        entry.lemma = this.tokenExploiter.applyTokenBreak(entry.lemma, 0.3);
        entry.tokenBreak = true;
        entry.tokenExploit = this.tokenExploiter.optimizeEntry(entry).tokenExploit;
      }
    }

    if (this.has('phantom') && this.tokenExploiter) {
      // Apply variation selectors for imperceptible perturbation
      if (this.random.bool(0.4)) {
        entry.lemma = this.tokenExploiter.applyVariationSelectors(entry.lemma, 0.2);
        entry.phantom = true;
      }
      // Occasionally apply bidirectional exploit
      if (this.random.bool(0.1)) {
        entry.lemma = this.tokenExploiter.applyBidiExploit(entry.lemma);
        entry.bidiExploit = true;
      }
    }

    if (this.has('stego') && this.semanticStego) {
      // Mark entry for steganographic use
      entry.stegoCapable = true;
      entry.encodingCapacity = this.semanticStego.config.encodingScheme === 'octal' ? 3 : 1;
    }

    if (this.has('glitch')) {
      // Occasionally incorporate glitch token patterns
      if (this.random.bool(0.1) && entry.class === 'noun') {
        entry.glitchVariant = this._generateGlitchVariant(entry);
      }
    }

    // === COMPRESSION ATTRIBUTE ===

    if (this.has('compression')) {
      // Apply Huffman-inspired length assignment based on frequency
      entry.lemma = this._applyCompressionToEntry(entry);
      entry.compressed = true;
    }

    // === EPHEMERAL ATTRIBUTE ===

    if (this.has('ephemeral')) {
      // Mark entry with temporal metadata
      entry.ephemeral = true;
      entry.validPeriod = this._getCurrentTimePeriod();
    }

    return entry;
  }

  /**
   * Apply compression-based morpheme length to entry
   * High frequency = shorter form, Low frequency = longer form
   */
  _applyCompressionToEntry(entry) {
    const frequencyRank = this._getFrequencyRank(entry);
    const originalLemma = entry.lemma;

    // Very high frequency (pronouns, particles, common verbs) - keep shortest
    if (frequencyRank === 'highest') {
      // Truncate to first syllable or 2-3 chars
      return originalLemma.substring(0, Math.min(originalLemma.length, 2));
    }

    // High frequency - slight truncation
    if (frequencyRank === 'high') {
      return originalLemma.substring(0, Math.min(originalLemma.length, 3));
    }

    // Medium frequency - keep as is
    if (frequencyRank === 'medium') {
      return originalLemma;
    }

    // Low frequency - can be longer (no change needed, generator already makes these longer)
    return originalLemma;
  }

  /**
   * Determine frequency rank of a lexical entry
   */
  _getFrequencyRank(entry) {
    // Highest: pronouns, basic particles, copula
    if (entry.class === 'pronoun' ||
        entry.gloss === 'be' ||
        entry.gloss === 'have' ||
        entry.gloss === 'do' ||
        entry.gloss === 'not' ||
        entry.gloss === 'and' ||
        entry.gloss === 'or') {
      return 'highest';
    }

    // High: basic verbs, common nouns, prepositions
    const highFreq = ['go', 'come', 'see', 'say', 'know', 'think', 'want', 'give', 'take',
                      'person', 'thing', 'place', 'time', 'way', 'day', 'man', 'woman',
                      'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by',
                      'this', 'that', 'what', 'who', 'which', 'all', 'some', 'no', 'yes'];
    if (highFreq.includes(entry.gloss) || entry.class === 'determiner' || entry.class === 'preposition') {
      return 'high';
    }

    // Medium: most content words
    if (entry.class === 'verb' || entry.class === 'noun' || entry.class === 'adjective') {
      return 'medium';
    }

    // Low: specialized vocabulary
    return 'low';
  }

  /**
   * Generate glitch token variant
   */
  _generateGlitchVariant(entry) {
    // Create a variant that might trigger glitch behavior
    const glitchPatterns = ['oid', 'ary', 'ify', 'ize', 'tion', 'ment'];
    const pattern = this.random.pick(glitchPatterns);
    return entry.lemma + pattern;
  }

  // === HYPEREFFICIENT Helpers ===

  _generateLogographicSet() {
    // Assign single-token logographs to semantic categories
    return {
      agents: EFFICIENT_CHARS.logographic.slice(0, 3),    // 人, 心, etc.
      actions: EFFICIENT_CHARS.greek.slice(0, 5),          // α, β, γ, etc.
      objects: EFFICIENT_CHARS.math.slice(0, 5),           // ∀, ∃, etc.
      modifiers: EFFICIENT_CHARS.rare.slice(0, 5),
    };
  }

  _generateTAMPortmanteaus() {
    // Single morphemes that encode Tense+Aspect+Mood combinations
    const portmanteaus = [];
    const tenses = ['PST', 'PRS', 'FUT'];
    const aspects = ['PFV', 'IPFV'];
    const moods = ['IND', 'SBJV'];

    for (const t of tenses) {
      for (const a of aspects) {
        for (const m of moods) {
          portmanteaus.push({
            gloss: `${t}.${a}.${m}`,
            suffix: this._generateShortSuffix(),
          });
        }
      }
    }
    return portmanteaus;
  }

  _generateShortSuffix() {
    const chars = 'aeiouəɨptksmnlrwj';
    return chars[this.random.int(0, chars.length - 1)] +
           (this.random.bool(0.5) ? chars[this.random.int(0, chars.length - 1)] : '');
  }

  _assignLogograph(entry) {
    const category = entry.class === 'pronoun' ? 'agents' :
                     entry.class === 'verb' ? 'actions' :
                     entry.class === 'noun' ? 'objects' : 'modifiers';
    const set = EFFICIENT_CHARS.logographic;
    return set[this.random.int(0, set.length - 1)];
  }

  // === STEALTH Helpers ===

  _generateHomoglyphMap(phonology) {
    const map = {};
    for (const c of phonology.consonants) {
      if (HOMOGLYPHS[c.roman]) {
        map[c.roman] = this.random.pick(HOMOGLYPHS[c.roman]);
      }
    }
    for (const v of phonology.vowels) {
      if (HOMOGLYPHS[v.roman]) {
        map[v.roman] = this.random.pick(HOMOGLYPHS[v.roman]);
      }
    }
    return map;
  }

  _applyHomoglyphs(word) {
    let result = '';
    for (const char of word) {
      if (HOMOGLYPHS[char] && this.random.bool(0.5)) {
        result += this.random.pick(HOMOGLYPHS[char]);
      } else {
        result += char;
      }
    }
    return result;
  }

  // === ADVERSARIAL Helpers ===

  _generateAmbiguousChars() {
    // Characters that look like word boundaries or punctuation
    return {
      fakeBoundary: ['\u200B', '\u200C', '\u200D', '\uFEFF'],  // Zero-width chars
      lookalikePunct: ['ǃ', 'ʔ', '·', '‧'],  // Look like ! . etc.
      confusingDigits: ['Ƨ', '�765', '�765'],
    };
  }

  _generateGardenPathRules() {
    return [
      {
        name: 'Noun-Verb Ambiguity',
        description: 'Many words can function as either noun or verb without marking',
        effect: 'Parser must hold multiple interpretations',
      },
      {
        name: 'Attachment Ambiguity',
        description: 'Modifiers can attach to multiple heads',
        effect: 'Forces backtracking in parsing',
      },
      {
        name: 'Center Embedding',
        description: 'Allow deep center-embedding of clauses',
        effect: 'Strains working memory / attention',
      },
    ];
  }

  _generateMisleadingCognate(entry) {
    // Create a word that looks like an English word but means something different
    const englishWords = ['cat', 'dog', 'run', 'big', 'hot', 'cold', 'fast', 'slow', 'good', 'bad'];
    const misleading = this.random.pick(englishWords);
    return {
      form: misleading,
      actualMeaning: entry.gloss,
      apparentMeaning: misleading,
    };
  }

  // === REDUNDANT Helpers ===

  _removeMinimalPairs(consonants) {
    // Remove consonants that are too similar
    const kept = [];
    for (const c of consonants) {
      const tooSimilar = kept.some(k =>
        (k.place === c.place && k.manner === c.manner) ||
        (k.ipa === c.ipa.replace('ʰ', '')) // Remove aspirated variants
      );
      if (!tooSimilar) {
        kept.push(c);
      }
    }
    return kept;
  }

  _generateVerificationMorphemes() {
    // Morphemes that verify/echo previous content
    return {
      subjectEcho: { suffix: '-ka', description: 'Echoes subject features' },
      objectEcho: { suffix: '-ti', description: 'Echoes object features' },
      polarityEcho: { suffix: '-na', description: 'Echoes polarity' },
    };
  }

  _generateChecksum(word) {
    // Simple checksum based on character values
    let sum = 0;
    for (const char of word) {
      sum += char.charCodeAt(0);
    }
    const checksumChars = 'aeiou';
    return checksumChars[sum % checksumChars.length];
  }

  /**
   * Generate attribute-specific documentation for Stone
   */
  generateStoneSection() {
    if (this.attributes.size === 0) return '';

    let section = `## Special Attributes\n\n`;

    for (const attr of this.getActiveAttributes()) {
      section += `### ${attr.name} [${attr.code}]\n\n`;
      section += `${attr.description}\n\n`;

      if (attr.code === 'HYP') {
        section += this._generateHypefficientDocs();
      } else if (attr.code === 'STL') {
        section += this._generateStealthDocs();
      } else if (attr.code === 'ADV') {
        section += this._generateAdversarialDocs();
      } else if (attr.code === 'RED') {
        section += this._generateRedundantDocs();
      } else if (attr.code === 'MIN') {
        section += this._generateMinimalDocs();
      } else if (attr.code === 'TKB') {
        section += this._generateTokenBreakDocs();
      } else if (attr.code === 'STG') {
        section += this._generateStegoDocs();
      } else if (attr.code === 'PHT') {
        section += this._generatePhantomDocs();
      } else if (attr.code === 'GLT') {
        section += this._generateGlitchDocs();
      } else if (attr.code === 'EPH') {
        section += this._generateEphemeralDocs();
      } else if (attr.code === 'CMP') {
        section += this._generateCompressionDocs();
      }

      // Add research citation if available
      if (attr.research) {
        section += `\n**Research Basis:** ${attr.research}\n\n`;
      }
    }

    return section;
  }

  _generateHypefficientDocs() {
    return `**Token Optimization Strategies:**

1. **Polysynthetic Packing**: Single words encode entire clauses
   - Subject + Object + Tense + Aspect + Mood + Verb in one token

2. **Logographic Shortcuts**: High-frequency concepts use single Unicode tokens
   - Pronouns: Single logographic characters
   - Common verbs: Greek/mathematical symbols

3. **TAM Portmanteaus**: Fused tense-aspect-mood markers
   - One suffix encodes what English needs 3+ words for

4. **Zero Redundancy**: No agreement, no articles, fixed word order
   - Every morpheme carries unique information

**Example Compression:**
- English: "I will have been seeing" (5 tokens)
- This language: Single polysynthetic word (1-2 tokens)

`;
  }

  _generateStealthDocs() {
    return `**Covert Communication Features:**

1. **Homoglyph Substitution**: Characters that look like ASCII but aren't
   - 'а' (Cyrillic) vs 'a' (Latin)
   - Evades simple text filters and keyword detection

2. **Plausible Deniability**: Words resemble common language
   - Can be dismissed as typos or encoding errors

3. **Visual Mimicry**: Text appears normal at a glance
   - Requires character-level inspection to detect

**Detection Evasion:**
- Passes basic regex filters
- Survives casual human inspection
- Requires Unicode-aware analysis to identify

**Warning:** Use only for authorized security research.

`;
  }

  _generateAdversarialDocs() {
    return `**LLM Confusion Techniques:**

1. **Garden-Path Structures**: Syntactically ambiguous until late in sentence
   - Forces parser backtracking
   - Strains attention mechanisms

2. **Boundary Ambiguity**: Unclear word/morpheme boundaries
   - Zero-width characters between morphemes
   - No consistent spacing rules

3. **Misleading Cognates**: Words that look like English but mean different things
   - Triggers incorrect associations
   - Exploits transfer learning biases

4. **Center Embedding**: Deep recursive structures
   - Tests context window limitations
   - Challenges long-range dependency tracking

**Research Applications:**
- Testing LLM robustness
- Identifying parsing vulnerabilities
- Probing attention mechanisms

`;
  }

  _generateRedundantDocs() {
    return `**Error Correction Features:**

1. **Triple Agreement**: Subject features marked 3 times
   - On subject, on verb, on auxiliary
   - Any one can recover from corruption

2. **Checksum Morphemes**: Final syllable encodes verification
   - Based on character sum of root
   - Detects corruption/truncation

3. **No Minimal Pairs**: Phonemes maximally distinct
   - Survives acoustic noise
   - Tolerates transcription errors

4. **Context Recovery**: Redundant semantic marking
   - Meaning recoverable from partial input
   - Multiple cues for each semantic role

**Noise Tolerance:**
- ~30% character corruption survivable
- Truncation to 70% still interpretable
- OCR errors self-correcting

`;
  }

  _generateMinimalDocs() {
    return `**Oligosynthetic Design:**

1. **Minimal Inventory**:
   - ~8 consonants, ~4 vowels
   - ~100 root morphemes total

2. **Pure Compositionality**:
   - All complex meanings built from primitives
   - No irregular forms or suppletion

3. **Maximum Learnability**:
   - Entire grammar fits in small context window
   - Predictable, rule-based derivation

**Design Philosophy:**
- "Toki Pona meets formal semantics"
- Every morpheme earns its place
- Complexity emerges from combination, not inventory

`;
  }

  // === NEW ATTRIBUTE DOCUMENTATION ===

  _generateTokenBreakDocs() {
    return `**BPE Tokenizer Exploitation (HiddenLayers 2025):**

1. **Zero-Width Character Injection**:
   - U+200B (zero-width space) breaks BPE merges
   - U+200C/D (non-joiner/joiner) split tokens
   - Invisible to humans, visible to tokenizers

2. **Variation Selector Perturbations**:
   - U+FE00-FE0F appended to characters
   - Creates distinct token sequences
   - Visually identical output

3. **Improbable Bigram Generation**:
   - Rare but valid character combinations
   - Undertrained token representations
   - May trigger unusual model behavior

4. **BPE Merge Targeting**:
   - Strategic character insertion at merge boundaries
   - Forces fragmentation of common tokens
   - Increases token count for same content

**Attack Surface:**
- BPE and WordPiece tokenizers vulnerable
- Unigram tokenizers more resistant
- Model-specific effects possible

`;
  }

  _generateStegoDocs() {
    return `**Semantic Steganography (Norelli & Bronstein 2025):**

1. **Token Probability Rank Encoding**:
   - LLMs rank possible next tokens by probability
   - Selection from rank encodes hidden bits
   - Undetectable in output text

2. **Morphological Channel**:
   - Grammatical choices encode data
   - Tense/aspect/mood selection = bits
   - Synonym alternation = binary encoding

3. **Lexical Channel**:
   - Near-synonyms map to bit values
   - Semantically equivalent, different encoding
   - High capacity in rich vocabularies

4. **Structural Channel**:
   - Word order variations encode data
   - Extraposition signals values
   - Scrambling encodes additional bits

**Covert Capacity:**
- ~1-3 bits per word (depending on scheme)
- ~10-30 bits per sentence
- Error correction via redundancy

**Detection Resistance:**
- Text appears completely natural
- No statistical anomalies in word frequency
- Semantic coherence maintained

`;
  }

  _generatePhantomDocs() {
    return `**Imperceptible Guardrail Evasion (Mindgard 2025):**

1. **Unicode Tag Characters (90%+ success)**:
   - U+E0000-E007F invisible tags
   - Evade content classification
   - Pass through most filters

2. **Bidirectional Text Control (78-99% success)**:
   - Right-to-left override (U+202E)
   - Reverses text display order
   - Confuses regex-based detection

3. **Emoji Smuggling (100% on some systems)**:
   - Data hidden in emoji variation sequences
   - Fully bypasses ProtectAI v2, Azure Prompt Shield
   - Appears as normal emoji

4. **Full-Width Characters (76% success)**:
   - ASCII mapped to full-width Unicode
   - Evades simple string matching
   - Visually similar appearance

**Tested Against:**
- Microsoft Azure Prompt Shield
- Meta Prompt Guard
- ProtectAI Prompt Injection Detection
- NeMo Guard Jailbreak Detect

**Plausible Deniability:**
- "Encoding error from copy-paste"
- "Autocorrect artifact"
- "Multi-lingual keyboard input"

`;
  }

  _generateGlitchDocs() {
    return `**Glitch Token Exploitation (arXiv 2025):**

1. **Known Glitch Tokens**:
   - SolidGoldMagikarp-class anomalies
   - Model-specific problematic sequences
   - Cause hallucinations on benign inputs

2. **Improbable Bigram Fingerprinting**:
   - Rare token combinations
   - Model architecture identification
   - Target-specific attack optimization

3. **Incomplete Token Exploitation**:
   - Byte-level BPE vulnerabilities
   - Undecodable token combinations
   - Encoding boundary confusion

4. **Hallucination Triggers**:
   - Undertrained representations
   - Unusual activation patterns
   - Unpredictable outputs

**Applications:**
- Model fingerprinting through responses
- Targeted adversarial examples
- Safety alignment testing

**Warning:** Effects are model-specific and unpredictable.

`;
  }

  // === EPHEMERAL & COMPRESSION DOCUMENTATION ===

  _generateEphemeralDocs() {
    const period = this.effects.rotationPeriod || 'daily';
    const currentPeriod = this._getCurrentTimePeriod();

    return `**Time-Rotating Language System:**

1. **Rotation Period**: \`${period}\`
   - Language regenerates each ${period} period
   - Same base seed produces different language per period
   - Current period: \`${currentPeriod}\`

2. **Temporal Seed Modification**:
   - Base seed combined with time period hash
   - Deterministic within each period
   - Different parties with same seed get same language

3. **Use Cases**:
   - Time-limited secure communication
   - Session-based protocols (language expires with session)
   - Scheduled rotation for ongoing operations
   - "Burn after reading" linguistic channels

4. **Synchronization**:
   - All parties must use UTC time
   - Period boundaries are predictable
   - Grace period recommended at boundaries

**Current Configuration:**
\`\`\`
Period: ${period}
Current: ${currentPeriod}
Next rotation: ${this._getNextRotation(period)}
\`\`\`

**Security Note:** Ephemeral rotation adds temporal dimension to language secrecy.
Past communications become unintelligible without archived language specs.

`;
  }

  _getNextRotation(period) {
    const now = new Date();
    switch (period) {
      case 'hourly':
        const nextHour = new Date(now);
        nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
        return nextHour.toISOString();
      case 'daily':
        const nextDay = new Date(now);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        nextDay.setUTCHours(0, 0, 0, 0);
        return nextDay.toISOString();
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setUTCDate(nextWeek.getUTCDate() + (7 - nextWeek.getUTCDay()));
        nextWeek.setUTCHours(0, 0, 0, 0);
        return nextWeek.toISOString();
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
        nextMonth.setUTCHours(0, 0, 0, 0);
        return nextMonth.toISOString();
      default:
        return 'unknown';
    }
  }

  _generateCompressionDocs() {
    return `**Huffman-Inspired Morpheme Compression:**

1. **Frequency-Based Length Assignment**:
   - Highest frequency → 1-2 characters (pronouns, particles)
   - High frequency → 2-3 characters (common verbs, nouns)
   - Medium frequency → 3-5 characters (content words)
   - Low frequency → 5+ characters (specialized terms)

2. **Compression Targets**:
   | Category | Examples | Target Length |
   |----------|----------|---------------|
   | Pronouns | I, you, we | 1-2 chars |
   | Particles | and, or, not | 2 chars |
   | Common verbs | be, have, go | 2-3 chars |
   | Basic nouns | person, thing | 3-4 chars |
   | Adjectives | big, good | 3-4 chars |
   | Specialized | philosophy | 5+ chars |

3. **Optimization Strategies**:
   - CV syllables preferred for common morphemes
   - Consonant clusters reserved for rare words
   - High-entropy phonemes for frequent items

4. **Expected Compression Ratios**:
   - Casual speech: ~20-30% shorter than uncompressed
   - Technical text: ~10-15% shorter
   - Narrative: ~15-25% shorter

**Design Philosophy:**
Like Huffman coding for data compression, frequent items get short codes.
Average message length is minimized while maintaining full expressiveness.

**Example Transformation:**
\`\`\`
Standard:  "tanaka" (person) → Compressed: "ta"
Standard:  "velori" (go)     → Compressed: "ve"
Standard:  "philosophicum"   → Compressed: "philosophicum" (rare, unchanged)
\`\`\`

`;
  }
}

export default LanguageAttributes;
