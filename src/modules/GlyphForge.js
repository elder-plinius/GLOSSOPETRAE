/**
 * GLOSSOPETRAE - GlyphForge Module
 *
 * Procedural SVG glyph generation for generated writing systems.
 * Turns a ScriptGenerator specification (script type, aesthetic, direction,
 * character inventory) into an actual, renderable script:
 *
 * - A per-language "style genome" (stroke weight, slant, proportions,
 *   terminals, preferred primitives) keeps every glyph in one visual family.
 * - The 8 script aesthetics map to hard constraint sets on the primitive
 *   library (angular = straight 0/45/90 strokes, curved = cubic beziers,
 *   blocky = frames + internal detail, organic = deterministic wobble...).
 * - Featural intelligence: same place of articulation shares a base form,
 *   voicing adds a consistent mark, manners add consistent modifiers.
 *   Strict for featural scripts, probabilistic (~65%) elsewhere.
 * - Script-type semantics: alphabets, abjads (vowel diacritics), abugidas
 *   (inherent vowel + modifiers + virama), syllabaries (CV families),
 *   featural composition, and logographic (semantic radicals per field).
 * - Word/text rendering with a longest-match-first romanization parser and
 *   full direction support (ltr, rtl, ttb, ttb-rtl, boustrophedon).
 *
 * Fully deterministic: the same language seed always produces identical
 * glyphs. Zero dependencies, no DOM — all SVG is returned as strings.
 */

import { SeededRandom, hashString } from '../utils/random.js';

// ---------------------------------------------------------------------------
// Design-space constants (all glyphs live in a 100x100 viewBox)
// ---------------------------------------------------------------------------

const BASELINE = 80;
const KAPPA = 0.5522847498307936; // circle-from-cubics constant

const PLACES = [
  'bilabial', 'labiodental', 'dental', 'alveolar', 'postalveolar',
  'retroflex', 'palatal', 'velar', 'labiovelar', 'uvular', 'pharyngeal', 'glottal',
];

const HEIGHTS = ['close', 'near-close', 'close-mid', 'mid', 'open-mid', 'near-open', 'open'];

const NASAL_IPA = new Set(['m', 'ɱ', 'n', 'ɳ', 'ɲ', 'ŋ', 'ɴ']);
const FRICATIVE_IPA = new Set([
  'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'ʂ', 'ʐ', 'ç', 'x', 'ɣ',
  'χ', 'ʁ', 'ħ', 'ʕ', 'h', 'ɦ', 'ɸ', 'β', 'ɬ', 'ɮ',
]);
const GLIDE_IPA = new Set(['w', 'j', 'ɥ', 'ɰ']);

// Aesthetic -> allowed primitives. `spine` = main structural strokes,
// `weights` = [primitive, weight] pairs for satellite strokes.
const AESTHETIC_PRIMS = {
  angular: {
    spine: ['vbar', 'diag', 'zig', 'branch'],
    weights: [['vbar', 3], ['hbar', 2], ['diag', 3], ['zig', 1.5], ['branch', 2], ['cross', 1.5], ['dot', 0.4]],
  },
  curved: {
    spine: ['arc', 'hook', 'wave'],
    weights: [['arc', 3], ['hook', 2.5], ['loop', 2], ['wave', 2], ['vbar', 0.6], ['dot', 0.8]],
  },
  geometric: {
    spine: ['loop', 'tri', 'vbar', 'rect'],
    weights: [['loop', 2], ['tri', 2], ['rect', 1.4], ['vbar', 2], ['hbar', 2], ['diag', 1], ['dot', 1.2], ['cross', 1]],
  },
  calligraphic: {
    spine: ['vbar', 'hook', 'wave'],
    weights: [['vbar', 2.5], ['hook', 2.2], ['arc', 2], ['wave', 1.6], ['hbar', 1.4], ['diag', 1], ['dot', 0.8]],
  },
  blocky: {
    spine: ['vbar', 'rect', 'hbar'],
    weights: [['vbar', 3], ['hbar', 3], ['cross', 2], ['rect', 1.2], ['diag', 0.9], ['dot', 0.6], ['hook', 0.5]],
  },
  circular: {
    spine: ['loop', 'arc'],
    weights: [['loop', 3], ['arc', 3], ['hook', 1.6], ['dot', 1.3], ['vbar', 0.6], ['wave', 0.8]],
  },
  linear: {
    spine: ['vbar', 'hbar', 'diag'],
    weights: [['vbar', 3], ['hbar', 2.5], ['diag', 2.2], ['cross', 1.6], ['dot', 0.4]],
  },
  organic: {
    spine: ['wave', 'arc', 'hook'],
    weights: [['wave', 2.2], ['arc', 2], ['hook', 1.8], ['diag', 1.4], ['loop', 1.2], ['vbar', 1], ['dot', 1], ['zig', 1]],
  },
};

// Primitives small enough to serve as diacritics / modifiers
const MINI_PRIMS = ['hbar', 'vbar', 'diag', 'dot', 'arc', 'cross'];

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function rnd2(n) {
  return Math.round(n * 100) / 100;
}

function clampPos(u) {
  return Math.min(0.92, Math.max(0.08, u));
}

/** Serialize segment arrays (['M',x,y] | ['L',x,y] | ['C',...6] | ['Z']) to a path d string. */
function segsToD(segs) {
  let d = '';
  for (const s of segs) {
    if (s[0] === 'Z') { d += 'Z'; continue; }
    d += s[0] + s.slice(1).map(n => rnd2(n)).join(' ') + ' ';
  }
  return d.trim();
}

/** Apply fn(x, y) -> [x, y] to every coordinate pair in a segment list. */
function transformSegs(segs, fn) {
  return segs.map(s => {
    if (s[0] === 'Z') return s;
    const out = [s[0]];
    for (let i = 1; i < s.length; i += 2) {
      const [x, y] = fn(s[i], s[i + 1]);
      out.push(x, y);
    }
    return out;
  });
}

/** Closed ellipse approximated with four cubic beziers (shear-safe, unlike `A`). */
function circleSegs(cx, cy, rx, ry) {
  const kx = KAPPA * rx;
  const ky = KAPPA * ry;
  return [
    ['M', cx + rx, cy],
    ['C', cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry],
    ['C', cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy],
    ['C', cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry],
    ['C', cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy],
    ['Z'],
  ];
}

/** Elliptical arc from angle a0 to a1 (radians) as cubic beziers. */
function arcSegs(cx, cy, rx, ry, a0, a1) {
  const segs = [['M', cx + rx * Math.cos(a0), cy + ry * Math.sin(a0)]];
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2)));
  const da = (a1 - a0) / n;
  const k = (4 / 3) * Math.tan(da / 4);
  let a = a0;
  for (let i = 0; i < n; i++) {
    const b = a + da;
    const cA = Math.cos(a), sA = Math.sin(a), cB = Math.cos(b), sB = Math.sin(b);
    segs.push(['C',
      cx + rx * (cA - k * sA), cy + ry * (sA + k * cA),
      cx + rx * (cB + k * sB), cy + ry * (sB - k * cB),
      cx + rx * cB, cy + ry * sB,
    ]);
    a = b;
  }
  return segs;
}

/** Sub-box of `box` given normalized zone {u0,v0,u1,v1}. */
function subBox(box, z) {
  const W = box.x1 - box.x0;
  const H = box.y1 - box.y0;
  return {
    x0: box.x0 + z.u0 * W, y0: box.y0 + z.v0 * H,
    x1: box.x0 + z.u1 * W, y1: box.y0 + z.v1 * H,
  };
}

// ---------------------------------------------------------------------------
// GlyphForge
// ---------------------------------------------------------------------------

export class GlyphForge {
  /**
   * @param {object} language - A fully generated GLOSSOPETRAE language object.
   *   Requires language.seed, language.phonology and language.script.
   *   All glyph generation happens up front, deterministically.
   */
  constructor(language) {
    if (!language || typeof language !== 'object') {
      throw new Error('GlyphForge requires a generated language object');
    }
    this.language = language;
    this.seed = language.seed ?? 0;
    this.script = language.script || {};
    this.phonology = language.phonology || { consonants: [], vowels: [] };
    this.scriptType = this.script.type || 'alphabet';

    // script.aesthetic may be a details object ({name: 'Blocky', ...}) or a
    // raw config string ('angular') depending on how the language was built.
    const aes = this.script.aesthetic;
    this.aestheticKey = (typeof aes === 'string' ? aes : (aes && aes.name) || 'linear').toLowerCase();
    if (!AESTHETIC_PRIMS[this.aestheticKey]) this.aestheticKey = 'linear';

    /** @type {Map<string, object>} key -> glyph record */
    this.glyphs = new Map();
    this._pathSet = new Set();          // exact svgPath uniqueness
    this._buckets = new Map();          // strokeCount -> [glyph] for similarity checks
    this._placeBases = new Map();       // place of articulation -> recipe
    this._mannerMods = new Map();       // manner class -> recipe
    this._logoIndex = new Map();        // lowercased lemma -> glyph key

    this.genome = this._buildGenome();
    this._parser = this._buildParser();
    this._buildAll();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** The per-language style parameters (for display/debug). */
  getStyleGenome() {
    return this.genome;
  }

  /**
   * Full glyph table.
   * @returns {Array<{key, roman, ipa, role, svgPath, strokes}>}
   *   svgPath = joined path `d` strings in a 100x100 viewBox;
   *   strokes = [{d, w, fill}] (w = stroke-width multiplier, fill = filled shape).
   */
  getGlyphTable() {
    const table = [];
    for (const g of this.glyphs.values()) {
      table.push({
        key: g.key,
        roman: g.roman,
        ipa: g.ipa,
        role: g.role,
        svgPath: g.svgPath,
        strokes: g.strokes,
        advance: g.advance,
      });
    }
    return table;
  }

  /**
   * Standalone SVG for one glyph.
   * @param {string} key - glyph key from getGlyphTable()
   * @param {object} opts - {size=48, color='currentColor', strokeWidth=1}
   */
  renderGlyphSVG(key, opts = {}) {
    const g = this.glyphs.get(key);
    if (!g) throw new Error(`GlyphForge: unknown glyph key "${key}"`);
    const size = opts.size ?? 48;
    const body = this._glyphMarkup(g, 0, 0, opts, false);
    return this._svgOpen(100, 100, size, size, opts) + body + '</svg>';
  }

  /**
   * Render one romanized word in the native script.
   * @param {string} romanWord
   * @param {object} opts - {size=48, color='currentColor', strokeWidth=1, direction}
   */
  renderWord(romanWord, opts = {}) {
    const size = opts.size ?? 48;
    const dir = opts.direction || (this.script.direction && this.script.direction.code) || 'ltr';
    const units = this._wordToUnits(romanWord);
    const vertical = dir === 'ttb' || dir === 'ttb-rtl';
    const placed = [];
    let cursor = 4;
    const order = dir === 'rtl' && !vertical ? [...units].reverse() : units;
    for (const unit of order) {
      const adv = this._unitAdvance(unit);
      if (vertical) {
        placed.push({ unit, x: 0, y: cursor });
      } else {
        placed.push({ unit, x: cursor, y: 0 });
      }
      cursor += adv;
    }
    const span = cursor + 4;
    const w = vertical ? 100 : span;
    const h = vertical ? span : 100;
    let body = '';
    for (const p of placed) body += this._unitMarkup(p.unit, p.x, p.y, opts, false);
    return this._svgOpen(w, h, rnd2(size * (w / 100)), rnd2(size * (h / 100)), opts) + body + '</svg>';
  }

  /**
   * Render multi-word text: word spacing, punctuation, direction handling
   * (ltr, rtl, ttb, ttb-rtl, boustrophedon) and wrapping at opts.maxWidth (px).
   * @param {string} romanText
   * @param {object} opts - {size=48, color, strokeWidth, maxWidth=640, maxHeight, direction}
   */
  renderText(romanText, opts = {}) {
    const size = opts.size ?? 48;
    const dir = opts.direction || (this.script.direction && this.script.direction.code) || 'ltr';
    const g = this.genome;
    const unitScale = size / 100;
    const maxUnits = Math.max(140, ((opts.maxWidth ?? 640) / unitScale));
    const maxColUnits = Math.max(140, ((opts.maxHeight ?? opts.maxWidth ?? 640) / unitScale));

    // Tokenize: words + trailing punctuation
    const rawWords = String(romanText).split(/\s+/).filter(Boolean);
    const items = [];
    for (const raw of rawWords) {
      const m = raw.match(/^['’]?[\p{L}\p{N}'’-]*/u);
      const word = (m && m[0]) || '';
      const tail = raw.slice(word.length);
      const segs = [];
      if (word) segs.push({ kind: 'word', units: this._wordToUnits(word) });
      for (const ch of tail) {
        const pk = this._punctKey(ch);
        if (pk) segs.push({ kind: 'punct', units: [{ main: pk, marks: [] }] });
      }
      for (const seg of segs) {
        seg.width = seg.units.reduce((s, u) => s + this._unitAdvance(u), 0);
        if (seg.units.length) items.push(seg);
      }
    }

    const lineAdv = 112 + g.lineGap;
    const vertical = dir === 'ttb' || dir === 'ttb-rtl';
    const limit = vertical ? maxColUnits : maxUnits;

    // Greedy line/column breaking
    const lines = [];
    let line = [];
    let lineW = 0;
    for (const item of items) {
      const extra = (line.length ? g.wordGap : 0) + item.width;
      if (line.length && lineW + extra > limit) {
        lines.push({ items: line, width: lineW });
        line = [];
        lineW = 0;
      }
      lineW += (line.length ? g.wordGap : 0) + item.width;
      line.push(item);
    }
    if (line.length) lines.push({ items: line, width: lineW });
    if (!lines.length) lines.push({ items: [], width: 0 });

    const maxLineW = Math.max(60, ...lines.map(l => l.width));
    const placed = [];

    lines.forEach((ln, li) => {
      let lineDir = dir;
      if (dir === 'boustrophedon') lineDir = li % 2 === 0 ? 'ltr' : 'rtl';
      const mirror = dir === 'boustrophedon' && li % 2 === 1;
      let cursor = 6;
      for (const item of ln.items) {
        for (const unit of item.units) {
          const adv = this._unitAdvance(unit);
          if (vertical) {
            const colX = dir === 'ttb-rtl' ? (lines.length - 1 - li) * lineAdv : li * lineAdv;
            placed.push({ unit, x: colX, y: cursor, mirror: false });
          } else if (lineDir === 'rtl') {
            placed.push({ unit, x: 6 + maxLineW - cursor - adv + 6, y: li * lineAdv, mirror });
          } else {
            placed.push({ unit, x: cursor, y: li * lineAdv, mirror });
          }
          cursor += adv;
        }
        cursor += g.wordGap;
      }
    });

    const w = vertical ? lines.length * lineAdv + 12 : maxLineW + 24;
    const h = vertical ? Math.max(...lines.map(l => l.width), 60) + 24 : (lines.length - 1) * lineAdv + 112;
    let body = '';
    for (const p of placed) body += this._unitMarkup(p.unit, p.x, p.y, opts, p.mirror);
    return this._svgOpen(w, h, rnd2(size * (w / 100)), rnd2(size * (h / 100)), opts) + body + '</svg>';
  }

  // -------------------------------------------------------------------------
  // Style genome
  // -------------------------------------------------------------------------

  _rngFor(label) {
    return new SeededRandom((Math.imul(this.seed, 31) + hashString(String(label))) >>> 0);
  }

  _buildGenome() {
    const rng = this._rngFor('genome');
    const a = this.aestheticKey;

    const bodyH = rng.int(40, 54);
    const genome = {
      aesthetic: a,
      scriptType: this.scriptType,
      baseline: BASELINE,
      bodyTop: BASELINE - bodyH,
      bodyHeight: bodyH,
      strokeWidth: 5,
      widthContrast: 1,     // horizontal/vertical stroke weight ratio (calligraphic)
      linecap: 'round',
      linejoin: 'round',
      slant: 0,             // degrees, positive = italic lean
      grid: 0,              // >0 = snap stroke positions to an N-division grid
      jitter: 0,            // deterministic hand-drawn coordinate noise
      wobble: false,        // straight lines become gentle curves
      terminals: 'blunt',   // blunt | round | flared | dotted
      terminalProb: rnd2(rng.float(0.35, 0.75)),
      symmetry: 'none',
      symmetryProb: 0,
      decorationProb: rnd2(rng.float(0.1, 0.35)),
      featuralCoherence: this.scriptType === 'featural' ? 1 : rnd2(rng.float(0.6, 0.7)),
      strokeRange: {
        consonant: [2, 4], vowel: [1, 3], syllableBase: [2, 3],
        diacritic: [1, 2], logogram: [4, 7], numeral: [1, 3], punctuation: [1, 2],
      },
    };

    if (a === 'angular') {
      genome.strokeWidth = rnd2(rng.float(4.5, 6.5));
      genome.linecap = 'square'; genome.linejoin = 'miter';
      genome.grid = 4;
      genome.terminals = rng.pick(['blunt', 'flared']);
    } else if (a === 'curved') {
      genome.strokeWidth = rnd2(rng.float(5, 7));
      genome.slant = rnd2(rng.float(-4, 4));
      genome.jitter = 0.4;
      genome.terminals = 'round';
    } else if (a === 'geometric') {
      genome.strokeWidth = rnd2(rng.float(4, 5.5));
      genome.linecap = 'butt'; genome.linejoin = 'miter';
      genome.grid = 4;
      genome.symmetry = 'vertical'; genome.symmetryProb = rnd2(rng.float(0.35, 0.6));
      genome.terminals = rng.pick(['blunt', 'dotted']);
    } else if (a === 'calligraphic') {
      genome.strokeWidth = rnd2(rng.float(6, 8));
      genome.widthContrast = rnd2(rng.float(0.4, 0.55));
      genome.slant = rnd2(rng.float(3, 10));
      genome.jitter = 0.5;
      genome.terminals = rng.pick(['round', 'flared']);
    } else if (a === 'blocky') {
      genome.strokeWidth = rnd2(rng.float(6, 8.5));
      genome.linecap = 'butt'; genome.linejoin = 'miter';
      genome.grid = 4;
      genome.terminals = 'blunt';
    } else if (a === 'circular') {
      genome.strokeWidth = rnd2(rng.float(4.5, 6));
      genome.terminals = 'round';
      genome.symmetry = 'vertical'; genome.symmetryProb = rnd2(rng.float(0.2, 0.4));
    } else if (a === 'linear') {
      genome.strokeWidth = rnd2(rng.float(3.5, 4.5));
      genome.linecap = 'butt'; genome.linejoin = 'miter';
      genome.grid = 4;
      genome.terminals = rng.pick(['blunt', 'dotted']);
      genome.strokeRange.consonant = [2, 3];
      genome.strokeRange.logogram = [4, 6];
    } else if (a === 'organic') {
      genome.strokeWidth = rnd2(rng.float(4.5, 6.5));
      genome.slant = rnd2(rng.float(-3, 3));
      genome.jitter = rnd2(rng.float(2.2, 3.4));
      genome.wobble = true;
      genome.terminals = 'round';
    }

    // Block frame: blocky always, calligraphic sometimes (headline = Devanagari feel)
    genome.blockFrame = null;
    if (a === 'blocky') genome.blockFrame = rng.pick(['headline', 'frame', 'stem']);
    else if (a === 'calligraphic' && rng.bool(0.4)) genome.blockFrame = 'headline';

    // Featural composition zones (consistent per language)
    genome.mannerCorner = rng.pick(['tr', 'tl', 'br', 'bl']);
    genome.voiceMark = rng.pick(['dot', 'hbar', 'diag']);

    // Vowel scheme: which spine orientation encodes which backness, etc.
    genome.vowelAxes = rng.shuffle(['v', 'h', 'd']);
    genome.vowelTickSide = rng.pick([1, -1]);
    genome.roundMark = rng.pick(['dot', 'loop']);

    // Diacritic placement preferences
    genome.diacriticPos = rng.weightedPick([['above', 3], ['below', 2], ['right', 1]]);
    genome.syllVowelZone = rng.weightedPick([['right', 2], ['above', 2], ['below', 1]]);
    genome.radicalPos = rng.pick(['left', 'top']);

    // Spacing
    genome.letterSpace = rng.int(0, 8);
    genome.wordGap = rng.int(36, 52);
    genome.lineGap = rng.int(4, 20);

    return genome;
  }

  // -------------------------------------------------------------------------
  // Primitive sampling (recipe params, normalized 0..1) and realization
  // -------------------------------------------------------------------------

  _gpos(rng) {
    if (this.genome.grid) return rng.int(1, this.genome.grid - 1) / this.genome.grid;
    return rnd2(rng.float(0.12, 0.88));
  }

  _samplePrim(rng, id, variant = {}) {
    const g = this.genome;
    switch (id) {
      case 'vbar': {
        const u = variant.spine ? rng.pick([0.25, 0.5, 0.5, 0.75]) : clampPos(this._gpos(rng));
        let v0 = 0, v1 = 1;
        if (!variant.spine && rng.bool(0.35)) { if (rng.bool()) v0 = 0.5; else v1 = 0.5; }
        return { id, u, v0, v1 };
      }
      case 'hbar': {
        const v = variant.spine ? rng.pick([0.25, 0.5, 0.75]) : clampPos(this._gpos(rng));
        let u0 = 0, u1 = 1;
        if (!variant.spine && rng.bool(0.4)) { if (rng.bool()) u0 = 0.5; else u1 = 0.5; }
        return { id, v, u0, u1 };
      }
      case 'diag': {
        if (g.grid) {
          const pts = [[0, 0], [0.5, 0], [1, 0], [0, 1], [0.5, 1], [1, 1], [0, 0.5], [1, 0.5]];
          let a = rng.pick(pts);
          let b = rng.pick(pts);
          let guard = 0;
          while (Math.abs(b[0] - a[0]) < 0.5 && Math.abs(b[1] - a[1]) < 0.5 && guard++ < 8) b = rng.pick(pts);
          return { id, u0: a[0], v0: a[1], u1: b[0], v1: b[1] };
        }
        let u0 = rnd2(rng.float(0, 0.3));
        let v0 = rnd2(rng.float(0, 0.35));
        let u1 = rnd2(rng.float(0.7, 1));
        let v1 = rnd2(rng.float(0.65, 1));
        if (rng.bool()) { const t = v0; v0 = v1; v1 = t; }
        return { id, u0, v0, u1, v1 };
      }
      case 'cross': {
        const v = rng.pick([0.25, 0.5, 0.5, 0.75]);
        const half = rng.pick([0.2, 0.3]);
        return { id, v, half };
      }
      case 'zig': {
        const n = rng.int(3, 4);
        const pts = [];
        for (let i = 0; i <= n; i++) {
          pts.push([i / n, i % 2 === 0 ? rnd2(rng.float(0.55, 1)) : rnd2(rng.float(0, 0.45))]);
        }
        return { id, pts };
      }
      case 'branch': {
        const u = rng.pick([0.25, 0.5]);
        const bv = rng.pick([0.25, 0.5]);
        const tu = rng.pick([0.85, 1]);
        const tv = Math.max(0, bv - rng.pick([0.25, 0.4]));
        const twin = rng.bool(0.4);
        return { id, u, bv, tu, tv, twin };
      }
      case 'arc': {
        const cx = rnd2(rng.float(0.3, 0.7));
        const cy = rnd2(rng.float(0.3, 0.7));
        const r = rnd2(rng.float(0.45, 0.85));
        const a0 = rng.int(0, 7) * (Math.PI / 4);
        const sweep = rng.pick([Math.PI / 2, Math.PI, Math.PI, Math.PI * 1.5]) * rng.pick([1, -1]);
        return { id, cx, cy, r, a0, sweep };
      }
      case 'hook': {
        const u = rng.pick([0.3, 0.5, 0.7]);
        const side = rng.pick([1, -1]);
        const curl = rnd2(rng.float(0.3, 0.45));
        return { id, u, side, curl };
      }
      case 'loop': {
        const r = rnd2(rng.float(0.18, 0.42));
        const cx = rnd2(rng.float(r + 0.05, 0.95 - r));
        const cy = rnd2(rng.float(r + 0.05, 0.95 - r));
        return { id, cx, cy, r };
      }
      case 'wave': {
        const horiz = rng.bool(0.6);
        const amp = rnd2(rng.float(0.25, 0.5));
        const at = rng.pick([0.35, 0.5, 0.65]);
        return { id, horiz, amp, at };
      }
      case 'tri': {
        const up = rng.bool();
        return { id, up };
      }
      case 'rect': {
        const open = rng.pick([0, 0, 1, 2, 3, 4]); // 0 = closed, else open side
        const inset = rng.pick([0, 0, 0.15]);
        return { id, open, inset };
      }
      case 'dot': {
        const u = clampPos(this._gpos(rng));
        const v = clampPos(this._gpos(rng));
        const r = rnd2(rng.float(2.6, 3.8));
        return { id, u, v, r };
      }
      default:
        return { id: 'dot', u: 0.5, v: 0.5, r: 3 };
    }
  }

  /** Mirror a primitive's params across the vertical axis (for symmetry). */
  _mirrorPrim(p) {
    switch (p.id) {
      case 'vbar': return { ...p, u: rnd2(1 - p.u) };
      case 'diag': return { ...p, u0: rnd2(1 - p.u0), u1: rnd2(1 - p.u1) };
      case 'dot': return { ...p, u: rnd2(1 - p.u) };
      case 'loop': return { ...p, cx: rnd2(1 - p.cx) };
      case 'hook': return { ...p, u: rnd2(1 - p.u), side: -p.side };
      case 'arc': return { ...p, cx: rnd2(1 - p.cx), a0: Math.PI - p.a0, sweep: -p.sweep };
      case 'branch': return { ...p, u: rnd2(1 - p.u), tu: rnd2(1 - p.tu) };
      default: return null;
    }
  }

  _realizePrim(p, box) {
    const W = box.x1 - box.x0;
    const H = box.y1 - box.y0;
    const pt = (u, v) => [box.x0 + u * W, box.y0 + v * H];
    switch (p.id) {
      case 'vbar': {
        const [x, y0] = pt(p.u, p.v0);
        const [, y1] = pt(p.u, p.v1);
        return { id: p.id, segs: [['M', x, y0], ['L', x, y1]], anchors: [[x, y0], [x, y1]] };
      }
      case 'hbar': {
        const [x0, y] = pt(p.u0, p.v);
        const [x1] = pt(p.u1, p.v);
        return { id: p.id, segs: [['M', x0, y], ['L', x1, y]], anchors: [[x0, y], [x1, y]] };
      }
      case 'diag': {
        const [x0, y0] = pt(p.u0, p.v0);
        const [x1, y1] = pt(p.u1, p.v1);
        return { id: p.id, segs: [['M', x0, y0], ['L', x1, y1]], anchors: [[x0, y0], [x1, y1]] };
      }
      case 'cross': {
        const [x0, y] = pt(0.5 - p.half, p.v);
        const [x1] = pt(0.5 + p.half, p.v);
        return { id: p.id, segs: [['M', x0, y], ['L', x1, y]], anchors: [[x0, y], [x1, y]] };
      }
      case 'zig': {
        const segs = [];
        const anchors = [];
        p.pts.forEach(([u, v], i) => {
          const [x, y] = pt(u, v);
          segs.push([i === 0 ? 'M' : 'L', x, y]);
          anchors.push([x, y]);
        });
        return { id: p.id, segs, anchors };
      }
      case 'branch': {
        const [x, yTop] = pt(p.u, 0);
        const [, yBot] = pt(p.u, 1);
        const [, yB] = pt(p.u, p.bv);
        const [tx, ty] = pt(p.tu, p.tv);
        const segs = [['M', x, yTop], ['L', x, yBot], ['M', x, yB], ['L', tx, ty]];
        const anchors = [[x, yTop], [x, yBot], [tx, ty]];
        if (p.twin) {
          const [tx2, ty2] = pt(2 * p.u - p.tu, p.tv);
          segs.push(['M', x, yB], ['L', tx2, ty2]);
          anchors.push([tx2, ty2]);
        }
        return { id: p.id, segs, anchors };
      }
      case 'arc': {
        const cx = box.x0 + p.cx * W;
        const cy = box.y0 + p.cy * H;
        const rx = p.r * W * 0.5;
        const ry = p.r * H * 0.5;
        const segs = arcSegs(cx, cy, rx, ry, p.a0, p.a0 + p.sweep);
        const first = segs[0];
        const last = segs[segs.length - 1];
        return {
          id: p.id, segs,
          anchors: [[first[1], first[2]], [last[last.length - 2], last[last.length - 1]], [cx, cy]],
        };
      }
      case 'hook': {
        const [x, y0] = pt(p.u, 0);
        const [, yMid] = pt(p.u, 0.55);
        const [, yBot] = pt(p.u, 1);
        const xEnd = x + p.side * p.curl * W;
        const segs = [
          ['M', x, y0],
          ['L', x, yMid],
          ['C', x, yBot, x + p.side * p.curl * W * 0.55, yBot, xEnd, yBot - H * 0.12],
        ];
        return { id: p.id, segs, anchors: [[x, y0], [xEnd, yBot - H * 0.12]] };
      }
      case 'loop': {
        const cx = box.x0 + p.cx * W;
        const cy = box.y0 + p.cy * H;
        const segs = circleSegs(cx, cy, p.r * W, p.r * H);
        return { id: p.id, segs, anchors: [[cx, cy], [cx + p.r * W, cy], [cx, cy - p.r * H]] };
      }
      case 'wave': {
        let segs, anchors;
        if (p.horiz) {
          const [x0, y] = pt(0, p.at);
          const [x1] = pt(1, p.at);
          const dy = p.amp * H;
          segs = [['M', x0, y], ['C', x0 + W * 0.33, y - dy, x1 - W * 0.33, y + dy, x1, y]];
          anchors = [[x0, y], [x1, y]];
        } else {
          const [x, y0] = pt(p.at, 0);
          const [, y1] = pt(p.at, 1);
          const dx = p.amp * W;
          segs = [['M', x, y0], ['C', x - dx, y0 + H * 0.33, x + dx, y1 - H * 0.33, x, y1]];
          anchors = [[x, y0], [x, y1]];
        }
        return { id: p.id, segs, anchors };
      }
      case 'tri': {
        const pts = p.up
          ? [pt(0.5, 0), pt(1, 1), pt(0, 1)]
          : [pt(0, 0), pt(1, 0), pt(0.5, 1)];
        const segs = [['M', ...pts[0]], ['L', ...pts[1]], ['L', ...pts[2]], ['Z']];
        return { id: p.id, segs, anchors: pts };
      }
      case 'rect': {
        const i = p.inset || 0;
        const corners = [pt(i, i), pt(1 - i, i), pt(1 - i, 1 - i), pt(i, 1 - i)];
        const segs = [];
        if (p.open === 0) {
          segs.push(['M', ...corners[0]], ['L', ...corners[1]], ['L', ...corners[2]], ['L', ...corners[3]], ['Z']);
        } else {
          // start after the open side, draw the three remaining sides
          const start = p.open % 4;
          segs.push(['M', ...corners[start]]);
          for (let k = 1; k <= 3; k++) segs.push(['L', ...corners[(start + k) % 4]]);
        }
        return { id: p.id, segs, anchors: corners };
      }
      case 'dot': {
        const [x, y] = pt(p.u, p.v);
        return { id: p.id, segs: circleSegs(x, y, p.r, p.r), anchors: [[x, y]], fill: true };
      }
      default:
        return { id: 'dot', segs: circleSegs(50, 50, 3, 3), anchors: [[50, 50]], fill: true };
    }
  }

  /** Sample a recipe (list of prim params) honoring the aesthetic constraint set. */
  _sampleRecipe(rng, count, { spineFirst = true, miniOnly = false } = {}) {
    const g = this.genome;
    const prims = AESTHETIC_PRIMS[this.aestheticKey];
    const recipe = [];
    let dots = 0;
    let loops = 0;
    for (let i = 0; i < count; i++) {
      let id;
      if (miniOnly) {
        id = rng.pick(MINI_PRIMS);
      } else if (i === 0 && spineFirst) {
        id = rng.pick(prims.spine);
      } else {
        id = rng.weightedPick(prims.weights);
      }
      if (id === 'dot' && dots >= 2) id = prims.spine[0];
      if (id === 'dot') dots++;
      // More than one full loop per glyph reads as a tangle, not a letter
      if (id === 'loop' && loops >= 1) id = this.aestheticKey === 'circular' || this.aestheticKey === 'curved' ? 'arc' : 'dot';
      if (id === 'loop') loops++;
      const p = this._samplePrim(rng, id, { spine: i === 0 && spineFirst && !miniOnly });
      recipe.push(p);
      // Vertical symmetry: deterministically mirror suitable satellite strokes
      if (!miniOnly && i > 0 && g.symmetry === 'vertical' && recipe.length < count + 1 && rng.bool(g.symmetryProb)) {
        const m = this._mirrorPrim(p);
        if (m) { recipe.push(m); i++; }
      }
    }
    return recipe;
  }

  _realizeRecipe(recipe, box) {
    return recipe.map(p => this._realizePrim(p, box));
  }

  // -------------------------------------------------------------------------
  // Featural building blocks
  // -------------------------------------------------------------------------

  _inferManner(c) {
    if (c.manner) return c.manner; // lateral / rhotic / tap / trill / ejective / ...
    const ipa = c.ipa || '';
    if (NASAL_IPA.has(ipa)) return 'nasal';
    if (FRICATIVE_IPA.has(ipa)) return 'fricative';
    if (GLIDE_IPA.has(ipa)) return 'glide';
    if (ipa.length > 1) return 'affricate';
    return 'stop';
  }

  /** Shared base form per place of articulation (lazy, uniqueness-checked). */
  _placeBase(place) {
    const key = PLACES.includes(place) ? place : 'alveolar';
    if (this._placeBases.has(key)) return this._placeBases.get(key);
    const stdBox = this._mainBox();
    let recipe = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const rng = this._rngFor(`place:${key}:${attempt}`);
      const candidate = this._sampleRecipe(rng, 2, { spineFirst: true });
      const sig = this._sigOf(this._realizeRecipe(candidate, stdBox));
      let clash = false;
      for (const other of this._placeBases.values()) {
        const oSig = this._sigOf(this._realizeRecipe(other, stdBox));
        if (this._similarSigs(sig, oSig)) { clash = true; break; }
      }
      recipe = candidate;
      if (!clash) break;
    }
    this._placeBases.set(key, recipe);
    return recipe;
  }

  /** Consistent modifier stroke per manner class (nasal, fricative, ...). */
  _mannerMod(manner) {
    if (manner === 'stop') return null;
    if (this._mannerMods.has(manner)) return this._mannerMods.get(manner);
    const zone = this._mannerZone();
    let recipe = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const rng = this._rngFor(`manner:${manner}:${attempt}`);
      const candidate = [this._samplePrim(rng, rng.pick(MINI_PRIMS))];
      const sig = this._sigOf(this._realizeRecipe(candidate, zone));
      let clash = false;
      for (const other of this._mannerMods.values()) {
        if (!other) continue;
        const oSig = this._sigOf(this._realizeRecipe(other, zone));
        if (this._similarSigs(sig, oSig)) { clash = true; break; }
      }
      recipe = candidate;
      if (!clash) break;
    }
    this._mannerMods.set(manner, recipe);
    return recipe;
  }

  _voiceMarkStrokes(box) {
    if (!this._voiceRecipe) {
      const rng = this._rngFor('voice');
      this._voiceRecipe = [this._samplePrim(rng, this.genome.voiceMark)];
    }
    const zone = subBox(box, { u0: 0.35, v0: 1.06, u1: 0.65, v1: 1.24 });
    return this._realizeRecipe(this._voiceRecipe, zone);
  }

  _mainBox() {
    return { x0: 18, y0: this.genome.bodyTop, x1: 82, y1: BASELINE };
  }

  _mannerZone(box = this._mainBox()) {
    const corners = {
      tr: { u0: 0.6, v0: 0, u1: 1, v1: 0.32 },
      tl: { u0: 0, v0: 0, u1: 0.4, v1: 0.32 },
      br: { u0: 0.6, v0: 0.68, u1: 1, v1: 1 },
      bl: { u0: 0, v0: 0.68, u1: 0.4, v1: 1 },
    };
    return subBox(box, corners[this.genome.mannerCorner]);
  }

  /**
   * Build consonant strokes. With featural coherence: place base + manner
   * modifier + voicing mark (+ distinguishing extras for non-strict types).
   */
  _consonantStrokes(c, rng, box, strict) {
    const g = this.genome;
    const strokes = [];
    const coherent = strict || rng.bool(g.featuralCoherence);
    if (coherent) {
      strokes.push(...this._realizeRecipe(this._placeBase(c.place), box));
      const manner = this._inferManner(c);
      const mod = this._mannerMod(manner);
      if (mod) strokes.push(...this._realizeRecipe(mod, this._mannerZone(box)));
      if (c.voice === 'voiced') strokes.push(...this._voiceMarkStrokes(box));
      if (!strict) {
        const extras = strokes.length >= 4 ? (rng.bool(0.3) ? 1 : 0) : rng.int(1, 2);
        if (extras > 0) {
          strokes.push(...this._realizeRecipe(
            this._sampleRecipe(rng, extras, { spineFirst: false }), box));
        }
      }
    } else {
      const [lo, hi] = g.strokeRange.consonant;
      strokes.push(...this._realizeRecipe(this._sampleRecipe(rng, rng.int(lo, hi)), box));
    }
    return strokes;
  }

  /**
   * Systematic vowel form: backness selects spine orientation, height places
   * a perpendicular tick along it, roundness adds the language's round mark.
   */
  _vowelStrokes(v, rng, box, { mini = false, scheme = true } = {}) {
    const g = this.genome;
    if (!scheme) {
      const [lo, hi] = mini ? g.strokeRange.diacritic : g.strokeRange.vowel;
      return this._realizeRecipe(this._sampleRecipe(rng, rng.int(lo, hi), { miniOnly: mini }), box);
    }
    const backness = String(v.backness || 'central');
    const bIdx = backness.includes('front') ? 0 : backness.includes('back') ? 2 : 1;
    const hIdx = Math.max(0, HEIGHTS.indexOf(v.height || 'mid'));
    const axis = g.vowelAxes[bIdx];
    const f = rnd2(0.18 + 0.64 * (hIdx / (HEIGHTS.length - 1)));
    const side = g.vowelTickSide;
    const W = box.x1 - box.x0;
    const H = box.y1 - box.y0;
    const strokes = [];

    if (axis === 'v') {
      strokes.push(this._vowelSpine('v', box));
      const x = box.x0 + 0.5 * W, y = box.y0 + f * H;
      const x2 = x + side * 0.34 * W;
      strokes.push({ id: 'tick', segs: [['M', x, y], ['L', x2, y]], anchors: [[x, y], [x2, y]] });
    } else if (axis === 'h') {
      strokes.push(this._vowelSpine('h', box));
      const x = box.x0 + f * W, y = box.y0 + 0.5 * H;
      const y2 = y - side * 0.34 * H;
      strokes.push({ id: 'tick', segs: [['M', x, y], ['L', x, y2]], anchors: [[x, y], [x, y2]] });
    } else {
      strokes.push(this._vowelSpine('d', box));
      const x = box.x0 + f * W, y = box.y0 + (1 - f) * H;
      const x2 = x + side * 0.26 * W, y2 = y + side * 0.26 * H;
      strokes.push({ id: 'tick', segs: [['M', x, y], ['L', x2, y2]], anchors: [[x, y], [x2, y2]] });
    }
    if (v.rounded) {
      if (g.roundMark === 'dot') {
        strokes.push(this._realizePrim({ id: 'dot', u: 0.82, v: 0.16, r: mini ? 2.2 : 3 }, box));
      } else {
        strokes.push(this._realizePrim({ id: 'loop', cx: 0.78, cy: 0.2, r: mini ? 0.16 : 0.18 }, box));
      }
    }
    return strokes;
  }

  /**
   * Vowel spine stroke for one orientation axis ('v' | 'h' | 'd').
   * Curved/circular aesthetics swap straight bars for waves/arcs so vowels
   * stay inside the language's visual family.
   */
  _vowelSpine(axis, box) {
    const a = this.aestheticKey;
    if (a === 'curved') {
      if (axis === 'v') return this._realizePrim({ id: 'wave', horiz: false, amp: 0.3, at: 0.5 }, box);
      if (axis === 'h') return this._realizePrim({ id: 'wave', horiz: true, amp: 0.3, at: 0.5 }, box);
      return this._realizePrim({ id: 'arc', cx: 0.5, cy: 0.5, r: 0.9, a0: Math.PI * 0.75, sweep: Math.PI }, box);
    }
    if (a === 'circular') {
      if (axis === 'v') return this._realizePrim({ id: 'arc', cx: 0.3, cy: 0.5, r: 0.9, a0: -Math.PI / 2, sweep: Math.PI }, box);
      if (axis === 'h') return this._realizePrim({ id: 'arc', cx: 0.5, cy: 0.3, r: 0.9, a0: 0, sweep: Math.PI }, box);
      return this._realizePrim({ id: 'arc', cx: 0.5, cy: 0.5, r: 0.85, a0: Math.PI * 0.25, sweep: Math.PI * 1.5 }, box);
    }
    if (axis === 'v') return this._realizePrim({ id: 'vbar', u: 0.5, v0: 0, v1: 1 }, box);
    if (axis === 'h') return this._realizePrim({ id: 'hbar', v: 0.5, u0: 0, u1: 1 }, box);
    return this._realizePrim({ id: 'diag', u0: 0, v0: 1, u1: 1, v1: 0 }, box);
  }

  // -------------------------------------------------------------------------
  // Glyph registration: similarity check + deterministic reroll
  // -------------------------------------------------------------------------

  _quantTokens(strokes) {
    const tokens = new Set();
    for (const s of strokes) {
      for (const [x, y] of s.anchors || []) {
        tokens.add(`${s.id}@${Math.round(x / 20)},${Math.round(y / 20)}`);
      }
    }
    return tokens;
  }

  _sigOf(strokes) {
    return { n: strokes.length, tokens: this._quantTokens(strokes) };
  }

  _similarSigs(a, b) {
    if (a.n !== b.n) return false;
    let inter = 0;
    for (const t of a.tokens) if (b.tokens.has(t)) inter++;
    const union = a.tokens.size + b.tokens.size - inter;
    return union === 0 || inter / union >= 0.8;
  }

  /** Flared/dotted terminals applied to the first (spine) stroke. */
  _applyTerminals(strokes, rng) {
    const g = this.genome;
    if (!strokes.length) return strokes;
    if (g.terminals !== 'flared' && g.terminals !== 'dotted') return strokes;
    if (!rng.bool(g.terminalProb)) return strokes;
    const spine = strokes[0];
    const ends = (spine.anchors || []).slice(0, 2);
    for (const [x, y] of ends) {
      if (g.terminals === 'dotted') {
        strokes.push({ id: 'tdot', segs: circleSegs(x, y, 2.2, 2.2), anchors: [[x, y]], fill: true });
      } else {
        strokes.push({ id: 'tflare', segs: [['M', x - 3.5, y], ['L', x + 3.5, y]], anchors: [[x, y]] });
      }
    }
    return strokes;
  }

  /** Jitter / wobble / slant + path serialization. Width contrast for calligraphy. */
  _finalizeGlyph(key, strokes) {
    const g = this.genome;
    const ink = this._rngFor(`ink:${key}`);
    const tanS = Math.tan((g.slant * Math.PI) / 180);
    const out = [];
    for (const s of strokes) {
      let segs = s.segs;
      if (g.wobble) segs = this._wobbleSegs(segs, ink);
      if (g.jitter > 0) {
        segs = transformSegs(segs, (x, y) => [
          x + ink.float(-g.jitter, g.jitter),
          y + ink.float(-g.jitter, g.jitter),
        ]);
      }
      if (g.slant) segs = transformSegs(segs, (x, y) => [x + (BASELINE - y) * tanS, y]);
      let w = 1;
      if (g.widthContrast < 1 && !s.fill) {
        const xs = (s.anchors || []).map(a => a[0]);
        const ys = (s.anchors || []).map(a => a[1]);
        const dx = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
        const dy = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
        w = dy >= dx ? 1 : dx > dy * 2 ? g.widthContrast : rnd2((1 + g.widthContrast) / 2);
      } else if (g.wobble && !s.fill) {
        w = rnd2(ink.float(0.88, 1.12));
      }
      out.push({ d: segsToD(segs), w: rnd2(w), fill: !!s.fill });
    }
    return out;
  }

  /** Organic mode: straight L segments become gently curved cubics. */
  _wobbleSegs(segs, ink) {
    const out = [];
    let cx = 0, cy = 0;
    for (const s of segs) {
      if (s[0] === 'L') {
        const [x, y] = [s[1], s[2]];
        const mx = (cx + x) / 2, my = (cy + y) / 2;
        const dx = x - cx, dy = y - cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const amt = ink.float(-0.06, 0.06) * len;
        const px = (-dy / len) * amt, py = (dx / len) * amt;
        out.push(['C', (cx + mx) / 2 + px, (cy + my) / 2 + py, (mx + x) / 2 + px, (my + y) / 2 + py, x, y]);
        cx = x; cy = y;
      } else {
        out.push(s);
        if (s[0] !== 'Z') { cx = s[s.length - 2]; cy = s[s.length - 1]; }
      }
    }
    return out;
  }

  /**
   * Register a glyph. `build(rng)` returns realized strokes; collisions with
   * existing glyphs trigger deterministic rerolls (new salted RNG), and as a
   * last resort a deterministic distinguisher dot.
   */
  _register(key, roman, ipa, role, build, opts = {}) {
    if (this.glyphs.has(key)) return this.glyphs.get(key);
    let strokes = null;
    let sig = null;
    let lastD = null;
    for (let attempt = 0; attempt < 14; attempt++) {
      const rng = this._rngFor(`glyph:${key}:${attempt}`);
      let candidate = build(rng);
      if (!opts.plain) candidate = this._applyTerminals(candidate, rng);
      const candSig = this._sigOf(candidate);
      const dJoin = candidate.map(s => segsToD(s.segs)).join('|');
      let clash = false;
      const bucket = this._buckets.get(candSig.n);
      if (bucket) {
        for (const other of bucket) {
          if (this._similarSigs(candSig, other.sig)) { clash = true; break; }
        }
      }
      strokes = candidate;
      sig = candSig;
      if (!clash) break;
      if (dJoin === lastD) break; // build is rng-independent (strict featural): stop early
      lastD = dJoin;
    }
    // Last resort: nudge with a deterministic distinguisher dot until unique
    let finalized = this._finalizeGlyph(key, strokes);
    let svgPath = finalized.map(s => s.d).join(' ');
    let nudge = 0;
    while (this._pathSet.has(svgPath) && nudge < 8) {
      const h = (hashString(key) + nudge * 53) % 100;
      const fx = 22 + (h % 8) * 8;
      const fy = 12 + (Math.floor(h / 8) % 3) * 6;
      const dot = { id: 'fix', fill: true, segs: circleSegs(fx, fy, 2, 2), anchors: [[fx, fy]] };
      strokes = [...strokes, dot];
      sig = this._sigOf(strokes);
      finalized = this._finalizeGlyph(key, strokes);
      svgPath = finalized.map(s => s.d).join(' ');
      nudge++;
    }
    const glyph = {
      key, roman, ipa, role,
      strokes: finalized,
      svgPath,
      sig,
      advance: opts.advance ?? (role === 'diacritic' ? 0 : role === 'punctuation' ? 58 : 96 + this.genome.letterSpace),
    };
    this.glyphs.set(key, glyph);
    this._pathSet.add(svgPath);
    if (!this._buckets.has(sig.n)) this._buckets.set(sig.n, []);
    this._buckets.get(sig.n).push(glyph);
    return glyph;
  }

  // -------------------------------------------------------------------------
  // Inventory construction per script type
  // -------------------------------------------------------------------------

  _frameStrokes() {
    const g = this.genome;
    if (!g.blockFrame) return [];
    if (g.blockFrame === 'headline') {
      const y = g.bodyTop - 4;
      return [{ id: 'frame', segs: [['M', 10, y], ['L', 90, y]], anchors: [[10, y], [90, y]] }];
    }
    if (g.blockFrame === 'frame') {
      const b = { x0: 14, y0: g.bodyTop - 4, x1: 86, y1: BASELINE + 2 };
      return [{
        id: 'frame',
        segs: [['M', b.x0, b.y1], ['L', b.x0, b.y0], ['L', b.x1, b.y0], ['L', b.x1, b.y1]],
        anchors: [[b.x0, b.y1], [b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1]],
      }];
    }
    // stem
    return [{
      id: 'frame',
      segs: [['M', 16, g.bodyTop - 4], ['L', 16, BASELINE]],
      anchors: [[16, g.bodyTop - 4], [16, BASELINE]],
    }];
  }

  _diacriticBox(pos) {
    const g = this.genome;
    if (pos === 'below') return { x0: 32, y0: 86, x1: 68, y1: 97 };
    if (pos === 'right') return { x0: 84, y0: g.bodyTop + 8, x1: 97, y1: BASELINE - 8 };
    return { x0: 32, y0: 6, x1: 68, y1: Math.max(16, g.bodyTop - 8) };
  }

  _buildAll() {
    const type = this.scriptType;
    if (type === 'alphabet') this._buildAlphabet();
    else if (type === 'abjad') this._buildAbjad();
    else if (type === 'abugida') this._buildAbugida();
    else if (type === 'syllabary') this._buildSyllabary();
    else if (type === 'featural') this._buildFeatural();
    else if (type === 'logographic') this._buildLogographic();
    else this._buildAlphabet();
    this._buildPunctuation();
    this._buildNumerals();
  }

  _consonantGlyph(c, { strict = false, keyPrefix = 'C' } = {}) {
    const box = this._mainBox();
    const frame = this._frameStrokes();
    return this._register(`${keyPrefix}:${c.ipa}`, c.roman, c.ipa, 'consonant',
      rng => [...frame, ...this._consonantStrokes(c, rng, box, strict)]);
  }

  _vowelGlyph(v, { strict = false } = {}) {
    const g = this.genome;
    const box = this._mainBox();
    const frame = this._frameStrokes();
    return this._register(`V:${v.ipa}`, v.roman, v.ipa, 'vowel', rng => {
      const scheme = strict || rng.bool(g.featuralCoherence);
      return [...frame, ...this._vowelStrokes(v, rng, box, { scheme })];
    });
  }

  _buildAlphabet() {
    for (const c of this.phonology.consonants) this._consonantGlyph(c);
    for (const v of this.phonology.vowels) this._vowelGlyph(v);
  }

  _buildAbjad() {
    for (const c of this.phonology.consonants) this._consonantGlyph(c);
    // Vowels exist only as small optional diacritics
    const pos = this.genome.diacriticPos === 'right' ? 'above' : this.genome.diacriticPos;
    const dBox = this._diacriticBox(pos);
    for (const v of this.phonology.vowels) {
      this._register(`D:${v.ipa}`, v.roman, v.ipa, 'diacritic',
        rng => this._vowelStrokes(v, rng, dBox, { mini: true, scheme: rng.bool(0.85) }),
        { plain: true });
    }
    // Neutral carrier for orphan vowels (aleph-like)
    this._register('X:carrier', null, null, 'consonant', rng => {
      const spine = AESTHETIC_PRIMS[this.aestheticKey].spine[0];
      return [...this._frameStrokes(), this._realizePrim(this._samplePrim(rng, spine, { spine: true }), this._mainBox())];
    });
  }

  _buildAbugida() {
    const chars = this.script.characters || {};
    const inherent = chars.inherentVowel || (this.phonology.vowels[0] && this.phonology.vowels[0].ipa);
    this._inherent = inherent;
    // Base characters: consonant + inherent vowel
    for (const entry of chars.inventory || []) {
      const c = this.phonology.consonants.find(x => x.ipa === entry.consonant) ||
        { ipa: entry.consonant, place: 'alveolar', voice: 'voiceless', roman: entry.roman };
      const box = this._mainBox();
      const frame = this._frameStrokes();
      this._register(`B:${c.ipa}`, entry.roman, entry.phoneme, 'consonant',
        rng => [...frame, ...this._consonantStrokes(c, rng, box, false)]);
    }
    // Vowel modifiers (inherent vowel is unmarked)
    const dBox = this._diacriticBox(this.genome.diacriticPos);
    for (const mod of chars.modifiers || []) {
      const v = this.phonology.vowels.find(x => x.ipa === mod.phoneme) || { ipa: mod.phoneme, roman: mod.roman };
      this._register(`D:${v.ipa}`, mod.roman, mod.phoneme, 'diacritic',
        rng => this._vowelStrokes(v, rng, dBox, { mini: true, scheme: rng.bool(0.85) }),
        { plain: true });
    }
    // Independent vowels (word-initial)
    for (const v of this.phonology.vowels) this._vowelGlyph(v);
    // Virama: the vowel-killer mark
    this._register('X:virama', null, null, 'diacritic',
      rng => [this._realizePrim(this._samplePrim(rng, rng.pick(['diag', 'hbar', 'dot'])), { x0: 38, y0: 87, x1: 62, y1: 96 })],
      { plain: true });
  }

  _buildSyllabary() {
    const g = this.genome;
    // Component recipes: consonant bases (family form) + vowel modifiers
    const baseBox = g.syllVowelZone === 'right'
      ? { x0: 16, y0: g.bodyTop, x1: 62, y1: BASELINE }
      : g.syllVowelZone === 'above'
        ? { x0: 18, y0: g.bodyTop + 12, x1: 82, y1: BASELINE }
        : { x0: 18, y0: g.bodyTop, x1: 82, y1: BASELINE - 10 };
    const modBox = g.syllVowelZone === 'right'
      ? { x0: 68, y0: g.bodyTop + 6, x1: 94, y1: BASELINE - 6 }
      : g.syllVowelZone === 'above'
        ? { x0: 32, y0: 6, x1: 68, y1: g.bodyTop + 4 }
        : { x0: 32, y0: BASELINE - 4, x1: 68, y1: 96 };

    // Build base recipes per consonant, uniqueness-enforced at component level
    const baseStrokes = new Map();
    const baseSigs = [];
    for (const c of this.phonology.consonants) {
      let chosen = null;
      for (let attempt = 0; attempt < 12; attempt++) {
        const rng = this._rngFor(`syl-base:${c.ipa}:${attempt}`);
        const strokes = this._consonantStrokes(c, rng, baseBox, false);
        const sig = this._sigOf(strokes);
        if (!baseSigs.some(s => this._similarSigs(sig, s))) {
          chosen = strokes;
          baseSigs.push(sig);
          break;
        }
        chosen = strokes;
      }
      baseStrokes.set(c.ipa, chosen);
    }
    const modStrokes = new Map();
    for (const v of this.phonology.vowels) {
      const rng = this._rngFor(`syl-mod:${v.ipa}`);
      modStrokes.set(v.ipa, this._vowelStrokes(v, rng, modBox, { mini: true, scheme: true }));
    }

    // Compose CV syllable glyphs from inventory
    const frame = this._frameStrokes();
    for (const entry of (this.script.characters && this.script.characters.inventory) || []) {
      const parsed = this._parseSyllablePhoneme(entry.phoneme);
      if (!parsed) continue;
      const { cIpa, vIpa } = parsed;
      const key = `S:${cIpa || ''}.${vIpa}`;
      if (cIpa) {
        this._register(key, entry.roman, entry.phoneme, 'syllable',
          () => [...frame, ...baseStrokes.get(cIpa), ...modStrokes.get(vIpa)]);
      } else {
        // Bare-vowel syllable: full-size systematic vowel glyph
        const v = this.phonology.vowels.find(x => x.ipa === vIpa);
        this._register(key, entry.roman, entry.phoneme, 'syllable',
          rng => [...frame, ...this._vowelStrokes(v, rng, this._mainBox(), { scheme: true })]);
      }
    }
    // Coda mark (virama-like) for stray consonants
    this._register('X:coda', null, null, 'diacritic',
      rng => [this._realizePrim(this._samplePrim(rng, rng.pick(['diag', 'hbar', 'dot'])), { x0: 38, y0: 87, x1: 62, y1: 96 })],
      { plain: true });
  }

  _parseSyllablePhoneme(phoneme) {
    for (const c of this.phonology.consonants) {
      if (phoneme.startsWith(c.ipa)) {
        const rest = phoneme.slice(c.ipa.length);
        const v = this.phonology.vowels.find(x => x.ipa === rest);
        if (v) return { cIpa: c.ipa, vIpa: v.ipa };
      }
    }
    const v = this.phonology.vowels.find(x => x.ipa === phoneme);
    if (v) return { cIpa: null, vIpa: v.ipa };
    return null;
  }

  _buildFeatural() {
    // Strict featural composition: shapes ARE the phonetic features
    for (const c of this.phonology.consonants) this._consonantGlyph(c, { strict: true });
    for (const v of this.phonology.vowels) this._vowelGlyph(v, { strict: true });
  }

  _buildLogographic() {
    // Phonetic complement set (used to spell unknown/foreign words)
    for (const c of this.phonology.consonants) this._consonantGlyph(c);
    for (const v of this.phonology.vowels) this._vowelGlyph(v);

    const entries = (this.language.lexicon && this.language.lexicon.entries) || [];
    if (!entries.length) return;
    const g = this.genome;
    const main = this._mainBox();
    const radBox = g.radicalPos === 'left'
      ? subBox(main, { u0: 0, v0: 0, u1: 0.42, v1: 1 })
      : subBox(main, { u0: 0, v0: 0, u1: 1, v1: 0.38 });
    const bodyBox = g.radicalPos === 'left'
      ? subBox(main, { u0: 0.52, v0: 0, u1: 1, v1: 1 })
      : subBox(main, { u0: 0, v0: 0.48, u1: 1, v1: 1 });

    // Semantic radicals: one shared component per semantic field
    const radicals = new Map();
    const radicalFor = (field) => {
      const f = field || 'General';
      if (!radicals.has(f)) {
        const rng = this._rngFor(`radical:${f}`);
        radicals.set(f, this._realizeRecipe(this._sampleRecipe(rng, 2, { spineFirst: true }), radBox));
      }
      return radicals.get(f);
    };

    const frame = this._frameStrokes();
    for (const entry of entries) {
      const lemma = String(entry.lemma || '');
      if (!lemma) continue;
      const key = `L:${lemma}`;
      if (this.glyphs.has(key)) {
        this._logoIndex.set(lemma.toLowerCase(), key);
        continue;
      }
      const rad = radicalFor(entry.field);
      this._register(key, lemma, null, 'logogram', rng => {
        const [lo, hi] = g.strokeRange.logogram;
        const bodyCount = Math.max(2, rng.int(lo, hi) - rad.length);
        return [...frame, ...rad,
          ...this._realizeRecipe(this._sampleRecipe(rng, bodyCount, { spineFirst: true }), bodyBox)];
      });
      this._logoIndex.set(lemma.toLowerCase(), key);
    }
  }

  _buildPunctuation() {
    const box = { x0: 34, y0: 44, x1: 66, y1: 84 };
    const marks = (this.script.punctuation && this.script.punctuation.marks) || [];
    const wanted = [
      ['statement', /statement/i], ['question', /question/i],
      ['exclam', /exclam/i], ['pause', /pause|clause/i],
    ];
    for (const [name, re] of wanted) {
      const mark = marks.find(m => re.test(m.function || ''));
      this._register(`P:${name}`, mark ? mark.mark : null, null, 'punctuation',
        rng => this._realizeRecipe(
          this._sampleRecipe(rng, rng.int(1, 2), { miniOnly: true }), box),
        { plain: true, advance: 58 });
    }
  }

  _buildNumerals() {
    const base = (this.script.numerals && this.script.numerals.baseValue) || 10;
    const count = Math.min(base, 10);
    const box = this._mainBox();
    const g = this.genome;
    for (let d = 0; d < count; d++) {
      this._register(`N:${d}`, String(d), null, 'numeral', rng => {
        const [lo, hi] = g.strokeRange.numeral;
        return this._realizeRecipe(this._sampleRecipe(rng, rng.int(lo, hi)), box);
      });
    }
  }

  // -------------------------------------------------------------------------
  // Romanization parser (longest-match-first) and word -> glyph mapping
  // -------------------------------------------------------------------------

  _buildParser() {
    const tokens = new Map();
    for (const c of this.phonology.consonants || []) {
      if (c.roman && !tokens.has(c.roman)) tokens.set(c.roman, { kind: 'C', ipa: c.ipa, phon: c });
    }
    for (const v of this.phonology.vowels || []) {
      if (v.roman && !tokens.has(v.roman)) tokens.set(v.roman, { kind: 'V', ipa: v.ipa, phon: v });
    }
    const sorted = [...tokens.entries()]
      .sort((a, b) => b[0].length - a[0].length || (a[0] < b[0] ? -1 : 1));
    return { tokens, sorted };
  }

  /** Parse a romanized word into phoneme tokens (greedy, longest match first). */
  _parseRoman(word) {
    const w = String(word).toLowerCase().replace(/’/g, "'");
    const out = [];
    let i = 0;
    while (i < w.length) {
      let matched = null;
      for (const [roman, tok] of this._parser.sorted) {
        if (w.startsWith(roman, i)) { matched = { roman, ...tok }; break; }
      }
      if (matched) {
        out.push(matched);
        i += matched.roman.length;
      } else {
        i++; // unknown character: skip
      }
    }
    return out;
  }

  /** Map a romanized word to render units: {main: glyphKey, marks: [glyphKeys]}. */
  _wordToUnits(romanWord) {
    const word = String(romanWord || '');
    if (!word) return [];
    const type = this.scriptType;

    // Numerals
    if (/^[0-9]+$/.test(word)) {
      return [...word].map(d => ({ main: `N:${d}`, marks: [] }))
        .filter(u => this.glyphs.has(u.main));
    }

    // Logographic: whole-word logogram, else phonetic spelling
    if (type === 'logographic') {
      const key = this._logoIndex.get(word.toLowerCase());
      if (key) return [{ main: key, marks: [] }];
    }

    const phonemes = this._parseRoman(word);
    const units = [];

    if (type === 'alphabet' || type === 'featural' || type === 'logographic') {
      for (const p of phonemes) {
        const key = p.kind === 'C' ? `C:${p.ipa}` : `V:${p.ipa}`;
        if (this.glyphs.has(key)) units.push({ main: key, marks: [] });
      }
    } else if (type === 'abjad') {
      for (const p of phonemes) {
        if (p.kind === 'C') {
          if (this.glyphs.has(`C:${p.ipa}`)) units.push({ main: `C:${p.ipa}`, marks: [] });
        } else {
          const mark = `D:${p.ipa}`;
          const last = units[units.length - 1];
          if (last && last.marks.length === 0 && last.main.startsWith('C:')) {
            if (this.glyphs.has(mark)) last.marks.push(mark);
          } else if (this.glyphs.has('X:carrier')) {
            units.push({ main: 'X:carrier', marks: this.glyphs.has(mark) ? [mark] : [] });
          }
        }
      }
    } else if (type === 'abugida') {
      for (let i = 0; i < phonemes.length; i++) {
        const p = phonemes[i];
        if (p.kind === 'C') {
          const next = phonemes[i + 1];
          const base = `B:${p.ipa}`;
          if (!this.glyphs.has(base)) continue;
          if (next && next.kind === 'V') {
            if (next.ipa === this._inherent) {
              units.push({ main: base, marks: [] });
            } else {
              const mark = `D:${next.ipa}`;
              units.push({ main: base, marks: this.glyphs.has(mark) ? [mark] : [] });
            }
            i++;
          } else {
            units.push({ main: base, marks: this.glyphs.has('X:virama') ? ['X:virama'] : [] });
          }
        } else if (this.glyphs.has(`V:${p.ipa}`)) {
          units.push({ main: `V:${p.ipa}`, marks: [] });
        }
      }
    } else if (type === 'syllabary') {
      const defaultV = this.phonology.vowels[0] && this.phonology.vowels[0].ipa;
      for (let i = 0; i < phonemes.length; i++) {
        const p = phonemes[i];
        if (p.kind === 'C') {
          const next = phonemes[i + 1];
          if (next && next.kind === 'V' && this.glyphs.has(`S:${p.ipa}.${next.ipa}`)) {
            units.push({ main: `S:${p.ipa}.${next.ipa}`, marks: [] });
            i++;
          } else if (this.glyphs.has(`S:${p.ipa}.${defaultV}`)) {
            // Stray coda: default-vowel syllable + coda (vowel-killer) mark
            units.push({ main: `S:${p.ipa}.${defaultV}`, marks: this.glyphs.has('X:coda') ? ['X:coda'] : [] });
          }
        } else if (this.glyphs.has(`S:.${p.ipa}`)) {
          units.push({ main: `S:.${p.ipa}`, marks: [] });
        }
      }
    }
    return units;
  }

  _punctKey(ch) {
    const map = { '.': 'P:statement', '?': 'P:question', '!': 'P:exclam', ',': 'P:pause', ';': 'P:pause', ':': 'P:pause' };
    const key = map[ch];
    return key && this.glyphs.has(key) ? key : null;
  }

  _unitAdvance(unit) {
    const g = this.glyphs.get(unit.main);
    return g ? g.advance : 0;
  }

  // -------------------------------------------------------------------------
  // SVG serialization
  // -------------------------------------------------------------------------

  _svgOpen(unitsW, unitsH, pxW, pxH, opts = {}) {
    const g = this.genome;
    const color = opts.color ?? 'currentColor';
    const sw = rnd2(g.strokeWidth * (opts.strokeWidth ?? 1));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rnd2(unitsW)} ${rnd2(unitsH)}" ` +
      `width="${pxW}" height="${pxH}" fill="none" stroke="${color}" stroke-width="${sw}" ` +
      `stroke-linecap="${g.linecap}" stroke-linejoin="${g.linejoin}">`;
  }

  _glyphMarkup(glyph, tx, ty, opts = {}, mirror = false) {
    const color = opts.color ?? 'currentColor';
    const sw = this.genome.strokeWidth * (opts.strokeWidth ?? 1);
    let paths = '';
    for (const s of glyph.strokes) {
      if (s.fill) {
        paths += `<path d="${s.d}" fill="${color}" stroke="none"/>`;
      } else if (s.w !== 1) {
        paths += `<path d="${s.d}" stroke-width="${rnd2(sw * s.w)}"/>`;
      } else {
        paths += `<path d="${s.d}"/>`;
      }
    }
    const tf = mirror
      ? `translate(${rnd2(tx + 100)} ${rnd2(ty)}) scale(-1 1)`
      : `translate(${rnd2(tx)} ${rnd2(ty)})`;
    return `<g transform="${tf}">${paths}</g>`;
  }

  _unitMarkup(unit, x, y, opts, mirror) {
    let out = '';
    const main = this.glyphs.get(unit.main);
    if (main) out += this._glyphMarkup(main, x, y, opts, mirror);
    for (const markKey of unit.marks || []) {
      const mark = this.glyphs.get(markKey);
      if (mark) out += this._glyphMarkup(mark, x, y, opts, mirror);
    }
    return out;
  }
}

export default GlyphForge;
