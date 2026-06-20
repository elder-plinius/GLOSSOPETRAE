/**
 * GLOSSOPETRAE - AudioForge Module
 *
 * Klatt-style cascade formant synthesizer that pronounces words of a
 * generated language. Pure DSP: produces mono Float32Array PCM at
 * 22050 Hz with zero dependencies and no AudioContext requirement
 * (browser playback is a thin optional wrapper around Web Audio).
 *
 * Pipeline:
 *   romanized word → longest-match phoneme parse → syllabification →
 *   prosody (stress, tone, declination, final lengthening) →
 *   segment plan (closures, bursts, frication, formant targets,
 *   linear coarticulation ramps) → source-filter synthesis
 *   (polyBLEP glottal sawtooth + seeded noise → resonator cascade +
 *   parallel frication path) → peak-normalized PCM.
 *
 * Determinism: all randomness (jitter, shimmer, noise, lexical stress,
 * default tone assignment) is seeded from hash(word) ^ language seed,
 * so the same word in the same language is byte-identical every time.
 */

import { CONSONANTS, VOWELS, getAllConsonants, getAllVowels } from '../data/phonemes.js';
import { SeededRandom, hashString } from '../utils/random.js';

const SAMPLE_RATE = 22050;
const TWO_PI = Math.PI * 2;

// ---------------------------------------------------------------------------
// Static phonetic data
// ---------------------------------------------------------------------------

// Steady-state formant targets (Hz) — standard published (Peterson & Barney /
// Klatt-ish adult male) values. F1/F2/F3 + bandwidths.
const VOWEL_FORMANTS = {
  i: { F1: 270, F2: 2290, F3: 3010, B1: 60, B2: 90, B3: 150 },
  ɪ: { F1: 390, F2: 1990, F3: 2550, B1: 70, B2: 100, B3: 160 },
  e: { F1: 430, F2: 2200, F3: 2700, B1: 70, B2: 90, B3: 160 },
  ɛ: { F1: 530, F2: 1840, F3: 2480, B1: 80, B2: 100, B3: 170 },
  æ: { F1: 660, F2: 1720, F3: 2410, B1: 90, B2: 110, B3: 170 },
  a: { F1: 730, F2: 1250, F3: 2500, B1: 90, B2: 110, B3: 170 },
  ɑ: { F1: 730, F2: 1090, F3: 2440, B1: 90, B2: 110, B3: 170 },
  ɒ: { F1: 590, F2: 880, F3: 2400, B1: 80, B2: 100, B3: 170 },
  ɔ: { F1: 570, F2: 840, F3: 2410, B1: 80, B2: 100, B3: 170 },
  o: { F1: 450, F2: 800, F3: 2550, B1: 70, B2: 90, B3: 160 },
  ʊ: { F1: 440, F2: 1020, F3: 2240, B1: 70, B2: 100, B3: 160 },
  u: { F1: 300, F2: 870, F3: 2240, B1: 60, B2: 90, B3: 150 },
  ʌ: { F1: 640, F2: 1190, F3: 2390, B1: 80, B2: 100, B3: 170 },
  ə: { F1: 500, F2: 1500, F3: 2500, B1: 80, B2: 100, B3: 170 },
  y: { F1: 270, F2: 1850, F3: 2150, B1: 60, B2: 90, B3: 150 },
  ø: { F1: 400, F2: 1550, F3: 2300, B1: 70, B2: 90, B3: 160 },
  œ: { F1: 480, F2: 1450, F3: 2300, B1: 80, B2: 100, B3: 160 },
};

// Feature-based vowel fallback (for synthetic/unknown vowel objects)
const HEIGHT_F1 = {
  close: 280, 'near-close': 400, 'close-mid': 440, mid: 500,
  'open-mid': 570, 'near-open': 660, open: 730,
};
const BACKNESS_F2 = { front: 2100, central: 1450, back: 950 };

// Place of articulation: F2/F3 loci (formant transition targets) and
// stop release-burst spectra (center freq, bandwidth, gain).
const PLACE_INFO = {
  bilabial:       { locus2: 800,  locus3: 2300, burstF: 700,  burstB: 1400, burstG: 0.40 },
  'labial-velar': { locus2: 900,  locus3: 2300, burstF: 800,  burstB: 1400, burstG: 0.40 },
  labiodental:    { locus2: 1000, locus3: 2400, burstF: 900,  burstB: 1600, burstG: 0.35 },
  dental:         { locus2: 1600, locus3: 2600, burstF: 4200, burstB: 2800, burstG: 0.55 },
  alveolar:       { locus2: 1750, locus3: 2600, burstF: 4500, burstB: 2500, burstG: 0.65 },
  postalveolar:   { locus2: 1900, locus3: 2500, burstF: 3000, burstB: 2000, burstG: 0.60 },
  retroflex:      { locus2: 1800, locus3: 1900, burstF: 2800, burstB: 2000, burstG: 0.60 },
  palatal:        { locus2: 2300, locus3: 2800, burstF: 3300, burstB: 1800, burstG: 0.55 },
  velar:          { locus2: 2000, locus3: 2400, burstF: 2100, burstB: 700,  burstG: 0.60 },
  uvular:         { locus2: 1300, locus3: 2300, burstF: 1300, burstB: 700,  burstG: 0.60 },
  pharyngeal:     { locus2: 1200, locus3: 2300, burstF: 1100, burstB: 900,  burstG: 0.45 },
  glottal:        { locus2: 1500, locus3: 2500, burstF: 1500, burstB: 2000, burstG: 0.0 },
};

// Fricative noise spectra: center frequency, bandwidth, gain.
// Place-dependent spectral centroids: f/θ diffuse-low, s high, ʃ mid-high,
// x/χ low-mid compact.
const FRIC_SPECTRA = {
  f: { fc: 5500, fb: 7000, g: 0.18 }, v: { fc: 5500, fb: 7000, g: 0.13 },
  θ: { fc: 5800, fb: 7000, g: 0.15 }, ð: { fc: 5800, fb: 7000, g: 0.11 },
  s: { fc: 6600, fb: 2400, g: 0.55 }, z: { fc: 6600, fb: 2400, g: 0.40 },
  ʃ: { fc: 3300, fb: 1900, g: 0.55 }, ʒ: { fc: 3300, fb: 1900, g: 0.40 },
  ʂ: { fc: 2900, fb: 1900, g: 0.50 }, ʐ: { fc: 2900, fb: 1900, g: 0.38 },
  ç: { fc: 3800, fb: 2200, g: 0.40 },
  x: { fc: 2600, fb: 1500, g: 0.40 }, ɣ: { fc: 2600, fb: 1500, g: 0.28 },
  χ: { fc: 1600, fb: 1000, g: 0.45, trill: 32 },
  ʁ: { fc: 1500, fb: 1000, g: 0.30, trill: 28 },
  ħ: { fc: 1300, fb: 1100, g: 0.32 },
  ɬ: { fc: 4200, fb: 2800, g: 0.45 }, ɮ: { fc: 4200, fb: 2800, g: 0.32 },
};

// Maps an affricate to the fricative spectrum of its release.
const AFFRICATE_RELEASE = {
  ts: 's', dz: 'z', 'tʃ': 'ʃ', 'dʒ': 'ʒ', 'tsʼ': 's', 'tʃʼ': 'ʃ',
};

// Nasal murmur: place-dependent F2-ish pole + antiresonance (zero) freq.
const NASAL_INFO = {
  bilabial:  { F2: 1100, zero: 1000 },
  alveolar:  { F2: 1500, zero: 1700 },
  retroflex: { F2: 1700, zero: 2000 },
  palatal:   { F2: 2000, zero: 2400 },
  velar:     { F2: 1300, zero: 2900 },
  uvular:    { F2: 1200, zero: 2900 },
};

// Sonorant formant targets (liquids/glides).
const SONORANT_FORMANTS = {
  l: { F1: 360, F2: 1300, F3: 2700, B1: 70, B2: 120, B3: 250 },  // lateral: F3 dip vs vowels
  r: { F1: 480, F2: 1150, F3: 1600, B1: 80, B2: 140, B3: 220 },  // rhotic: very low F3
  ɻ: { F1: 460, F2: 1200, F3: 1700, B1: 80, B2: 140, B3: 220 },
  ʀ: { F1: 450, F2: 1200, F3: 2100, B1: 90, B2: 150, B3: 260 },  // uvular trill (+AM)
  ɾ: { F1: 380, F2: 1650, F3: 2500, B1: 100, B2: 150, B3: 260 }, // tap: very short
  w: { F1: 300, F2: 650,  F3: 2250, B1: 70, B2: 110, B3: 250 },  // glide from /u/
  j: { F1: 280, F2: 2200, F3: 2900, B1: 60, B2: 100, B3: 200 },  // glide from /i/
  ʕ: { F1: 650, F2: 1100, F3: 2400, B1: 110, B2: 160, B3: 280 }, // pharyngeal approximant
};

// Exotic phones not in src/data/phonemes.js, covered defensively
// (DivergenceEngine references these classes).
const EXOTIC_MANNER = {
  'ʘ': 'click', 'ǀ': 'click', 'ǃ': 'click', 'ǂ': 'click', 'ǁ': 'click',
  'ɓ': 'implosive', 'ɗ': 'implosive', 'ʄ': 'implosive', 'ɠ': 'implosive', 'ʛ': 'implosive',
  'ħ': 'fricative', 'ʕ': 'liquid',
  'ʈ': 'stop', 'ɖ': 'stop', 'ɢ': 'stop',
  'ʂ': 'fricative', 'ʐ': 'fricative', 'ç': 'fricative', 'ʁ': 'fricative',
  'ɬ': 'fricative', 'ɮ': 'fricative',
  'ɳ': 'nasal', 'ɻ': 'liquid',
};

const EXOTIC_PLACE = {
  'ʘ': 'bilabial', 'ǀ': 'dental', 'ǃ': 'alveolar', 'ǂ': 'palatal', 'ǁ': 'alveolar',
  'ɓ': 'bilabial', 'ɗ': 'alveolar', 'ʄ': 'palatal', 'ɠ': 'velar', 'ʛ': 'uvular',
  'ħ': 'pharyngeal', 'ʕ': 'pharyngeal',
  'ʈ': 'retroflex', 'ɖ': 'retroflex', 'ʂ': 'retroflex', 'ʐ': 'retroflex',
  'ɳ': 'retroflex', 'ɻ': 'retroflex',
  'ɢ': 'uvular', 'ʁ': 'uvular', 'ç': 'palatal', 'ɬ': 'alveolar', 'ɮ': 'alveolar',
};

// Tone contours on a 1-5 pitch-level scale (Chao tone letters), used both
// for ProsodyEngine tone ids and for explicit opts.tones overrides.
const TONE_SHAPES = {
  H: [4, 4], M: [3, 3], L: [2, 2], XH: [5, 5], XL: [1, 1],
  R: [2, 4.5], F: [4.5, 2], LR: [1, 3.5], HR: [3.5, 5],
  LF: [2.5, 1], HF: [5, 3], D: [3, 1.5, 4], P: [3, 5, 2],
};

// Build IPA → broad manner map from the canonical inventory.
const IPA_MANNER = (() => {
  const singular = {
    stops: 'stop', nasals: 'nasal', fricatives: 'fricative',
    affricates: 'affricate', liquids: 'liquid', glides: 'glide',
  };
  const map = {};
  for (const [cat, list] of Object.entries(CONSONANTS)) {
    for (const c of list) map[c.ipa] = singular[cat];
  }
  return map;
})();

const IPA_VOWEL = new Set(getAllVowels().map((v) => v.ipa));

// ---------------------------------------------------------------------------
// AudioForge
// ---------------------------------------------------------------------------

export class AudioForge {
  /**
   * @param {object} language - a generated GLOSSOPETRAE language object
   *   (uses language.phonology.{consonants,vowels}, language.prosody,
   *   language.seed). A partial object works: missing pieces fall back to
   *   the full canonical inventory and neutral prosody.
   */
  constructor(language = {}) {
    this.language = language;
    this.sampleRate = SAMPLE_RATE;
    this._audioCtx = null;
    this._buildPhoneMaps();
  }

  // -------------------------------------------------------------------------
  // Parsing
  // -------------------------------------------------------------------------

  /**
   * Parse a romanized word into a phone sequence using longest-match-first
   * tokenization built from the language's roman fields (e.g. "ngu" → ŋ+u,
   * "sh" → ʃ). Unknown characters are skipped gracefully.
   * @returns {Array<object>} phone objects: {ipa, roman, type, manner, ...features}
   */
  parseRoman(word) {
    const w = this._normalizeRoman(word);
    const phones = [];
    let i = 0;
    while (i < w.length) {
      let matched = false;
      for (const [token, phone] of this._tokens) {
        if (token.length > 0 && w.startsWith(token, i)) {
          phones.push({ ...phone, roman: token });
          i += token.length;
          matched = true;
          break;
        }
      }
      if (!matched) i++; // skip unknown character
    }
    return phones;
  }

  // -------------------------------------------------------------------------
  // Synthesis (public)
  // -------------------------------------------------------------------------

  /**
   * Synthesize a single romanized word.
   * @param {string} romanWord
   * @param {object} opts - {f0=112, rate=1, peak=0.8, tones=[ids per syllable],
   *   stressIndex, finalContour: 'fall'|'rise'|'none'}
   * @returns {{samples: Float32Array, sampleRate: number, duration: number, phones: Array}}
   */
  synthesizeWord(romanWord, opts = {}) {
    const phones = this.parseRoman(romanWord);
    const { samples, phoneTimes } = this._renderWord(phones, romanWord, opts);
    this._normalize(samples, opts.peak ?? 0.8);
    this._applyFades(samples);
    return {
      samples,
      sampleRate: this.sampleRate,
      duration: samples.length / this.sampleRate,
      phones: phoneTimes,
    };
  }

  /**
   * Synthesize a sentence (array of romanized words, or a whitespace-separated
   * string) with inter-word pauses, sentence-level F0 declination and a final
   * boundary contour: opts.mode 'statement' (final fall) or 'question'
   * (final rise).
   * @returns {{samples: Float32Array, sampleRate, duration, words: Array}}
   */
  synthesizeSentence(romanWords, opts = {}) {
    const words = (Array.isArray(romanWords)
      ? romanWords
      : String(romanWords).trim().split(/\s+/)
    ).filter((w) => w.length > 0);

    const mode = opts.mode === 'question' ? 'question' : 'statement';
    const pauseSec = opts.pause ?? 0.11;
    const baseF0 = opts.f0 ?? 112;
    const pieces = [];
    const wordMeta = [];
    let totalSamples = 0;
    const pauseSamples = Math.round(pauseSec * this.sampleRate);

    for (let i = 0; i < words.length; i++) {
      const isLast = i === words.length - 1;
      const span = words.length > 1 ? i / (words.length - 1) : 1;
      const wordOpts = {
        ...opts,
        f0: baseF0 * (1.06 - 0.14 * span), // sentence declination
        finalContour: isLast ? (mode === 'question' ? 'rise' : 'fall') : 'none',
      };
      const phones = this.parseRoman(words[i]);
      const { samples, phoneTimes } = this._renderWord(phones, words[i], wordOpts);
      wordMeta.push({
        word: words[i],
        start: totalSamples / this.sampleRate,
        duration: samples.length / this.sampleRate,
        phones: phoneTimes,
      });
      pieces.push(samples);
      totalSamples += samples.length;
      if (!isLast) totalSamples += pauseSamples;
    }

    const out = new Float32Array(Math.max(1, totalSamples));
    let cursor = 0;
    for (let i = 0; i < pieces.length; i++) {
      out.set(pieces[i], cursor);
      cursor += pieces[i].length + pauseSamples;
    }
    this._normalize(out, opts.peak ?? 0.8);
    this._applyFades(out);
    return {
      samples: out,
      sampleRate: this.sampleRate,
      duration: out.length / this.sampleRate,
      words: wordMeta,
      mode,
    };
  }

  /**
   * Encode Float32Array samples (or a synthesizeWord/Sentence result) as a
   * 16-bit PCM mono RIFF WAV file.
   * @returns {Uint8Array}
   */
  toWav(samples) {
    const data = samples instanceof Float32Array ? samples : samples.samples;
    const n = data.length;
    const bytes = new Uint8Array(44 + n * 2);
    const view = new DataView(bytes.buffer);
    const writeStr = (off, s) => {
      for (let i = 0; i < s.length; i++) bytes[off + i] = s.charCodeAt(i);
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + n * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);          // fmt chunk size
    view.setUint16(20, 1, true);           // PCM
    view.setUint16(22, 1, true);           // mono
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true);           // block align
    view.setUint16(34, 16, true);          // bits per sample
    writeStr(36, 'data');
    view.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const s = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(44 + i * 2, Math.round(s * 32767), true);
    }
    return bytes;
  }

  /**
   * Browser-only playback. Reuses a single AudioContext; resolves when
   * playback ends. Throws a helpful error under Node.
   * @param {string|Array<string>} romanWordOrSentence
   */
  async play(romanWordOrSentence, opts = {}) {
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) {
      throw new Error(
        'AudioForge.play() requires a browser with the Web Audio API. ' +
        'In Node, use synthesizeWord()/synthesizeSentence() + toWav() and ' +
        'write the bytes to a .wav file instead.'
      );
    }
    const words = Array.isArray(romanWordOrSentence)
      ? romanWordOrSentence
      : String(romanWordOrSentence).trim().split(/\s+/);
    const result = words.length > 1
      ? this.synthesizeSentence(words, opts)
      : this.synthesizeWord(words[0], opts);

    if (!this._audioCtx) this._audioCtx = new Ctx();
    if (this._audioCtx.state === 'suspended') await this._audioCtx.resume();
    const buffer = this._audioCtx.createBuffer(1, result.samples.length, result.sampleRate);
    buffer.copyToChannel(result.samples, 0);
    const source = this._audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this._audioCtx.destination);
    return new Promise((resolve) => {
      source.onended = () => resolve(result);
      source.start();
    });
  }

  /**
   * Human-readable articulation description for a phone (UI tooltips).
   * @param {string} ipa
   * @returns {string}
   */
  describePhone(ipa) {
    const phone = this._phoneByIpa.get(ipa) || this._enrichPhone(this._lookupCanonical(ipa));
    if (!phone) return `/${ipa}/ — unknown phone`;
    if (phone.type === 'vowel') {
      const round = phone.rounded ? 'rounded' : 'unrounded';
      return `/${phone.ipa}/ — ${phone.height || 'mid'} ${phone.backness || 'central'} ${round} vowel` +
        (phone.roman ? `, romanized "${phone.roman}"` : '');
    }
    const manner = phone.subManner || phone.mannerLabel || phone.manner;
    const voice = phone.voice || 'voiced';
    const place = phone.place || 'unknown place';
    return `/${phone.ipa}/ — ${voice} ${place} ${manner}` +
      (phone.roman ? `, romanized "${phone.roman}"` : '');
  }

  // -------------------------------------------------------------------------
  // Private: phone maps & parsing helpers
  // -------------------------------------------------------------------------

  _buildPhoneMaps() {
    const phon = this.language.phonology || {};
    let consonants = Array.isArray(phon.consonants) ? phon.consonants : null;
    let vowels = Array.isArray(phon.vowels) ? phon.vowels : null;
    if (!consonants && !vowels) {
      // Standalone usage: fall back to the full canonical inventory
      consonants = getAllConsonants();
      vowels = getAllVowels();
    }
    consonants = consonants || [];
    vowels = vowels || [];

    this._phoneByIpa = new Map();
    const tokenMap = new Map();
    const add = (raw, type) => {
      const phone = this._enrichPhone({ ...raw }, type);
      if (!this._phoneByIpa.has(phone.ipa)) this._phoneByIpa.set(phone.ipa, phone);
      const token = this._normalizeRoman(phone.roman ?? phone.ipa);
      if (token.length > 0 && !tokenMap.has(token)) tokenMap.set(token, phone);
    };
    for (const v of vowels) add(v, 'vowel');
    for (const c of consonants) add(c, 'consonant');

    // Longest-match-first ordering
    this._tokens = [...tokenMap.entries()].sort((a, b) => b[0].length - a[0].length);
  }

  _normalizeRoman(s) {
    return String(s ?? '')
      .normalize('NFC')
      .toLowerCase()
      .replace(/[’ʼʹ`]/g, "'");
  }

  _lookupCanonical(ipa) {
    for (const list of Object.values(CONSONANTS)) {
      const hit = list.find((c) => c.ipa === ipa);
      if (hit) return { ...hit };
    }
    const v = getAllVowels().find((x) => x.ipa === ipa);
    return v ? { ...v } : null;
  }

  _enrichPhone(raw, typeHint = null) {
    if (!raw) return null;
    const phone = raw;
    const isVowel = typeHint === 'vowel' || IPA_VOWEL.has(phone.ipa) ||
      (phone.height !== undefined && phone.backness !== undefined);
    if (isVowel) {
      phone.type = 'vowel';
      phone.manner = 'vowel';
      return phone;
    }
    phone.type = 'consonant';
    phone.subManner = phone.manner; // liquids carry 'lateral'/'rhotic'/'tap'/'trill'
    phone.manner = this._mannerOf(phone);
    if (!phone.place && EXOTIC_PLACE[phone.ipa]) phone.place = EXOTIC_PLACE[phone.ipa];
    return phone;
  }

  _mannerOf(phone) {
    const ipa = phone.ipa || '';
    if (IPA_MANNER[ipa]) return IPA_MANNER[ipa];
    if (EXOTIC_MANNER[ipa]) return EXOTIC_MANNER[ipa];
    if (ipa.endsWith('ʼ') || (ipa.length > 1 && ipa.endsWith("'"))) return 'ejective';
    if (phone.manner && ['lateral', 'rhotic', 'tap', 'trill'].includes(phone.manner)) return 'liquid';
    // Plausible default for anything unknown: shaped noise can't crash.
    return 'fricative';
  }

  // -------------------------------------------------------------------------
  // Private: prosody
  // -------------------------------------------------------------------------

  /** Group phones into syllables: every vowel is a nucleus. */
  _syllabify(phones) {
    const syllables = [];
    let onset = [];
    for (let i = 0; i < phones.length; i++) {
      const p = phones[i];
      if (p.type === 'vowel') {
        syllables.push({ onset, nucleusIdx: i, coda: [] });
        onset = [];
      } else if (syllables.length === 0) {
        onset.push(i);
      } else {
        // Tentatively coda; reassigned to next onset if a vowel follows
        onset.push(i);
      }
    }
    // Distribute trailing consonants: simple onset-maximization — a single
    // consonant before a nucleus is the onset, the rest go to previous coda.
    for (let s = 0; s < syllables.length; s++) {
      const syl = syllables[s];
      if (s > 0 && syl.onset.length > 1) {
        const keep = syl.onset.slice(-1);
        syllables[s - 1].coda.push(...syl.onset.slice(0, -1));
        syl.onset = keep;
      }
    }
    if (onset.length > 0) {
      if (syllables.length > 0) syllables[syllables.length - 1].coda.push(...onset);
      else syllables.push({ onset: [], nucleusIdx: -1, coda: onset }); // vowelless word
    }
    return syllables;
  }

  /** Pick the stressed syllable index per language.prosody.stress. */
  _stressIndex(syllables, wordHash, opts) {
    if (Number.isInteger(opts.stressIndex)) {
      return Math.max(0, Math.min(syllables.length - 1, opts.stressIndex));
    }
    const n = syllables.length;
    if (n === 0) return -1;
    const stress = (this.language.prosody && this.language.prosody.stress) || {};
    let type = stress.type || 'penultimate';
    if (type === 'none') return -1;
    if (type === 'fixed') type = (stress.primary && stress.primary.position) || 'penultimate';

    switch (type) {
      case 'initial': return 0;
      case 'final': return n - 1;
      case 'penultimate': return Math.max(0, n - 2);
      case 'antepenultimate': return Math.max(0, n - 3);
      case 'weight-sensitive': {
        // Heavy = closed syllable; search a right-edge window, else default.
        const windowSize = Math.min(3, n);
        for (let i = n - 1; i >= n - windowSize; i--) {
          if (syllables[i].coda.length > 0) return i;
        }
        const def = (stress.primary && stress.primary.default) || 'penultimate';
        return def === 'initial' ? 0 : def === 'final' ? n - 1 : Math.max(0, n - 2);
      }
      case 'lexical':
      case 'morphological':
      default:
        return wordHash % n; // deterministic pseudo-lexical stress
    }
  }

  /** Resolve per-syllable tone contours (arrays of 1-5 pitch levels). */
  _assignTones(syllables, opts, rng) {
    const prosody = this.language.prosody || {};
    const toneSystem = prosody.hasTone ? prosody.tone : null;
    const explicit = Array.isArray(opts.tones) ? opts.tones : null;
    if (!toneSystem && !explicit) return syllables.map(() => null);

    const languageTones = (toneSystem && Array.isArray(toneSystem.tones)) ? toneSystem.tones : [];
    const resolve = (spec) => {
      if (spec == null) return null;
      if (Array.isArray(spec)) return spec;
      const fromLang = languageTones.find((t) => t.id === spec || t.name === spec);
      if (fromLang) return this._parsePitchString(fromLang.pitch) || TONE_SHAPES[fromLang.id] || null;
      return TONE_SHAPES[spec] || null;
    };

    return syllables.map((syl, i) => {
      if (explicit && explicit[i] !== undefined) return resolve(explicit[i]);
      if (!toneSystem || languageTones.length === 0) return null;
      const tone = languageTones[Math.floor(rng.next() * languageTones.length)];
      return this._parsePitchString(tone.pitch) || TONE_SHAPES[tone.id] || null;
    });
  }

  /** Parse Chao-style pitch strings: '35' → [3,5], '55+' → [5.6,5.6]. */
  _parsePitchString(pitch) {
    if (typeof pitch !== 'string') return null;
    const levels = [];
    let modifier = 0;
    for (const ch of pitch) {
      if (ch >= '1' && ch <= '5') levels.push(Number(ch));
      else if (ch === '+') modifier = 0.6;
      else if (ch === '-') modifier = -0.6;
    }
    if (levels.length === 0) return null;
    if (levels.length === 1) levels.push(levels[0]);
    return levels.map((l) => l + modifier);
  }

  _toneLevelToMult(level) {
    // Each Chao level step ≈ 2.2 semitones around the mid level (3).
    return Math.pow(2, ((level - 3) * 2.2) / 12);
  }

  // -------------------------------------------------------------------------
  // Private: segment planning
  // -------------------------------------------------------------------------

  _vowelTargets(phone) {
    const table = VOWEL_FORMANTS[phone.ipa];
    if (table) return { ...table };
    // Estimate from features for unknown vowels
    let F1 = HEIGHT_F1[phone.height] ?? 500;
    let F2 = BACKNESS_F2[phone.backness] ?? 1450;
    if (phone.rounded) F2 *= 0.88;
    F2 = Math.max(F2, F1 + 300);
    const F3 = phone.backness === 'front' && !phone.rounded ? 2800 : 2400;
    return { F1, F2, F3, B1: 80, B2: 100, B3: 170 };
  }

  _placeInfo(phone) {
    return PLACE_INFO[phone.place] || PLACE_INFO.alveolar;
  }

  _neighborVowelTargets(prev, next) {
    if (next && next.type === 'vowel') return this._vowelTargets(next);
    if (prev && prev.type === 'vowel') return this._vowelTargets(prev);
    return { ...VOWEL_FORMANTS['ə'] };
  }

  /** Base parameter frame: silence with neutral formants. */
  _frame(over = {}) {
    return {
      AV: 0, AH: 0, AF: 0,
      F1: 500, F2: 1500, F3: 2500,
      B1: 90, B2: 110, B3: 170,
      FC: 3000, FB: 2000, NZ: 0, TR: 0,
      ...over,
    };
  }

  /**
   * Build the timed sub-segments for one phone.
   * @returns {Array<{dur, p, abruptIn?, abruptOut?}>}
   */
  _phoneSegments(phone, prev, next, mods) {
    const A = mods.amp;
    const Dv = mods.dur;                       // vowel-scale duration mult
    const Dc = 0.72 + 0.28 * mods.dur;         // consonants stretch less
    const place = this._placeInfo(phone);
    const locus = {
      F1: 280, F2: place.locus2, F3: place.locus3,
      B1: 120, B2: 160, B3: 240,
    };
    const voiced = phone.voice !== 'voiceless';

    switch (phone.manner) {
      case 'vowel': {
        const f = this._vowelTargets(phone);
        return [{ dur: 0.155 * Dv, p: this._frame({ AV: 1.0 * A, ...f }) }];
      }

      case 'glide':
      case 'liquid': {
        const son = SONORANT_FORMANTS[phone.ipa];
        const f = son || { ...locus, B1: 90 };
        if (phone.ipa === 'ɾ' || phone.subManner === 'tap') {
          return [{
            dur: 0.034, abruptIn: true, abruptOut: true,
            p: this._frame({ AV: 0.5 * A, ...f }),
          }];
        }
        const trill = (phone.ipa === 'ʀ' || phone.subManner === 'trill') ? 26 : 0;
        return [{ dur: 0.082 * Dc, p: this._frame({ AV: 0.85 * A, ...f, TR: trill }) }];
      }

      case 'nasal': {
        const nas = NASAL_INFO[phone.place] || NASAL_INFO.alveolar;
        return [{
          dur: 0.088 * Dc,
          p: this._frame({
            AV: 0.6 * A,
            F1: 250, F2: nas.F2, F3: 2500,
            B1: 110, B2: 250, B3: 300,
            NZ: nas.zero,
          }),
        }];
      }

      case 'fricative': {
        if (phone.ipa === 'h') {
          // Aspiration through the formants of the neighboring vowel
          const f = this._neighborVowelTargets(prev, next);
          return [{ dur: 0.09 * Dc, p: this._frame({ AH: 0.5 * A, ...f }) }];
        }
        if (phone.ipa === 'ʕ') {
          const f = SONORANT_FORMANTS['ʕ'];
          return [{ dur: 0.09 * Dc, p: this._frame({ AV: 0.7 * A, ...f }) }];
        }
        const spec = FRIC_SPECTRA[phone.ipa] ||
          { fc: place.burstF, fb: place.burstB + 800, g: 0.35 };
        const base = this._frame({
          ...locus, F1: 300, B1: 150,
          FC: spec.fc, FB: spec.fb, TR: spec.trill || 0,
        });
        if (voiced) {
          return [{
            dur: 0.115 * Dc,
            p: { ...base, AV: 0.32 * A, AF: spec.g * 0.78 * A },
          }];
        }
        return [{ dur: 0.135 * Dc, p: { ...base, AF: spec.g * A } }];
      }

      case 'affricate': {
        const releaseIpa = AFFRICATE_RELEASE[phone.ipa] || (voiced ? 'z' : 's');
        const spec = FRIC_SPECTRA[releaseIpa] || FRIC_SPECTRA.s;
        const closure = voiced
          ? this._frame({ AV: 0.2 * A, F1: 180, F2: locus.F2, F3: locus.F3, B1: 140, B2: 500, B3: 500 })
          : this._frame({ ...locus });
        return [
          { dur: 0.045 * Dc, p: closure },
          {
            dur: 0.085 * Dc, abruptIn: true,
            p: this._frame({
              ...locus, F1: 300,
              AF: spec.g * 0.95 * A, AV: voiced ? 0.25 * A : 0,
              FC: spec.fc, FB: spec.fb,
            }),
          },
        ];
      }

      case 'stop': {
        if (phone.ipa === 'ʔ') {
          // Glottal stop: silence with abrupt edges
          return [{
            dur: 0.055, abruptIn: true, abruptOut: true,
            p: this._frame({ ...this._neighborVowelTargets(prev, next), AV: 0 }),
          }];
        }
        const segs = [];
        const isInitial = !prev;
        if (voiced) {
          // Prevoicing murmur during closure, weak burst, short VOT
          segs.push({
            dur: (isInitial ? 0.04 : 0.055) * Dc,
            p: this._frame({
              AV: 0.22 * A, F1: 180, F2: locus.F2, F3: locus.F3,
              B1: 140, B2: 500, B3: 500,
            }),
          });
          segs.push({
            dur: 0.009, abruptIn: true,
            p: this._frame({ ...locus, AF: place.burstG * 0.5 * A, FC: place.burstF, FB: place.burstB }),
          });
        } else {
          // Closure silence, sharp burst, long VOT with aspiration
          segs.push({ dur: (isInitial ? 0.03 : 0.055) * Dc, p: this._frame({ ...locus }) });
          if (place.burstG > 0) {
            segs.push({
              dur: 0.012, abruptIn: true,
              p: this._frame({ ...locus, AF: place.burstG * A, FC: place.burstF, FB: place.burstB }),
            });
          }
          const aspTargets = this._neighborVowelTargets(prev, next);
          segs.push({
            dur: 0.05 * Dc,
            p: this._frame({ ...aspTargets, AH: 0.38 * A }),
          });
        }
        return segs;
      }

      case 'ejective': {
        // Burst + silence gap + tense onset (handled by abrupt next segment)
        return [
          { dur: 0.05 * Dc, p: this._frame({ ...locus }) },
          {
            dur: 0.012, abruptIn: true, abruptOut: true,
            p: this._frame({ ...locus, AF: place.burstG * 1.15 * A, FC: place.burstF, FB: place.burstB }),
          },
          { dur: 0.045, abruptIn: true, p: this._frame({ ...locus }) },
        ];
      }

      case 'implosive': {
        return [
          {
            dur: 0.065 * Dc,
            p: this._frame({
              AV: 0.32 * A, F1: 170, F2: locus.F2, F3: locus.F3,
              B1: 130, B2: 500, B3: 500,
            }),
          },
          {
            dur: 0.008, abruptIn: true,
            p: this._frame({ ...locus, AF: 0.25 * A, FC: place.burstF, FB: place.burstB }),
          },
        ];
      }

      case 'click': {
        // Sharp wideband transient framed by silence
        return [
          { dur: 0.015, p: this._frame({ ...locus }) },
          {
            dur: 0.012, abruptIn: true, abruptOut: true,
            p: this._frame({ ...locus, AF: 0.95 * A, FC: 3200, FB: 4500 }),
          },
          { dur: 0.018, p: this._frame({ ...locus }) },
        ];
      }

      default: {
        // Unknown manner: schwa-like voiced blob, never crash
        return [{ dur: 0.08, p: this._frame({ AV: 0.6 * A, ...VOWEL_FORMANTS['ə'] }) }];
      }
    }
  }

  // -------------------------------------------------------------------------
  // Private: word rendering
  // -------------------------------------------------------------------------

  /**
   * Render a parsed phone sequence to (unnormalized) samples.
   * @returns {{samples: Float32Array, phoneTimes: Array}}
   */
  _renderWord(phones, word, opts = {}) {
    const sr = this.sampleRate;
    if (phones.length === 0) {
      return { samples: new Float32Array(Math.round(0.05 * sr)), phoneTimes: [] };
    }

    const langSeed = typeof this.language.seed === 'number' ? this.language.seed : 0;
    const wordHash = hashString(this._normalizeRoman(word) + '#' + langSeed);
    const rng = new SeededRandom(wordHash);
    const rate = opts.rate ?? 1;
    const baseF0 = (opts.f0 ?? 112);

    // --- Prosody assignment ---
    const syllables = this._syllabify(phones);
    const stressIdx = this._stressIndex(syllables, wordHash, opts);
    const tones = this._assignTones(syllables, opts, rng);

    // Per-phone prosodic multipliers
    const durMult = new Array(phones.length).fill(1);
    const ampMult = new Array(phones.length).fill(1);
    const sylOfPhone = new Array(phones.length).fill(-1);
    for (let s = 0; s < syllables.length; s++) {
      const syl = syllables[s];
      const members = [...syl.onset, syl.nucleusIdx, ...syl.coda].filter((i) => i >= 0);
      for (const i of members) sylOfPhone[i] = s;
      const stressed = s === stressIdx;
      const final = s === syllables.length - 1;
      for (const i of members) {
        if (stressed) {
          // +40% duration on nucleus, +15% elsewhere; +~3dB amplitude
          durMult[i] *= (i === syl.nucleusIdx) ? 1.42 : 1.15;
          ampMult[i] *= 1.35;
        }
        if (final && (i === syl.nucleusIdx || syl.coda.includes(i))) {
          durMult[i] *= 1.22; // word-final lengthening
        }
      }
    }

    // --- Segment plan ---
    const LEAD = 0.018, TRAIL = 0.03;
    const segs = [{ dur: LEAD, p: this._frame(), phoneIdx: -1 }];
    for (let i = 0; i < phones.length; i++) {
      const sub = this._phoneSegments(
        phones[i], phones[i - 1] || null, phones[i + 1] || null,
        { amp: ampMult[i], dur: durMult[i] }
      );
      for (const sg of sub) {
        segs.push({ ...sg, dur: sg.dur / rate, phoneIdx: i });
      }
    }
    segs.push({ dur: TRAIL, p: this._frame(), phoneIdx: -1 });

    // --- Timeline + control points (linear coarticulation ramps) ---
    let t = 0;
    const pts = [];
    const phoneTimes = phones.map((p) => ({
      ipa: p.ipa, roman: p.roman, manner: p.manner, start: 0, duration: 0,
    }));
    for (const seg of segs) {
      const t0 = t, t1 = t + seg.dur;
      const tIn = seg.abruptIn ? 0.0015 : Math.min(0.022, seg.dur * 0.35);
      const tOut = seg.abruptOut ? 0.0015 : Math.min(0.022, seg.dur * 0.35);
      pts.push({ t: Math.min(t0 + tIn, t1), ...seg.p });
      if (t1 - tOut > t0 + tIn + 1e-4) pts.push({ t: t1 - tOut, ...seg.p });
      if (seg.phoneIdx >= 0) {
        const pt = phoneTimes[seg.phoneIdx];
        if (pt.duration === 0) pt.start = t0;
        pt.duration += seg.dur;
      }
      t = t1;
    }
    const total = t;

    // --- F0 contour: declination × stress × tone × boundary ---
    const decl = (x) => 1.06 - 0.13 * (x / total);
    const f0pts = [{ t: 0, v: baseF0 * decl(0) }];
    for (let s = 0; s < syllables.length; s++) {
      const syl = syllables[s];
      if (syl.nucleusIdx < 0) continue;
      const nuc = phoneTimes[syl.nucleusIdx];
      // Tone domain = nucleus through coda end
      let tEnd = nuc.start + nuc.duration;
      if (syl.coda.length > 0) {
        const last = phoneTimes[syl.coda[syl.coda.length - 1]];
        tEnd = last.start + last.duration;
      }
      const sm = s === stressIdx ? 1.13 : 1.0;
      const shape = tones[s];
      if (shape) {
        for (let k = 0; k < shape.length; k++) {
          const tk = nuc.start + (tEnd - nuc.start) * (shape.length > 1 ? k / (shape.length - 1) : 0.5);
          f0pts.push({ t: tk, v: baseF0 * decl(tk) * sm * this._toneLevelToMult(shape[k]) });
        }
      } else {
        const tm = (nuc.start + tEnd) / 2;
        f0pts.push({ t: tm, v: baseF0 * decl(tm) * sm });
      }
    }
    // Final boundary contour (statement fall / question rise)
    const contour = opts.finalContour ?? 'fall';
    const lastV = f0pts[f0pts.length - 1].v;
    if (contour === 'rise') f0pts.push({ t: total, v: lastV * 1.32 });
    else if (contour === 'fall') f0pts.push({ t: total, v: lastV * 0.82 });
    else f0pts.push({ t: total, v: lastV * decl(total) });
    f0pts.sort((a, b) => a.t - b.t);

    const samples = this._synthesize(pts, f0pts, total, rng);
    return { samples, phoneTimes };
  }

  // -------------------------------------------------------------------------
  // Private: DSP core
  // -------------------------------------------------------------------------

  /** Two-pole resonator coefficients (Klatt-style). */
  _resCoef(f, bw, out) {
    const sr = this.sampleRate;
    const fc = Math.min(Math.max(f, 50), sr * 0.45);
    const b = Math.min(Math.max(bw, 40), 8000);
    const r = Math.exp(-Math.PI * b / sr);
    const C = -(r * r);
    const B = 2 * r * Math.cos(TWO_PI * fc / sr);
    out[0] = 1 - B - C;
    out[1] = B;
    out[2] = C;
  }

  _polyblep(t, dt) {
    if (t < dt) {
      const x = t / dt;
      return x + x - x * x - 1;
    }
    if (t > 1 - dt) {
      const x = (t - 1) / dt;
      return x * x + x + x + 1;
    }
    return 0;
  }

  /** Linear interpolation across control points (pointer pre-advanced). */
  _lerpParams(pts, idx, t, out) {
    const a = pts[idx];
    const b = pts[Math.min(idx + 1, pts.length - 1)];
    const span = b.t - a.t;
    const w = span > 1e-9 ? Math.max(0, Math.min(1, (t - a.t) / span)) : 0;
    for (const k of AudioForge._PARAM_KEYS) {
      out[k] = a[k] + (b[k] - a[k]) * w;
    }
  }

  /**
   * The synthesizer inner loop: glottal sawtooth source with jitter/shimmer +
   * seeded noise, routed through a nasal antiresonator and a 4-resonator
   * cascade, plus a parallel place-shaped frication resonator.
   */
  _synthesize(pts, f0pts, totalSec, rng) {
    const sr = this.sampleRate;
    const N = Math.max(1, Math.round(totalSec * sr));
    const out = new Float32Array(N);

    // Filter states
    let r1y1 = 0, r1y2 = 0, r2y1 = 0, r2y2 = 0, r3y1 = 0, r3y2 = 0, r4y1 = 0, r4y2 = 0;
    let nzx1 = 0, nzx2 = 0;       // nasal zero (antiresonator) input history
    let nry1 = 0, nry2 = 0;       // frication resonator
    let tilt = 0;                 // one-pole source tilt
    let noisePrev = 0;
    let phase = 0;
    let jitter = 1, shimmer = 1;
    let pi = 0, fi = 0;

    const c = [0, 0, 0];          // scratch coefficient array
    const c4 = [0, 0, 0];
    this._resCoef(3400, 350, c4); // fixed high resonator
    const A4 = c4[0], B4 = c4[1], C4 = c4[2];
    const p = {};                  // scratch param frame

    for (let n = 0; n < N; n++) {
      const t = n / sr;
      while (pi < pts.length - 2 && t >= pts[pi + 1].t) pi++;
      while (fi < f0pts.length - 2 && t >= f0pts[fi + 1].t) fi++;
      this._lerpParams(pts, pi, t, p);

      // F0 with per-period jitter
      const fa = f0pts[fi], fb = f0pts[Math.min(fi + 1, f0pts.length - 1)];
      const fspan = fb.t - fa.t;
      const fw = fspan > 1e-9 ? Math.max(0, Math.min(1, (t - fa.t) / fspan)) : 0;
      const f0 = Math.max(40, (fa.v + (fb.v - fa.v) * fw)) * jitter;

      // Glottal source: polyBLEP sawtooth + gentle low-pass tilt
      const dt = f0 / sr;
      phase += dt;
      if (phase >= 1) {
        phase -= 1;
        jitter = 1 + (rng.next() * 2 - 1) * 0.018;
        shimmer = 1 + (rng.next() * 2 - 1) * 0.07;
      }
      const saw = 2 * phase - 1 - this._polyblep(phase, dt);
      tilt += 0.42 * (saw - tilt);
      let voiced = tilt * p.AV * shimmer;
      if (p.TR > 0.5) voiced *= 0.55 + 0.45 * Math.sin(TWO_PI * p.TR * t);

      // Noise sources (deterministic)
      const noise = rng.next() * 2 - 1;
      const dnoise = noise - noisePrev; // +6dB/oct pre-emphasis for frication
      noisePrev = noise;
      const pulseEnv = 0.6 + 0.4 * Math.cos(TWO_PI * phase);
      let asp = noise * p.AH;
      if (p.AV > 0.05) asp *= pulseEnv; // breathy modulation when voiced

      let x = voiced * 0.9 + asp * 0.6;

      // Nasal antiresonance (zero), approximating the nasal side branch
      if (p.NZ > 150) {
        this._resCoef(p.NZ, 380, c);
        const ia = 1 / c[0], ib = -c[1] / c[0], ic = -c[2] / c[0];
        const y = ia * x + ib * nzx1 + ic * nzx2;
        nzx2 = nzx1; nzx1 = x; x = y * 0.6;
      } else {
        nzx2 = nzx1; nzx1 = x;
      }

      // Cascade: F4(fixed) → F3 → F2 → F1
      let y = A4 * x + B4 * r4y1 + C4 * r4y2; r4y2 = r4y1; r4y1 = y;
      this._resCoef(p.F3, p.B3, c);
      y = c[0] * y + c[1] * r3y1 + c[2] * r3y2; r3y2 = r3y1; r3y1 = y;
      this._resCoef(p.F2, p.B2, c);
      y = c[0] * y + c[1] * r2y1 + c[2] * r2y2; r2y2 = r2y1; r2y1 = y;
      this._resCoef(p.F1, p.B1, c);
      y = c[0] * y + c[1] * r1y1 + c[2] * r1y2; r1y2 = r1y1; r1y1 = y;

      // Parallel frication path (bypasses the cascade)
      this._resCoef(p.FC, p.FB, c);
      let fr = c[0] * dnoise * 2 + c[1] * nry1 + c[2] * nry2;
      nry2 = nry1; nry1 = fr;
      fr *= p.AF;
      if (p.AV > 0.05) fr *= 0.72 + 0.28 * pulseEnv; // voiced-fricative buzz coupling

      out[n] = y + fr * 2.4;
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Private: post-processing
  // -------------------------------------------------------------------------

  _normalize(samples, peak = 0.8) {
    let max = 0;
    for (let i = 0; i < samples.length; i++) {
      const a = Math.abs(samples[i]);
      if (a > max) max = a;
    }
    if (max > 1e-9) {
      const g = peak / max;
      for (let i = 0; i < samples.length; i++) samples[i] *= g;
    }
  }

  _applyFades(samples) {
    const sr = this.sampleRate;
    const fadeIn = Math.min(Math.round(0.006 * sr), samples.length >> 1);
    const fadeOut = Math.min(Math.round(0.014 * sr), samples.length >> 1);
    for (let i = 0; i < fadeIn; i++) samples[i] *= i / fadeIn;
    for (let i = 0; i < fadeOut; i++) {
      samples[samples.length - 1 - i] *= i / fadeOut;
    }
  }
}

AudioForge._PARAM_KEYS = ['AV', 'AH', 'AF', 'F1', 'F2', 'F3', 'B1', 'B2', 'B3', 'FC', 'FB', 'NZ', 'TR'];

export default AudioForge;
