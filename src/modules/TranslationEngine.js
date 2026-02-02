/**
 * GLOSSOPETRAE - Translation Engine Module
 *
 * Rule-based machine translation between English and the generated language.
 * Generates interlinear glosses and worked examples.
 *
 * ENHANCED: Improved parsing, more sentence patterns, better morphological handling
 */

export class TranslationEngine {
  constructor(language) {
    this.language = language;
    this.lexicon = language.lexicon;
    this.morphology = language.morphology;

    // Build reverse lookup cache for faster translation from conlang
    this._buildReverseLookup();

    // Comprehensive irregular verb mappings
    this.irregularVerbs = {
      // be
      'am': 'be', 'is': 'be', 'are': 'be', 'was': 'be', 'were': 'be', 'been': 'be', 'being': 'be',
      // have
      'has': 'have', 'had': 'have', 'having': 'have',
      // do
      'does': 'do', 'did': 'do', 'done': 'do', 'doing': 'do',
      // go
      'goes': 'go', 'went': 'go', 'gone': 'go', 'going': 'go',
      // come
      'comes': 'come', 'came': 'come', 'coming': 'come',
      // see
      'sees': 'see', 'saw': 'see', 'seen': 'see', 'seeing': 'see',
      // eat
      'eats': 'eat', 'ate': 'eat', 'eaten': 'eat', 'eating': 'eat',
      // drink
      'drinks': 'drink', 'drank': 'drink', 'drunk': 'drink', 'drinking': 'drink',
      // sleep
      'sleeps': 'sleep', 'slept': 'sleep', 'sleeping': 'sleep',
      // give
      'gives': 'give', 'gave': 'give', 'given': 'give', 'giving': 'give',
      // take
      'takes': 'take', 'took': 'take', 'taken': 'take', 'taking': 'take',
      // make
      'makes': 'make', 'made': 'make', 'making': 'make',
      // say
      'says': 'say', 'said': 'say', 'saying': 'say',
      // know
      'knows': 'know', 'knew': 'know', 'known': 'know', 'knowing': 'know',
      // think
      'thinks': 'think', 'thought': 'think', 'thinking': 'think',
      // get
      'gets': 'get', 'got': 'get', 'gotten': 'get', 'getting': 'get',
      // run
      'runs': 'run', 'ran': 'run', 'running': 'run',
      // sit
      'sits': 'sit', 'sat': 'sit', 'sitting': 'sit',
      // stand
      'stands': 'stand', 'stood': 'stand', 'standing': 'stand',
      // fall
      'falls': 'fall', 'fell': 'fall', 'fallen': 'fall', 'falling': 'fall',
      // find
      'finds': 'find', 'found': 'find', 'finding': 'find',
      // hear
      'hears': 'hear', 'heard': 'hear', 'hearing': 'hear',
      // speak
      'speaks': 'speak', 'spoke': 'speak', 'spoken': 'speak', 'speaking': 'speak',
      // tell
      'tells': 'tell', 'told': 'tell', 'telling': 'tell',
      // write
      'writes': 'write', 'wrote': 'write', 'written': 'write', 'writing': 'write',
      // read
      'reads': 'read', 'reading': 'read',
      // fight
      'fights': 'fight', 'fought': 'fight', 'fighting': 'fight',
      // build
      'builds': 'build', 'built': 'build', 'building': 'build',
      // buy
      'buys': 'buy', 'bought': 'buy', 'buying': 'buy',
      // sell
      'sells': 'sell', 'sold': 'sell', 'selling': 'sell',
      // teach
      'teaches': 'teach', 'taught': 'teach', 'teaching': 'teach',
      // learn
      'learns': 'learn', 'learnt': 'learn', 'learned': 'learn', 'learning': 'learn',
      // bring
      'brings': 'bring', 'brought': 'bring', 'bringing': 'bring',
      // catch
      'catches': 'catch', 'caught': 'catch', 'catching': 'catch',
      // hold
      'holds': 'hold', 'held': 'hold', 'holding': 'hold',
      // lead
      'leads': 'lead', 'led': 'lead', 'leading': 'lead',
      // leave
      'leaves': 'leave', 'left': 'leave', 'leaving': 'leave',
      // meet
      'meets': 'meet', 'met': 'meet', 'meeting': 'meet',
      // break
      'breaks': 'break', 'broke': 'break', 'broken': 'break', 'breaking': 'break',
      // fly
      'flies': 'fly', 'flew': 'fly', 'flown': 'fly', 'flying': 'fly',
      // swim
      'swims': 'swim', 'swam': 'swim', 'swum': 'swim', 'swimming': 'swim',
      // sing
      'sings': 'sing', 'sang': 'sing', 'sung': 'sing', 'singing': 'sing',
      // die
      'dies': 'die', 'died': 'die', 'dying': 'die',
      // lie (recline)
      'lies': 'lie', 'lay': 'lie', 'lain': 'lie', 'lying': 'lie',
      // rise
      'rises': 'rise', 'rose': 'rise', 'risen': 'rise', 'rising': 'rise',
      // grow
      'grows': 'grow', 'grew': 'grow', 'grown': 'grow', 'growing': 'grow',
      // throw
      'throws': 'throw', 'threw': 'throw', 'thrown': 'throw', 'throwing': 'throw',
      // hide
      'hides': 'hide', 'hid': 'hide', 'hidden': 'hide', 'hiding': 'hide',
      // win
      'wins': 'win', 'won': 'win', 'winning': 'win',
      // lose
      'loses': 'lose', 'lost': 'lose', 'losing': 'lose',
      // begin
      'begins': 'begin', 'began': 'begin', 'begun': 'begin', 'beginning': 'begin',
      // feel
      'feels': 'feel', 'felt': 'feel', 'feeling': 'feel',
      // keep
      'keeps': 'keep', 'kept': 'keep', 'keeping': 'keep',
      // put
      'puts': 'put', 'putting': 'put',
      // cut
      'cuts': 'cut', 'cutting': 'cut',
      // hit
      'hits': 'hit', 'hitting': 'hit',
      // hurt
      'hurts': 'hurt', 'hurting': 'hurt',
      // let
      'lets': 'let', 'letting': 'let',
      // set
      'sets': 'set', 'setting': 'set',
      // shut
      'shuts': 'shut', 'shutting': 'shut',
      // choose
      'chooses': 'choose', 'chose': 'choose', 'chosen': 'choose', 'choosing': 'choose',
      // forget
      'forgets': 'forget', 'forgot': 'forget', 'forgotten': 'forget', 'forgetting': 'forget',
      // forgive
      'forgives': 'forgive', 'forgave': 'forgive', 'forgiven': 'forgive', 'forgiving': 'forgive',
      // drive
      'drives': 'drive', 'drove': 'drive', 'driven': 'drive', 'driving': 'drive',
      // wear
      'wears': 'wear', 'wore': 'wear', 'worn': 'wear', 'wearing': 'wear',
      // draw
      'draws': 'draw', 'drew': 'draw', 'drawn': 'draw', 'drawing': 'draw',
      // blow
      'blows': 'blow', 'blew': 'blow', 'blown': 'blow', 'blowing': 'blow',
      // wake
      'wakes': 'wake', 'woke': 'wake', 'woken': 'wake', 'waking': 'wake',
      // send
      'sends': 'send', 'sent': 'send', 'sending': 'send',
      // spend
      'spends': 'spend', 'spent': 'spend', 'spending': 'spend',
      // pay
      'pays': 'pay', 'paid': 'pay', 'paying': 'pay',
      // burn
      'burns': 'burn', 'burnt': 'burn', 'burned': 'burn', 'burning': 'burn',
    };

    // Pronoun mappings to lexicon keys
    this.pronounMappings = {
      'i': 'I/me', 'me': 'I/me', 'my': 'I/me', 'mine': 'I/me', 'myself': 'I/me',
      'you': 'you (sg)', 'your': 'you (sg)', 'yours': 'you (sg)', 'yourself': 'you (sg)',
      'he': 'he/she/it', 'him': 'he/she/it', 'his': 'he/she/it', 'himself': 'he/she/it',
      'she': 'he/she/it', 'her': 'he/she/it', 'hers': 'he/she/it', 'herself': 'he/she/it',
      'it': 'he/she/it', 'its': 'he/she/it', 'itself': 'he/she/it',
      'we': 'we/us', 'us': 'we/us', 'our': 'we/us', 'ours': 'we/us', 'ourselves': 'we/us',
      'they': 'they/them', 'them': 'they/them', 'their': 'they/them', 'theirs': 'they/them', 'themselves': 'they/them',
      'this': 'this', 'that': 'that', 'these': 'this', 'those': 'that',
    };

    // Possessive pronouns (needs genitive/possessive case)
    this.possessivePronouns = new Set(['my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs']);

    // Common prepositions with lexicon mappings
    this.prepositions = {
      'to': 'to', 'from': 'from', 'in': 'in', 'on': 'on', 'at': 'in',
      'with': 'with', 'by': 'with', 'for': 'to', 'of': 'from',
      'into': 'in', 'onto': 'on', 'under': 'under', 'over': 'on',
      'through': 'through', 'across': 'across', 'between': 'between',
      'behind': 'behind', 'before': 'before', 'after': 'after',
      'near': 'near', 'around': 'around', 'above': 'above', 'below': 'below',
      'along': 'along', 'against': 'against', 'without': 'with',
    };

    // Common plural irregulars
    this.irregularPlurals = {
      'men': 'man', 'women': 'woman', 'children': 'child', 'feet': 'foot',
      'teeth': 'tooth', 'mice': 'mouse', 'geese': 'goose', 'fish': 'fish',
      'sheep': 'sheep', 'deer': 'deer', 'oxen': 'ox', 'people': 'person',
      'knives': 'knife', 'wolves': 'wolf', 'leaves': 'leaf', 'lives': 'life',
      'wives': 'wife', 'halves': 'half', 'selves': 'self', 'loaves': 'bread',
    };
  }

  _buildReverseLookup() {
    this._reverseCache = new Map();
    const entries = this.lexicon?.getEntries?.() || [];
    for (const entry of entries) {
      this._reverseCache.set(entry.lemma, entry);
      // Also cache inflected forms
      if (entry.paradigm?.forms) {
        for (const form of Object.values(entry.paradigm.forms)) {
          if (!this._reverseCache.has(form)) {
            this._reverseCache.set(form, { ...entry, inflectedFrom: entry.lemma });
          }
        }
      }
    }
  }

  /**
   * Translate English to the generated language
   */
  translateToConlang(english) {
    const parsed = this._parseEnglish(english);
    const transferred = this._transfer(parsed);
    const surface = this._generateSurface(transferred);
    const gloss = this._generateGloss(transferred);

    return {
      english,
      target: surface,
      gloss,
      structure: transferred,
      parsed, // Include parsed structure for debugging
    };
  }

  /**
   * Translate from conlang to English (reverse lookup)
   */
  translateToEnglish(conlang) {
    const words = conlang.split(/\s+/);
    const translations = [];

    for (const word of words) {
      const analysis = this._analyzeWord(word);
      if (analysis) {
        translations.push(analysis.gloss);
      } else {
        translations.push(`[${word}]`);
      }
    }

    return translations.join(' ');
  }

  /**
   * Parse a simple English sentence with improved pattern recognition
   */
  _parseEnglish(english) {
    const sentence = english.replace(/[.!?]/g, '').toLowerCase().trim();
    const words = sentence.split(/\s+/).filter(w => w.length > 0);

    const parsed = {
      original: english,
      words,
      tokens: [], // Tokenized with word types
      subject: null,
      verb: null,
      object: null,
      indirectObject: null,
      prepPhrases: [],
      adjectives: [],
      adverbs: [],
      tense: 'present',
      aspect: 'simple',
      mood: 'indicative',
      negated: false,
      isQuestion: english.includes('?'),
      isImperative: false,
      passive: false,
      subjectPerson: 3,
      subjectNumber: 'SG',
    };

    // Tokenize and classify words
    this._tokenize(parsed, words);

    // Detect sentence type
    this._detectSentenceType(parsed);

    // Detect tense/aspect
    this._detectTenseAspect(parsed, words);

    // Detect negation
    this._detectNegation(parsed, words);

    // Extract components
    this._extractComponents(parsed);

    return parsed;
  }

  _tokenize(parsed, words) {
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const token = { word, index: i, type: 'unknown' };

      // Check word type
      if (this._isPronoun(word)) {
        token.type = 'pronoun';
        token.person = this._getPersonNumber(word);
      } else if (this._isArticle(word)) {
        token.type = 'article';
      } else if (this._isPossessive(word)) {
        token.type = 'possessive';
      } else if (this._isPreposition(word)) {
        token.type = 'preposition';
      } else if (this._isAuxiliary(word)) {
        token.type = 'auxiliary';
      } else if (this._isVerb(word)) {
        token.type = 'verb';
        token.base = this._getVerbBase(word);
      } else if (this._isAdjective(word)) {
        token.type = 'adjective';
      } else if (this._isAdverb(word)) {
        token.type = 'adverb';
      } else if (this._isConjunction(word)) {
        token.type = 'conjunction';
      } else if (this._isQuestionWord(word)) {
        token.type = 'question';
      } else if (this._isNegation(word)) {
        token.type = 'negation';
      } else if (this._isNoun(word)) {
        token.type = 'noun';
        token.singular = this._getSingular(word);
        token.plural = word !== token.singular;
      } else {
        // Unknown - assume noun
        token.type = 'noun';
        token.singular = this._getSingular(word);
      }

      parsed.tokens.push(token);
    }
  }

  _isPronoun(word) {
    return word in this.pronounMappings;
  }

  _isArticle(word) {
    return ['the', 'a', 'an', 'some', 'any'].includes(word);
  }

  _isPossessive(word) {
    return this.possessivePronouns.has(word);
  }

  _isPreposition(word) {
    return word in this.prepositions;
  }

  _isAuxiliary(word) {
    return ['will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
            'do', 'does', 'did', 'have', 'has', 'had', 'am', 'is', 'are', 'was', 'were',
            'be', 'been', 'being'].includes(word);
  }

  _isVerb(word) {
    // Check irregular verbs
    if (word in this.irregularVerbs) return true;

    // Check lexicon
    const base = this._getVerbBase(word);
    const entry = this.lexicon?.lookup?.(base);
    if (entry?.class === 'verb') return true;

    // Check common verb patterns
    if (word.endsWith('ing') || word.endsWith('ed') || word.endsWith('es')) return true;

    return false;
  }

  _isAdjective(word) {
    const entry = this.lexicon?.lookup?.(word);
    if (entry?.class === 'adjective') return true;

    // Common adjective endings
    if (word.endsWith('ful') || word.endsWith('less') || word.endsWith('ous') ||
        word.endsWith('ive') || word.endsWith('able') || word.endsWith('ible')) return true;

    return false;
  }

  _isAdverb(word) {
    const entry = this.lexicon?.lookup?.(word);
    if (entry?.class === 'adverb') return true;

    // Common adverb patterns
    if (word.endsWith('ly')) return true;
    if (['here', 'there', 'now', 'then', 'always', 'never', 'often', 'very', 'too', 'also',
         'just', 'still', 'even', 'only', 'again', 'ever', 'soon', 'well', 'fast'].includes(word)) {
      return true;
    }

    return false;
  }

  _isConjunction(word) {
    return ['and', 'or', 'but', 'if', 'because', 'when', 'while', 'although', 'though',
            'so', 'yet', 'nor', 'for', 'since', 'unless', 'until', 'as', 'than'].includes(word);
  }

  _isQuestionWord(word) {
    return ['what', 'who', 'whom', 'whose', 'which', 'where', 'when', 'why', 'how'].includes(word);
  }

  _isNegation(word) {
    return ['not', "n't", 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere', 'none'].includes(word);
  }

  _isNoun(word) {
    const singular = this._getSingular(word);
    const entry = this.lexicon?.lookup?.(singular);
    return entry?.class === 'noun';
  }

  _getPersonNumber(pronoun) {
    const p = pronoun.toLowerCase();
    if (['i', 'me', 'my', 'mine', 'myself'].includes(p)) return { person: 1, number: 'SG' };
    if (['we', 'us', 'our', 'ours', 'ourselves'].includes(p)) return { person: 1, number: 'PL' };
    if (['you', 'your', 'yours', 'yourself', 'yourselves'].includes(p)) return { person: 2, number: 'SG' };
    if (['they', 'them', 'their', 'theirs', 'themselves'].includes(p)) return { person: 3, number: 'PL' };
    return { person: 3, number: 'SG' };
  }

  _getSingular(word) {
    // Check irregular plurals
    if (word in this.irregularPlurals) return this.irregularPlurals[word];

    // Regular plural rules
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('ves')) return word.slice(0, -3) + 'f';
    if (word.endsWith('es') && (word.endsWith('shes') || word.endsWith('ches') ||
        word.endsWith('xes') || word.endsWith('sses') || word.endsWith('zes'))) {
      return word.slice(0, -2);
    }
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);

    return word;
  }

  _detectSentenceType(parsed) {
    const tokens = parsed.tokens;
    if (tokens.length === 0) return;

    // Question
    if (tokens[0].type === 'question') {
      parsed.isQuestion = true;
      parsed.questionType = tokens[0].word;
    } else if (tokens[0].type === 'auxiliary' && parsed.isQuestion) {
      parsed.isQuestion = true;
    }

    // Imperative (starts with verb, no subject)
    if (tokens[0].type === 'verb' ||
        (tokens.length > 1 && tokens[0].type === 'adverb' && tokens[1].type === 'verb')) {
      parsed.isImperative = true;
      parsed.subjectPerson = 2;
    }
  }

  _detectTenseAspect(parsed, words) {
    // Past tense markers
    const pastMarkers = ['was', 'were', 'did', 'had', 'been'];
    const futureMarkers = ['will', 'shall', "'ll", 'going'];
    const progressiveMarkers = ['am', 'is', 'are', 'was', 'were'];
    const perfectMarkers = ['have', 'has', 'had'];

    const hasProgressive = words.some(w => w.endsWith('ing')) &&
                           words.some(w => progressiveMarkers.includes(w));
    const hasPerfect = words.some(w => perfectMarkers.includes(w));

    if (words.some(w => futureMarkers.includes(w))) {
      parsed.tense = 'future';
    } else if (words.some(w => pastMarkers.includes(w)) ||
               words.some(w => w.endsWith('ed')) ||
               words.some(w => this.irregularVerbs[w] &&
                           ['went', 'came', 'saw', 'ate', 'gave', 'took', 'made', 'said', 'knew', 'thought',
                            'got', 'ran', 'sat', 'stood', 'fell', 'found', 'heard', 'spoke', 'told', 'wrote',
                            'fought', 'built', 'bought', 'sold', 'taught', 'brought', 'caught', 'held', 'led',
                            'left', 'met', 'broke', 'flew', 'swam', 'sang', 'lay', 'rose', 'grew', 'threw',
                            'hid', 'won', 'lost', 'began', 'felt', 'kept', 'chose', 'forgot', 'forgave',
                            'drove', 'wore', 'drew', 'blew', 'woke', 'sent', 'spent', 'paid'].includes(w))) {
      parsed.tense = 'past';
    } else {
      parsed.tense = 'present';
    }

    if (hasProgressive) {
      parsed.aspect = 'progressive';
    } else if (hasPerfect) {
      parsed.aspect = 'perfect';
    } else {
      parsed.aspect = 'simple';
    }
  }

  _detectNegation(parsed, words) {
    parsed.negated = words.some(w => this._isNegation(w));
  }

  _extractComponents(parsed) {
    const tokens = parsed.tokens;
    let i = 0;

    // Skip question word if present
    if (tokens[i]?.type === 'question') {
      parsed.questionType = tokens[i].word;
      i++;
    }

    // Skip auxiliary at start of questions
    if (parsed.isQuestion && tokens[i]?.type === 'auxiliary') {
      i++;
    }

    // Extract subject (noun phrase)
    const subjectResult = this._extractNounPhrase(tokens, i);
    if (subjectResult.np) {
      parsed.subject = subjectResult.np;
      i = subjectResult.endIndex;

      // Set person/number from subject
      if (subjectResult.np.type === 'pronoun') {
        const pn = this._getPersonNumber(subjectResult.np.word);
        parsed.subjectPerson = pn.person;
        parsed.subjectNumber = pn.number;
      } else {
        parsed.subjectPerson = 3;
        parsed.subjectNumber = subjectResult.np.plural ? 'PL' : 'SG';
      }
    }

    // Skip negation and auxiliaries before verb
    while (i < tokens.length &&
           (tokens[i].type === 'negation' || tokens[i].type === 'auxiliary' || tokens[i].type === 'adverb')) {
      if (tokens[i].type === 'adverb') {
        parsed.adverbs.push(tokens[i].word);
      }
      i++;
    }

    // Extract verb
    if (tokens[i]?.type === 'verb') {
      parsed.verb = {
        word: tokens[i].base || this._getVerbBase(tokens[i].word),
        original: tokens[i].word,
      };
      i++;
    }

    // Skip negation after verb
    while (i < tokens.length && tokens[i].type === 'negation') {
      i++;
    }

    // Check for adverbs after verb
    while (i < tokens.length && tokens[i].type === 'adverb') {
      parsed.adverbs.push(tokens[i].word);
      i++;
    }

    // Extract object(s) and prepositional phrases
    while (i < tokens.length) {
      // Check for preposition
      if (tokens[i].type === 'preposition') {
        const prep = tokens[i].word;
        i++;
        const ppResult = this._extractNounPhrase(tokens, i);
        if (ppResult.np) {
          parsed.prepPhrases.push({ prep, np: ppResult.np });
          i = ppResult.endIndex;
        }
        continue;
      }

      // Try to extract noun phrase as object
      const objResult = this._extractNounPhrase(tokens, i);
      if (objResult.np) {
        if (!parsed.object) {
          parsed.object = objResult.np;
        } else if (!parsed.indirectObject) {
          parsed.indirectObject = parsed.object;
          parsed.object = objResult.np;
        }
        i = objResult.endIndex;
        continue;
      }

      // Skip unknown/other tokens
      i++;
    }
  }

  _extractNounPhrase(tokens, startIndex) {
    let i = startIndex;
    if (i >= tokens.length) return { np: null, endIndex: i };

    const np = {
      type: 'np',
      determiner: null,
      possessive: null,
      adjectives: [],
      noun: null,
      plural: false,
    };

    // Check for pronoun
    if (tokens[i].type === 'pronoun') {
      return {
        np: {
          type: 'pronoun',
          word: tokens[i].word,
          person: tokens[i].person,
        },
        endIndex: i + 1,
      };
    }

    // Check for possessive pronoun
    if (tokens[i].type === 'possessive') {
      np.possessive = tokens[i].word;
      i++;
    }

    // Check for article/determiner
    if (i < tokens.length && tokens[i].type === 'article') {
      np.determiner = tokens[i].word;
      i++;
    }

    // Collect adjectives
    while (i < tokens.length && tokens[i].type === 'adjective') {
      np.adjectives.push(tokens[i].word);
      i++;
    }

    // Noun
    if (i < tokens.length && (tokens[i].type === 'noun' || tokens[i].type === 'unknown')) {
      np.noun = tokens[i].singular || tokens[i].word;
      np.plural = tokens[i].plural || false;
      i++;

      return { np, endIndex: i };
    }

    // If we got a determiner/possessive but no noun, might be incomplete
    if (np.determiner || np.possessive || np.adjectives.length > 0) {
      // Maybe next word is noun even if not recognized
      if (i < tokens.length && tokens[i].type !== 'preposition' && tokens[i].type !== 'verb') {
        np.noun = this._getSingular(tokens[i].word);
        i++;
        return { np, endIndex: i };
      }
    }

    return { np: null, endIndex: startIndex };
  }

  _getVerbBase(word) {
    // Check irregular verbs first
    if (word in this.irregularVerbs) {
      return this.irregularVerbs[word];
    }

    // Strip regular endings
    if (word.endsWith('ing')) {
      const stem = word.slice(0, -3);
      // Check for doubled consonant: running -> run
      if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
        return stem.slice(0, -1);
      }
      // Check for dropped e: making -> make
      const withE = stem + 'e';
      if (this.lexicon?.lookup?.(withE)) return withE;
      return stem;
    }

    if (word.endsWith('ed')) {
      const stem = word.slice(0, -2);
      // Check for doubled consonant
      if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
        return stem.slice(0, -1);
      }
      // ied -> y
      if (word.endsWith('ied')) return word.slice(0, -3) + 'y';
      // Check for dropped e
      const withE = stem + 'e';
      if (this.lexicon?.lookup?.(withE)) return withE;
      return stem;
    }

    if (word.endsWith('es') && (word.endsWith('shes') || word.endsWith('ches') ||
        word.endsWith('xes') || word.endsWith('sses') || word.endsWith('zes'))) {
      return word.slice(0, -2);
    }

    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y';
    }

    if (word.endsWith('s') && !word.endsWith('ss')) {
      return word.slice(0, -1);
    }

    return word;
  }

  /**
   * Transfer English structure to target language structure
   */
  _transfer(parsed) {
    const transferred = {
      words: [],
      wordOrder: this.morphology.wordOrder.basic,
      original: parsed,
    };

    // Build components
    let subject = null;
    let verb = null;
    let object = null;
    let indirect = null;
    const extras = [];

    // Subject
    if (parsed.subject) {
      subject = this._transferNP(parsed.subject, 'subject', parsed);
    }

    // Verb
    if (parsed.verb) {
      verb = this._transferVerb(parsed.verb, parsed);
    }

    // Object
    if (parsed.object) {
      object = this._transferNP(parsed.object, 'object', parsed);
    }

    // Indirect object
    if (parsed.indirectObject) {
      indirect = this._transferNP(parsed.indirectObject, 'indirect', parsed);
    }

    // Prepositional phrases
    for (const pp of parsed.prepPhrases) {
      const ppWords = this._transferPP(pp, parsed);
      extras.push(...ppWords);
    }

    // Negation particle
    if (parsed.negated) {
      const negEntry = this.lexicon?.lookup?.('not');
      if (negEntry) {
        extras.unshift({
          surface: negEntry.lemma,
          gloss: 'NEG',
          morphemes: [negEntry.lemma],
          glosses: ['NEG'],
        });
      }
    }

    // Apply word order
    const order = this.morphology.wordOrder.basic;
    const components = { S: subject, V: verb, O: object };

    for (const position of order.split('')) {
      if (components[position]) {
        if (Array.isArray(components[position])) {
          transferred.words.push(...components[position]);
        } else {
          transferred.words.push(components[position]);
        }
      }
    }

    // Add indirect object and extras
    if (indirect) {
      transferred.words.push(...(Array.isArray(indirect) ? indirect : [indirect]));
    }
    transferred.words.push(...extras);

    // Add question particle if needed
    if (parsed.isQuestion && !parsed.questionType) {
      const qParticle = this.lexicon?.lookup?.('Q');
      if (qParticle) {
        transferred.words.push({
          surface: qParticle.lemma,
          gloss: 'Q',
          morphemes: [qParticle.lemma],
          glosses: ['Q'],
        });
      }
    }

    return transferred;
  }

  _transferNP(np, role, parsed) {
    const words = [];
    const caseSystem = this.morphology.nominal.caseSystem;
    const numberSystem = this.morphology.nominal.numberSystem;

    // Determine case based on role and alignment
    let caseToUse = null;
    if (caseSystem.cases.length > 0) {
      if (caseSystem.alignment === 'nominative-accusative') {
        if (role === 'subject') {
          caseToUse = caseSystem.cases.find(c => c.abbr === 'NOM');
        } else if (role === 'object') {
          caseToUse = caseSystem.cases.find(c => c.abbr === 'ACC');
        } else if (role === 'indirect') {
          caseToUse = caseSystem.cases.find(c => c.abbr === 'DAT') ||
                      caseSystem.cases.find(c => c.abbr === 'ACC');
        } else if (role === 'possessive') {
          caseToUse = caseSystem.cases.find(c => c.abbr === 'GEN') ||
                      caseSystem.cases.find(c => c.abbr === 'NOM');
        }
      } else if (caseSystem.alignment === 'ergative-absolutive') {
        if (role === 'subject' && parsed.object) {
          caseToUse = caseSystem.cases.find(c => c.abbr === 'ERG');
        } else {
          caseToUse = caseSystem.cases.find(c => c.abbr === 'ABS');
        }
      }
      caseToUse = caseToUse || caseSystem.cases[0];
    }

    // Determine number
    let numberToUse = null;
    if (numberSystem.categories.length > 1) {
      numberToUse = np.plural
        ? numberSystem.categories.find(n => n.abbr === 'PL')
        : numberSystem.categories.find(n => n.abbr === 'SG');
    }

    // Handle pronoun
    if (np.type === 'pronoun') {
      const entry = this._lookupPronoun(np.word);
      if (entry) {
        let surface = entry.lemma;
        const morphemes = [entry.lemma];
        const glosses = [entry.gloss.toUpperCase()];

        if (caseToUse?.suffix) {
          surface += caseToUse.suffix;
          morphemes.push(caseToUse.suffix);
          glosses.push(caseToUse.abbr);
        }

        words.push({ surface, gloss: glosses.join('-'), morphemes, glosses });
      } else {
        words.push({
          surface: `[${np.word}]`,
          gloss: np.word.toUpperCase(),
          morphemes: [`[${np.word}]`],
          glosses: [np.word.toUpperCase()],
        });
      }
      return words;
    }

    // Handle full NP
    const adjPosition = this.morphology.wordOrder.adjectivePosition;

    // Possessive
    if (np.possessive) {
      const possEntry = this._lookupPronoun(np.possessive);
      if (possEntry) {
        let surface = possEntry.lemma;
        const morphemes = [possEntry.lemma];
        const glosses = [possEntry.gloss.toUpperCase()];

        // Add genitive case if available
        const genCase = caseSystem.cases.find(c => c.abbr === 'GEN');
        if (genCase?.suffix) {
          surface += genCase.suffix;
          morphemes.push(genCase.suffix);
          glosses.push('GEN');
        }

        words.push({ surface, gloss: glosses.join('-'), morphemes, glosses });
      }
    }

    // Adjectives before noun
    if (adjPosition === 'before' && np.adjectives) {
      for (const adj of np.adjectives) {
        const entry = this.lexicon?.lookup?.(adj);
        if (entry) {
          let surface = entry.lemma;
          const morphemes = [entry.lemma];
          const glosses = [adj];

          // Adjective agreement with case
          if (caseToUse?.suffix && this.morphology.nominal.nounClasses?.agreementOn?.includes('adjectives')) {
            surface += caseToUse.suffix;
            morphemes.push(caseToUse.suffix);
            glosses.push(caseToUse.abbr);
          }

          words.push({ surface, gloss: glosses.join('-'), morphemes, glosses });
        } else {
          words.push({
            surface: `[${adj}]`,
            gloss: adj,
            morphemes: [`[${adj}]`],
            glosses: [adj],
          });
        }
      }
    }

    // Noun
    if (np.noun) {
      const entry = this.lexicon?.lookup?.(np.noun);
      if (entry) {
        let surface = entry.lemma;
        const morphemes = [entry.lemma];
        const glosses = [np.noun];

        // Number suffix
        if (numberToUse?.suffix) {
          surface += numberToUse.suffix;
          morphemes.push(numberToUse.suffix);
          glosses.push(numberToUse.abbr);
        }

        // Case suffix
        if (caseToUse?.suffix) {
          surface += caseToUse.suffix;
          morphemes.push(caseToUse.suffix);
          glosses.push(caseToUse.abbr);
        }

        words.push({ surface, gloss: glosses.join('-'), morphemes, glosses });
      } else {
        // Unknown word - use placeholder
        words.push({
          surface: `[${np.noun}]`,
          gloss: np.noun + (np.plural ? '-PL' : ''),
          morphemes: [`[${np.noun}]`],
          glosses: [np.noun],
        });
      }
    }

    // Adjectives after noun
    if (adjPosition === 'after' && np.adjectives) {
      for (const adj of np.adjectives) {
        const entry = this.lexicon?.lookup?.(adj);
        if (entry) {
          let surface = entry.lemma;
          const morphemes = [entry.lemma];
          const glosses = [adj];

          if (caseToUse?.suffix && this.morphology.nominal.nounClasses?.agreementOn?.includes('adjectives')) {
            surface += caseToUse.suffix;
            morphemes.push(caseToUse.suffix);
            glosses.push(caseToUse.abbr);
          }

          words.push({ surface, gloss: glosses.join('-'), morphemes, glosses });
        }
      }
    }

    return words;
  }

  _transferPP(pp, parsed) {
    const words = [];

    // Translate preposition
    const prepKey = this.prepositions[pp.prep] || pp.prep;
    const prepEntry = this.lexicon?.lookup?.(prepKey);

    if (prepEntry) {
      words.push({
        surface: prepEntry.lemma,
        gloss: pp.prep.toUpperCase(),
        morphemes: [prepEntry.lemma],
        glosses: [pp.prep.toUpperCase()],
      });
    }

    // Translate the noun phrase (with oblique/dative case if available)
    const npWords = this._transferNP(pp.np, 'oblique', parsed);
    words.push(...npWords);

    return words;
  }

  _lookupPronoun(pronoun) {
    const key = this.pronounMappings[pronoun.toLowerCase()] || pronoun;
    return this.lexicon?.lookup?.(key);
  }

  _transferVerb(verb, parsed) {
    const entry = this.lexicon?.lookup?.(verb.word);
    if (!entry) {
      return {
        surface: `[${verb.word}]`,
        gloss: verb.word,
        morphemes: [`[${verb.word}]`],
        glosses: [verb.word],
      };
    }

    let surface = entry.lemma;
    const morphemes = [entry.lemma];
    const glosses = [verb.word];

    // Add tense
    const tenses = this.morphology.verbal.tenses.tenses;
    let tenseMarker = null;

    if (parsed.tense === 'past') {
      tenseMarker = tenses.find(t => t.abbr === 'PST' || t.name === 'past');
    } else if (parsed.tense === 'future') {
      tenseMarker = tenses.find(t => t.abbr === 'FUT' || t.name === 'future');
    } else {
      tenseMarker = tenses.find(t => t.abbr === 'PRS' || t.name === 'present' || t.name === 'non-past');
    }

    if (tenseMarker?.suffix) {
      surface += tenseMarker.suffix;
      morphemes.push(tenseMarker.suffix);
      glosses.push(tenseMarker.abbr);
    }

    // Add agreement
    const agreement = this.morphology.verbal.agreement;
    if (agreement.marksSubject && agreement.subjectMarkers.length > 0) {
      const person = parsed.subjectPerson || 3;
      const number = parsed.subjectNumber || 'SG';
      const label = `${person}${number}`;

      let marker = agreement.subjectMarkers.find(m => m.label === label);
      if (!marker) {
        marker = agreement.subjectMarkers.find(m => m.label === '3SG');
      }

      if (marker?.affix) {
        surface += marker.affix;
        morphemes.push(marker.affix);
        glosses.push(marker.label);
      }
    }

    return { surface, gloss: glosses.join('-'), morphemes, glosses };
  }

  /**
   * Generate surface form from transferred structure
   */
  _generateSurface(transferred) {
    return transferred.words.map(w => w.surface).join(' ');
  }

  /**
   * Generate interlinear gloss
   */
  _generateGloss(transferred) {
    const lines = {
      surface: [],
      gloss: [],
    };

    for (const word of transferred.words) {
      lines.surface.push(word.surface);
      lines.gloss.push(word.gloss);
    }

    // Format as aligned text
    const maxLen = Math.max(
      ...lines.surface.map(w => w.length),
      ...lines.gloss.map(w => w.length)
    );

    const surfaceLine = lines.surface.map(w => w.padEnd(maxLen + 2)).join('');
    const glossLine = lines.gloss.map(w => w.padEnd(maxLen + 2)).join('');

    return `${surfaceLine}\n${glossLine}`;
  }

  /**
   * Analyze a word from the conlang
   */
  _analyzeWord(word) {
    // Try direct reverse lookup
    if (this._reverseCache.has(word)) {
      const entry = this._reverseCache.get(word);
      return { lemma: entry.lemma, gloss: entry.gloss };
    }

    // Try direct lookup in lexicon
    for (const entry of this.lexicon?.getEntries?.() || []) {
      if (entry.lemma === word) {
        return { lemma: entry.lemma, gloss: entry.gloss };
      }

      // Check paradigm forms
      if (entry.paradigm?.forms) {
        for (const [key, form] of Object.entries(entry.paradigm.forms)) {
          if (form === word) {
            return { lemma: entry.lemma, gloss: `${entry.gloss}.${key}` };
          }
        }
      }
    }

    // Try stripping affixes
    return this._stripAffixes(word);
  }

  _stripAffixes(word) {
    // Try stripping case suffixes
    for (const cas of this.morphology.nominal.caseSystem.cases) {
      if (cas.suffix && word.endsWith(cas.suffix)) {
        const stem = word.slice(0, -cas.suffix.length);
        const entry = this.lexicon?.getEntries?.().find(e => e.lemma === stem);
        if (entry) {
          return { lemma: entry.lemma, gloss: `${entry.gloss}-${cas.abbr}` };
        }
      }
    }

    // Try stripping number suffixes
    for (const num of this.morphology.nominal.numberSystem.categories) {
      if (num.suffix && word.endsWith(num.suffix)) {
        const stem = word.slice(0, -num.suffix.length);
        const entry = this.lexicon?.getEntries?.().find(e => e.lemma === stem);
        if (entry) {
          return { lemma: entry.lemma, gloss: `${entry.gloss}-${num.abbr}` };
        }
      }
    }

    // Try stripping tense suffixes
    for (const tense of this.morphology.verbal.tenses.tenses) {
      if (tense.suffix && word.endsWith(tense.suffix)) {
        const stem = word.slice(0, -tense.suffix.length);
        const entry = this.lexicon?.getEntries?.().find(e => e.lemma === stem);
        if (entry) {
          return { lemma: entry.lemma, gloss: `${entry.gloss}-${tense.abbr}` };
        }
      }
    }

    // Try stripping agreement markers
    const agreement = this.morphology.verbal.agreement;
    if (agreement.subjectMarkers) {
      for (const marker of agreement.subjectMarkers) {
        if (marker.affix && word.endsWith(marker.affix)) {
          const stem = word.slice(0, -marker.affix.length);
          const entry = this.lexicon?.getEntries?.().find(e => e.lemma === stem);
          if (entry) {
            return { lemma: entry.lemma, gloss: `${entry.gloss}-${marker.label}` };
          }
        }
      }
    }

    return null;
  }

  /**
   * Generate example sentences for the Stone document - EXPANDED
   */
  generateExamples() {
    const sentences = [
      // Basic SVO
      'The woman sees the dog.',
      'The man eats the bread.',
      'The child drinks water.',

      // Past tense
      'I ate the food.',
      'The king gave the gold.',
      'They went to the mountain.',

      // Future tense
      'We will drink the water.',
      'She will see the star.',

      // Adjectives
      'The big tree is old.',
      'The small bird flew.',
      'The good man helped the woman.',

      // Pronouns
      'I see you.',
      'They know us.',
      'He loves her.',

      // Questions
      'Who sees the moon?',
      'What did the woman say?',

      // Negation
      'The man does not sleep.',
      'I did not see the enemy.',

      // Prepositions
      'The woman went to the house.',
      'The bird flew from the tree.',
      'The child walked with the dog.',

      // Plurals
      'The men fight the enemies.',
      'The women see the children.',

      // Complex
      'The wise king gave the sword to the warrior.',
      'My father built the house.',
      'The big fire burned the old tree.',
    ];

    const examples = [];

    for (const sentence of sentences) {
      try {
        const translation = this.translateToConlang(sentence);
        // Only include if we got a meaningful translation
        if (translation.target && !translation.target.includes('[')) {
          examples.push({
            english: sentence,
            target: translation.target,
            gloss: translation.gloss,
          });
        }
      } catch (e) {
        // Skip sentences that fail to translate
        continue;
      }
    }

    // Return at least 8 examples, or all if fewer
    return examples.slice(0, Math.max(8, Math.min(examples.length, 15)));
  }

  /**
   * Generate translation exercises - EXPANDED
   */
  generateExercises() {
    const exercises = [];
    const templates = [
      // Simple SVO
      { subject: 'man', verb: 'see', object: 'tree', english: 'The man sees the tree.' },
      { subject: 'woman', verb: 'eat', object: 'food', english: 'The woman eats the food.' },
      { subject: 'child', verb: 'drink', object: 'water', english: 'The child drinks water.' },

      // Intransitive
      { subject: 'bird', verb: 'fly', object: null, english: 'The bird flies.' },
      { subject: 'dog', verb: 'run', object: null, english: 'The dog runs.' },
      { subject: 'man', verb: 'sleep', object: null, english: 'The man sleeps.' },

      // With adjectives
      { subject: 'big', adjSubject: 'dog', verb: 'see', object: 'small', adjObject: 'bird',
        english: 'The big dog sees the small bird.' },
      { subject: 'old', adjSubject: 'woman', verb: 'know', object: 'truth',
        english: 'The old woman knows the truth.' },

      // Abstract
      { subject: 'king', verb: 'have', object: 'power', english: 'The king has power.' },
      { subject: 'warrior', verb: 'fear', object: 'death', english: 'The warrior fears death.' },
    ];

    for (const template of templates) {
      try {
        const subjectEntry = template.adjSubject
          ? this.lexicon?.lookup?.(template.adjSubject)
          : this.lexicon?.lookup?.(template.subject);
        const verbEntry = this.lexicon?.lookup?.(template.verb);
        const objectEntry = template.object ? this.lexicon?.lookup?.(
          template.adjObject || template.object
        ) : null;

        if (subjectEntry && verbEntry) {
          const order = this.morphology.wordOrder.basic;
          const cases = this.morphology.nominal.caseSystem.cases;
          const tenses = this.morphology.verbal.tenses.tenses;

          const nomCase = cases.find(c => c.abbr === 'NOM');
          const accCase = cases.find(c => c.abbr === 'ACC');
          const prsTense = tenses.find(t => t.abbr === 'PRS' || t.name === 'present');

          const parts = {
            S: subjectEntry.lemma + (nomCase?.suffix || ''),
            V: verbEntry.lemma + (prsTense?.suffix || ''),
            O: objectEntry ? objectEntry.lemma + (accCase?.suffix || '') : '',
          };

          let sentence = '';
          for (const pos of order.split('')) {
            if (parts[pos]) {
              sentence += parts[pos] + ' ';
            }
          }

          if (sentence.trim()) {
            exercises.push({
              target: sentence.trim(),
              english: template.english,
            });
          }
        }
      } catch (e) {
        continue;
      }
    }

    return exercises.slice(0, 8);
  }

  /**
   * Interactive translation helper - translate a single word
   */
  translateWord(english) {
    const entry = this.lexicon?.lookup?.(english.toLowerCase());
    if (entry) {
      return {
        english,
        target: entry.lemma,
        class: entry.class,
        paradigm: entry.paradigm,
      };
    }

    // Try as verb base
    const verbBase = this._getVerbBase(english.toLowerCase());
    const verbEntry = this.lexicon?.lookup?.(verbBase);
    if (verbEntry) {
      return {
        english,
        target: verbEntry.lemma,
        class: verbEntry.class,
        paradigm: verbEntry.paradigm,
        note: `Base form: ${verbBase}`,
      };
    }

    // Try as singular noun
    const singular = this._getSingular(english.toLowerCase());
    const nounEntry = this.lexicon?.lookup?.(singular);
    if (nounEntry) {
      return {
        english,
        target: nounEntry.lemma,
        class: nounEntry.class,
        paradigm: nounEntry.paradigm,
        note: `Singular form: ${singular}`,
      };
    }

    return { english, target: null, error: 'Word not found in lexicon' };
  }
}
