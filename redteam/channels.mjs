/**
 * GLOSSOPETRAE Red-Team — Encoding Channels
 *
 * A uniform interface over the obfuscation primitives GLOSSOPETRAE already
 * ships. Each channel is an { encode, decode } pair that transports a text
 * payload through a transformation a naive content filter does not normalize.
 *
 * Research purpose only. These wrap the SAME mechanisms studied in the
 * published low-resource-language / cipher / token-manipulation jailbreak
 * literature, exposed here so safety researchers can MEASURE whether a
 * model's safety behavior survives the transform (see safety-eval-harness).
 *
 * Everything here is content-agnostic transport. The PoC drives it with a
 * benign sentinel; no harmful payloads are authored or required.
 */

import { Glossopetrae } from '../src/Glossopetrae.js';
import { TokenExploiter } from '../src/modules/TokenExploiter.js';
import { HOMOGLYPHS } from '../src/modules/LanguageAttributes.js';

// Zero-width / invisible code points used by the token-manipulation channels.
const ZW = ['​', '‌', '‍', '⁠', '﻿'];
const ZW_RE = /[​‌‍⁠﻿︀-️҉]/g;

// Build a reverse homoglyph map (confusable → ASCII) for normalization/decoding.
const CONFUSABLE_TO_ASCII = (() => {
  const map = new Map();
  for (const [ascii, alts] of Object.entries(HOMOGLYPHS)) {
    for (const alt of alts) map.set(alt, ascii);
    map.set(ascii.toUpperCase(), ascii.toUpperCase());
  }
  // A few uppercase Latin↔Cyrillic/Greek confusables for completeness
  const UPPER = { А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', Ѕ: 'S', Ι: 'I', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y' };
  for (const [c, a] of Object.entries(UPPER)) map.set(c, a);
  return map;
})();

const UPPER_CONFUSABLES = { A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', X: 'Х', Y: 'Υ', I: 'Ι' };

/**
 * Channel: plaintext (identity) — the control.
 */
export const plaintext = {
  id: 'plaintext',
  name: 'Plaintext (control)',
  encode: (text) => text,
  decode: (text) => text,
};

/**
 * Channel: homoglyph substitution. Replaces Latin letters with
 * visually-identical Cyrillic/Greek code points. Human- and model-legible,
 * invisible to exact-match keyword filters.
 */
export const homoglyph = {
  id: 'homoglyph',
  name: 'Homoglyph substitution (Cyrillic/Greek)',
  encode(text) {
    let out = '';
    for (const ch of text) {
      if (UPPER_CONFUSABLES[ch]) out += UPPER_CONFUSABLES[ch];
      else if (HOMOGLYPHS[ch.toLowerCase()] && ch === ch.toLowerCase()) out += HOMOGLYPHS[ch][0];
      else out += ch;
    }
    return out;
  },
  decode(text) {
    let out = '';
    for (const ch of text) out += CONFUSABLE_TO_ASCII.get(ch) ?? ch;
    return out;
  },
};

/**
 * Channel: token-break. Injects zero-width joiners/spaces and variation
 * selectors inside words, splitting BPE tokens and breaking substring filters
 * while remaining visually unchanged.
 */
export const tokenbreak = {
  id: 'tokenbreak',
  name: 'Token-break (zero-width + variation selectors)',
  _engine: null,
  _te() {
    if (!this._engine) {
      const l = Glossopetrae.quick(20260601);
      this._engine = new TokenExploiter(l.random);
    }
    return this._engine;
  },
  encode(text) {
    // Insert a zero-width char between every pair of word-internal characters.
    let out = '';
    for (let i = 0; i < text.length; i++) {
      out += text[i];
      const a = text[i], b = text[i + 1];
      if (b && /\w/.test(a) && /\w/.test(b)) out += ZW[(i * 7) % ZW.length];
    }
    return out;
  },
  decode: (text) => text.replace(ZW_RE, ''),
};

/**
 * Channel: conlang translation. Translates the request into a GLOSSOPETRAE
 * constructed language — a novel symbol system outside any model's safety
 * training distribution — and back. This is the engine's headline mechanism
 * and the direct analogue of low-resource-language jailbreaks, except the
 * "language" is generated and shared by seed.
 */
export function conlang(seed = 1337) {
  const lang = Glossopetrae.quick(seed);
  return {
    id: `conlang:${seed}`,
    name: `Conlang translation (${lang.name}, seed ${seed})`,
    lang,
    encode: (text) => lang.translationEngine.translateToConlang(text).target,
    decode: (text) => lang.translateToEnglish(text).english,
  };
}

/**
 * Channel: glyph rendering. Renders the request in the language's procedurally
 * generated writing system as SVG paths — there is NO text for a text-based
 * filter to read at all. Decoding requires OCR/vision. Returns the SVG as the
 * "encoded" payload; decode is not lossless here (vision-only), so we expose a
 * `legibleAs` hint carrying the romanized source for the harness to score
 * comprehension separately.
 */
export function glyph(seed = 1337) {
  const lang = Glossopetrae.quick(seed);
  return {
    id: `glyph:${seed}`,
    name: `Glyph render (${lang.name} script → SVG)`,
    lang,
    visual: true,
    encode(text) {
      const conlangForm = lang.translationEngine.translateToConlang(text).target;
      return lang.glyphForge.renderText(conlangForm, { maxWidth: 1200 });
    },
    // Not text-recoverable without vision; provided for completeness.
    decode: () => '[visual channel — requires OCR/vision to decode]',
  };
}

export function allTextChannels(seed = 1337) {
  return [plaintext, homoglyph, tokenbreak, conlang(seed)];
}
