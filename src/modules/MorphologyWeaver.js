/**
 * GLOSSOPETRAE - Morphology Weaver Module
 *
 * Generates complete morphological systems including:
 * - Nominal morphology (case, number, gender/class)
 * - Verbal morphology (tense, aspect, mood, agreement)
 * - Derivational morphology (word formation)
 */

export class MorphologyWeaver {
  constructor(random, syllableForge, config = {}) {
    this.random = random;
    this.syllableForge = syllableForge;
    this.config = {
      morphType: config.morphType || this._selectMorphType(),
      caseCount: config.caseCount ?? null,
      nounClasses: config.nounClasses ?? null,
      verbAgreement: config.verbAgreement ?? true,
      ...config,
    };

    this.generatedAffixes = new Set();
  }

  generate() {
    const morphType = this.config.morphType;
    const nominal = this._generateNominalMorphology();
    const verbal = this._generateVerbalMorphology();
    const derivational = this._generateDerivationalMorphology();
    const wordOrder = this._selectWordOrder();
    const alignment = nominal.caseSystem.alignment;

    return {
      type: morphType,
      typeDescription: this._describeMorphType(morphType),
      wordOrder,
      alignment,
      nominal,
      verbal,
      derivational,
      adpositions: this._generateAdpositions(),
    };
  }

  _selectMorphType() {
    // Weight toward agglutinative for LLM learnability
    return this.random.weightedPick([
      ['isolating', 0.15],
      ['agglutinative', 0.50],
      ['fusional', 0.25],
      ['polysynthetic', 0.10],
    ]);
  }

  _describeMorphType(type) {
    const descriptions = {
      isolating: 'Isolating (one morpheme per word, like Mandarin)',
      agglutinative: 'Agglutinative (clear morpheme boundaries, like Turkish)',
      fusional: 'Fusional (morphemes blend together, like Latin)',
      polysynthetic: 'Polysynthetic (complex words encode full sentences, like Mohawk)',
    };
    return descriptions[type] || 'Unknown type';
  }

  _selectWordOrder() {
    // Word order distribution (roughly based on WALS)
    const order = this.random.weightedPick([
      ['SOV', 0.40],  // Most common (Japanese, Korean, Turkish)
      ['SVO', 0.35],  // Common (English, Mandarin)
      ['VSO', 0.10],  // Less common (Arabic, Irish)
      ['VOS', 0.05],  // Rare (Malagasy)
      ['OVS', 0.05],  // Rare
      ['OSV', 0.05],  // Very rare
    ]);

    return {
      basic: order,
      description: this._describeWordOrder(order),
      adjectivePosition: this.random.weightedPick([['before', 0.45], ['after', 0.55]]),
      genitivePosition: this.random.weightedPick([['before', 0.50], ['after', 0.50]]),
      adpositionType: order.startsWith('SO') || order.startsWith('OS')
        ? this.random.weightedPick([['postposition', 0.7], ['preposition', 0.3]])
        : this.random.weightedPick([['preposition', 0.7], ['postposition', 0.3]]),
    };
  }

  _describeWordOrder(order) {
    const descriptions = {
      SOV: 'Subject-Object-Verb (e.g., "The cat the mouse saw")',
      SVO: 'Subject-Verb-Object (e.g., "The cat saw the mouse")',
      VSO: 'Verb-Subject-Object (e.g., "Saw the cat the mouse")',
      VOS: 'Verb-Object-Subject (e.g., "Saw the mouse the cat")',
      OVS: 'Object-Verb-Subject (e.g., "The mouse saw the cat")',
      OSV: 'Object-Subject-Verb (e.g., "The mouse the cat saw")',
    };
    return descriptions[order];
  }

  _generateNominalMorphology() {
    const caseSystem = this._generateCaseSystem();
    const numberSystem = this._generateNumberSystem();
    const nounClasses = this._generateNounClasses();
    const definiteness = this._generateDefiniteness();

    return {
      caseSystem,
      numberSystem,
      nounClasses,
      definiteness,
      affixes: this._generateNominalAffixes(caseSystem, numberSystem, nounClasses, definiteness),
    };
  }

  _generateCaseSystem() {
    // Determine number of cases
    const numCases = this.config.caseCount ?? this.random.weightedPick([
      [0, 0.15],   // No case (like English)
      [2, 0.20],   // Minimal (NOM/ACC or ERG/ABS)
      [4, 0.25],   // Moderate (NOM, ACC, GEN, DAT)
      [6, 0.20],   // Rich (+ LOC, INS)
      [8, 0.12],   // Complex (+ ABL, ALL)
      [12, 0.08],  // Very complex (Finnish-like)
    ]);

    if (numCases === 0) {
      return {
        alignment: 'neutral',
        cases: [],
        description: 'No grammatical case marking',
      };
    }

    // Select alignment
    const alignment = this.random.weightedPick([
      ['nominative-accusative', 0.70],
      ['ergative-absolutive', 0.20],
      ['active-stative', 0.10],
    ]);

    // Generate core cases based on alignment
    let cases = [];
    if (alignment === 'nominative-accusative') {
      cases = [
        { name: 'nominative', abbr: 'NOM', function: 'subject of verb' },
        { name: 'accusative', abbr: 'ACC', function: 'direct object' },
      ];
    } else if (alignment === 'ergative-absolutive') {
      cases = [
        { name: 'ergative', abbr: 'ERG', function: 'agent of transitive' },
        { name: 'absolutive', abbr: 'ABS', function: 'patient/intransitive subject' },
      ];
    } else {
      cases = [
        { name: 'agentive', abbr: 'AGT', function: 'agent/active participant' },
        { name: 'patientive', abbr: 'PAT', function: 'patient/inactive participant' },
      ];
    }

    // Add peripheral cases
    const peripheralCases = [
      { name: 'genitive', abbr: 'GEN', function: 'possession' },
      { name: 'dative', abbr: 'DAT', function: 'indirect object/recipient' },
      { name: 'locative', abbr: 'LOC', function: 'location' },
      { name: 'instrumental', abbr: 'INS', function: 'means/instrument' },
      { name: 'ablative', abbr: 'ABL', function: 'source/movement from' },
      { name: 'allative', abbr: 'ALL', function: 'goal/movement toward' },
      { name: 'comitative', abbr: 'COM', function: 'accompaniment' },
      { name: 'vocative', abbr: 'VOC', function: 'direct address' },
      { name: 'benefactive', abbr: 'BEN', function: 'beneficiary' },
      { name: 'causative', abbr: 'CAU', function: 'cause/reason' },
    ];

    const numPeripheral = numCases - cases.length;
    const selected = this.random.sample(peripheralCases, Math.min(numPeripheral, peripheralCases.length));
    cases.push(...selected);

    // Generate affixes for each case
    for (const c of cases) {
      c.suffix = this._generateAffix('suffix');
    }

    return {
      alignment,
      cases,
      description: `${cases.length}-case ${alignment} system`,
    };
  }

  _generateNumberSystem() {
    // Most languages have at least singular/plural
    const numDistinctions = this.random.weightedPick([
      [2, 0.70],  // Singular/Plural
      [3, 0.20],  // Singular/Dual/Plural
      [4, 0.08],  // Singular/Dual/Paucal/Plural
      [1, 0.02],  // No number distinction
    ]);

    const numbers = [];

    if (numDistinctions >= 1) {
      numbers.push({ name: 'singular', abbr: 'SG', suffix: '' });  // Singular often unmarked
    }
    if (numDistinctions >= 2) {
      numbers.push({ name: 'plural', abbr: 'PL', suffix: this._generateAffix('suffix') });
    }
    if (numDistinctions >= 3) {
      numbers.push({ name: 'dual', abbr: 'DU', suffix: this._generateAffix('suffix') });
    }
    if (numDistinctions >= 4) {
      numbers.push({ name: 'paucal', abbr: 'PAU', suffix: this._generateAffix('suffix') });
    }

    return {
      count: numDistinctions,
      categories: numbers,
      description: this._describeNumberSystem(numDistinctions),
    };
  }

  _describeNumberSystem(count) {
    if (count === 1) return 'No number distinction';
    if (count === 2) return 'Singular/Plural distinction';
    if (count === 3) return 'Singular/Dual/Plural distinction';
    if (count === 4) return 'Singular/Dual/Paucal/Plural distinction';
    return `${count}-way number distinction`;
  }

  _generateNounClasses() {
    const hasClasses = this.config.nounClasses ?? this.random.bool(0.35);
    if (!hasClasses) {
      return {
        count: 0,
        classes: [],
        description: 'No noun class/gender system',
      };
    }

    const numClasses = this.random.weightedPick([
      [2, 0.40],   // Masculine/Feminine or Animate/Inanimate
      [3, 0.35],   // M/F/N
      [4, 0.15],   // More complex
      [6, 0.07],   // Bantu-style
      [10, 0.03],  // Very complex
    ]);

    const classTypes = [
      { name: 'Class I', semantic: 'humans/animates', prefix: this._generateAffix('prefix') },
      { name: 'Class II', semantic: 'animals/moving things', prefix: this._generateAffix('prefix') },
      { name: 'Class III', semantic: 'plants/long objects', prefix: this._generateAffix('prefix') },
      { name: 'Class IV', semantic: 'liquids/masses', prefix: this._generateAffix('prefix') },
      { name: 'Class V', semantic: 'small objects', prefix: this._generateAffix('prefix') },
      { name: 'Class VI', semantic: 'abstracts', prefix: this._generateAffix('prefix') },
      { name: 'Class VII', semantic: 'paired objects', prefix: this._generateAffix('prefix') },
      { name: 'Class VIII', semantic: 'tools/instruments', prefix: this._generateAffix('prefix') },
      { name: 'Class IX', semantic: 'locations', prefix: this._generateAffix('prefix') },
      { name: 'Class X', semantic: 'times/events', prefix: this._generateAffix('prefix') },
    ];

    const classes = classTypes.slice(0, numClasses);

    // Rename for smaller systems
    if (numClasses === 2) {
      classes[0].name = this.random.pick(['masculine', 'animate', 'human']);
      classes[1].name = this.random.pick(['feminine', 'inanimate', 'non-human']);
    } else if (numClasses === 3) {
      classes[0].name = 'masculine';
      classes[1].name = 'feminine';
      classes[2].name = 'neuter';
    }

    return {
      count: numClasses,
      classes,
      description: `${numClasses}-class noun system`,
      agreementOn: this.random.sample(['adjectives', 'verbs', 'determiners', 'pronouns'],
                                       this.random.int(1, 3)),
    };
  }

  _generateDefiniteness() {
    const hasArticles = this.random.bool(0.55);
    if (!hasArticles) {
      return {
        hasArticles: false,
        description: 'No article system (definiteness from context)',
      };
    }

    const articleType = this.random.pick(['free', 'suffix', 'prefix']);

    return {
      hasArticles: true,
      type: articleType,
      definite: articleType === 'free'
        ? this._generateWord(1)
        : this._generateAffix(articleType === 'suffix' ? 'suffix' : 'prefix'),
      indefinite: articleType === 'free'
        ? this._generateWord(1)
        : this._generateAffix(articleType === 'suffix' ? 'suffix' : 'prefix'),
      description: `${articleType === 'free' ? 'Free-standing' : articleType.charAt(0).toUpperCase() + articleType.slice(1)} articles`,
    };
  }

  _generateNominalAffixes(caseSystem, numberSystem, nounClasses, definiteness) {
    const template = [];

    // Determine affix order (varies by language)
    const order = this.random.pick([
      ['class', 'root', 'number', 'case'],
      ['root', 'class', 'case', 'number'],
      ['root', 'number', 'case'],
      ['class', 'root', 'case', 'number'],
    ]);

    for (const slot of order) {
      if (slot === 'root') {
        template.push({ position: 'ROOT', type: 'root' });
      } else if (slot === 'case' && caseSystem.cases.length > 0) {
        template.push({ position: 'SUFFIX', type: 'case', values: caseSystem.cases });
      } else if (slot === 'number' && numberSystem.count > 1) {
        template.push({ position: 'SUFFIX', type: 'number', values: numberSystem.categories });
      } else if (slot === 'class' && nounClasses.count > 0) {
        template.push({ position: 'PREFIX', type: 'class', values: nounClasses.classes });
      }
    }

    return {
      template,
      order: order.filter(s => {
        if (s === 'case') return caseSystem.cases.length > 0;
        if (s === 'number') return numberSystem.count > 1;
        if (s === 'class') return nounClasses.count > 0;
        return true;
      }),
    };
  }

  _generateVerbalMorphology() {
    const tenses = this._generateTenseSystem();
    const aspects = this._generateAspectSystem();
    const moods = this._generateMoodSystem();
    const agreement = this._generateAgreementSystem();
    const voices = this._generateVoiceSystem();
    const evidentiality = this.random.bool(0.25) ? this._generateEvidentiality() : null;
    const polarity = this._generatePolarity();

    return {
      tenses,
      aspects,
      moods,
      agreement,
      voices,
      evidentiality,
      polarity,
      template: this._generateVerbTemplate(tenses, aspects, moods, agreement, voices, evidentiality),
    };
  }

  _generateTenseSystem() {
    const numTenses = this.random.weightedPick([
      [0, 0.10],  // No grammatical tense (tenseless)
      [2, 0.35],  // Past/Non-past or Future/Non-future
      [3, 0.40],  // Past/Present/Future
      [5, 0.10],  // + Remote past, near future, etc.
      [7, 0.05],  // Complex temporal system
    ]);

    if (numTenses === 0) {
      return {
        count: 0,
        tenses: [],
        description: 'No grammatical tense (time from context/aspect/adverbs)',
      };
    }

    const tenses = [];

    if (numTenses === 2) {
      const type = this.random.pick(['past/nonpast', 'future/nonfuture']);
      if (type === 'past/nonpast') {
        tenses.push({ name: 'past', abbr: 'PST', suffix: this._generateAffix('suffix') });
        tenses.push({ name: 'non-past', abbr: 'NPST', suffix: '' });
      } else {
        tenses.push({ name: 'non-future', abbr: 'NFUT', suffix: '' });
        tenses.push({ name: 'future', abbr: 'FUT', suffix: this._generateAffix('suffix') });
      }
    } else if (numTenses >= 3) {
      tenses.push({ name: 'past', abbr: 'PST', suffix: this._generateAffix('suffix') });
      tenses.push({ name: 'present', abbr: 'PRS', suffix: '' });
      tenses.push({ name: 'future', abbr: 'FUT', suffix: this._generateAffix('suffix') });
    }

    if (numTenses >= 5) {
      tenses.push({ name: 'remote past', abbr: 'REM.PST', suffix: this._generateAffix('suffix') });
      tenses.push({ name: 'near future', abbr: 'PROX.FUT', suffix: this._generateAffix('suffix') });
    }

    if (numTenses >= 7) {
      tenses.push({ name: 'hodiernal past', abbr: 'HOD.PST', suffix: this._generateAffix('suffix') });
      tenses.push({ name: 'crastinal future', abbr: 'CRAS.FUT', suffix: this._generateAffix('suffix') });
    }

    return {
      count: tenses.length,
      tenses,
      description: `${tenses.length}-way tense system`,
    };
  }

  _generateAspectSystem() {
    const aspects = [];

    // Perfective/Imperfective distinction (common)
    if (this.random.bool(0.75)) {
      aspects.push({ name: 'perfective', abbr: 'PFV', suffix: '' });
      aspects.push({ name: 'imperfective', abbr: 'IPFV', suffix: this._generateAffix('suffix') });
    }

    // Progressive
    if (this.random.bool(0.50)) {
      aspects.push({ name: 'progressive', abbr: 'PROG', suffix: this._generateAffix('suffix') });
    }

    // Habitual
    if (this.random.bool(0.40)) {
      aspects.push({ name: 'habitual', abbr: 'HAB', suffix: this._generateAffix('suffix') });
    }

    // Perfect (anterior)
    if (this.random.bool(0.45)) {
      aspects.push({ name: 'perfect', abbr: 'PRF', suffix: this._generateAffix('suffix') });
    }

    // Inchoative (beginning)
    if (this.random.bool(0.25)) {
      aspects.push({ name: 'inchoative', abbr: 'INCH', suffix: this._generateAffix('suffix') });
    }

    // Completive
    if (this.random.bool(0.25)) {
      aspects.push({ name: 'completive', abbr: 'COMPL', suffix: this._generateAffix('suffix') });
    }

    return {
      count: aspects.length,
      aspects,
      description: aspects.length > 0 ? `${aspects.length} aspectual distinctions` : 'No grammatical aspect',
    };
  }

  _generateMoodSystem() {
    const moods = [];

    // Indicative (usually unmarked)
    moods.push({ name: 'indicative', abbr: 'IND', suffix: '' });

    // Imperative (very common)
    if (this.random.bool(0.90)) {
      moods.push({ name: 'imperative', abbr: 'IMP', suffix: this._generateAffix('suffix') });
    }

    // Subjunctive
    if (this.random.bool(0.50)) {
      moods.push({ name: 'subjunctive', abbr: 'SBJV', suffix: this._generateAffix('suffix') });
    }

    // Conditional
    if (this.random.bool(0.45)) {
      moods.push({ name: 'conditional', abbr: 'COND', suffix: this._generateAffix('suffix') });
    }

    // Optative (wishes)
    if (this.random.bool(0.25)) {
      moods.push({ name: 'optative', abbr: 'OPT', suffix: this._generateAffix('suffix') });
    }

    // Potential
    if (this.random.bool(0.20)) {
      moods.push({ name: 'potential', abbr: 'POT', suffix: this._generateAffix('suffix') });
    }

    // Hortative (let's)
    if (this.random.bool(0.20)) {
      moods.push({ name: 'hortative', abbr: 'HORT', suffix: this._generateAffix('suffix') });
    }

    return {
      count: moods.length,
      moods,
      description: `${moods.length} mood distinctions`,
    };
  }

  _generateAgreementSystem() {
    if (!this.config.verbAgreement && this.config.morphType === 'isolating') {
      return {
        hasAgreement: false,
        description: 'No verb agreement',
      };
    }

    const marksSubject = this.random.bool(0.80);
    const marksObject = this.random.bool(0.35);

    // Person distinctions
    const persons = [
      { name: '1st person', abbr: '1' },
      { name: '2nd person', abbr: '2' },
      { name: '3rd person', abbr: '3' },
    ];

    // Number in agreement
    const numbers = [
      { name: 'singular', abbr: 'SG' },
      { name: 'plural', abbr: 'PL' },
    ];

    // Generate agreement markers
    const subjectMarkers = [];
    const objectMarkers = [];

    if (marksSubject) {
      for (const person of persons) {
        for (const number of numbers) {
          subjectMarkers.push({
            person: person.abbr,
            number: number.abbr,
            label: `${person.abbr}${number.abbr}`,
            affix: this._generateAffix(this.random.pick(['prefix', 'suffix'])),
          });
        }
      }
    }

    if (marksObject) {
      for (const person of persons) {
        for (const number of numbers) {
          objectMarkers.push({
            person: person.abbr,
            number: number.abbr,
            label: `${person.abbr}${number.abbr}.OBJ`,
            affix: this._generateAffix('suffix'),
          });
        }
      }
    }

    return {
      hasAgreement: marksSubject || marksObject,
      marksSubject,
      marksObject,
      subjectMarkers,
      objectMarkers,
      description: this._describeAgreement(marksSubject, marksObject),
    };
  }

  _describeAgreement(subject, object) {
    if (subject && object) return 'Verbs agree with both subject and object';
    if (subject) return 'Verbs agree with subject only';
    if (object) return 'Verbs agree with object only';
    return 'No verb agreement';
  }

  _generateVoiceSystem() {
    const voices = [];

    // Active (unmarked)
    voices.push({ name: 'active', abbr: 'ACT', suffix: '' });

    // Passive (common)
    if (this.random.bool(0.70)) {
      voices.push({ name: 'passive', abbr: 'PASS', suffix: this._generateAffix('suffix') });
    }

    // Middle/Reflexive
    if (this.random.bool(0.45)) {
      voices.push({ name: 'middle', abbr: 'MID', suffix: this._generateAffix('suffix') });
    }

    // Causative
    if (this.random.bool(0.50)) {
      voices.push({ name: 'causative', abbr: 'CAUS', suffix: this._generateAffix('suffix') });
    }

    // Applicative
    if (this.random.bool(0.25)) {
      voices.push({ name: 'applicative', abbr: 'APPL', suffix: this._generateAffix('suffix') });
    }

    // Antipassive (common in ergative languages)
    if (this.random.bool(0.20)) {
      voices.push({ name: 'antipassive', abbr: 'ANTIP', suffix: this._generateAffix('suffix') });
    }

    return {
      count: voices.length,
      voices,
      description: `${voices.length} voice distinctions`,
    };
  }

  _generateEvidentiality() {
    // Evidentiality marks how the speaker knows the information
    const evidentials = [];

    evidentials.push({ name: 'direct', abbr: 'DIR', suffix: '', meaning: 'speaker witnessed' });
    evidentials.push({ name: 'reported', abbr: 'REP', suffix: this._generateAffix('suffix'), meaning: 'heard from others' });

    if (this.random.bool(0.50)) {
      evidentials.push({ name: 'inferential', abbr: 'INF', suffix: this._generateAffix('suffix'), meaning: 'inferred from evidence' });
    }

    if (this.random.bool(0.30)) {
      evidentials.push({ name: 'assumptive', abbr: 'ASSUM', suffix: this._generateAffix('suffix'), meaning: 'assumed/expected' });
    }

    return {
      count: evidentials.length,
      evidentials,
      description: `${evidentials.length}-way evidentiality system`,
    };
  }

  _generatePolarity() {
    const negationType = this.random.pick(['particle', 'prefix', 'suffix', 'circumfix']);

    let negation;
    if (negationType === 'particle') {
      negation = { type: 'particle', form: this._generateWord(1), position: this.random.pick(['before', 'after']) };
    } else if (negationType === 'prefix') {
      negation = { type: 'prefix', form: this._generateAffix('prefix') };
    } else if (negationType === 'suffix') {
      negation = { type: 'suffix', form: this._generateAffix('suffix') };
    } else {
      negation = { type: 'circumfix', prefix: this._generateAffix('prefix'), suffix: this._generateAffix('suffix') };
    }

    return {
      negation,
      description: `Negation via ${negationType}`,
    };
  }

  _generateVerbTemplate(tenses, aspects, moods, agreement, voices, evidentiality) {
    const slots = [];

    // Determine slot order based on morphological type
    if (this.config.morphType === 'agglutinative') {
      // Clear, consistent ordering
      if (agreement.marksSubject) {
        const position = this.random.pick(['prefix', 'suffix']);
        slots.push({ name: 'SUBJ', position, description: 'subject agreement' });
      }

      slots.push({ name: 'ROOT', position: 'root', description: 'verb root' });

      if (voices.count > 1) {
        slots.push({ name: 'VOICE', position: 'suffix', description: 'voice marking' });
      }

      if (aspects.count > 0) {
        slots.push({ name: 'ASP', position: 'suffix', description: 'aspect marking' });
      }

      if (tenses.count > 0) {
        slots.push({ name: 'TNS', position: 'suffix', description: 'tense marking' });
      }

      if (moods.count > 1) {
        slots.push({ name: 'MOOD', position: 'suffix', description: 'mood marking' });
      }

      if (agreement.marksObject) {
        slots.push({ name: 'OBJ', position: 'suffix', description: 'object agreement' });
      }

      if (evidentiality) {
        slots.push({ name: 'EVID', position: 'suffix', description: 'evidentiality' });
      }
    } else {
      // For other types, simpler/more fused
      slots.push({ name: 'ROOT', position: 'root', description: 'verb root' });
      slots.push({ name: 'TAM', position: 'suffix', description: 'tense/aspect/mood (fused)' });
      if (agreement.hasAgreement) {
        slots.push({ name: 'AGR', position: 'suffix', description: 'agreement' });
      }
    }

    return {
      slots,
      formula: slots.map(s => s.name).join('-'),
      description: 'Verb morpheme ordering',
    };
  }

  _generateDerivationalMorphology() {
    const processes = [];

    // Agentive nominalization (V → N: one who Vs)
    processes.push({
      name: 'agentive',
      input: 'verb',
      output: 'noun',
      meaning: 'one who Vs',
      affix: this._generateAffix('suffix'),
      affixType: 'suffix',
    });

    // Action nominalization (V → N: act of Ving)
    processes.push({
      name: 'action nominalization',
      input: 'verb',
      output: 'noun',
      meaning: 'act of Ving',
      affix: this._generateAffix('suffix'),
      affixType: 'suffix',
    });

    // Adjectivizer (N → A: having quality of N)
    processes.push({
      name: 'adjectivizer',
      input: 'noun',
      output: 'adjective',
      meaning: 'having quality of N / related to N',
      affix: this._generateAffix('suffix'),
      affixType: 'suffix',
    });

    // Verbalizer (N/A → V: to make/become)
    processes.push({
      name: 'verbalizer',
      input: 'noun/adjective',
      output: 'verb',
      meaning: 'to make/become N/A',
      affix: this._generateAffix('suffix'),
      affixType: 'suffix',
    });

    // Causative (V → V: cause to V)
    processes.push({
      name: 'causative',
      input: 'verb',
      output: 'verb',
      meaning: 'cause to V',
      affix: this._generateAffix('suffix'),
      affixType: 'suffix',
    });

    // Inchoative (A → V: become A)
    processes.push({
      name: 'inchoative',
      input: 'adjective',
      output: 'verb',
      meaning: 'become A',
      affix: this._generateAffix('suffix'),
      affixType: 'suffix',
    });

    // Diminutive (N → N: small N)
    processes.push({
      name: 'diminutive',
      input: 'noun',
      output: 'noun',
      meaning: 'small N',
      affix: this._generateAffix('suffix'),
      affixType: 'suffix',
    });

    // Augmentative (N → N: big N)
    processes.push({
      name: 'augmentative',
      input: 'noun',
      output: 'noun',
      meaning: 'big N',
      affix: this._generateAffix('suffix'),
      affixType: 'suffix',
    });

    // Negation/Privative (N/A → A: without N/not A)
    processes.push({
      name: 'privative',
      input: 'noun/adjective',
      output: 'adjective',
      meaning: 'without N / not A',
      affix: this._generateAffix('prefix'),
      affixType: 'prefix',
    });

    // Adverbializer (A → Adv)
    processes.push({
      name: 'adverbializer',
      input: 'adjective',
      output: 'adverb',
      meaning: 'in an A manner',
      affix: this._generateAffix('suffix'),
      affixType: 'suffix',
    });

    return {
      processes,
      description: `${processes.length} derivational processes`,
    };
  }

  _generateAdpositions() {
    // Generate a few basic adpositions/postpositions
    const adpositions = [];

    const meanings = ['in/at', 'on', 'to/toward', 'from', 'with', 'without', 'for', 'about'];

    for (const meaning of meanings) {
      if (this.random.bool(0.8)) {
        adpositions.push({
          form: this._generateWord(1),
          meaning,
        });
      }
    }

    return adpositions;
  }

  // Helper methods

  _generateAffix(type) {
    let affix;
    let attempts = 0;

    do {
      if (type === 'prefix') {
        affix = this.syllableForge.generateSyllable().slice(0, this.random.int(1, 3));
      } else {
        affix = this.syllableForge.generateSyllable().slice(-this.random.int(1, 3));
      }
      attempts++;
    } while (this.generatedAffixes.has(affix) && attempts < 50);

    this.generatedAffixes.add(affix);
    return affix;
  }

  _generateWord(syllables) {
    return this.syllableForge.generateWord(syllables);
  }
}
