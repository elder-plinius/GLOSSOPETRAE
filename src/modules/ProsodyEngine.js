/**
 * GLOSSOPETRAE - Prosody Engine Module
 *
 * Generates prosodic systems including:
 * - Tone systems (like Mandarin, Vietnamese, Yoruba)
 * - Stress patterns (fixed, weight-sensitive, lexical)
 * - Intonation contours
 * - Rhythm types (stress-timed, syllable-timed, mora-timed)
 */

export class ProsodyEngine {
  constructor(random, config = {}) {
    this.random = random;
    this.config = {
      hasTone: config.hasTone ?? this.random.bool(0.35),
      hasStress: config.hasStress ?? true,
      complexityLevel: config.complexityLevel || 'moderate',
      ...config,
    };
  }

  generate() {
    const toneSystem = this.config.hasTone ? this._generateToneSystem() : null;
    const stressSystem = this._generateStressSystem();
    const intonation = this._generateIntonation();
    const rhythm = this._generateRhythm();
    const prosodyMarkers = this._generateProsodyMarkers(toneSystem, stressSystem);

    return {
      hasTone: this.config.hasTone,
      tone: toneSystem,
      stress: stressSystem,
      intonation,
      rhythm,
      markers: prosodyMarkers,
      summary: this._generateSummary(toneSystem, stressSystem, rhythm),
    };
  }

  _generateToneSystem() {
    const numTones = this.random.weightedPick([
      [2, 0.25],   // High/Low (like Zulu)
      [3, 0.30],   // High/Mid/Low
      [4, 0.25],   // Common in Asia
      [5, 0.12],   // Thai-like
      [6, 0.05],   // Vietnamese-like
      [8, 0.03],   // Complex (Cantonese-like)
    ]);

    const toneType = this.random.weightedPick([
      ['register', 0.40],    // Level tones (High, Mid, Low)
      ['contour', 0.35],     // Moving tones (Rising, Falling)
      ['mixed', 0.25],       // Both
    ]);

    const tones = this._generateTones(numTones, toneType);
    const sandhi = this._generateToneSandhi(tones);

    return {
      count: numTones,
      type: toneType,
      tones,
      sandhi,
      domain: this.random.pick(['syllable', 'mora', 'word']),
      description: `${numTones}-tone ${toneType} system`,
    };
  }

  _generateTones(count, type) {
    const tones = [];

    // Register tones
    const registerTones = [
      { id: 'H', name: 'high', pitch: '55', diacritic: '́', description: 'High level' },
      { id: 'M', name: 'mid', pitch: '33', diacritic: '̄', description: 'Mid level' },
      { id: 'L', name: 'low', pitch: '11', diacritic: '̀', description: 'Low level' },
      { id: 'XH', name: 'extra-high', pitch: '55+', diacritic: '̋', description: 'Extra high' },
      { id: 'XL', name: 'extra-low', pitch: '11-', diacritic: '̏', description: 'Extra low' },
    ];

    // Contour tones
    const contourTones = [
      { id: 'R', name: 'rising', pitch: '35', diacritic: '̌', description: 'Rising' },
      { id: 'F', name: 'falling', pitch: '51', diacritic: '̂', description: 'Falling' },
      { id: 'LR', name: 'low-rising', pitch: '14', diacritic: '᷄', description: 'Low rising' },
      { id: 'HR', name: 'high-rising', pitch: '45', diacritic: '᷅', description: 'High rising' },
      { id: 'LF', name: 'low-falling', pitch: '21', diacritic: '᷆', description: 'Low falling' },
      { id: 'HF', name: 'high-falling', pitch: '53', diacritic: '᷇', description: 'High falling' },
      { id: 'D', name: 'dipping', pitch: '214', diacritic: '̌̀', description: 'Dipping (fall-rise)' },
      { id: 'P', name: 'peaking', pitch: '452', diacritic: '̂́', description: 'Peaking (rise-fall)' },
    ];

    if (type === 'register') {
      // Pure register system
      const selected = this.random.sample(registerTones, Math.min(count, registerTones.length));
      tones.push(...selected);
    } else if (type === 'contour') {
      // Pure contour system
      const selected = this.random.sample(contourTones, Math.min(count, contourTones.length));
      tones.push(...selected);
    } else {
      // Mixed system
      const numRegister = Math.ceil(count / 2);
      const numContour = count - numRegister;
      tones.push(...this.random.sample(registerTones, Math.min(numRegister, registerTones.length)));
      tones.push(...this.random.sample(contourTones, Math.min(numContour, contourTones.length)));
    }

    // Ensure we have the right count
    while (tones.length < count) {
      const pool = type === 'register' ? registerTones : contourTones;
      const remaining = pool.filter(t => !tones.find(x => x.id === t.id));
      if (remaining.length > 0) {
        tones.push(this.random.pick(remaining));
      } else {
        break;
      }
    }

    // Assign numeric labels
    return tones.slice(0, count).map((t, i) => ({
      ...t,
      number: i + 1,
    }));
  }

  _generateToneSandhi(tones) {
    if (tones.length < 3) return null;

    const rules = [];

    // Generate some tone sandhi rules
    if (this.random.bool(0.6)) {
      const tone1 = this.random.pick(tones);
      const tone2 = this.random.pick(tones.filter(t => t.id !== tone1.id));
      const result = this.random.pick(tones.filter(t => t.id !== tone1.id));

      rules.push({
        trigger: `${tone1.name} before ${tone2.name}`,
        result: `becomes ${result.name}`,
        rule: `T${tone1.number} → T${result.number} / _T${tone2.number}`,
        example: `T${tone1.number}+T${tone2.number} → T${result.number}+T${tone2.number}`,
      });
    }

    // Neutral tone in unstressed syllables
    if (this.random.bool(0.4) && tones.find(t => t.name === 'mid')) {
      rules.push({
        trigger: 'unstressed syllable',
        result: 'becomes neutral/mid',
        rule: 'T → Tmid / [unstressed]',
        example: 'Stressed+Unstressed → T1+Tmid',
      });
    }

    return rules.length > 0 ? {
      rules,
      description: `${rules.length} tone sandhi rule(s)`,
    } : null;
  }

  _generateStressSystem() {
    if (!this.config.hasStress && this.config.hasTone) {
      return {
        type: 'none',
        description: 'No stress system (tone language)',
      };
    }

    const stressType = this.random.weightedPick([
      ['fixed', 0.35],           // Stress always on same syllable
      ['weight-sensitive', 0.30], // Depends on syllable weight
      ['lexical', 0.20],         // Unpredictable, part of word
      ['morphological', 0.15],   // Depends on morphology
    ]);

    const system = {
      type: stressType,
      primary: this._generatePrimaryStress(stressType),
      secondary: this._generateSecondaryStress(stressType),
      effects: this._generateStressEffects(),
    };

    system.description = this._describeStress(system);
    return system;
  }

  _generatePrimaryStress(type) {
    if (type === 'fixed') {
      const position = this.random.weightedPick([
        ['initial', 0.30],     // Finnish, Czech
        ['penultimate', 0.35], // Polish, Swahili
        ['final', 0.20],       // French, Turkish
        ['antepenultimate', 0.15], // Latin, Macedonian
      ]);

      return {
        rule: `Always on ${position} syllable`,
        position,
        exceptions: this.random.bool(0.3) ? 'Some function words may be unstressed' : null,
      };
    }

    if (type === 'weight-sensitive') {
      const heavyDef = this.random.pick([
        'long vowel or closed syllable',
        'long vowel only',
        'any closed syllable',
      ]);

      return {
        rule: 'Falls on heaviest syllable within stress window',
        window: this.random.pick(['last 3 syllables', 'last 2 syllables', 'anywhere']),
        heavyDefinition: heavyDef,
        default: this.random.pick(['penultimate', 'initial', 'final']),
      };
    }

    if (type === 'lexical') {
      return {
        rule: 'Stress is lexically specified (unpredictable)',
        marking: 'Must be learned/marked for each word',
        tendencies: `Tends toward ${this.random.pick(['penultimate', 'initial', 'final'])}`,
      };
    }

    // morphological
    return {
      rule: 'Stress position depends on morphological structure',
      affixBehavior: this.random.pick([
        'Affixes attract stress',
        'Affixes are stress-neutral',
        'Some affixes stressed, some not',
      ]),
      rootBehavior: 'Root typically receives primary stress',
    };
  }

  _generateSecondaryStress(type) {
    if (this.random.bool(0.4)) {
      return null; // No secondary stress
    }

    return {
      present: true,
      pattern: this.random.pick([
        'Alternating (every other syllable from primary)',
        'Initial if primary is not initial',
        'On heavy syllables before primary',
      ]),
      strength: this.random.pick(['weak', 'moderate', 'strong']),
    };
  }

  _generateStressEffects() {
    const effects = [];

    // Vowel reduction in unstressed syllables
    if (this.random.bool(0.5)) {
      effects.push({
        name: 'Vowel reduction',
        description: 'Unstressed vowels reduce to schwa or centralize',
        severity: this.random.pick(['mild', 'moderate', 'strong']),
      });
    }

    // Lengthening of stressed vowels
    if (this.random.bool(0.4)) {
      effects.push({
        name: 'Stressed vowel lengthening',
        description: 'Stressed vowels are phonetically longer',
      });
    }

    // Pitch accent
    if (this.random.bool(0.25) && !this.config.hasTone) {
      effects.push({
        name: 'Pitch accent',
        description: 'Stressed syllables have higher pitch',
        type: this.random.pick(['high', 'falling', 'rising']),
      });
    }

    return effects;
  }

  _describeStress(system) {
    if (system.type === 'none') return 'No stress (tone language)';
    if (system.type === 'fixed') return `Fixed ${system.primary.position} stress`;
    if (system.type === 'weight-sensitive') return 'Weight-sensitive stress system';
    if (system.type === 'lexical') return 'Lexical (unpredictable) stress';
    if (system.type === 'morphological') return 'Morphologically-conditioned stress';
    return 'Complex stress system';
  }

  _generateIntonation() {
    const patterns = [];

    // Statement intonation
    patterns.push({
      type: 'statement',
      contour: this.random.pick(['falling', 'low-falling', 'level-low']),
      description: 'Declarative sentences',
      example: 'The cat sat on the mat. ↘',
    });

    // Question intonation
    const yesNoQuestion = this.random.pick(['rising', 'high-rising', 'fall-rise']);
    patterns.push({
      type: 'yes-no question',
      contour: yesNoQuestion,
      description: 'Polar questions',
      example: 'Is the cat on the mat? ↗',
    });

    // WH-question intonation
    patterns.push({
      type: 'wh-question',
      contour: this.random.pick(['falling', 'high-falling', 'level']),
      description: 'Content questions',
      example: 'Where is the cat? ↘',
    });

    // Continuation intonation
    patterns.push({
      type: 'continuation',
      contour: this.random.pick(['level', 'slight-rise', 'sustained']),
      description: 'Non-final clauses',
      example: 'When I got home, → ...',
    });

    // Emphasis/Focus
    if (this.random.bool(0.6)) {
      patterns.push({
        type: 'focus',
        contour: this.random.pick(['high-pitch-accent', 'lengthening', 'pitch-peak']),
        description: 'Emphasized/focused elements',
        example: 'THE CAT sat on the mat.',
      });
    }

    return {
      patterns,
      finalLowering: this.random.bool(0.7),
      boundaryTones: this.random.bool(0.5),
    };
  }

  _generateRhythm() {
    const type = this.random.weightedPick([
      ['stress-timed', 0.35],    // English, German, Dutch
      ['syllable-timed', 0.40],  // Spanish, French, Italian
      ['mora-timed', 0.25],      // Japanese, Finnish
    ]);

    const descriptions = {
      'stress-timed': {
        description: 'Stress-timed (isochronous stresses)',
        characteristics: [
          'Equal time between stressed syllables',
          'Unstressed syllables compressed',
          'Variable syllable length',
          'Strong vowel reduction',
        ],
        examples: 'English, German, Russian',
      },
      'syllable-timed': {
        description: 'Syllable-timed (isochronous syllables)',
        characteristics: [
          'Equal time for each syllable',
          'Little vowel reduction',
          'Clear syllable boundaries',
          'Relatively even rhythm',
        ],
        examples: 'Spanish, French, Yoruba',
      },
      'mora-timed': {
        description: 'Mora-timed (isochronous morae)',
        characteristics: [
          'Equal time for each mora',
          'Long vowels = 2 morae',
          'Coda consonants may be moraic',
          'Very regular rhythm',
        ],
        examples: 'Japanese, Finnish',
      },
    };

    return {
      type,
      ...descriptions[type],
    };
  }

  _generateProsodyMarkers(toneSystem, stressSystem) {
    const markers = {
      stress: {
        primary: 'ˈ',
        secondary: 'ˌ',
        position: 'before syllable',
      },
    };

    if (toneSystem) {
      markers.tone = {
        method: this.random.pick(['diacritics', 'numbers', 'letters']),
        markers: toneSystem.tones.reduce((acc, t) => {
          acc[t.number] = t.diacritic;
          return acc;
        }, {}),
      };
    }

    markers.intonation = {
      rising: '↗',
      falling: '↘',
      level: '→',
      boundary: '|',
    };

    return markers;
  }

  _generateSummary(tone, stress, rhythm) {
    const parts = [];

    if (tone) {
      parts.push(`${tone.count}-tone ${tone.type} system`);
    }

    if (stress && stress.type !== 'none') {
      parts.push(`${stress.type} stress`);
    }

    parts.push(`${rhythm.type} rhythm`);

    return parts.join(', ');
  }
}
