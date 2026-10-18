/**
 * GLOSSOPETRAE - Reverse Translator Module
 *
 * Decodes text in the generated language back into English. This is the
 * inverse of TranslationEngine.translateToConlang(): it inverts that
 * engine's *actual* output (its inflection order, word order transform,
 * particle placement, and transliteration of unknown words), not a
 * theoretical grammar.
 *
 * Pipeline:
 *   1. Index construction  - every precomputed paradigm form of every
 *      lexicon entry is mapped back to {lemma, gloss, class, parse}.
 *   2. Morpheme segmentation - forms not in the index are decoded by
 *      iterative suffix stripping against the affix inventory
 *      (the TranslationEngine only ever *appends* affixes, even
 *      agreement markers that MorphologyWeaver generated as "prefixes").
 *   3. Syntactic decoding  - case roles (ERG/NOM -> subject,
 *      ABS/ACC -> object, DAT -> recipient, GEN -> possessor) plus the
 *      language's basic word order recover an English SVO rendering.
 *   4. Leipzig-style interlinear gloss output.
 *
 * Zero dependencies, pure ESM, deterministic.
 */

export class ReverseTranslator {
  /**
   * @param {object} language - generated language object with
   *   .lexicon (lookup/getEntries), .morphology, .translationEngine
   */
  constructor(language) {
    this.language = language;
    this.lexicon = language.lexicon;
    this.morphology = language.morphology;
    this.engine = language.translationEngine || null;

    this._buildEnglishTables();
    this._buildAbbrTables();
    this._buildFormIndex();
    this._buildAffixInventory();
    this._buildTransliterationMap();
  }

  // ===================================================================
  // PUBLIC API
  // ===================================================================

  /**
   * Translate conlang text to English.
   * @param {string} conlangText
   * @returns {{source: string, english: string, gloss: string,
   *   words: Array<{surface: string, parse: {stem: string, lemma: string|null,
   *     gloss: string|null, affixes: Array<{form: string, meaning: string}>},
   *     confidence: number}>, unknownWords: string[]}}
   */
  translateToEnglish(conlangText) {
    const text = String(conlangText ?? '').trim();
    const result = { source: conlangText, english: '', gloss: '', words: [], unknownWords: [] };
    if (!text) return result;

    this._refreshDynamicTransliterations();

    const sentences = this._splitSentences(text);
    const englishParts = [];
    const glossParts = [];

    for (const sentence of sentences) {
      const tokens = this._tokenizeSentence(sentence.text);
      if (tokens.length === 0) continue;
      const decoded = this._decodeSentence(tokens, sentence.punctuation);
      englishParts.push(decoded.english);
      glossParts.push(decoded.gloss);
      result.words.push(...decoded.words);
      for (const u of decoded.unknownWords) {
        if (!result.unknownWords.includes(u)) result.unknownWords.push(u);
      }
    }

    result.english = englishParts.join(' ');
    result.gloss = glossParts.join('\n\n');
    return result;
  }

  /**
   * Segment a single conlang word into stem + affixes.
   * Exposed for testing/UI.
   * @param {string} word
   * @returns {{surface: string, stem: string, lemma: string|null,
   *   gloss: string|null, class: string|null,
   *   affixes: Array<{form: string, meaning: string}>,
   *   parse: object, confidence: number, alternatives: object[]}}
   */
  segment(word) {
    const surface = String(word ?? '').trim();
    const candidates = this._candidatesFor(surface);

    if (candidates.length === 0) {
      return {
        surface, stem: surface, lemma: null, gloss: null, class: null,
        affixes: [], parse: {}, confidence: 0, alternatives: [],
      };
    }

    const toPublic = (c) => ({
      surface,
      stem: c.stem,
      lemma: c.entry ? c.entry.lemma : null,
      gloss: c.entry ? c.entry.gloss : (c.translitEnglish || null),
      class: c.entry ? c.entry.class : (c.translitEnglish ? 'unknown-loan' : null),
      affixes: c.affixes,
      parse: c.parse,
      confidence: c.confidence,
    });

    const best = toPublic(candidates[0]);
    best.alternatives = candidates.slice(1, 4).map(toPublic);
    return best;
  }

  /**
   * Round-trip: English -> conlang -> English, with a lexical recovery score.
   * @param {string} englishSentence
   * @returns {{english: string, conlang: string, back: string, lexicalMatchRate: number}}
   */
  roundTrip(englishSentence) {
    if (!this.engine || typeof this.engine.translateToConlang !== 'function') {
      throw new Error('ReverseTranslator.roundTrip requires language.translationEngine');
    }
    const forward = this.engine.translateToConlang(englishSentence);
    const conlang = forward.target || '';
    const back = this.translateToEnglish(conlang).english;
    const lexicalMatchRate = this._lexicalMatchRate(englishSentence, back);
    return { english: englishSentence, conlang, back, lexicalMatchRate };
  }

  // ===================================================================
  // INDEX CONSTRUCTION
  // ===================================================================

  /** Tables mapping morphological abbreviations to affix forms. */
  _buildAbbrTables() {
    const nominal = this.morphology?.nominal || {};
    const verbal = this.morphology?.verbal || {};

    this._cases = (nominal.caseSystem?.cases || []).slice();
    this._numbers = (nominal.numberSystem?.categories || []).slice();
    this._tenses = (verbal.tenses?.tenses || []).slice();
    this._markers = (verbal.agreement?.subjectMarkers || []).slice();
    this._alignment = nominal.caseSystem?.alignment || 'neutral';

    this._caseByAbbr = new Map(this._cases.map(c => [c.abbr, c]));
    this._numberByAbbr = new Map(this._numbers.map(n => [n.abbr, n]));
    this._tenseByAbbr = new Map(this._tenses.map(t => [t.abbr, t]));
    this._markerByLabel = new Map(this._markers.map(m => [m.label, m]));

    this._wordOrder = this.morphology?.wordOrder?.basic || 'SVO';
    this._adjPosition = this.morphology?.wordOrder?.adjectivePosition || 'before';
  }

  /**
   * surface form -> [{entry, parse, affixes, stem, source, score}] for the
   * lemma and every precomputed paradigm form of every lexicon entry.
   */
  _buildFormIndex() {
    this._formIndex = new Map();   // surface -> candidate[]
    this._lemmaIndex = new Map();  // lemma -> entry[] (for stem validation)

    const add = (surface, cand) => {
      if (!surface) return;
      let arr = this._formIndex.get(surface);
      if (!arr) { arr = []; this._formIndex.set(surface, arr); }
      arr.push(cand);
    };

    const entries = this.lexicon?.getEntries?.() || [];
    for (const entry of entries) {
      // Bare lemma (uninflected forms, function words, particles)
      add(entry.lemma, {
        entry, parse: {}, affixes: [], stem: entry.lemma,
        source: 'lemma', score: this._baseScore('lemma', entry, 0),
      });
      let lemmaArr = this._lemmaIndex.get(entry.lemma);
      if (!lemmaArr) { lemmaArr = []; this._lemmaIndex.set(entry.lemma, lemmaArr); }
      lemmaArr.push(entry);

      // Precomputed paradigm forms
      if (entry.paradigm?.forms) {
        for (const [key, form] of Object.entries(entry.paradigm.forms)) {
          const parse = this._parseParadigmKey(key, entry);
          add(form, {
            entry, parse, affixes: this._affixesFromParse(parse),
            stem: entry.lemma, source: 'paradigm', key,
            score: this._baseScore('paradigm', entry, 0),
          });
        }
      }
    }

    // Morphology-level adpositions (never emitted by TranslationEngine,
    // which uses lexicon adpositions, but valid surface vocabulary).
    for (const adp of this.morphology?.adpositions || []) {
      if (this._formIndex.has(adp.form)) continue;
      const pseudo = { lemma: adp.form, gloss: adp.meaning.split('/')[0], class: 'adposition' };
      add(adp.form, {
        entry: pseudo, parse: {}, affixes: [], stem: adp.form,
        source: 'lemma', score: this._baseScore('lemma', pseudo, 0) - 5,
      });
    }
  }

  /**
   * Parse a paradigm key like 'ERG.SG', 'PL', 'PST.3SG', 'REM.PST.3SG', 'NOM'
   * into {case, number, tense, person} using the language's own label sets.
   */
  _parseParadigmKey(key, entry) {
    const cls = entry.class;
    if (cls === 'verb') {
      // key = `${tense.abbr}.${marker.label}` or just tense.abbr.
      // Tense abbrs may themselves contain dots (REM.PST), so match marker
      // labels from the end.
      for (const label of this._markerByLabel.keys()) {
        if (key === label) return { person: label };
        if (key.endsWith('.' + label)) {
          return { tense: key.slice(0, -(label.length + 1)), person: label };
        }
      }
      return { tense: key };
    }
    if (cls === 'adjective') {
      return { case: key };
    }
    // noun / pronoun / determiner: `${case.abbr}.${number.abbr}` or number only
    const parts = key.split('.');
    if (parts.length === 2 && this._caseByAbbr.has(parts[0])) {
      return { case: parts[0], number: parts[1] };
    }
    if (this._caseByAbbr.has(key)) return { case: key };
    if (this._numberByAbbr.has(key)) return { number: key };
    return {};
  }

  /** Reconstruct overt affix list from a parse, in the engine's affix order. */
  _affixesFromParse(parse) {
    const affixes = [];
    // Nominal order: stem + number + case (LexiconGenerator._inflectNoun)
    if (parse.number) {
      const n = this._numberByAbbr.get(parse.number);
      if (n?.suffix) affixes.push({ form: n.suffix, meaning: parse.number });
    }
    if (parse.case) {
      const c = this._caseByAbbr.get(parse.case);
      if (c?.suffix) affixes.push({ form: c.suffix, meaning: parse.case });
    }
    // Verbal order: stem + tense + agreement (TranslationEngine._transferVerb)
    if (parse.tense) {
      const t = this._tenseByAbbr.get(parse.tense);
      if (t?.suffix) affixes.push({ form: t.suffix, meaning: parse.tense });
    }
    if (parse.person) {
      const m = this._markerByLabel.get(parse.person);
      if (m?.affix) affixes.push({ form: m.affix, meaning: parse.person });
    }
    return affixes;
  }

  /**
   * Affix inventory for stripping, sorted longest-first.
   * NOTE: TranslationEngine appends every affix as a suffix - including
   * agreement markers MorphologyWeaver generated as 'prefix' - so the
   * decoder strips suffixes only.
   */
  _buildAffixInventory() {
    const suffixes = [];
    for (const c of this._cases) {
      if (c.suffix) suffixes.push({ form: c.suffix, type: 'case', abbr: c.abbr });
    }
    for (const n of this._numbers) {
      if (n.suffix) suffixes.push({ form: n.suffix, type: 'number', abbr: n.abbr });
    }
    for (const t of this._tenses) {
      if (t.suffix) suffixes.push({ form: t.suffix, type: 'tense', abbr: t.abbr });
    }
    for (const m of this._markers) {
      if (m.affix) suffixes.push({ form: m.affix, type: 'agr', abbr: m.label });
    }
    suffixes.sort((a, b) => b.form.length - a.form.length || a.form.localeCompare(b.form));
    this._suffixInventory = suffixes;
  }

  /**
   * Seed the TranslationEngine's deterministic unknown-word generator with
   * common English function words so their transliterations can be decoded
   * (the engine emits e.g. 'will' -> 'willi' with no lexicon entry).
   */
  _buildTransliterationMap() {
    this._translitKind = new Map(); // english -> kind
    this._translitReverse = new Map(); // surface -> english
    if (!this.engine || typeof this.engine._generateUnknownWord !== 'function') return;

    const seedWords = [
      ['will', 'modal'], ['would', 'modal'], ['can', 'modal'], ['could', 'modal'],
      ['may', 'modal'], ['might', 'modal'], ['must', 'modal'], ['shall', 'modal'],
      ['should', 'modal'],
      ['extremely', 'degree'], ['quite', 'degree'], ['rather', 'degree'],
      ['somewhat', 'degree'], ['slightly', 'degree'], ['too', 'degree'],
      ['enough', 'degree'], ['almost', 'degree'], ['nearly', 'degree'],
      ['completely', 'degree'], ['totally', 'degree'], ['absolutely', 'degree'],
      ['hardly', 'degree'], ['barely', 'degree'], ['scarcely', 'degree'],
      ['comp', 'comparative'], ['supl', 'comparative'],
      ['comp.neg', 'comparative'], ['supl.neg', 'comparative'],
      ['soon', 'time'], ['later', 'time'], ['earlier', 'time'], ['always', 'time'],
      ['never', 'time'], ['often', 'time'], ['sometimes', 'time'], ['rarely', 'time'],
      ['once', 'time'], ['twice', 'time'], ['ago', 'time'],
      ['through', 'prep'], ['across', 'prep'], ['between', 'prep'], ['behind', 'prep'],
      ['around', 'prep'], ['above', 'prep'], ['below', 'prep'], ['along', 'prep'],
      ['against', 'prep'],
      ['so', 'conj'], ['yet', 'conj'], ['when', 'conj'], ['where', 'conj'],
      ['before', 'conj'], ['after', 'conj'], ['until', 'conj'], ['although', 'conj'],
      ['though', 'conj'], ['while', 'conj'],
      ['why', 'wh'], ['how', 'wh'], ['which', 'wh'], ['whom', 'wh'], ['whose', 'wh'],
      ['do', 'aux'], ['does', 'aux'], ['did', 'aux'],
    ];
    const comparativeEnglish = {
      'comp': 'more', 'supl': 'most', 'comp.neg': 'less', 'supl.neg': 'least',
    };

    for (const [word, kind] of seedWords) {
      try {
        const form = this.engine._generateUnknownWord(word);
        const english = comparativeEnglish[word] || word;
        this._translitKind.set(word, kind);
        if (form && !form.includes(' ') && !this._translitReverse.has(form)) {
          this._translitReverse.set(form, english);
        }
      } catch {
        /* skip words the generator cannot handle */
      }
    }
    this._dynamicCacheSize = this.engine._unknownWordCache?.size || 0;
  }

  /**
   * Pick up transliterations the engine generated since construction
   * (e.g. proper nouns seen in a forward pass of roundTrip()).
   */
  _refreshDynamicTransliterations() {
    const cache = this.engine?._unknownWordCache;
    if (!cache || cache.size === this._dynamicCacheSize) return;
    for (const [english, form] of cache.entries()) {
      if (form && !form.includes(' ') && !this._translitReverse.has(form)) {
        this._translitReverse.set(form, english);
      }
    }
    this._dynamicCacheSize = cache.size;
  }

  // ===================================================================
  // WORD-LEVEL ANALYSIS
  // ===================================================================

  _baseScore(source, entry, affixCount) {
    let score;
    if (source === 'paradigm') score = 100;
    else if (source === 'lemma') score = 95;
    else if (source === 'derived') score = 80 - 8 * affixCount;
    else score = 55 - 8 * affixCount; // translit-stem
    // Closed-class function words are high-frequency: when their lemma
    // collides with an inflected form of a content word, prefer them.
    if (source === 'lemma' && entry &&
        ['particle', 'conjunction', 'adposition', 'interrogative'].includes(entry.class)) {
      score = 100;
    }
    if (entry && entry.frequency === 'high') score += 2;
    return score;
  }

  /**
   * All candidate analyses for a surface form, best first. Deterministic.
   */
  _candidatesFor(surface) {
    const out = [];
    const seen = new Set();
    const push = (c) => {
      // NOTE: distinct lexicon entries can share a lemma (LexiconGenerator's
      // uniqueness fallback does not re-check distinctness), so the
      // signature must include gloss+class, not just the lemma.
      const sig = `${c.entry ? c.entry.gloss + '/' + c.entry.class : '~' + c.translitEnglish}|${c.parse.case || ''}|${c.parse.number || ''}|${c.parse.tense || ''}|${c.parse.person || ''}`;
      if (seen.has(sig)) return;
      seen.add(sig);
      out.push(c);
    };

    for (const key of [surface, surface.toLowerCase()]) {
      const hits = this._formIndex.get(key);
      if (hits) for (const h of hits) push({ ...h });
      if (key === surface.toLowerCase()) break;
    }

    // Whole-word transliteration of a known English word
    const translit = this._translitReverse.get(surface) || this._translitReverse.get(surface.toLowerCase());
    if (translit) {
      push({
        entry: null, translitEnglish: translit, parse: {}, affixes: [],
        stem: surface, source: 'translit', score: 60,
      });
    }

    // Morpheme segmentation for on-the-fly inflected forms
    for (const c of this._segmentCandidates(surface)) push(c);

    out.sort((a, b) =>
      b.score - a.score ||
      (b.stem.length - a.stem.length) ||
      String(a.entry?.lemma || a.translitEnglish).localeCompare(String(b.entry?.lemma || b.translitEnglish))
    );
    for (const c of out) c.confidence = this._confidenceFor(c);
    return out;
  }

  _confidenceFor(c) {
    if (c.source === 'paradigm') return 0.95;
    if (c.source === 'lemma') return 0.9;
    if (c.source === 'derived') return Math.max(0.4, 0.75 - 0.1 * c.affixes.length);
    if (c.source === 'translit') return 0.5;
    return 0.3;
  }

  /**
   * Iterative suffix stripping: try longest affixes first, up to 3, and
   * validate the remaining stem against the lemma index (or the
   * transliteration map for engine-generated loanwords).
   */
  _segmentCandidates(word) {
    const results = [];
    const visited = new Set();

    const chainValid = (chain) => {
      // chain is in strip order (outermost first). Legal engine orders:
      //   noun:  stem+number+case  -> strip [case], [case,number], [number]
      //   verb:  stem+tense+agr    -> strip [agr], [agr,tense], [tense]
      //   adj:   stem+case         -> strip [case]
      const types = chain.map(a => a.type).join(',');
      return ['case', 'case,number', 'number', 'agr', 'agr,tense', 'tense'].includes(types);
    };
    const classCompatible = (cls, chain) => {
      const domain = chain.some(a => a.type === 'tense' || a.type === 'agr') ? 'verbal' : 'nominal';
      if (domain === 'verbal') return cls === 'verb';
      if (chain.length === 1 && chain[0].type === 'case' && cls === 'adjective') return true;
      return ['noun', 'pronoun', 'determiner'].includes(cls);
    };
    const parseFromChain = (chain) => {
      const parse = {};
      for (const a of chain) {
        if (a.type === 'case') parse.case = a.abbr;
        else if (a.type === 'number') parse.number = a.abbr;
        else if (a.type === 'tense') parse.tense = a.abbr;
        else if (a.type === 'agr') parse.person = a.abbr;
      }
      return parse;
    };

    const walk = (rest, chain) => {
      const stateKey = rest + '|' + chain.map(a => a.type + a.form).join('.');
      if (visited.has(stateKey)) return;
      visited.add(stateKey);

      if (chain.length > 0 && chainValid(chain)) {
        const parse = parseFromChain(chain);
        // affixes in surface order = reverse of strip order
        const affixes = chain.slice().reverse().map(a => ({ form: a.form, meaning: a.abbr }));
        const entries = this._lemmaIndex.get(rest) || [];
        for (const entry of entries) {
          if (!classCompatible(entry.class, chain)) continue;
          results.push({
            entry, parse, affixes, stem: rest, source: 'derived',
            score: this._baseScore('derived', entry, chain.length),
          });
        }
        const translit = this._translitReverse.get(rest);
        if (translit) {
          results.push({
            entry: null, translitEnglish: translit, parse, affixes, stem: rest,
            source: 'translit-derived',
            score: this._baseScore('translit-derived', null, chain.length),
          });
        }
      }

      if (chain.length >= 3) return;
      for (const affix of this._suffixInventory) {
        if (rest.length - affix.form.length < 1) continue;
        if (!rest.endsWith(affix.form)) continue;
        walk(rest.slice(0, -affix.form.length), [...chain, affix]);
      }
    };

    walk(word, []);
    walk(word.toLowerCase() === word ? word : word.toLowerCase(), []);
    return results;
  }

  // ===================================================================
  // SENTENCE DECODING
  // ===================================================================

  _splitSentences(text) {
    const sentences = [];
    const regex = /([^.!?]+)([.!?]+)?/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const t = match[1].trim();
      if (t) sentences.push({ text: t, punctuation: (match[2] || '.')[0] });
      if (match.index === regex.lastIndex) regex.lastIndex++;
    }
    return sentences.length ? sentences : [{ text: text, punctuation: '.' }];
  }

  _tokenizeSentence(text) {
    return text.split(/\s+/)
      .map(t => t.replace(/^["“”(),;:]+/, '').replace(/["“”(),;:]+$/, ''))
      .filter(t => t.length > 0);
  }

  /** Classify one analyzed word into a syntactic role for decoding. */
  _classify(best) {
    if (!best) return 'unknown';
    if (best.translitEnglish) {
      const kind = this._translitKind.get(best.translitEnglish) ||
        this._translitKind.get(this._reverseComparative(best.translitEnglish));
      if (kind === 'modal') return 'modal';
      if (kind === 'aux') return 'aux';
      if (kind === 'prep') return 'adp';
      if (kind === 'conj') return 'conj';
      if (kind === 'wh') return 'wh';
      if (kind === 'time' || kind === 'degree' || kind === 'comparative') return 'adv';
      return 'nom'; // dynamic unknowns (proper nouns etc.) behave as NP heads
    }
    const e = best.entry;
    switch (e.class) {
      case 'particle':
        if (e.gloss === 'not') return 'neg';
        if (e.gloss === 'question particle') return 'q';
        return 'adv';
      case 'conjunction': return 'conj';
      case 'adposition': return 'adp';
      case 'interrogative': return 'wh';
      case 'determiner': return 'det';
      case 'adverb': return 'adv';
      case 'adjective': return 'adj';
      case 'verb':
        return (e.isCopula || e.gloss === 'to be (copula)') ? 'cop' : 'verb';
      default: return 'nom';
    }
  }

  _reverseComparative(english) {
    return { more: 'comp', most: 'supl', less: 'comp.neg', least: 'supl.neg' }[english] || english;
  }

  _decodeSentence(tokens, punctuation) {
    const items = tokens.map(surface => {
      const cands = this._candidatesFor(surface);
      const best = cands[0] || null;
      return { surface, cands, best, role: this._classify(best) };
    });

    this._rerankInContext(items);

    // Ensure exactly one main verb per clause where possible: if no item is
    // a verb but some item has a strong verb-class alternative, promote it.
    if (!items.some(i => i.role === 'verb')) {
      for (const item of items) {
        const verbAlt = item.cands.find(c => c.entry?.class === 'verb' && !c.entry.isCopula);
        if (verbAlt && item.best && verbAlt.score >= item.best.score - 15) {
          item.best = verbAlt;
          item.role = 'verb';
          break;
        }
      }
    }

    // API word records + unknown collection
    const words = [];
    const unknownWords = [];
    for (const item of items) {
      if (item.best) {
        words.push({
          surface: item.surface,
          parse: {
            stem: item.best.stem,
            lemma: item.best.entry ? item.best.entry.lemma : null,
            gloss: item.best.entry ? item.best.entry.gloss : (item.best.translitEnglish || null),
            affixes: item.best.affixes,
          },
          confidence: item.best.confidence,
        });
      } else {
        words.push({
          surface: item.surface,
          parse: { stem: item.surface, lemma: null, gloss: null, affixes: [] },
          confidence: 0,
        });
        unknownWords.push(item.surface);
      }
    }

    // Clause splitting: a conjunction separates clauses only when both
    // sides contain a verb (otherwise it coordinates NPs).
    const clauses = this._splitClauses(items);
    const isQuestion = punctuation === '?' || items.some(i => i.role === 'q');
    const renderedClauses = [];
    for (const clause of clauses) {
      renderedClauses.push({
        conj: clause.conj,
        text: this._renderClause(clause.items, isQuestion),
      });
    }

    let english = renderedClauses
      .map((c, i) => (i > 0 ? `${c.conj} ${c.text}` : c.text))
      .filter(s => s.length > 0)
      .join(' ');
    english = english.replace(/\s+/g, ' ').trim();
    english = english.charAt(0).toUpperCase() + english.slice(1);
    english += isQuestion ? '?' : '.';

    return { english, gloss: this._formatGloss(items), words, unknownWords };
  }

  /**
   * Contextual disambiguation of near-tie analyses. Generated lexicons can
   * collide: an inflected paradigm form of one entry may equal the bare
   * lemma of another. Two cheap, deterministic repairs:
   *   1. A clause should normally have one finite verb - surplus "verbs"
   *      that have a near-tie non-verb reading are demoted.
   *   2. A word with a near-tie adjective reading adjacent to a noun (per
   *      the language's adjectivePosition) is read as that adjective.
   */
  _rerankInContext(items) {
    const MARGIN = 12;
    const isNominalRole = (r) => ['nom', 'det', 'unknown'].includes(r);

    // 2. adjective adjacency
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.best || item.role === 'adj' || item.role === 'verb') continue;
      const adjAlt = item.cands.find(c => c.entry?.class === 'adjective');
      if (!adjAlt || adjAlt.score < item.best.score - MARGIN) continue;
      const neighbor = this._adjPosition === 'after' ? items[i - 1] : items[i + 1];
      if (neighbor && (isNominalRole(neighbor.role) ||
          neighbor.cands.some(c => ['noun', 'pronoun'].includes(c.entry?.class)))) {
        item.best = adjAlt;
        item.role = 'adj';
      }
    }

    // 1. surplus-verb demotion
    const verbItems = items.filter(it => it.role === 'verb');
    if (verbItems.length > 1) {
      const gap = (it) => {
        const alt = it.cands.find(c => c !== it.best &&
          c.entry?.class !== 'verb' && !c.translitEnglish?.startsWith('‹'));
        return alt ? it.best.score - alt.score : Infinity;
      };
      // Keep the verb reading that is hardest to explain away
      const keep = verbItems.reduce((a, b) => (gap(b) > gap(a) ? b : a));
      for (const it of verbItems) {
        if (it === keep) continue;
        const alt = it.cands.find(c => c !== it.best && c.entry?.class !== 'verb');
        if (alt && alt.score >= it.best.score - MARGIN) {
          it.best = alt;
          it.role = this._classify(alt);
        }
      }
    }
  }

  _splitClauses(items) {
    const hasVerb = (arr) => arr.some(i => i.role === 'verb' || i.role === 'cop');
    const clauses = [];
    let current = [];
    let pendingConj = null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.role === 'conj') {
        const rest = items.slice(i + 1);
        if (hasVerb(current) && hasVerb(rest)) {
          clauses.push({ conj: pendingConj || '', items: current });
          pendingConj = item.best.entry ? item.best.entry.gloss : item.best.translitEnglish;
          current = [];
          continue;
        }
      }
      current.push(item);
    }
    if (current.length) clauses.push({ conj: pendingConj || '', items: current });
    return clauses.length ? clauses : [{ conj: '', items }];
  }

  /**
   * Build NP groups from a clause: adjectives attach per the language's
   * adjective position, adpositions bind the *following* NP (the engine
   * always emits the adposition word before the NP, even in languages
   * whose manifest says "postposition"), GEN-cased NPs become possessors
   * of the next NP.
   */
  _buildGroups(clauseItems) {
    const groups = [];
    const loose = { wh: [], advFront: [], advBack: [], modals: [], extraVerbs: [] };
    let verb = null;
    let negated = false;
    let pendingAdjs = [];
    let pendingAdp = null;
    let pendingPoss = null;
    let pendingCoord = null;
    let pendingInf = false;

    const timeFront = new Set(['yesterday', 'today', 'tomorrow', 'now', 'soon',
      'later', 'earlier', 'always', 'never', 'often', 'sometimes', 'rarely', 'once', 'twice']);

    for (let idx = 0; idx < clauseItems.length; idx++) {
      const item = clauseItems[idx];
      switch (item.role) {
        case 'neg': negated = true; break;
        case 'q': break; // handled at sentence level
        case 'modal': loose.modals.push(item.best.translitEnglish); break;
        case 'aux': break; // do-support is regenerated, drop
        case 'wh': loose.wh.push(item.best.entry ? item.best.entry.gloss : item.best.translitEnglish); break;
        case 'adv': {
          const g = item.best.entry ? item.best.entry.gloss : item.best.translitEnglish;
          (timeFront.has(g) ? loose.advFront : loose.advBack).push(g);
          break;
        }
        case 'conj':
          pendingCoord = item.best.entry ? item.best.entry.gloss : item.best.translitEnglish;
          break;
        case 'adp': {
          const prep = item.best.entry ? item.best.entry.gloss : item.best.translitEnglish;
          // "to" + verb = engine's infinitive construction
          const next = clauseItems[idx + 1];
          if (prep === 'to' && next && next.role === 'verb' && verb) {
            pendingInf = true;
          } else {
            pendingAdp = prep.split('/')[0];
          }
          break;
        }
        case 'adj':
          if (this._adjPosition === 'after' && groups.length > 0 && !pendingAdp && !pendingCoord) {
            groups[groups.length - 1].adjs.push(item.best.entry.gloss);
          } else {
            pendingAdjs.push(item.best.entry.gloss);
          }
          break;
        case 'cop':
          verb = verb || { item, copula: true };
          break;
        case 'verb':
          if (!verb) {
            verb = { item, copula: false };
          } else {
            loose.extraVerbs.push({ item, infinitive: pendingInf });
            pendingInf = false;
          }
          break;
        case 'det':
        case 'nom':
        case 'unknown': {
          const group = {
            head: item,
            adjs: pendingAdjs,
            prep: pendingAdp,
            poss: pendingPoss,
            coordPrev: pendingCoord,
            det: item.role === 'det' ? item.best.entry.gloss : null,
          };
          pendingAdjs = []; pendingAdp = null; pendingPoss = null; pendingCoord = null;
          const parse = item.best ? item.best.parse : {};
          if (parse.case === 'GEN' && !group.prep) {
            pendingPoss = group; // possessor of the NP that follows
          } else {
            groups.push(group);
          }
          break;
        }
        default: break;
      }
    }
    // Orphaned possessor (no head followed): treat as plain NP
    if (pendingPoss) groups.push(pendingPoss);
    if (pendingAdjs.length) loose.advBack.push(...pendingAdjs);

    // Merge NP coordination: consecutive same-case groups joined by a
    // conjunction form one (plural) coordinated NP ("the man and the woman")
    for (let i = groups.length - 1; i > 0; i--) {
      const g = groups[i];
      const prev = groups[i - 1];
      const caseOf = (x) => x.head.best?.parse?.case || null;
      if (g.coordPrev && !g.prep && caseOf(g) === caseOf(prev)) {
        prev.coordTail = prev.coordTail || [];
        prev.coordTail.unshift({ conj: g.coordPrev, group: { ...g, coordPrev: null } });
        prev.coordPlural = true;
        groups.splice(i, 1);
      }
    }

    return { groups, verb, negated, loose };
  }

  /** Assign subject/object/indirect/PP roles to NP groups. */
  _assignRoles(groups, clauseItems, verb) {
    const roles = { subject: null, object: null, indirect: null, pps: [], extras: [] };
    const obliquePrep = {
      LOC: 'in', INS: 'with', COM: 'with', ABL: 'from', ALL: 'to',
      BEN: 'for', CAU: 'because of', VOC: '',
    };
    const unassigned = [];

    for (const g of groups) {
      const cse = g.head.best?.parse?.case || null;
      if (g.prep) { roles.pps.push(g); continue; }
      if (cse === 'DAT') { if (!roles.indirect) roles.indirect = g; else roles.extras.push(g); continue; }
      if (cse && obliquePrep[cse] !== undefined) { g.prep = obliquePrep[cse]; roles.pps.push(g); continue; }
      g._case = cse;
      unassigned.push(g);
    }

    const take = (pred) => {
      const i = unassigned.findIndex(pred);
      return i >= 0 ? unassigned.splice(i, 1)[0] : null;
    };

    if (this._alignment === 'ergative-absolutive') {
      roles.subject = take(g => g._case === 'ERG');
      roles.object = take(g => g._case === 'ABS');
      // Intransitive: a lone ABS argument is the subject
      if (!roles.subject && roles.object && !unassigned.some(g => g._case === 'ABS')) {
        roles.subject = roles.object;
        roles.object = null;
      }
    } else {
      roles.subject = take(g => g._case === 'NOM');
      roles.object = take(g => g._case === 'ACC');
    }

    // Fallback by word order for caseless leftovers
    if (unassigned.length && (!roles.subject || !roles.object)) {
      const order = this._wordOrder;
      const verbIdx = verb ? clauseItems.indexOf(verb.item) : -1;
      const idxOf = (g) => clauseItems.indexOf(g.head);
      const sBeforeV = order.indexOf('S') < order.indexOf('V');
      const oBeforeV = order.indexOf('O') < order.indexOf('V');
      const sFirst = order.indexOf('S') < order.indexOf('O');

      const pickWhere = (beforeVerb) =>
        take(g => verbIdx < 0 || (beforeVerb ? idxOf(g) < verbIdx : idxOf(g) >= verbIdx));

      if (sBeforeV === oBeforeV) {
        // Both core arguments on the same side of the verb: linear order decides
        const firstRole = sFirst ? 'subject' : 'object';
        const secondRole = sFirst ? 'object' : 'subject';
        for (const role of [firstRole, secondRole]) {
          if (!roles[role]) {
            const g = pickWhere(sBeforeV);
            if (g) roles[role] = g;
          }
        }
      } else {
        if (!roles.subject) roles.subject = pickWhere(sBeforeV);
        if (!roles.object) roles.object = pickWhere(oBeforeV);
      }
    }
    roles.extras.push(...unassigned);
    return roles;
  }

  _renderClause(clauseItems, isQuestion) {
    const { groups, verb, negated, loose } = this._buildGroups(clauseItems);
    const roles = this._assignRoles(groups, clauseItems, verb);

    // Subject plurality may live only in verb agreement (e.g. languages
    // with no nominal number marking)
    const agrLabel = verb?.item?.best?.parse?.person || null;
    if (roles.subject && agrLabel && agrLabel.endsWith('PL')) roles.subject.forcePlural = true;

    // Pro-drop: agreement marker present but no subject NP
    let subjectStr = roles.subject ? this._renderNP(roles.subject, 'subject') : null;
    if (!subjectStr && agrLabel) {
      subjectStr = { '1SG': 'I', '2SG': 'you', '3SG': 'he', '1PL': 'we', '2PL': 'you', '3PL': 'they' }[agrLabel] || null;
    }

    const vp = this._renderVerbPhrase(verb, roles.subject, agrLabel, negated, loose.modals, isQuestion && !loose.wh.length);

    const parts = [];
    parts.push(...loose.wh);
    parts.push(...loose.advFront);
    if (vp.auxFront && subjectStr) {
      parts.push(vp.auxFront, subjectStr, vp.rest);
    } else if (subjectStr) {
      parts.push(subjectStr, vp.full);
    } else if (vp.full) {
      parts.push(vp.full);
    }
    if (roles.object) parts.push(this._renderNP(roles.object, 'object'));
    for (const ev of loose.extraVerbs) {
      const base = this._verbBaseEnglish(ev.item);
      parts.push(ev.infinitive ? `to ${base}` : base);
    }
    if (roles.indirect) parts.push('to ' + this._renderNP(roles.indirect, 'object'));
    for (const g of roles.extras) parts.push(this._renderNP(g, 'object'));
    for (const g of roles.pps) parts.push(this._renderNP(g, 'object'));
    parts.push(...loose.advBack);

    return parts.filter(p => p && p.length).join(' ');
  }

  _renderNP(group, position) {
    const out = [];
    if (group.prep) out.push(group.prep);

    const head = group.head;
    const best = head.best;
    let headStr;
    let isPronoun = false;

    if (!best) {
      headStr = `‹${head.surface}›`; // ‹unknown›
    } else if (best.translitEnglish) {
      headStr = best.translitEnglish;
    } else {
      const entry = best.entry;
      if (entry.class === 'pronoun') {
        isPronoun = true;
        headStr = this._pronounEnglish(entry.gloss, position);
      } else if (entry.class === 'determiner') {
        isPronoun = true; // determiners used pronominally ("this", "that")
        headStr = entry.gloss;
      } else {
        headStr = entry.gloss;
        const num = best.parse.number;
        if (num === 'PL' || num === 'DU' || group.forcePlural) {
          headStr = this._pluralEnglish(headStr);
          if (num === 'DU') headStr = 'two ' + headStr;
        }
      }
    }

    let possStr = '';
    if (group.poss) {
      const p = this._renderNP(group.poss, 'subject');
      possStr = p.endsWith('s') ? `${p}'` : `${p}'s`;
    }

    if (!isPronoun && !group.det && !possStr) out.push('the');
    if (group.det) out.push(group.det);
    if (possStr) out.push(possStr);
    out.push(...group.adjs);
    out.push(headStr);

    let s = out.join(' ');
    if (group.coordPrev) s = group.coordPrev + ' ' + s;
    for (const tail of group.coordTail || []) {
      s += ` ${tail.conj} ${this._renderNP(tail.group, position)}`;
    }
    return s;
  }

  _verbBaseEnglish(verbItem) {
    const e = verbItem.best?.entry;
    if (!e) return verbItem.best?.translitEnglish || `‹${verbItem.surface}›`;
    if (e.isCopula || e.gloss === 'to be (copula)') return 'be';
    return e.gloss;
  }

  /**
   * Realize the English verb phrase from the conlang verb's morphology.
   * @returns {{full: string, auxFront: string|null, rest: string}}
   */
  _renderVerbPhrase(verb, subjectGroup, agrLabel, negated, modals, invertible) {
    if (!verb) {
      if (negated) return { full: 'not', auxFront: null, rest: '' };
      return { full: '', auxFront: null, rest: '' };
    }

    const base = this._verbBaseEnglish(verb.item);
    const tenseAbbr = verb.item.best?.parse?.tense || null;
    let tense = 'present';
    if (tenseAbbr && /PST/.test(tenseAbbr)) tense = 'past';
    else if (tenseAbbr && /FUT/.test(tenseAbbr) && !/NFUT/.test(tenseAbbr)) tense = 'future';

    // Person/number: agreement label wins, else infer from the subject NP
    let person = 3, plural = false;
    if (agrLabel) {
      person = parseInt(agrLabel[0], 10) || 3;
      plural = agrLabel.endsWith('PL');
    } else if (subjectGroup) {
      const info = this._subjectPersonNumber(subjectGroup);
      person = info.person; plural = info.plural;
    }
    const third = person === 3 && !plural;

    // Modal dedup: the engine emits both a transliterated 'will' word AND
    // a FUT suffix on the verb
    const mods = modals.filter(m => !(m === 'will' && tense === 'future'));
    if (tense === 'future' && mods.length === 0) mods.push('will');

    if (verb.copula) {
      let cop;
      if (tense === 'past') cop = plural ? 'were' : 'was';
      else if (tense === 'future') cop = 'will be';
      else cop = plural ? 'are' : (person === 1 ? 'am' : (third ? 'is' : 'are'));
      const full = negated ? cop.replace(/^(\w+)/, '$1 not') : cop;
      return { full, auxFront: null, rest: '' };
    }

    if (mods.length > 0) {
      const modal = mods[0];
      const rest = (negated ? 'not ' : '') + base;
      return { full: `${modal} ${rest}`, auxFront: invertible ? modal : null, rest };
    }

    if (negated) {
      const aux = tense === 'past' ? 'did' : (third ? 'does' : 'do');
      return { full: `${aux} not ${base}`, auxFront: null, rest: `not ${base}` };
    }

    if (invertible) {
      const aux = tense === 'past' ? 'did' : (third ? 'does' : 'do');
      return { full: '', auxFront: aux, rest: base };
    }

    let form;
    if (tense === 'past') form = this._pastEnglish(base);
    else form = third ? this._thirdSgEnglish(base) : base;
    return { full: form, auxFront: null, rest: form };
  }

  _subjectPersonNumber(group) {
    if (group.coordPlural) return { person: 3, plural: true };
    const best = group.head.best;
    if (best?.entry?.class === 'pronoun') {
      const map = {
        'I/me': { person: 1, plural: false }, 'we/us': { person: 1, plural: true },
        'you (sg)': { person: 2, plural: false }, 'you (pl)': { person: 2, plural: true },
        'he/she/it': { person: 3, plural: false }, 'they/them': { person: 3, plural: true },
      };
      if (map[best.entry.gloss]) return map[best.entry.gloss];
    }
    const num = best?.parse?.number;
    return { person: 3, plural: num === 'PL' || num === 'DU' || !!group.forcePlural };
  }

  // ===================================================================
  // ENGLISH MORPHOLOGY HELPERS
  // ===================================================================

  _buildEnglishTables() {
    /** base -> simple past (mirror of TranslationEngine.irregularVerbs) */
    this._irregularPast = {
      be: 'was', have: 'had', do: 'did', go: 'went', come: 'came', see: 'saw',
      eat: 'ate', drink: 'drank', sleep: 'slept', give: 'gave', take: 'took',
      make: 'made', say: 'said', know: 'knew', think: 'thought', get: 'got',
      run: 'ran', sit: 'sat', stand: 'stood', fall: 'fell', find: 'found',
      hear: 'heard', speak: 'spoke', tell: 'told', write: 'wrote', read: 'read',
      fight: 'fought', build: 'built', buy: 'bought', sell: 'sold',
      teach: 'taught', learn: 'learned', bring: 'brought', catch: 'caught',
      hold: 'held', lead: 'led', leave: 'left', meet: 'met', break: 'broke',
      fly: 'flew', swim: 'swam', sing: 'sang', die: 'died', lie: 'lay',
      rise: 'rose', grow: 'grew', throw: 'threw', hide: 'hid', win: 'won',
      lose: 'lost', begin: 'began', feel: 'felt', keep: 'kept', put: 'put',
      cut: 'cut', hit: 'hit', hurt: 'hurt', let: 'let', set: 'set',
      shut: 'shut', choose: 'chose', forget: 'forgot', forgive: 'forgave',
      drive: 'drove', wear: 'wore', draw: 'drew', blow: 'blew', wake: 'woke',
      send: 'sent', spend: 'spent', pay: 'paid', burn: 'burned',
    };
    /** singular -> plural irregulars */
    this._irregularPlural = {
      man: 'men', woman: 'women', child: 'children', person: 'people',
      foot: 'feet', tooth: 'teeth', mouse: 'mice', goose: 'geese',
      wolf: 'wolves', knife: 'knives', leaf: 'leaves', life: 'lives',
      wife: 'wives', fish: 'fish', sheep: 'sheep', deer: 'deer', ox: 'oxen',
    };
    /** inflected -> base, for lexical-match lemmatization */
    this._inflectedToBase = {};
    for (const [b, p] of Object.entries(this._irregularPast)) this._inflectedToBase[p] = b;
    for (const [s, p] of Object.entries(this._irregularPlural)) this._inflectedToBase[p] = s;
    Object.assign(this._inflectedToBase, {
      am: 'be', is: 'be', are: 'be', were: 'be', been: 'be', being: 'be',
      has: 'have', having: 'have', does: 'do', done: 'do', gone: 'go',
      seen: 'see', eaten: 'eat', given: 'give', taken: 'take', known: 'know',
      spoken: 'speak', written: 'write', broken: 'break', flown: 'fly',
      grown: 'grow', thrown: 'throw', hidden: 'hide', chosen: 'choose',
      forgotten: 'forget', driven: 'drive', worn: 'wear', drawn: 'draw',
      woken: 'wake', begun: 'begin', sung: 'sing', swum: 'swim', drunk: 'drink',
    });
  }

  _pluralEnglish(noun) {
    // Multi-word glosses ("question particle") - pluralize last word
    const parts = noun.split(' ');
    const w = parts.pop();
    let plural;
    if (this._irregularPlural[w]) plural = this._irregularPlural[w];
    else if (/(s|x|z|ch|sh)$/.test(w)) plural = w + 'es';
    else if (/[^aeiou]y$/.test(w)) plural = w.slice(0, -1) + 'ies';
    else plural = w + 's';
    parts.push(plural);
    return parts.join(' ');
  }

  _pastEnglish(verb) {
    const parts = verb.split(' ');
    const w = parts.pop();
    let past;
    if (this._irregularPast[w]) past = this._irregularPast[w];
    else if (w.endsWith('e')) past = w + 'd';
    else if (/[^aeiou]y$/.test(w)) past = w.slice(0, -1) + 'ied';
    else past = w + 'ed';
    parts.push(past);
    return parts.join(' ');
  }

  _thirdSgEnglish(verb) {
    const parts = verb.split(' ');
    const w = parts.pop();
    let form;
    if (w === 'be') form = 'is';
    else if (w === 'have') form = 'has';
    else if (w === 'do') form = 'does';
    else if (w === 'go') form = 'goes';
    else if (/(s|x|z|ch|sh|o)$/.test(w)) form = w + 'es';
    else if (/[^aeiou]y$/.test(w)) form = w.slice(0, -1) + 'ies';
    else form = w + 's';
    parts.push(form);
    return parts.join(' ');
  }

  _pronounEnglish(gloss, position) {
    const table = {
      'I/me': { subject: 'I', object: 'me' },
      'you (sg)': { subject: 'you', object: 'you' },
      'you (pl)': { subject: 'you', object: 'you' },
      'he/she/it': { subject: 'he', object: 'him' },
      'we/us': { subject: 'we', object: 'us' },
      'they/them': { subject: 'they', object: 'them' },
    };
    const t = table[gloss];
    if (t) return position === 'object' ? t.object : t.subject;
    return gloss.replace(/\s*\(.*\)$/, '');
  }

  // ===================================================================
  // GLOSS OUTPUT (Leipzig-style interlinear)
  // ===================================================================

  _formatGloss(items) {
    const surfaceLine = [];
    const morphLine = [];
    const glossLine = [];

    for (const item of items) {
      surfaceLine.push(item.surface);
      const best = item.best;
      if (!best) {
        morphLine.push(item.surface);
        glossLine.push('‹?›');
        continue;
      }
      const stem = best.stem;
      const affixForms = best.affixes.map(a => a.form);
      const affixMeanings = best.affixes.map(a => a.meaning);
      morphLine.push([stem, ...affixForms].join('-'));
      const baseGloss = best.entry
        ? (best.entry.class === 'pronoun' || best.entry.class === 'determiner'
          ? best.entry.gloss.toUpperCase().replace(/\s*\(.*\)$/, m => m.toUpperCase())
          : best.entry.gloss)
        : `‹${best.translitEnglish}›`;
      glossLine.push([baseGloss, ...affixMeanings].join('-'));
    }

    const width = Math.max(
      ...surfaceLine.map(w => w.length),
      ...morphLine.map(w => w.length),
      ...glossLine.map(w => w.length)
    );
    const pad = (arr) => arr.map(w => w.padEnd(width + 2)).join('').trimEnd();
    return `${pad(surfaceLine)}\n${pad(morphLine)}\n${pad(glossLine)}`;
  }

  // ===================================================================
  // ROUND-TRIP SCORING
  // ===================================================================

  /** Words ignored when computing lexical recovery. */
  static get _STOPWORDS() {
    return new Set([
      'the', 'a', 'an', 'some', 'any', 'and', 'or', 'but', 'so', 'yet', 'nor',
      'if', 'because', 'when', 'while', 'that', 'this', 'these', 'those',
      'to', 'from', 'in', 'on', 'at', 'with', 'by', 'for', 'of', 'into',
      'not', 'no', 'never', 'do', 'does', 'did', 'is', 'are', 'am', 'was',
      'were', 'be', 'been', 'being', 'will', 'would', 'shall', 'should',
      'can', 'could', 'may', 'might', 'must', 'have', 'has', 'had',
      'i', 'me', 'my', 'you', 'your', 'he', 'she', 'it', 'him', 'her', 'his',
      'its', 'we', 'us', 'our', 'they', 'them', 'their',
      'who', 'whom', 'whose', 'what', 'which', 'where', 'why', 'how',
      'two',
    ]);
  }

  /** All plausible lemmatizations of an English word (set of strings). */
  _lemmaVariants(word) {
    const w = word.toLowerCase();
    const variants = new Set([w]);
    if (this._inflectedToBase[w]) variants.add(this._inflectedToBase[w]);
    if (w.endsWith('ies') && w.length > 4) variants.add(w.slice(0, -3) + 'y');
    if (w.endsWith('ves') && w.length > 4) variants.add(w.slice(0, -3) + 'f');
    if (w.endsWith('es') && w.length > 3) variants.add(w.slice(0, -2));
    if (w.endsWith('s') && !w.endsWith('ss') && w.length > 2) variants.add(w.slice(0, -1));
    if (w.endsWith('ed') && w.length > 3) {
      variants.add(w.slice(0, -2));
      variants.add(w.slice(0, -1)); // loved -> love
      if (w.endsWith('ied')) variants.add(w.slice(0, -3) + 'y');
    }
    if (w.endsWith('ing') && w.length > 4) {
      variants.add(w.slice(0, -3));
      variants.add(w.slice(0, -3) + 'e');
    }
    return variants;
  }

  _contentWords(text) {
    return String(text).toLowerCase()
      .replace(/[‹›]/g, '')
      .replace(/[.,!?;:"'()]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0 && !ReverseTranslator._STOPWORDS.has(w));
  }

  /**
   * Fraction of content lemmas of the original sentence recovered in the
   * back-translation (articles/word order ignored).
   */
  _lexicalMatchRate(original, back) {
    const needed = this._contentWords(original);
    if (needed.length === 0) return 1;
    const recovered = new Set();
    for (const w of this._contentWords(back)) {
      for (const v of this._lemmaVariants(w)) recovered.add(v);
    }
    let hits = 0;
    for (const w of needed) {
      const variants = this._lemmaVariants(w);
      let found = false;
      for (const v of variants) {
        if (recovered.has(v)) { found = true; break; }
      }
      if (found) hits++;
    }
    return hits / needed.length;
  }
}
