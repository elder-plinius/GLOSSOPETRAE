/**
 * GLOSSOPETRAE - Evolution Engine Module
 *
 * Diachronic linguistics simulator. Applies ordered, feature-based sound
 * changes to a generated language to produce descendant languages:
 * - 20 naturalistic sound change rules (lenition, palatalization, umlaut,
 *   chain shifts, apocope, tonogenesis, ...)
 * - Whole-lexicon evolution including inflected paradigm forms, so case
 *   systems erode and merge the way they do in real history
 * - Per-word etymology chains (proto-form -> ... -> modern form)
 * - Language family derivation: one proto-language, N daughters with
 *   independent change sets, cognate tables, and a family tree
 *
 * Unlike DivergenceEngine (synchronic distance targets), this module
 * simulates actual historical change: rule ordering matters, mergers
 * happen, phonemes are born and die.
 */

import { SeededRandom, hashString } from '../utils/random.js';
import { getAllConsonants, getAllVowels } from '../data/phonemes.js';

// ---------------------------------------------------------------------------
// Phoneme catalog: every IPA segment any rule can output, with metadata so
// descendant phonologies stay well-formed even when changes create phonemes
// the proto-language lacked.
// ---------------------------------------------------------------------------

const CATALOG = (() => {
  const map = new Map();
  for (const c of getAllConsonants()) map.set(c.ipa, { ...c, kind: 'consonant' });
  for (const v of getAllVowels()) map.set(v.ipa, { ...v, kind: 'vowel' });
  return map;
})();

// Alternative romanizations used when a gained phoneme's default roman
// collides with one already in use.
const ROMAN_ALTERNATIVES = {
  'dʒ': ['j', 'dj', 'jh'],
  'tʃ': ['ch', 'tch', 'c'],
  'ʃ': ['sh', 'x', 'ş'],
  'ʒ': ['zh', 'j', 'ž'],
  'ŋ': ['ng', 'ñg', 'g̃'],
  'ɲ': ['ny', 'ñ', 'nj'],
  'ð': ['dh', 'đ', 'z'],
  'θ': ['th', 'ŧ', 's'],
  'ɣ': ['gh', 'ğ', 'g'],
  'x': ['kh', 'x', 'h'],
  'y': ['ÿ', 'ue', 'y'],
  'ø': ['ö', 'oe', 'eu'],
  'ə': ['ë', 'e', 'a'],
  'ɛ': ['è', 'ea', 'e'],
  'ɔ': ['ò', 'oa', 'o'],
  'ts': ['ts', 'c', 'tz'],
  'dz': ['dz', 'z', 'dz'],
  'v': ['v', 'bh', 'w'],
  'f': ['f', 'ph', 'f'],
  'ʔ': ["'", 'q', ''],
};

const FRONT_VOWELS = new Set(['i', 'e', 'ɛ', 'ɪ', 'y', 'ø']);

const VOICE_STOPS = { p: 'b', t: 'd', k: 'g' };
const SPIRANTIZE = { b: 'v', d: 'ð', g: 'ɣ' };
const DEVOICE = {
  b: 'p', d: 't', g: 'k', v: 'f', z: 's', 'ʒ': 'ʃ',
  'ɣ': 'x', 'ð': 'θ', dz: 'ts', 'dʒ': 'tʃ',
};
const PALATALIZE = { k: 'tʃ', g: 'dʒ', t: 'ts', s: 'ʃ' };
const COALESCE = { t: 'tʃ', d: 'dʒ', s: 'ʃ', z: 'ʒ', n: 'ɲ', l: 'j' };
const RAISE = { 'ɛ': 'e', e: 'i', 'ɔ': 'o', o: 'u' };
const LOWER = { i: 'e', u: 'o', 'ɪ': 'ɛ', 'ʊ': 'ɔ' };
const FRONT = { u: 'y', o: 'ø' };
const UMLAUT = { a: 'e', o: 'ø', u: 'y', 'ɔ': 'ɛ' };
const REDUCE = new Set(['a', 'e', 'o', 'ɛ', 'ɔ']);
const NASAL_ASSIM = [
  [new Set(['p', 'b', 'm']), 'm'],
  [new Set(['k', 'g', 'x', 'ɣ', 'q', 'ŋ']), 'ŋ'],
];

export class EvolutionEngine {
  constructor(language, config = {}) {
    this.language = language;
    this.config = config;
    this._buildParser(language);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Evolve the language by `centuries` of simulated change.
   * Returns a descendant language data object (not a full Glossopetrae
   * instance): evolved name, phonology, lexicon (with evolved paradigms),
   * morphology (with eroded suffixes + detected case mergers), etymologies,
   * and the ordered list of sound changes with examples.
   */
  evolve(options = {}) {
    const centuries = options.centuries ?? 5;
    const intensity = options.intensity ?? 'moderate';
    const seed = options.seed ?? (this.language.seed * 7919 + centuries * 104729 + 1);
    const rng = new SeededRandom(seed);

    const factor = { mild: 0.6, moderate: 1.0, dramatic: 1.6 }[intensity] ?? 1.0;
    const nChanges = Math.max(2, Math.min(12, Math.round(centuries * factor)));

    // Working copy of the lexicon as phone arrays
    const work = this._snapshotLexicon();

    const applied = [];
    const picked = new Set();
    const conflicts = { 'vowel-raising': ['vowel-lowering'], 'vowel-lowering': ['vowel-raising'] };

    for (let i = 0; i < nChanges; i++) {
      const inventory = this._currentInventory(work);
      const pool = RULES.filter((r) =>
        !picked.has(r.id) &&
        !(conflicts[r.id] || []).some((c) => picked.has(c)) &&
        r.applicable(inventory, work)
      );
      if (pool.length === 0) break;

      const rule = rng.weightedPick(pool.map((r) => [r, r.weight]));
      picked.add(rule.id);

      const change = this._applyRule(rule, work);
      if (change.touched > 0) {
        applied.push(change);
      }
    }

    return this._buildDescendant(work, applied, { centuries, seed, preserveName: options.preserveName });
  }

  /**
   * Derive a language family: the input language becomes the proto-language,
   * and `daughters` descendants evolve independently from it.
   * Returns proto info, daughter descendants, a cognate table over core
   * vocabulary, and a family tree.
   */
  deriveFamily(options = {}) {
    const daughters = Math.max(2, Math.min(6, options.daughters ?? 3));
    const centuries = options.centuries ?? 8;
    const generations = options.generations ?? 1;
    const baseSeed = options.seed ?? this.language.seed;

    const results = [];
    for (let i = 0; i < daughters; i++) {
      const jitter = ((i * 2654435761) % 5) - 2; // deterministic ±2 centuries
      const d = this.evolve({
        centuries: Math.max(2, centuries + jitter),
        seed: baseSeed * 104729 + (i + 1) * 7919,
        intensity: options.intensity ?? 'moderate',
      });
      results.push(d);
    }

    // Two daughters can independently evolve to the same name; the cognate
    // table and family tree key on name, so collisions must be resolved.
    this._disambiguateNames(results, this.language.name);

    // Optional second generation: the first daughter speciates further
    let grandchildren = [];
    if (generations >= 2 && results.length > 0) {
      const parent = results[0];
      const subEngine = EvolutionEngine.fromDescendant(parent);
      for (let j = 0; j < 2; j++) {
        const g = subEngine.evolve({
          centuries: Math.max(2, Math.round(centuries / 2)),
          seed: baseSeed * 999983 + (j + 1) * 7919,
          intensity: options.intensity ?? 'moderate',
        });
        g.parentName = parent.name;
        grandchildren.push(g);
      }
      parent.children = grandchildren;
    }

    // Single GLOBAL pass so no daughter / grandchild / branch shares a name
    // (the tree and cognate table key on name). Daughters come first so their
    // names stay stable; later descendants get suffixed on any collision.
    this._disambiguateNames([...results, ...grandchildren], this.language.name);

    const cognates = this._buildCognateTable(results, options.cognateCount ?? 30);

    const tree = {
      name: this.language.name,
      type: 'proto',
      children: results.map((d) => ({
        name: d.name,
        centuries: d.centuries,
        changeCount: d.changes.length,
        children: (d.children || []).map((g) => ({
          name: g.name,
          centuries: g.centuries,
          changeCount: g.changes.length,
          children: [],
        })),
      })),
    };

    const allNames = results.map((d) => d.name).join(', ');
    return {
      proto: { name: this.language.name, seed: this.language.seed },
      daughters: results,
      cognates,
      tree,
      summary:
        `The ${this.language.name} family: Proto-${this.language.name} split ` +
        `~${centuries} centuries ago into ${daughters} branches (${allNames}). ` +
        `Regular sound correspondences across ${cognates.length} core cognate sets.`,
    };
  }

  /** Trace a single (romanized) proto word through a descendant's changes. */
  static traceWord(descendant, romanWord) {
    if (typeof descendant.evolveWord !== 'function') return null;
    return descendant.evolveWord(romanWord);
  }

  /** Build an engine whose "language" is a previously evolved descendant. */
  static fromDescendant(descendant) {
    return new EvolutionEngine({
      name: descendant.name,
      seed: descendant.seed,
      phonology: descendant.phonology,
      lexicon: descendant.lexicon,
      morphology: descendant.morphology,
      prosody: descendant.prosody,
    });
  }

  /** Metadata for all available sound change rules (for UI display). */
  static availableRules() {
    return RULES.map((r) => ({ id: r.id, name: r.name, description: r.description, weight: r.weight }));
  }

  // -------------------------------------------------------------------------
  // Roman <-> phone conversion
  // -------------------------------------------------------------------------

  _buildParser(language) {
    const tokens = [];
    this.vowelSet = new Set();
    this.consSet = new Set();
    for (const c of language.phonology.consonants) {
      tokens.push({ roman: c.roman, ipa: c.ipa });
      this.consSet.add(c.ipa);
    }
    for (const v of language.phonology.vowels) {
      tokens.push({ roman: v.roman, ipa: v.ipa });
      this.vowelSet.add(v.ipa);
    }
    // Longest-match-first, stable order for determinism
    this.tokens = tokens
      .filter((t) => t.roman && t.roman.length > 0)
      .sort((a, b) => b.roman.length - a.roman.length || a.roman.localeCompare(b.roman));
    // ipa -> roman map seeded from the proto-language
    this.romanMap = new Map(this.tokens.map((t) => [t.ipa, t.roman]));
  }

  _parse(word) {
    const phones = [];
    const w = String(word);
    let i = 0;
    outer: while (i < w.length) {
      for (const t of this.tokens) {
        if (w.startsWith(t.roman, i)) {
          phones.push(t.ipa);
          i += t.roman.length;
          continue outer;
        }
      }
      phones.push(w[i]); // opaque character: passes through untouched
      i++;
    }
    return phones;
  }

  _isV(p) { return this.vowelSet.has(p) || (CATALOG.get(p)?.kind === 'vowel'); }
  _isC(p) { return this.consSet.has(p) || (CATALOG.get(p)?.kind === 'consonant'); }
  _syllableCount(phones) { return phones.filter((p) => this._isV(p)).length; }

  _render(phones, romanMap) {
    return phones.map((p) => (romanMap.get(p) ?? CATALOG.get(p)?.roman ?? p)).join('');
  }

  // -------------------------------------------------------------------------
  // Lexicon snapshot / application machinery
  // -------------------------------------------------------------------------

  _snapshotLexicon() {
    const items = [];
    for (const entry of this.language.lexicon.entries) {
      const item = {
        entry,
        lemma: { proto: entry.lemma, phones: this._parse(entry.lemma), chain: [] },
        forms: {},
      };
      if (entry.paradigm && entry.paradigm.forms) {
        for (const [label, form] of Object.entries(entry.paradigm.forms)) {
          item.forms[label] = { proto: form, phones: this._parse(form) };
        }
      }
      items.push(item);
    }
    return items;
  }

  _currentInventory(work) {
    const used = new Set();
    for (const item of work) {
      for (const p of item.lemma.phones) used.add(p);
    }
    return used;
  }

  _applyRule(rule, work) {
    const env = {
      isV: (p) => this._isV(p),
      isC: (p) => this._isC(p),
      syllableCount: (phones) => this._syllableCount(phones),
    };
    let touched = 0;
    const examples = [];

    const applyTo = (slot, gloss, isLemma) => {
      env.wordHash = hashString(slot.proto);
      const before = slot.phones;
      const after = rule.transform(before.slice(), env);
      if (after && after.length > 0 && after.join(' ') !== before.join(' ')) {
        if (isLemma) {
          touched++;
          if (examples.length < 4) {
            examples.push({
              before: this._render(before, this.romanMap),
              after: this._render(after, this.romanMap),
              gloss,
            });
          }
          slot.chain.push({ rule: rule.id, form: after.slice() });
        }
        slot.phones = after;
      }
    };

    for (const item of work) {
      applyTo(item.lemma, item.entry.gloss, true);
      for (const formSlot of Object.values(item.forms)) {
        applyTo(formSlot, item.entry.gloss, false);
      }
    }

    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      notation: rule.notation,
      examples,
      touched,
      tonogenesis: rule.tonogenesis || false,
    };
  }

  // -------------------------------------------------------------------------
  // Descendant assembly
  // -------------------------------------------------------------------------

  _buildDescendant(work, applied, { centuries, seed, preserveName }) {
    // 1. Collect surviving + gained phonemes
    const used = new Set();
    for (const item of work) {
      for (const p of item.lemma.phones) used.add(p);
      for (const f of Object.values(item.forms)) for (const p of f.phones) used.add(p);
    }

    const protoPhones = new Set([...this.consSet, ...this.vowelSet]);
    const gained = [...used].filter((p) => !protoPhones.has(p) && CATALOG.has(p)).sort();
    const lost = [...protoPhones].filter((p) => !used.has(p)).sort();

    // 2. Updated romanization (proto map minus lost, plus collision-free gains)
    const romanMap = new Map();
    const taken = new Set();
    for (const [ipa, roman] of this.romanMap) {
      if (used.has(ipa)) {
        romanMap.set(ipa, roman);
        taken.add(roman);
      }
    }
    for (const ipa of gained) {
      const candidates = [
        ...(ROMAN_ALTERNATIVES[ipa] || []),
        CATALOG.get(ipa)?.roman,
        ipa,
      ].filter(Boolean);
      let chosen = candidates.find((c) => !taken.has(c)) ?? ipa;
      romanMap.set(ipa, chosen);
      taken.add(chosen);
    }

    // 3. Rebuild phonology
    const consonants = [];
    const vowels = [];
    for (const p of used) {
      const meta = CATALOG.get(p);
      if (!meta) continue; // opaque character, not a phoneme
      const rec = { ...meta, roman: romanMap.get(p) };
      delete rec.kind;
      (meta.kind === 'vowel' ? vowels : consonants).push(rec);
    }
    consonants.sort((a, b) => a.ipa.localeCompare(b.ipa));
    vowels.sort((a, b) => a.ipa.localeCompare(b.ipa));

    // 4. Rebuild lexicon entries + etymologies
    const entries = [];
    const etymologies = [];
    for (const item of work) {
      const modern = this._render(item.lemma.phones, romanMap);
      const forms = {};
      for (const [label, slot] of Object.entries(item.forms)) {
        forms[label] = this._render(slot.phones, romanMap);
      }
      entries.push({
        ...item.entry,
        lemma: modern,
        paradigm: item.entry.paradigm ? { lemma: modern, forms } : undefined,
      });
      if (modern !== item.entry.lemma) {
        etymologies.push({
          gloss: item.entry.gloss,
          proto: `*${item.entry.lemma}`,
          modern,
          chain: item.lemma.chain.map((c) => ({
            rule: c.rule,
            form: this._render(c.form, romanMap),
          })),
        });
      }
    }

    // 5. Morphology: evolve suffix strings, detect case mergers
    const morphology = this._evolveMorphology(applied, romanMap, work);

    // 6. Name evolution
    let name = this.language.name;
    if (!preserveName) {
      const evolved = this._evolveString(this.language.name.toLowerCase(), applied);
      const rendered = this._render(evolved, romanMap);
      if (rendered && rendered.length >= 2 && rendered !== this.language.name.toLowerCase()) {
        name = rendered.charAt(0).toUpperCase() + rendered.slice(1);
      } else {
        name = `Neo-${this.language.name}`;
      }
    }

    // 7. Prosody: tonogenesis check
    let prosody = this.language.prosody
      ? JSON.parse(JSON.stringify({ ...this.language.prosody, summary: undefined }))
      : { hasTone: false };
    const toneBirth = applied.find((c) => c.tonogenesis);
    if (toneBirth && !prosody.hasTone) {
      prosody.hasTone = true;
      prosody.tone = {
        count: 2,
        type: 'register',
        tones: [
          { name: 'high', symbol: 'H', origin: 'syllables that lost a voiceless coda' },
          { name: 'low', symbol: 'L', origin: 'syllables that lost a voiced coda' },
        ],
        origin: 'tonogenesis: coda loss left a pitch distinction behind',
      };
    }

    const changeNames = applied.map((c) => c.name).join('; ');
    const descendant = {
      ancestorName: this.language.name,
      name,
      seed,
      centuries,
      changes: applied,
      phonology: {
        consonants,
        vowels,
        romanization: Object.fromEntries(romanMap),
        gained: gained.map((p) => ({ ipa: p, roman: romanMap.get(p) })),
        lost,
      },
      lexicon: { entries, size: entries.length },
      morphology,
      prosody,
      etymologies,
      summary:
        `${name} descends from ${this.language.name} after ~${centuries} centuries. ` +
        `${applied.length} sound changes (${changeNames}). ` +
        `${gained.length} phonemes gained, ${lost.length} lost; ` +
        `${etymologies.length}/${entries.length} words changed form.` +
        (morphology.mergers.length > 0
          ? ` Case mergers: ${morphology.mergers.map((m) => m.description).join('; ')}.`
          : ''),
    };

    // Closure for evolving arbitrary proto words through this exact chain
    descendant.evolveWord = (romanWord) => {
      const phones = this._evolveString(romanWord, applied);
      return this._render(phones, romanMap);
    };

    return descendant;
  }

  _evolveString(romanWord, applied) {
    const env = {
      isV: (p) => this._isV(p),
      isC: (p) => this._isC(p),
      syllableCount: (phones) => this._syllableCount(phones),
      wordHash: hashString(romanWord),
    };
    let phones = this._parse(romanWord);
    for (const change of applied) {
      const rule = RULES.find((r) => r.id === change.id);
      if (!rule) continue;
      const out = rule.transform(phones.slice(), env);
      if (out && out.length > 0) phones = out;
    }
    return phones;
  }

  _evolveMorphology(applied, romanMap, work) {
    const morphology = JSON.parse(JSON.stringify({
      type: this.language.morphology.type,
      wordOrder: this.language.morphology.wordOrder,
      alignment: this.language.morphology.alignment,
      nominal: this.language.morphology.nominal,
      verbal: this.language.morphology.verbal,
      adpositions: this.language.morphology.adpositions,
    }));

    // Evolve suffix strings (suffixes erode as the ends of words do)
    const evolveSuffix = (s) => {
      if (!s) return s;
      const phones = this._evolveString(s, applied);
      return this._render(phones, romanMap);
    };
    const caseList = morphology.nominal?.caseSystem?.cases || [];
    for (const c of caseList) {
      const evolved = evolveSuffix(c.suffix);
      if (evolved !== c.suffix) {
        c.protoSuffix = c.suffix;
        c.suffix = evolved;
      }
    }
    for (const group of ['tenses', 'aspects', 'moods']) {
      const sub = morphology.verbal?.[group];
      const list = sub?.[group] || sub?.tenses || [];
      for (const t of Array.isArray(list) ? list : []) {
        const evolved = evolveSuffix(t.suffix);
        if (evolved !== t.suffix) {
          t.protoSuffix = t.suffix;
          t.suffix = evolved;
        }
      }
    }

    // Detect case mergers: pairs of paradigm labels whose forms have become
    // identical across most of the lexicon (classic case-system collapse)
    const mergers = [];
    const labels = new Set();
    for (const item of work) for (const l of Object.keys(item.forms)) labels.add(l);
    const labelArr = [...labels];
    for (let i = 0; i < labelArr.length; i++) {
      for (let j = i + 1; j < labelArr.length; j++) {
        const a = labelArr[i];
        const b = labelArr[j];
        let same = 0, differedBefore = 0, total = 0;
        for (const item of work) {
          const fa = item.forms[a];
          const fb = item.forms[b];
          if (!fa || !fb) continue;
          total++;
          const ra = this._render(fa.phones, romanMap);
          const rb = this._render(fb.phones, romanMap);
          if (ra === rb) same++;
          if (fa.proto !== fb.proto) differedBefore++;
        }
        if (total >= 10 && same / total > 0.6 && differedBefore / total > 0.7) {
          mergers.push({
            labels: [a, b],
            rate: +(same / total).toFixed(2),
            description: `${a} and ${b} have merged in ${Math.round((same / total) * 100)}% of words`,
          });
        }
      }
    }
    morphology.mergers = mergers;
    return morphology;
  }

  /**
   * Ensure every descendant in the list has a globally-unique `name` by
   * appending Roman-numeral suffixes deterministically (West, West II...). The
   * candidate name is checked against ALL names already taken — including ones
   * a previous suffix produced — so e.g. a fresh "Pul" never collides with an
   * earlier "Pul II". Pass the whole family (daughters + grandchildren) in one
   * call so collisions are resolved across branches and generations.
   */
  _disambiguateNames(descendants, protoName) {
    const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII'];
    const taken = new Set(protoName ? [protoName] : []);
    for (const d of descendants) {
      const base = d.name;
      let name = base, k = 1;
      while (taken.has(name)) { name = base + (ROMAN[k] || ` ${k + 1}`); k++; }
      d.name = name;
      taken.add(name);
    }
  }

  _buildCognateTable(daughterResults, count) {
    const CORE_FIELDS = new Set(['Pronouns', 'Body', 'Nature', 'Animals', 'Numbers', 'People', 'BasicVerbs']);
    const protoEntries = this.language.lexicon.entries;
    const rows = [];
    for (let idx = 0; idx < protoEntries.length && rows.length < count; idx++) {
      const e = protoEntries[idx];
      if (!CORE_FIELDS.has(e.field)) continue;
      const reflexes = {};
      let anyDiff = false;
      for (const d of daughterResults) {
        const form = d.lexicon.entries[idx]?.lemma ?? '—';
        reflexes[d.name] = form;
        if (form !== e.lemma) anyDiff = true;
      }
      rows.push({ gloss: e.gloss, proto: `*${e.lemma}`, reflexes, changed: anyDiff });
    }
    return rows;
  }
}

// ---------------------------------------------------------------------------
// Sound change rule library
// Each rule: id, name, description, notation (classic A > B / X_Y form),
// weight (naturalness/frequency), applicable(inventory), transform(phones, env)
// transform returns a NEW phone array (or the input array unchanged).
// ---------------------------------------------------------------------------

function mapSimultaneous(phones, mapping) {
  return phones.map((p) => mapping[p] ?? p);
}

const RULES = [
  {
    id: 'lenition',
    name: 'Intervocalic lenition',
    description: 'Voiceless stops became voiced between vowels (p→b, t→d, k→g), as in Western Romance.',
    notation: 'p,t,k > b,d,g / V_V',
    weight: 0.9,
    applicable: (inv) => ['p', 't', 'k'].some((p) => inv.has(p)),
    transform(phones, env) {
      const out = phones.slice();
      for (let i = 1; i < out.length - 1; i++) {
        if (VOICE_STOPS[out[i]] && env.isV(out[i - 1]) && env.isV(out[i + 1])) {
          out[i] = VOICE_STOPS[out[i]];
        }
      }
      return out;
    },
  },
  {
    id: 'spirantization',
    name: 'Intervocalic spirantization',
    description: 'Voiced stops weakened to fricatives between vowels (b→v, d→ð, g→ɣ), as in Spanish.',
    notation: 'b,d,g > v,ð,ɣ / V_V',
    weight: 0.6,
    applicable: (inv) => ['b', 'd', 'g'].some((p) => inv.has(p)),
    transform(phones, env) {
      const out = phones.slice();
      for (let i = 1; i < out.length - 1; i++) {
        if (SPIRANTIZE[out[i]] && env.isV(out[i - 1]) && env.isV(out[i + 1])) {
          out[i] = SPIRANTIZE[out[i]];
        }
      }
      return out;
    },
  },
  {
    id: 'palatalization',
    name: 'Palatalization',
    description: 'Velars and alveolars softened before front vowels (k→ch, g→j, t→ts, s→sh), as in Italian and Slavic.',
    notation: 'k,g,t,s > tʃ,dʒ,ts,ʃ / _[i,e]',
    weight: 0.9,
    applicable: (inv) =>
      ['k', 'g', 't', 's'].some((p) => inv.has(p)) && [...FRONT_VOWELS].some((v) => inv.has(v)),
    transform(phones) {
      const out = phones.slice();
      for (let i = 0; i < out.length - 1; i++) {
        if (PALATALIZE[out[i]] && FRONT_VOWELS.has(out[i + 1])) {
          out[i] = PALATALIZE[out[i]];
        }
      }
      return out;
    },
  },
  {
    id: 'apocope',
    name: 'Final vowel loss (apocope)',
    description: 'Word-final vowels dropped in polysyllabic words, as in French and English.',
    notation: 'V > ∅ / _# (polysyllables)',
    weight: 0.7,
    applicable: () => true,
    transform(phones, env) {
      if (phones.length < 3) return phones;
      const last = phones[phones.length - 1];
      if (env.isV(last) && env.syllableCount(phones) >= 2) {
        return phones.slice(0, -1);
      }
      return phones;
    },
  },
  {
    id: 'syncope',
    name: 'Medial vowel syncope',
    description: 'Unstressed medial vowels dropped in longer words (CVCVCV→CVCCV), as in Latin→Romance.',
    notation: 'V > ∅ / VC_CV (3+ syllables)',
    weight: 0.5,
    applicable: () => true,
    transform(phones, env) {
      if (env.syllableCount(phones) < 3) return phones;
      // Delete the second vowel nucleus if flanked by single consonants
      let nucleus = 0;
      for (let i = 1; i < phones.length - 1; i++) {
        if (env.isV(phones[i])) {
          nucleus++;
          if (nucleus === 2 && env.isC(phones[i - 1]) && env.isC(phones[i + 1])) {
            return [...phones.slice(0, i), ...phones.slice(i + 1)];
          }
        }
      }
      return phones;
    },
  },
  {
    id: 'final-devoicing',
    name: 'Final devoicing',
    description: 'Word-final voiced obstruents became voiceless (b→p, d→t, g→k, z→s), as in German and Russian.',
    notation: '[+voice,−son] > [−voice] / _#',
    weight: 0.7,
    applicable: (inv) => Object.keys(DEVOICE).some((p) => inv.has(p)),
    transform(phones) {
      if (phones.length === 0) return phones;
      const out = phones.slice();
      const last = out[out.length - 1];
      if (DEVOICE[last]) out[out.length - 1] = DEVOICE[last];
      return out;
    },
  },
  {
    id: 'nasal-assimilation',
    name: 'Nasal place assimilation',
    description: 'Nasals took on the place of the following consonant (np→mp, nk→ŋk), near-universal.',
    notation: 'n > m,ŋ / _[labial],[velar]',
    weight: 0.8,
    applicable: (inv) => inv.has('n'),
    transform(phones) {
      const out = phones.slice();
      for (let i = 0; i < out.length - 1; i++) {
        if (out[i] === 'n') {
          for (const [places, target] of NASAL_ASSIM) {
            if (places.has(out[i + 1])) out[i] = target;
          }
        }
      }
      return out;
    },
  },
  {
    id: 'rhotacism',
    name: 'Rhotacism',
    description: 'Intervocalic s/z became r, as in Latin (flos→floris) and Germanic.',
    notation: 's,z > r / V_V',
    weight: 0.4,
    applicable: (inv) => inv.has('s') || inv.has('z'),
    transform(phones, env) {
      const out = phones.slice();
      for (let i = 1; i < out.length - 1; i++) {
        if ((out[i] === 's' || out[i] === 'z') && env.isV(out[i - 1]) && env.isV(out[i + 1])) {
          out[i] = 'r';
        }
      }
      return out;
    },
  },
  {
    id: 'h-loss',
    name: 'H-dropping',
    description: 'The glottal fricative h disappeared entirely, as in Romance and many English dialects.',
    notation: 'h > ∅',
    weight: 0.6,
    applicable: (inv) => inv.has('h'),
    transform(phones) {
      const out = phones.filter((p) => p !== 'h');
      return out.length > 0 ? out : phones;
    },
  },
  {
    id: 'glottal-loss',
    name: 'Glottal stop loss',
    description: 'The glottal stop ʔ vanished, often lengthening or merging surrounding vowels.',
    notation: 'ʔ > ∅',
    weight: 0.4,
    applicable: (inv) => inv.has('ʔ'),
    transform(phones) {
      const out = phones.filter((p) => p !== 'ʔ');
      return out.length > 0 ? out : phones;
    },
  },
  {
    id: 'vowel-raising',
    name: 'Chain raising',
    description: 'Mid vowels raised in a chain shift (ɛ→e→i, ɔ→o→u), echoing the Great Vowel Shift.',
    notation: 'ɛ,e,ɔ,o > e,i,o,u (simultaneous)',
    weight: 0.5,
    applicable: (inv) => Object.keys(RAISE).some((v) => inv.has(v)),
    transform(phones) {
      return mapSimultaneous(phones, RAISE);
    },
  },
  {
    id: 'vowel-lowering',
    name: 'Vowel lowering',
    description: 'High vowels lowered (i→e, u→o), merging with existing mid vowels.',
    notation: 'i,u > e,o (simultaneous)',
    weight: 0.4,
    applicable: (inv) => Object.keys(LOWER).some((v) => inv.has(v)),
    transform(phones) {
      return mapSimultaneous(phones, LOWER);
    },
  },
  {
    id: 'vowel-fronting',
    name: 'Back vowel fronting',
    description: 'Back rounded vowels fronted (u→ü, o→ö), as in French and Greek.',
    notation: 'u,o > y,ø',
    weight: 0.35,
    applicable: (inv) => inv.has('u') || inv.has('o'),
    transform(phones) {
      return mapSimultaneous(phones, FRONT);
    },
  },
  {
    id: 'vowel-reduction',
    name: 'Unstressed vowel reduction',
    description: 'Vowels in non-initial syllables reduced to schwa, as in English and Russian.',
    notation: 'V > ə / unstressed (3+ syllables)',
    weight: 0.5,
    applicable: () => true,
    transform(phones, env) {
      if (env.syllableCount(phones) < 3) return phones;
      const out = phones.slice();
      let nucleus = 0;
      for (let i = 0; i < out.length; i++) {
        if (env.isV(out[i])) {
          nucleus++;
          if (nucleus > 1 && REDUCE.has(out[i])) out[i] = 'ə';
        }
      }
      return out;
    },
  },
  {
    id: 'umlaut',
    name: 'I-umlaut',
    description: 'Back vowels fronted when the next syllable contained i (a→e, o→ö, u→ü), as in Germanic.',
    notation: 'a,o,u > e,ø,y / _Ci',
    weight: 0.5,
    applicable: (inv) => inv.has('i') && Object.keys(UMLAUT).some((v) => inv.has(v)),
    transform(phones, env) {
      const out = phones.slice();
      for (let i = 0; i < out.length; i++) {
        if (!UMLAUT[out[i]]) continue;
        // Find the next vowel; front if it is i or j
        for (let j = i + 1; j < out.length; j++) {
          if (env.isV(out[j]) || out[j] === 'j') {
            if (out[j] === 'i' || out[j] === 'j') out[i] = UMLAUT[out[i]];
            break;
          }
        }
      }
      return out;
    },
  },
  {
    id: 'j-coalescence',
    name: 'Yod coalescence',
    description: 'Consonant + y fused into palatals (ty→ch, sy→sh, ny→ñ), as in English "nature".',
    notation: 'C+j > [palatal]',
    weight: 0.6,
    applicable: (inv) => inv.has('j') && Object.keys(COALESCE).some((c) => inv.has(c)),
    transform(phones) {
      const out = [];
      for (let i = 0; i < phones.length; i++) {
        if (COALESCE[phones[i]] && phones[i + 1] === 'j') {
          out.push(COALESCE[phones[i]]);
          i++;
        } else {
          out.push(phones[i]);
        }
      }
      return out;
    },
  },
  {
    id: 'cluster-simplification',
    name: 'Cluster simplification',
    description: 'Heavy consonant clusters simplified: the first of two adjacent obstruents dropped.',
    notation: 'C > ∅ / _C (obstruent clusters)',
    weight: 0.5,
    applicable: () => true,
    transform(phones, env) {
      const OBSTRUENT = (p) => {
        const m = CATALOG.get(p);
        return m && m.kind === 'consonant' && !['m', 'n', 'ɲ', 'ŋ', 'l', 'r', 'ɾ', 'ʀ', 'w', 'j'].includes(p);
      };
      const out = [];
      for (let i = 0; i < phones.length; i++) {
        if (i < phones.length - 1 && OBSTRUENT(phones[i]) && OBSTRUENT(phones[i + 1]) && phones[i] !== phones[i + 1]) {
          continue; // drop first obstruent of the cluster
        }
        out.push(phones[i]);
      }
      return out.length > 0 && out.some((p) => env.isV(p)) ? out : phones;
    },
  },
  {
    id: 'breaking',
    name: 'Vowel breaking',
    description: 'Stressed mid vowels broke into diphthongs (e→ye, o→wo), as in Spanish (terra→tierra).',
    notation: 'e,o > je,wo / initial syllable',
    weight: 0.3,
    applicable: (inv) => inv.has('e') || inv.has('o'),
    transform(phones, env) {
      // First vowel nucleus only (initial-stress approximation)
      for (let i = 0; i < phones.length; i++) {
        if (env.isV(phones[i])) {
          if (phones[i] === 'e' && phones[i - 1] !== 'j') {
            return [...phones.slice(0, i), 'j', 'ɛ', ...phones.slice(i + 1)];
          }
          if (phones[i] === 'o' && phones[i - 1] !== 'w') {
            return [...phones.slice(0, i), 'w', 'ɔ', ...phones.slice(i + 1)];
          }
          break;
        }
      }
      return phones;
    },
  },
  {
    id: 'prothesis',
    name: 'Prothesis',
    description: 'An e- was prefixed to words beginning with s+consonant, as in Spanish (schola→escuela).',
    notation: '∅ > e / #_sC',
    weight: 0.3,
    applicable: (inv) => inv.has('s'),
    transform(phones, env) {
      if (phones.length >= 2 && phones[0] === 's' && env.isC(phones[1])) {
        return ['e', ...phones];
      }
      return phones;
    },
  },
  {
    id: 'metathesis',
    name: 'Liquid metathesis',
    description: 'r swapped places with a neighboring vowel in some words (sporadic), as in Slavic.',
    notation: 'CrV > CVr (sporadic)',
    weight: 0.25,
    applicable: (inv) => inv.has('r') || inv.has('ɾ'),
    transform(phones, env) {
      if (env.wordHash % 5 !== 0) return phones; // sporadic, lexically conditioned
      const out = phones.slice();
      for (let i = 0; i < out.length - 1; i++) {
        if ((out[i] === 'r' || out[i] === 'ɾ') && env.isV(out[i + 1])) {
          [out[i], out[i + 1]] = [out[i + 1], out[i]];
          return out;
        }
      }
      return phones;
    },
  },
  {
    id: 'final-stop-loss',
    name: 'Final stop loss (tonogenesis)',
    description: 'Word-final stops eroded away; the lost voicing contrast survived as high vs low tone, as in Vietnamese and Chinese.',
    notation: 'p,t,k,b,d,g > ∅ / _# (+tone split)',
    weight: 0.3,
    tonogenesis: true,
    applicable: (inv) => ['p', 't', 'k', 'b', 'd', 'g'].some((p) => inv.has(p)),
    transform(phones, env) {
      if (phones.length < 2) return phones;
      const last = phones[phones.length - 1];
      if (['p', 't', 'k', 'b', 'd', 'g', 'ʔ'].includes(last)) {
        const out = phones.slice(0, -1);
        if (out.some((p) => env.isV(p))) return out;
      }
      return phones;
    },
  },
];

export default EvolutionEngine;
