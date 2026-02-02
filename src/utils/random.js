/**
 * GLOSSOPETRAE - Seeded Random Number Generator
 * Uses Mulberry32 for deterministic generation from seed
 */

export class SeededRandom {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.state = seed;
  }

  // Mulberry32 PRNG
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Random integer in range [min, max]
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Random float in range [min, max]
  float(min, max) {
    return this.next() * (max - min) + min;
  }

  // Random boolean with probability p
  bool(p = 0.5) {
    return this.next() < p;
  }

  // Pick random element from array
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }

  // Pick n random elements from array (without replacement)
  sample(arr, n) {
    const copy = [...arr];
    const result = [];
    for (let i = 0; i < Math.min(n, copy.length); i++) {
      const idx = Math.floor(this.next() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  // Weighted random selection
  weightedPick(items) {
    // items is array of [value, weight] pairs
    const totalWeight = items.reduce((sum, [, w]) => sum + w, 0);
    let random = this.next() * totalWeight;
    for (const [value, weight] of items) {
      random -= weight;
      if (random <= 0) return value;
    }
    return items[items.length - 1][0];
  }

  // Shuffle array in place
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// String hashing for seed generation
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
