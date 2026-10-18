/**
 * GLOSSOPETRAE - English Reference Profile
 *
 * A comprehensive linguistic profile of English used to calculate
 * divergence for generated languages. Based on typological research.
 *
 * Sources:
 * - WALS (World Atlas of Language Structures)
 * - The Cambridge Encyclopedia of the English Language
 * - Typological studies on cross-linguistic variation
 */

export const ENGLISH_PROFILE = {
  name: 'English',
  code: 'eng',

  // ═══════════════════════════════════════════════════════════════════════════
  // PHONOLOGY
  // ═══════════════════════════════════════════════════════════════════════════

  phonology: {
    // Consonant inventory (24 consonants in General American)
    consonants: {
      // Stops
      stops: ['p', 'b', 't', 'd', 'k', 'g'],
      // Affricates
      affricates: ['tʃ', 'dʒ'],
      // Fricatives
      fricatives: ['f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h'],
      // Nasals
      nasals: ['m', 'n', 'ŋ'],
      // Approximants
      approximants: ['l', 'r', 'w', 'j'],

      // Full IPA list
      all: ['p', 'b', 't', 'd', 'k', 'g', 'tʃ', 'dʒ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ', 'l', 'r', 'w', 'j'],
      count: 24,

      // What English LACKS (exotic for English speakers)
      absent: {
        clicks: ['ʘ', 'ǀ', 'ǃ', 'ǂ', 'ǁ'],
        ejectives: ['pʼ', 'tʼ', 'kʼ', 'tsʼ', 'tʃʼ'],
        implosives: ['ɓ', 'ɗ', 'ʄ', 'ɠ', 'ʛ'],
        uvulars: ['q', 'ɢ', 'χ', 'ʁ', 'ɴ'],
        pharyngeals: ['ħ', 'ʕ'],
        retroflex: ['ʈ', 'ɖ', 'ʂ', 'ʐ', 'ɳ', 'ɻ'],
        palatals: ['c', 'ɟ', 'ç', 'ʝ', 'ɲ', 'ʎ'],
        lateralFricatives: ['ɬ', 'ɮ'],
        trills: ['r̥', 'ʀ', 'ʙ'],
      },
    },

    // Vowel inventory (14-15 in GA, varies by dialect)
    vowels: {
      monophthongs: ['iː', 'ɪ', 'eɪ', 'ɛ', 'æ', 'ɑː', 'ɒ', 'ɔː', 'ʊ', 'uː', 'ʌ', 'ɜː', 'ə'],
      diphthongs: ['aɪ', 'aʊ', 'ɔɪ', 'eɪ', 'oʊ'],
      all: ['i', 'ɪ', 'e', 'ɛ', 'æ', 'ɑ', 'ɒ', 'ɔ', 'ʊ', 'u', 'ʌ', 'ɜ', 'ə'],
      count: 13,

      // Features English LACKS
      absent: {
        nasalVowels: ['ã', 'ẽ', 'ĩ', 'õ', 'ũ'],
        frontRounded: ['y', 'ø', 'œ'],
        backUnrounded: ['ɯ', 'ɤ'],
      },
    },

    // Suprasegmentals
    suprasegmentals: {
      tones: false,
      toneCount: 0,
      stressTimed: true,
      pitchAccent: false,
      vowelLength: true, // phonemic (bit vs beat)
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHONOTACTICS
  // ═══════════════════════════════════════════════════════════════════════════

  phonotactics: {
    syllableStructure: '(C)(C)(C)V(C)(C)(C)(C)',
    maxOnset: 3,   // e.g., "str-" in "string"
    maxCoda: 4,    // e.g., "-mpts" in "exempts"

    // Complexity rating (1-10 scale)
    // 1 = only CV, 10 = extremely complex clusters
    complexity: 8,

    // Common patterns
    allowsOnsetClusters: true,
    allowsCodaClusters: true,
    allowsComplexOnsets: true,  // CC or CCC
    allowsComplexCodas: true,

    // Sonority sequencing followed
    sonoritySequencing: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MORPHOLOGY
  // ═══════════════════════════════════════════════════════════════════════════

  morphology: {
    // Morphological typology
    type: 'analytic',  // Also called isolating
    typeIndex: 0.2,    // 0 = fully isolating, 1 = fully synthetic

    // Synthesis index (morphemes per word, average)
    // English ≈ 1.5, Mandarin ≈ 1.0, Turkish ≈ 3.0, Inuktitut ≈ 5.0+
    synthesisIndex: 1.5,

    // Fusion index
    // How much morphemes blend together
    // 0 = agglutinative (clear boundaries), 1 = fusional (blended)
    fusionIndex: 0.3,

    // Nominal morphology
    nominal: {
      // Case system
      caseCount: 2,  // Only pronouns: nominative (I, he) vs accusative (me, him)
      caseOnNouns: false,
      cases: ['nominative', 'accusative'],  // Only on pronouns

      // Number
      numberMarking: true,
      numbers: ['singular', 'plural'],
      dualNumber: false,
      trialNumber: false,

      // Gender/Noun classes
      genderCount: 0,  // No grammatical gender
      nounClasses: 0,

      // Articles
      hasArticles: true,
      articleTypes: ['definite', 'indefinite'],

      // Possession
      possessionMarking: 'suffix',  // -'s
    },

    // Verbal morphology
    verbal: {
      // Conjugation
      personMarking: false,  // Minimal (only 3sg -s)
      numberMarking: false,  // Minimal

      // TAM (Tense-Aspect-Mood)
      tenseCount: 2,  // Past (-ed) vs non-past
      tenses: ['past', 'present'],

      aspectCount: 2,  // Simple vs progressive
      aspects: ['simple', 'progressive'],

      moodCount: 3,
      moods: ['indicative', 'imperative', 'subjunctive'],

      // How TAM is marked
      tamMarking: 'mixed',  // Affixes + auxiliaries

      // Evidentiality (marking information source)
      evidentiality: false,

      // Voice
      voices: ['active', 'passive'],

      // Polarity
      polarityAffix: false,  // "not" is separate word
    },

    // Agreement
    agreement: {
      subjectVerb: true,   // Minimal (3sg -s)
      nounAdjective: false,
    },

    // Derivation
    derivational: {
      prefixing: true,
      suffixing: true,
      infixing: false,
      reduplication: false,
      compounding: true,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNTAX
  // ═══════════════════════════════════════════════════════════════════════════

  syntax: {
    // Basic word order
    wordOrder: 'SVO',
    wordOrderRigidity: 0.8,  // 0 = free, 1 = completely fixed

    // Head directionality
    headDirectionality: 'head-initial',

    // Phrase structure
    adpositions: 'prepositions',  // vs postpositions
    adjectivePosition: 'before',  // Adj-Noun
    genitivePosition: 'after',    // Noun-Gen ("the book of John")
    possessorPosition: 'before',  // Poss-Noun ("John's book")
    relativeClausePosition: 'after',  // Noun-Rel
    adverbPosition: 'flexible',

    // Pro-drop (can omit pronouns?)
    proDrop: false,  // English requires overt subjects

    // Topic-prominence vs Subject-prominence
    topicProminent: false,
    subjectProminent: true,

    // Questions
    questionFormation: 'movement',  // Wh-movement + aux inversion
    questionParticle: false,

    // Negation
    negationPosition: 'preverbal',  // "not" before main verb
    negativeConcord: false,  // No double negatives (prescriptively)

    // Copula
    copulaRequired: true,  // "She is tall" not "She tall"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ALIGNMENT
  // ═══════════════════════════════════════════════════════════════════════════

  alignment: {
    // Morphosyntactic alignment
    type: 'nominative-accusative',
    // Other types: ergative-absolutive, active-stative, tripartite

    // How alignment is marked
    marking: 'dependent',  // On pronouns, not nouns
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL FEATURES (that English LACKS)
  // Used to add "exotic" features at high divergence
  // ═══════════════════════════════════════════════════════════════════════════

  absentFeatures: [
    'tones',
    'vowelHarmony',
    'consonantHarmony',
    'nounClasses',
    'grammaticalGender',
    'ergativity',
    'evidentiality',
    'clusivity',           // Inclusive vs exclusive "we"
    'honorifics',          // Grammaticalized politeness
    'classifiers',         // Numeral classifiers
    'serialVerbs',
    'switchReference',
    'directInverse',
    'polysynthesis',
    'incorporation',       // Noun incorporation into verbs
    'reduplication',
    'infixation',
    'templatic',           // Root-and-pattern morphology
    'clicks',
    'ejectives',
    'implosives',
  ],
};


/**
 * Divergence calculation weights
 * How much each feature contributes to overall "distance" from English
 */
export const DIVERGENCE_WEIGHTS = {
  // Phonology (total: 25%)
  consonantOverlap: 0.08,
  vowelOverlap: 0.05,
  exoticPhonemes: 0.07,
  syllableComplexity: 0.03,
  tones: 0.02,

  // Morphology (total: 40%)
  morphologicalType: 0.12,
  caseSystem: 0.08,
  genderClasses: 0.05,
  verbComplexity: 0.08,
  agreement: 0.04,
  evidentiality: 0.03,

  // Syntax (total: 35%)
  wordOrder: 0.12,
  headDirectionality: 0.08,
  adpositionType: 0.05,
  proDrop: 0.03,
  alignment: 0.04,
  questionFormation: 0.03,
};


/**
 * Feature scales for distance calculation
 */
export const FEATURE_DISTANCES = {
  // Morphological types - distance from analytic
  morphType: {
    'analytic': 0,
    'isolating': 0,
    'fusional': 0.4,
    'agglutinative': 0.6,
    'polysynthetic': 1.0,
  },

  // Word orders - distance from SVO
  wordOrder: {
    'SVO': 0,
    'VSO': 0.3,
    'SOV': 0.4,
    'VOS': 0.7,
    'OVS': 0.8,
    'OSV': 0.9,
  },

  // Case counts - distance from 2 (English)
  caseCount: {
    0: 0.1,
    1: 0.05,
    2: 0,
    3: 0.15,
    4: 0.25,
    5: 0.35,
    6: 0.5,
    7: 0.6,
    8: 0.7,
    9: 0.8,
    10: 0.85,
    11: 0.9,
    12: 0.95,
  },

  // Alignment types
  alignment: {
    'nominative-accusative': 0,
    'active-stative': 0.5,
    'ergative-absolutive': 0.7,
    'tripartite': 0.9,
  },

  // Head directionality
  headedness: {
    'head-initial': 0,
    'mixed': 0.4,
    'head-final': 0.8,
  },
};
