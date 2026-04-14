/**
 * GLOSSOPETRAE - Linguistic Drift Engine
 *
 * Powers the "Linguistic Drift" feature - calculates how far the generated
 * language should deviate from English. Produces linguistically-accurate
 * target parameters based on real typological research.
 *
 * Drift Scale:
 *   0% = Maximally English-like (Germanic language feel)
 *  25% = Close (like Dutch, Frisian, Scandinavian)
 *  50% = Moderate (like Spanish, French, Russian)
 *  75% = Distant (like Japanese, Turkish, Finnish, Arabic)
 * 100% = Maximally alien (polysynthetic, tonal, clicks, ergativity)
 */

import { ENGLISH_PROFILE, DIVERGENCE_WEIGHTS, FEATURE_DISTANCES } from '../data/englishProfile.js';

export class DivergenceEngine {
  constructor(divergence, rng) {
    // Divergence: 0.0 (identical to English) to 1.0 (maximally alien)
    this.divergence = Math.max(0, Math.min(1, divergence));
    this.rng = rng || Math.random;
    this.english = ENGLISH_PROFILE;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN TARGET GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate all target parameters based on divergence level
   */
  generateTargets() {
    return {
      phonology: this.getPhonologyTargets(),
      morphology: this.getMorphologyTargets(),
      syntax: this.getSyntaxTargets(),
      features: this.getFeatureTargets(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHONOLOGY TARGETS
  // ═══════════════════════════════════════════════════════════════════════════

  getPhonologyTargets() {
    const d = this.divergence;

    return {
      // Consonant preferences
      consonants: {
        // Target count (English has 24)
        targetCount: this._interpolate(d, [
          [0, [22, 26]],    // Similar to English
          [0.25, [18, 28]], // Slight variation
          [0.5, [15, 35]],  // Wider range
          [0.75, [12, 45]], // Can be minimal or maximal
          [1.0, [8, 60]],   // Extreme
        ]),

        // How much to prefer English-like consonants
        englishOverlapTarget: this._interpolate(d, [
          [0, 0.9],    // 90% overlap with English
          [0.25, 0.7], // 70% overlap
          [0.5, 0.5],  // 50% overlap
          [0.75, 0.3], // 30% overlap
          [1.0, 0.1],  // Only 10% overlap
        ]),

        // Exotic phoneme probability
        exoticProbability: {
          uvulars: d > 0.4 ? (d - 0.4) * 0.8 : 0,
          pharyngeals: d > 0.6 ? (d - 0.6) * 0.7 : 0,
          ejectives: d > 0.7 ? (d - 0.7) * 0.9 : 0,
          implosives: d > 0.75 ? (d - 0.75) * 0.8 : 0,
          clicks: d > 0.9 ? (d - 0.9) * 2.0 : 0,  // Only at very high divergence
          retroflexes: d > 0.5 ? (d - 0.5) * 1.0 : 0,
          palatals: d > 0.3 ? (d - 0.3) * 0.6 : 0,
          lateralFricatives: d > 0.6 ? (d - 0.6) * 0.5 : 0,
        },

        // Features to avoid at low divergence
        avoid: d < 0.3 ? ['clicks', 'ejectives', 'implosives', 'pharyngeals'] :
               d < 0.5 ? ['clicks', 'ejectives'] :
               d < 0.7 ? ['clicks'] : [],

        // Features to require at high divergence
        require: d > 0.9 ? this._pickRandom(['ejectives', 'clicks', 'implosives'], 1) :
                 d > 0.8 ? this._pickRandom(['uvulars', 'pharyngeals', 'retroflexes'], 1) :
                 d > 0.7 ? this._pickRandom(['retroflexes', 'palatals'], 1) : [],
      },

      // Vowel preferences
      vowels: {
        targetCount: this._interpolate(d, [
          [0, [5, 7]],     // Similar to English basic
          [0.25, [5, 9]],
          [0.5, [3, 12]],
          [0.75, [3, 15]],
          [1.0, [2, 20]],
        ]),

        // Probability of vowel features English lacks
        nasalVowelProb: d > 0.5 ? (d - 0.5) * 1.2 : 0,
        frontRoundedProb: d > 0.4 ? (d - 0.4) * 1.0 : 0,
        vowelLengthPhonemic: d < 0.6,  // English has this, lose it at high divergence

        englishOverlapTarget: this._interpolate(d, [
          [0, 0.95],
          [0.25, 0.8],
          [0.5, 0.6],
          [0.75, 0.4],
          [1.0, 0.2],
        ]),
      },

      // Tones
      tones: {
        enabled: d > 0.65 && this.rng() < (d - 0.65) * 2.5,
        count: d > 0.8 ? Math.floor(this.rng() * 4) + 3 :  // 3-6 tones
               d > 0.65 ? Math.floor(this.rng() * 2) + 2 : // 2-3 tones
               0,
      },

      // Syllable structure
      syllableStructure: {
        // English is complex (up to 3 onset, 4 coda)
        // High divergence = simpler or different complexity pattern
        maxOnset: this._interpolate(d, [
          [0, [2, 3]],     // Like English
          [0.25, [2, 3]],
          [0.5, [1, 3]],
          [0.75, [1, 2]],  // Simpler
          [1.0, [0, 2]],   // Can be V-only onsets
        ]),

        maxCoda: this._interpolate(d, [
          [0, [3, 4]],     // Like English
          [0.25, [2, 4]],
          [0.5, [1, 3]],
          [0.75, [0, 2]],  // Simpler, maybe no codas
          [1.0, [0, 1]],   // CV or V only
        ]),

        // Require specific structure at high divergence
        forceSimple: d > 0.85 && this.rng() < 0.6,  // Force CV only
      },

      // Vowel harmony
      vowelHarmony: {
        enabled: d > 0.5 && this.rng() < (d - 0.5) * 1.5,
        type: this.rng() < 0.5 ? 'backness' : 'rounding',
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MORPHOLOGY TARGETS
  // ═══════════════════════════════════════════════════════════════════════════

  getMorphologyTargets() {
    const d = this.divergence;

    // Determine morphological type based on divergence
    let morphType;
    if (d < 0.2) {
      morphType = 'isolating';  // Like English
    } else if (d < 0.4) {
      morphType = this.rng() < 0.7 ? 'isolating' : 'fusional';
    } else if (d < 0.6) {
      morphType = this._weightedPick({
        'isolating': 0.2,
        'fusional': 0.5,
        'agglutinative': 0.3,
      });
    } else if (d < 0.8) {
      morphType = this._weightedPick({
        'fusional': 0.3,
        'agglutinative': 0.5,
        'polysynthetic': 0.2,
      });
    } else {
      morphType = this._weightedPick({
        'agglutinative': 0.4,
        'polysynthetic': 0.6,
      });
    }

    return {
      type: morphType,

      // Case system (English has 2, only on pronouns)
      cases: {
        count: this._interpolate(d, [
          [0, [0, 2]],     // None or like English
          [0.25, [0, 4]],
          [0.5, [2, 6]],
          [0.75, [4, 10]],
          [1.0, [6, 15]],  // Rich case system
        ]),

        onNouns: d > 0.3,  // English only marks case on pronouns
      },

      // Grammatical gender / Noun classes
      gender: {
        count: this._interpolate(d, [
          [0, [0, 0]],     // English has none
          [0.25, [0, 2]],
          [0.5, [0, 3]],
          [0.75, [2, 5]],
          [1.0, [3, 20]],  // Bantu-style noun classes
        ]),
      },

      // Number marking
      number: {
        categories: d < 0.3 ? ['singular', 'plural'] :
                    d < 0.6 ? (this.rng() < 0.3 ? ['singular', 'dual', 'plural'] : ['singular', 'plural']) :
                    this._pickRandom([
                      ['singular', 'plural'],
                      ['singular', 'dual', 'plural'],
                      ['singular', 'paucal', 'plural'],
                      ['singular', 'dual', 'paucal', 'plural'],
                    ], 1)[0],
      },

      // Verbal morphology
      verbal: {
        // Person/number agreement (English has minimal)
        personMarking: d > 0.4,
        numberMarking: d > 0.4,

        // Tense count (English has 2)
        tenseCount: this._interpolate(d, [
          [0, [2, 2]],
          [0.25, [2, 3]],
          [0.5, [2, 5]],
          [0.75, [3, 7]],
          [1.0, [0, 10]],  // Can be 0 (tenseless) or many
        ]),

        // Aspect (English has 2)
        aspectCount: this._interpolate(d, [
          [0, [2, 2]],
          [0.25, [2, 3]],
          [0.5, [2, 4]],
          [0.75, [3, 6]],
          [1.0, [2, 8]],
        ]),

        // Mood
        moodCount: this._interpolate(d, [
          [0, [2, 3]],
          [0.5, [2, 5]],
          [1.0, [3, 8]],
        ]),

        // Evidentiality (English lacks this)
        evidentiality: d > 0.7 && this.rng() < (d - 0.7) * 2.5,
        evidentialCount: d > 0.8 ? Math.floor(this.rng() * 3) + 2 : 0,
      },

      // Synthesis index (morphemes per word)
      synthesisIndex: this._interpolate(d, [
        [0, 1.5],      // Like English
        [0.25, 1.8],
        [0.5, 2.2],
        [0.75, 3.0],
        [1.0, 4.5],    // Highly synthetic
      ]),

      // Agreement complexity
      agreement: {
        subjectVerb: true,  // Keep this
        objectVerb: d > 0.6 && this.rng() < 0.4,
        nounAdjective: d > 0.4 && this.rng() < 0.5,
        nounDeterminer: d > 0.3 && this.rng() < 0.4,
      },

      // Derivational morphology
      derivational: {
        prefixPreference: d < 0.5 ? 0.5 : (d < 0.75 ? 0.6 : 0.4),
        suffixPreference: d < 0.5 ? 0.5 : (d < 0.75 ? 0.4 : 0.6),
        infixing: d > 0.7 && this.rng() < 0.3,
        reduplication: d > 0.6 && this.rng() < 0.4,
        compounding: true,
      },

      // Noun incorporation (polysynthetic feature)
      nounIncorporation: morphType === 'polysynthetic' && this.rng() < 0.7,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNTAX TARGETS
  // ═══════════════════════════════════════════════════════════════════════════

  getSyntaxTargets() {
    const d = this.divergence;

    // Word order selection based on divergence
    let wordOrder;
    if (d < 0.2) {
      wordOrder = 'SVO';  // Like English
    } else if (d < 0.4) {
      wordOrder = this._weightedPick({ 'SVO': 0.7, 'VSO': 0.2, 'SOV': 0.1 });
    } else if (d < 0.6) {
      wordOrder = this._weightedPick({ 'SVO': 0.3, 'SOV': 0.4, 'VSO': 0.3 });
    } else if (d < 0.8) {
      wordOrder = this._weightedPick({ 'SVO': 0.1, 'SOV': 0.4, 'VSO': 0.25, 'VOS': 0.15, 'OVS': 0.1 });
    } else {
      wordOrder = this._weightedPick({ 'SOV': 0.25, 'VSO': 0.2, 'VOS': 0.2, 'OVS': 0.2, 'OSV': 0.15 });
    }

    // Head directionality (English is head-initial)
    let headedness;
    if (d < 0.3) {
      headedness = 'head-initial';
    } else if (d < 0.6) {
      headedness = this.rng() < 0.6 ? 'head-initial' : 'mixed';
    } else {
      headedness = this._weightedPick({ 'head-initial': 0.2, 'mixed': 0.3, 'head-final': 0.5 });
    }

    return {
      wordOrder: wordOrder,

      wordOrderRigidity: this._interpolate(d, [
        [0, 0.8],      // Like English (fairly rigid)
        [0.25, 0.7],
        [0.5, 0.5],
        [0.75, 0.3],   // Freer word order
        [1.0, 0.2],
      ]),

      headDirectionality: headedness,

      // Adpositions (English: prepositions)
      adpositions: d < 0.4 ? 'prepositions' :
                   d < 0.7 ? (this.rng() < 0.5 ? 'prepositions' : 'postpositions') :
                   (this.rng() < 0.3 ? 'prepositions' : 'postpositions'),

      // Adjective position (English: before noun)
      adjectivePosition: d < 0.3 ? 'before' :
                         d < 0.6 ? (this.rng() < 0.7 ? 'before' : 'after') :
                         (this.rng() < 0.4 ? 'before' : 'after'),

      // Genitive/Possessor position
      genitivePosition: d < 0.4 ? 'before' :
                        d < 0.7 ? (this.rng() < 0.5 ? 'before' : 'after') :
                        (this.rng() < 0.3 ? 'before' : 'after'),

      // Pro-drop (English: no)
      proDrop: d > 0.5 && this.rng() < (d - 0.5) * 1.5,

      // Topic-prominence (English: no, subject-prominent)
      topicProminent: d > 0.6 && this.rng() < (d - 0.6) * 1.8,

      // Question formation
      questionParticle: d > 0.5 && this.rng() < (d - 0.5) * 1.2,
      whMovement: d < 0.6,  // English has this

      // Negation
      negativeAffix: d > 0.5 && this.rng() < 0.4,
      negativeConcord: d > 0.4 && this.rng() < 0.5,  // Double negatives

      // Copula (English requires it)
      copulaRequired: d < 0.6 || this.rng() < 0.5,

      // Relative clauses
      relativeClausePosition: d < 0.5 ? 'after' :
                              (this.rng() < 0.4 ? 'after' : 'before'),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXOTIC FEATURES (things English lacks entirely)
  // ═══════════════════════════════════════════════════════════════════════════

  getFeatureTargets() {
    const d = this.divergence;

    return {
      // Alignment (English: nominative-accusative)
      alignment: d < 0.6 ? 'nominative-accusative' :
                 d < 0.8 ? this._weightedPick({
                   'nominative-accusative': 0.5,
                   'active-stative': 0.3,
                   'ergative-absolutive': 0.2,
                 }) :
                 this._weightedPick({
                   'nominative-accusative': 0.2,
                   'active-stative': 0.3,
                   'ergative-absolutive': 0.4,
                   'tripartite': 0.1,
                 }),

      // Clusivity (inclusive vs exclusive "we")
      clusivity: d > 0.6 && this.rng() < (d - 0.6) * 1.5,

      // Honorifics (grammaticalized politeness)
      honorifics: d > 0.5 && this.rng() < (d - 0.5) * 1.2,
      honorificLevels: d > 0.7 ? Math.floor(this.rng() * 3) + 2 : 0,

      // Numeral classifiers
      classifiers: d > 0.6 && this.rng() < (d - 0.6) * 1.5,

      // Serial verb constructions
      serialVerbs: d > 0.7 && this.rng() < 0.4,

      // Switch reference
      switchReference: d > 0.85 && this.rng() < 0.3,

      // Direct-inverse marking
      directInverse: d > 0.8 && this.rng() < 0.25,

      // Templatic morphology (like Arabic root-and-pattern)
      templaticMorphology: d > 0.75 && this.rng() < 0.2,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Interpolate a value based on divergence level
   * @param {number} d - Divergence (0-1)
   * @param {Array} points - [[divergence, value], ...] control points
   */
  _interpolate(d, points) {
    // Find surrounding points
    let lower = points[0];
    let upper = points[points.length - 1];

    for (let i = 0; i < points.length - 1; i++) {
      if (d >= points[i][0] && d <= points[i + 1][0]) {
        lower = points[i];
        upper = points[i + 1];
        break;
      }
    }

    // Linear interpolation
    const t = (d - lower[0]) / (upper[0] - lower[0] || 1);

    // Handle range values [min, max]
    if (Array.isArray(lower[1])) {
      const minVal = lower[1][0] + t * (upper[1][0] - lower[1][0]);
      const maxVal = lower[1][1] + t * (upper[1][1] - lower[1][1]);
      return [Math.round(minVal), Math.round(maxVal)];
    }

    // Handle single values
    return lower[1] + t * (upper[1] - lower[1]);
  }

  /**
   * Pick from weighted options
   */
  _weightedPick(options) {
    const entries = Object.entries(options);
    const total = entries.reduce((sum, [_, w]) => sum + w, 0);
    let r = this.rng() * total;

    for (const [option, weight] of entries) {
      r -= weight;
      if (r <= 0) return option;
    }

    return entries[entries.length - 1][0];
  }

  /**
   * Pick n random items from array
   */
  _pickRandom(arr, n) {
    const shuffled = [...arr].sort(() => this.rng() - 0.5);
    return shuffled.slice(0, n);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DIVERGENCE SCORING (for display/feedback)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calculate actual divergence score of a generated language
   */
  static scoreLanguage(language) {
    let score = 0;

    // Word order
    score += FEATURE_DISTANCES.wordOrder[language.morphology?.wordOrder?.basic] || 0;

    // Morphological type
    score += FEATURE_DISTANCES.morphType[language.morphology?.type] || 0;

    // Case count
    const caseCount = language.morphology?.nominal?.caseSystem?.cases?.length || 0;
    score += FEATURE_DISTANCES.caseCount[Math.min(caseCount, 12)] || 0;

    // Alignment
    score += FEATURE_DISTANCES.alignment[language.morphology?.alignment] || 0;

    // Tones
    if (language.prosody?.tones?.enabled) score += 0.15;

    // Exotic phonemes
    const consonants = language.phonology?.consonants || [];
    const exoticPhonemes = ['q', 'ɢ', 'ʔ', 'ħ', 'ʕ', 'ʈ', 'ɖ', 'ɬ', 'ɮ'];
    const exoticCount = consonants.filter(c => exoticPhonemes.includes(c.ipa)).length;
    score += Math.min(0.15, exoticCount * 0.03);

    // Vowel harmony
    if (language.phonology?.vowelHarmony) score += 0.1;

    // Evidentiality
    if (language.morphology?.verbal?.evidentiality) score += 0.1;

    // Noun classes / Gender
    const genderCount = language.morphology?.nominal?.nounClasses?.count || 0;
    if (genderCount > 0) score += Math.min(0.15, genderCount * 0.03);

    // Normalize to 0-1
    return Math.min(1, score / 1.5);
  }

  /**
   * Get human-readable description of linguistic drift level
   */
  static describeDivergence(d) {
    if (d < 0.15) return 'Minimal drift — Very English-like (Germanic feel)';
    if (d < 0.30) return 'Low drift — Close to English (like Dutch or Frisian)';
    if (d < 0.45) return 'Moderate drift — Familiar (like French or German)';
    if (d < 0.60) return 'Noticeable drift — Different (like Russian or Greek)';
    if (d < 0.75) return 'High drift — Foreign (like Arabic or Japanese)';
    if (d < 0.90) return 'Extreme drift — Very alien (like Navajo or Georgian)';
    return 'Maximum drift — Exotic (like Pirahã or !Xóõ)';
  }
}

export default DivergenceEngine;
