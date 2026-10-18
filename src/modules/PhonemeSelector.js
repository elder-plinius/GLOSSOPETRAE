/**
 * GLOSSOPETRAE - Phoneme Selector Module
 *
 * Generates typologically plausible phoneme inventories respecting
 * linguistic universals and implicational hierarchies.
 */

import { CONSONANTS, VOWELS, getAllConsonants, getAllVowels, SONORITY } from '../data/phonemes.js';

export class PhonemeSelector {
  constructor(random, config = {}) {
    this.random = random;
    this.config = {
      // Inventory size preferences
      consonantCount: config.consonantCount || [15, 25],  // [min, max]
      vowelCount: config.vowelCount || [5, 7],

      // Feature toggles
      allowVoicedStops: config.allowVoicedStops ?? true,
      allowAffricates: config.allowAffricates ?? true,
      allowFricatives: config.allowFricatives ?? true,
      allowNasals: config.allowNasals ?? true,

      // Rarity thresholds
      rarityThreshold: config.rarityThreshold || 0.25,  // Include phonemes with freq > this

      // Aesthetic preferences
      preference: config.preference || 'balanced',  // 'harsh', 'flowing', 'balanced', 'exotic'

      // Divergence targets from English (optional)
      divergenceTargets: config.divergenceTargets || null,
    };

    // English consonants for reference (used in divergence calculations)
    this.englishConsonants = new Set(['p', 'b', 't', 'd', 'k', 'g', 'tʃ', 'dʒ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ', 'l', 'r', 'w', 'j']);
    this.englishVowels = new Set(['i', 'ɪ', 'e', 'ɛ', 'æ', 'ɑ', 'ɒ', 'ɔ', 'ʊ', 'u', 'ʌ', 'ə']);
  }

  generate() {
    const consonants = this._generateConsonants();
    const vowels = this._generateVowels();

    return {
      consonants,
      vowels,
      romanization: this._buildRomanization(consonants, vowels),
      sonorityScale: this._buildSonorityScale(consonants),
    };
  }

  _generateConsonants() {
    const inventory = [];
    const targetCount = this.random.int(this.config.consonantCount[0], this.config.consonantCount[1]);

    // Always include universal consonants first
    const universals = this._getUniversalConsonants();
    inventory.push(...universals);

    // Add stops (most languages have these)
    const stops = this._selectStops();
    for (const stop of stops) {
      if (!inventory.some(c => c.ipa === stop.ipa)) {
        inventory.push(stop);
      }
    }

    // Add nasals (implicational: if stops, usually nasals)
    if (this.config.allowNasals) {
      const nasals = this._selectNasals(inventory);
      inventory.push(...nasals.filter(n => !inventory.some(c => c.ipa === n.ipa)));
    }

    // Add fricatives
    if (this.config.allowFricatives) {
      const fricatives = this._selectFricatives();
      inventory.push(...fricatives.filter(f => !inventory.some(c => c.ipa === f.ipa)));
    }

    // Add affricates (implicational: needs stops + fricatives)
    if (this.config.allowAffricates && inventory.some(c => CONSONANTS.stops.some(s => s.ipa === c.ipa))) {
      const affricates = this._selectAffricates();
      inventory.push(...affricates.filter(a => !inventory.some(c => c.ipa === a.ipa)));
    }

    // Add liquids
    const liquids = this._selectLiquids();
    inventory.push(...liquids.filter(l => !inventory.some(c => c.ipa === l.ipa)));

    // Add glides
    const glides = this._selectGlides();
    inventory.push(...glides.filter(g => !inventory.some(c => c.ipa === g.ipa)));

    // Trim or expand to target count
    if (inventory.length > targetCount) {
      // Remove rarer phonemes first
      inventory.sort((a, b) => b.freq - a.freq);
      inventory.length = targetCount;
    } else if (inventory.length < targetCount) {
      // Add more phonemes from less common categories
      const remaining = this._getAdditionalConsonants(inventory, targetCount - inventory.length);
      inventory.push(...remaining);
    }

    // Apply divergence-based adjustments (before aesthetic preferences)
    let adjusted = this._applyDivergenceAdjustments(inventory);

    // Apply aesthetic preferences
    return this._applyAestheticPreferences(adjusted);
  }

  /**
   * Adjust consonant inventory based on divergence from English
   */
  _applyDivergenceAdjustments(consonants) {
    const targets = this.config.divergenceTargets;
    if (!targets) return consonants;

    let inventory = [...consonants];
    const consTargets = targets.consonants;

    // Calculate current English overlap
    const englishOverlap = inventory.filter(c => this.englishConsonants.has(c.ipa)).length / inventory.length;
    const targetOverlap = consTargets.englishOverlapTarget;

    // Adjust if needed to meet overlap target
    if (englishOverlap > targetOverlap + 0.15) {
      // Too English-like, replace some English consonants with non-English ones
      const all = getAllConsonants();
      const nonEnglish = all.filter(c =>
        !this.englishConsonants.has(c.ipa) &&
        !inventory.some(i => i.ipa === c.ipa) &&
        c.freq > 0.1
      );

      // Sort by frequency (prefer more common non-English sounds)
      nonEnglish.sort((a, b) => b.freq - a.freq);

      const englishInInventory = inventory.filter(c => this.englishConsonants.has(c.ipa));
      const nonEssential = englishInInventory.filter(c =>
        !['p', 't', 'k', 'm', 'n', 's'].includes(c.ipa)  // Keep universals
      );

      // Replace up to N English consonants
      const replaceCount = Math.min(
        Math.floor((englishOverlap - targetOverlap) * inventory.length),
        nonEssential.length,
        nonEnglish.length
      );

      for (let i = 0; i < replaceCount; i++) {
        const toRemove = nonEssential[i];
        const toAdd = nonEnglish[i];
        inventory = inventory.filter(c => c.ipa !== toRemove.ipa);
        inventory.push(toAdd);
      }
    }

    // Add exotic phonemes based on probability targets
    const exoticProbs = consTargets.exoticProbability;
    const all = getAllConsonants();

    // Uvulars
    if (exoticProbs.uvulars > 0 && this.random.bool(exoticProbs.uvulars)) {
      const uvulars = all.filter(c => c.place === 'uvular' && !inventory.some(i => i.ipa === c.ipa));
      if (uvulars.length > 0) {
        inventory.push(uvulars[Math.floor(this.random.next() * uvulars.length)]);
      }
    }

    // Pharyngeals
    if (exoticProbs.pharyngeals > 0 && this.random.bool(exoticProbs.pharyngeals)) {
      const pharyngeals = all.filter(c => c.place === 'pharyngeal' && !inventory.some(i => i.ipa === c.ipa));
      if (pharyngeals.length > 0) {
        inventory.push(pharyngeals[Math.floor(this.random.next() * pharyngeals.length)]);
      }
    }

    // Retroflexes
    if (exoticProbs.retroflexes > 0 && this.random.bool(exoticProbs.retroflexes)) {
      const retroflexes = all.filter(c => c.place === 'retroflex' && !inventory.some(i => i.ipa === c.ipa));
      if (retroflexes.length > 0) {
        const count = Math.min(2, Math.floor(this.random.next() * 3) + 1);
        const sample = this.random.sample(retroflexes, count);
        inventory.push(...sample);
      }
    }

    // Ejectives
    if (exoticProbs.ejectives > 0 && this.random.bool(exoticProbs.ejectives)) {
      const ejectives = all.filter(c => c.manner === 'ejective' && !inventory.some(i => i.ipa === c.ipa));
      if (ejectives.length > 0) {
        const count = Math.min(3, Math.floor(this.random.next() * 4) + 1);
        const sample = this.random.sample(ejectives, count);
        inventory.push(...sample);
      }
    }

    // Implosives
    if (exoticProbs.implosives > 0 && this.random.bool(exoticProbs.implosives)) {
      const implosives = all.filter(c => c.manner === 'implosive' && !inventory.some(i => i.ipa === c.ipa));
      if (implosives.length > 0) {
        const count = Math.min(2, Math.floor(this.random.next() * 3) + 1);
        const sample = this.random.sample(implosives, count);
        inventory.push(...sample);
      }
    }

    // Clicks (very high divergence only)
    if (exoticProbs.clicks > 0 && this.random.bool(exoticProbs.clicks)) {
      const clicks = all.filter(c => c.manner === 'click' && !inventory.some(i => i.ipa === c.ipa));
      if (clicks.length > 0) {
        const count = Math.min(3, Math.floor(this.random.next() * 4) + 2);
        const sample = this.random.sample(clicks, count);
        inventory.push(...sample);
      }
    }

    // Lateral fricatives
    if (exoticProbs.lateralFricatives > 0 && this.random.bool(exoticProbs.lateralFricatives)) {
      const lateralFrics = all.filter(c =>
        (c.ipa === 'ɬ' || c.ipa === 'ɮ') && !inventory.some(i => i.ipa === c.ipa)
      );
      if (lateralFrics.length > 0) {
        inventory.push(lateralFrics[Math.floor(this.random.next() * lateralFrics.length)]);
      }
    }

    // Check for required features
    if (consTargets.require && consTargets.require.length > 0) {
      for (const feature of consTargets.require) {
        // Already handled above, but ensure at least one exists
        const featurePhonemes = all.filter(c => {
          if (feature === 'ejectives') return c.manner === 'ejective';
          if (feature === 'clicks') return c.manner === 'click';
          if (feature === 'implosives') return c.manner === 'implosive';
          if (feature === 'uvulars') return c.place === 'uvular';
          if (feature === 'pharyngeals') return c.place === 'pharyngeal';
          if (feature === 'retroflexes') return c.place === 'retroflex';
          if (feature === 'palatals') return c.place === 'palatal';
          return false;
        });

        const hasFeature = inventory.some(c => featurePhonemes.some(f => f.ipa === c.ipa));
        if (!hasFeature && featurePhonemes.length > 0) {
          const toAdd = featurePhonemes.filter(f => !inventory.some(i => i.ipa === f.ipa));
          if (toAdd.length > 0) {
            inventory.push(toAdd[Math.floor(this.random.next() * toAdd.length)]);
          }
        }
      }
    }

    // Remove avoided features
    if (consTargets.avoid && consTargets.avoid.length > 0) {
      inventory = inventory.filter(c => {
        for (const feature of consTargets.avoid) {
          if (feature === 'clicks' && c.manner === 'click') return false;
          if (feature === 'ejectives' && c.manner === 'ejective') return false;
          if (feature === 'implosives' && c.manner === 'implosive') return false;
          if (feature === 'pharyngeals' && c.place === 'pharyngeal') return false;
        }
        return true;
      });
    }

    return inventory;
  }

  _getUniversalConsonants() {
    // These appear in nearly all languages
    const universals = [];

    // At least one bilabial stop
    universals.push(CONSONANTS.stops.find(s => s.place === 'bilabial' && s.voice === 'voiceless'));

    // At least one alveolar stop
    universals.push(CONSONANTS.stops.find(s => s.place === 'alveolar' && s.voice === 'voiceless'));

    // At least one velar stop
    universals.push(CONSONANTS.stops.find(s => s.place === 'velar' && s.voice === 'voiceless'));

    // /m/ and /n/
    universals.push(CONSONANTS.nasals.find(n => n.ipa === 'm'));
    universals.push(CONSONANTS.nasals.find(n => n.ipa === 'n'));

    return universals.filter(Boolean);
  }

  _selectStops() {
    const selected = [];
    const stops = [...CONSONANTS.stops];

    // Select voiceless stops based on frequency
    const voicelessStops = stops.filter(s => s.voice === 'voiceless');
    for (const stop of voicelessStops) {
      if (this.random.bool(stop.freq)) {
        selected.push(stop);
      }
    }

    // Select voiced counterparts if allowed
    if (this.config.allowVoicedStops) {
      const voicedStops = stops.filter(s => s.voice === 'voiced');
      for (const stop of voicedStops) {
        // Voiced stops imply voiceless at same place
        const hasVoiceless = selected.some(s => s.place === stop.place && s.voice === 'voiceless');
        if (hasVoiceless && this.random.bool(stop.freq)) {
          selected.push(stop);
        }
      }
    }

    return selected;
  }

  _selectNasals(currentInventory) {
    const selected = [];
    const nasals = [...CONSONANTS.nasals];

    // Nasals typically occur at same places as stops
    const stopPlaces = new Set(currentInventory.filter(c =>
      CONSONANTS.stops.some(s => s.ipa === c.ipa)
    ).map(c => c.place));

    for (const nasal of nasals) {
      // Higher probability if there's a stop at same place
      const hasStop = stopPlaces.has(nasal.place) || nasal.place === 'bilabial' || nasal.place === 'alveolar';
      const probability = hasStop ? nasal.freq : nasal.freq * 0.5;

      if (this.random.bool(probability)) {
        selected.push(nasal);
      }
    }

    return selected;
  }

  _selectFricatives() {
    const selected = [];
    const fricatives = [...CONSONANTS.fricatives];

    // /s/ is nearly universal
    const sibilant = fricatives.find(f => f.ipa === 's');
    if (sibilant && this.random.bool(0.95)) {
      selected.push(sibilant);
    }

    // /h/ is very common
    const glottalH = fricatives.find(f => f.ipa === 'h');
    if (glottalH && this.random.bool(0.75)) {
      selected.push(glottalH);
    }

    // Other fricatives based on frequency
    for (const fric of fricatives) {
      if (!selected.some(f => f.ipa === fric.ipa)) {
        if (fric.freq > this.config.rarityThreshold && this.random.bool(fric.freq)) {
          selected.push(fric);
        }
      }
    }

    return selected;
  }

  _selectAffricates() {
    const selected = [];
    const affricates = [...CONSONANTS.affricates];

    for (const aff of affricates) {
      if (this.random.bool(aff.freq * 0.8)) {
        selected.push(aff);
      }
    }

    return selected;
  }

  _selectLiquids() {
    const selected = [];
    const liquids = [...CONSONANTS.liquids];

    // Most languages have at least one liquid
    // Typically /l/ or /r/ or both
    const lateral = liquids.find(l => l.ipa === 'l');
    const rhotic = liquids.find(l => l.ipa === 'r');

    // At least one liquid in most languages
    if (this.random.bool(0.85)) {
      selected.push(lateral);
    }
    if (this.random.bool(0.75)) {
      selected.push(rhotic);
    }

    // Additional liquids less common
    for (const liq of liquids.filter(l => l.ipa !== 'l' && l.ipa !== 'r')) {
      if (this.random.bool(liq.freq * 0.5)) {
        selected.push(liq);
      }
    }

    return selected.filter(Boolean);
  }

  _selectGlides() {
    const selected = [];
    const glides = [...CONSONANTS.glides];

    // Most languages have /j/ (y) and/or /w/
    for (const glide of glides) {
      if (this.random.bool(glide.freq)) {
        selected.push(glide);
      }
    }

    return selected;
  }

  _getAdditionalConsonants(current, count) {
    const all = getAllConsonants();
    const available = all.filter(c =>
      !current.some(existing => existing.ipa === c.ipa) &&
      c.freq > this.config.rarityThreshold * 0.5
    );

    // Sort by frequency (prefer more common)
    available.sort((a, b) => b.freq - a.freq);

    return this.random.sample(available, Math.min(count, available.length));
  }

  _applyAestheticPreferences(consonants) {
    const preference = this.config.preference;

    if (preference === 'harsh') {
      // Favor stops, affricates, uvulars
      return consonants.filter(c => {
        if (c.place === 'uvular' || c.place === 'glottal') return true;
        if (CONSONANTS.stops.some(s => s.ipa === c.ipa)) return true;
        if (CONSONANTS.affricates.some(a => a.ipa === c.ipa)) return true;
        return this.random.bool(0.7);
      });
    } else if (preference === 'flowing') {
      // Favor nasals, liquids, glides, reduce stops
      return consonants.filter(c => {
        if (CONSONANTS.nasals.some(n => n.ipa === c.ipa)) return true;
        if (CONSONANTS.liquids.some(l => l.ipa === c.ipa)) return true;
        if (CONSONANTS.glides.some(g => g.ipa === c.ipa)) return true;
        return this.random.bool(0.6);
      });
    } else if (preference === 'exotic') {
      // Include rarer sounds
      const exotic = getAllConsonants().filter(c => c.freq < 0.3 && c.freq > 0.05);
      const additions = this.random.sample(exotic, 3);
      return [...consonants, ...additions.filter(a => !consonants.some(c => c.ipa === a.ipa))];
    }

    return consonants;
  }

  _generateVowels() {
    const inventory = [];
    const targetCount = this.random.int(this.config.vowelCount[0], this.config.vowelCount[1]);

    // Core vowels are nearly universal
    inventory.push(...VOWELS.core);

    // Add extended vowels if needed
    if (targetCount > 3) {
      const extended = [...VOWELS.extended];

      // /e/ and /o/ are very common in 5+ vowel systems
      if (targetCount >= 5) {
        const e = extended.find(v => v.ipa === 'e');
        const o = extended.find(v => v.ipa === 'o');
        if (e) inventory.push(e);
        if (o) inventory.push(o);
      }

      // Add more if needed
      const remaining = extended.filter(v => !inventory.some(i => i.ipa === v.ipa));
      remaining.sort((a, b) => b.freq - a.freq);

      while (inventory.length < targetCount && remaining.length > 0) {
        const next = remaining.shift();
        if (this.random.bool(next.freq)) {
          inventory.push(next);
        }
      }
    }

    // Trim if needed
    if (inventory.length > targetCount) {
      inventory.sort((a, b) => b.freq - a.freq);
      inventory.length = targetCount;
    }

    // Apply divergence-based vowel adjustments
    return this._applyVowelDivergence(inventory);
  }

  /**
   * Adjust vowel inventory based on divergence from English
   */
  _applyVowelDivergence(vowels) {
    const targets = this.config.divergenceTargets;
    if (!targets) return vowels;

    let inventory = [...vowels];
    const vowelTargets = targets.vowels;
    const all = getAllVowels();

    // Add nasal vowels if target says so
    if (vowelTargets.nasalVowelProb > 0 && this.random.bool(vowelTargets.nasalVowelProb)) {
      const nasalVowels = all.filter(v => v.nasal && !inventory.some(i => i.ipa === v.ipa));
      if (nasalVowels.length > 0) {
        const count = Math.min(3, Math.floor(this.random.next() * 4) + 2);
        const sample = this.random.sample(nasalVowels, Math.min(count, nasalVowels.length));
        inventory.push(...sample);
      }
    }

    // Add front rounded vowels (like French/German ü, ö)
    if (vowelTargets.frontRoundedProb > 0 && this.random.bool(vowelTargets.frontRoundedProb)) {
      const frontRounded = all.filter(v =>
        (v.ipa === 'y' || v.ipa === 'ø' || v.ipa === 'œ') &&
        !inventory.some(i => i.ipa === v.ipa)
      );
      if (frontRounded.length > 0) {
        const count = Math.min(2, Math.floor(this.random.next() * 3) + 1);
        const sample = this.random.sample(frontRounded, Math.min(count, frontRounded.length));
        inventory.push(...sample);
      }
    }

    // Adjust English overlap
    const englishOverlap = inventory.filter(v => this.englishVowels.has(v.ipa)).length / inventory.length;
    const targetOverlap = vowelTargets.englishOverlapTarget;

    if (englishOverlap > targetOverlap + 0.2) {
      // Too English-like, add some non-English vowels
      const nonEnglish = all.filter(v =>
        !this.englishVowels.has(v.ipa) &&
        !inventory.some(i => i.ipa === v.ipa) &&
        v.freq > 0.1
      );

      if (nonEnglish.length > 0) {
        const toAdd = Math.min(2, Math.floor((englishOverlap - targetOverlap) * inventory.length));
        const sample = this.random.sample(nonEnglish, toAdd);
        inventory.push(...sample);
      }
    }

    return inventory;
  }

  _buildRomanization(consonants, vowels) {
    const map = {};

    for (const c of consonants) {
      map[c.ipa] = c.roman;
    }

    for (const v of vowels) {
      map[v.ipa] = v.roman;
    }

    return map;
  }

  _buildSonorityScale(consonants) {
    const scale = {};

    for (const c of consonants) {
      // Determine sonority based on manner
      if (CONSONANTS.stops.some(s => s.ipa === c.ipa)) {
        scale[c.ipa] = SONORITY.stop;
      } else if (CONSONANTS.affricates.some(a => a.ipa === c.ipa)) {
        scale[c.ipa] = SONORITY.affricate;
      } else if (CONSONANTS.fricatives.some(f => f.ipa === c.ipa)) {
        scale[c.ipa] = SONORITY.fricative;
      } else if (CONSONANTS.nasals.some(n => n.ipa === c.ipa)) {
        scale[c.ipa] = SONORITY.nasal;
      } else if (CONSONANTS.liquids.some(l => l.ipa === c.ipa)) {
        scale[c.ipa] = SONORITY.liquid;
      } else if (CONSONANTS.glides.some(g => g.ipa === c.ipa)) {
        scale[c.ipa] = SONORITY.glide;
      }
    }

    return scale;
  }

  // Get manner category for a consonant
  getConsonantCategory(consonant) {
    const ipa = typeof consonant === 'string' ? consonant : consonant.ipa;

    for (const [category, list] of Object.entries(CONSONANTS)) {
      if (list.some(c => c.ipa === ipa)) {
        return category;
      }
    }
    return null;
  }
}
