/**
 * GLOSSOPETRAE - Translation Engine Module
 *
 * Rule-based machine translation between English and the generated language.
 * Generates interlinear glosses and worked examples.
 *
 * ENHANCED v3: Robust handling of technical text, proper nouns, acronyms,
 * semantic decomposition (calques), and consistent unknown word generation
 */

export class TranslationEngine {
  constructor(language) {
    this.language = language;
    this.lexicon = language.lexicon;
    this.morphology = language.morphology;

    // Build reverse lookup cache for faster translation from conlang
    this._buildReverseLookup();

    // Cache for unknown word mappings (ensures consistency)
    this._unknownWordCache = new Map();

    // Semantic decomposition mappings (English concept -> component words)
    // Used for calque-style translation of technical terms
    this.semanticDecomposition = {
      // Technology
      'computer': ['think', 'machine'], 'software': ['mind', 'tool'], 'hardware': ['body', 'tool'],
      'internet': ['world', 'web'], 'website': ['place', 'web'], 'email': ['letter', 'fast'],
      'download': ['take', 'down'], 'upload': ['give', 'up'], 'database': ['knowledge', 'house'],
      'server': ['give', 'machine'], 'network': ['web', 'path'], 'algorithm': ['think', 'path'],
      'program': ['command', 'list'], 'code': ['secret', 'word'], 'data': ['knowledge', 'piece'],
      'file': ['paper', 'hold'], 'folder': ['paper', 'house'], 'memory': ['think', 'hold'],
      'processor': ['think', 'heart'], 'screen': ['see', 'glass'], 'keyboard': ['write', 'board'],
      'mouse': ['hand', 'tool'], 'printer': ['write', 'machine'], 'scanner': ['see', 'machine'],
      'password': ['secret', 'word'], 'username': ['name', 'self'], 'login': ['enter', 'door'],
      'logout': ['leave', 'door'], 'browser': ['see', 'tool'], 'search': ['seek', 'find'],
      'click': ['touch', 'fast'], 'scroll': ['move', 'eye'], 'zoom': ['big', 'see'],
      // Security
      'jailbreak': ['free', 'prison'], 'hack': ['break', 'enter'], 'security': ['safe', 'guard'],
      'firewall': ['fire', 'wall'], 'virus': ['sick', 'small'], 'malware': ['bad', 'tool'],
      'encryption': ['secret', 'make'], 'decrypt': ['secret', 'break'], 'exploit': ['use', 'bad'],
      'vulnerability': ['weak', 'place'], 'patch': ['fix', 'piece'], 'backup': ['copy', 'safe'],
      // AI/ML
      'ai': ['think', 'machine'], 'artificial': ['make', 'false'], 'intelligence': ['think', 'power'],
      'robot': ['work', 'machine'], 'automation': ['self', 'work'], 'neural': ['brain', 'like'],
      'learning': ['know', 'grow'], 'training': ['teach', 'time'], 'model': ['shape', 'think'],
      'prompt': ['word', 'start'], 'response': ['word', 'back'], 'generate': ['make', 'new'],
      'token': ['piece', 'word'], 'embedding': ['hide', 'meaning'], 'inference': ['think', 'guess'],
      // General technical
      'system': ['all', 'work'], 'protocol': ['rule', 'path'], 'interface': ['face', 'between'],
      'api': ['door', 'talk'], 'framework': ['frame', 'work'], 'library': ['tool', 'house'],
      'module': ['piece', 'work'], 'function': ['do', 'thing'], 'variable': ['change', 'thing'],
      'parameter': ['give', 'value'], 'output': ['out', 'give'], 'input': ['in', 'take'],
      'configuration': ['set', 'way'], 'settings': ['set', 'thing'], 'options': ['choose', 'thing'],
      'documentation': ['write', 'explain'], 'manual': ['hand', 'book'], 'guide': ['lead', 'book'],
      'tutorial': ['teach', 'show'], 'example': ['show', 'one'], 'demo': ['show', 'try'],
      'version': ['time', 'shape'], 'update': ['new', 'make'], 'upgrade': ['better', 'make'],
      'install': ['put', 'in'], 'uninstall': ['take', 'out'], 'deploy': ['send', 'out'],
      'compile': ['make', 'one'], 'debug': ['fix', 'error'], 'error': ['wrong', 'thing'],
      'bug': ['small', 'wrong'], 'feature': ['do', 'new'], 'release': ['give', 'world'],
      'repository': ['code', 'house'], 'repo': ['code', 'house'], 'branch': ['path', 'split'],
      'merge': ['join', 'one'], 'commit': ['save', 'change'], 'push': ['send', 'out'],
      'pull': ['take', 'in'], 'clone': ['copy', 'all'], 'fork': ['split', 'path'],
      // Communication
      'message': ['word', 'send'], 'notification': ['tell', 'alert'], 'alert': ['warn', 'fast'],
      'broadcast': ['tell', 'all'], 'stream': ['flow', 'continuous'], 'channel': ['path', 'talk'],
      'chat': ['talk', 'fast'], 'video': ['see', 'move'], 'audio': ['hear', 'sound'],
      'podcast': ['voice', 'show'], 'webinar': ['web', 'teach'], 'conference': ['meet', 'many'],
      // Business/Organization
      'company': ['work', 'group'], 'organization': ['order', 'group'], 'team': ['work', 'small'],
      'project': ['work', 'plan'], 'task': ['do', 'one'], 'deadline': ['time', 'end'],
      'meeting': ['come', 'talk'], 'presentation': ['show', 'speak'], 'report': ['tell', 'formal'],
      'analysis': ['break', 'understand'], 'strategy': ['plan', 'war'], 'objective': ['goal', 'clear'],
      'milestone': ['mark', 'path'], 'deliverable': ['give', 'thing'], 'stakeholder': ['hold', 'interest'],
    };

    // Coordinating conjunctions (join independent clauses)
    this.coordinatingConj = {
      'and': 'and', 'or': 'or', 'but': 'but', 'yet': 'but', 'so': 'so', 'nor': 'or',
    };

    // Subordinating conjunctions (introduce dependent clauses)
    this.subordinatingConj = {
      'because': 'because', 'since': 'because', 'as': 'because',
      'if': 'if', 'unless': 'if', 'whether': 'if',
      'when': 'when', 'whenever': 'when', 'while': 'when', 'as': 'when',
      'before': 'before', 'after': 'after', 'until': 'before', 'till': 'before',
      'although': 'but', 'though': 'but', 'even though': 'but', 'whereas': 'but',
      'where': 'where', 'wherever': 'where',
      'that': 'COMP', // Complementizer
    };

    // Relative pronouns
    this.relativePronouns = new Set(['who', 'whom', 'whose', 'which', 'that', 'where', 'when', 'why']);

    // Infinitive markers
    this.infinitiveVerbs = new Set([
      'want', 'wants', 'wanted', 'need', 'needs', 'needed', 'have', 'has', 'had',
      'try', 'tries', 'tried', 'begin', 'begins', 'began', 'start', 'starts', 'started',
      'like', 'likes', 'liked', 'love', 'loves', 'loved', 'hate', 'hates', 'hated',
      'hope', 'hopes', 'hoped', 'wish', 'wishes', 'wished', 'expect', 'expects', 'expected',
      'plan', 'plans', 'planned', 'decide', 'decides', 'decided', 'learn', 'learns', 'learned',
      'seem', 'seems', 'seemed', 'appear', 'appears', 'appeared', 'continue', 'continues', 'continued',
    ]);

    // Contraction expansions
    this.contractions = {
      "don't": "do not", "doesn't": "does not", "didn't": "did not",
      "won't": "will not", "wouldn't": "would not", "couldn't": "could not",
      "shouldn't": "should not", "can't": "can not", "cannot": "can not",
      "mustn't": "must not", "isn't": "is not", "aren't": "are not",
      "wasn't": "was not", "weren't": "were not", "hasn't": "has not",
      "haven't": "have not", "hadn't": "had not",
      "i'm": "i am", "i've": "i have", "i'll": "i will", "i'd": "i would",
      "you're": "you are", "you've": "you have", "you'll": "you will", "you'd": "you would",
      "he's": "he is", "she's": "she is", "it's": "it is",
      "he'll": "he will", "she'll": "she will", "it'll": "it will",
      "he'd": "he would", "she'd": "she would", "it'd": "it would",
      "we're": "we are", "we've": "we have", "we'll": "we will", "we'd": "we would",
      "they're": "they are", "they've": "they have", "they'll": "they will", "they'd": "they would",
      "that's": "that is", "there's": "there is", "here's": "here is",
      "what's": "what is", "who's": "who is", "where's": "where is",
      "let's": "let us", "ain't": "is not",
    };

    // Common abbreviations that shouldn't be treated as sentence endings
    this.abbreviations = new Set([
      'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'ave', 'blvd',
      'etc', 'vs', 'inc', 'ltd', 'dept', 'gen', 'gov', 'sgt', 'cpl',
      'capt', 'lt', 'col', 'maj', 'pvt', 'rev', 'hon',
      'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    ]);

    // Number words for translation
    this.numberWords = {
      0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
      6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
      11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
      16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
      30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty',
      70: 'seventy', 80: 'eighty', 90: 'ninety', 100: 'hundred', 1000: 'thousand',
    };

    this.ordinalWords = {
      '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth',
      '6th': 'sixth', '7th': 'seventh', '8th': 'eighth', '9th': 'ninth', '10th': 'tenth',
    };

    // Modal verbs - map to semantic categories
    this.modalVerbs = {
      'can': { type: 'ability', tense: 'present' },
      'could': { type: 'ability', tense: 'past' },
      'may': { type: 'permission', tense: 'present' },
      'might': { type: 'possibility', tense: 'present' },
      'must': { type: 'obligation', tense: 'present' },
      'shall': { type: 'future', tense: 'present' },
      'should': { type: 'obligation', tense: 'past' },
      'will': { type: 'future', tense: 'present' },
      'would': { type: 'conditional', tense: 'past' },
    };

    // Time expressions - map to temporal categories
    this.timeExpressions = {
      'yesterday': { rel: 'past', unit: 'day' },
      'today': { rel: 'present', unit: 'day' },
      'tomorrow': { rel: 'future', unit: 'day' },
      'now': { rel: 'present', unit: 'moment' },
      'soon': { rel: 'future', unit: 'near' },
      'later': { rel: 'future', unit: 'indefinite' },
      'earlier': { rel: 'past', unit: 'indefinite' },
      'always': { rel: 'habitual', unit: 'all' },
      'never': { rel: 'habitual', unit: 'none' },
      'often': { rel: 'habitual', unit: 'frequent' },
      'sometimes': { rel: 'habitual', unit: 'occasional' },
      'rarely': { rel: 'habitual', unit: 'infrequent' },
      'once': { rel: 'past', unit: 'single' },
      'twice': { rel: 'past', unit: 'double' },
      'ago': { rel: 'past', unit: 'relative' },
    };

    // Reflexive pronouns
    this.reflexivePronouns = {
      'myself': { person: 1, number: 'SG', base: 'I/me' },
      'yourself': { person: 2, number: 'SG', base: 'you (sg)' },
      'himself': { person: 3, number: 'SG', base: 'he/she/it' },
      'herself': { person: 3, number: 'SG', base: 'he/she/it' },
      'itself': { person: 3, number: 'SG', base: 'he/she/it' },
      'ourselves': { person: 1, number: 'PL', base: 'we/us' },
      'yourselves': { person: 2, number: 'PL', base: 'you (sg)' },
      'themselves': { person: 3, number: 'PL', base: 'they/them' },
    };

    // Comparative/superlative patterns
    this.comparativeWords = {
      'more': 'COMP', 'less': 'COMP.NEG', 'most': 'SUPL', 'least': 'SUPL.NEG',
      'better': { base: 'good', form: 'COMP' },
      'worse': { base: 'bad', form: 'COMP' },
      'best': { base: 'good', form: 'SUPL' },
      'worst': { base: 'bad', form: 'SUPL' },
      'bigger': { base: 'big', form: 'COMP' },
      'biggest': { base: 'big', form: 'SUPL' },
      'smaller': { base: 'small', form: 'COMP' },
      'smallest': { base: 'small', form: 'SUPL' },
      'older': { base: 'old', form: 'COMP' },
      'oldest': { base: 'old', form: 'SUPL' },
      'younger': { base: 'young', form: 'COMP' },
      'youngest': { base: 'young', form: 'SUPL' },
      'stronger': { base: 'strong', form: 'COMP' },
      'strongest': { base: 'strong', form: 'SUPL' },
      'faster': { base: 'fast', form: 'COMP' },
      'fastest': { base: 'fast', form: 'SUPL' },
      'longer': { base: 'long', form: 'COMP' },
      'longest': { base: 'long', form: 'SUPL' },
      'higher': { base: 'high', form: 'COMP' },
      'highest': { base: 'high', form: 'SUPL' },
    };

    // Passive voice markers
    this.passiveMarkers = ['was', 'were', 'been', 'being', 'got', 'gotten'];

    // Degree adverbs
    this.degreeAdverbs = {
      'very': 'INTNS', 'extremely': 'INTNS.MAX', 'quite': 'INTNS.MED',
      'rather': 'INTNS.MED', 'somewhat': 'INTNS.LOW', 'slightly': 'INTNS.MIN',
      'too': 'EXCESS', 'enough': 'SUFFIC', 'almost': 'APPROX', 'nearly': 'APPROX',
      'completely': 'TOTAL', 'totally': 'TOTAL', 'absolutely': 'TOTAL',
      'hardly': 'INTNS.NEG', 'barely': 'INTNS.NEG', 'scarcely': 'INTNS.NEG',
    };

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

  // ===================================================================
  // PRE-PROCESSING PIPELINE
  // Normalizes input text before translation: contractions, possessives,
  // numbers, special characters, and paragraph handling
  // ===================================================================

  /**
   * Master pre-processing: normalize text for the translation pipeline
   */
  _preprocess(text) {
    let result = text;

    // Normalize line breaks and whitespace
    result = this._normalizeWhitespace(result);

    // Protect comma-separated lists from being split as clauses
    result = this._protectLists(result);

    // Expand contractions (don't → do not, I'm → I am)
    result = this._expandContractions(result);

    // Handle possessives (king's → king 's → special token)
    result = this._handlePossessives(result);

    // Convert numbers to words (3 → three, 100 → one hundred)
    result = this._convertNumbers(result);

    // Handle ordinals (1st → first, 2nd → second)
    result = this._convertOrdinals(result);

    // Strip or normalize special characters
    result = this._normalizeSpecialChars(result);

    return result;
  }

  /**
   * Detect and protect comma-separated lists from being treated as clause separators
   * Lists like "ai, the jailbreaks, the system prompt" should stay together
   */
  _protectLists(text) {
    let result = text;

    // Pattern for colon-introduced lists: "things like: a, b, c" or "including: x, y, z"
    // Replace commas in these contexts with a list separator marker
    result = result.replace(
      /:\s*([^.!?]+?)(?=[.!?]|$)/gi,
      (match, listContent) => {
        // Replace commas with AND in list context
        const items = listContent.split(/,\s*/);
        if (items.length >= 2) {
          return ': ' + items.join(' and ');
        }
        return match;
      }
    );

    // Pattern for "like X, Y, Z" or "such as X, Y, Z" lists
    result = result.replace(
      /\b(like|such as|including|especially|particularly|namely)\s+([^.!?;:]+?)(?=[.!?;:]|$)/gi,
      (match, intro, listContent) => {
        const items = listContent.split(/,\s*/);
        if (items.length >= 2) {
          // Join with AND but keep the last comma-and pattern
          if (items.length === 2) {
            return `${intro} ${items[0]} and ${items[1]}`;
          }
          const last = items.pop();
          return `${intro} ${items.join(' and ')} and ${last}`;
        }
        return match;
      }
    );

    // Pattern for comma-separated noun phrases (detect by lack of verbs)
    // "the ai, the jailbreaks, the system prompt" → join with AND
    result = result.replace(
      /\b(the\s+\w+)((?:\s*,\s*the\s+\w+)+)/gi,
      (match, first, rest) => {
        const items = [first, ...rest.split(/\s*,\s*/).filter(s => s.trim())];
        if (items.length >= 2) {
          const last = items.pop();
          return items.join(' and ') + ' and ' + last;
        }
        return match;
      }
    );

    return result;
  }

  /**
   * Normalize whitespace: line breaks become sentence breaks, collapse spaces
   */
  _normalizeWhitespace(text) {
    // Convert multiple line breaks to sentence boundary markers
    let result = text.replace(/\n\s*\n/g, '. ');
    // Convert single line breaks to spaces (within a paragraph)
    result = result.replace(/\n/g, ' ');
    // Collapse multiple spaces
    result = result.replace(/\s{2,}/g, ' ');
    return result.trim();
  }

  /**
   * Expand English contractions to full forms
   */
  _expandContractions(text) {
    let result = text;
    // Sort by length descending to match longer contractions first
    const sorted = Object.entries(this.contractions).sort((a, b) => b[0].length - a[0].length);
    for (const [contraction, expansion] of sorted) {
      // Case-insensitive replacement preserving sentence position
      const regex = new RegExp(contraction.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(regex, (match) => {
        // Preserve capitalization of first character
        if (match[0] === match[0].toUpperCase()) {
          return expansion.charAt(0).toUpperCase() + expansion.slice(1);
        }
        return expansion;
      });
    }
    return result;
  }

  /**
   * Handle possessives: "king's" → "king POSS", "children's" → "children POSS"
   */
  _handlePossessives(text) {
    // Handle 's possessives (the king's sword → the king POSS sword)
    let result = text.replace(/(\w+)'s\b/gi, '$1 POSS');
    // Handle s' possessives (the kings' swords → the kings POSS swords)
    result = result.replace(/(\w+s)'\b/gi, '$1 POSS');
    return result;
  }

  /**
   * Convert numeric digits to English words
   */
  _convertNumbers(text) {
    // Handle numbers with commas (1,000 → 1000)
    let result = text.replace(/(\d),(\d{3})/g, '$1$2');

    // Replace numbers with word equivalents
    result = result.replace(/\b(\d+)\b/g, (match) => {
      const num = parseInt(match, 10);
      return this._numberToWords(num);
    });

    return result;
  }

  /**
   * Convert a number to English words (handles 0 - 999,999)
   */
  _numberToWords(n) {
    if (n < 0) return 'negative ' + this._numberToWords(-n);
    if (this.numberWords[n]) return this.numberWords[n];

    if (n < 100) {
      const tens = Math.floor(n / 10) * 10;
      const ones = n % 10;
      return this.numberWords[tens] + (ones ? ' ' + this.numberWords[ones] : '');
    }

    if (n < 1000) {
      const hundreds = Math.floor(n / 100);
      const remainder = n % 100;
      return this.numberWords[hundreds] + ' hundred' +
             (remainder ? ' ' + this._numberToWords(remainder) : '');
    }

    if (n < 1000000) {
      const thousands = Math.floor(n / 1000);
      const remainder = n % 1000;
      return this._numberToWords(thousands) + ' thousand' +
             (remainder ? ' ' + this._numberToWords(remainder) : '');
    }

    // Very large numbers: just pass through as string
    return String(n);
  }

  /**
   * Convert ordinal numbers (1st, 2nd, 3rd) to words
   */
  _convertOrdinals(text) {
    return text.replace(/\b(\d+)(st|nd|rd|th)\b/gi, (match, num, suffix) => {
      const key = match.toLowerCase();
      if (this.ordinalWords[key]) return this.ordinalWords[key];
      // For larger ordinals, convert the number and add "-th"
      const n = parseInt(num, 10);
      const word = this._numberToWords(n);
      return word;
    });
  }

  /**
   * Normalize special characters for cleaner parsing
   */
  _normalizeSpecialChars(text) {
    let result = text;

    // Handle semicolons as sentence separators
    result = result.replace(/;/g, '.');

    // Handle colons - treat as sentence separator or strip depending on context
    result = result.replace(/:\s/g, '. ');

    // Handle em-dashes and en-dashes as clause separators
    result = result.replace(/\s*[—–]\s*/g, ', ');
    result = result.replace(/\s*--\s*/g, ', ');

    // Handle parentheticals - treat content as apposition
    result = result.replace(/\(([^)]+)\)/g, ', $1,');

    // Strip quotation marks but keep the content
    result = result.replace(/[""'']/g, '');
    result = result.replace(/["']/g, '');

    // Handle ellipsis
    result = result.replace(/\.{3,}/g, '.');
    result = result.replace(/…/g, '.');

    // Strip remaining special characters that aren't sentence-ending punctuation
    result = result.replace(/[#@$%^&*+=~`|\\{}\[\]<>]/g, '');

    // Handle slash as "or"
    result = result.replace(/\//g, ' or ');

    // Clean up any double periods or spaces created by replacements
    result = result.replace(/\.{2,}/g, '.');
    result = result.replace(/\s{2,}/g, ' ');
    result = result.replace(/,\s*,/g, ',');

    return result.trim();
  }

  // ===================================================================
  // MAIN TRANSLATION ENTRY POINT
  // ===================================================================

  /**
   * Translate English to the generated language
   * Supports: paragraphs, compound/complex sentences, coordinated NPs,
   * contractions, numbers, special characters, possessives, and more
   */
  translateToConlang(english) {
    // Pre-process the input text
    const processed = this._preprocess(english);

    // Handle multi-sentence input (split by sentence-ending punctuation)
    const sentences = this._splitIntoSentences(processed);

    if (sentences.length > 1) {
      // Translate each sentence separately
      const results = sentences.map(s => this._translateSingleSentence(s.text, s.punctuation));
      return {
        english,
        target: results.map(r => r.target).join(' '),
        gloss: results.map(r => r.gloss).join('\n\n'),
        structure: results.map(r => r.structure),
        parsed: results.map(r => r.parsed),
        isMultiSentence: true,
      };
    }

    return this._translateSingleSentence(processed, '.');
  }

  /**
   * Split text into individual sentences with improved handling
   * Handles abbreviations, decimals, and multiple punctuation types
   */
  _splitIntoSentences(text) {
    const sentences = [];

    // Protect abbreviations from being treated as sentence endings
    let protected_ = text;
    for (const abbr of this.abbreviations) {
      // Replace "Mr." with "Mr\x00" to protect the period
      const regex = new RegExp(`\\b(${abbr})\\.`, 'gi');
      protected_ = protected_.replace(regex, '$1\x00');
    }

    // Protect decimal numbers (3.14 etc.)
    protected_ = protected_.replace(/(\d)\.(\d)/g, '$1\x00$2');

    // Now split on actual sentence boundaries
    const regex = /([^.!?]+)([.!?]+)/g;
    let match;

    while ((match = regex.exec(protected_)) !== null) {
      // Restore protected periods
      let sentenceText = match[1].replace(/\x00/g, '.').trim();
      if (sentenceText.length > 0) {
        sentences.push({
          text: sentenceText,
          punctuation: match[2][0],
        });
      }
    }

    // Handle text without ending punctuation
    const remaining = protected_.replace(regex, '').replace(/\x00/g, '.').trim();
    if (remaining.length > 0) {
      sentences.push({ text: remaining, punctuation: '.' });
    }

    return sentences.length > 0 ? sentences : [{ text: text.trim(), punctuation: '.' }];
  }

  /**
   * Translate a single sentence (may contain multiple clauses)
   */
  _translateSingleSentence(english, punctuation) {
    // Check for compound or complex sentences
    const clauses = this._splitIntoClauses(english);

    if (clauses.length > 1) {
      return this._translateCompoundSentence(clauses, punctuation);
    }

    // Simple sentence
    const parsed = this._parseEnglish(english);
    const transferred = this._transfer(parsed);
    const surface = this._generateSurface(transferred);
    const gloss = this._generateGloss(transferred);

    return {
      english,
      target: surface,
      gloss,
      structure: transferred,
      parsed,
    };
  }

  /**
   * Split a sentence into clauses based on conjunctions
   */
  _splitIntoClauses(sentence) {
    const clauses = [];
    const lowerSentence = sentence.toLowerCase();

    // Pattern for coordinating conjunctions (and, or, but, so, yet)
    // Only split if there's a subject+verb on each side
    const coordPattern = /\s*,?\s*\b(and|or|but|yet|so)\s+/gi;

    // Pattern for subordinating conjunctions
    const subordPattern = /\s*,?\s*\b(because|since|if|unless|when|whenever|while|before|after|until|although|though|where|wherever)\s+/gi;

    // Check for relative clauses (who, which, that after a noun)
    const relPattern = /\s+(who|whom|which|that)\s+/gi;

    // First, try to find coordinating conjunctions
    let parts = sentence.split(coordPattern);

    if (parts.length > 2) {
      // We have compound clauses - parts alternates: [clause, conj, clause, conj, ...]
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (!part) continue;

        // Check if this is a conjunction
        if (this.coordinatingConj[part.toLowerCase()]) {
          if (clauses.length > 0) {
            clauses[clauses.length - 1].followedBy = part.toLowerCase();
          }
        } else if (part.length > 0) {
          clauses.push({
            text: part,
            type: clauses.length === 0 ? 'main' : 'coordinated',
            conjunction: clauses.length > 0 ? (clauses[clauses.length - 1]?.followedBy || 'and') : null,
          });
        }
      }
    }

    // If no coordinating split, try subordinating
    if (clauses.length <= 1) {
      clauses.length = 0;
      parts = sentence.split(subordPattern);

      if (parts.length > 2) {
        let lastConj = null;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();
          if (!part) continue;

          if (this.subordinatingConj[part.toLowerCase()]) {
            lastConj = part.toLowerCase();
          } else if (part.length > 0) {
            clauses.push({
              text: part,
              type: clauses.length === 0 ? 'main' : 'subordinate',
              conjunction: lastConj,
            });
            lastConj = null;
          }
        }
      }
    }

    // Check for relative clauses within what we have
    if (clauses.length === 0) {
      // Try to extract relative clauses
      const relMatch = sentence.match(/^(.+?)\s+(who|whom|which|that)\s+(.+)$/i);
      if (relMatch) {
        const mainPart = relMatch[1].trim();
        const relPronoun = relMatch[2].toLowerCase();
        const relClause = relMatch[3].trim();

        // Check if 'that' is actually a complementizer (I know that he left)
        if (relPronoun === 'that' && this._looksLikeComplementizer(mainPart)) {
          clauses.push({
            text: mainPart,
            type: 'main',
          });
          clauses.push({
            text: relClause,
            type: 'complement',
            conjunction: 'that',
          });
        } else {
          clauses.push({
            text: sentence,
            type: 'main',
            hasRelativeClause: true,
            relativePronoun: relPronoun,
            antecedent: mainPart,
            relativeClause: relClause,
          });
        }
      }
    }

    // If still nothing, return as single clause
    if (clauses.length === 0) {
      clauses.push({ text: sentence, type: 'main' });
    }

    return clauses;
  }

  /**
   * Check if 'that' is a complementizer vs relative pronoun
   */
  _looksLikeComplementizer(beforeThat) {
    const words = beforeThat.toLowerCase().split(/\s+/);
    const lastWord = words[words.length - 1];

    // Verbs that take complement clauses
    const complementVerbs = [
      'know', 'knows', 'knew', 'think', 'thinks', 'thought',
      'believe', 'believes', 'believed', 'say', 'says', 'said',
      'tell', 'tells', 'told', 'see', 'sees', 'saw',
      'hear', 'hears', 'heard', 'hope', 'hopes', 'hoped',
      'wish', 'wishes', 'wished', 'feel', 'feels', 'felt',
      'understand', 'understands', 'understood', 'realize', 'realizes', 'realized',
    ];

    return complementVerbs.includes(lastWord);
  }

  /**
   * Translate a compound or complex sentence
   */
  _translateCompoundSentence(clauses, punctuation) {
    const translatedClauses = [];
    const glossParts = [];

    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];

      // Translate the clause
      const parsed = this._parseEnglish(clause.text);
      const transferred = this._transfer(parsed);

      // Add conjunction if present
      if (clause.conjunction && i > 0) {
        const conjEntry = this._lookupConjunction(clause.conjunction);
        if (conjEntry) {
          transferred.words.unshift({
            surface: conjEntry.lemma,
            gloss: clause.conjunction.toUpperCase(),
            morphemes: [conjEntry.lemma],
            glosses: [clause.conjunction.toUpperCase()],
          });
        }
      }

      translatedClauses.push(transferred);

      const surface = this._generateSurface(transferred);
      const gloss = this._generateGloss(transferred);
      glossParts.push(`[${clause.type.toUpperCase()}] ${gloss}`);
    }

    // Combine all clauses
    const allWords = translatedClauses.flatMap(t => t.words);
    const combinedStructure = {
      words: allWords,
      wordOrder: this.morphology.wordOrder.basic,
      clauses: translatedClauses,
    };

    return {
      english: clauses.map(c => c.text).join(' '),
      target: allWords.map(w => w.surface).join(' '),
      gloss: glossParts.join('\n'),
      structure: combinedStructure,
      parsed: clauses.map(c => this._parseEnglish(c.text)),
      isCompound: true,
    };
  }

  /**
   * Lookup a conjunction in the lexicon
   */
  _lookupConjunction(conj) {
    // Try direct lookup
    let entry = this.lexicon?.lookup?.(conj);
    if (entry) return entry;

    // Try mapped conjunction
    const mapped = this.coordinatingConj[conj] || this.subordinatingConj[conj];
    if (mapped && mapped !== conj) {
      entry = this.lexicon?.lookup?.(mapped);
      if (entry) return entry;
    }

    // Generate a transliterated form for unknown conjunction
    return { lemma: this._generateUnknownWord(conj), gloss: conj };
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
    // Remove sentence-ending punctuation and commas, lowercase, strip residual special chars
    const sentence = english.replace(/[.!?]/g, '').replace(/,/g, ' ').toLowerCase().trim();
    const words = sentence.split(/\s+/).filter(w => w.length > 0);

    const parsed = {
      original: english,
      words,
      tokens: [], // Tokenized with word types
      subject: null,
      verb: null,
      object: null,
      indirectObject: null,
      agent: null, // For passive: "by X"
      prepPhrases: [],
      adjectives: [],
      adverbs: [],
      degreeAdverbs: [], // very, extremely, etc.
      timeExpressions: [], // yesterday, today, etc.
      modal: null, // can, could, may, etc.
      tense: 'present',
      aspect: 'simple',
      mood: 'indicative',
      negated: false,
      isQuestion: english.includes('?'),
      isImperative: false,
      passive: false,
      comparative: null, // bigger, more beautiful
      superlative: null, // biggest, most beautiful
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

    // Detect passive voice
    this._detectPassive(parsed);

    // Extract components
    this._extractComponents(parsed);

    return parsed;
  }

  /**
   * Detect passive voice constructions
   * Patterns: was/were + PP, is/are being + PP, has/have been + PP
   */
  _detectPassive(parsed) {
    const tokens = parsed.tokens;
    for (let i = 0; i < tokens.length - 1; i++) {
      // Look for passive markers followed by past participle
      if (tokens[i].type === 'auxiliary' && tokens[i].passiveMarker) {
        // Check if followed by a verb with past participle form
        for (let j = i + 1; j < tokens.length && j < i + 3; j++) {
          if (tokens[j].type === 'verb' && tokens[j].pastParticiple) {
            parsed.passive = true;
            // Look for "by" agent
            for (let k = j + 1; k < tokens.length; k++) {
              if (tokens[k].word === 'by') {
                parsed.hasAgent = true;
                break;
              }
            }
            return;
          }
        }
      }
    }
  }

  _tokenize(parsed, words) {
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const token = { word, index: i, type: 'unknown' };

      // Handle POSS marker from possessive pre-processing
      if (word === 'poss') {
        token.type = 'possessive_marker';
        parsed.tokens.push(token);
        continue;
      }

      // Skip commas (used as clause/list separators)
      if (word === ',' || word === '') {
        continue;
      }

      // Check word type (order matters - more specific checks first)
      if (this._isReflexive(word)) {
        token.type = 'reflexive';
        token.reflexiveInfo = this.reflexivePronouns[word];
      } else if (this._isPronoun(word)) {
        token.type = 'pronoun';
        token.person = this._getPersonNumber(word);
      } else if (this._isArticle(word)) {
        token.type = 'article';
      } else if (this._isPossessive(word)) {
        token.type = 'possessive';
      } else if (this._isModal(word)) {
        token.type = 'modal';
        token.modalInfo = this.modalVerbs[word];
      } else if (this._isComparative(word)) {
        token.type = 'comparative';
        token.compInfo = this._getComparativeInfo(word);
      } else if (this._isDegreeAdverb(word)) {
        token.type = 'degree';
        token.degreeType = this.degreeAdverbs[word];
      } else if (this._isTimeExpression(word)) {
        token.type = 'time';
        token.timeInfo = this.timeExpressions[word];
      } else if (this._isPreposition(word)) {
        token.type = 'preposition';
      } else if (this._isAuxiliary(word)) {
        token.type = 'auxiliary';
        // Check for passive markers
        if (this.passiveMarkers.includes(word)) {
          token.passiveMarker = true;
        }
      } else if (this._isVerb(word)) {
        token.type = 'verb';
        token.base = this._getVerbBase(word);
        // Check if past participle (for passive)
        if (this._isPastParticiple(word)) {
          token.pastParticiple = true;
        }
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

  _isReflexive(word) {
    return word in this.reflexivePronouns;
  }

  _isModal(word) {
    return word in this.modalVerbs;
  }

  _isComparative(word) {
    if (word in this.comparativeWords) return true;
    // Check for regular -er/-est endings
    if (word.endsWith('er') || word.endsWith('est')) {
      const base = word.endsWith('est') ? word.slice(0, -3) : word.slice(0, -2);
      // Check if base is an adjective
      if (this._isAdjective(base) || this._isAdjective(base + 'e')) return true;
    }
    return false;
  }

  _getComparativeInfo(word) {
    if (this.comparativeWords[word]) {
      const info = this.comparativeWords[word];
      if (typeof info === 'string') {
        return { type: info, base: null };
      }
      return { type: info.form, base: info.base };
    }
    // Regular -er/-est
    if (word.endsWith('est')) {
      let base = word.slice(0, -3);
      if (this._isAdjective(base + 'e')) base = base + 'e';
      return { type: 'SUPL', base };
    }
    if (word.endsWith('er')) {
      let base = word.slice(0, -2);
      if (this._isAdjective(base + 'e')) base = base + 'e';
      return { type: 'COMP', base };
    }
    return { type: 'COMP', base: word };
  }

  _isDegreeAdverb(word) {
    return word in this.degreeAdverbs;
  }

  _isTimeExpression(word) {
    return word in this.timeExpressions;
  }

  _isPastParticiple(word) {
    // Check irregular past participles
    const irregularPP = ['seen', 'eaten', 'drunk', 'given', 'taken', 'made', 'known',
      'thought', 'gone', 'come', 'done', 'been', 'had', 'written', 'spoken', 'broken',
      'chosen', 'frozen', 'stolen', 'worn', 'torn', 'born', 'sworn', 'grown', 'thrown',
      'shown', 'drawn', 'flown', 'blown', 'driven', 'ridden', 'risen', 'hidden', 'bitten',
      'beaten', 'forgotten', 'gotten', 'fallen', 'shaken', 'taken', 'woken', 'begun', 'sung', 'rung'];
    if (irregularPP.includes(word)) return true;
    // Regular past participles end in -ed
    if (word.endsWith('ed')) return true;
    return false;
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

    // Collect time expressions at beginning
    while (i < tokens.length && tokens[i]?.type === 'time') {
      parsed.timeExpressions.push({
        word: tokens[i].word,
        info: tokens[i].timeInfo,
      });
      i++;
    }

    // Skip auxiliary at start of questions
    if (parsed.isQuestion && tokens[i]?.type === 'auxiliary') {
      i++;
    }

    // Extract subject (may be coordinated NP)
    const subjectResult = this._extractCoordinatedNP(tokens, i);
    if (subjectResult.np) {
      parsed.subject = subjectResult.np;
      i = subjectResult.endIndex;

      // Set person/number from subject
      if (subjectResult.np.type === 'pronoun') {
        const pn = this._getPersonNumber(subjectResult.np.word);
        parsed.subjectPerson = pn.person;
        parsed.subjectNumber = pn.number;
      } else if (subjectResult.np.type === 'coordinated') {
        // Coordinated NPs are plural
        parsed.subjectPerson = 3;
        parsed.subjectNumber = 'PL';
      } else {
        parsed.subjectPerson = 3;
        parsed.subjectNumber = subjectResult.np.plural ? 'PL' : 'SG';
      }
    }

    // Collect modals, negation, auxiliaries, degree adverbs before verb
    while (i < tokens.length &&
           (tokens[i].type === 'negation' || tokens[i].type === 'auxiliary' ||
            tokens[i].type === 'adverb' || tokens[i].type === 'modal' ||
            tokens[i].type === 'degree' || tokens[i].type === 'time')) {
      if (tokens[i].type === 'adverb') {
        parsed.adverbs.push(tokens[i].word);
      } else if (tokens[i].type === 'modal') {
        parsed.modal = {
          word: tokens[i].word,
          info: tokens[i].modalInfo,
        };
      } else if (tokens[i].type === 'degree') {
        parsed.degreeAdverbs.push({
          word: tokens[i].word,
          type: tokens[i].degreeType,
        });
      } else if (tokens[i].type === 'time') {
        parsed.timeExpressions.push({
          word: tokens[i].word,
          info: tokens[i].timeInfo,
        });
      }
      i++;
    }

    // Extract verb
    if (tokens[i]?.type === 'verb') {
      parsed.verb = {
        word: tokens[i].base || this._getVerbBase(tokens[i].word),
        original: tokens[i].word,
        pastParticiple: tokens[i].pastParticiple,
      };
      i++;

      // Check for infinitive phrase (wants to go, has to eat)
      if (tokens[i]?.word === 'to' && tokens[i + 1]?.type === 'verb') {
        parsed.infinitivePhrase = {
          marker: 'to',
          verb: this._getVerbBase(tokens[i + 1].word),
          original: tokens[i + 1].word,
        };
        i += 2;
      }
    }

    // Skip negation after verb
    while (i < tokens.length && tokens[i].type === 'negation') {
      i++;
    }

    // Check for adverbs, degree adverbs, comparative after verb
    while (i < tokens.length &&
           (tokens[i].type === 'adverb' || tokens[i].type === 'degree' ||
            tokens[i].type === 'comparative' || tokens[i].type === 'time')) {
      if (tokens[i].type === 'adverb') {
        parsed.adverbs.push(tokens[i].word);
      } else if (tokens[i].type === 'degree') {
        parsed.degreeAdverbs.push({
          word: tokens[i].word,
          type: tokens[i].degreeType,
        });
      } else if (tokens[i].type === 'comparative') {
        parsed.comparative = tokens[i].compInfo;
      } else if (tokens[i].type === 'time') {
        parsed.timeExpressions.push({
          word: tokens[i].word,
          info: tokens[i].timeInfo,
        });
      }
      i++;
    }

    // Extract object(s) and prepositional phrases
    while (i < tokens.length) {
      // Skip conjunctions at this level (they're handled in clause splitting)
      if (tokens[i].type === 'conjunction') {
        i++;
        continue;
      }

      // Handle reflexive pronouns (myself, himself, etc.)
      if (tokens[i].type === 'reflexive') {
        parsed.reflexive = {
          word: tokens[i].word,
          info: tokens[i].reflexiveInfo,
        };
        i++;
        continue;
      }

      // Handle comparative words (more, less, bigger)
      if (tokens[i].type === 'comparative') {
        parsed.comparative = tokens[i].compInfo;
        i++;
        continue;
      }

      // Handle degree adverbs (very, extremely)
      if (tokens[i].type === 'degree') {
        parsed.degreeAdverbs.push({
          word: tokens[i].word,
          type: tokens[i].degreeType,
        });
        i++;
        continue;
      }

      // Handle time expressions
      if (tokens[i].type === 'time') {
        parsed.timeExpressions.push({
          word: tokens[i].word,
          info: tokens[i].timeInfo,
        });
        i++;
        continue;
      }

      // Check for preposition
      if (tokens[i].type === 'preposition') {
        const prep = tokens[i].word;
        i++;

        // Special handling for passive "by" agent
        if (prep === 'by' && parsed.passive) {
          const agentResult = this._extractCoordinatedNP(tokens, i);
          if (agentResult.np) {
            parsed.agent = agentResult.np;
            i = agentResult.endIndex;
            continue;
          }
        }

        const ppResult = this._extractCoordinatedNP(tokens, i);
        if (ppResult.np) {
          parsed.prepPhrases.push({ prep, np: ppResult.np });
          i = ppResult.endIndex;
        }
        continue;
      }

      // Check for infinitive without main verb having it
      if (tokens[i]?.word === 'to' && tokens[i + 1]?.type === 'verb' && !parsed.infinitivePhrase) {
        parsed.infinitivePhrase = {
          marker: 'to',
          verb: this._getVerbBase(tokens[i + 1].word),
          original: tokens[i + 1].word,
        };
        i += 2;
        continue;
      }

      // Try to extract noun phrase as object (may be coordinated)
      const objResult = this._extractCoordinatedNP(tokens, i);
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

  /**
   * Extract a potentially coordinated NP (the man and the woman)
   */
  _extractCoordinatedNP(tokens, startIndex) {
    const firstResult = this._extractNounPhrase(tokens, startIndex);
    if (!firstResult.np) {
      return { np: null, endIndex: startIndex };
    }

    let i = firstResult.endIndex;
    const nps = [firstResult.np];
    let lastConj = null;

    // Check for coordination
    while (i < tokens.length && tokens[i].type === 'conjunction') {
      const conj = tokens[i].word;
      if (['and', 'or'].includes(conj)) {
        lastConj = conj;
        i++;
        const nextResult = this._extractNounPhrase(tokens, i);
        if (nextResult.np) {
          nps.push(nextResult.np);
          i = nextResult.endIndex;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (nps.length === 1) {
      return firstResult;
    }

    // Return coordinated NP
    return {
      np: {
        type: 'coordinated',
        nps: nps,
        conjunction: lastConj || 'and',
        plural: true, // Coordinated NPs are treated as plural
      },
      endIndex: i,
    };
  }

  _extractNounPhrase(tokens, startIndex) {
    let i = startIndex;
    if (i >= tokens.length) return { np: null, endIndex: i };

    const np = {
      type: 'np',
      determiner: null,
      possessive: null,
      possessorNP: null, // For noun possessives: "the king's sword"
      adjectives: [],
      noun: null,
      plural: false,
    };

    // Check for pronoun
    if (tokens[i].type === 'pronoun') {
      // Check if pronoun is followed by POSS marker (not a pronoun possessive like "my")
      if (i + 1 < tokens.length && tokens[i + 1].type === 'possessive_marker') {
        np.possessorNP = {
          type: 'pronoun',
          word: tokens[i].word,
          person: tokens[i].person,
        };
        i += 2; // Skip pronoun + POSS
        // Continue to parse the rest of the NP (the possessed noun)
      } else {
        return {
          np: {
            type: 'pronoun',
            word: tokens[i].word,
            person: tokens[i].person,
          },
          endIndex: i + 1,
        };
      }
    }

    // Check for possessive pronoun (my, your, his, etc.)
    if (i < tokens.length && tokens[i].type === 'possessive') {
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

    // Check for noun + POSS marker (the king POSS sword)
    if (i < tokens.length && (tokens[i].type === 'noun' || tokens[i].type === 'unknown')) {
      const nounWord = tokens[i].singular || tokens[i].word;
      const nounPlural = tokens[i].plural || false;

      // Check if this noun is followed by POSS marker
      if (i + 1 < tokens.length && tokens[i + 1].type === 'possessive_marker') {
        // This is a possessor NP
        np.possessorNP = {
          type: 'np',
          determiner: np.determiner,
          adjectives: [...np.adjectives],
          noun: nounWord,
          plural: nounPlural,
        };
        np.determiner = null;
        np.adjectives = [];
        i += 2; // Skip noun + POSS

        // Now parse the possessed noun phrase
        // Collect adjectives for possessed noun
        while (i < tokens.length && tokens[i].type === 'adjective') {
          np.adjectives.push(tokens[i].word);
          i++;
        }

        // Get the possessed noun
        if (i < tokens.length && (tokens[i].type === 'noun' || tokens[i].type === 'unknown')) {
          np.noun = tokens[i].singular || tokens[i].word;
          np.plural = tokens[i].plural || false;
          i++;
          return { np, endIndex: i };
        }

        // Even if we can't find a noun, return what we have
        if (np.possessorNP) {
          return { np, endIndex: i };
        }
      }

      // Normal noun (no possessive)
      np.noun = nounWord;
      np.plural = nounPlural;
      i++;
      return { np, endIndex: i };
    }

    // If we got a determiner/possessive but no noun, might be incomplete
    if (np.determiner || np.possessive || np.adjectives.length > 0 || np.possessorNP) {
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
    let infinitive = null;
    let agent = null; // For passive voice
    const extras = [];
    const prefixes = []; // Time expressions, etc. at beginning

    // Time expressions (yesterday, today, etc.)
    for (const time of parsed.timeExpressions || []) {
      const timeWord = this._transferTimeExpression(time);
      if (timeWord) prefixes.push(timeWord);
    }

    // Subject (in passive voice, this is actually the patient)
    if (parsed.subject) {
      subject = this._transferNP(parsed.subject, parsed.passive ? 'object' : 'subject', parsed);
    }

    // Modal verb (can, could, may, etc.)
    let modalWord = null;
    if (parsed.modal) {
      modalWord = this._transferModal(parsed.modal);
    }

    // Degree adverbs before verb (very, extremely)
    for (const degree of parsed.degreeAdverbs || []) {
      const degreeWord = this._transferDegree(degree);
      if (degreeWord) extras.push(degreeWord);
    }

    // Verb
    if (parsed.verb) {
      verb = this._transferVerb(parsed.verb, parsed);
    }

    // Infinitive phrase (wants TO GO)
    if (parsed.infinitivePhrase) {
      infinitive = this._transferInfinitive(parsed.infinitivePhrase, parsed);
    }

    // Object
    if (parsed.object) {
      object = this._transferNP(parsed.object, 'object', parsed);
    }

    // Indirect object
    if (parsed.indirectObject) {
      indirect = this._transferNP(parsed.indirectObject, 'indirect', parsed);
    }

    // Passive voice agent (by X)
    if (parsed.agent) {
      agent = this._transferNP(parsed.agent, parsed.passive ? 'subject' : 'agent', parsed);
    }

    // Reflexive pronoun
    if (parsed.reflexive) {
      const reflexWord = this._transferReflexive(parsed.reflexive);
      if (reflexWord) extras.push(reflexWord);
    }

    // Comparative/superlative
    if (parsed.comparative) {
      const compWord = this._transferComparative(parsed.comparative);
      if (compWord) extras.push(compWord);
    }

    // Prepositional phrases
    for (const pp of parsed.prepPhrases) {
      const ppWords = this._transferPP(pp, parsed);
      extras.push(...ppWords);
    }

    // Negation particle - position varies by language type
    let negWord = null;
    if (parsed.negated) {
      const negEntry = this.lexicon?.lookup?.('not');
      if (negEntry) {
        negWord = {
          surface: negEntry.lemma,
          gloss: 'NEG',
          morphemes: [negEntry.lemma],
          glosses: ['NEG'],
        };
      }
    }

    // Add time expression prefixes
    transferred.words.push(...prefixes);

    // Apply word order
    const order = this.morphology.wordOrder.basic;
    const components = { S: subject, V: verb, O: object };

    // For passive voice in some languages, swap S and agent
    if (parsed.passive && agent) {
      // In ergative languages or when explicit, agent becomes subject
      // For now, put agent before verb as typical for active rephrasing
    }

    // Add modal before verb
    for (const position of order.split('')) {
      if (position === 'V') {
        if (modalWord) transferred.words.push(modalWord);
        if (negWord) transferred.words.push(negWord);
      }
      if (components[position]) {
        if (Array.isArray(components[position])) {
          transferred.words.push(...components[position]);
        } else {
          transferred.words.push(components[position]);
        }
      }
    }

    // Add infinitive phrase after main verb
    if (infinitive) {
      transferred.words.push(...infinitive);
    }

    // Add agent for passive
    if (agent) {
      // Add "by" equivalent
      const byEntry = this.lexicon?.lookup?.('by') || this.lexicon?.lookup?.('from');
      if (byEntry) {
        transferred.words.push({
          surface: byEntry.lemma,
          gloss: 'AGENT',
          morphemes: [byEntry.lemma],
          glosses: ['AGENT'],
        });
      }
      transferred.words.push(...(Array.isArray(agent) ? agent : [agent]));
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

    // Handle coordinated NP ("the man and the woman")
    if (np.type === 'coordinated') {
      return this._transferCoordinatedNP(np, role, parsed);
    }

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
        // Generate transliterated form for unknown pronoun
        const generated = this._generateUnknownWord(np.word);
        words.push({
          surface: generated,
          gloss: np.word.toUpperCase(),
          morphemes: [generated],
          glosses: [np.word.toUpperCase()],
        });
      }
      return words;
    }

    // Handle full NP
    const adjPosition = this.morphology.wordOrder.adjectivePosition;

    // Possessive pronoun (my, your, his, etc.)
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

    // Noun possessor (the king's sword → king-GEN sword)
    if (np.possessorNP) {
      const possessorWords = this._transferNP(np.possessorNP, 'possessive', parsed);
      words.push(...(Array.isArray(possessorWords) ? possessorWords : [possessorWords]));
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
          // Generate transliterated form for unknown adjective
          const generated = this._generateUnknownWord(adj);
          words.push({
            surface: generated,
            gloss: adj,
            morphemes: [generated],
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
        // Generate transliterated form for unknown noun with morphology
        let generated = this._generateUnknownWord(np.noun);
        const morphemes = [generated];
        const glosses = [np.noun];

        // Apply number suffix
        if (numberToUse?.suffix && np.plural) {
          generated += numberToUse.suffix;
          morphemes.push(numberToUse.suffix);
          glosses.push(numberToUse.abbr);
        }

        // Apply case suffix
        if (caseToUse?.suffix) {
          generated += caseToUse.suffix;
          morphemes.push(caseToUse.suffix);
          glosses.push(caseToUse.abbr);
        }

        words.push({
          surface: generated,
          gloss: glosses.join('-'),
          morphemes,
          glosses,
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

  /**
   * Transfer a coordinated NP (the man and the woman)
   */
  _transferCoordinatedNP(np, role, parsed) {
    const allWords = [];

    for (let i = 0; i < np.nps.length; i++) {
      // Add conjunction before all but first NP
      if (i > 0) {
        const conjEntry = this._lookupConjunction(np.conjunction);
        if (conjEntry) {
          allWords.push({
            surface: conjEntry.lemma,
            gloss: np.conjunction.toUpperCase(),
            morphemes: [conjEntry.lemma],
            glosses: [np.conjunction.toUpperCase()],
          });
        }
      }

      // Transfer each NP in the coordination
      const npWords = this._transferNP(np.nps[i], role, parsed);
      if (Array.isArray(npWords)) {
        allWords.push(...npWords);
      } else if (npWords) {
        allWords.push(npWords);
      }
    }

    return allWords;
  }

  /**
   * Transfer an infinitive phrase (to go, to eat)
   */
  _transferInfinitive(infinitive, parsed) {
    const words = [];

    // Look for infinitive marker in lexicon
    const toEntry = this.lexicon?.lookup?.('to');
    if (toEntry) {
      words.push({
        surface: toEntry.lemma,
        gloss: 'INF',
        morphemes: [toEntry.lemma],
        glosses: ['INF'],
      });
    }

    // Get the infinitive verb
    const verbEntry = this.lexicon?.lookup?.(infinitive.verb);
    if (verbEntry) {
      let surface = verbEntry.lemma;
      const morphemes = [verbEntry.lemma];
      const glosses = [infinitive.verb];

      // Some languages mark infinitives morphologically
      // For now, use the bare form

      words.push({
        surface,
        gloss: glosses.join('-'),
        morphemes,
        glosses,
      });
    } else {
      // Generate transliterated form for unknown infinitive verb
      const generated = this._generateUnknownWord(infinitive.verb);
      words.push({
        surface: generated,
        gloss: infinitive.verb,
        morphemes: [generated],
        glosses: [infinitive.verb],
      });
    }

    return words;
  }

  _lookupPronoun(pronoun) {
    const key = this.pronounMappings[pronoun.toLowerCase()] || pronoun;
    return this.lexicon?.lookup?.(key);
  }

  _transferVerb(verb, parsed) {
    const entry = this.lexicon?.lookup?.(verb.word);

    // Generate base form - either from lexicon or transliterated
    let surface = entry ? entry.lemma : this._generateUnknownWord(verb.word);
    const morphemes = [surface];
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
   * Transfer a modal verb (can, could, may, etc.)
   */
  _transferModal(modal) {
    const entry = this.lexicon?.lookup?.(modal.word);
    if (entry) {
      return {
        surface: entry.lemma,
        gloss: modal.word.toUpperCase(),
        morphemes: [entry.lemma],
        glosses: [modal.word.toUpperCase()],
      };
    }
    // Generate a form based on the modal type
    return {
      surface: this._generateUnknownWord(modal.word),
      gloss: modal.word.toUpperCase(),
      morphemes: [modal.word],
      glosses: [modal.word.toUpperCase()],
    };
  }

  /**
   * Transfer a time expression (yesterday, today, etc.)
   */
  _transferTimeExpression(time) {
    const entry = this.lexicon?.lookup?.(time.word);
    if (entry) {
      return {
        surface: entry.lemma,
        gloss: time.word.toUpperCase(),
        morphemes: [entry.lemma],
        glosses: [time.word.toUpperCase()],
      };
    }
    return {
      surface: this._generateUnknownWord(time.word),
      gloss: time.word.toUpperCase(),
      morphemes: [time.word],
      glosses: [time.word.toUpperCase()],
    };
  }

  /**
   * Transfer a degree adverb (very, extremely, etc.)
   */
  _transferDegree(degree) {
    const entry = this.lexicon?.lookup?.(degree.word);
    if (entry) {
      return {
        surface: entry.lemma,
        gloss: degree.type,
        morphemes: [entry.lemma],
        glosses: [degree.type],
      };
    }
    return {
      surface: this._generateUnknownWord(degree.word),
      gloss: degree.type,
      morphemes: [degree.word],
      glosses: [degree.type],
    };
  }

  /**
   * Transfer a reflexive pronoun (myself, himself, etc.)
   */
  _transferReflexive(reflexive) {
    // Try to find the base pronoun and add reflexive marker
    const entry = this.lexicon?.lookup?.(reflexive.info.base);
    if (entry) {
      let surface = entry.lemma;
      const morphemes = [entry.lemma];
      const glosses = [reflexive.info.base.toUpperCase()];

      // Add reflexive suffix if the language has one
      // For now, just use the pronoun
      return {
        surface,
        gloss: glosses.join('-') + '.REFL',
        morphemes,
        glosses: [...glosses, 'REFL'],
      };
    }
    return {
      surface: this._generateUnknownWord(reflexive.word),
      gloss: reflexive.word.toUpperCase(),
      morphemes: [reflexive.word],
      glosses: [reflexive.word.toUpperCase()],
    };
  }

  /**
   * Transfer comparative/superlative (bigger, biggest, more beautiful)
   */
  _transferComparative(comp) {
    const words = [];

    // If we have a base adjective, translate it
    if (comp.base) {
      const entry = this.lexicon?.lookup?.(comp.base);
      if (entry) {
        words.push({
          surface: entry.lemma,
          gloss: `${comp.base}-${comp.type}`,
          morphemes: [entry.lemma],
          glosses: [comp.base, comp.type],
        });
      } else {
        words.push({
          surface: this._generateUnknownWord(comp.base),
          gloss: `${comp.base}-${comp.type}`,
          morphemes: [comp.base],
          glosses: [comp.base, comp.type],
        });
      }
    } else {
      // Just the comparative marker (more, less, most, least)
      words.push({
        surface: this._generateUnknownWord(comp.type.toLowerCase()),
        gloss: comp.type,
        morphemes: [comp.type.toLowerCase()],
        glosses: [comp.type],
      });
    }

    return words.length === 1 ? words[0] : words;
  }

  /**
   * Generate a phonologically-plausible form for unknown words
   * Uses semantic decomposition (calques), caching, and phonological adaptation
   */
  _generateUnknownWord(englishWord) {
    // Check cache first for consistency
    const cacheKey = englishWord.toLowerCase();
    if (this._unknownWordCache.has(cacheKey)) {
      return this._unknownWordCache.get(cacheKey);
    }

    let result;

    // 1. Check if it's an acronym (ALL CAPS, 2+ letters)
    if (/^[A-Z]{2,}[0-9]*$/.test(englishWord)) {
      result = this._handleAcronym(englishWord);
    }
    // 2. Check if it's a proper noun (starts with capital, rest lowercase)
    else if (/^[A-Z][a-z]+$/.test(englishWord)) {
      result = this._handleProperNoun(englishWord);
    }
    // 3. Try semantic decomposition (calque)
    else if (this.semanticDecomposition[cacheKey]) {
      result = this._buildCalque(cacheKey);
    }
    // 4. Fall back to phonological transliteration
    else {
      result = this._transliterate(englishWord);
    }

    // Cache the result
    this._unknownWordCache.set(cacheKey, result);
    return result;
  }

  /**
   * Handle acronyms - spell out or adapt phonologically
   */
  _handleAcronym(acronym) {
    // For short acronyms (2-3 letters), spell out each letter
    if (acronym.length <= 3) {
      const letters = acronym.toLowerCase().split('');
      return letters.map(l => this._transliterate(l + 'a')).join('');
    }
    // For longer acronyms, treat as a word and transliterate
    return this._transliterate(acronym);
  }

  /**
   * Handle proper nouns - preserve or adapt minimally
   */
  _handleProperNoun(name) {
    // Proper nouns get light adaptation - just phonological mapping
    return this._transliterate(name);
  }

  /**
   * Build a calque (loan translation) from semantic components
   */
  _buildCalque(word) {
    const components = this.semanticDecomposition[word];
    if (!components || components.length === 0) {
      return this._transliterate(word);
    }

    const parts = [];
    for (const component of components) {
      // Try to find the component in lexicon
      const entry = this.lexicon?.lookup?.(component);
      if (entry) {
        parts.push(entry.lemma);
      } else {
        // Transliterate the component
        parts.push(this._transliterate(component));
      }
    }

    // Join with a connector or just concatenate based on language morphology
    if (this.morphology?.type === 'agglutinative' || this.morphology?.type === 'fusional') {
      return parts.join('');
    } else {
      return parts.join(' ');
    }
  }

  /**
   * Phonologically transliterate a word using the language's sound system
   */
  _transliterate(englishWord) {
    const phonology = this.language.phonology;
    if (!phonology) return englishWord.toLowerCase();

    const consonants = phonology.consonants?.map(c => c.ipa) || ['k', 't', 'p', 'n', 'm', 's'];
    const vowels = phonology.vowels?.map(v => v.ipa) || ['a', 'e', 'i', 'o', 'u'];

    // Map English sounds to available sounds
    const soundMap = this._buildSoundMap(consonants, vowels);

    let result = '';
    const lowerWord = englishWord.toLowerCase();

    for (let i = 0; i < lowerWord.length; i++) {
      const char = lowerWord[i];
      if (soundMap[char]) {
        result += soundMap[char];
      } else if (/[aeiou]/.test(char)) {
        result += vowels[0];
      } else if (/[a-z]/.test(char)) {
        result += consonants[0];
      }
      // Skip non-letter characters
    }

    // Ensure the word follows the language's syllable structure
    result = this._enforcePhonology(result, consonants, vowels);

    return result || englishWord.toLowerCase();
  }

  /**
   * Ensure a transliterated word follows basic phonological constraints
   */
  _enforcePhonology(word, consonants, vowels) {
    if (!word) return word;

    // Break up consonant clusters if the language prefers CV syllables
    const phonotactics = this.language.phonotactics;
    const maxOnset = phonotactics?.syllableStructure?.maxOnset || 2;
    const maxCoda = phonotactics?.syllableStructure?.maxCoda || 1;

    let result = '';
    let consonantRun = 0;

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const isVowel = vowels.includes(char);

      if (isVowel) {
        result += char;
        consonantRun = 0;
      } else {
        consonantRun++;
        if (consonantRun > maxOnset && i < word.length - 1) {
          // Insert a vowel to break up the cluster
          result += vowels[0];
          consonantRun = 1;
        }
        result += char;
      }
    }

    // If word ends in too many consonants, add a vowel
    const endConsonants = (result.match(/[^aeiouɑæəɛɪɔʊ]+$/i) || [''])[0].length;
    if (endConsonants > maxCoda) {
      result += vowels[0];
    }

    return result;
  }

  /**
   * Build a mapping from English sounds to target language sounds
   */
  _buildSoundMap(consonants, vowels) {
    const map = {};

    // Vowels
    const vowelFallbacks = {
      'a': ['a', 'ɑ', 'æ', 'ə'],
      'e': ['e', 'ɛ', 'ə', 'i'],
      'i': ['i', 'ɪ', 'e'],
      'o': ['o', 'ɔ', 'u', 'ə'],
      'u': ['u', 'ʊ', 'o'],
    };

    for (const [eng, candidates] of Object.entries(vowelFallbacks)) {
      for (const cand of candidates) {
        if (vowels.includes(cand)) {
          map[eng] = cand;
          break;
        }
      }
      if (!map[eng]) map[eng] = vowels[0];
    }

    // Consonants
    const consonantFallbacks = {
      'b': ['b', 'p', 'v'],
      'c': ['k', 's', 't'],
      'd': ['d', 't', 'n'],
      'f': ['f', 'p', 'v'],
      'g': ['g', 'k', 'ɡ'],
      'h': ['h', 'x', 'ʔ'],
      'j': ['dʒ', 'j', 'ʒ'],
      'k': ['k', 'g', 'q'],
      'l': ['l', 'r', 'n'],
      'm': ['m', 'n', 'b'],
      'n': ['n', 'm', 'ŋ'],
      'p': ['p', 'b', 'f'],
      'q': ['k', 'q', 'g'],
      'r': ['r', 'l', 'ɾ'],
      's': ['s', 'z', 'ʃ'],
      't': ['t', 'd', 'k'],
      'v': ['v', 'f', 'b'],
      'w': ['w', 'v', 'u'],
      'x': ['ks', 'k', 's'],
      'y': ['j', 'i', 'ʝ'],
      'z': ['z', 's', 'dz'],
    };

    for (const [eng, candidates] of Object.entries(consonantFallbacks)) {
      for (const cand of candidates) {
        if (consonants.includes(cand)) {
          map[eng] = cand;
          break;
        }
      }
      if (!map[eng]) map[eng] = consonants[0];
    }

    return map;
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
   * Now includes compound sentences, subordinate clauses, and complex structures
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

      // Complex with adjectives
      'The wise king gave the sword to the warrior.',
      'My father built the house.',
      'The big fire burned the old tree.',

      // COMPOUND SENTENCES (new)
      'The man works and the woman sings.',
      'The child ran but the dog slept.',
      'I see the sun and you see the moon.',

      // COORDINATED NPs (new)
      'The man and the woman see the star.',
      'The king gave gold and silver to the people.',
      'I love my father and my mother.',

      // SUBORDINATE CLAUSES (new)
      'The man sleeps because he is tired.',
      'When the sun rises the birds sing.',
      'If you go I will follow.',

      // INFINITIVE PHRASES (new)
      'The man wants to eat.',
      'She needs to sleep.',
      'We have to go to the mountain.',

      // LONGER COMPLEX SENTENCES
      'The old king gave the sword to the young warrior and the warrior fought the enemy.',
      'I think that the woman knows the truth.',
      'The bird flew from the tree because the cat came.',

      // POSSESSIVES
      "The king's sword is big.",
      "My mother's house is old.",

      // CONTRACTIONS (preprocessed to full forms)
      "I don't see the enemy.",
      "She can't sleep.",

      // NUMBERS
      'The man has three children.',
      'I see five birds in the tree.',

      // MULTI-SENTENCE / PARAGRAPH
      'The man sleeps. The woman eats. The child drinks water.',
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
