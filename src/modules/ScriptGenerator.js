/**
 * GLOSSOPETRAE - Script Generator Module
 *
 * Generates writing system specifications including:
 * - Script type (alphabet, abjad, abugida, syllabary, logographic)
 * - Character set design principles
 * - Directionality
 * - Romanization schemes
 * - Script aesthetics
 */

export class ScriptGenerator {
  constructor(random, phonology, config = {}) {
    this.random = random;
    this.phonology = phonology;
    this.config = {
      scriptType: config.scriptType || null,
      aesthetic: config.aesthetic || null,
      ...config,
    };
  }

  generate() {
    const scriptType = this.config.scriptType || this._selectScriptType();
    const direction = this._selectDirection();
    const aesthetic = this.config.aesthetic || this._selectAesthetic();
    const characters = this._generateCharacterSet(scriptType);
    const orthography = this._generateOrthography(scriptType);
    const numerals = this._generateNumerals();
    const punctuation = this._generatePunctuation();

    return {
      type: scriptType,
      typeName: this._getTypeName(scriptType),
      direction,
      aesthetic,
      characters,
      orthography,
      numerals,
      punctuation,
      romanization: this._generateRomanization(),
      summary: this._generateSummary(scriptType, direction, aesthetic),
    };
  }

  _selectScriptType() {
    return this.random.weightedPick([
      ['alphabet', 0.35],    // Full vowel/consonant representation
      ['abjad', 0.15],       // Consonants primary, vowels optional
      ['abugida', 0.20],     // Consonant base + vowel diacritics
      ['syllabary', 0.20],   // One character per syllable
      ['featural', 0.05],    // Character shapes encode features
      ['logographic', 0.05], // One character per morpheme
    ]);
  }

  _getTypeName(type) {
    const names = {
      alphabet: 'Alphabet (vowels and consonants equal)',
      abjad: 'Abjad (consonants primary, vowels optional)',
      abugida: 'Abugida (consonant + inherent vowel, modified)',
      syllabary: 'Syllabary (one character per syllable)',
      featural: 'Featural (shapes encode phonetic features)',
      logographic: 'Logographic (one character per morpheme)',
    };
    return names[type] || type;
  }

  _selectDirection() {
    const dir = this.random.weightedPick([
      ['ltr', 0.55],           // Left to right (Latin, Cyrillic)
      ['rtl', 0.20],           // Right to left (Arabic, Hebrew)
      ['ttb', 0.15],           // Top to bottom (Traditional Chinese)
      ['boustrophedon', 0.05], // Alternating (Ancient Greek)
      ['ttb-rtl', 0.05],       // Vertical, columns right to left
    ]);

    const descriptions = {
      'ltr': { full: 'Left-to-right', lines: 'top-to-bottom' },
      'rtl': { full: 'Right-to-left', lines: 'top-to-bottom' },
      'ttb': { full: 'Top-to-bottom', columns: 'left-to-right' },
      'ttb-rtl': { full: 'Top-to-bottom', columns: 'right-to-left' },
      'boustrophedon': { full: 'Alternating (ox-turning)', note: 'Changes direction each line' },
    };

    return {
      code: dir,
      ...descriptions[dir],
    };
  }

  _selectAesthetic() {
    const aesthetic = this.random.pick([
      'angular',      // Sharp corners, straight lines (Runic)
      'curved',       // Flowing curves (Arabic, Georgian)
      'geometric',    // Regular geometric shapes (Hangul elements)
      'calligraphic', // Brush-like, varies by stroke (Chinese, Arabic)
      'blocky',       // Square/rectangular (Tibetan, Ethiopic)
      'circular',     // Round shapes predominate (Thai, Burmese)
      'linear',       // Simple lines, minimal curves (Linear B)
      'organic',      // Natural, irregular shapes
    ]);

    const aestheticDetails = {
      angular: {
        name: 'Angular',
        description: 'Sharp corners and straight lines',
        influences: 'Runic, Ogham',
        characteristics: ['45° and 90° angles', 'No curves', 'Vertical emphasis'],
      },
      curved: {
        name: 'Curved',
        description: 'Flowing curves and loops',
        influences: 'Arabic, Georgian, Sinhala',
        characteristics: ['Smooth transitions', 'Loops common', 'Connected flow'],
      },
      geometric: {
        name: 'Geometric',
        description: 'Regular geometric primitives',
        influences: 'Hangul, IPA',
        characteristics: ['Circles, squares, lines', 'Compositional', 'Systematic'],
      },
      calligraphic: {
        name: 'Calligraphic',
        description: 'Brush or pen strokes visible',
        influences: 'Chinese, Arabic, Devanagari',
        characteristics: ['Stroke variation', 'Artistic flourishes', 'Tool marks'],
      },
      blocky: {
        name: 'Blocky',
        description: 'Square or rectangular characters',
        influences: 'Tibetan, Ethiopic, Canadian Aboriginal',
        characteristics: ['Uniform height', 'Horizontal top line', 'Dense'],
      },
      circular: {
        name: 'Circular',
        description: 'Round shapes predominate',
        influences: 'Thai, Burmese, Telugu',
        characteristics: ['Loops and circles', 'Round terminals', 'Open shapes'],
      },
      linear: {
        name: 'Linear',
        description: 'Simple straight lines',
        influences: 'Linear A/B, Vai',
        characteristics: ['Minimal complexity', 'Easy to inscribe', 'Clear shapes'],
      },
      organic: {
        name: 'Organic',
        description: 'Natural, flowing forms',
        influences: 'Mayan, Rongorongo',
        characteristics: ['Irregular shapes', 'Pictographic hints', 'Variable sizes'],
      },
    };

    return aestheticDetails[aesthetic];
  }

  _generateCharacterSet(scriptType) {
    const consonants = this.phonology.consonants;
    const vowels = this.phonology.vowels;

    const set = {
      inventory: [],
      total: 0,
    };

    if (scriptType === 'alphabet') {
      // One character per phoneme
      set.consonantCount = consonants.length;
      set.vowelCount = vowels.length;
      set.total = consonants.length + vowels.length;
      set.description = `${set.total} letters (${set.consonantCount} consonants + ${set.vowelCount} vowels)`;
      set.inventory = [
        ...consonants.map(c => ({ type: 'consonant', phoneme: c.ipa, roman: c.roman })),
        ...vowels.map(v => ({ type: 'vowel', phoneme: v.ipa, roman: v.roman })),
      ];
    } else if (scriptType === 'abjad') {
      // Consonants only as primary characters
      set.consonantCount = consonants.length;
      set.vowelCount = vowels.length;
      set.primaryTotal = consonants.length;
      set.diacriticVowels = true;
      set.total = consonants.length;
      set.description = `${consonants.length} consonant letters + ${vowels.length} optional vowel marks`;
      set.inventory = consonants.map(c => ({ type: 'consonant', phoneme: c.ipa, roman: c.roman }));
      set.diacritics = vowels.map(v => ({ type: 'vowel-mark', phoneme: v.ipa, roman: v.roman }));
    } else if (scriptType === 'abugida') {
      // Consonant + inherent vowel, with vowel modifiers
      const inherentVowel = this.random.pick(vowels);
      set.consonantCount = consonants.length;
      set.vowelCount = vowels.length;
      set.inherentVowel = inherentVowel.ipa;
      set.total = consonants.length;
      set.vowelModifiers = vowels.length - 1; // minus inherent
      set.description = `${consonants.length} base characters (inherent /${inherentVowel.ipa}/) + ${vowels.length - 1} vowel modifiers`;
      set.inventory = consonants.map(c => ({
        type: 'base',
        phoneme: c.ipa + inherentVowel.ipa,
        consonant: c.ipa,
        roman: c.roman + inherentVowel.roman,
      }));
      set.modifiers = vowels
        .filter(v => v.ipa !== inherentVowel.ipa)
        .map(v => ({ type: 'vowel-modifier', phoneme: v.ipa, roman: v.roman }));
      set.virama = { description: 'Vowel killer mark to represent bare consonant' };
    } else if (scriptType === 'syllabary') {
      // One character per CV syllable
      const syllables = [];
      for (const c of consonants) {
        for (const v of vowels) {
          syllables.push({
            type: 'syllable',
            phoneme: c.ipa + v.ipa,
            roman: c.roman + v.roman,
          });
        }
      }
      // Add bare vowels
      for (const v of vowels) {
        syllables.push({
          type: 'syllable',
          phoneme: v.ipa,
          roman: v.roman,
        });
      }
      set.total = syllables.length;
      set.description = `${syllables.length} syllable characters`;
      set.inventory = syllables;
      set.note = 'Codas may require special handling (final marks or doubled characters)';
    } else if (scriptType === 'featural') {
      // Characters encode phonetic features
      set.description = 'Character shapes systematically represent phonetic features';
      set.principles = [
        'Similar sounds have similar shapes',
        'Voicing indicated by specific mark',
        'Place of articulation shown by base shape',
        'Manner shown by modifiers',
      ];
      set.example = {
        voiceless: 'Basic shape',
        voiced: 'Basic shape + voicing mark',
        nasal: 'Basic shape + nasal modifier',
      };
      set.consonantCount = consonants.length;
      set.vowelCount = vowels.length;
      set.total = consonants.length + vowels.length;
      set.inventory = [...consonants, ...vowels].map(p => ({
        type: p.roman ? 'consonant' : 'vowel',
        phoneme: p.ipa,
        roman: p.roman,
      }));
    } else if (scriptType === 'logographic') {
      // One character per morpheme
      set.description = 'One character per morpheme/word';
      set.characterCount = 'Thousands (open-ended)';
      set.phonetic = 'Phonetic component may hint at pronunciation';
      set.semantic = 'Semantic component indicates meaning category';
      set.note = 'Characters may be composed of radicals/components';
      set.total = '∞ (expandable)';
    }

    return set;
  }

  _generateOrthography(scriptType) {
    const rules = [];

    // Word boundaries
    rules.push({
      feature: 'Word boundaries',
      method: this.random.pick([
        'Spaces between words',
        'No word boundaries (continuous)',
        'Interpuncts (dots) between words',
        'Vertical bars between words',
      ]),
    });

    // Capitalization
    if (scriptType === 'alphabet') {
      const hasCase = this.random.bool(0.6);
      rules.push({
        feature: 'Case distinction',
        method: hasCase
          ? this.random.pick([
              'Uppercase/lowercase (bicameral)',
              'Uppercase for proper nouns only',
              'Uppercase for sentence-initial only',
            ])
          : 'No case distinction (unicameral)',
      });
    }

    // Gemination
    rules.push({
      feature: 'Geminate consonants',
      method: this.random.pick([
        'Written double',
        'Special gemination mark',
        'Not distinguished in writing',
        'Macron over consonant',
      ]),
    });

    // Long vowels
    rules.push({
      feature: 'Long vowels',
      method: this.random.pick([
        'Written double',
        'Macron (line above)',
        'Circumflex accent',
        'Following silent letter',
        'Not distinguished in writing',
      ]),
    });

    // Syllable boundaries
    if (scriptType !== 'syllabary') {
      rules.push({
        feature: 'Syllable boundaries',
        method: this.random.pick([
          'Not marked',
          'Hyphen in ambiguous cases',
          'Special syllable-break character',
        ]),
      });
    }

    return rules;
  }

  _generateNumerals() {
    const system = this.random.weightedPick([
      ['decimal', 0.70],        // Base 10
      ['vigesimal', 0.10],      // Base 20
      ['duodecimal', 0.08],     // Base 12
      ['sexagesimal', 0.07],    // Base 60
      ['quinary', 0.05],        // Base 5
    ]);

    const representation = this.random.pick([
      'dedicated numerals',     // Unique numeric characters
      'alphabetic',             // Letters represent numbers
      'mixed',                  // Combination
    ]);

    const digits = ['𝟎', '𝟏', '𝟐', '𝟑', '𝟒', '𝟓', '𝟔', '𝟕', '𝟖', '𝟗'];

    return {
      base: system,
      baseValue: { decimal: 10, vigesimal: 20, duodecimal: 12, sexagesimal: 60, quinary: 5 }[system],
      representation,
      digitExample: representation === 'dedicated numerals' ? digits.slice(0, 10) : 'Uses letters',
      zero: this.random.pick(['Has zero symbol', 'No zero (positional)', 'Zero as empty space']),
    };
  }

  _generatePunctuation() {
    const marks = [];

    // Sentence-final
    marks.push({
      function: 'Statement end',
      mark: this.random.pick(['.', '。', '᙮', '։', '۔', '॥']),
    });

    marks.push({
      function: 'Question',
      mark: this.random.pick(['?', '؟', ';', '¿...?', '？']),
    });

    marks.push({
      function: 'Exclamation',
      mark: this.random.pick(['!', '¡...!', '‼', '！']),
    });

    // Clause-internal
    marks.push({
      function: 'Clause break/pause',
      mark: this.random.pick([',', '、', '،', '·', '᛫']),
    });

    // Quotation
    const quoteStyle = this.random.pick([
      ['"..."', 'Double quotes'],
      ["'...'", 'Single quotes'],
      ['«...»', 'Guillemets'],
      ['「...」', 'Corner brackets'],
      ['„..."', 'Low-high quotes'],
    ]);
    marks.push({
      function: 'Quotation',
      mark: quoteStyle[0],
      name: quoteStyle[1],
    });

    return {
      marks,
      note: 'Punctuation follows the text direction',
    };
  }

  _generateRomanization() {
    const scheme = {
      name: 'Standard Romanization',
      principles: [],
      examples: [],
    };

    // Add romanization principles
    scheme.principles.push('One-to-one phoneme-to-letter mapping where possible');

    if (this.random.bool(0.5)) {
      scheme.principles.push('Digraphs used for sounds lacking single letters (sh, ch, ng)');
    }

    if (this.random.bool(0.4)) {
      scheme.principles.push('Diacritics for sounds not in basic Latin (ā, ñ, ə)');
    }

    scheme.principles.push('Consistent with IPA values where practical');

    // Special character mappings
    scheme.specialMappings = [];

    // Check for sounds that might need special romanization
    const consonants = this.phonology.consonants;

    if (consonants.some(c => c.ipa === 'ʃ')) {
      scheme.specialMappings.push({ ipa: 'ʃ', roman: 'sh' });
    }
    if (consonants.some(c => c.ipa === 'tʃ')) {
      scheme.specialMappings.push({ ipa: 'tʃ', roman: 'ch' });
    }
    if (consonants.some(c => c.ipa === 'ŋ')) {
      scheme.specialMappings.push({ ipa: 'ŋ', roman: 'ng' });
    }
    if (consonants.some(c => c.ipa === 'θ')) {
      scheme.specialMappings.push({ ipa: 'θ', roman: 'th' });
    }
    if (consonants.some(c => c.ipa === 'ð')) {
      scheme.specialMappings.push({ ipa: 'ð', roman: 'dh' });
    }

    return scheme;
  }

  _generateSummary(type, direction, aesthetic) {
    return `${this._getTypeName(type).split(' ')[0]} script, ${direction.full}, ${aesthetic.name.toLowerCase()} style`;
  }
}
