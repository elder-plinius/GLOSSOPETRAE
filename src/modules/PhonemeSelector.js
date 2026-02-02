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
    };
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

    // Apply aesthetic preferences
    return this._applyAestheticPreferences(inventory);
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
