/**
 * GLOSSOPETRAE - Phoneme Data
 * IPA consonants and vowels with cross-linguistic frequency data
 */

// Consonant inventory data with features and frequencies
export const CONSONANTS = {
  // Plosives/Stops
  stops: [
    { ipa: 'p', place: 'bilabial', voice: 'voiceless', freq: 0.95, roman: 'p' },
    { ipa: 'b', place: 'bilabial', voice: 'voiced', freq: 0.65, roman: 'b' },
    { ipa: 't', place: 'alveolar', voice: 'voiceless', freq: 0.98, roman: 't' },
    { ipa: 'd', place: 'alveolar', voice: 'voiced', freq: 0.60, roman: 'd' },
    { ipa: 'k', place: 'velar', voice: 'voiceless', freq: 0.95, roman: 'k' },
    { ipa: 'g', place: 'velar', voice: 'voiced', freq: 0.55, roman: 'g' },
    { ipa: 'q', place: 'uvular', voice: 'voiceless', freq: 0.18, roman: 'q' },
    { ipa: 'ʔ', place: 'glottal', voice: 'voiceless', freq: 0.45, roman: "'" },
  ],

  // Nasals
  nasals: [
    { ipa: 'm', place: 'bilabial', voice: 'voiced', freq: 0.97, roman: 'm' },
    { ipa: 'n', place: 'alveolar', voice: 'voiced', freq: 0.98, roman: 'n' },
    { ipa: 'ɲ', place: 'palatal', voice: 'voiced', freq: 0.35, roman: 'ny' },
    { ipa: 'ŋ', place: 'velar', voice: 'voiced', freq: 0.50, roman: 'ng' },
  ],

  // Fricatives
  fricatives: [
    { ipa: 'f', place: 'labiodental', voice: 'voiceless', freq: 0.55, roman: 'f' },
    { ipa: 'v', place: 'labiodental', voice: 'voiced', freq: 0.40, roman: 'v' },
    { ipa: 'θ', place: 'dental', voice: 'voiceless', freq: 0.12, roman: 'th' },
    { ipa: 'ð', place: 'dental', voice: 'voiced', freq: 0.08, roman: 'dh' },
    { ipa: 's', place: 'alveolar', voice: 'voiceless', freq: 0.95, roman: 's' },
    { ipa: 'z', place: 'alveolar', voice: 'voiced', freq: 0.45, roman: 'z' },
    { ipa: 'ʃ', place: 'postalveolar', voice: 'voiceless', freq: 0.50, roman: 'sh' },
    { ipa: 'ʒ', place: 'postalveolar', voice: 'voiced', freq: 0.25, roman: 'zh' },
    { ipa: 'x', place: 'velar', voice: 'voiceless', freq: 0.35, roman: 'kh' },
    { ipa: 'ɣ', place: 'velar', voice: 'voiced', freq: 0.15, roman: 'gh' },
    { ipa: 'χ', place: 'uvular', voice: 'voiceless', freq: 0.12, roman: 'qh' },
    { ipa: 'h', place: 'glottal', voice: 'voiceless', freq: 0.75, roman: 'h' },
  ],

  // Affricates
  affricates: [
    { ipa: 'ts', place: 'alveolar', voice: 'voiceless', freq: 0.40, roman: 'ts' },
    { ipa: 'dz', place: 'alveolar', voice: 'voiced', freq: 0.20, roman: 'dz' },
    { ipa: 'tʃ', place: 'postalveolar', voice: 'voiceless', freq: 0.45, roman: 'ch' },
    { ipa: 'dʒ', place: 'postalveolar', voice: 'voiced', freq: 0.30, roman: 'j' },
  ],

  // Liquids
  liquids: [
    { ipa: 'l', place: 'alveolar', voice: 'voiced', freq: 0.85, roman: 'l', manner: 'lateral' },
    { ipa: 'r', place: 'alveolar', voice: 'voiced', freq: 0.75, roman: 'r', manner: 'rhotic' },
    { ipa: 'ɾ', place: 'alveolar', voice: 'voiced', freq: 0.40, roman: 'r', manner: 'tap' },
    { ipa: 'ʀ', place: 'uvular', voice: 'voiced', freq: 0.15, roman: 'rr', manner: 'trill' },
  ],

  // Glides/Approximants
  glides: [
    { ipa: 'w', place: 'labial-velar', voice: 'voiced', freq: 0.80, roman: 'w' },
    { ipa: 'j', place: 'palatal', voice: 'voiced', freq: 0.85, roman: 'y' },
  ],
};

// Vowel inventory data
export const VOWELS = {
  // Basic vowels (almost universal)
  core: [
    { ipa: 'i', height: 'close', backness: 'front', rounded: false, freq: 0.99, roman: 'i' },
    { ipa: 'a', height: 'open', backness: 'central', rounded: false, freq: 0.99, roman: 'a' },
    { ipa: 'u', height: 'close', backness: 'back', rounded: true, freq: 0.95, roman: 'u' },
  ],

  // Extended set
  extended: [
    { ipa: 'e', height: 'close-mid', backness: 'front', rounded: false, freq: 0.85, roman: 'e' },
    { ipa: 'o', height: 'close-mid', backness: 'back', rounded: true, freq: 0.85, roman: 'o' },
    { ipa: 'ɛ', height: 'open-mid', backness: 'front', rounded: false, freq: 0.45, roman: 'è' },
    { ipa: 'ɔ', height: 'open-mid', backness: 'back', rounded: true, freq: 0.45, roman: 'ò' },
    { ipa: 'ə', height: 'mid', backness: 'central', rounded: false, freq: 0.40, roman: 'ë' },
    { ipa: 'ɪ', height: 'near-close', backness: 'front', rounded: false, freq: 0.30, roman: 'ï' },
    { ipa: 'ʊ', height: 'near-close', backness: 'back', rounded: true, freq: 0.25, roman: 'ü' },
    { ipa: 'y', height: 'close', backness: 'front', rounded: true, freq: 0.20, roman: 'ÿ' },
    { ipa: 'ø', height: 'close-mid', backness: 'front', rounded: true, freq: 0.15, roman: 'ö' },
  ],
};

// Places of articulation with cross-linguistic frequency
export const PLACES = [
  { name: 'bilabial', freq: 0.95 },
  { name: 'labiodental', freq: 0.45 },
  { name: 'dental', freq: 0.35 },
  { name: 'alveolar', freq: 0.98 },
  { name: 'postalveolar', freq: 0.50 },
  { name: 'palatal', freq: 0.45 },
  { name: 'velar', freq: 0.92 },
  { name: 'uvular', freq: 0.18 },
  { name: 'glottal', freq: 0.75 },
];

// Manners of articulation
export const MANNERS = [
  { name: 'stop', freq: 0.99, requires: [] },
  { name: 'nasal', freq: 0.97, requires: ['stop'] },
  { name: 'fricative', freq: 0.90, requires: [] },
  { name: 'affricate', freq: 0.45, requires: ['stop', 'fricative'] },
  { name: 'liquid', freq: 0.80, requires: [] },
  { name: 'glide', freq: 0.85, requires: [] },
];

// Sonority hierarchy (for syllable structure)
export const SONORITY = {
  stop: 1,
  affricate: 2,
  fricative: 3,
  nasal: 4,
  liquid: 5,
  glide: 6,
  vowel: 7,
};

// Get all consonants as flat array
export function getAllConsonants() {
  return [
    ...CONSONANTS.stops,
    ...CONSONANTS.nasals,
    ...CONSONANTS.fricatives,
    ...CONSONANTS.affricates,
    ...CONSONANTS.liquids,
    ...CONSONANTS.glides,
  ];
}

// Get all vowels as flat array
export function getAllVowels() {
  return [...VOWELS.core, ...VOWELS.extended];
}

// Get consonant by manner
export function getConsonantsByManner(manner) {
  return CONSONANTS[manner] || [];
}

// Get manner for a consonant
export function getConsonantManner(consonant) {
  for (const [manner, list] of Object.entries(CONSONANTS)) {
    if (list.some((c) => c.ipa === consonant.ipa)) {
      return manner;
    }
  }
  return null;
}
