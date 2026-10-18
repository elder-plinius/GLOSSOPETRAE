/**
 * GLOSSOPETRAE - Text Library Module
 *
 * Canonical conlang showcase texts. Every serious constructed language
 * is presented through a small set of standard texts that the conlang
 * community uses to compare phonology, morphology and syntax across
 * languages. This module renders those texts into a generated language
 * via its TranslationEngine, sentence by sentence, with interlinear
 * glosses.
 *
 * Included texts:
 *   babel      - Tower of Babel (Genesis 11:1-9), the #1 showcase text
 *   northwind  - The North Wind and the Sun (Aesop / IPA standard text)
 *   udhr1      - Universal Declaration of Human Rights, Article 1
 *   schleicher - Schleicher's Fable (The Sheep and the Horses)
 *   colorless  - Famous linguistically-significant sentences
 *   pliny      - Flavor text from/about Pliny the Elder
 *
 * English source sentences are deliberately SIMPLIFIED toward the
 * ~1358 concepts available in src/data/semantics.js so that as much
 * of each text as possible translates from the native lexicon rather
 * than via loanword fallback.
 *
 * Zero dependencies. Pure ESM. No DOM, no fs. Deterministic: the
 * module itself uses no randomness; output depends only on the
 * language object passed in.
 */

/**
 * Canonical text definitions.
 * Each sentence is fed independently to translateToConlang().
 */
const CANONICAL_TEXTS = [
  {
    id: 'babel',
    title: 'The Tower of Babel',
    category: 'scripture',
    note:
      'Genesis 11:1-9, simplified. The single most common conlang showcase ' +
      'text; "language" is rendered as "tongue" and "bricks" as "stones" to ' +
      'fit the core concept inventory.',
    sentences: [
      'All the earth had one tongue and the same words.',
      'The people walked far and found a wide land.',
      'They said: come, let us make stones and burn them.',
      'They said: come, let us build a city and a big tower that touches the sky.',
      'Let us make a name for ourselves.',
      'The lord came down and saw the city and the tower.',
      'The lord said: they are one people, and they all have one tongue.',
      'Come, let us go down and break their tongue.',
      'The lord sent them far over all the earth, and they stopped building the city.',
    ],
  },
  {
    id: 'northwind',
    title: 'The North Wind and the Sun',
    category: 'fable',
    note:
      "Aesop's fable, the standard phonetic showcase text of the IPA. " +
      '"North wind" is simplified to "cold wind" and "take off" to "drop" ' +
      'for lexicon coverage.',
    sentences: [
      'The cold wind and the sun fought about who was stronger.',
      'A man came walking on the road in a warm cloak.',
      'They said: who first makes the man drop his cloak, he is the stronger.',
      'The cold wind blew with all his power, but the man held his cloak close.',
      'Then the sun shone warm, and the man dropped his cloak fast.',
      'So the cold wind said: you are stronger than I.',
    ],
  },
  {
    id: 'udhr1',
    title: 'Universal Declaration of Human Rights, Article 1',
    category: 'declaration',
    note:
      'UDHR Article 1, the most-translated text in the world. "Dignity" is ' +
      'rendered as "honor" and "in a spirit of brotherhood" as "as brothers".',
    sentences: [
      'All people are born free and have the same honor and the same rights.',
      'They have reason and a good heart, and they should meet each other as brothers.',
    ],
  },
  {
    id: 'schleicher',
    title: "Schleicher's Fable (The Sheep and the Horses)",
    category: 'fable',
    note:
      'The classic Indo-Europeanist test text (1868), simplified. "Pains me" ' +
      'is rendered with "my heart is heavy" and "garment" as "warm clothes".',
    sentences: [
      'A sheep that had no wool saw horses.',
      'One horse pulled a heavy cart.',
      'One horse carried a big weight.',
      'One horse carried a man fast.',
      'The sheep said: my heart is heavy when I see a man take horses.',
      'The horses said: listen, sheep! Our heart is heavy when a man takes the wool of the sheep for warm clothes.',
      'When the sheep heard this, it ran into the field.',
    ],
  },
  {
    id: 'colorless',
    title: 'Famous Sentences',
    category: 'linguistics',
    note:
      "Chomsky's grammatical-but-meaningless sentence, a simplified Buffalo " +
      'sentence, and the classic garden-path sentence "The old man the boat."',
    sentences: [
      'Colorless green ideas sleep furiously.',
      'Wolves that wolves fight also fight wolves.',
      'The old man the boat.',
    ],
  },
  {
    id: 'pliny',
    title: 'Words of Pliny the Elder',
    category: 'flavor',
    note:
      'Three sayings from or about Pliny the Elder. "True glory consists in ' +
      'deeds" is rendered as "true glory comes from what we do".',
    sentences: [
      'Fortune favors the brave.',
      'In wine there is truth.',
      'True glory comes from what we do.',
    ],
  },
];

export class TextLibrary {
  /**
   * @param {object} language - A generated GLOSSOPETRAE language object.
   *   Must expose language.translationEngine.translateToConlang(english).
   */
  constructor(language) {
    if (!language || !language.translationEngine ||
        typeof language.translationEngine.translateToConlang !== 'function') {
      throw new Error('TextLibrary requires a language with a translationEngine');
    }
    this.language = language;
    this.engine = language.translationEngine;

    /** @type {Map<string, object>} Cache of rendered texts by id. */
    this._cache = new Map();
  }

  /**
   * List available texts without rendering translations.
   * @returns {Array<{id: string, title: string, category: string, sentenceCount: number}>}
   */
  list() {
    return CANONICAL_TEXTS.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      sentenceCount: t.sentences.length,
    }));
  }

  /**
   * Render all canonical texts into the language.
   * @returns {Array<object>} Array of rendered text objects (see getText).
   */
  getTexts() {
    return CANONICAL_TEXTS.map((t) => this.getText(t.id));
  }

  /**
   * Render one canonical text into the language.
   *
   * @param {string} id - One of: babel, northwind, udhr1, schleicher, colorless, pliny.
   * @returns {object|null} {
   *   id, title, category,
   *   english: [...source sentences],
   *   lines: [{english, conlang, gloss} | {english, error}],
   *   note,
   *   stats: {sentences, translated, failed}
   * } or null when the id is unknown.
   */
  getText(id) {
    if (this._cache.has(id)) {
      return this._cache.get(id);
    }

    const def = CANONICAL_TEXTS.find((t) => t.id === id);
    if (!def) {
      return null;
    }

    const lines = def.sentences.map((sentence) => this._translateLine(sentence));
    const translated = lines.filter((l) => !l.error).length;

    const rendered = {
      id: def.id,
      title: def.title,
      category: def.category,
      english: def.sentences.slice(),
      lines,
      note: def.note,
      stats: {
        sentences: def.sentences.length,
        translated,
        failed: def.sentences.length - translated,
      },
    };

    this._cache.set(id, rendered);
    return rendered;
  }

  /**
   * Translate a single English sentence, never throwing.
   * @param {string} sentence
   * @returns {{english: string, conlang: string, gloss: string} | {english: string, error: string}}
   * @private
   */
  _translateLine(sentence) {
    try {
      const result = this.engine.translateToConlang(sentence);
      const conlang = result && typeof result.target === 'string' ? result.target.trim() : '';
      const gloss = result && typeof result.gloss === 'string' ? result.gloss : '';

      if (!conlang) {
        return { english: sentence, error: 'translation produced empty output' };
      }

      return { english: sentence, conlang, gloss };
    } catch (err) {
      return {
        english: sentence,
        error: err && err.message ? err.message : String(err),
      };
    }
  }
}

export default TextLibrary;
