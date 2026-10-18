/**
 * GLOSSOPETRAE - Name Forge Module
 *
 * Procedural name generator for worldbuilders. Forges person names,
 * place names and an endonym (native name) for the language itself by
 * compounding semantically name-worthy lexicon roots ("bright" + "wolf",
 * "stone" + "river") with phonotactic repair at morpheme seams.
 *
 * Properties:
 *   - Deterministic: seeded from language.seed (with a fixed module
 *     offset) via SeededRandom; a fresh NameForge over the same language
 *     produces the same sequence of names.
 *   - Phonotactically safe: consonant-consonant seams are repaired with
 *     simple vowel epenthesis using the language's most common vowel;
 *     identical-vowel seams are degeminated.
 *   - Meaning-bearing: every name carries a `meaning` and `components`
 *     list referencing real lexicon glosses.
 *
 * Zero dependencies. Pure ESM. No DOM, no fs.
 */

import { SeededRandom, hashString } from '../utils/random.js';

/** Semantic fields whose entries make good name material. */
const NAME_FIELDS = [
  'Nature', 'Animals', 'Plants', 'Materials',
  'Properties', 'Qualities', 'HumanQualities', 'Colors',
  'Warfare', 'Religion', 'Supernatural', 'NaturalPhenomena',
];

/** Glosses that are especially name-worthy (boosted in selection). */
const HEROIC_GLOSSES = new Set([
  'wolf', 'bear', 'eagle', 'hawk', 'lion', 'raven', 'crow', 'horse',
  'bright', 'dark', 'strong', 'brave', 'proud', 'wise', 'true', 'good',
  'old', 'new', 'big', 'first', 'wild', 'holy', 'sacred',
  'stone', 'iron', 'gold', 'silver', 'fire', 'star', 'moon', 'sun',
  'sky', 'storm', 'wind', 'rain', 'snow', 'river', 'sea', 'mountain',
  'shadow', 'light', 'dawn', 'night', 'day', 'ash', 'oak', 'thorn',
  'shield', 'spear', 'sword', 'crown', 'king', 'war', 'glory',
  'red', 'black', 'white', 'blue', 'green', 'spirit', 'soul', 'heart',
]);

/** Geographic head nouns by place feature (first existing gloss wins). */
const GEO_HEADS = {
  river: ['river', 'water', 'lake'],
  mountain: ['mountain', 'hill', 'stone'],
  city: ['city', 'village', 'house', 'home'],
  forest: ['forest', 'tree', 'valley'],
  sea: ['sea', 'island', 'water'],
};

const PLACE_FEATURES = Object.keys(GEO_HEADS);

export class NameForge {
  /**
   * @param {object} language - A generated GLOSSOPETRAE language object.
   *   Requires language.seed, language.phonology and language.lexicon.
   */
  constructor(language) {
    if (!language || !language.lexicon || !Array.isArray(language.lexicon.entries)) {
      throw new Error('NameForge requires a language with a lexicon');
    }
    this.language = language;
    this.lexicon = language.lexicon;

    // Independent RNG stream: derived from the language seed plus a fixed
    // module offset so NameForge never perturbs (or depends on) the shared
    // language.random state.
    this._random = new SeededRandom(hashString(`${language.seed}:nameforge:v1`));

    this._buildPhonologyHelpers();
    this._buildPools();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Forge a person name.
   *
   * @param {object} [opts]
   * @param {'any'|'female'|'male'} [opts.gender='any'] - Shapes the final
   *   vowel of the name using the language's own vowel inventory.
   * @param {'simple'|'compound'} [opts.style] - simple = one root,
   *   compound = two roots joined with seam repair. Defaults to a seeded
   *   choice biased toward compounds.
   * @returns {{name: string, meaning: string, components: Array<{form: string, gloss: string}>, gender: string, style: string}}
   */
  personName(opts = {}) {
    const gender = opts.gender || 'any';
    const style = opts.style || (this._random.bool(0.65) ? 'compound' : 'simple');

    let roots;
    if (style === 'compound' && this._shortRoots.length >= 2) {
      roots = this._pickCompoundRoots(this._shortRoots);
    } else {
      roots = [this._pickRoot(this._rootPool)];
    }

    let form = this._joinRoots(roots.map((r) => r.lemma));
    form = this._applyGender(form, gender);
    form = this._fitLength(form, roots);

    return {
      name: this._capitalize(form),
      meaning: roots.map((r) => r.gloss).join('-'),
      components: roots.map((r) => ({ form: r.lemma, gloss: r.gloss })),
      gender,
      style: roots.length > 1 ? 'compound' : 'simple',
    };
  }

  /**
   * Forge a place name: a descriptive root plus a geographic head noun
   * (mountain, water, town...), ordered by the language's adjective
   * position.
   *
   * @param {object} [opts]
   * @param {'any'|'river'|'mountain'|'city'|'forest'|'sea'} [opts.feature='any']
   * @returns {{name: string, meaning: string, components: Array<{form: string, gloss: string}>, feature: string}}
   */
  placeName(opts = {}) {
    let feature = opts.feature || 'any';
    if (feature === 'any' || !GEO_HEADS[feature]) {
      feature = this._random.pick(PLACE_FEATURES);
    }

    const head = this._pickGeoHead(feature);
    const modifier = this._pickRoot(
      this._rootPool.filter((r) => r.gloss !== head.gloss),
    );

    // Modifier-head order follows the language's adjective placement
    // ("after" => head-initial, e.g. Mont-Blanc; otherwise head-final,
    // e.g. Black-water).
    const headInitial = this._adjectivePosition === 'after';
    const ordered = headInitial ? [head, modifier] : [modifier, head];

    let form = this._joinRoots(ordered.map((r) => r.lemma));
    form = this._fitLength(form, ordered);

    return {
      name: this._capitalize(form),
      meaning: `${modifier.gloss}-${head.gloss}`,
      components: ordered.map((r) => ({ form: r.lemma, gloss: r.gloss })),
      feature,
    };
  }

  /**
   * Batch generation.
   * @param {'person'|'place'} kind
   * @param {number} [count=10]
   * @param {object} [opts] - Forwarded to personName/placeName.
   * @returns {Array<object>}
   */
  generate(kind, count = 10, opts = {}) {
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push(kind === 'place' ? this.placeName(opts) : this.personName(opts));
    }
    return out;
  }

  /**
   * Forge a plausible endonym for the language itself, built from native
   * roots for speech ("tongue", "word", "speak") optionally qualified by
   * a dignifying modifier ("true", "old", "sacred"...).
   *
   * @returns {{name: string, meaning: string, components: Array<{form: string, gloss: string}>}}
   */
  nameLanguage() {
    const speechRoot = this._firstExisting(['tongue', 'word', 'speak', 'say', 'sound'])
      || this._pickRoot(this._rootPool);

    const modifier = this._firstExisting(['true', 'old', 'sacred', 'holy', 'good', 'bright', 'first']);

    if (!modifier || this._random.bool(0.3)) {
      // Bare speech root, possibly lengthened to feel like a proper noun.
      let form = this._fitLength(speechRoot.lemma, [speechRoot]);
      return {
        name: this._capitalize(form),
        meaning: `the ${speechRoot.gloss}`,
        components: [{ form: speechRoot.lemma, gloss: speechRoot.gloss }],
      };
    }

    const headInitial = this._adjectivePosition === 'after';
    const ordered = headInitial ? [speechRoot, modifier] : [modifier, speechRoot];

    let form = this._joinRoots(ordered.map((r) => r.lemma));
    form = this._fitLength(form, ordered);

    return {
      name: this._capitalize(form),
      meaning: `the ${modifier.gloss} ${speechRoot.gloss}`,
      components: ordered.map((r) => ({ form: r.lemma, gloss: r.gloss })),
    };
  }

  // ============================================
  // ROOT POOLS
  // ============================================

  /**
   * Build candidate root pools from the lexicon.
   * @private
   */
  _buildPools() {
    const entries = this.lexicon.entries || [];

    const clean = (e) =>
      e && typeof e.lemma === 'string' && typeof e.gloss === 'string' &&
      /^[a-zà-öø-ÿāăēĕīĭōŏūŭ]/i.test(e.lemma) &&            // starts with a letter
      !/[\s/()]/.test(e.gloss) &&                            // single-word gloss
      this._syllableCount(e.lemma) >= 1 &&
      this._syllableCount(e.lemma) <= 3;

    const nameWorthy = entries.filter(
      (e) =>
        clean(e) &&
        (e.class === 'noun' || e.class === 'adjective') &&
        (NAME_FIELDS.includes(e.field) || HEROIC_GLOSSES.has(e.gloss)),
    );

    // Boost heroic glosses by listing them twice (seeded picks then favor
    // them ~2:1 without excluding the long tail).
    this._rootPool = [];
    for (const e of nameWorthy) {
      this._rootPool.push(e);
      if (HEROIC_GLOSSES.has(e.gloss)) this._rootPool.push(e);
    }

    this._shortRoots = this._rootPool.filter((e) => this._syllableCount(e.lemma) <= 2);

    // Fallbacks for degenerate lexicons.
    if (this._rootPool.length === 0) {
      this._rootPool = entries.filter(clean);
    }
    if (this._shortRoots.length < 2) {
      this._shortRoots = this._rootPool;
    }

    // Geographic head nouns, resolved once.
    this._geoHeads = {};
    for (const [feature, glosses] of Object.entries(GEO_HEADS)) {
      const heads = [];
      for (const gloss of glosses) {
        const entry = this._lookup(gloss);
        if (entry && clean(entry)) heads.push(entry);
      }
      this._geoHeads[feature] = heads;
    }

    // Word-order facts used for compound ordering.
    const wo = this.language.morphology && this.language.morphology.wordOrder;
    this._adjectivePosition = (wo && wo.adjectivePosition) || 'before';
  }

  /**
   * Look up a lexicon entry by English gloss.
   * @private
   */
  _lookup(gloss) {
    if (typeof this.lexicon.lookup === 'function') {
      return this.lexicon.lookup(gloss) || null;
    }
    return (this.lexicon.entries || []).find((e) => e.gloss === gloss) || null;
  }

  /**
   * First lexicon entry whose gloss exists, in preference order.
   * @private
   */
  _firstExisting(glosses) {
    for (const gloss of glosses) {
      const entry = this._lookup(gloss);
      if (entry && typeof entry.lemma === 'string' && /^[a-z]/i.test(entry.lemma)) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Seeded pick of one root from a pool.
   * @private
   */
  _pickRoot(pool) {
    if (!pool || pool.length === 0) {
      // Absolute fallback: synthesize from the vowel inventory.
      return { lemma: this._epentheticVowel + this._epentheticVowel, gloss: 'name' };
    }
    return this._random.pick(pool);
  }

  /**
   * Pick two distinct roots for a compound.
   * @private
   */
  _pickCompoundRoots(pool) {
    const first = this._pickRoot(pool);
    let second = this._pickRoot(pool);
    let guard = 0;
    while (second.gloss === first.gloss && guard < 10) {
      second = this._pickRoot(pool);
      guard++;
    }
    // Adjectives read better as modifiers: put an adjective first.
    if (second.class === 'adjective' && first.class !== 'adjective') {
      return [second, first];
    }
    return [first, second];
  }

  /**
   * Pick a geographic head noun for a feature.
   * @private
   */
  _pickGeoHead(feature) {
    const heads = this._geoHeads[feature];
    if (heads && heads.length > 0) {
      return this._random.pick(heads);
    }
    // No native head noun: fall back to any Nature noun, then any root.
    const nature = this._rootPool.filter((e) => e.field === 'Nature' && e.class === 'noun');
    return this._pickRoot(nature.length > 0 ? nature : this._rootPool);
  }

  // ============================================
  // PHONOLOGY HELPERS
  // ============================================

  /**
   * Precompute vowel/consonant character sets, the epenthetic vowel and
   * gender-shaping vowels from the language's phonology and lexicon.
   * @private
   */
  _buildPhonologyHelpers() {
    const phonology = this.language.phonology || {};
    const vowels = phonology.vowels || [];

    this._vowelChars = new Set();
    const vowelRomans = [];
    for (const v of vowels) {
      const roman = typeof v.roman === 'string' && v.roman.length > 0 ? v.roman : v.ipa;
      if (typeof roman === 'string' && roman.length > 0) {
        vowelRomans.push(roman);
        for (const ch of roman) this._vowelChars.add(ch.toLowerCase());
      }
    }
    if (this._vowelChars.size === 0) {
      for (const ch of 'aeiou') this._vowelChars.add(ch);
      vowelRomans.push('a', 'e', 'i', 'o', 'u');
    }

    // Epenthetic vowel = most frequent vowel character across lexicon lemmas.
    const counts = new Map();
    const entries = (this.language.lexicon && this.language.lexicon.entries) || [];
    for (const e of entries) {
      if (typeof e.lemma !== 'string') continue;
      for (const ch of e.lemma.toLowerCase()) {
        if (this._vowelChars.has(ch)) {
          counts.set(ch, (counts.get(ch) || 0) + 1);
        }
      }
    }
    let best = null;
    for (const [ch, n] of counts) {
      if (!best || n > best.n) best = { ch, n };
    }
    this._epentheticVowel = best ? best.ch : vowelRomans[0][0];

    // Gender-shaping finals chosen from the language's own inventory.
    const has = (ch) => this._vowelChars.has(ch);
    this._femaleVowel = has('a') ? 'a' : has('i') ? 'i' : has('e') ? 'e' : this._epentheticVowel;
    this._maleVowel = has('o') ? 'o' : has('u') ? 'u' : this._epentheticVowel;
  }

  /**
   * Is this character a vowel in the language's romanization?
   * @private
   */
  _isVowelChar(ch) {
    return this._vowelChars.has(String(ch).toLowerCase());
  }

  /**
   * Approximate syllable count of a romanized form (vowel-run count).
   * @private
   */
  _syllableCount(form) {
    if (typeof form !== 'string' || form.length === 0) return 0;
    let count = 0;
    let inVowel = false;
    for (const ch of form.toLowerCase()) {
      const isV = this._isVowelChar(ch);
      if (isV && !inVowel) count++;
      inVowel = isV;
    }
    return count;
  }

  /**
   * Join roots with phonotactic repair at each seam:
   *   consonant + consonant -> insert the epenthetic vowel
   *   vowel + same vowel    -> degeminate (drop one)
   * @private
   */
  _joinRoots(lemmas) {
    let result = lemmas[0] || '';
    for (let i = 1; i < lemmas.length; i++) {
      const next = lemmas[i];
      if (!next) continue;
      if (result.length === 0) {
        result = next;
        continue;
      }
      const last = result[result.length - 1];
      const first = next[0];

      if (!this._isVowelChar(last) && !this._isVowelChar(first) && first !== "'") {
        result += this._epentheticVowel + next;
      } else if (this._isVowelChar(last) && last.toLowerCase() === first.toLowerCase()) {
        result += next.slice(1);
      } else {
        result += next;
      }
    }
    return result;
  }

  /**
   * Shape the final of a name toward a gendered vowel, using vowels from
   * the language's own inventory. 'any' leaves the form untouched.
   * @private
   */
  _applyGender(form, gender) {
    if (gender !== 'female' && gender !== 'male') return form;
    const target = gender === 'female' ? this._femaleVowel : this._maleVowel;
    if (form.length === 0) return target;

    const last = form[form.length - 1];
    if (last.toLowerCase() === target) return form;

    if (this._isVowelChar(last)) {
      // Replace the final vowel.
      return form.slice(0, -1) + target;
    }
    // Final consonant: male names may keep it, female names take the vowel.
    if (gender === 'male' && this._random.bool(0.5)) return form;
    return form + target;
  }

  /**
   * Keep names within a reasonable 2-4 syllable envelope.
   * Too short: append the epenthetic vowel as a filler final.
   * Too long: rebuild from the first root (plus a vowel if needed).
   * @private
   */
  _fitLength(form, roots) {
    let result = form;

    if (this._syllableCount(result) > 4 && roots.length > 1) {
      // Truncate to the head root alone.
      result = roots[roots.length - 1].lemma;
    }
    let guard = 0;
    while (this._syllableCount(result) < 2 && guard < 3) {
      const last = result[result.length - 1] || '';
      result += this._isVowelChar(last)
        ? this._consonantFiller() + this._epentheticVowel
        : this._epentheticVowel;
      guard++;
    }
    return result;
  }

  /**
   * A common single-letter consonant of the language, for filler syllables.
   * @private
   */
  _consonantFiller() {
    const consonants = (this.language.phonology && this.language.phonology.consonants) || [];
    const simple = consonants.filter(
      (c) => typeof c.roman === 'string' && c.roman.length === 1 && /[a-z]/.test(c.roman),
    );
    if (simple.length === 0) return 'n';
    // Deterministic: highest cross-linguistic frequency wins.
    let best = simple[0];
    for (const c of simple) {
      if ((c.freq || 0) > (best.freq || 0)) best = c;
    }
    return best.roman;
  }

  /**
   * Capitalize the first alphabetic character of a romanized form.
   * @private
   */
  _capitalize(form) {
    if (typeof form !== 'string' || form.length === 0) return form;
    for (let i = 0; i < form.length; i++) {
      const ch = form[i];
      if (ch.toLowerCase() !== ch.toUpperCase()) {
        return form.slice(0, i) + ch.toUpperCase() + form.slice(i + 1);
      }
    }
    return form;
  }
}

export default NameForge;
