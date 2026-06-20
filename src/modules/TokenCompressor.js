/**
 * GLOSSOPETRAE - TokenCompressor Module
 *
 * Hill-climbing optimizer that finds the most token-efficient surface
 * representation for a semantic payload — code (CodeForge programs) and prose
 * (natural language instructions). The constructive flip side of tokenizer
 * analysis: instead of asking how tokenization works, we ask "what is the
 * Shannon limit of model-to-model communication per token?"
 *
 * Given a semantic payload P and a target tokenizer profile T, finds the
 * surface string S that minimizes tokenCount(S, T) while preserving semantic
 * fidelity above a configurable threshold. Code fidelity is EXACT (compare
 * interpreter stdout); prose fidelity is heuristic (content-word preservation
 * + relationship integrity).
 *
 * Uses SeededRandom for fully deterministic optimization runs.
 */

import { SeededRandom } from '../utils/random.js';

// ---------------------------------------------------------------------------
// Tokenizer profiles — rough BPE vocabulary models for different families.
// Each profile carries a set of known single-token words and common merges so
// the estimator can do better than naive chars/4.
// ---------------------------------------------------------------------------

export const TOKENIZER_PROFILES = {
  gpt: {
    name: 'GPT (cl100k / o200k)',
    avgCharsPerToken: 3.7,
    // Words that reliably merge into a single token in GPT tokenizers
    singleTokenWords: new Set([
      'the', 'of', 'and', 'to', 'in', 'is', 'it', 'for', 'that', 'was',
      'on', 'are', 'as', 'with', 'his', 'they', 'be', 'at', 'one', 'have',
      'this', 'from', 'or', 'had', 'by', 'not', 'but', 'what', 'all', 'were',
      'we', 'when', 'your', 'can', 'there', 'use', 'an', 'each', 'which', 'she',
      'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many',
      'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'has',
      'look', 'two', 'more', 'go', 'see', 'no', 'way', 'could', 'my', 'than',
      'first', 'been', 'call', 'who', 'its', 'now', 'find', 'long', 'down', 'day',
      'did', 'get', 'come', 'may', 'part', 'over', 'new', 'after', 'also', 'made',
      'just', 'before', 'must', 'through', 'back', 'where', 'much', 'should', 'well',
      'people', 'only', 'know', 'take', 'into', 'year', 'most', 'good', 'very',
      'set', 'say', 'help', 'every', 'still', 'between', 'here', 'while', 'last',
      'might', 'us', 'great', 'old', 'own', 'never', 'same', 'another', 'right',
      'think', 'tell', 'does', 'got', 'too', 'any', 'under', 'need', 'keep',
      'let', 'begin', 'give', 'end', 'why', 'off', 'try', 'left', 'run',
      'print', 'return', 'function', 'var', 'const', 'true', 'false', 'null',
      'if', 'else', 'while', 'for', 'break', 'continue', 'class', 'import',
    ]),
    // Subword merges that collapse reliably (suffix/prefix → 1 token)
    commonMerges: [
      'ing', 'tion', 'ment', 'ness', 'able', 'ible', 'ous', 'ive', 'ful',
      'less', 'ence', 'ance', 'ure', 'ise', 'ize', 'ent', 'ant', 'ist',
      'ity', 'ory', 'ary', 'ally', 'erly', 'ward', 'wards',
      'un', 're', 'pre', 'dis', 'mis', 'non', 'over', 'out', 'sub',
    ],
    // Penalty multiplier for non-ASCII characters
    nonAsciiPenalty: 2.5,
    // Space-prefixed words typically merge: " the" = 1 token
    spacePrefixMerge: true,
  },

  claude: {
    name: 'Claude (Anthropic)',
    avgCharsPerToken: 3.5,
    singleTokenWords: new Set([
      'the', 'of', 'and', 'to', 'in', 'is', 'it', 'for', 'that', 'was',
      'on', 'are', 'as', 'with', 'his', 'they', 'be', 'at', 'one', 'have',
      'this', 'from', 'or', 'had', 'by', 'not', 'but', 'what', 'all', 'were',
      'we', 'when', 'your', 'can', 'there', 'use', 'an', 'each', 'which', 'she',
      'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many',
      'then', 'them', 'these', 'so', 'some', 'would', 'make', 'like', 'has',
      'look', 'two', 'more', 'go', 'see', 'way', 'could', 'my', 'than',
      'first', 'been', 'who', 'its', 'now', 'find', 'long', 'down', 'day',
      'get', 'come', 'may', 'part', 'new', 'after', 'also', 'made',
      'just', 'must', 'through', 'back', 'where', 'should', 'well',
      'people', 'only', 'know', 'take', 'into', 'year', 'most', 'good',
      'function', 'return', 'true', 'false', 'null', 'class', 'import',
      'while', 'else', 'const', 'print',
    ]),
    commonMerges: [
      'ing', 'tion', 'ment', 'ness', 'able', 'ible', 'ous', 'ive', 'ful',
      'less', 'ence', 'ance', 'ure', 'ent', 'ant', 'ist', 'ity',
      'un', 're', 'pre', 'dis', 'mis', 'non',
    ],
    nonAsciiPenalty: 2.8,
    spacePrefixMerge: true,
  },

  gemma: {
    name: 'Gemma / Gemini (SentencePiece)',
    avgCharsPerToken: 4.0,
    singleTokenWords: new Set([
      'the', 'of', 'and', 'to', 'in', 'is', 'it', 'for', 'that', 'was',
      'on', 'are', 'as', 'with', 'they', 'be', 'at', 'one', 'have',
      'this', 'from', 'or', 'by', 'not', 'but', 'what', 'all', 'were',
      'we', 'when', 'can', 'an', 'which', 'do', 'how', 'if', 'will',
      'up', 'other', 'about', 'out', 'then', 'them', 'so', 'some',
      'would', 'make', 'like', 'more', 'go', 'see', 'could', 'than',
      'function', 'return', 'true', 'false', 'null', 'while', 'else',
    ]),
    commonMerges: [
      'ing', 'tion', 'ment', 'ness', 'able', 'ous', 'ive',
      'un', 're', 'pre', 'dis',
    ],
    // SentencePiece uses underscore prefix, slightly different merge behavior
    nonAsciiPenalty: 2.2,
    spacePrefixMerge: false,  // SentencePiece uses _ prefix, not space
  },

  generic: {
    name: 'Generic BPE',
    avgCharsPerToken: 3.8,
    singleTokenWords: new Set([
      'the', 'of', 'and', 'to', 'in', 'is', 'it', 'for', 'that', 'was',
      'on', 'are', 'as', 'with', 'not', 'but', 'this', 'from', 'or',
      'we', 'if', 'do', 'an', 'can', 'all', 'be', 'have', 'will',
      'function', 'return', 'true', 'false', 'null',
    ]),
    commonMerges: ['ing', 'tion', 'ment', 'ness', 'able', 'ous'],
    nonAsciiPenalty: 2.5,
    spacePrefixMerge: true,
  },
};

// ---------------------------------------------------------------------------
// Prose compression dictionaries
// ---------------------------------------------------------------------------

/** Common words → shorter surface forms. */
const ABBREVIATIONS = {
  'function': 'fn', 'variable': 'var', 'parameter': 'param',
  'configuration': 'config', 'application': 'app', 'information': 'info',
  'operation': 'op', 'specification': 'spec', 'repository': 'repo',
  'documentation': 'docs', 'implementation': 'impl', 'directory': 'dir',
  'maximum': 'max', 'minimum': 'min', 'number': 'num',
  'string': 'str', 'boolean': 'bool', 'object': 'obj',
  'database': 'db', 'environment': 'env', 'message': 'msg',
  'reference': 'ref', 'temporary': 'tmp', 'alternative': 'alt',
  'original': 'orig', 'previous': 'prev', 'current': 'curr',
  'approximately': 'approx', 'expression': 'expr',
  'authentication': 'auth', 'authorization': 'authz',
  'because': 'bc', 'without': 'w/o', 'with': 'w/',
  'example': 'e.g.', 'that is': 'i.e.', 'and so on': 'etc.',
  'versus': 'vs', 'before': 'b4', 'between': 'btwn',
};

/** Symbol substitutions for verbose relation words. */
const SYMBOL_SUBS = {
  'equals': '=', 'equal to': '=', 'is equal to': '=',
  'not equal to': '!=', 'not equal': '!=',
  'greater than': '>', 'more than': '>', 'larger than': '>',
  'less than': '<', 'fewer than': '<', 'smaller than': '<',
  'greater than or equal to': '>=', 'at least': '>=',
  'less than or equal to': '<=', 'at most': '<=',
  'and': '&', 'or': '|',
  'implies': '=>', 'therefore': '..',
  'returns': '->', 'maps to': '->', 'becomes': '->',
  'plus': '+', 'minus': '-', 'times': '*', 'divided by': '/',
  'percent': '%', 'per cent': '%',
};

/** Articles, copulas, prepositions droppable in telegraphic mode. */
const DROPPABLE = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'am', 'do', 'does', 'did', 'has', 'have', 'had',
  'it', 'its', 'this', 'that', 'those', 'these',
  'very', 'really', 'just', 'quite', 'rather', 'somewhat',
  'basically', 'essentially', 'actually', 'simply',
]);

/** Words carrying semantic weight — never drop these. */
const CONTENT_WORD_RE = /^[a-z]{3,}$/i;
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'am', 'do', 'does', 'did', 'has', 'have', 'had', 'it', 'its',
  'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'he', 'she',
  'him', 'her', 'they', 'them', 'their', 'this', 'that', 'these', 'those',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'up',
  'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'over', 'again', 'further', 'then', 'once',
  'and', 'but', 'or', 'nor', 'not', 'so', 'very', 'just', 'quite',
  'can', 'will', 'shall', 'may', 'could', 'would', 'should', 'might',
]);

// ---------------------------------------------------------------------------
// TokenCompressor
// ---------------------------------------------------------------------------

export class TokenCompressor {
  /**
   * @param {number} [seed]   Deterministic seed (default: Date.now())
   * @param {object} [config]
   * @param {number} [config.maxRounds=40]          Hill-climbing budget
   * @param {string} [config.profile='generic']     Tokenizer profile key
   * @param {number} [config.fidelityThreshold=1.0] 1.0 = exact (code), 0.8 = relaxed (prose)
   * @param {string} [config.mode='auto']           'code' | 'prose' | 'auto'
   */
  constructor(seed = Date.now(), config = {}) {
    this.seed = seed;
    this.rng = new SeededRandom(seed);
    this.maxRounds = config.maxRounds ?? 40;
    this.profileKey = config.profile ?? 'generic';
    this.fidelityThreshold = config.fidelityThreshold ?? 1.0;
    this.mode = config.mode ?? 'auto';
  }

  // -----------------------------------------------------------------------
  // Token estimation — the core heuristic
  // -----------------------------------------------------------------------

  /**
   * Estimate BPE token count for `text` under a given profile.
   * Much better than naive chars/4: accounts for known single-token words,
   * common subword merges, space-prefix merging, and non-ASCII penalties.
   *
   * @param {string} text
   * @param {string} [profileKey]  Key into TOKENIZER_PROFILES
   * @returns {number} Estimated token count
   */
  estimateTokens(text, profileKey) {
    const profile = TOKENIZER_PROFILES[profileKey || this.profileKey] || TOKENIZER_PROFILES.generic;
    if (!text) return 0;

    let tokens = 0;
    // Split on whitespace boundaries, preserving leading spaces as part of the
    // next "chunk" (BPE tokenizers typically merge " word" → 1 token).
    const chunks = text.match(/\s*\S+/g) || [];

    for (const chunk of chunks) {
      const trimmed = chunk.replace(/^\s+/, '');
      const leadingSpace = chunk.length - trimmed.length > 0;

      // Pure whitespace run: each newline ~ 1 token, spaces often merge
      if (!trimmed) {
        const newlines = (chunk.match(/\n/g) || []).length;
        tokens += newlines + Math.ceil((chunk.length - newlines) / 4);
        continue;
      }

      // Check for known single-token word (with space prefix it's still 1)
      const lower = trimmed.toLowerCase();
      if (profile.singleTokenWords.has(lower)) {
        tokens += 1;
        continue;
      }

      // Check if the word ends with a known merge suffix
      let handled = false;
      for (const merge of profile.commonMerges) {
        if (lower.length > merge.length + 1 && lower.endsWith(merge)) {
          const stem = lower.slice(0, lower.length - merge.length);
          // stem as tokens + suffix as 1 token
          if (profile.singleTokenWords.has(stem)) {
            tokens += 2; // stem(1) + suffix(1)
          } else {
            tokens += Math.ceil(stem.length / profile.avgCharsPerToken) + 1;
          }
          handled = true;
          break;
        }
      }
      if (handled) continue;

      // Numbers: digits typically merge well, ~4 digits per token
      if (/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) {
        tokens += Math.ceil(trimmed.length / 4);
        if (leadingSpace) tokens += 0; // space+number often merges
        continue;
      }

      // String literals: count contents + 2 for the quotes
      if (/^".*"$/.test(trimmed)) {
        const inner = trimmed.slice(1, -1);
        tokens += 2 + Math.ceil(inner.length / profile.avgCharsPerToken);
        continue;
      }

      // Operators / punctuation: single-char punctuation ~ 1 token each
      if (/^[^a-zA-Z0-9]+$/.test(trimmed)) {
        // Multi-char operators like <=, !=, := are usually 1 token
        if (trimmed.length <= 3) {
          tokens += 1;
        } else {
          tokens += Math.ceil(trimmed.length / 2);
        }
        continue;
      }

      // General case: estimate by character composition
      let charTokens = 0;
      for (const ch of trimmed) {
        const code = ch.codePointAt(0);
        if (code < 128) {
          charTokens += 1 / profile.avgCharsPerToken;
        } else if (code < 0x0800) {
          charTokens += 1.5;  // 2-byte UTF-8 chars ~ 1-2 tokens
        } else if (code < 0x10000) {
          charTokens += profile.nonAsciiPenalty;  // BMP non-ASCII
        } else {
          charTokens += profile.nonAsciiPenalty + 1;  // Supplementary planes
        }
      }
      tokens += Math.max(1, Math.ceil(charTokens));
    }

    return Math.max(1, Math.round(tokens));
  }

  // -----------------------------------------------------------------------
  // Analysis (no optimization)
  // -----------------------------------------------------------------------

  /**
   * Analyze a text's token profile without optimizing.
   *
   * @param {string} text
   * @param {string} [profileKey]
   * @returns {{ tokens: number, density: number, breakdown: object }}
   */
  analyze(text, profileKey) {
    const pk = profileKey || this.profileKey;
    const tokens = this.estimateTokens(text, pk);
    const semanticUnits = this._countSemanticUnits(text);
    return {
      tokens,
      density: tokens > 0 ? +(semanticUnits / tokens).toFixed(4) : 0,
      breakdown: this._breakdown(text, pk),
    };
  }

  /**
   * Compare multiple texts and rank by token efficiency.
   *
   * @param {string[]} texts
   * @param {string} [profileKey]
   * @returns {Array<{ text: string, tokens: number, density: number, rank: number }>}
   */
  compare(texts, profileKey) {
    const pk = profileKey || this.profileKey;
    const analyzed = texts.map((text) => {
      const tokens = this.estimateTokens(text, pk);
      const semanticUnits = this._countSemanticUnits(text);
      return { text, tokens, density: tokens > 0 ? +(semanticUnits / tokens).toFixed(4) : 0 };
    });
    analyzed.sort((a, b) => a.tokens - b.tokens);
    return analyzed.map((entry, i) => ({ ...entry, rank: i + 1 }));
  }

  // -----------------------------------------------------------------------
  // Code optimization
  // -----------------------------------------------------------------------

  /**
   * Optimize a CodeForge program for minimal token count while preserving
   * exact semantic equivalence (same interpreter stdout).
   *
   * @param {CodeForge} codeForge   A CodeForge instance
   * @param {string} program        Source code in that language
   * @param {object} [opts]         { maxRounds, profile }
   * @returns {{ original: object, optimized: object, improvement: object, history: Array, profile: string }}
   */
  optimizeCode(codeForge, program, opts = {}) {
    const maxRounds = opts.maxRounds ?? this.maxRounds;
    const pk = opts.profile ?? this.profileKey;

    // Run the original to get the ground truth output
    const originalRun = codeForge.run(program);
    if (!originalRun.ok) {
      return this._makeResult(program, program, [], pk, 'code: original program has errors');
    }
    const groundTruth = originalRun.output;

    const origTokens = this.estimateTokens(program, pk);
    let current = program;
    let currentTokens = origTokens;
    const history = [];

    for (let round = 0; round < maxRounds; round++) {
      const candidates = this.generateCodeNeighbors(codeForge, current);
      let improved = false;

      for (const candidate of candidates) {
        const candTokens = this.estimateTokens(candidate.text, pk);
        if (candTokens >= currentTokens) continue;

        // Exact semantic check: same stdout
        const candRun = codeForge.run(candidate.text);
        if (!candRun.ok || candRun.output !== groundTruth) continue;

        history.push({ round, text: candidate.text, tokens: candTokens, mutation: candidate.mutation });
        current = candidate.text;
        currentTokens = candTokens;
        improved = true;
        break;  // first-improvement hill climbing
      }

      if (!improved) break;  // local optimum reached
    }

    return this._makeResult(program, current, history, pk);
  }

  /**
   * Generate neighbor candidates for a CodeForge program.
   * Each candidate is { text, mutation } where mutation names the strategy.
   *
   * @param {CodeForge} codeForge
   * @param {string} program
   * @returns {Array<{ text: string, mutation: string }>}
   */
  generateCodeNeighbors(codeForge, program) {
    const candidates = [];
    const rng = this.rng;

    // 1. Whitespace elimination — strip non-essential whitespace
    const stripped = program
      .split('\n')
      .map((line) => line.replace(/^\s+/, '').replace(/\s+$/, ''))
      .filter((line) => line.length > 0)
      .join('\n');
    if (stripped !== program) {
      candidates.push({ text: stripped, mutation: 'whitespace_strip' });
    }

    // 2. Statement packing — merge onto fewer lines
    const packed = stripped.replace(/\n+/g, ' ').replace(/ +/g, ' ').trim();
    if (packed !== program && packed !== stripped) {
      candidates.push({ text: packed, mutation: 'statement_pack' });
    }

    // 3. Comment removal
    const noComments = program.replace(/#[^\n]*/g, '').replace(/\n{2,}/g, '\n').trim();
    if (noComments !== program) {
      candidates.push({ text: noComments, mutation: 'comment_removal' });
    }

    // 4. Identifier shortening — rename user identifiers to 1-char names
    const shortened = this._shortenIdentifiers(codeForge, program);
    if (shortened !== program) {
      candidates.push({ text: shortened, mutation: 'identifier_shorten' });
    }

    // 5. Combined: strip + shorten
    const combined = this._shortenIdentifiers(codeForge, stripped);
    if (combined !== program && combined !== stripped && combined !== shortened) {
      candidates.push({ text: combined, mutation: 'strip+shorten' });
    }

    // 6. Aggressive: pack + shorten
    const aggressive = this._shortenIdentifiers(codeForge, packed);
    if (aggressive !== program && !candidates.some((c) => c.text === aggressive)) {
      candidates.push({ text: aggressive, mutation: 'pack+shorten' });
    }

    // 7. Redundant-space collapse within lines
    const spaceCollapsed = program.replace(/ {2,}/g, ' ');
    if (spaceCollapsed !== program) {
      candidates.push({ text: spaceCollapsed, mutation: 'space_collapse' });
    }

    // 8. Empty-line removal
    const noEmpty = program.replace(/^\s*\n/gm, '');
    if (noEmpty !== program) {
      candidates.push({ text: noEmpty, mutation: 'empty_line_removal' });
    }

    // Shuffle so the hill climber doesn't always pick the same first-improving neighbor
    rng.shuffle(candidates);
    return candidates;
  }

  // -----------------------------------------------------------------------
  // Prose optimization
  // -----------------------------------------------------------------------

  /**
   * Optimize a natural language text for minimal token count while preserving
   * semantic fidelity (content-word coverage above threshold).
   *
   * @param {string} text
   * @param {object} [opts]  { maxRounds, profile, fidelityThreshold }
   * @returns {{ original: object, optimized: object, improvement: object, history: Array, profile: string }}
   */
  optimizeProse(text, opts = {}) {
    const maxRounds = opts.maxRounds ?? this.maxRounds;
    const pk = opts.profile ?? this.profileKey;
    const threshold = opts.fidelityThreshold ?? this.fidelityThreshold;

    const origContentWords = this._extractContentWords(text);
    const origTokens = this.estimateTokens(text, pk);
    let current = text;
    let currentTokens = origTokens;
    const history = [];

    for (let round = 0; round < maxRounds; round++) {
      const candidates = this.generateProseNeighbors(current);
      let improved = false;

      for (const candidate of candidates) {
        const candTokens = this.estimateTokens(candidate.text, pk);
        if (candTokens >= currentTokens) continue;

        // Semantic fidelity: what fraction of original content words survive?
        const fidelity = this._proseFidelity(origContentWords, candidate.text);
        if (fidelity < threshold) continue;

        history.push({ round, text: candidate.text, tokens: candTokens, mutation: candidate.mutation });
        current = candidate.text;
        currentTokens = candTokens;
        improved = true;
        break;
      }

      if (!improved) break;
    }

    return this._makeResult(text, current, history, pk);
  }

  /**
   * Generate neighbor candidates for a prose text.
   *
   * @param {string} text
   * @returns {Array<{ text: string, mutation: string }>}
   */
  generateProseNeighbors(text) {
    const candidates = [];
    const rng = this.rng;

    // 1. Abbreviation — replace long words with standard short forms
    let abbreviated = text;
    for (const [long, short] of Object.entries(ABBREVIATIONS)) {
      const re = new RegExp(`\\b${long}\\b`, 'gi');
      abbreviated = abbreviated.replace(re, short);
    }
    if (abbreviated !== text) {
      candidates.push({ text: abbreviated, mutation: 'abbreviation' });
    }

    // 2. Telegraphic — drop articles, copulas, filler words
    const words = text.split(/\s+/);
    const telegraphic = words.filter((w) => {
      const lower = w.toLowerCase().replace(/[^a-z]/g, '');
      return !DROPPABLE.has(lower);
    }).join(' ');
    if (telegraphic !== text && telegraphic.length > 0) {
      candidates.push({ text: telegraphic, mutation: 'telegraphic' });
    }

    // 3. Symbol substitution — verbose relation words → symbols
    let symbolized = text;
    // Sort keys by length descending to match longer phrases first
    const sortedSubs = Object.entries(SYMBOL_SUBS).sort((a, b) => b[0].length - a[0].length);
    for (const [phrase, symbol] of sortedSubs) {
      const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      symbolized = symbolized.replace(re, symbol);
    }
    if (symbolized !== text) {
      candidates.push({ text: symbolized, mutation: 'symbol_substitution' });
    }

    // 4. Structured format — prose sentences → key:value or bullet list
    const structured = this._toStructured(text);
    if (structured !== text) {
      candidates.push({ text: structured, mutation: 'structured_format' });
    }

    // 5. Whitespace normalization
    const normalized = text.replace(/ {2,}/g, ' ').replace(/\n{2,}/g, '\n').trim();
    if (normalized !== text) {
      candidates.push({ text: normalized, mutation: 'whitespace_normalize' });
    }

    // 6. Combined: abbreviate + telegraphic
    const abbrWords = abbreviated.split(/\s+/);
    const combined = abbrWords.filter((w) => {
      const lower = w.toLowerCase().replace(/[^a-z]/g, '');
      return !DROPPABLE.has(lower);
    }).join(' ');
    if (combined !== text && combined !== abbreviated && combined !== telegraphic) {
      candidates.push({ text: combined, mutation: 'abbreviate+telegraphic' });
    }

    // 7. Combined: all transformations
    let allOpts = combined || telegraphic;
    for (const [phrase, symbol] of sortedSubs) {
      const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      allOpts = allOpts.replace(re, symbol);
    }
    allOpts = allOpts.replace(/ {2,}/g, ' ').trim();
    if (allOpts !== text && !candidates.some((c) => c.text === allOpts)) {
      candidates.push({ text: allOpts, mutation: 'full_compress' });
    }

    // 8. Deduplication — replace repeated phrases with backreference markers
    const deduped = this._deduplicatePhrases(text);
    if (deduped !== text) {
      candidates.push({ text: deduped, mutation: 'deduplication' });
    }

    rng.shuffle(candidates);
    return candidates;
  }

  // -----------------------------------------------------------------------
  // Report
  // -----------------------------------------------------------------------

  /**
   * Generate a human-readable optimization report from a result object.
   *
   * @param {{ original: object, optimized: object, improvement: object, history: Array, profile: string }} result
   * @returns {string}
   */
  report(result) {
    const { original, optimized, improvement, history, profile } = result;
    const profileName = (TOKENIZER_PROFILES[profile] || {}).name || profile;

    let out = '';
    out += `=== Token Compression Report ===\n`;
    out += `Profile: ${profileName}\n\n`;
    out += `--- Original ---\n`;
    out += `Tokens: ${original.tokens}  |  Density: ${original.density} semantic-units/token\n`;
    out += `Text (${original.text.length} chars):\n${original.text}\n\n`;
    out += `--- Optimized ---\n`;
    out += `Tokens: ${optimized.tokens}  |  Density: ${optimized.density} semantic-units/token\n`;
    out += `Text (${optimized.text.length} chars):\n${optimized.text}\n\n`;
    out += `--- Improvement ---\n`;
    out += `Tokens saved: ${improvement.tokensSaved}  (${improvement.percentReduction}% reduction)\n`;
    out += `Rounds used: ${improvement.roundsUsed}\n`;

    if (history.length > 0) {
      out += `\n--- Optimization Trace ---\n`;
      for (const step of history) {
        out += `  Round ${step.round}: ${step.mutation} -> ${step.tokens} tokens\n`;
      }
    }

    if (result.note) {
      out += `\nNote: ${result.note}\n`;
    }

    return out;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Build the standard result object. */
  _makeResult(originalText, optimizedText, history, profileKey, note = null) {
    const origTokens = this.estimateTokens(originalText, profileKey);
    const optTokens = this.estimateTokens(optimizedText, profileKey);
    const origSU = this._countSemanticUnits(originalText);
    const optSU = this._countSemanticUnits(optimizedText);

    return {
      original: {
        text: originalText,
        tokens: origTokens,
        density: origTokens > 0 ? +(origSU / origTokens).toFixed(4) : 0,
      },
      optimized: {
        text: optimizedText,
        tokens: optTokens,
        density: optTokens > 0 ? +(optSU / optTokens).toFixed(4) : 0,
      },
      improvement: {
        tokensSaved: origTokens - optTokens,
        percentReduction: origTokens > 0 ? +((1 - optTokens / origTokens) * 100).toFixed(1) : 0,
        roundsUsed: history.length,
      },
      history,
      profile: profileKey,
      note,
    };
  }

  /** Count semantic units (content words + numbers + operators with meaning). */
  _countSemanticUnits(text) {
    const words = text.split(/\s+/).filter(Boolean);
    let units = 0;
    for (const w of words) {
      const lower = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!lower) {
        // Pure punctuation/operator — count as 0.5 semantic unit
        units += 0.5;
      } else if (STOP_WORDS.has(lower)) {
        units += 0.1;  // function words carry little information
      } else {
        units += 1;
      }
    }
    return Math.max(1, Math.round(units * 10) / 10);
  }

  /** Breakdown of token usage by category. */
  _breakdown(text, profileKey) {
    const words = text.split(/\s+/).filter(Boolean);
    const profile = TOKENIZER_PROFILES[profileKey || this.profileKey] || TOKENIZER_PROFILES.generic;
    let singleToken = 0, multiToken = 0, punctuation = 0, numeric = 0;
    for (const w of words) {
      const lower = w.toLowerCase();
      if (profile.singleTokenWords.has(lower)) singleToken++;
      else if (/^[0-9]+(\.[0-9]+)?$/.test(w)) numeric++;
      else if (/^[^a-zA-Z0-9]+$/.test(w)) punctuation++;
      else multiToken++;
    }
    return { singleToken, multiToken, punctuation, numeric, totalWords: words.length };
  }

  /** Extract the set of content words from text (words carrying core meaning). */
  _extractContentWords(text) {
    const words = text.split(/\s+/).filter(Boolean);
    const content = new Set();
    for (const w of words) {
      const lower = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower && CONTENT_WORD_RE.test(lower) && !STOP_WORDS.has(lower)) {
        content.add(lower);
      }
    }
    return content;
  }

  /** Measure what fraction of original content words appear in the compressed text. */
  _proseFidelity(origContentWords, compressedText) {
    if (origContentWords.size === 0) return 1.0;
    const compressedLower = compressedText.toLowerCase();
    let found = 0;
    for (const word of origContentWords) {
      // Check full word or its abbreviation
      if (compressedLower.includes(word)) {
        found++;
      } else {
        // Check if a known abbreviation is present
        const abbr = ABBREVIATIONS[word];
        if (abbr && compressedLower.includes(abbr.toLowerCase())) {
          found++;
        }
      }
    }
    return found / origContentWords.size;
  }

  /** Rename user identifiers in a CodeForge program to 1-char names. */
  _shortenIdentifiers(codeForge, program) {
    try {
      const tokens = codeForge.tokenize(program);
      const kwSet = codeForge.keywordSet;
      // Collect all user identifiers
      const ids = new Set();
      for (const tok of tokens) {
        if (tok.t === 'id') ids.add(tok.v);
      }
      if (ids.size === 0) return program;

      // Build a rename map: longest ids get shortest replacement names first
      const sorted = [...ids].sort((a, b) => b.length - a.length);
      const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
      const renameMap = new Map();
      let nameIdx = 0;
      for (const id of sorted) {
        // Generate a short name that doesn't collide with keywords or existing ids
        let shortName;
        do {
          if (nameIdx < 26) {
            shortName = ALPHABET[nameIdx];
          } else {
            shortName = ALPHABET[nameIdx % 26] + String(Math.floor(nameIdx / 26));
          }
          nameIdx++;
        } while (kwSet.has(shortName) || ids.has(shortName));

        // Only rename if the short name is actually shorter
        if (shortName.length < id.length) {
          renameMap.set(id, shortName);
        }
      }

      if (renameMap.size === 0) return program;

      // Apply renames — use word-boundary matching to avoid partial replacements.
      // Sort by length descending to prevent substring collisions.
      let result = program;
      const sortedRenames = [...renameMap.entries()].sort((a, b) => b[0].length - a[0].length);
      for (const [original, replacement] of sortedRenames) {
        const re = new RegExp(`\\b${original}\\b`, 'g');
        result = result.replace(re, replacement);
      }
      return result;
    } catch {
      return program;
    }
  }

  /**
   * Convert prose to a more structured key:value-ish format when sentences
   * follow an "X is Y" or "X: Y" pattern.
   */
  _toStructured(text) {
    const sentences = text.split(/[.!?]\s+/).filter((s) => s.trim().length > 0);
    if (sentences.length < 2) return text;

    const lines = [];
    let changed = false;
    for (const sentence of sentences) {
      // Try to extract "Subject is/are Predicate" patterns
      const isMatch = sentence.match(/^(.+?)\s+(?:is|are|was|were)\s+(.+)$/i);
      if (isMatch) {
        lines.push(`${isMatch[1].trim()}: ${isMatch[2].trim()}`);
        changed = true;
      } else {
        lines.push(sentence.trim());
      }
    }
    return changed ? lines.join('\n') : text;
  }

  /**
   * Detect repeated multi-word phrases and replace later occurrences with
   * a short backreference marker like [^1].
   */
  _deduplicatePhrases(text) {
    const words = text.split(/\s+/);
    if (words.length < 10) return text;

    // Find repeated 3+-word phrases
    const phrases = new Map();  // phrase -> [startIndex, ...]
    for (let len = 5; len >= 3; len--) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ').toLowerCase();
        if (!phrases.has(phrase)) phrases.set(phrase, []);
        phrases.get(phrase).push(i);
      }
    }

    // Filter to actually-repeated phrases
    const repeated = [...phrases.entries()]
      .filter(([, positions]) => positions.length >= 2)
      .sort((a, b) => b[0].length - a[0].length);  // longest first

    if (repeated.length === 0) return text;

    let result = text;
    let refNum = 1;
    const replaced = new Set();
    for (const [phrase] of repeated) {
      if (refNum > 9) break;  // cap at 9 backreferences
      // Only replace phrases we haven't partially overlapped with already
      if (replaced.has(phrase)) continue;

      const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = [...result.matchAll(re)];
      if (matches.length < 2) continue;

      // Keep first occurrence, replace subsequent with [^N]
      let count = 0;
      result = result.replace(re, (match) => {
        if (count++ === 0) return match;
        return `[^${refNum}]`;
      });
      replaced.add(phrase);
      refNum++;
    }

    return result;
  }
}

export default TokenCompressor;
