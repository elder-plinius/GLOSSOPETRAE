/**
 * GLOSSOPETRAE - Syllable Forge Module
 *
 * Generates syllable structure constraints and phonotactic rules
 * respecting sonority sequencing and cross-linguistic patterns.
 */

import { SONORITY, CONSONANTS } from '../data/phonemes.js';

export class SyllableForge {
  constructor(random, phonology, config = {}) {
    this.random = random;
    this.phonology = phonology;
    this.config = {
      maxOnset: config.maxOnset ?? this.random.weightedPick([[0, 0.1], [1, 0.3], [2, 0.4], [3, 0.2]]),
      maxCoda: config.maxCoda ?? this.random.weightedPick([[0, 0.25], [1, 0.4], [2, 0.25], [3, 0.1]]),
      allowClusters: config.allowClusters ?? true,
      vowelHarmony: config.vowelHarmony ?? this.random.bool(0.3),
      harmonyType: config.harmonyType || null,
    };
  }

  generate() {
    const template = this._generateTemplate();
    const onsetRules = this._generateOnsetRules();
    const codaRules = this._generateCodaRules();
    const clusterRules = this._generateClusterRules();
    const processes = this._generatePhonologicalProcesses();

    return {
      template,
      onsetRules,
      codaRules,
      clusterRules,
      processes,
      constraints: this._generateConstraints(),
    };
  }

  _generateTemplate() {
    // Build syllable formula like (C)(C)V(C)(C)
    let formula = '';

    // Onset
    for (let i = 0; i < this.config.maxOnset; i++) {
      formula += '(C)';
    }

    // Nucleus (always required)
    formula += 'V';

    // Coda
    for (let i = 0; i < this.config.maxCoda; i++) {
      formula += '(C)';
    }

    return {
      formula,
      onsetMin: 0,
      onsetMax: this.config.maxOnset,
      codaMin: 0,
      codaMax: this.config.maxCoda,
      description: this._describeTemplate(),
    };
  }

  _describeTemplate() {
    const onset = this.config.maxOnset;
    const coda = this.config.maxCoda;

    if (onset === 0 && coda === 0) return 'Strictly CV (open syllables only)';
    if (onset === 1 && coda === 0) return 'CV only (no clusters, open syllables)';
    if (onset === 1 && coda === 1) return '(C)V(C) (simple syllables)';
    if (onset === 2 && coda === 1) return '(C)(C)V(C) (moderate complexity)';
    if (onset === 2 && coda === 2) return '(C)(C)V(C)(C) (complex, English-like)';
    if (onset >= 3 || coda >= 3) return 'Complex syllable structure (Georgian-like)';
    return 'Variable complexity';
  }

  _generateOnsetRules() {
    const rules = {
      allowed: [],
      forbidden: [],
      preferred: [],
    };

    const consonants = this.phonology.consonants;

    // Single consonant onsets - usually all consonants allowed
    rules.allowed.push({
      pattern: 'C',
      description: 'Any single consonant',
      consonants: consonants.map(c => c.ipa),
    });

    // Cluster rules if max onset >= 2
    if (this.config.maxOnset >= 2 && this.config.allowClusters) {
      // Stop + Liquid clusters (very common: pr, tr, kr, bl, etc.)
      const stops = consonants.filter(c => this._isStop(c));
      const liquids = consonants.filter(c => this._isLiquid(c));

      if (stops.length > 0 && liquids.length > 0) {
        rules.allowed.push({
          pattern: 'stop + liquid',
          description: 'Stop followed by liquid (e.g., pr, tr, kl)',
          examples: this._generateClusterExamples(stops, liquids),
        });
      }

      // Stop + Glide clusters (common: tw, kw, py, etc.)
      const glides = consonants.filter(c => this._isGlide(c));
      if (stops.length > 0 && glides.length > 0) {
        rules.allowed.push({
          pattern: 'stop + glide',
          description: 'Stop followed by glide (e.g., tw, kw)',
          examples: this._generateClusterExamples(stops, glides),
        });
      }

      // Fricative + Liquid (common: fr, fl, etc.)
      const fricatives = consonants.filter(c => this._isFricative(c));
      if (fricatives.length > 0 && liquids.length > 0) {
        rules.allowed.push({
          pattern: 'fricative + liquid',
          description: 'Fricative followed by liquid (e.g., fr, sl)',
          examples: this._generateClusterExamples(fricatives, liquids),
        });
      }

      // Forbidden: sonority plateaus and reversals
      rules.forbidden.push({
        pattern: 'liquid + stop',
        description: 'Sonority must rise toward nucleus',
      });
      rules.forbidden.push({
        pattern: 'nasal + stop (different place)',
        description: 'Nasal clusters typically homorganic only',
      });
    }

    return rules;
  }

  _generateCodaRules() {
    const rules = {
      allowed: [],
      forbidden: [],
      preferred: [],
    };

    const consonants = this.phonology.consonants;

    if (this.config.maxCoda === 0) {
      rules.forbidden.push({
        pattern: 'any',
        description: 'No codas allowed (open syllables only)',
      });
      return rules;
    }

    // Single consonant codas
    // Some languages restrict which consonants can appear in coda
    const codaConsonants = this._selectCodaConsonants(consonants);
    rules.allowed.push({
      pattern: 'C',
      description: 'Single consonant coda',
      consonants: codaConsonants.map(c => c.ipa),
    });

    // Glides and /h/ often forbidden in coda
    const glides = consonants.filter(c => this._isGlide(c));
    const h = consonants.find(c => c.ipa === 'h');
    if (glides.length > 0 || h) {
      rules.forbidden.push({
        pattern: 'glide or /h/ in coda',
        description: 'Glides and /h/ typically not allowed word-finally',
        consonants: [...glides.map(g => g.ipa), h?.ipa].filter(Boolean),
      });
    }

    // Cluster rules if max coda >= 2
    if (this.config.maxCoda >= 2 && this.config.allowClusters) {
      const liquids = consonants.filter(c => this._isLiquid(c));
      const nasals = consonants.filter(c => this._isNasal(c));
      const stops = consonants.filter(c => this._isStop(c));

      // Liquid + Stop (common: rp, lt, lk)
      if (liquids.length > 0 && stops.length > 0) {
        rules.allowed.push({
          pattern: 'liquid + stop',
          description: 'Liquid followed by stop (falling sonority)',
          examples: this._generateClusterExamples(liquids, stops),
        });
      }

      // Nasal + Stop (homorganic: mp, nt, ŋk)
      if (nasals.length > 0 && stops.length > 0) {
        rules.allowed.push({
          pattern: 'nasal + stop (homorganic)',
          description: 'Nasal followed by stop at same place',
          examples: this._generateHomorganicClusters(nasals, stops),
        });
      }

      // Forbidden: rising sonority in coda
      rules.forbidden.push({
        pattern: 'stop + liquid',
        description: 'Sonority must fall from nucleus',
      });
    }

    return rules;
  }

  _generateClusterRules() {
    if (!this.config.allowClusters || (this.config.maxOnset <= 1 && this.config.maxCoda <= 1)) {
      return {
        allowed: [],
        forbidden: [],
        principle: 'No consonant clusters allowed',
      };
    }

    return {
      principle: 'Sonority Sequencing Principle',
      description: 'Consonants must rise in sonority toward the vowel (onset) and fall away from it (coda)',
      sonorityScale: { ...SONORITY },
      allowed: this._generateAllowedClusters(),
      forbidden: this._generateForbiddenClusters(),
    };
  }

  _generateAllowedClusters() {
    const clusters = [];
    const consonants = this.phonology.consonants;

    // Generate actual allowed two-consonant clusters
    for (const c1 of consonants) {
      for (const c2 of consonants) {
        const s1 = this._getSonority(c1);
        const s2 = this._getSonority(c2);

        // Onset: rising sonority
        if (s1 < s2 && this.config.maxOnset >= 2) {
          // Apply additional constraints
          if (this._isValidOnsetCluster(c1, c2)) {
            clusters.push({
              type: 'onset',
              cluster: c1.roman + c2.roman,
              ipa: c1.ipa + c2.ipa,
            });
          }
        }

        // Coda: falling sonority
        if (s1 > s2 && this.config.maxCoda >= 2) {
          if (this._isValidCodaCluster(c1, c2)) {
            clusters.push({
              type: 'coda',
              cluster: c1.roman + c2.roman,
              ipa: c1.ipa + c2.ipa,
            });
          }
        }
      }
    }

    return clusters;
  }

  _generateForbiddenClusters() {
    const forbidden = [];

    // Sonority plateaus (same sonority)
    forbidden.push({
      rule: 'No sonority plateaus',
      description: 'Two consonants of equal sonority cannot cluster',
      examples: ['two stops (*pt, *kt)', 'two fricatives (*sf, *fs)'],
    });

    // Identical consonants (geminates - may or may not be allowed)
    if (this.random.bool(0.6)) {
      forbidden.push({
        rule: 'No geminates',
        description: 'Identical consonants cannot cluster',
        examples: ['*pp, *tt, *ss'],
      });
    }

    // Place restrictions
    forbidden.push({
      rule: 'Homorganic restrictions',
      description: 'Some same-place clusters forbidden',
      examples: ['*tp, *pb (same place stops)'],
    });

    return forbidden;
  }

  _generatePhonologicalProcesses() {
    const processes = [];

    // Nasal assimilation (very common)
    if (this.random.bool(0.7) && this.phonology.consonants.some(c => this._isNasal(c))) {
      processes.push({
        name: 'Nasal Assimilation',
        description: '/n/ assimilates to place of following stop',
        rule: 'n → m / _[+labial], n → ŋ / _[+velar]',
        examples: ['in+possible → impossible', 'in+credible → incredible'],
      });
    }

    // Final devoicing (moderately common)
    if (this.random.bool(0.4)) {
      processes.push({
        name: 'Final Devoicing',
        description: 'Voiced obstruents become voiceless word-finally',
        rule: '[+voiced, -sonorant] → [-voiced] / _#',
        examples: ['dog → dok', 'have → haf'],
      });
    }

    // Vowel harmony
    if (this.config.vowelHarmony) {
      const harmonyType = this.config.harmonyType || this.random.pick(['backness', 'rounding', 'height']);
      processes.push({
        name: 'Vowel Harmony',
        type: harmonyType,
        description: `Vowels agree in ${harmonyType} within a word`,
        rule: `V → [α${harmonyType}] / V[α${harmonyType}]___`,
        examples: this._generateHarmonyExamples(harmonyType),
      });
    }

    // Palatalization
    if (this.random.bool(0.3)) {
      processes.push({
        name: 'Palatalization',
        description: 'Velars become palatals before front vowels',
        rule: 'k → tʃ / _[+front], g → dʒ / _[+front]',
        examples: ['ke → che', 'gi → ji'],
      });
    }

    // Epenthesis (for illegal clusters)
    if (this.random.bool(0.35)) {
      // Filter for mid vowels or /i/, with fallback to any vowel
      const epentheticCandidates = this.phonology.vowels.filter(v => v.height === 'mid' || v.ipa === 'i');
      const epentheticVowel = epentheticCandidates.length > 0
        ? this.random.pick(epentheticCandidates)
        : this.random.pick(this.phonology.vowels);
      processes.push({
        name: 'Epenthesis',
        description: `Insert ${epentheticVowel.roman} to break illegal clusters`,
        rule: `∅ → ${epentheticVowel.ipa} / C_C (when cluster violates phonotactics)`,
        epentheticVowel: epentheticVowel.ipa,
      });
    }

    return processes;
  }

  _generateConstraints() {
    const constraints = [];

    // Word-initial constraints
    const initialForbidden = [];
    if (this.random.bool(0.4)) {
      initialForbidden.push('No initial /ŋ/');
    }
    if (this.random.bool(0.3)) {
      initialForbidden.push('No initial clusters with /r/');
    }

    if (initialForbidden.length > 0) {
      constraints.push({
        position: 'word-initial',
        restrictions: initialForbidden,
      });
    }

    // Word-final constraints
    const finalForbidden = [];
    if (this.random.bool(0.5)) {
      finalForbidden.push('No final voiced stops');
    }
    if (this.config.maxCoda === 0) {
      finalForbidden.push('Words must end in vowels');
    }

    if (finalForbidden.length > 0) {
      constraints.push({
        position: 'word-final',
        restrictions: finalForbidden,
      });
    }

    return constraints;
  }

  // Helper methods

  _isStop(c) {
    return CONSONANTS.stops.some(s => s.ipa === c.ipa);
  }

  _isNasal(c) {
    return CONSONANTS.nasals.some(n => n.ipa === c.ipa);
  }

  _isFricative(c) {
    return CONSONANTS.fricatives.some(f => f.ipa === c.ipa);
  }

  _isAffricate(c) {
    return CONSONANTS.affricates.some(a => a.ipa === c.ipa);
  }

  _isLiquid(c) {
    return CONSONANTS.liquids.some(l => l.ipa === c.ipa);
  }

  _isGlide(c) {
    return CONSONANTS.glides.some(g => g.ipa === c.ipa);
  }

  _getSonority(c) {
    if (this._isStop(c)) return SONORITY.stop;
    if (this._isAffricate(c)) return SONORITY.affricate;
    if (this._isFricative(c)) return SONORITY.fricative;
    if (this._isNasal(c)) return SONORITY.nasal;
    if (this._isLiquid(c)) return SONORITY.liquid;
    if (this._isGlide(c)) return SONORITY.glide;
    return SONORITY.vowel;
  }

  _selectCodaConsonants(consonants) {
    // Some languages restrict codas to certain consonants
    return consonants.filter(c => {
      // Glides usually not in coda
      if (this._isGlide(c)) return false;
      // /h/ usually not in coda
      if (c.ipa === 'h') return false;
      // With some probability, restrict to sonorants only
      if (this.random.bool(0.2)) {
        return this._isNasal(c) || this._isLiquid(c);
      }
      return true;
    });
  }

  _isValidOnsetCluster(c1, c2) {
    // Additional onset cluster constraints
    // Stop + Liquid: yes
    if (this._isStop(c1) && this._isLiquid(c2)) return true;
    // Stop + Glide: yes
    if (this._isStop(c1) && this._isGlide(c2)) return true;
    // Fricative + Liquid: yes
    if (this._isFricative(c1) && this._isLiquid(c2)) return true;
    // Fricative + Glide: yes
    if (this._isFricative(c1) && this._isGlide(c2)) return true;
    // Nasal + Glide: sometimes
    if (this._isNasal(c1) && this._isGlide(c2)) return this.random.bool(0.3);

    return false;
  }

  _isValidCodaCluster(c1, c2) {
    // Additional coda cluster constraints
    // Liquid + Stop: yes
    if (this._isLiquid(c1) && this._isStop(c2)) return true;
    // Liquid + Fricative: yes
    if (this._isLiquid(c1) && this._isFricative(c2)) return true;
    // Nasal + Stop: homorganic only
    if (this._isNasal(c1) && this._isStop(c2)) {
      return c1.place === c2.place;
    }
    // Nasal + Fricative: sometimes
    if (this._isNasal(c1) && this._isFricative(c2)) return this.random.bool(0.4);

    return false;
  }

  _generateClusterExamples(first, second) {
    const examples = [];
    const count = Math.min(4, first.length * second.length);

    for (let i = 0; i < count; i++) {
      const c1 = this.random.pick(first);
      const c2 = this.random.pick(second);
      examples.push(c1.roman + c2.roman);
    }

    return [...new Set(examples)].slice(0, 4);
  }

  _generateHomorganicClusters(nasals, stops) {
    const examples = [];

    for (const nasal of nasals) {
      for (const stop of stops) {
        if (nasal.place === stop.place) {
          examples.push(nasal.roman + stop.roman);
        }
      }
    }

    return examples.slice(0, 4);
  }

  _generateHarmonyExamples(harmonyType) {
    if (harmonyType === 'backness') {
      return ['Front: i-e-i, Back: u-o-u'];
    } else if (harmonyType === 'rounding') {
      return ['Rounded: u-o-ö, Unrounded: i-e-a'];
    } else {
      return ['High: i-u-i, Low: a-o-a'];
    }
  }

  // Public method to generate a valid syllable
  generateSyllable() {
    const consonants = this.phonology.consonants;
    const vowels = this.phonology.vowels;

    let syllable = '';

    // Generate onset
    const onsetLength = this.random.int(0, this.config.maxOnset);
    if (onsetLength === 1) {
      syllable += this.random.pick(consonants).roman;
    } else if (onsetLength >= 2) {
      // Find a valid cluster
      const validOnsets = this._generateAllowedClusters().filter(c => c.type === 'onset');
      if (validOnsets.length > 0) {
        syllable += this.random.pick(validOnsets).cluster;
      } else {
        syllable += this.random.pick(consonants).roman;
      }
    }

    // Generate nucleus (vowel)
    syllable += this.random.pick(vowels).roman;

    // Generate coda
    const codaLength = this.random.int(0, this.config.maxCoda);
    if (codaLength === 1) {
      const codaConsonants = this._selectCodaConsonants(consonants);
      if (codaConsonants.length > 0) {
        syllable += this.random.pick(codaConsonants).roman;
      }
    } else if (codaLength >= 2) {
      const validCodas = this._generateAllowedClusters().filter(c => c.type === 'coda');
      if (validCodas.length > 0) {
        syllable += this.random.pick(validCodas).cluster;
      } else {
        const codaConsonants = this._selectCodaConsonants(consonants);
        if (codaConsonants.length > 0) {
          syllable += this.random.pick(codaConsonants).roman;
        }
      }
    }

    return syllable;
  }

  // Generate a word of n syllables
  generateWord(syllableCount) {
    const syllables = [];
    for (let i = 0; i < syllableCount; i++) {
      syllables.push(this.generateSyllable());
    }
    return syllables.join('');
  }
}
