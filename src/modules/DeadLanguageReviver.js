/**
 * GLOSSOPETRAE - Dead Language Reviver Module
 *
 * Resurrects and mutates historical languages for conlang generation.
 * Includes authentic typological data from attested dead languages
 * and algorithms for linguistic evolution/mutation.
 *
 * Supported Languages:
 * - Latin (Classical, Vulgar)
 * - Ancient Greek (Attic, Koine, Homeric)
 * - Sanskrit (Vedic, Classical)
 * - Gothic
 * - Old English (Anglo-Saxon)
 * - Old Norse
 * - Proto-Indo-European (reconstructed)
 * - Sumerian
 * - Akkadian
 * - Ancient Egyptian
 * - Biblical Hebrew
 * - Classical Chinese (Literary)
 *
 * Revival Modes:
 * - authentic: Stay close to attested forms
 * - neo: Modern adaptation (like Modern Hebrew)
 * - mutated: Apply sound changes and drift
 * - hybrid: Cross with another language family
 * - speculative: "What if it never died?"
 */

// Historical language templates with authentic typological data
export const DEAD_LANGUAGES = {
  latin: {
    name: 'Latin',
    code: 'LAT',
    family: 'Indo-European > Italic',
    era: '75 BC - 200 AD (Classical)',
    description: 'Classical Latin of the Roman Republic and Empire',

    phonology: {
      consonants: [
        { ipa: 'p', roman: 'p' }, { ipa: 'b', roman: 'b' },
        { ipa: 't', roman: 't' }, { ipa: 'd', roman: 'd' },
        { ipa: 'k', roman: 'c' }, { ipa: 'g', roman: 'g' },
        { ipa: 'kʷ', roman: 'qu' },
        { ipa: 'f', roman: 'f' }, { ipa: 's', roman: 's' },
        { ipa: 'h', roman: 'h' },
        { ipa: 'm', roman: 'm' }, { ipa: 'n', roman: 'n' },
        { ipa: 'l', roman: 'l' }, { ipa: 'r', roman: 'r' },
        { ipa: 'w', roman: 'v' }, { ipa: 'j', roman: 'i' },
      ],
      vowels: [
        { ipa: 'a', roman: 'a', length: 'short' },
        { ipa: 'aː', roman: 'ā', length: 'long' },
        { ipa: 'e', roman: 'e', length: 'short' },
        { ipa: 'eː', roman: 'ē', length: 'long' },
        { ipa: 'i', roman: 'i', length: 'short' },
        { ipa: 'iː', roman: 'ī', length: 'long' },
        { ipa: 'o', roman: 'o', length: 'short' },
        { ipa: 'oː', roman: 'ō', length: 'long' },
        { ipa: 'u', roman: 'u', length: 'short' },
        { ipa: 'uː', roman: 'ū', length: 'long' },
      ],
      diphthongs: ['ae', 'au', 'oe', 'ei', 'eu', 'ui'],
    },

    morphology: {
      type: 'fusional',
      wordOrder: 'SOV',
      alignment: 'nominative-accusative',
      cases: [
        { name: 'Nominative', abbr: 'NOM', function: 'subject' },
        { name: 'Accusative', abbr: 'ACC', function: 'direct object' },
        { name: 'Genitive', abbr: 'GEN', function: 'possession' },
        { name: 'Dative', abbr: 'DAT', function: 'indirect object' },
        { name: 'Ablative', abbr: 'ABL', function: 'separation, instrument' },
        { name: 'Vocative', abbr: 'VOC', function: 'address' },
        { name: 'Locative', abbr: 'LOC', function: 'location (remnant)' },
      ],
      declensions: 5,
      conjugations: 4,
      genders: ['masculine', 'feminine', 'neuter'],
      numbers: ['singular', 'plural'],
      tenses: ['present', 'imperfect', 'future', 'perfect', 'pluperfect', 'future-perfect'],
      moods: ['indicative', 'subjunctive', 'imperative', 'infinitive'],
      voices: ['active', 'passive'],
    },

    sampleRoots: ['am', 'hab', 'vid', 'ven', 'fac', 'dic', 'duc', 'cap', 'fer', 'port'],
    soundPatterns: ['CVCV', 'CVC', 'CVCCV', 'VCV'],
  },

  ancientGreek: {
    name: 'Ancient Greek',
    code: 'GRC',
    family: 'Indo-European > Hellenic',
    era: '800 BC - 300 BC (Attic)',
    description: 'Classical Attic Greek of Athens',

    phonology: {
      consonants: [
        { ipa: 'p', roman: 'p' }, { ipa: 'b', roman: 'b' }, { ipa: 'pʰ', roman: 'ph' },
        { ipa: 't', roman: 't' }, { ipa: 'd', roman: 'd' }, { ipa: 'tʰ', roman: 'th' },
        { ipa: 'k', roman: 'k' }, { ipa: 'g', roman: 'g' }, { ipa: 'kʰ', roman: 'kh' },
        { ipa: 's', roman: 's' }, { ipa: 'h', roman: 'h' },
        { ipa: 'dz', roman: 'z' }, { ipa: 'ks', roman: 'x' }, { ipa: 'ps', roman: 'ps' },
        { ipa: 'm', roman: 'm' }, { ipa: 'n', roman: 'n' }, { ipa: 'ŋ', roman: 'ng' },
        { ipa: 'l', roman: 'l' }, { ipa: 'r', roman: 'r' },
      ],
      vowels: [
        { ipa: 'a', roman: 'a' }, { ipa: 'aː', roman: 'ā' },
        { ipa: 'e', roman: 'e' }, { ipa: 'ɛː', roman: 'ē' },
        { ipa: 'i', roman: 'i' }, { ipa: 'iː', roman: 'ī' },
        { ipa: 'o', roman: 'o' }, { ipa: 'ɔː', roman: 'ō' },
        { ipa: 'y', roman: 'y' }, { ipa: 'yː', roman: 'ȳ' },
      ],
      diphthongs: ['ai', 'ei', 'oi', 'au', 'eu', 'ou', 'ui'],
      pitch: true,  // Pitch accent
    },

    morphology: {
      type: 'fusional',
      wordOrder: 'SOV',
      alignment: 'nominative-accusative',
      cases: [
        { name: 'Nominative', abbr: 'NOM', function: 'subject' },
        { name: 'Accusative', abbr: 'ACC', function: 'direct object' },
        { name: 'Genitive', abbr: 'GEN', function: 'possession, source' },
        { name: 'Dative', abbr: 'DAT', function: 'indirect object, instrument' },
        { name: 'Vocative', abbr: 'VOC', function: 'address' },
      ],
      declensions: 3,
      genders: ['masculine', 'feminine', 'neuter'],
      numbers: ['singular', 'dual', 'plural'],
      tenses: ['present', 'imperfect', 'future', 'aorist', 'perfect', 'pluperfect', 'future-perfect'],
      moods: ['indicative', 'subjunctive', 'optative', 'imperative', 'infinitive', 'participle'],
      voices: ['active', 'middle', 'passive'],
      aspects: ['imperfective', 'perfective', 'stative'],
    },

    sampleRoots: ['log', 'graph', 'phil', 'soph', 'dem', 'krat', 'theo', 'anthrop', 'bio', 'geo'],
    soundPatterns: ['CVCV', 'CVC', 'CVCC', 'VCV', 'CCVC'],
  },

  sanskrit: {
    name: 'Sanskrit',
    code: 'SAN',
    family: 'Indo-European > Indo-Iranian',
    era: '1500 BC - 500 AD (Classical)',
    description: 'Classical Sanskrit, the liturgical language of Hinduism',

    phonology: {
      consonants: [
        // Stops (5x5 grid)
        { ipa: 'k', roman: 'k' }, { ipa: 'kʰ', roman: 'kh' }, { ipa: 'g', roman: 'g' }, { ipa: 'gʰ', roman: 'gh' }, { ipa: 'ŋ', roman: 'ṅ' },
        { ipa: 'c', roman: 'c' }, { ipa: 'cʰ', roman: 'ch' }, { ipa: 'ɟ', roman: 'j' }, { ipa: 'ɟʰ', roman: 'jh' }, { ipa: 'ɲ', roman: 'ñ' },
        { ipa: 'ʈ', roman: 'ṭ' }, { ipa: 'ʈʰ', roman: 'ṭh' }, { ipa: 'ɖ', roman: 'ḍ' }, { ipa: 'ɖʰ', roman: 'ḍh' }, { ipa: 'ɳ', roman: 'ṇ' },
        { ipa: 't', roman: 't' }, { ipa: 'tʰ', roman: 'th' }, { ipa: 'd', roman: 'd' }, { ipa: 'dʰ', roman: 'dh' }, { ipa: 'n', roman: 'n' },
        { ipa: 'p', roman: 'p' }, { ipa: 'pʰ', roman: 'ph' }, { ipa: 'b', roman: 'b' }, { ipa: 'bʰ', roman: 'bh' }, { ipa: 'm', roman: 'm' },
        // Others
        { ipa: 'j', roman: 'y' }, { ipa: 'r', roman: 'r' }, { ipa: 'l', roman: 'l' }, { ipa: 'ʋ', roman: 'v' },
        { ipa: 'ʃ', roman: 'ś' }, { ipa: 'ʂ', roman: 'ṣ' }, { ipa: 's', roman: 's' }, { ipa: 'h', roman: 'h' },
      ],
      vowels: [
        { ipa: 'a', roman: 'a' }, { ipa: 'aː', roman: 'ā' },
        { ipa: 'i', roman: 'i' }, { ipa: 'iː', roman: 'ī' },
        { ipa: 'u', roman: 'u' }, { ipa: 'uː', roman: 'ū' },
        { ipa: 'ṛ', roman: 'ṛ' }, { ipa: 'ṝ', roman: 'ṝ' },  // Vocalic r
        { ipa: 'e', roman: 'e' }, { ipa: 'ai', roman: 'ai' },
        { ipa: 'o', roman: 'o' }, { ipa: 'au', roman: 'au' },
      ],
      sandhi: true,  // Extensive sound changes at word boundaries
    },

    morphology: {
      type: 'fusional',
      wordOrder: 'SOV',
      alignment: 'nominative-accusative',
      cases: [
        { name: 'Nominative', abbr: 'NOM', function: 'subject' },
        { name: 'Accusative', abbr: 'ACC', function: 'direct object' },
        { name: 'Instrumental', abbr: 'INS', function: 'instrument, means' },
        { name: 'Dative', abbr: 'DAT', function: 'indirect object, purpose' },
        { name: 'Ablative', abbr: 'ABL', function: 'source, cause' },
        { name: 'Genitive', abbr: 'GEN', function: 'possession' },
        { name: 'Locative', abbr: 'LOC', function: 'location' },
        { name: 'Vocative', abbr: 'VOC', function: 'address' },
      ],
      genders: ['masculine', 'feminine', 'neuter'],
      numbers: ['singular', 'dual', 'plural'],
      tenses: ['present', 'imperfect', 'perfect', 'aorist', 'future', 'conditional', 'pluperfect'],
      moods: ['indicative', 'optative', 'imperative', 'subjunctive'],
    },

    sampleRoots: ['bhū', 'as', 'kr', 'gam', 'vid', 'vac', 'dā', 'sthā', 'pac', 'jan'],
    soundPatterns: ['CVCV', 'CCV', 'CVCC', 'CCVC'],
  },

  gothic: {
    name: 'Gothic',
    code: 'GOT',
    family: 'Indo-European > Germanic > East Germanic',
    era: '350-550 AD',
    description: 'East Germanic language of the Goths, known from the Wulfila Bible',

    phonology: {
      consonants: [
        { ipa: 'p', roman: 'p' }, { ipa: 'b', roman: 'b' },
        { ipa: 't', roman: 't' }, { ipa: 'd', roman: 'd' }, { ipa: 'θ', roman: 'þ' },
        { ipa: 'k', roman: 'k' }, { ipa: 'g', roman: 'g' }, { ipa: 'x', roman: 'h' },
        { ipa: 'kʷ', roman: 'q' }, { ipa: 'gʷ', roman: 'gw' }, { ipa: 'xʷ', roman: 'hw' },
        { ipa: 's', roman: 's' }, { ipa: 'z', roman: 'z' },
        { ipa: 'm', roman: 'm' }, { ipa: 'n', roman: 'n' },
        { ipa: 'l', roman: 'l' }, { ipa: 'r', roman: 'r' },
        { ipa: 'j', roman: 'j' }, { ipa: 'w', roman: 'w' },
      ],
      vowels: [
        { ipa: 'a', roman: 'a' }, { ipa: 'aː', roman: 'a' },
        { ipa: 'e', roman: 'aí' }, { ipa: 'eː', roman: 'e' },
        { ipa: 'i', roman: 'i' }, { ipa: 'iː', roman: 'ei' },
        { ipa: 'o', roman: 'aú' }, { ipa: 'oː', roman: 'o' },
        { ipa: 'u', roman: 'u' }, { ipa: 'uː', roman: 'u' },
      ],
    },

    morphology: {
      type: 'fusional',
      wordOrder: 'SOV',
      alignment: 'nominative-accusative',
      cases: [
        { name: 'Nominative', abbr: 'NOM', function: 'subject' },
        { name: 'Accusative', abbr: 'ACC', function: 'direct object' },
        { name: 'Genitive', abbr: 'GEN', function: 'possession' },
        { name: 'Dative', abbr: 'DAT', function: 'indirect object' },
      ],
      genders: ['masculine', 'feminine', 'neuter'],
      numbers: ['singular', 'plural'],
      strongVerbs: true,  // Ablaut patterns
      weakVerbs: true,    // Dental suffix
    },

    sampleRoots: ['qim', 'gib', 'nim', 'bar', 'waúrk', 'saíh', 'standan', 'haban'],
    soundPatterns: ['CVCC', 'CVC', 'CCVC'],
  },

  oldEnglish: {
    name: 'Old English',
    code: 'ANG',
    family: 'Indo-European > Germanic > West Germanic',
    era: '450-1100 AD',
    description: 'Anglo-Saxon, the language of Beowulf',

    phonology: {
      consonants: [
        { ipa: 'p', roman: 'p' }, { ipa: 'b', roman: 'b' },
        { ipa: 't', roman: 't' }, { ipa: 'd', roman: 'd' },
        { ipa: 'k', roman: 'c' }, { ipa: 'g', roman: 'g' },
        { ipa: 'tʃ', roman: 'ċ' }, { ipa: 'dʒ', roman: 'ċg' },
        { ipa: 'f', roman: 'f' }, { ipa: 'v', roman: 'f' },
        { ipa: 'θ', roman: 'þ' }, { ipa: 'ð', roman: 'ð' },
        { ipa: 's', roman: 's' }, { ipa: 'z', roman: 's' },
        { ipa: 'ʃ', roman: 'sc' }, { ipa: 'x', roman: 'h' },
        { ipa: 'm', roman: 'm' }, { ipa: 'n', roman: 'n' },
        { ipa: 'l', roman: 'l' }, { ipa: 'r', roman: 'r' },
        { ipa: 'w', roman: 'w' }, { ipa: 'j', roman: 'ġ' },
      ],
      vowels: [
        { ipa: 'a', roman: 'a' }, { ipa: 'aː', roman: 'ā' },
        { ipa: 'æ', roman: 'æ' }, { ipa: 'æː', roman: 'ǣ' },
        { ipa: 'e', roman: 'e' }, { ipa: 'eː', roman: 'ē' },
        { ipa: 'i', roman: 'i' }, { ipa: 'iː', roman: 'ī' },
        { ipa: 'o', roman: 'o' }, { ipa: 'oː', roman: 'ō' },
        { ipa: 'u', roman: 'u' }, { ipa: 'uː', roman: 'ū' },
        { ipa: 'y', roman: 'y' }, { ipa: 'yː', roman: 'ȳ' },
      ],
    },

    morphology: {
      type: 'fusional',
      wordOrder: 'SVO',  // More flexible than later English
      alignment: 'nominative-accusative',
      cases: [
        { name: 'Nominative', abbr: 'NOM', function: 'subject' },
        { name: 'Accusative', abbr: 'ACC', function: 'direct object' },
        { name: 'Genitive', abbr: 'GEN', function: 'possession' },
        { name: 'Dative', abbr: 'DAT', function: 'indirect object, instrument' },
      ],
      genders: ['masculine', 'feminine', 'neuter'],
      numbers: ['singular', 'plural'],
    },

    sampleRoots: ['beran', 'cuman', 'don', 'gan', 'habban', 'secgan', 'seon', 'witan'],
    soundPatterns: ['CVC', 'CVCC', 'CCVC'],
  },

  oldNorse: {
    name: 'Old Norse',
    code: 'NON',
    family: 'Indo-European > Germanic > North Germanic',
    era: '700-1300 AD',
    description: 'Language of the Vikings and the Eddas',

    phonology: {
      consonants: [
        { ipa: 'p', roman: 'p' }, { ipa: 'b', roman: 'b' },
        { ipa: 't', roman: 't' }, { ipa: 'd', roman: 'd' },
        { ipa: 'k', roman: 'k' }, { ipa: 'g', roman: 'g' },
        { ipa: 'θ', roman: 'þ' }, { ipa: 'ð', roman: 'ð' },
        { ipa: 'f', roman: 'f' }, { ipa: 'v', roman: 'v' },
        { ipa: 's', roman: 's' }, { ipa: 'h', roman: 'h' },
        { ipa: 'm', roman: 'm' }, { ipa: 'n', roman: 'n' },
        { ipa: 'l', roman: 'l' }, { ipa: 'r', roman: 'r' },
        { ipa: 'j', roman: 'j' }, { ipa: 'w', roman: 'v' },
      ],
      vowels: [
        { ipa: 'a', roman: 'a' }, { ipa: 'aː', roman: 'á' },
        { ipa: 'e', roman: 'e' }, { ipa: 'eː', roman: 'é' },
        { ipa: 'i', roman: 'i' }, { ipa: 'iː', roman: 'í' },
        { ipa: 'o', roman: 'o' }, { ipa: 'oː', roman: 'ó' },
        { ipa: 'u', roman: 'u' }, { ipa: 'uː', roman: 'ú' },
        { ipa: 'y', roman: 'y' }, { ipa: 'yː', roman: 'ý' },
        { ipa: 'ø', roman: 'ø' }, { ipa: 'øː', roman: 'œ' },
        { ipa: 'ɔ', roman: 'ǫ' },
      ],
      umlaut: true,  // i-umlaut, u-umlaut
    },

    morphology: {
      type: 'fusional',
      wordOrder: 'V2',  // Verb-second
      alignment: 'nominative-accusative',
      cases: [
        { name: 'Nominative', abbr: 'NOM', function: 'subject' },
        { name: 'Accusative', abbr: 'ACC', function: 'direct object' },
        { name: 'Genitive', abbr: 'GEN', function: 'possession' },
        { name: 'Dative', abbr: 'DAT', function: 'indirect object' },
      ],
      genders: ['masculine', 'feminine', 'neuter'],
      numbers: ['singular', 'plural'],
    },

    sampleRoots: ['fara', 'gefa', 'koma', 'sjá', 'taka', 'vera', 'vilja'],
    soundPatterns: ['CVC', 'CVCC', 'CCVC'],
  },

  sumerian: {
    name: 'Sumerian',
    code: 'SUX',
    family: 'Language isolate',
    era: '3100 BC - 2000 BC (spoken), later as liturgical',
    description: 'The oldest written language, from ancient Mesopotamia',

    phonology: {
      consonants: [
        { ipa: 'p', roman: 'p' }, { ipa: 'b', roman: 'b' },
        { ipa: 't', roman: 't' }, { ipa: 'd', roman: 'd' },
        { ipa: 'k', roman: 'k' }, { ipa: 'g', roman: 'g' },
        { ipa: 's', roman: 's' }, { ipa: 'z', roman: 'z' },
        { ipa: 'ʃ', roman: 'š' }, { ipa: 'x', roman: 'ḫ' },
        { ipa: 'm', roman: 'm' }, { ipa: 'n', roman: 'n' },
        { ipa: 'l', roman: 'l' }, { ipa: 'r', roman: 'r' },
      ],
      vowels: [
        { ipa: 'a', roman: 'a' },
        { ipa: 'e', roman: 'e' },
        { ipa: 'i', roman: 'i' },
        { ipa: 'u', roman: 'u' },
      ],
    },

    morphology: {
      type: 'agglutinative',
      wordOrder: 'SOV',
      alignment: 'ergative-absolutive',
      caseMarking: 'postpositions',
      verbChain: true,  // Complex verb chains with multiple slots
      nounClasses: ['human', 'non-human'],
      numbers: ['singular', 'plural'],
    },

    sampleRoots: ['dug', 'ĝar', 'du', 'šu', 'ki', 'an', 'en', 'lugal'],
    soundPatterns: ['CV', 'CVC', 'CVVC'],
  },

  ancientEgyptian: {
    name: 'Ancient Egyptian',
    code: 'EGY',
    family: 'Afro-Asiatic > Egyptian',
    era: '3200 BC - 400 AD',
    description: 'Language of the Pharaohs, from hieroglyphs to Coptic',

    phonology: {
      consonants: [
        { ipa: 'p', roman: 'p' }, { ipa: 'b', roman: 'b' },
        { ipa: 't', roman: 't' }, { ipa: 'd', roman: 'd' },
        { ipa: 'k', roman: 'k' }, { ipa: 'g', roman: 'g' },
        { ipa: 'q', roman: 'q' }, { ipa: 'ʔ', roman: 'ꜣ' },
        { ipa: 'f', roman: 'f' }, { ipa: 's', roman: 's' },
        { ipa: 'z', roman: 'z' }, { ipa: 'ʃ', roman: 'š' },
        { ipa: 'x', roman: 'ḫ' }, { ipa: 'ħ', roman: 'ḥ' },
        { ipa: 'h', roman: 'h' },
        { ipa: 'm', roman: 'm' }, { ipa: 'n', roman: 'n' },
        { ipa: 'r', roman: 'r' }, { ipa: 'l', roman: 'l' },
        { ipa: 'j', roman: 'j' }, { ipa: 'w', roman: 'w' },
      ],
      vowels: [
        { ipa: 'a', roman: 'a' },
        { ipa: 'i', roman: 'i' },
        { ipa: 'u', roman: 'u' },
      ],  // Vowels not written, reconstructed
    },

    morphology: {
      type: 'fusional',
      wordOrder: 'VSO',
      alignment: 'nominative-accusative',
      triconsonantal: true,  // Root system like Semitic
      genders: ['masculine', 'feminine'],
      numbers: ['singular', 'dual', 'plural'],
    },

    sampleRoots: ['nfr', 'pr', 'jrj', 'ḏd', 'wnn', 'ꜥnḫ', 'mꜣꜥ'],
    soundPatterns: ['CVC', 'CVCC', 'CVCV'],
  },

  protoIndoEuropean: {
    name: 'Proto-Indo-European',
    code: 'PIE',
    family: 'Indo-European (reconstructed ancestor)',
    era: '4500-2500 BC (reconstructed)',
    description: 'Reconstructed ancestor of most European and many Asian languages',

    phonology: {
      consonants: [
        // Labials
        { ipa: 'p', roman: 'p' }, { ipa: 'b', roman: 'b' }, { ipa: 'bʰ', roman: 'bʰ' },
        // Dentals
        { ipa: 't', roman: 't' }, { ipa: 'd', roman: 'd' }, { ipa: 'dʰ', roman: 'dʰ' },
        // Palatovelars
        { ipa: 'ḱ', roman: 'ḱ' }, { ipa: 'ǵ', roman: 'ǵ' }, { ipa: 'ǵʰ', roman: 'ǵʰ' },
        // Plain velars
        { ipa: 'k', roman: 'k' }, { ipa: 'g', roman: 'g' }, { ipa: 'gʰ', roman: 'gʰ' },
        // Labiovelars
        { ipa: 'kʷ', roman: 'kʷ' }, { ipa: 'gʷ', roman: 'gʷ' }, { ipa: 'gʷʰ', roman: 'gʷʰ' },
        // Others
        { ipa: 's', roman: 's' },
        { ipa: 'm', roman: 'm' }, { ipa: 'n', roman: 'n' },
        { ipa: 'l', roman: 'l' }, { ipa: 'r', roman: 'r' },
        { ipa: 'j', roman: 'y' }, { ipa: 'w', roman: 'w' },
        // Laryngeals
        { ipa: 'h₁', roman: 'h₁' }, { ipa: 'h₂', roman: 'h₂' }, { ipa: 'h₃', roman: 'h₃' },
      ],
      vowels: [
        { ipa: 'e', roman: 'e' }, { ipa: 'eː', roman: 'ē' },
        { ipa: 'o', roman: 'o' }, { ipa: 'oː', roman: 'ō' },
      ],
      ablaut: true,  // e/o/∅ alternations
    },

    morphology: {
      type: 'fusional',
      wordOrder: 'SOV',
      alignment: 'nominative-accusative',
      cases: [
        { name: 'Nominative', abbr: 'NOM', function: 'subject' },
        { name: 'Accusative', abbr: 'ACC', function: 'direct object' },
        { name: 'Genitive', abbr: 'GEN', function: 'possession' },
        { name: 'Dative', abbr: 'DAT', function: 'recipient' },
        { name: 'Ablative', abbr: 'ABL', function: 'source' },
        { name: 'Locative', abbr: 'LOC', function: 'location' },
        { name: 'Instrumental', abbr: 'INS', function: 'instrument' },
        { name: 'Vocative', abbr: 'VOC', function: 'address' },
      ],
      genders: ['masculine', 'feminine', 'neuter'],
      numbers: ['singular', 'dual', 'plural'],
    },

    sampleRoots: ['*bʰer', '*steh₂', '*gʷem', '*h₁es', '*weyd', '*deh₃', '*h₂eḱ'],
    soundPatterns: ['CeC', 'CeRC', 'CReC'],
  },

  biblicalHebrew: {
    name: 'Biblical Hebrew',
    code: 'HBO',
    family: 'Afro-Asiatic > Semitic > Canaanite',
    era: '1200-200 BC',
    description: 'The language of the Hebrew Bible/Old Testament',

    phonology: {
      consonants: [
        { ipa: 'ʔ', roman: 'ʾ' }, { ipa: 'b', roman: 'b' }, { ipa: 'v', roman: 'ḇ' },
        { ipa: 'g', roman: 'g' }, { ipa: 'ɣ', roman: 'ḡ' }, { ipa: 'd', roman: 'd' },
        { ipa: 'ð', roman: 'ḏ' }, { ipa: 'h', roman: 'h' }, { ipa: 'w', roman: 'w' },
        { ipa: 'z', roman: 'z' }, { ipa: 'ħ', roman: 'ḥ' }, { ipa: 'tˤ', roman: 'ṭ' },
        { ipa: 'j', roman: 'y' }, { ipa: 'k', roman: 'k' }, { ipa: 'x', roman: 'ḵ' },
        { ipa: 'l', roman: 'l' }, { ipa: 'm', roman: 'm' }, { ipa: 'n', roman: 'n' },
        { ipa: 's', roman: 's' }, { ipa: 'ʕ', roman: 'ʿ' }, { ipa: 'p', roman: 'p' },
        { ipa: 'f', roman: 'p̄' }, { ipa: 'sˤ', roman: 'ṣ' }, { ipa: 'q', roman: 'q' },
        { ipa: 'r', roman: 'r' }, { ipa: 'ʃ', roman: 'š' }, { ipa: 'ś', roman: 'ś' },
        { ipa: 't', roman: 't' }, { ipa: 'θ', roman: 'ṯ' },
      ],
      vowels: [
        { ipa: 'a', roman: 'a' }, { ipa: 'aː', roman: 'ā' },
        { ipa: 'e', roman: 'e' }, { ipa: 'eː', roman: 'ē' },
        { ipa: 'i', roman: 'i' }, { ipa: 'iː', roman: 'ī' },
        { ipa: 'o', roman: 'o' }, { ipa: 'oː', roman: 'ō' },
        { ipa: 'u', roman: 'u' }, { ipa: 'uː', roman: 'ū' },
      ],
      triconsonantal: true,
    },

    morphology: {
      type: 'fusional',
      wordOrder: 'VSO',
      alignment: 'nominative-accusative',
      rootSystem: 'triconsonantal',
      binyanim: 7,  // Verb patterns
      genders: ['masculine', 'feminine'],
      numbers: ['singular', 'dual', 'plural'],
      construct: true,  // Construct state for possession
    },

    sampleRoots: ['ktb', 'šmr', 'mlk', 'dbr', 'hlk', 'ʿbd', 'qds'],
    soundPatterns: ['CaCC', 'CoCeC', 'CāCēC'],
  },
};

// Sound change rules for mutation
export const SOUND_CHANGES = {
  grimmsLaw: {
    name: "Grimm's Law",
    description: 'PIE to Proto-Germanic consonant shift',
    changes: [
      { from: 'p', to: 'f' }, { from: 't', to: 'θ' }, { from: 'k', to: 'x' },
      { from: 'b', to: 'p' }, { from: 'd', to: 't' }, { from: 'g', to: 'k' },
      { from: 'bʰ', to: 'b' }, { from: 'dʰ', to: 'd' }, { from: 'gʰ', to: 'g' },
    ],
  },

  highGermanShift: {
    name: 'High German Consonant Shift',
    description: 'Proto-Germanic to Old High German',
    changes: [
      { from: 'p', to: 'pf', context: 'initial' },
      { from: 'p', to: 'ff', context: 'medial' },
      { from: 't', to: 'ts', context: 'initial' },
      { from: 't', to: 'ss', context: 'medial' },
      { from: 'k', to: 'kx', context: 'initial' },
    ],
  },

  greatVowelShift: {
    name: 'Great Vowel Shift',
    description: 'Middle English to Early Modern English vowel changes',
    changes: [
      { from: 'iː', to: 'aɪ' }, { from: 'eː', to: 'iː' },
      { from: 'ɛː', to: 'eː' }, { from: 'aː', to: 'eɪ' },
      { from: 'uː', to: 'aʊ' }, { from: 'oː', to: 'uː' },
      { from: 'ɔː', to: 'oː' },
    ],
  },

  latinToRomance: {
    name: 'Latin to Romance',
    description: 'Vulgar Latin sound changes',
    changes: [
      { from: 'k', to: 'tʃ', context: 'before-front' },  // centum > cento
      { from: 'g', to: 'dʒ', context: 'before-front' },
      { from: 'kt', to: 'jt' },  // factum > fatto
      { from: 'kl', to: 'kj' },  // clave > chiave
      { from: 'pl', to: 'pj' },
    ],
  },

  lenition: {
    name: 'Lenition',
    description: 'Weakening of intervocalic consonants',
    changes: [
      { from: 'p', to: 'b', context: 'intervocalic' },
      { from: 'b', to: 'v', context: 'intervocalic' },
      { from: 't', to: 'd', context: 'intervocalic' },
      { from: 'd', to: 'ð', context: 'intervocalic' },
      { from: 'k', to: 'g', context: 'intervocalic' },
      { from: 'g', to: 'ɣ', context: 'intervocalic' },
    ],
  },

  palatalization: {
    name: 'Palatalization',
    description: 'Velars become palatals before front vowels',
    changes: [
      { from: 'k', to: 'tʃ', context: 'before-front' },
      { from: 'g', to: 'dʒ', context: 'before-front' },
      { from: 'sk', to: 'ʃ', context: 'before-front' },
    ],
  },

  nasalization: {
    name: 'Nasal Vowels',
    description: 'Vowels become nasal before lost nasals',
    changes: [
      { from: 'an', to: 'ã', context: 'before-consonant' },
      { from: 'en', to: 'ẽ', context: 'before-consonant' },
      { from: 'in', to: 'ĩ', context: 'before-consonant' },
      { from: 'on', to: 'õ', context: 'before-consonant' },
    ],
  },

  caseCollapse: {
    name: 'Case Collapse',
    description: 'Reduction of case distinctions',
    morphological: true,
    changes: [
      { merge: ['nominative', 'vocative'] },
      { merge: ['accusative', 'ablative'] },
      { lose: ['locative'] },
    ],
  },

  analyticDrift: {
    name: 'Analytic Drift',
    description: 'From synthetic to analytic structure',
    morphological: true,
    changes: [
      { type: 'case-to-preposition' },
      { type: 'auxiliary-verbs' },
      { type: 'article-development' },
    ],
  },
};

// Revival modes
export const REVIVAL_MODES = {
  authentic: {
    name: 'Authentic',
    description: 'Stay close to attested historical forms',
    mutationLevel: 0,
    innovationLevel: 0.1,
  },

  neo: {
    name: 'Neo-Revival',
    description: 'Modern adaptation (like Modern Hebrew or Cornish revival)',
    mutationLevel: 0.3,
    innovationLevel: 0.5,
    adaptations: ['modern-vocabulary', 'simplified-morphology', 'regular-conjugation'],
  },

  mutated: {
    name: 'Mutated',
    description: 'Apply systematic sound changes as if the language evolved',
    mutationLevel: 0.7,
    innovationLevel: 0.3,
  },

  hybrid: {
    name: 'Hybrid',
    description: 'Cross with another language family for new features',
    mutationLevel: 0.5,
    innovationLevel: 0.6,
  },

  speculative: {
    name: 'Speculative',
    description: 'What if it never died? Project into alternate history',
    mutationLevel: 0.8,
    innovationLevel: 0.8,
    projections: ['contact-influence', 'internal-innovation', 'substrate-effects'],
  },
};

export class DeadLanguageReviver {
  constructor(random, config = {}) {
    this.random = random;
    this.config = {
      baseLanguage: config.baseLanguage || 'latin',
      revivalMode: config.revivalMode || 'mutated',
      mutationIntensity: config.mutationIntensity ?? 0.5,
      soundChanges: config.soundChanges || [],
      hybridWith: config.hybridWith || null,
      ...config,
    };

    this.base = DEAD_LANGUAGES[this.config.baseLanguage];
    this.mode = REVIVAL_MODES[this.config.revivalMode];
  }

  /**
   * Generate a revived/mutated language based on the historical template
   */
  revive() {
    if (!this.base) {
      throw new Error(`Unknown base language: ${this.config.baseLanguage}`);
    }

    const revival = {
      ancestor: this.base.name,
      ancestorCode: this.base.code,
      revivalMode: this.mode.name,
      description: this._generateDescription(),
    };

    // Generate phonology based on ancestor
    revival.phonology = this._revivePhonology();

    // Generate morphology based on ancestor
    revival.morphology = this._reviveMorphology();

    // Generate sample vocabulary
    revival.vocabulary = this._reviveVocabulary();

    // Add revival-specific metadata
    revival.revivalNotes = this._generateRevivalNotes();

    return revival;
  }

  /**
   * Apply revival/mutation to phonology
   */
  _revivePhonology() {
    let consonants = [...this.base.phonology.consonants];
    let vowels = [...this.base.phonology.vowels];

    const intensity = this.config.mutationIntensity * this.mode.mutationLevel;

    // Apply sound changes based on mode
    if (intensity > 0) {
      // Determine which sound changes to apply
      const changes = this._selectSoundChanges(intensity);

      for (const change of changes) {
        consonants = this._applyConsonantChange(consonants, change);
        vowels = this._applyVowelChange(vowels, change);
      }
    }

    // Innovation: possibly add or remove phonemes
    if (this.random.bool(this.mode.innovationLevel * 0.5)) {
      // Add new phoneme
      const newPhonemes = this._innovatePhonemes();
      consonants = [...consonants, ...newPhonemes];
    }

    // Merge similar phonemes with probability
    if (this.random.bool(intensity * 0.3)) {
      vowels = this._mergeVowels(vowels);
    }

    return {
      consonants,
      vowels,
      diphthongs: this._evolveDiphthongs(),
      notes: this._describePhonologyChanges(),
    };
  }

  /**
   * Apply revival/mutation to morphology
   */
  _reviveMorphology() {
    const baseMorph = this.base.morphology;
    const intensity = this.config.mutationIntensity * this.mode.mutationLevel;

    let cases = [...(baseMorph.cases || [])];
    let wordOrder = baseMorph.wordOrder;
    let type = baseMorph.type;

    // Case collapse with intensity
    if (intensity > 0.3 && cases.length > 3) {
      const collapseCount = Math.floor(intensity * cases.length * 0.5);
      cases = cases.slice(0, cases.length - collapseCount);
    }

    // Word order drift
    if (this.random.bool(intensity * 0.4)) {
      wordOrder = this._shiftWordOrder(wordOrder);
    }

    // Type drift (synthetic -> analytic)
    if (intensity > 0.6 && type === 'fusional') {
      type = this.random.pick(['fusional', 'agglutinative']);
    }

    // Neo-revival simplifications
    if (this.config.revivalMode === 'neo') {
      // Regularize paradigms
      cases = this._simplifyCases(cases);
    }

    return {
      type,
      wordOrder,
      cases,
      alignment: baseMorph.alignment,
      genders: this._evolveGenders(baseMorph.genders, intensity),
      numbers: baseMorph.numbers,
      tenses: this._evolveTenses(baseMorph.tenses, intensity),
      notes: this._describeMorphologyChanges(),
    };
  }

  /**
   * Generate evolved vocabulary roots
   */
  _reviveVocabulary() {
    const roots = this.base.sampleRoots || [];
    const evolved = [];
    const intensity = this.config.mutationIntensity * this.mode.mutationLevel;

    for (const root of roots) {
      let evolvedRoot = root;

      // Apply sound changes to root
      if (this.random.bool(intensity)) {
        evolvedRoot = this._evolveRoot(root);
      }

      evolved.push({
        ancestor: root,
        evolved: evolvedRoot,
        changed: root !== evolvedRoot,
      });
    }

    return evolved;
  }

  /**
   * Select appropriate sound changes based on intensity
   */
  _selectSoundChanges(intensity) {
    const changes = [];
    const available = Object.values(SOUND_CHANGES);

    // Number of changes proportional to intensity
    const numChanges = Math.ceil(intensity * 3);

    for (let i = 0; i < numChanges; i++) {
      const change = this.random.pick(available);
      if (!changes.includes(change)) {
        changes.push(change);
      }
    }

    return changes;
  }

  /**
   * Apply consonant sound change
   */
  _applyConsonantChange(consonants, changeSet) {
    if (!changeSet.changes) return consonants;

    return consonants.map(c => {
      for (const change of changeSet.changes) {
        if (c.ipa === change.from && this.random.bool(0.7)) {
          return { ...c, ipa: change.to, roman: this._romanize(change.to) };
        }
      }
      return c;
    });
  }

  /**
   * Apply vowel sound change
   */
  _applyVowelChange(vowels, changeSet) {
    if (!changeSet.changes) return vowels;

    return vowels.map(v => {
      for (const change of changeSet.changes) {
        if (v.ipa === change.from && this.random.bool(0.7)) {
          return { ...v, ipa: change.to, roman: this._romanize(change.to) };
        }
      }
      return v;
    });
  }

  /**
   * Merge similar vowels (common in language death/revival)
   */
  _mergeVowels(vowels) {
    const merged = [];
    const toMerge = new Set();

    // Merge long/short distinctions with some probability
    for (const v of vowels) {
      if (toMerge.has(v.ipa)) continue;

      // Find potential merge partner (long/short pair)
      const partner = vowels.find(other =>
        other !== v &&
        (other.ipa === v.ipa + 'ː' || v.ipa === other.ipa + 'ː')
      );

      if (partner && this.random.bool(0.5)) {
        // Merge to short form
        const base = v.ipa.replace('ː', '');
        merged.push({ ipa: base, roman: this._romanize(base) });
        toMerge.add(v.ipa);
        toMerge.add(partner.ipa);
      } else if (!toMerge.has(v.ipa)) {
        merged.push(v);
      }
    }

    return merged;
  }

  /**
   * Innovate new phonemes (contact/internal)
   */
  _innovatePhonemes() {
    const innovations = [
      { ipa: 'ʒ', roman: 'zh' },
      { ipa: 'tʃ', roman: 'ch' },
      { ipa: 'dʒ', roman: 'j' },
      { ipa: 'ʃ', roman: 'sh' },
      { ipa: 'ŋ', roman: 'ng' },
    ];

    const count = this.random.int(0, 2);
    return this.random.shuffle(innovations).slice(0, count);
  }

  /**
   * Evolve diphthongs
   */
  _evolveDiphthongs() {
    const base = this.base.phonology.diphthongs || [];
    const evolved = [];
    const intensity = this.config.mutationIntensity;

    for (const diph of base) {
      if (this.random.bool(1 - intensity * 0.3)) {
        evolved.push(diph);
      } else {
        // Monophthongize
        evolved.push(diph[0] + diph[0]);  // e.g., 'ae' -> 'aa' -> 'a'
      }
    }

    return evolved;
  }

  /**
   * Shift word order
   */
  _shiftWordOrder(original) {
    const orders = ['SOV', 'SVO', 'VSO', 'VOS', 'OVS', 'OSV'];
    const idx = orders.indexOf(original);
    if (idx === -1) return original;

    // Shift to adjacent order type
    const shift = this.random.int(-1, 1);
    const newIdx = Math.max(0, Math.min(orders.length - 1, idx + shift));
    return orders[newIdx];
  }

  /**
   * Simplify cases for neo-revival
   */
  _simplifyCases(cases) {
    // Keep only most essential cases
    const essential = ['Nominative', 'Accusative', 'Genitive'];
    return cases.filter(c => essential.includes(c.name) || this.random.bool(0.3));
  }

  /**
   * Evolve gender system
   */
  _evolveGenders(genders, intensity) {
    if (!genders) return ['common'];

    // Masculine/feminine merger is common
    if (intensity > 0.5 && genders.length > 2 && this.random.bool(0.4)) {
      return ['common', 'neuter'];
    }

    // Complete loss of gender
    if (intensity > 0.8 && this.random.bool(0.3)) {
      return [];
    }

    return genders;
  }

  /**
   * Evolve tense system
   */
  _evolveTenses(tenses, intensity) {
    if (!tenses) return ['past', 'present', 'future'];

    // Analytic drift: periphrastic futures
    if (intensity > 0.4) {
      return tenses.filter(t => t !== 'future-perfect' && this.random.bool(0.8));
    }

    return tenses;
  }

  /**
   * Evolve a single root
   */
  _evolveRoot(root) {
    let evolved = root;
    const intensity = this.config.mutationIntensity;

    // Simple sound changes
    if (this.random.bool(intensity * 0.5)) {
      // Lenition
      evolved = evolved.replace(/p(?=[aeiou])/g, 'b');
      evolved = evolved.replace(/t(?=[aeiou])/g, 'd');
    }

    if (this.random.bool(intensity * 0.3)) {
      // Final vowel loss
      evolved = evolved.replace(/[aeiou]$/, '');
    }

    return evolved || root;
  }

  /**
   * Generate description of the revived language
   */
  _generateDescription() {
    const base = this.base.name;
    const mode = this.mode.name;

    switch (this.config.revivalMode) {
      case 'authentic':
        return `A faithful reconstruction of ${base}, maintaining historical accuracy.`;
      case 'neo':
        return `A modernized revival of ${base}, adapted for contemporary use like Modern Hebrew.`;
      case 'mutated':
        return `An evolved descendant of ${base}, as if it had continued developing naturally.`;
      case 'hybrid':
        const hybrid = this.config.hybridWith || 'another language';
        return `A hybrid language combining ${base} with features from ${hybrid}.`;
      case 'speculative':
        return `A speculative continuation of ${base}, imagining its development in an alternate timeline.`;
      default:
        return `A language based on ${base}.`;
    }
  }

  /**
   * Describe phonology changes
   */
  _describePhonologyChanges() {
    const changes = [];
    const intensity = this.config.mutationIntensity;

    if (intensity > 0.3) changes.push('Some sound mergers have occurred');
    if (intensity > 0.5) changes.push('Significant consonant shifts');
    if (intensity > 0.7) changes.push('Vowel system simplified');

    return changes.length > 0 ? changes : ['Phonology largely preserved'];
  }

  /**
   * Describe morphology changes
   */
  _describeMorphologyChanges() {
    const changes = [];
    const intensity = this.config.mutationIntensity;

    if (intensity > 0.3) changes.push('Some case distinctions lost');
    if (intensity > 0.5) changes.push('Drift toward analytic structure');
    if (intensity > 0.7) changes.push('Significant grammatical simplification');

    return changes.length > 0 ? changes : ['Morphology largely preserved'];
  }

  /**
   * Generate notes about the revival
   */
  _generateRevivalNotes() {
    return {
      mode: this.mode.name,
      intensity: this.config.mutationIntensity,
      description: this.mode.description,
      soundChangesApplied: this.config.soundChanges.length > 0
        ? this.config.soundChanges
        : 'Automatic based on intensity',
    };
  }

  /**
   * Romanize IPA
   */
  _romanize(ipa) {
    const map = {
      'θ': 'th', 'ð': 'dh', 'ʃ': 'sh', 'ʒ': 'zh',
      'tʃ': 'ch', 'dʒ': 'j', 'ŋ': 'ng', 'ɲ': 'ny',
      'x': 'kh', 'ɣ': 'gh', 'ʔ': "'",
    };
    return map[ipa] || ipa;
  }

  /**
   * List available dead languages
   */
  static listLanguages() {
    return Object.entries(DEAD_LANGUAGES).map(([key, lang]) => ({
      key,
      name: lang.name,
      code: lang.code,
      family: lang.family,
      era: lang.era,
    }));
  }

  /**
   * List available revival modes
   */
  static listModes() {
    return Object.entries(REVIVAL_MODES).map(([key, mode]) => ({
      key,
      name: mode.name,
      description: mode.description,
    }));
  }

  /**
   * Generate Stone documentation
   */
  generateStoneSection(revival) {
    return `## Dead Language Revival

**Ancestor:** ${revival.ancestor} (${revival.ancestorCode})
**Revival Mode:** ${revival.revivalMode}
**Description:** ${revival.description}

### Phonological Evolution

${revival.revivalNotes ? revival.phonology.notes.join('\n') : 'Standard revival'}

### Morphological Changes

${revival.morphology.notes.join('\n')}

### Historical Context

This language is ${this.mode.name.toLowerCase()} from ${this.base.name},
which was spoken ${this.base.era}. ${this.base.description}

Family: ${this.base.family}

`;
  }
}

export default DeadLanguageReviver;
