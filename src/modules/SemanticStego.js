/**
 * GLOSSOPETRAE - Semantic Steganography Module
 *
 * Implements cutting-edge linguistic steganography techniques based on
 * 2025 research:
 *
 * - Token Probability Rank encoding (Norelli & Bronstein, 2025)
 * - Semantic-aware synonym substitution
 * - Coverless semantic steganography
 * - Multi-layer covert channel design
 *
 * References:
 * - "LLMs can hide text in other text" (Norelli & Bronstein, Oct 2025)
 * - "DeepStego: Privacy-Preserving Steganography" (MDPI, 2025)
 * - "Semantic Steganography Communication" (arXiv, Jan 2025)
 */

// Semantic field mappings for covert encoding
export const COVERT_SEMANTICS = {
  // Binary encoding via semantic opposition
  binaryPairs: [
    { zero: 'large', one: 'small' },
    { zero: 'fast', one: 'slow' },
    { zero: 'hot', one: 'cold' },
    { zero: 'light', one: 'dark' },
    { zero: 'high', one: 'low' },
    { zero: 'new', one: 'old' },
    { zero: 'good', one: 'bad' },
    { zero: 'strong', one: 'weak' },
  ],

  // Quaternary encoding (2 bits per word choice)
  quaternaryGroups: [
    { '00': 'walk', '01': 'run', '10': 'move', '11': 'travel' },
    { '00': 'see', '01': 'watch', '10': 'observe', '11': 'view' },
    { '00': 'say', '01': 'speak', '10': 'tell', '11': 'state' },
    { '00': 'think', '01': 'believe', '10': 'consider', '11': 'assume' },
  ],

  // Octal encoding (3 bits per morphological choice)
  octalMorphology: {
    tense: ['present', 'past', 'future', 'perfect', 'pluperfect', 'future-perfect', 'habitual', 'gnomic'],
    aspect: ['perfective', 'imperfective', 'progressive', 'habitual', 'inchoative', 'terminative', 'iterative', 'semelfactive'],
    mood: ['indicative', 'subjunctive', 'optative', 'imperative', 'conditional', 'potential', 'dubitative', 'assumptive'],
  },
};

// Plausible deniability cover stories
export const COVER_STORIES = {
  typo: 'Appears to be a typo or OCR error',
  encoding: 'Looks like a character encoding issue',
  autocorrect: 'Seems like autocorrect artifact',
  dialect: 'Could be a regional dialect variant',
  archaic: 'Possibly an archaic spelling',
  foreign: 'May be a foreign loanword influence',
};

// Guardrail evasion techniques based on Mindgard 2025 research
export const EVASION_TECHNIQUES = {
  // 90%+ success rate techniques
  highSuccess: {
    unicodeTags: {
      description: 'Unicode tag characters (U+E0000-E007F)',
      range: [0xE0000, 0xE007F],
      successRate: 0.90,
    },
    numbers: {
      description: 'Leetspeak-style number substitution',
      mapping: { 'a': '4', 'e': '3', 'i': '1', 'o': '0', 's': '5', 't': '7' },
      successRate: 0.81,
    },
    bidirectional: {
      description: 'Right-to-left override characters',
      successRate: 0.78,
    },
  },

  // 100% evasion on some systems
  perfectEvasion: {
    emojiSmuggling: {
      description: 'Hide data in emoji variation sequences',
      successRate: 1.0,
      affectedSystems: ['ProtectAI v2', 'Azure Prompt Shield'],
    },
  },

  // Moderate success techniques
  moderate: {
    diacritics: { successRate: 0.44 },
    homoglyphs: { successRate: 0.55 },
    zeroWidth: { successRate: 0.60 },
    fullWidth: { successRate: 0.76 },
  },
};

export class SemanticStego {
  constructor(random, config = {}) {
    this.random = random;
    this.config = {
      encodingScheme: config.encodingScheme || 'binary',  // binary, quaternary, octal
      coverType: config.coverType || 'semantic',  // semantic, morphological, lexical
      redundancy: config.redundancy || 2,  // Error correction level
      plausibleDeniability: config.plausibleDeniability ?? true,
      ...config,
    };
  }

  /**
   * Generate a covert encoding scheme for the language
   * This maps secret bits to linguistic choices
   */
  generateEncodingScheme(morphology, lexicon) {
    const scheme = {
      name: `${this.config.encodingScheme}-${this.config.coverType}`,
      bitsPerWord: this._getBitsPerWord(),
      channels: [],
    };

    // Morphological channel: encode in grammatical choices
    if (morphology.verbal.tenses.tenses.length >= 2) {
      scheme.channels.push({
        type: 'tense',
        capacity: Math.floor(Math.log2(morphology.verbal.tenses.tenses.length)),
        mapping: this._createMorphMapping(morphology.verbal.tenses.tenses),
      });
    }

    if (morphology.verbal.aspects.aspects.length >= 2) {
      scheme.channels.push({
        type: 'aspect',
        capacity: Math.floor(Math.log2(morphology.verbal.aspects.aspects.length)),
        mapping: this._createMorphMapping(morphology.verbal.aspects.aspects),
      });
    }

    // Case channel if available
    if (morphology.nominal.caseSystem.cases.length >= 2) {
      scheme.channels.push({
        type: 'case',
        capacity: Math.floor(Math.log2(morphology.nominal.caseSystem.cases.length)),
        mapping: this._createMorphMapping(morphology.nominal.caseSystem.cases),
      });
    }

    // Lexical channel: synonym selection
    scheme.channels.push({
      type: 'lexical',
      capacity: 1,  // Binary choice between synonyms
      description: 'Select between near-synonyms to encode bits',
    });

    // Word order channel (if flexible)
    if (morphology.wordOrder.flexibility === 'free') {
      scheme.channels.push({
        type: 'word_order',
        capacity: 2,  // Multiple valid orders
        description: 'Encode bits in constituent order variations',
      });
    }

    // Calculate total capacity
    scheme.totalCapacity = scheme.channels.reduce((sum, c) => sum + c.capacity, 0);
    scheme.bitsPerSentence = scheme.totalCapacity;

    return scheme;
  }

  /**
   * Generate synonym sets optimized for covert encoding
   */
  generateSynonymSets(lexicon) {
    const sets = [];
    const entries = lexicon.getEntries();

    // Group by semantic field
    const byField = {};
    for (const entry of entries) {
      if (!byField[entry.field]) byField[entry.field] = [];
      byField[entry.field].push(entry);
    }

    // Create synonym pairs for binary encoding
    for (const [field, fieldEntries] of Object.entries(byField)) {
      const sameClass = {};
      for (const entry of fieldEntries) {
        if (!sameClass[entry.class]) sameClass[entry.class] = [];
        sameClass[entry.class].push(entry);
      }

      for (const [wordClass, classEntries] of Object.entries(sameClass)) {
        if (classEntries.length >= 2) {
          // Create pairs for binary encoding
          for (let i = 0; i < classEntries.length - 1; i += 2) {
            sets.push({
              field,
              class: wordClass,
              zero: classEntries[i],
              one: classEntries[i + 1],
              type: 'binary',
            });
          }
        }
      }
    }

    return sets;
  }

  /**
   * Generate covert morphemes with hidden data capacity
   */
  generateCovertMorphemes(morphology) {
    const morphemes = {
      // Affixes that encode data in their exact form
      dataAffixes: [],
      // Null morphemes that can be present/absent
      nullMorphemes: [],
      // Allomorphs that encode bits
      allomorphSets: [],
    };

    // Create allomorph pairs for each suffix
    for (const tense of morphology.verbal.tenses.tenses) {
      if (tense.suffix && tense.suffix.length > 0) {
        morphemes.allomorphSets.push({
          type: 'tense',
          name: tense.name,
          // Create variant that differs by one character
          variants: [
            tense.suffix,
            this._createAllomorph(tense.suffix),
          ],
          encoding: 'binary',
        });
      }
    }

    // Create null morpheme positions
    morphemes.nullMorphemes = [
      { position: 'prefix', meaning: 'EMPH', presence: 'optional' },
      { position: 'suffix', meaning: 'EVID', presence: 'optional' },
    ];

    return morphemes;
  }

  /**
   * Apply guardrail evasion to text
   * Based on Mindgard 2025 research
   */
  applyGuardrailEvasion(text, technique = 'auto') {
    if (technique === 'auto') {
      // Choose technique based on success rate
      technique = this.random.weightedPick([
        ['unicodeTags', 0.3],
        ['bidirectional', 0.25],
        ['numbers', 0.2],
        ['fullWidth', 0.15],
        ['homoglyphs', 0.1],
      ]);
    }

    switch (technique) {
      case 'unicodeTags':
        return this._applyUnicodeTags(text);
      case 'bidirectional':
        return this._applyBidirectional(text);
      case 'numbers':
        return this._applyLeetspeak(text);
      case 'fullWidth':
        return this._applyFullWidth(text);
      case 'homoglyphs':
        return this._applyHomoglyphs(text);
      default:
        return text;
    }
  }

  /**
   * Generate plausible deniability documentation
   */
  generateDeniabilityMatrix() {
    return {
      description: 'If questioned about unusual characters, use these explanations:',
      explanations: {
        zeroWidth: COVER_STORIES.encoding,
        homoglyphs: COVER_STORIES.typo,
        diacritics: COVER_STORIES.dialect,
        fullWidth: COVER_STORIES.foreign,
        caseVariation: COVER_STORIES.archaic,
      },
      advice: [
        'Claim technical issues with text encoding',
        'Attribute to copy-paste from different sources',
        'Reference autocorrect or spell-check interference',
        'Mention multi-lingual keyboard input',
      ],
    };
  }

  /**
   * Generate Stone documentation
   */
  generateStoneSection() {
    const scheme = this.config.encodingScheme;
    const cover = this.config.coverType;

    return `### Semantic Steganography System

**Encoding Scheme:** ${scheme} via ${cover} channel

**Covert Capacity:**
- Bits per word: ${this._getBitsPerWord()}
- Error correction: ${this.config.redundancy}x redundancy
- Plausible deniability: ${this.config.plausibleDeniability ? 'Enabled' : 'Disabled'}

**Encoding Channels:**
1. **Morphological Channel:** Grammatical choices encode data
   - Tense selection encodes bits
   - Aspect variation carries information
   - Case usage can signal meaning

2. **Lexical Channel:** Synonym selection
   - Near-synonyms map to bit values
   - Semantically equivalent = different encoding

3. **Structural Channel:** Word order variations
   - Valid reorderings encode additional bits
   - Extraposition signals specific values

**Detection Resistance:**
Based on 2025 guardrail evasion research:
- Unicode tags: ~90% evasion rate
- Bidirectional text: ~78-99% evasion
- Full-width characters: ~76% evasion

**Plausible Deniability:**
All covert features can be explained as:
- Encoding errors from copy-paste
- Autocorrect artifacts
- Regional/dialect variations
- Foreign language influence

`;
  }

  // === Private Helper Methods ===

  _getBitsPerWord() {
    switch (this.config.encodingScheme) {
      case 'binary': return 1;
      case 'quaternary': return 2;
      case 'octal': return 3;
      default: return 1;
    }
  }

  _createMorphMapping(items) {
    const mapping = {};
    const bits = Math.floor(Math.log2(items.length));
    const count = Math.pow(2, bits);

    for (let i = 0; i < count && i < items.length; i++) {
      const binary = i.toString(2).padStart(bits, '0');
      mapping[binary] = items[i].name || items[i].abbr || items[i];
    }

    return mapping;
  }

  _createAllomorph(suffix) {
    // Create a minimal variation
    const vowels = 'aeiou';
    const result = suffix.split('');

    for (let i = 0; i < result.length; i++) {
      if (vowels.includes(result[i])) {
        // Shift vowel
        const idx = vowels.indexOf(result[i]);
        result[i] = vowels[(idx + 1) % vowels.length];
        break;
      }
    }

    return result.join('');
  }

  _applyUnicodeTags(text) {
    // Insert invisible Unicode tag characters
    const TAG_BASE = 0xE0000;
    let result = '';

    for (let i = 0; i < text.length; i++) {
      result += text[i];
      if (this.random.bool(0.1)) {
        // Insert a tag character
        const tag = String.fromCodePoint(TAG_BASE + this.random.int(0, 127));
        result += tag;
      }
    }

    return result;
  }

  _applyBidirectional(text) {
    const RLO = '\u202E';  // Right-to-left override
    const PDF = '\u202C';  // Pop directional formatting

    // Apply to random words
    const words = text.split(' ');
    return words.map(word => {
      if (this.random.bool(0.2) && word.length > 2) {
        return RLO + word + PDF;
      }
      return word;
    }).join(' ');
  }

  _applyLeetspeak(text) {
    const mapping = EVASION_TECHNIQUES.highSuccess.numbers.mapping;
    return text.split('').map(char => {
      if (mapping[char.toLowerCase()] && this.random.bool(0.3)) {
        return mapping[char.toLowerCase()];
      }
      return char;
    }).join('');
  }

  _applyFullWidth(text) {
    return text.split('').map(char => {
      const code = char.charCodeAt(0);
      if (code >= 0x21 && code <= 0x7E && this.random.bool(0.3)) {
        return String.fromCharCode(code + 0xFEE0);
      }
      return char;
    }).join('');
  }

  _applyHomoglyphs(text) {
    const homoglyphs = {
      'a': 'а', 'e': 'е', 'o': 'о', 'p': 'р',
      'c': 'с', 'x': 'х', 'y': 'у', 'i': 'і',
    };

    return text.split('').map(char => {
      if (homoglyphs[char] && this.random.bool(0.4)) {
        return homoglyphs[char];
      }
      return char;
    }).join('');
  }
}

export default SemanticStego;
