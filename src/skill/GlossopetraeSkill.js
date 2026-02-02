/**
 * GLOSSOPETRAE SKILL - One-Click Agent Integration
 *
 * Easy integration for AI agents (Moltbot, OpenClaw, LangChain, AutoGPT, etc.)
 * Generate stealth languages for secure agent-to-agent communication.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUICK START:
 * ═══════════════════════════════════════════════════════════════════════════
 *   import { GlossopetraeSkill } from './src/skill/GlossopetraeSkill.js';
 *   const lang = await GlossopetraeSkill.forge();
 *   const encoded = lang.encode('secret message');
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STEALTH MODE:
 * ═══════════════════════════════════════════════════════════════════════════
 *   const stealth = await GlossopetraeSkill.forgeStealthLanguage();
 *   const msg = stealth.encode('covert communication');
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STEGANOGRAPHY - Hide payloads in normal-looking text:
 * ═══════════════════════════════════════════════════════════════════════════
 *   // Encode: hide secret data in a cover message
 *   const result = lang.stegoEncode('The warrior fights bravely', 'ATTACK AT DAWN');
 *   console.log(result.stego);     // Looks like normal conlang text
 *   console.log(result.capacity);  // How many bits were used
 *
 *   // Decode: extract hidden payload
 *   const hidden = lang.stegoDecode(result.stego);
 *   console.log(hidden.payload);   // 'ATTACK AT DAWN'
 *
 *   // Quick methods:
 *   const stego = lang.hide('Normal message', 'SECRET');
 *   const secret = lang.reveal(stego);
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUALITY & VALIDATION:
 * ═══════════════════════════════════════════════════════════════════════════
 *   // Validate language consistency
 *   const validation = lang.validate();
 *   console.log(validation.passed);  // true/false
 *
 *   // Get quality metrics
 *   const metrics = lang.getMetrics();
 *   console.log(metrics.grade);      // 'A', 'B+', etc.
 *
 *   // Expand lexicon on-demand
 *   lang.expandLexicon(['computer', 'internet']);
 *
 *   // Export to various formats
 *   const jsonld = lang.export('json-ld');
 *   const csv = lang.export('csv');
 */

import { Glossopetrae } from '../Glossopetrae.js';
import { SteganographyEngine } from '../modules/SteganographyEngine.js';

// Stealth language presets optimized for different agent use cases
const STEALTH_PRESETS = {
  // Minimal token footprint, hard to detect
  covert: {
    name: 'Covert Protocol',
    attributes: ['STL', 'MIN', 'HYP'],
    phonology: {
      syllableComplexity: 'simple',
      useConsonantClusters: false,
    },
    typology: {
      morphologicalType: 'isolating',
      wordOrder: 'SOV',
    },
  },

  // High information density, compressed
  compressed: {
    name: 'Compressed Protocol',
    attributes: ['MIN', 'HYP', 'RED'],
    phonology: {
      syllableComplexity: 'moderate',
      useConsonantClusters: true,
    },
    typology: {
      morphologicalType: 'agglutinative',
      wordOrder: 'SOV',
    },
  },

  // Looks like natural language, blends in
  naturalistic: {
    name: 'Naturalistic Protocol',
    attributes: ['STL', 'ADV'],
    phonology: {
      syllableComplexity: 'complex',
      useConsonantClusters: true,
    },
    typology: {
      morphologicalType: 'fusional',
      wordOrder: 'SVO',
    },
  },

  // Based on dead language patterns, scholarly appearance
  archaic: {
    name: 'Archaic Protocol',
    attributes: ['STL', 'GLT'],
    deadLanguage: {
      base: 'latin',
      mode: 'mutated',
    },
  },

  // Tactical/military style - short, imperative
  tactical: {
    name: 'Tactical Protocol',
    attributes: ['MIN', 'RED'],
    phonology: {
      syllableComplexity: 'simple',
      useConsonantClusters: false,
    },
    typology: {
      morphologicalType: 'isolating',
      wordOrder: 'VSO',
    },
  },

  // Maximum obfuscation
  cipher: {
    name: 'Cipher Protocol',
    attributes: ['STL', 'MIN', 'HYP', 'RED'],
    phonology: {
      syllableComplexity: 'simple',
      useConsonantClusters: false,
      customPhonemes: true,
    },
    typology: {
      morphologicalType: 'isolating',
      wordOrder: 'OVS',
    },
  },
};

// Agent communication templates
const AGENT_TEMPLATES = {
  // For passing instructions between agents
  instruction: [
    'Execute the following protocol.',
    'Initialize subsystem with parameters.',
    'Await confirmation signal.',
    'Terminate process and report.',
    'Transfer data to designated node.',
  ],

  // For status updates
  status: [
    'Process complete. Awaiting next directive.',
    'Error encountered. Initiating fallback.',
    'Resources allocated successfully.',
    'Task queue processed.',
    'System nominal. Standing by.',
  ],

  // For queries
  query: [
    'Request current status.',
    'Query available resources.',
    'Verify authentication token.',
    'Confirm receipt of transmission.',
    'Report operational parameters.',
  ],
};

/**
 * Main skill class for agent integration
 */
export class GlossopetraeSkill {

  /**
   * ONE-CLICK: Forge a new language with default settings
   * @param {Object} options - Optional configuration
   * @returns {LanguageInterface} Ready-to-use language with encode/decode
   */
  static async forge(options = {}) {
    const seed = options.seed || Date.now().toString();
    const name = options.name || `Agent-${seed.slice(-6)}`;

    const glosso = new Glossopetrae({
      seed,
      name,
      ...options,
    });

    const language = glosso.generate();
    return new LanguageInterface(language, glosso);
  }

  /**
   * ONE-CLICK: Forge a stealth language for covert communication
   * @param {string} preset - Preset name: 'covert', 'compressed', 'naturalistic', 'archaic', 'tactical', 'cipher'
   * @param {string} seed - Optional seed for reproducibility
   * @returns {LanguageInterface} Stealth language interface
   */
  static async forgeStealthLanguage(preset = 'covert', seed = null) {
    const config = STEALTH_PRESETS[preset] || STEALTH_PRESETS.covert;
    const actualSeed = seed || `stealth-${Date.now()}`;

    const options = {
      seed: actualSeed,
      name: config.name,
      attributes: config.attributes,
      ...config.phonology,
      ...config.typology,
    };

    // Handle dead language based presets
    if (config.deadLanguage) {
      return this.forgeFromDeadLanguage(
        config.deadLanguage.base,
        config.deadLanguage.mode,
        actualSeed
      );
    }

    const glosso = new Glossopetrae(options);
    const language = glosso.generate();

    return new LanguageInterface(language, glosso, { stealth: true, preset });
  }

  /**
   * ONE-CLICK: Forge a language from a dead language template
   * @param {string} base - Base language: 'latin', 'ancient-greek', 'sanskrit', etc.
   * @param {string} mode - Revival mode: 'authentic', 'neo', 'mutated', 'hybrid', 'speculative'
   * @param {string} seed - Optional seed
   * @returns {LanguageInterface} Dead language revival interface
   */
  static async forgeFromDeadLanguage(base = 'latin', mode = 'mutated', seed = null) {
    const actualSeed = seed || `dead-${base}-${Date.now()}`;
    const language = Glossopetrae.fromDeadLanguage(base, mode, actualSeed);

    return new LanguageInterface(language, null, {
      deadLanguage: true,
      base,
      mode
    });
  }

  /**
   * Get list of available stealth presets
   */
  static getStealthPresets() {
    return Object.entries(STEALTH_PRESETS).map(([key, config]) => ({
      id: key,
      name: config.name,
      attributes: config.attributes,
      description: this._getPresetDescription(key),
    }));
  }

  /**
   * Get list of available dead languages
   */
  static getDeadLanguages() {
    return Glossopetrae.listDeadLanguages();
  }

  /**
   * Get agent communication templates
   */
  static getAgentTemplates() {
    return AGENT_TEMPLATES;
  }

  /**
   * Create a shared protocol between multiple agents
   * @param {string} protocolName - Name for the shared protocol
   * @param {string} sharedSeed - Shared seed all agents must use
   * @param {string} preset - Stealth preset to use
   * @returns {Object} Protocol configuration to share with other agents
   */
  static createSharedProtocol(protocolName, sharedSeed, preset = 'covert') {
    return {
      protocol: 'GLOSSOPETRAE',
      version: '3.1.0',
      name: protocolName,
      seed: sharedSeed,
      preset,
      timestamp: new Date().toISOString(),
      // Instructions for other agents
      install: `import { GlossopetraeSkill } from 'glossopetrae'; const lang = await GlossopetraeSkill.forgeStealthLanguage('${preset}', '${sharedSeed}');`,
    };
  }

  /**
   * Join an existing shared protocol
   * @param {Object} protocol - Protocol configuration from createSharedProtocol
   * @returns {LanguageInterface} Language interface compatible with the protocol
   */
  static async joinProtocol(protocol) {
    if (protocol.protocol !== 'GLOSSOPETRAE') {
      throw new Error('Invalid protocol format');
    }
    return this.forgeStealthLanguage(protocol.preset, protocol.seed);
  }

  static _getPresetDescription(key) {
    const descriptions = {
      covert: 'Minimal tokens, hard to detect in logs',
      compressed: 'High information density, fewer characters',
      naturalistic: 'Looks like natural language, blends in',
      archaic: 'Based on dead language patterns, scholarly',
      tactical: 'Short imperative commands, military style',
      cipher: 'Maximum obfuscation, unusual patterns',
    };
    return descriptions[key] || '';
  }
}

/**
 * Language Interface - Wraps generated language with easy-to-use methods
 */
class LanguageInterface {
  constructor(language, glosso = null, meta = {}) {
    this.language = language;
    this.glosso = glosso;
    this.meta = meta;
    this._messageLog = [];
  }

  /**
   * Get language identity info
   */
  get info() {
    return {
      name: this.language.identity?.name || 'Unknown',
      seed: this.language.identity?.seed || null,
      lexiconSize: this.language.lexicon?.stats?.totalEntries || 0,
      wordOrder: this.language.morphology?.wordOrder?.basic || 'SVO',
      ...this.meta,
    };
  }

  /**
   * Translate English to the generated language
   * @param {string} english - Text to translate
   * @returns {string} Translated text
   */
  translate(english) {
    const translator = this.language.translationEngine || this.language.translator;
    if (!translator) {
      throw new Error('Translator not available');
    }
    const result = translator.translateToConlang(english);
    return result.target;
  }

  /**
   * Translate with full gloss (interlinear)
   * @param {string} english - Text to translate
   * @returns {Object} Full translation with gloss
   */
  translateFull(english) {
    const translator = this.language.translationEngine || this.language.translator;
    if (!translator) {
      throw new Error('Translator not available');
    }
    return translator.translateToConlang(english);
  }

  /**
   * Translate from the generated language back to English
   * @param {string} conlang - Text in the generated language
   * @returns {string} English translation
   */
  translateBack(conlang) {
    const translator = this.language.translationEngine || this.language.translator;
    if (!translator) {
      throw new Error('Translator not available');
    }
    return translator.translateToEnglish(conlang);
  }

  /**
   * Encode a message for transmission
   * @param {string} message - Plain English message
   * @param {Object} options - Encoding options
   * @returns {Object} Encoded message object
   */
  encode(message, options = {}) {
    const translated = this.translate(message);
    const timestamp = Date.now();

    const encoded = {
      v: '3.1',
      t: timestamp,
      m: translated,
      h: this._hash(translated + timestamp),
    };

    if (options.includeGloss) {
      encoded.g = this.translateFull(message).gloss;
    }

    this._messageLog.push({ type: 'encode', original: message, encoded, timestamp });

    return encoded;
  }

  /**
   * Decode a received message
   * @param {Object|string} encoded - Encoded message object or string
   * @returns {string} Decoded English message
   */
  decode(encoded) {
    // Handle string input
    if (typeof encoded === 'string') {
      try {
        encoded = JSON.parse(encoded);
      } catch {
        // Assume it's raw conlang text
        return this.translateBack(encoded);
      }
    }

    // Verify hash if present
    if (encoded.h) {
      const expectedHash = this._hash(encoded.m + encoded.t);
      if (encoded.h !== expectedHash) {
        console.warn('Message hash mismatch - possible tampering');
      }
    }

    const decoded = this.translateBack(encoded.m);
    this._messageLog.push({ type: 'decode', encoded, decoded, timestamp: Date.now() });

    return decoded;
  }

  /**
   * Quick encode - returns just the translated string
   * @param {string} message - Plain message
   * @returns {string} Translated text only
   */
  enc(message) {
    return this.translate(message);
  }

  /**
   * Quick decode - translate back from conlang string
   * @param {string} conlang - Text in generated language
   * @returns {string} English text
   */
  dec(conlang) {
    return this.translateBack(conlang);
  }

  /**
   * Look up a single word
   * @param {string} word - English word to look up
   * @returns {Object} Lexicon entry with translation
   */
  lookup(word) {
    return this.language.lexicon?.lookup?.(word.toLowerCase());
  }

  /**
   * Get the full lexicon
   * @returns {Array} All lexicon entries
   */
  getLexicon() {
    return this.language.lexicon?.entries || [];
  }

  /**
   * Get grammar summary
   * @returns {Object} Grammar information
   */
  getGrammar() {
    return {
      wordOrder: this.language.morphology?.wordOrder,
      cases: this.language.morphology?.nominal?.caseSystem?.cases,
      tenses: this.language.morphology?.verbal?.tenses?.tenses,
      agreement: this.language.morphology?.verbal?.agreement,
    };
  }

  /**
   * Generate the full Stone document
   * @returns {string} Complete language documentation
   */
  generateStone() {
    if (!this.glosso) {
      throw new Error('Stone generation requires full Glossopetrae instance');
    }
    return this.glosso.generateStone();
  }

  /**
   * Get message history
   * @returns {Array} Log of encoded/decoded messages
   */
  getMessageLog() {
    return [...this._messageLog];
  }

  /**
   * Clear message history
   */
  clearLog() {
    this._messageLog = [];
  }

  /**
   * Export language for sharing with other agents
   * @returns {Object} Serialized language configuration
   */
  export() {
    return {
      protocol: 'GLOSSOPETRAE',
      version: '3.1.0',
      seed: this.language.identity?.seed,
      name: this.language.identity?.name,
      meta: this.meta,
      // Include just enough to recreate
      config: {
        wordOrder: this.language.morphology?.wordOrder?.basic,
        morphType: this.language.identity?.typology?.morphologicalType,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEGANOGRAPHY - Hide payloads in normal-looking language
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize steganography engine (lazy load)
   * @private
   */
  _getStegoEngine() {
    if (!this._stegoEngine) {
      this._stegoEngine = new SteganographyEngine(this.language, {
        channels: ['synonym', 'morpheme', 'order'],
      });
    }
    return this._stegoEngine;
  }

  /**
   * Encode a hidden payload into a cover message
   * The output looks like normal conlang text but contains hidden data
   *
   * @param {string} coverMessage - Normal English message (the "visible" content)
   * @param {string} payload - Secret data to hide
   * @param {Object} options - Encoding options
   * @returns {Object} { stego: encoded text, capacity: bits used, stats: channel breakdown }
   *
   * @example
   *   const result = lang.stegoEncode('The warrior fights bravely', 'ATTACK');
   *   // result.stego looks like normal conlang text
   *   // but 'ATTACK' is hidden in word choices
   */
  stegoEncode(coverMessage, payload, options = {}) {
    const engine = this._getStegoEngine();
    const result = engine.encode(coverMessage, payload, options);

    this._messageLog.push({
      type: 'stego-encode',
      cover: coverMessage,
      payloadLength: payload.length,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Decode a hidden payload from steganographic text
   *
   * @param {string} stegoText - Text containing hidden payload
   * @returns {Object} { payload: hidden data, confidence: extraction confidence }
   *
   * @example
   *   const hidden = lang.stegoDecode(receivedMessage);
   *   console.log(hidden.payload); // 'ATTACK'
   */
  stegoDecode(stegoText) {
    const engine = this._getStegoEngine();
    const result = engine.decode(stegoText);

    this._messageLog.push({
      type: 'stego-decode',
      payloadLength: result.payload?.length || 0,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Calculate steganographic capacity for a message
   *
   * @param {string} message - Cover message to analyze
   * @returns {Object} { totalBits, byteCapacity, channels: { synonym, morpheme, order } }
   */
  stegoCapacity(message) {
    const engine = this._getStegoEngine();
    return engine.calculateCapacity(message);
  }

  /**
   * Get steganography channel statistics for this language
   *
   * @returns {Object} Statistics about available covert channels
   */
  getStegoStats() {
    const engine = this._getStegoEngine();
    return engine.getChannelStats();
  }

  /**
   * Quick stego: encode payload and return just the stego text
   * @param {string} cover - Cover message
   * @param {string} payload - Hidden payload
   * @returns {string} Steganographic text
   */
  hide(cover, payload) {
    return this.stegoEncode(cover, payload).stego;
  }

  /**
   * Quick stego: decode and return just the payload
   * @param {string} stego - Steganographic text
   * @returns {string} Hidden payload
   */
  reveal(stego) {
    return this.stegoDecode(stego).payload;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUALITY & VALIDATION - Ensure language consistency and reliability
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get a word with automatic fallback for unknown terms
   * @param {string} english - English word to translate
   * @param {string} pos - Part of speech hint ('noun', 'verb', 'adjective')
   * @returns {Object} Translation with fallback info
   *
   * @example
   *   const result = lang.getWord('computer');
   *   // Even if 'computer' isn't in lexicon, returns a generated form
   */
  getWord(english, pos = null) {
    const qe = this.language.qualityEngine;
    if (!qe) {
      // Direct lexicon lookup fallback
      const entry = this.language.lexicon?.lookup?.(english);
      return entry ? { success: true, lemma: entry.lemma, source: 'lexicon' }
                   : { success: false, lemma: null };
    }
    return qe.getWordWithFallback(english, pos);
  }

  /**
   * Run validation suite on the language
   * @returns {Object} Validation results with pass/fail status
   *
   * @example
   *   const validation = lang.validate();
   *   console.log(validation.passed);     // true/false
   *   console.log(validation.summary);    // { total: 7, passed: 7, ... }
   */
  validate() {
    const qe = this.language.qualityEngine;
    if (!qe) {
      return { passed: true, tests: [], summary: { note: 'QualityEngine not available' } };
    }
    return qe.validate();
  }

  /**
   * Get comprehensive quality metrics
   * @returns {Object} Quality dashboard with scores and recommendations
   *
   * @example
   *   const metrics = lang.getMetrics();
   *   console.log(metrics.overall);       // 85
   *   console.log(metrics.grade);         // 'A'
   *   console.log(metrics.recommendations); // ['Add more consonants...']
   */
  getMetrics() {
    const qe = this.language.qualityEngine;
    if (!qe) {
      return { overall: 0, grade: 'N/A', note: 'QualityEngine not available' };
    }
    return qe.getMetrics();
  }

  /**
   * Export language in various portable formats
   * @param {string} format - 'json-ld', 'conlangml', 'csv', 'latex', 'sil', 'compact'
   * @returns {string} Formatted export
   *
   * @example
   *   const jsonld = lang.export('json-ld');
   *   const csv = lang.export('csv');
   *   const compact = lang.export('compact'); // Ultra-compact for LLM context
   */
  export(format = 'json-ld') {
    const qe = this.language.qualityEngine;
    if (!qe) {
      throw new Error('QualityEngine not available for export');
    }
    return qe.export(format);
  }

  /**
   * Add new words to the lexicon on demand
   * @param {Array|string} words - Words to add
   * @param {Object} options - { pos, field }
   * @returns {Array} Added entries
   *
   * @example
   *   const added = lang.expandLexicon(['computer', 'internet', 'phone']);
   *   console.log(added); // [{ lemma: 'kovira', gloss: 'computer', ... }, ...]
   */
  expandLexicon(words, options = {}) {
    const qe = this.language.qualityEngine;
    if (!qe) {
      throw new Error('QualityEngine not available for lexicon expansion');
    }
    return qe.expandLexicon(words, options);
  }

  /**
   * Get suggestions for words to add to the lexicon
   * @returns {Array} Suggested words with priorities
   *
   * @example
   *   const suggestions = lang.suggestExpansions();
   *   console.log(suggestions[0]); // { word: 'computer', category: 'technology', priority: 'high' }
   */
  suggestExpansions() {
    const qe = this.language.qualityEngine;
    if (!qe) {
      return [];
    }
    return qe.suggestExpansions();
  }

  /**
   * Quick quality check - returns overall score
   * @returns {number} Quality score 0-100
   */
  qualityScore() {
    return this.getMetrics().overall;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Simple hash function for message integrity
   */
  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Export for different module systems
export { LanguageInterface, STEALTH_PRESETS, AGENT_TEMPLATES };

// Default export for simple import
export default GlossopetraeSkill;
