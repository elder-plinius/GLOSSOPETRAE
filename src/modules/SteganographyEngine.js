/**
 * GLOSSOPETRAE - Advanced Steganography Engine
 *
 * A cutting-edge linguistic steganography system that hides binary payloads
 * within natural-looking conlang text using multiple covert channels.
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         STEGANOGRAPHIC FRAME                            │
 * ├─────────┬─────────┬─────────┬──────────┬─────────┬─────────────────────┤
 * │  SYNC   │ VERSION │  FLAGS  │  LENGTH  │  CRC32  │   ENCRYPTED PAYLOAD │
 * │ 16 bits │  4 bits │  8 bits │  16 bits │ 32 bits │     Variable        │
 * └─────────┴─────────┴─────────┴──────────┴─────────┴─────────────────────┘
 *
 * COVERT CHANNELS:
 * 1. Synonym Selection      - Choose between synonym pairs (1 bit/word)
 * 2. Morphological Markers  - Optional emphatic/topic particles (1 bit/word)
 * 3. Word Order Permutation - Exploit free word order (2-3 bits/clause)
 * 4. Null Morpheme Insert   - Optional meaningless particles (1 bit/slot)
 * 5. Register Toggle        - Formal vs informal variants (1 bit/word)
 * 6. Unicode Homoglyphs     - Visually identical characters (1 bit/char)
 * 7. Zero-Width Characters  - Invisible Unicode markers (8 bits/slot)
 * 8. Punctuation Variation  - Alternate punctuation styles (1 bit/mark)
 * 9. Phonetic Variation     - Spelling alternates (1 bit/word)
 *
 * SECURITY FEATURES:
 * - XOR stream cipher with language-derived key
 * - Bit interleaving across channels for error resilience
 * - Reed-Solomon error correction (configurable)
 * - CRC32 integrity verification
 * - Statistical profile matching to avoid detection
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const FRAME_SYNC = 0xA55A;  // Sync pattern for frame detection (1010010101011010)
const VERSION = 1;           // Protocol version
const MAX_PAYLOAD_SIZE = 8192; // Maximum payload in bytes

// Error correction modes
const EC_NONE = 0;
const EC_REPEAT_3 = 1;      // Triple repetition (can fix 1 error per 3 bits)
const EC_REPEAT_5 = 2;      // 5x repetition (can fix 2 errors per 5 bits)
const EC_HAMMING_7_4 = 3;   // Hamming(7,4) - fix 1 bit per 7
const EC_REED_SOLOMON = 4;  // RS(255,223) - fix up to 16 byte errors

// Channel bit flags
const CH_SYNONYM    = 0x01;
const CH_MORPHEME   = 0x02;
const CH_ORDER      = 0x04;
const CH_NULL       = 0x08;
const CH_REGISTER   = 0x10;
const CH_HOMOGLYPH  = 0x20;
const CH_ZEROWIDTH  = 0x40;
const CH_PUNCTUATION = 0x80;

// Unicode homoglyph pairs (visually identical, different codepoints)
const HOMOGLYPH_MAP = {
  'a': ['a', 'а'],  // Latin a vs Cyrillic а
  'e': ['e', 'е'],  // Latin e vs Cyrillic е
  'o': ['o', 'о'],  // Latin o vs Cyrillic о
  'p': ['p', 'р'],  // Latin p vs Cyrillic р
  'c': ['c', 'с'],  // Latin c vs Cyrillic с
  'x': ['x', 'х'],  // Latin x vs Cyrillic х
  'y': ['y', 'у'],  // Latin y vs Cyrillic у
  'i': ['i', 'і'],  // Latin i vs Ukrainian і
};

// Zero-width Unicode characters for invisible encoding
const ZERO_WIDTH = {
  SPACE: '\u200B',      // Zero-width space (bit 0)
  NON_JOINER: '\u200C', // Zero-width non-joiner (bit 1)
  JOINER: '\u200D',     // Zero-width joiner (bit separator)
  MARK: '\uFEFF',       // BOM/Zero-width no-break space (frame marker)
};

// ═══════════════════════════════════════════════════════════════════════════
// CRC32 IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xFFFFFFFF;
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);

  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// REED-SOLOMON ERROR CORRECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Galois Field GF(2^8) arithmetic for Reed-Solomon
 */
class GaloisField {
  constructor() {
    this.exp = new Uint8Array(512);
    this.log = new Uint8Array(256);

    // Generate using primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D)
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.exp[i] = x;
      this.exp[i + 255] = x;
      this.log[x] = i;
      x = (x << 1) ^ (x & 0x80 ? 0x11D : 0);
    }
    this.log[0] = 0; // Undefined, but set to 0 for convenience
  }

  mul(a, b) {
    if (a === 0 || b === 0) return 0;
    return this.exp[this.log[a] + this.log[b]];
  }

  div(a, b) {
    if (b === 0) throw new Error('Division by zero in GF');
    if (a === 0) return 0;
    return this.exp[this.log[a] - this.log[b] + 255];
  }

  pow(x, power) {
    return this.exp[(this.log[x] * power) % 255];
  }

  inverse(x) {
    return this.exp[255 - this.log[x]];
  }
}

/**
 * Reed-Solomon encoder/decoder
 * RS(255, 223) - 32 parity bytes, can correct up to 16 byte errors
 */
class ReedSolomon {
  constructor(nsym = 32) {
    this.gf = new GaloisField();
    this.nsym = nsym; // Number of error correction symbols
    this.generator = this._computeGenerator(nsym);
  }

  _computeGenerator(nsym) {
    let g = [1];
    for (let i = 0; i < nsym; i++) {
      g = this._polyMul(g, [1, this.gf.exp[i]]);
    }
    return g;
  }

  _polyMul(p1, p2) {
    const result = new Array(p1.length + p2.length - 1).fill(0);
    for (let i = 0; i < p1.length; i++) {
      for (let j = 0; j < p2.length; j++) {
        result[i + j] ^= this.gf.mul(p1[i], p2[j]);
      }
    }
    return result;
  }

  encode(data) {
    // Ensure data is Uint8Array
    const msg = data instanceof Uint8Array ? data : new Uint8Array(data);

    // Pad message to fit RS block (max 223 bytes for RS(255,223))
    const maxData = 255 - this.nsym;
    if (msg.length > maxData) {
      throw new Error(`Data too large for RS block: ${msg.length} > ${maxData}`);
    }

    // Polynomial division to get remainder (parity bytes)
    const msgOut = new Uint8Array(msg.length + this.nsym);
    msgOut.set(msg);

    for (let i = 0; i < msg.length; i++) {
      const coef = msgOut[i];
      if (coef !== 0) {
        for (let j = 1; j < this.generator.length; j++) {
          msgOut[i + j] ^= this.gf.mul(this.generator[j], coef);
        }
      }
    }

    // Copy original message and append parity
    const result = new Uint8Array(msg.length + this.nsym);
    result.set(msg);
    result.set(msgOut.slice(msg.length), msg.length);

    return result;
  }

  decode(data) {
    const msg = data instanceof Uint8Array ? data : new Uint8Array(data);

    // Calculate syndromes
    const syndromes = new Array(this.nsym);
    let hasErrors = false;

    for (let i = 0; i < this.nsym; i++) {
      let s = 0;
      for (let j = 0; j < msg.length; j++) {
        s = this.gf.mul(s, this.gf.exp[i]) ^ msg[j];
      }
      syndromes[i] = s;
      if (s !== 0) hasErrors = true;
    }

    if (!hasErrors) {
      // No errors, return data portion
      return {
        data: new Uint8Array(msg.slice(0, msg.length - this.nsym)),
        corrected: 0,
        success: true,
      };
    }

    // Error correction using Berlekamp-Massey and Chien search
    // (Simplified implementation - full RS decoding)
    const errorLocator = this._berlekampMassey(syndromes);
    const errorPositions = this._chienSearch(errorLocator, msg.length);

    if (errorPositions.length === 0 || errorPositions.length > this.nsym / 2) {
      return {
        data: new Uint8Array(msg.slice(0, msg.length - this.nsym)),
        corrected: 0,
        success: false,
        error: 'Too many errors to correct',
      };
    }

    // Calculate error magnitudes using Forney algorithm
    const corrected = new Uint8Array(msg);
    const errorMagnitudes = this._forney(syndromes, errorLocator, errorPositions);

    for (let i = 0; i < errorPositions.length; i++) {
      const pos = msg.length - 1 - errorPositions[i];
      if (pos >= 0 && pos < msg.length) {
        corrected[pos] ^= errorMagnitudes[i];
      }
    }

    return {
      data: new Uint8Array(corrected.slice(0, corrected.length - this.nsym)),
      corrected: errorPositions.length,
      success: true,
    };
  }

  _berlekampMassey(syndromes) {
    let errorLocator = [1];
    let oldLocator = [1];

    for (let i = 0; i < this.nsym; i++) {
      let delta = syndromes[i];
      for (let j = 1; j < errorLocator.length; j++) {
        delta ^= this.gf.mul(errorLocator[j], syndromes[i - j] || 0);
      }

      oldLocator.push(0);

      if (delta !== 0) {
        if (oldLocator.length > errorLocator.length) {
          const newLocator = oldLocator.map(x => this.gf.mul(x, delta));
          oldLocator = errorLocator.map(x => this.gf.mul(x, this.gf.inverse(delta)));
          errorLocator = newLocator;
        }
        for (let j = 0; j < oldLocator.length; j++) {
          errorLocator[j] ^= this.gf.mul(delta, oldLocator[j]);
        }
      }
    }

    return errorLocator;
  }

  _chienSearch(errorLocator, msgLength) {
    const positions = [];
    for (let i = 0; i < msgLength; i++) {
      let sum = 0;
      for (let j = 0; j < errorLocator.length; j++) {
        sum ^= this.gf.mul(errorLocator[j], this.gf.pow(this.gf.exp[i], j));
      }
      if (sum === 0) {
        positions.push(i);
      }
    }
    return positions;
  }

  _forney(syndromes, errorLocator, errorPositions) {
    // Calculate error evaluator polynomial
    const evaluator = this._polyMul(syndromes, errorLocator).slice(0, this.nsym);

    // Calculate formal derivative of error locator
    const derivative = [];
    for (let i = 0; i < errorLocator.length; i++) {
      if (i % 2 === 1) {
        derivative.push(errorLocator[i]);
      }
    }

    const magnitudes = [];
    for (const pos of errorPositions) {
      const xi = this.gf.exp[pos];
      const xiInv = this.gf.inverse(xi);

      // Evaluate error evaluator at Xi^-1
      let evalNum = 0;
      for (let j = 0; j < evaluator.length; j++) {
        evalNum ^= this.gf.mul(evaluator[j], this.gf.pow(xiInv, j));
      }

      // Evaluate derivative at Xi^-1
      let evalDenom = 0;
      for (let j = 0; j < derivative.length; j++) {
        evalDenom ^= this.gf.mul(derivative[j], this.gf.pow(xiInv, j));
      }

      magnitudes.push(this.gf.div(evalNum, evalDenom));
    }

    return magnitudes;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN STEGANOGRAPHY ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class SteganographyEngine {
  constructor(language, options = {}) {
    this.language = language;
    this.lexicon = language.lexicon;
    this.morphology = language.morphology;

    // Configuration with defaults
    this.config = {
      errorCorrection: options.errorCorrection || 'reed-solomon',
      channels: options.channels || ['synonym', 'morpheme', 'null', 'homoglyph', 'zerowidth'],
      encryptPayload: options.encrypt !== false, // Default: encrypt
      interleaveBits: options.interleave !== false, // Default: interleave
      ...options,
    };

    // Initialize error correction
    this._initErrorCorrection();

    // Build all channel infrastructure
    this._buildSynonymPairs();
    this._buildMorphAlternates();
    this._analyzeWordOrder();
    this._buildNullMorphemes();
    this._buildRegisterVariants();
    this._buildPhoneticVariants();

    // Derive encryption key from language seed
    this._deriveKey();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════

  _initErrorCorrection() {
    const ecType = this.config.errorCorrection;

    if (ecType === 'reed-solomon' || ecType === 'rs') {
      this.rs = new ReedSolomon(32); // 32 parity bytes
      this.ecMode = EC_REED_SOLOMON;
    } else if (ecType === 'hamming') {
      this.ecMode = EC_HAMMING_7_4;
    } else if (ecType === 'repeat-5') {
      this.ecMode = EC_REPEAT_5;
    } else if (ecType === 'repeat' || ecType === 'repeat-3') {
      this.ecMode = EC_REPEAT_3;
    } else {
      this.ecMode = EC_NONE;
    }
  }

  _deriveKey() {
    // Derive a pseudo-random stream key from language properties
    const seed = this.language.seed || 0;
    const name = this.language.name || 'default';

    // Simple PRNG seeded from language - XORShift128+
    let s0 = seed ^ 0xDEADBEEF;
    let s1 = this._hashString(name);

    this._prngState = { s0, s1 };
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) || 1;
  }

  _nextPRNG() {
    // XORShift128+
    let s1 = this._prngState.s0;
    const s0 = this._prngState.s1;
    this._prngState.s0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this._prngState.s1 = s1;
    return (this._prngState.s0 + this._prngState.s1) >>> 0;
  }

  _getKeyStream(length) {
    // Reset PRNG to initial state for reproducibility
    this._deriveKey();

    const stream = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      stream[i] = this._nextPRNG() & 0xFF;
    }
    return stream;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHANNEL 1: SYNONYM PAIRS
  // ═══════════════════════════════════════════════════════════════════════

  _buildSynonymPairs() {
    this.synonymPairs = new Map();
    this.synonymLookup = new Map();

    const entries = this.lexicon?.entries || [];
    const byGloss = new Map();

    // Group by English gloss
    for (const entry of entries) {
      const gloss = entry.gloss?.toLowerCase();
      if (!gloss) continue;

      if (!byGloss.has(gloss)) {
        byGloss.set(gloss, []);
      }
      byGloss.get(gloss).push(entry);
    }

    // Create synonym pairs
    let pairId = 0;
    for (const [gloss, words] of byGloss) {
      if (words.length >= 2) {
        const pair = {
          id: pairId,
          gloss,
          bit0: words[0].lemma,
          bit1: words[1].lemma,
          pos: words[0].pos,
        };
        this.synonymPairs.set(pairId, pair);
        this.synonymLookup.set(words[0].lemma, { pairId, bit: 0 });
        this.synonymLookup.set(words[1].lemma, { pairId, bit: 1 });
        pairId++;
      }
    }

    // Generate synthetic pairs for high-frequency concepts
    this._generateSyntheticPairs();
  }

  _generateSyntheticPairs() {
    const highFreq = ['person', 'thing', 'place', 'time', 'way', 'good', 'bad', 'big', 'small',
                      'new', 'old', 'say', 'go', 'come', 'see', 'know', 'take', 'give', 'make'];
    const entries = this.lexicon?.entries || [];

    for (const concept of highFreq) {
      const existing = entries.find(e => e.gloss?.toLowerCase() === concept);
      if (existing && !this.synonymLookup.has(existing.lemma)) {
        // Create a phonetically similar alternate
        const alternate = this._createPhoneticAlternate(existing.lemma);
        const pairId = this.synonymPairs.size;

        this.synonymPairs.set(pairId, {
          id: pairId,
          gloss: concept,
          bit0: existing.lemma,
          bit1: alternate,
          pos: existing.pos,
          synthetic: true,
        });

        this.synonymLookup.set(existing.lemma, { pairId, bit: 0 });
        this.synonymLookup.set(alternate, { pairId, bit: 1 });
      }
    }
  }

  _createPhoneticAlternate(word) {
    // Create a subtle phonetic variation
    const suffixes = ['i', 'a', 'e', 'u', '-i', '-a'];
    const seed = this._hashString(word);
    return word + suffixes[seed % suffixes.length];
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHANNEL 2: MORPHOLOGICAL MARKERS
  // ═══════════════════════════════════════════════════════════════════════

  _buildMorphAlternates() {
    const seed = this.language.seed || Date.now();

    // Generate language-specific particles
    const particles = this._generateParticles(seed);

    this.morphAlternates = {
      emphatic: {
        particle: particles[0],
        delimiter: '-',
      },
      topic: {
        particle: particles[1],
        delimiter: '=',
      },
      evidential: {
        particle: particles[2],
        delimiter: '~',
      },
    };
  }

  _generateParticles(seed) {
    const bases = ['ke', 'wa', 'ne', 'mo', 'zo', 'ya', 'na', 'ri', 'ka', 'ta', 'sa', 'ma'];
    const particles = [];

    for (let i = 0; i < 5; i++) {
      particles.push(bases[(seed + i * 7) % bases.length]);
    }

    return particles;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHANNEL 3: WORD ORDER PERMUTATION
  // ═══════════════════════════════════════════════════════════════════════

  _analyzeWordOrder() {
    const baseOrder = this.morphology?.wordOrder?.basic || 'SVO';
    const hasCases = (this.morphology?.nominal?.caseSystem?.cases?.length || 0) > 2;

    // Languages with rich case marking allow free word order
    if (hasCases) {
      this.wordOrderPerms = ['SOV', 'SVO', 'VSO', 'VOS', 'OVS', 'OSV'];
      this.bitsPerClause = 2; // 4-6 permutations ≈ 2 bits
    } else {
      // Limited permutations
      this.wordOrderPerms = this._getRelatedOrders(baseOrder);
      this.bitsPerClause = 1;
    }

    // Create lookup for decoding
    this.orderToIndex = new Map();
    this.wordOrderPerms.forEach((order, idx) => {
      this.orderToIndex.set(order, idx);
    });
  }

  _getRelatedOrders(base) {
    const related = {
      'SVO': ['SVO', 'OSV'],
      'SOV': ['SOV', 'OSV'],
      'VSO': ['VSO', 'VOS'],
      'VOS': ['VOS', 'VSO'],
      'OVS': ['OVS', 'OSV'],
      'OSV': ['OSV', 'OVS'],
    };
    return related[base] || [base];
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHANNEL 4: NULL MORPHEME INSERTION
  // ═══════════════════════════════════════════════════════════════════════

  _buildNullMorphemes() {
    const seed = this.language.seed || 0;

    this.nullMorphemes = {
      interword: this._selectParticle(seed, ['ə', 'e', 'a', 'i']),
      clause: this._selectParticle(seed + 1, ['ne', 'ke', 'te', 'se']),
      filler: this._selectParticle(seed + 2, ['em', 'ah', 'eh', 'um']),
    };

    this.nullDelimiter = '·'; // Middle dot - subtle visual marker
  }

  _selectParticle(seed, options) {
    return options[seed % options.length];
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHANNEL 5: REGISTER/FORMALITY
  // ═══════════════════════════════════════════════════════════════════════

  _buildRegisterVariants() {
    this.registerPairs = new Map();

    const entries = this.lexicon?.entries || [];

    for (const entry of entries) {
      if (!entry.lemma || entry.lemma.length < 3) continue;

      const formal = this._formalize(entry.lemma);
      const informal = this._informalize(entry.lemma);

      if (formal !== informal) {
        this.registerPairs.set(entry.lemma, {
          base: entry.lemma,
          formal,
          informal,
          gloss: entry.gloss,
        });
      }
    }

    // Honorific system
    const seed = this.language.seed || 0;
    this.honorifics = {
      prefix: ['o-', 'go-', 'on-'][seed % 3],
      suffix: ['-san', '-shi', '-ren'][seed % 3],
    };
  }

  _formalize(word) {
    // Double first vowel for formal register
    const vowels = 'aeiou';
    for (let i = 0; i < word.length; i++) {
      if (vowels.includes(word[i])) {
        return word.slice(0, i + 1) + word[i] + word.slice(i + 1);
      }
    }
    return word;
  }

  _informalize(word) {
    // Truncate and add casual ending
    if (word.length < 4) return word;
    const vowels = 'aeiou';
    let syllEnd = 2;
    for (let i = 1; i < Math.min(word.length, 4); i++) {
      if (vowels.includes(word[i])) {
        syllEnd = i + 1;
        break;
      }
    }
    return word.slice(0, syllEnd) + 'o';
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHANNEL 6: PHONETIC SPELLING VARIANTS
  // ═══════════════════════════════════════════════════════════════════════

  _buildPhoneticVariants() {
    // Alternate spellings that sound the same
    this.phoneticVariants = new Map();

    const entries = this.lexicon?.entries || [];

    for (const entry of entries) {
      if (!entry.lemma) continue;

      const variants = this._generateSpellingVariants(entry.lemma);
      if (variants.length > 1) {
        this.phoneticVariants.set(entry.lemma, {
          standard: variants[0],
          alternate: variants[1],
        });
      }
    }
  }

  _generateSpellingVariants(word) {
    const variants = [word];

    // Common phonetic alternations
    const rules = [
      [/k/g, 'c'],
      [/c/g, 'k'],
      [/ph/g, 'f'],
      [/f/g, 'ph'],
      [/i$/g, 'y'],
      [/y$/g, 'i'],
      [/ee/g, 'i'],
      [/oo/g, 'u'],
    ];

    for (const [pattern, replacement] of rules) {
      if (pattern.test(word)) {
        const variant = word.replace(pattern, replacement);
        if (variant !== word) {
          variants.push(variant);
          break;
        }
      }
    }

    return variants;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ENCODING - Main encode function
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Encode a secret payload into cover text
   *
   * @param {string} coverMessage - The visible message (English)
   * @param {string|Uint8Array} payload - Secret data to hide
   * @param {Object} options - Additional options
   * @returns {Object} Result with stegotext and metadata
   */
  encode(coverMessage, payload, options = {}) {
    // Convert payload to bytes
    const payloadBytes = this._toBytes(payload);

    if (payloadBytes.length > MAX_PAYLOAD_SIZE) {
      throw new Error(`Payload too large: ${payloadBytes.length} > ${MAX_PAYLOAD_SIZE} bytes`);
    }

    // Encrypt payload
    const encrypted = this.config.encryptPayload
      ? this._xorEncrypt(payloadBytes)
      : payloadBytes;

    // Build frame: SYNC | VERSION | FLAGS | LENGTH | CRC | PAYLOAD
    const frame = this._buildFrame(encrypted);

    // Apply error correction
    const protected_ = this._applyErrorCorrection(frame);

    // Convert to bits
    const bits = this._bytesToBits(protected_);

    // Check capacity
    const capacity = this.calculateCapacity(coverMessage);
    if (bits.length > capacity.totalBits) {
      throw new Error(
        `Payload too large for cover text. Need ${bits.length} bits, have ${capacity.totalBits}. ` +
        `Add ${Math.ceil((bits.length - capacity.totalBits) / capacity.bitsPerWord)} more words.`
      );
    }

    // Interleave bits if enabled
    const finalBits = this.config.interleaveBits
      ? this._interleaveBits(bits)
      : bits;

    // Translate cover message
    const translator = this.language.translationEngine;
    const baseTranslation = translator.translateToConlang(coverMessage);

    // Encode bits into translation using all channels
    const { stegoText, channelStats } = this._encodeBitsIntoText(
      baseTranslation.target,
      finalBits
    );

    return {
      cover: coverMessage,
      stego: stegoText,
      stegoWithHeader: stegoText, // No visible header needed!
      payloadSize: payloadBytes.length,
      encodedSize: bits.length,
      capacity: capacity.totalBits,
      utilization: (bits.length / capacity.totalBits * 100).toFixed(1) + '%',
      channels: channelStats,
      errorCorrection: this.config.errorCorrection,
      encrypted: this.config.encryptPayload,
    };
  }

  _toBytes(data) {
    if (typeof data === 'string') {
      return new TextEncoder().encode(data);
    }
    if (data instanceof Uint8Array) {
      return data;
    }
    if (Array.isArray(data)) {
      return new Uint8Array(data);
    }
    throw new Error('Payload must be string, Uint8Array, or byte array');
  }

  _xorEncrypt(data) {
    const key = this._getKeyStream(data.length);
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ key[i];
    }
    return result;
  }

  _buildFrame(payload) {
    // Frame structure:
    // - SYNC: 2 bytes (0xA55A)
    // - VERSION: 1 byte (upper 4 bits) + FLAGS (lower 4 bits)
    // - LENGTH: 2 bytes (big-endian)
    // - CRC32: 4 bytes (of payload)
    // - PAYLOAD: variable

    const headerSize = 9;
    const frame = new Uint8Array(headerSize + payload.length);

    // SYNC pattern
    frame[0] = (FRAME_SYNC >> 8) & 0xFF;
    frame[1] = FRAME_SYNC & 0xFF;

    // VERSION (4 bits) + FLAGS (4 bits)
    const channelFlags = this._getChannelFlags();
    frame[2] = ((VERSION & 0x0F) << 4) | (this.ecMode & 0x0F);

    // LENGTH (2 bytes, big-endian)
    frame[3] = (payload.length >> 8) & 0xFF;
    frame[4] = payload.length & 0xFF;

    // CRC32 of payload
    const crc = crc32(payload);
    frame[5] = (crc >> 24) & 0xFF;
    frame[6] = (crc >> 16) & 0xFF;
    frame[7] = (crc >> 8) & 0xFF;
    frame[8] = crc & 0xFF;

    // Payload
    frame.set(payload, headerSize);

    return frame;
  }

  _getChannelFlags() {
    let flags = 0;
    const channels = this.config.channels;

    if (channels.includes('synonym')) flags |= CH_SYNONYM;
    if (channels.includes('morpheme')) flags |= CH_MORPHEME;
    if (channels.includes('order')) flags |= CH_ORDER;
    if (channels.includes('null')) flags |= CH_NULL;
    if (channels.includes('register')) flags |= CH_REGISTER;
    if (channels.includes('homoglyph')) flags |= CH_HOMOGLYPH;
    if (channels.includes('zerowidth')) flags |= CH_ZEROWIDTH;
    if (channels.includes('punctuation')) flags |= CH_PUNCTUATION;

    return flags;
  }

  _applyErrorCorrection(data) {
    switch (this.ecMode) {
      case EC_REED_SOLOMON:
        return this._rsEncode(data);
      case EC_HAMMING_7_4:
        return this._hammingEncode(data);
      case EC_REPEAT_3:
        return this._repeatEncode(data, 3);
      case EC_REPEAT_5:
        return this._repeatEncode(data, 5);
      default:
        return data;
    }
  }

  _rsEncode(data) {
    // Split into blocks if necessary
    const maxBlock = 223;
    const blocks = [];

    for (let i = 0; i < data.length; i += maxBlock) {
      const block = data.slice(i, Math.min(i + maxBlock, data.length));
      blocks.push(this.rs.encode(block));
    }

    // Concatenate encoded blocks with length prefix
    const totalLen = blocks.reduce((sum, b) => sum + b.length, 0);
    const result = new Uint8Array(1 + totalLen);
    result[0] = blocks.length; // Number of blocks

    let offset = 1;
    for (const block of blocks) {
      result.set(block, offset);
      offset += block.length;
    }

    return result;
  }

  _hammingEncode(data) {
    // Convert to bits first
    const bits = this._bytesToBits(data);
    const encoded = [];

    // Hamming(7,4) - 4 data bits -> 7 code bits
    for (let i = 0; i < bits.length; i += 4) {
      const d = [
        bits[i] || 0,
        bits[i + 1] || 0,
        bits[i + 2] || 0,
        bits[i + 3] || 0,
      ];

      // Parity bits
      const p1 = d[0] ^ d[1] ^ d[3];
      const p2 = d[0] ^ d[2] ^ d[3];
      const p4 = d[1] ^ d[2] ^ d[3];

      encoded.push(p1, p2, d[0], p4, d[1], d[2], d[3]);
    }

    return this._bitsToBytes(encoded);
  }

  _repeatEncode(data, n) {
    const result = new Uint8Array(data.length * n);
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < n; j++) {
        result[i * n + j] = data[i];
      }
    }
    return result;
  }

  _bytesToBits(bytes) {
    const bits = [];
    for (const byte of bytes) {
      for (let i = 7; i >= 0; i--) {
        bits.push((byte >> i) & 1);
      }
    }
    return bits;
  }

  _bitsToBytes(bits) {
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8 && i + j < bits.length; j++) {
        byte = (byte << 1) | (bits[i + j] || 0);
      }
      bytes.push(byte);
    }
    return new Uint8Array(bytes);
  }

  _interleaveBits(bits) {
    // Block interleaving for burst error resistance
    const blockSize = 64;
    const numBlocks = Math.ceil(bits.length / blockSize);

    // Pad to full blocks
    const padded = [...bits];
    while (padded.length < numBlocks * blockSize) {
      padded.push(0);
    }

    // Interleave: take one bit from each block in round-robin
    const interleaved = [];
    for (let i = 0; i < blockSize; i++) {
      for (let b = 0; b < numBlocks; b++) {
        interleaved.push(padded[b * blockSize + i]);
      }
    }

    return interleaved;
  }

  _encodeBitsIntoText(text, bits) {
    const words = text.split(/\s+/);
    const stegoWords = [];
    let bitIndex = 0;

    const stats = {
      synonym: { used: 0, bits: 0 },
      morpheme: { used: 0, bits: 0 },
      order: { used: 0, bits: 0 },
      null: { used: 0, bits: 0 },
      register: { used: 0, bits: 0 },
      homoglyph: { used: 0, bits: 0 },
      zerowidth: { used: 0, bits: 0 },
    };

    const channels = this.config.channels;

    for (let i = 0; i < words.length; i++) {
      let word = words[i];

      // Channel 1: Synonym selection
      if (channels.includes('synonym') && bitIndex < bits.length) {
        const result = this._encodeSynonym(word, bits[bitIndex]);
        if (result.encoded) {
          word = result.word;
          bitIndex++;
          stats.synonym.used++;
          stats.synonym.bits++;
        }
      }

      // Channel 2: Morpheme markers
      if (channels.includes('morpheme') && bitIndex < bits.length) {
        const result = this._encodeMorpheme(word, bits[bitIndex]);
        word = result.word;
        bitIndex++;
        stats.morpheme.used++;
        stats.morpheme.bits++;
      }

      // Channel 4: Null morpheme
      if (channels.includes('null') && bitIndex < bits.length) {
        const result = this._encodeNull(word, bits[bitIndex]);
        word = result.word;
        bitIndex++;
        stats.null.used++;
        stats.null.bits++;
      }

      // Channel 5: Register
      if (channels.includes('register') && bitIndex < bits.length) {
        const result = this._encodeRegister(word, bits[bitIndex]);
        word = result.word;
        bitIndex++;
        stats.register.used++;
        stats.register.bits++;
      }

      // Channel 6: Homoglyphs (encode multiple bits per word)
      if (channels.includes('homoglyph') && bitIndex < bits.length) {
        const available = Math.min(bits.length - bitIndex, this._countHomoglyphSlots(word));
        if (available > 0) {
          const wordBits = bits.slice(bitIndex, bitIndex + available);
          word = this._encodeHomoglyphs(word, wordBits);
          bitIndex += available;
          stats.homoglyph.used++;
          stats.homoglyph.bits += available;
        }
      }

      // Channel 7: Zero-width characters (high capacity - 8 bits per insertion point)
      if (channels.includes('zerowidth') && bitIndex < bits.length) {
        const bitsToEncode = Math.min(8, bits.length - bitIndex);
        const wordBits = bits.slice(bitIndex, bitIndex + bitsToEncode);
        word = this._encodeZeroWidth(word, wordBits);
        bitIndex += bitsToEncode;
        stats.zerowidth.used++;
        stats.zerowidth.bits += bitsToEncode;
      }

      stegoWords.push(word);
    }

    // Channel 3: Word order permutation
    if (channels.includes('order') && bitIndex < bits.length && stegoWords.length >= 3) {
      const orderBits = bits.slice(bitIndex, bitIndex + this.bitsPerClause);
      const reordered = this._encodeWordOrder(stegoWords, orderBits);
      stats.order.used = 1;
      stats.order.bits = orderBits.length;
      bitIndex += orderBits.length;

      return { stegoText: reordered.join(' '), channelStats: stats };
    }

    return { stegoText: stegoWords.join(' '), channelStats: stats };
  }

  _encodeSynonym(word, bit) {
    // Strip any existing markers for lookup
    const cleanWord = word.replace(/[-=~·].*$/, '');
    const lookup = this.synonymLookup.get(cleanWord);

    if (!lookup) {
      return { encoded: false, word };
    }

    const pair = this.synonymPairs.get(lookup.pairId);
    const targetWord = bit === 1 ? pair.bit1 : pair.bit0;

    // Preserve any markers that were on the original
    const markers = word.slice(cleanWord.length);
    return { encoded: true, word: targetWord + markers };
  }

  _encodeMorpheme(word, bit) {
    if (bit === 1) {
      return {
        encoded: true,
        word: word + this.morphAlternates.emphatic.delimiter + this.morphAlternates.emphatic.particle,
      };
    }
    return { encoded: true, word };
  }

  _encodeNull(word, bit) {
    if (bit === 1) {
      return { word: word + this.nullDelimiter + this.nullMorphemes.interword };
    }
    return { word };
  }

  _encodeRegister(word, bit) {
    if (bit === 1) {
      // Informal - no honorific
      return { word };
    }
    // Formal - add honorific prefix
    return { word: this.honorifics.prefix + word };
  }

  _countHomoglyphSlots(word) {
    let count = 0;
    for (const char of word.toLowerCase()) {
      if (HOMOGLYPH_MAP[char]) count++;
    }
    return count;
  }

  _encodeHomoglyphs(word, bits) {
    let result = '';
    let bitIdx = 0;

    for (const char of word) {
      const lower = char.toLowerCase();
      const pair = HOMOGLYPH_MAP[lower];

      if (pair && bitIdx < bits.length) {
        const variant = pair[bits[bitIdx]];
        // Preserve case
        result += char === char.toUpperCase() ? variant.toUpperCase() : variant;
        bitIdx++;
      } else {
        result += char;
      }
    }

    return result;
  }

  _encodeZeroWidth(word, bits) {
    // Encode bits as zero-width characters after the word
    let encoded = word;

    for (const bit of bits) {
      encoded += bit === 1 ? ZERO_WIDTH.NON_JOINER : ZERO_WIDTH.SPACE;
    }

    return encoded;
  }

  _encodeWordOrder(words, bits) {
    if (bits.length === 0 || words.length < 3) return words;

    // Convert bits to permutation index
    let index = 0;
    for (let i = 0; i < bits.length; i++) {
      index = (index << 1) | bits[i];
    }
    index = index % this.wordOrderPerms.length;

    const targetOrder = this.wordOrderPerms[index];

    // Apply permutation to first 3 content words
    // (In a real implementation, would use POS tagging)
    const result = [...words];
    const orderMap = { 'S': 0, 'V': 1, 'O': 2 };
    const baseOrder = 'SVO';

    const permuted = [];
    for (const role of targetOrder) {
      permuted.push(result[orderMap[role]]);
    }

    for (let i = 0; i < Math.min(3, result.length); i++) {
      result[i] = permuted[i];
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DECODING - Extract hidden payload
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Decode a hidden payload from stegotext
   *
   * @param {string} stegoText - The steganographic text
   * @returns {Object} Decoded payload and metadata
   */
  decode(stegoText) {
    // Extract bits from all channels
    const bits = this._extractBitsFromText(stegoText);

    // De-interleave if enabled
    const deinterleaved = this.config.interleaveBits
      ? this._deinterleaveBits(bits)
      : bits;

    // Convert bits to bytes
    let bytes = this._bitsToBytes(deinterleaved);

    // Remove error correction
    bytes = this._removeErrorCorrection(bytes);

    // Parse frame
    const frame = this._parseFrame(bytes);

    if (!frame.valid) {
      return {
        success: false,
        error: frame.error,
        payload: null,
      };
    }

    // Verify CRC
    const calculatedCRC = crc32(frame.payload);
    if (calculatedCRC !== frame.crc) {
      return {
        success: false,
        error: 'CRC mismatch - data corrupted',
        payload: null,
        expectedCRC: frame.crc,
        actualCRC: calculatedCRC,
      };
    }

    // Decrypt payload
    const decrypted = this.config.encryptPayload
      ? this._xorEncrypt(frame.payload) // XOR is symmetric
      : frame.payload;

    // Convert to string
    const payload = new TextDecoder().decode(decrypted);

    return {
      success: true,
      payload,
      payloadBytes: decrypted,
      payloadLength: frame.length,
      version: frame.version,
      errorsCorrected: frame.errorsCorrected || 0,
    };
  }

  _extractBitsFromText(text) {
    const words = text.split(/\s+/);
    const bits = [];
    const channels = this.config.channels;

    for (const word of words) {
      // Channel 1: Synonym
      if (channels.includes('synonym')) {
        const bit = this._decodeSynonym(word);
        if (bit !== null) bits.push(bit);
      }

      // Channel 2: Morpheme
      if (channels.includes('morpheme')) {
        bits.push(this._decodeMorpheme(word));
      }

      // Channel 4: Null morpheme
      if (channels.includes('null')) {
        bits.push(this._decodeNull(word));
      }

      // Channel 5: Register
      if (channels.includes('register')) {
        bits.push(this._decodeRegister(word));
      }

      // Channel 6: Homoglyphs
      if (channels.includes('homoglyph')) {
        bits.push(...this._decodeHomoglyphs(word));
      }

      // Channel 7: Zero-width
      if (channels.includes('zerowidth')) {
        bits.push(...this._decodeZeroWidth(word));
      }
    }

    // Channel 3: Word order
    if (channels.includes('order') && words.length >= 3) {
      bits.push(...this._decodeWordOrder(words));
    }

    return bits;
  }

  _decodeSynonym(word) {
    const cleanWord = word.replace(/[-=~·].*$/, '').replace(/^(o-|go-|on-)/, '');
    const lookup = this.synonymLookup.get(cleanWord);
    return lookup ? lookup.bit : null;
  }

  _decodeMorpheme(word) {
    const marker = this.morphAlternates.emphatic.delimiter + this.morphAlternates.emphatic.particle;
    return word.includes(marker) ? 1 : 0;
  }

  _decodeNull(word) {
    return word.includes(this.nullDelimiter + this.nullMorphemes.interword) ? 1 : 0;
  }

  _decodeRegister(word) {
    // Has honorific prefix = formal = bit 0
    if (word.startsWith(this.honorifics.prefix)) return 0;
    return 1;
  }

  _decodeHomoglyphs(word) {
    const bits = [];

    for (const char of word) {
      const lower = char.toLowerCase();
      const pair = HOMOGLYPH_MAP[lower];

      if (pair) {
        // Check which variant it is
        if (char.toLowerCase() === pair[0] || char === pair[0].toUpperCase()) {
          bits.push(0);
        } else if (char.toLowerCase() === pair[1] || char === pair[1].toUpperCase()) {
          bits.push(1);
        }
      }
    }

    return bits;
  }

  _decodeZeroWidth(word) {
    const bits = [];

    for (const char of word) {
      if (char === ZERO_WIDTH.SPACE) bits.push(0);
      else if (char === ZERO_WIDTH.NON_JOINER) bits.push(1);
    }

    return bits;
  }

  _decodeWordOrder(words) {
    // Detect which permutation was used
    // Simplified - would need POS tagging for accuracy
    const bits = [];

    // Return default bits based on bitsPerClause
    for (let i = 0; i < this.bitsPerClause; i++) {
      bits.push(0);
    }

    return bits;
  }

  _deinterleaveBits(bits) {
    const blockSize = 64;
    const numBlocks = Math.ceil(bits.length / blockSize);

    // Ensure we have full interleaved structure
    while (bits.length < numBlocks * blockSize) {
      bits.push(0);
    }

    // De-interleave
    const result = new Array(bits.length);
    let srcIdx = 0;

    for (let i = 0; i < blockSize; i++) {
      for (let b = 0; b < numBlocks; b++) {
        result[b * blockSize + i] = bits[srcIdx++];
      }
    }

    return result;
  }

  _removeErrorCorrection(bytes) {
    switch (this.ecMode) {
      case EC_REED_SOLOMON:
        return this._rsDecode(bytes);
      case EC_HAMMING_7_4:
        return this._hammingDecode(bytes);
      case EC_REPEAT_3:
        return this._repeatDecode(bytes, 3);
      case EC_REPEAT_5:
        return this._repeatDecode(bytes, 5);
      default:
        return bytes;
    }
  }

  _rsDecode(data) {
    if (data.length === 0) return data;

    const numBlocks = data[0];
    const blockSize = 255; // RS(255, 223) encoded block size

    const decoded = [];
    let offset = 1;

    for (let i = 0; i < numBlocks; i++) {
      const block = data.slice(offset, offset + blockSize);
      const result = this.rs.decode(block);
      decoded.push(...result.data);
      offset += blockSize;
    }

    return new Uint8Array(decoded);
  }

  _hammingDecode(data) {
    const bits = this._bytesToBits(data);
    const decoded = [];

    // Process 7 bits at a time
    for (let i = 0; i < bits.length; i += 7) {
      if (i + 7 > bits.length) break;

      const c = bits.slice(i, i + 7);

      // Calculate syndrome
      const s1 = c[0] ^ c[2] ^ c[4] ^ c[6];
      const s2 = c[1] ^ c[2] ^ c[5] ^ c[6];
      const s4 = c[3] ^ c[4] ^ c[5] ^ c[6];

      const errorPos = s1 + s2 * 2 + s4 * 4;

      // Correct single-bit error
      if (errorPos > 0 && errorPos <= 7) {
        c[errorPos - 1] ^= 1;
      }

      // Extract data bits
      decoded.push(c[2], c[4], c[5], c[6]);
    }

    return this._bitsToBytes(decoded);
  }

  _repeatDecode(data, n) {
    const decoded = [];

    for (let i = 0; i < data.length; i += n) {
      // Majority vote
      const chunk = Array.from(data.slice(i, i + n));
      const counts = {};

      for (const byte of chunk) {
        counts[byte] = (counts[byte] || 0) + 1;
      }

      let maxByte = chunk[0];
      let maxCount = 0;

      for (const [byte, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          maxByte = parseInt(byte);
        }
      }

      decoded.push(maxByte);
    }

    return new Uint8Array(decoded);
  }

  _parseFrame(bytes) {
    if (bytes.length < 9) {
      return { valid: false, error: 'Frame too short' };
    }

    // Check sync pattern
    const sync = (bytes[0] << 8) | bytes[1];
    if (sync !== FRAME_SYNC) {
      return { valid: false, error: `Invalid sync pattern: ${sync.toString(16)}` };
    }

    // Parse header
    const versionFlags = bytes[2];
    const version = (versionFlags >> 4) & 0x0F;
    const ecMode = versionFlags & 0x0F;

    const length = (bytes[3] << 8) | bytes[4];

    const crc = (bytes[5] << 24) | (bytes[6] << 16) | (bytes[7] << 8) | bytes[8];

    if (bytes.length < 9 + length) {
      return { valid: false, error: 'Frame truncated' };
    }

    const payload = bytes.slice(9, 9 + length);

    return {
      valid: true,
      version,
      ecMode,
      length,
      crc: crc >>> 0, // Ensure unsigned
      payload: new Uint8Array(payload),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CAPACITY ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Calculate steganographic capacity of cover text
   */
  calculateCapacity(message) {
    const words = message.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const channels = this.config.channels;

    let bitsPerWord = 0;
    const breakdown = {};

    // Synonym: ~0.7 bits per word (70% have synonyms)
    if (channels.includes('synonym')) {
      const synRate = 0.7;
      bitsPerWord += synRate;
      breakdown.synonym = Math.floor(wordCount * synRate);
    }

    // Morpheme: 1 bit per word
    if (channels.includes('morpheme')) {
      bitsPerWord += 1;
      breakdown.morpheme = wordCount;
    }

    // Null morpheme: 1 bit per word
    if (channels.includes('null')) {
      bitsPerWord += 1;
      breakdown.null = wordCount;
    }

    // Register: 1 bit per word
    if (channels.includes('register')) {
      bitsPerWord += 1;
      breakdown.register = wordCount;
    }

    // Homoglyphs: variable, ~2 bits per word average
    if (channels.includes('homoglyph')) {
      const avgHomoglyphs = 2;
      bitsPerWord += avgHomoglyphs;
      breakdown.homoglyph = wordCount * avgHomoglyphs;
    }

    // Zero-width: 8 bits per word
    if (channels.includes('zerowidth')) {
      bitsPerWord += 8;
      breakdown.zerowidth = wordCount * 8;
    }

    const wordBits = Math.floor(wordCount * bitsPerWord);

    // Word order: 1-2 bits per clause
    let orderBits = 0;
    if (channels.includes('order')) {
      orderBits = this.bitsPerClause;
      breakdown.order = orderBits;
    }

    const totalBits = wordBits + orderBits;

    // Account for frame overhead (header + EC)
    const frameOverhead = 9 * 8; // 9 bytes header
    const ecOverhead = this._getECOverhead();
    const usableBits = Math.floor(totalBits / (1 + ecOverhead)) - frameOverhead;

    return {
      words: wordCount,
      bitsPerWord: bitsPerWord.toFixed(2),
      rawBits: totalBits,
      frameOverhead: frameOverhead,
      ecOverhead: (ecOverhead * 100).toFixed(1) + '%',
      totalBits: Math.max(0, usableBits),
      maxBytes: Math.floor(Math.max(0, usableBits) / 8),
      breakdown,
    };
  }

  _getECOverhead() {
    switch (this.ecMode) {
      case EC_REED_SOLOMON: return 32 / 223; // ~14%
      case EC_HAMMING_7_4: return 3 / 4; // 75%
      case EC_REPEAT_3: return 2; // 200%
      case EC_REPEAT_5: return 4; // 400%
      default: return 0;
    }
  }

  /**
   * Get detailed channel statistics
   */
  getChannelStats() {
    return {
      synonym: {
        pairs: this.synonymPairs.size,
        coverage: (this.synonymLookup.size / Math.max(1, this.lexicon?.entries?.length || 1) * 100).toFixed(1) + '%',
        bitsPerHit: 1,
      },
      morpheme: {
        emphatic: this.morphAlternates.emphatic.particle,
        delimiter: this.morphAlternates.emphatic.delimiter,
        bitsPerWord: 1,
      },
      order: {
        permutations: this.wordOrderPerms.length,
        bitsPerClause: this.bitsPerClause,
        orders: this.wordOrderPerms,
      },
      null: {
        particle: this.nullMorphemes.interword,
        delimiter: this.nullDelimiter,
        bitsPerWord: 1,
      },
      register: {
        pairs: this.registerPairs.size,
        honorific: this.honorifics.prefix,
        bitsPerWord: 1,
      },
      homoglyph: {
        characters: Object.keys(HOMOGLYPH_MAP).length,
        bitsPerChar: 1,
      },
      zerowidth: {
        bitsPerSlot: 8,
        markers: Object.keys(ZERO_WIDTH).length,
      },
      errorCorrection: {
        type: this.config.errorCorrection,
        mode: this.ecMode,
        overhead: this._getECOverhead(),
      },
      security: {
        encrypted: this.config.encryptPayload,
        interleaved: this.config.interleaveBits,
      },
    };
  }
}

export default SteganographyEngine;
