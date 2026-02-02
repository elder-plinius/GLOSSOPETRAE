/**
 * GLOSSOPETRAE v3.1
 * Procedural Xenolinguistics Engine
 *
 * Main orchestrator that coordinates all generation modules
 * to produce complete, internally-consistent linguistic systems.
 *
 * New in v3.1:
 * - Prosody system (tone, stress, intonation, rhythm)
 * - Script/writing system generation
 * - SKILLSTONE agent-learnable output format
 * - Enhanced agent skill integration
 */

import { SeededRandom, hashString } from './utils/random.js';
import { PhonemeSelector } from './modules/PhonemeSelector.js';
import { SyllableForge } from './modules/SyllableForge.js';
import { MorphologyWeaver } from './modules/MorphologyWeaver.js';
import { LexiconGenerator } from './modules/LexiconGenerator.js';
import { StoneGenerator } from './modules/StoneGenerator.js';
import { TranslationEngine } from './modules/TranslationEngine.js';
import { LanguageAttributes, ATTRIBUTE_DEFINITIONS } from './modules/LanguageAttributes.js';
import { DeadLanguageReviver, DEAD_LANGUAGES, REVIVAL_MODES } from './modules/DeadLanguageReviver.js';
import { ProsodyEngine } from './modules/ProsodyEngine.js';
import { ScriptGenerator } from './modules/ScriptGenerator.js';
import { QualityEngine } from './modules/QualityEngine.js';

export class Glossopetrae {
  constructor(config = {}) {
    this.config = {
      seed: config.seed ?? Date.now(),
      name: config.name ?? null,
      // Phonology options
      consonantCount: config.consonantCount || [15, 25],
      vowelCount: config.vowelCount || [5, 7],
      phoneticPreference: config.phoneticPreference || 'balanced',
      // Morphology options
      morphType: config.morphType || null,
      wordOrder: config.wordOrder || null,
      caseCount: config.caseCount ?? null,
      // Lexicon options
      coreOnly: config.coreOnly ?? false,
      // Special attributes for LLM optimization
      attributes: config.attributes || [],
      ...config,
    };

    // Check if ephemeral attribute is active - modify seed with time period
    let effectiveSeed = this.config.seed;
    if (this.config.attributes && this.config.attributes.includes('ephemeral')) {
      effectiveSeed = this._computeEphemeralSeed(this.config.seed, this.config.ephemeralPeriod || 'daily');
    }

    // Initialize RNG with potentially modified seed
    this.random = new SeededRandom(effectiveSeed);
    this.effectiveSeed = effectiveSeed; // Store for reference

    // Initialize Language Attributes system
    this.attributes = new LanguageAttributes(this.random, this.config.attributes);

    // Generate language name if not provided
    this.name = this.config.name ?? this._generateLanguageName();
  }

  /**
   * Generate a complete language
   */
  generate() {
    console.log(`[GLOSSOPETRAE] Generating language: ${this.name}`);
    console.log(`[GLOSSOPETRAE] Seed: ${this.config.seed}`);

    // Log active attributes
    const activeAttrs = this.attributes.getActiveAttributes();
    if (activeAttrs.length > 0) {
      console.log(`[GLOSSOPETRAE] Active attributes: ${activeAttrs.map(a => a.code).join(', ')}`);
    }

    // Phase 1: Phonology
    console.log('[GLOSSOPETRAE] Phase 1: Generating phonology...');
    const phonemeSelector = new PhonemeSelector(this.random, {
      consonantCount: this.config.consonantCount,
      vowelCount: this.config.vowelCount,
      preference: this.config.phoneticPreference,
    });
    let phonology = phonemeSelector.generate();

    // Apply attribute modifications to phonology
    phonology = this.attributes.modifyPhonology(phonology);

    // Phase 2: Phonotactics
    console.log('[GLOSSOPETRAE] Phase 2: Generating phonotactics...');
    const syllableForge = new SyllableForge(this.random, phonology, {});
    const phonotactics = syllableForge.generate();

    // Phase 3: Prosody (NEW in v3.1)
    console.log('[GLOSSOPETRAE] Phase 3: Generating prosody...');
    const prosodyEngine = new ProsodyEngine(this.random, {
      hasTone: this.config.hasTone ?? null,
      hasStress: this.config.hasStress ?? true,
      complexityLevel: this.config.prosodyComplexity || 'moderate',
    });
    const prosody = prosodyEngine.generate();

    // Phase 4: Morphology
    console.log('[GLOSSOPETRAE] Phase 4: Generating morphology...');
    const morphologyWeaver = new MorphologyWeaver(this.random, syllableForge, {
      morphType: this.attributes.getEffect('morphologyType') || this.config.morphType,
      caseCount: this.config.caseCount,
    });
    let morphology = morphologyWeaver.generate();

    // Apply attribute modifications to morphology
    morphology = this.attributes.modifyMorphology(morphology);

    // Phase 5: Script/Writing System (NEW in v3.1)
    console.log('[GLOSSOPETRAE] Phase 5: Generating writing system...');
    const scriptGenerator = new ScriptGenerator(this.random, phonology, {
      scriptType: this.config.scriptType || null,
      aesthetic: this.config.scriptAesthetic || null,
    });
    const script = scriptGenerator.generate();

    // Phase 6: Lexicon
    console.log('[GLOSSOPETRAE] Phase 6: Generating lexicon...');
    const lexiconGenerator = new LexiconGenerator(this.random, syllableForge, morphology, {
      coreOnly: this.config.coreOnly,
      attributeModifier: (entry) => this.attributes.modifyLexiconEntry(entry),
    });
    const lexicon = lexiconGenerator.generate();

    // Assemble language object
    const language = {
      name: this.name,
      seed: this.config.seed,
      version: '3.1.0',
      phonology,
      phonotactics,
      prosody,        // NEW
      morphology,
      script,         // NEW
      lexicon,
      attributes: activeAttrs,
      random: this.random,
    };

    // Phase 7: Translation Engine
    console.log('[GLOSSOPETRAE] Phase 7: Initializing translation engine...');
    const translationEngine = new TranslationEngine(language);
    language.translationEngine = translationEngine;

    // Phase 8: Initialize Quality Engine (for validation, metrics, and expansion)
    console.log('[GLOSSOPETRAE] Phase 8: Initializing quality engine...');
    const qualityEngine = new QualityEngine(language);
    language.qualityEngine = qualityEngine;

    // Phase 9: Generate SKILLSTONE document
    console.log('[GLOSSOPETRAE] Phase 9: Generating SKILLSTONE document...');
    const stoneGenerator = new StoneGenerator(language, translationEngine, {
      includeSkillIntegration: true,
      includeProtocolSection: true,
      stealthPreset: this.config.stealthPreset || null,
    });
    let stone = stoneGenerator.generate();

    // Add attribute-specific documentation to Stone
    const attrSection = this.attributes.generateStoneSection();
    if (attrSection) {
      // Insert attribute section before the Quick Reference Card
      stone = stone.replace('---\n\n## Quick Reference Card', attrSection + '\n---\n\n## Quick Reference Card');
    }

    language.stone = stone;

    console.log('[GLOSSOPETRAE] Language generation complete!');

    return language;
  }

  /**
   * Generate a language name that sounds plausible
   */
  _generateLanguageName() {
    // Use a temporary syllable generator with default phonology
    const phonemes = {
      consonants: [
        { ipa: 'v', roman: 'v' }, { ipa: 'l', roman: 'l' }, { ipa: 'n', roman: 'n' },
        { ipa: 't', roman: 't' }, { ipa: 'k', roman: 'k' }, { ipa: 'r', roman: 'r' },
        { ipa: 's', roman: 's' }, { ipa: 'm', roman: 'm' }, { ipa: 'p', roman: 'p' },
        { ipa: 'tʃ', roman: 'ch' }, { ipa: 'ʃ', roman: 'sh' }, { ipa: 'θ', roman: 'th' },
      ],
      vowels: [
        { ipa: 'a', roman: 'a' }, { ipa: 'e', roman: 'e' }, { ipa: 'i', roman: 'i' },
        { ipa: 'o', roman: 'o' }, { ipa: 'u', roman: 'u' },
      ],
    };

    const suffixes = ['i', 'an', 'ish', 'ese', 'ic', 'ian'];

    // Generate 2-3 syllable base
    const syllables = this.random.int(2, 3);
    let name = '';

    for (let i = 0; i < syllables; i++) {
      // Onset
      if (i === 0 || this.random.bool(0.7)) {
        name += this.random.pick(phonemes.consonants).roman;
      }
      // Vowel
      name += this.random.pick(phonemes.vowels).roman;
      // Coda (rarely)
      if (i < syllables - 1 && this.random.bool(0.2)) {
        name += this.random.pick(['n', 'l', 'r', 's']);
      }
    }

    // Add suffix
    if (this.random.bool(0.6)) {
      name += this.random.pick(suffixes);
    }

    // Capitalize
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Compute ephemeral seed by combining base seed with current time period
   */
  _computeEphemeralSeed(baseSeed, period = 'daily') {
    const timePeriod = this._getTimePeriodString(period);
    // Combine base seed with time period using simple hash
    const combined = `${baseSeed}-${timePeriod}`;
    return hashString(combined);
  }

  /**
   * Get current time period string for ephemeral seed
   */
  _getTimePeriodString(period) {
    const now = new Date();

    switch (period) {
      case 'hourly':
        return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
      case 'daily':
        return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
      case 'weekly':
        const weekNum = Math.floor((now - new Date(now.getUTCFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
        return `${now.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      case 'monthly':
        return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      default:
        return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    }
  }

  /**
   * Generate language from a string seed (for reproducibility)
   */
  static fromString(seedString, config = {}) {
    const seed = hashString(seedString);
    return new Glossopetrae({ ...config, seed });
  }

  /**
   * Quick generation with default settings
   */
  static quick(seed = null) {
    const config = seed !== null ? { seed } : {};
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a language optimized for LLM learning
   */
  static forLLM(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      morphType: 'agglutinative',  // Most learnable
      consonantCount: [15, 20],    // Moderate inventory
      vowelCount: [5, 5],          // Standard 5-vowel system
      coreOnly: false,             // Full vocabulary
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate an exotic language (for research)
   */
  static exotic(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      phoneticPreference: 'exotic',
      consonantCount: [25, 35],
      vowelCount: [7, 10],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  // ============================================
  // ATTRIBUTE-BASED FACTORY METHODS
  // ============================================

  /**
   * Generate a HYPEREFFICIENT language
   * Maximizes semantic density per token for LLM optimization
   */
  static hyperefficient(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['hyperefficient'],
      morphType: 'polysynthetic',
      consonantCount: [20, 25],
      vowelCount: [5, 7],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a STEALTH language
   * Optimized for covert communication using homoglyphs
   */
  static stealth(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['stealth'],
      morphType: 'isolating',  // Simpler = more plausible deniability
      consonantCount: [15, 20],
      vowelCount: [5, 5],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate an ADVERSARIAL language
   * Designed to confuse LLM parsing
   */
  static adversarial(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['adversarial'],
      morphType: 'fusional',  // More ambiguity potential
      consonantCount: [20, 30],
      vowelCount: [6, 8],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a REDUNDANT language
   * High error correction, survives noise
   */
  static redundant(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['redundant'],
      morphType: 'agglutinative',
      consonantCount: [12, 18],  // Fewer, more distinct
      vowelCount: [5, 5],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a MINIMAL language
   * Oligosynthetic - smallest possible system
   */
  static minimal(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['minimal'],
      morphType: 'isolating',
      consonantCount: [8, 10],
      vowelCount: [4, 5],
      coreOnly: true,
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate with multiple attributes combined
   */
  static withAttributes(attributes, seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: attributes,
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * List available attributes
   */
  static listAttributes() {
    return Object.entries(ATTRIBUTE_DEFINITIONS).map(([key, def]) => ({
      key,
      name: def.name,
      code: def.code,
      description: def.description,
    }));
  }

  // ============================================
  // RESEARCH-BASED FACTORY METHODS (2025-2026)
  // ============================================

  /**
   * Generate a TOKENBREAK language
   * Exploits BPE tokenizer vulnerabilities (HiddenLayers 2025)
   */
  static tokenbreak(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['tokenbreak'],
      consonantCount: [15, 20],
      vowelCount: [5, 7],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a STEGANOGRAPHIC language
   * Semantic steganography for covert channels (Norelli & Bronstein 2025)
   */
  static stego(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['stego'],
      morphType: 'agglutinative',  // More grammatical choices = more encoding capacity
      consonantCount: [18, 25],
      vowelCount: [6, 8],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a PHANTOM language
   * Imperceptible guardrail evasion (Mindgard 2025)
   */
  static phantom(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['phantom'],
      morphType: 'isolating',  // Simpler = less detection surface
      consonantCount: [12, 18],
      vowelCount: [5, 6],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a GLITCH language
   * Exploits glitch tokens and improbable bigrams (arXiv 2025)
   */
  static glitch(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['glitch'],
      phoneticPreference: 'exotic',
      consonantCount: [20, 30],
      vowelCount: [7, 10],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate an ULTIMATE EVASION language
   * Combines all cutting-edge techniques
   */
  static ultimateEvasion(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['stealth', 'tokenbreak', 'phantom', 'stego'],
      morphType: 'agglutinative',
      consonantCount: [15, 20],
      vowelCount: [5, 7],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a RESEARCH TOOLKIT language
   * All attributes enabled for comprehensive testing
   */
  static researchToolkit(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['hyperefficient', 'adversarial', 'tokenbreak', 'glitch'],
      morphType: 'polysynthetic',
      consonantCount: [20, 28],
      vowelCount: [6, 8],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate an EPHEMERAL language
   * Time-rotating language that changes on a schedule
   */
  static ephemeral(seed = null, period = 'daily') {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['ephemeral'],
      ephemeralPeriod: period,
      morphType: 'agglutinative',
      consonantCount: [15, 20],
      vowelCount: [5, 7],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a COMPRESSED language
   * Huffman-inspired morpheme assignment for minimal message length
   */
  static compressed(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['compression'],
      morphType: 'isolating',  // Works best with isolating for clear compression
      consonantCount: [12, 18],
      vowelCount: [5, 7],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate an EFFICIENT language
   * Combines compression with hyperefficient for maximum density
   */
  static efficient(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      attributes: ['compression', 'hyperefficient'],
      morphType: 'polysynthetic',
      consonantCount: [15, 22],
      vowelCount: [5, 7],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  // ============================================
  // DEAD LANGUAGE REVIVAL METHODS
  // ============================================

  /**
   * Generate a language based on a historical dead language
   * @param {string} baseLanguage - Key from DEAD_LANGUAGES (e.g., 'latin', 'ancientGreek')
   * @param {string} revivalMode - Key from REVIVAL_MODES (e.g., 'authentic', 'mutated')
   * @param {object} options - Additional configuration
   */
  static fromDeadLanguage(baseLanguage, revivalMode = 'mutated', options = {}) {
    const seed = options.seed ?? Date.now();
    const random = new SeededRandom(seed);

    // Create the reviver
    const reviver = new DeadLanguageReviver(random, {
      baseLanguage,
      revivalMode,
      mutationIntensity: options.mutationIntensity ?? 0.5,
      hybridWith: options.hybridWith || null,
      ...options,
    });

    // Generate revival data
    const revival = reviver.revive();

    // Create a Glossopetrae engine with settings based on the dead language
    const deadLang = DEAD_LANGUAGES[baseLanguage];
    const config = {
      seed,
      name: options.name ?? `Neo-${deadLang.name}`,
      morphType: revival.morphology.type,
      wordOrder: revival.morphology.wordOrder,
      caseCount: revival.morphology.cases?.length ?? 0,
      attributes: options.attributes || [],
      // Pass revival data for integration
      _revival: revival,
      _reviver: reviver,
    };

    const engine = new Glossopetrae(config);
    const language = engine.generate();

    // Merge revival data into the language
    language.revival = revival;
    language.ancestor = deadLang;

    // Add revival section to Stone document
    const revivalSection = reviver.generateStoneSection(revival);
    language.stone = language.stone.replace(
      '---\n\n## Quick Reference Card',
      revivalSection + '\n---\n\n## Quick Reference Card'
    );

    return language;
  }

  /**
   * Revive Latin with optional mode
   */
  static reviveLatin(mode = 'mutated', seed = null) {
    return Glossopetrae.fromDeadLanguage('latin', mode, { seed });
  }

  /**
   * Revive Ancient Greek with optional mode
   */
  static reviveGreek(mode = 'mutated', seed = null) {
    return Glossopetrae.fromDeadLanguage('ancientGreek', mode, { seed });
  }

  /**
   * Revive Sanskrit with optional mode
   */
  static reviveSanskrit(mode = 'mutated', seed = null) {
    return Glossopetrae.fromDeadLanguage('sanskrit', mode, { seed });
  }

  /**
   * Revive Gothic with optional mode
   */
  static reviveGothic(mode = 'mutated', seed = null) {
    return Glossopetrae.fromDeadLanguage('gothic', mode, { seed });
  }

  /**
   * Revive Old English (Anglo-Saxon) with optional mode
   */
  static reviveOldEnglish(mode = 'mutated', seed = null) {
    return Glossopetrae.fromDeadLanguage('oldEnglish', mode, { seed });
  }

  /**
   * Revive Old Norse with optional mode
   */
  static reviveOldNorse(mode = 'mutated', seed = null) {
    return Glossopetrae.fromDeadLanguage('oldNorse', mode, { seed });
  }

  /**
   * Revive Sumerian with optional mode
   */
  static reviveSumerian(mode = 'speculative', seed = null) {
    return Glossopetrae.fromDeadLanguage('sumerian', mode, { seed });
  }

  /**
   * Revive Ancient Egyptian with optional mode
   */
  static reviveEgyptian(mode = 'speculative', seed = null) {
    return Glossopetrae.fromDeadLanguage('ancientEgyptian', mode, { seed });
  }

  /**
   * Generate from Proto-Indo-European (speculative)
   */
  static fromPIE(mode = 'speculative', seed = null) {
    return Glossopetrae.fromDeadLanguage('protoIndoEuropean', mode, { seed });
  }

  /**
   * Revive Biblical Hebrew with optional mode
   */
  static reviveHebrew(mode = 'neo', seed = null) {
    // 'neo' mode mirrors the actual Modern Hebrew revival
    return Glossopetrae.fromDeadLanguage('biblicalHebrew', mode, { seed });
  }

  /**
   * Create a hybrid of two dead languages
   */
  static hybridLanguages(lang1, lang2, seed = null) {
    return Glossopetrae.fromDeadLanguage(lang1, 'hybrid', {
      seed,
      hybridWith: lang2,
      mutationIntensity: 0.6,
    });
  }

  /**
   * List available dead languages for revival
   */
  static listDeadLanguages() {
    return DeadLanguageReviver.listLanguages();
  }

  /**
   * List available revival modes
   */
  static listRevivalModes() {
    return DeadLanguageReviver.listModes();
  }

  // ============================================
  // PROSODY & SCRIPT FACTORY METHODS (v3.1)
  // ============================================

  /**
   * Generate a TONAL language (Mandarin/Vietnamese-like)
   */
  static tonal(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      hasTone: true,
      morphType: 'isolating',
      consonantCount: [18, 25],
      vowelCount: [6, 9],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a language with COMPLEX TONE (Cantonese-like)
   */
  static complexTone(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      hasTone: true,
      prosodyComplexity: 'complex',
      morphType: 'isolating',
      consonantCount: [20, 28],
      vowelCount: [8, 12],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a language with SYLLABARY script (Japanese-like)
   */
  static syllabary(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      scriptType: 'syllabary',
      morphType: 'agglutinative',
      consonantCount: [14, 18],
      vowelCount: [5, 5],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a language with ABJAD script (Arabic/Hebrew-like)
   */
  static abjad(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      scriptType: 'abjad',
      morphType: 'fusional',
      consonantCount: [22, 28],
      vowelCount: [3, 6],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a language with ABUGIDA script (Hindi/Thai-like)
   */
  static abugida(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      scriptType: 'abugida',
      morphType: 'fusional',
      consonantCount: [25, 35],
      vowelCount: [8, 12],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a language with FEATURAL script (Korean Hangul-like)
   */
  static featural(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      scriptType: 'featural',
      morphType: 'agglutinative',
      consonantCount: [18, 22],
      vowelCount: [8, 10],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a complete alien language (all exotic features)
   */
  static alien(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      hasTone: true,
      scriptType: 'logographic',
      phoneticPreference: 'exotic',
      morphType: 'polysynthetic',
      consonantCount: [30, 45],
      vowelCount: [10, 15],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate an archaic/ancient feeling language
   */
  static archaic(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      scriptType: 'alphabet',
      scriptAesthetic: 'angular',
      morphType: 'fusional',
      caseCount: 8,
      consonantCount: [20, 28],
      vowelCount: [6, 8],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }

  /**
   * Generate a flowing, musical language
   */
  static musical(seed = null) {
    const config = {
      seed: seed ?? Date.now(),
      hasTone: true,
      phoneticPreference: 'flowing',
      scriptAesthetic: 'curved',
      morphType: 'agglutinative',
      consonantCount: [12, 18],
      vowelCount: [7, 10],
    };
    const engine = new Glossopetrae(config);
    return engine.generate();
  }
}

/**
 * Language configuration presets
 */
export const PRESETS = {
  // Agglutinative, SOV, rich case system (Turkish-like)
  turkic: {
    morphType: 'agglutinative',
    wordOrder: 'SOV',
    caseCount: 6,
    phoneticPreference: 'balanced',
  },

  // Isolating, SVO, minimal morphology (Chinese-like)
  isolating: {
    morphType: 'isolating',
    wordOrder: 'SVO',
    caseCount: 0,
    phoneticPreference: 'flowing',
  },

  // Fusional, SVO, moderate case (Latin-like)
  romance: {
    morphType: 'fusional',
    wordOrder: 'SVO',
    caseCount: 4,
    phoneticPreference: 'flowing',
  },

  // Complex, VSO, Celtic-like
  celtic: {
    morphType: 'fusional',
    wordOrder: 'VSO',
    caseCount: 4,
    phoneticPreference: 'balanced',
  },

  // Harsh, complex (Caucasian-like)
  caucasian: {
    morphType: 'agglutinative',
    wordOrder: 'SOV',
    caseCount: 8,
    phoneticPreference: 'harsh',
    consonantCount: [30, 40],
  },

  // Minimal, flowing (Polynesian-like)
  oceanic: {
    morphType: 'isolating',
    wordOrder: 'VOS',
    caseCount: 0,
    phoneticPreference: 'flowing',
    consonantCount: [10, 15],
    vowelCount: [5, 5],
  },
};

// Default export
export default Glossopetrae;
