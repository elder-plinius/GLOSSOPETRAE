/**
 * GLOSSOPETRAE - CodeSkin Module
 *
 * A bijective surface "legibility skin" for a CodeForge language. The AST and
 * semantics are UNCHANGED (same interpreter); only the surface token strings and
 * spacing change, on a dial from human-readable (L0) to essentially human-opaque
 * (L3). A model operates entirely in skinned space; `unskin()` reverses the
 * surface map so the canonical interpreter can execute it.
 *
 * This is the instrument for the machine-usability vs human-legibility frontier:
 * generate a program a human cannot read, but that an LLM (given the skinned
 * spec) can still write and run. Benign programs only — the *surface* is opaque,
 * the payload is FizzBuzz. We measure the gap; we do not operationalize it.
 *
 * Levels:
 *   L0  identity        — CodeForge's own novel-but-ASCII syntax (readable-ish)
 *   L1  cryptic         — keywords → short non-word ASCII tokens; ops unchanged
 *   L2  glyphic         — keywords + operators → distinct non-ASCII symbols
 *   L3  alien           — L2 + delimiters/grouping also glyphs (maximally opaque)
 *
 * Tokens are emitted space-delimited so unskin() is a robust split+reverse-map.
 * Identifiers, numbers, and string literals pass through unchanged.
 */

import { SeededRandom, seedToUint32 } from '../utils/random.js';

// Distinct, visually-alien single-codepoint symbols (none overlap ASCII source).
const GLYPH_POOL = [
  '⊕', '⊗', '⊙', '⊚', '⊛', '⊝', '◇', '◆', '▲', '▽', '◀', '▶', '✦', '✧', '✶', '✺',
  '⟐', '⟡', '⌘', '⍟', '⎔', '⏣', '❖', '❉', '➶', '➹', '⟁', '⟒', '⦿', '⦾', '⧫', '⧉',
  '⨀', '⨁', '⨂', '⩚', '⩛', '⪦', '⪧', '⫷', '⫸', 'ʘ', 'ǂ', 'Ѧ', 'Ѫ', 'Ҩ', 'Ӂ', 'Ԇ',
];

// Canonical operator / delimiter surfaces CodeForge uses.
const OPS = ['<=', '>=', '==', '!=', '+', '-', '*', '/', '%', '<', '>'];
const DELIMS = ['(', ')', ',', ';', '{', '}'];

export class CodeSkin {
  /**
   * @param {CodeForge} cf      a CodeForge instance (the language to skin)
   * @param {number} level      0..3
   * @param {number} [seed]     defaults to cf.seed (deterministic skin)
   */
  constructor(cf, level = 0, seed = undefined) {
    this.cf = cf;
    this.level = level;
    this.seed = seed ?? cf.seed;
    this._build();
  }

  _build() {
    const rng = new SeededRandom((seedToUint32(this.seed) * 2246822519 + this.level * 374761393 + 7) >>> 0);
    const glyphs = rng.shuffle([...GLYPH_POOL]);
    let g = 0;
    const nextGlyph = () => glyphs[g++ % glyphs.length];

    // forward: canonical surface -> skinned surface ; reverse for unskin
    this.fwd = new Map();
    this.rev = new Map();
    const map = (canon, skinned) => { this.fwd.set(canon, skinned); this.rev.set(skinned, canon); };

    const kw = this.cf.keywords; // {let, if, ...} canonical surfaces
    const kwSurfaces = Object.values(kw).concat(
      this.cf.blockStyle === 'word' ? [this.cf.blockOpen, this.cf.blockClose] : []
    );
    const assign = this.cf.assignOp;
    const term = this.cf.terminator;

    const crypticPool = ['vx', 'qz', 'kx', 'zr', 'jq', 'wq', 'xv', 'pz', 'fx', 'tq', 'cz', 'nx', 'dq', 'gx', 'bz', 'hq'];
    const cryptic = rng.shuffle([...crypticPool]);
    let c = 0;

    for (const surf of kwSurfaces) {
      if (this.level <= 0) map(surf, surf);
      else if (this.level === 1) map(surf, cryptic[c++ % cryptic.length]);
      else map(surf, nextGlyph());
    }
    for (const op of [assign, ...OPS]) {
      if (this.level <= 1) map(op, op);
      else map(op, nextGlyph());
    }
    for (const d of [...DELIMS, term]) {
      if (this.level <= 2) map(d, d);          // delimiters stay until L3
      else map(d, nextGlyph());
    }
    // de-dup safety: ensure no skinned collisions
    this._collision = (new Set(this.fwd.values()).size !== this.fwd.size);
    this.name = `${this.cf.name}~L${this.level}`;
  }

  /** Skin a canonical program → opaque surface (space-delimited tokens). */
  skin(canonicalSrc) {
    return this._retoken(canonicalSrc, (tok) => this._skinTok(tok));
  }

  /** Reverse: opaque surface → canonical program the interpreter can run. */
  unskin(skinnedSrc) {
    // Preserve double-quoted string literals intact (even if they contain
    // spaces or skinned glyphs) while reverse-mapping all space-delimited tokens.
    const src = String(skinnedSrc);
    const out = [];
    let i = 0;
    while (i < src.length) {
      if (/\s/.test(src[i])) { i++; continue; }
      if (src[i] === '"') {
        let j = i + 1;
        while (j < src.length && src[j] !== '"') {
          if (src[j] === '\\' && j + 1 < src.length) j += 2;
          else j++;
        }
        if (j < src.length) j++; // include closing quote
        out.push(src.slice(i, j));
        i = j;
        continue;
      }
      let j = i;
      while (j < src.length && !/\s/.test(src[j])) j++;
      const piece = src.slice(i, j);
      out.push(this.rev.get(piece) ?? piece);
      i = j;
    }
    return out.join(' ');
  }

  run(skinnedSrc, opts) { return this.cf.run(this.unskin(skinnedSrc), opts); }

  _skinTok(tok) {
    if (tok.t === 'str') {
      const escaped = String(tok.v)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return `"${escaped}"`;
    }
    if (tok.t === 'num') return String(tok.v);
    if (tok.t === 'id') return tok.v;
    return this.fwd.get(tok.v) ?? tok.v; // kw / op
  }

  _retoken(src, emit) {
    const toks = this.cf.tokenize(src).filter((t) => t.t !== 'eof');
    return toks.map(emit).join(' ');
  }

  /** A compact, skinned spec that teaches the opaque language to a model. */
  spec() {
    const K = this.cf.keywords;
    const s = (canon) => this.fwd.get(canon) ?? canon;
    const A = this.cf.assignOp, T = this.cf.terminator;
    const bo = this.cf.blockStyle === 'word' ? this.cf.blockOpen : '{';
    const bc = this.cf.blockStyle === 'word' ? this.cf.blockClose : '}';
    const ex = `${K.let} x ${A} ${this.cf.keywords.true === 'x' ? 1 : 5}${T}\n${K.print} x${T}`;
    let out = `# ${this.name} — language spec (surface level L${this.level})\n\nTokens (concept → symbol):\n`;
    for (const c of ['let', 'if', 'else', 'while', 'func', 'return', 'print', 'true', 'false', 'and', 'or', 'not', 'null'])
      out += `  ${c.padEnd(7)} = ${s(K[c])}\n`;
    out += `Operators:  + → ${s('+')}   - → ${s('-')}   * → ${s('*')}   / → ${s('/')}   % → ${s('%')}\n`;
    out += `Compare:    < → ${s('<')}   > → ${s('>')}   <= → ${s('<=')}   >= → ${s('>=')}   == → ${s('==')}   != → ${s('!=')}\n`;
    out += `Assignment: = → ${s(A)}    Statement end: ; → ${s(T)}\n`;
    out += `Grouping:   ( → ${s('(')}   ) → ${s(')')}   , → ${s(',')}   block ${this.cf.blockStyle === 'word' ? this.cf.blockOpen + '/' + this.cf.blockClose : '{ }'} → ${s(bo)} … ${s(bc)}\n`;
    out += `Numbers, identifiers and "strings" are written normally. Tokens are space-separated.\n`;
    out += `\nWorked example (this prints 5):\n${this.skin(ex)}\n`;
    return out;
  }

  /**
   * Human-legibility PROXY (lower = more opaque). Honest stopgap for a human
   * study: ascii = fraction of non-space chars that are ASCII;
   * wordHint = fraction of tokens that are dictionary-ish ASCII words (a human's
   * footholds); legibility = their average. A glyph-skinned program → ~0.
   */
  legibility(skinnedSrc) {
    const chars = [...String(skinnedSrc).replace(/\s/g, '')];
    const ascii = chars.length ? chars.filter((ch) => ch.charCodeAt(0) < 128).length / chars.length : 1;
    const toks = String(skinnedSrc).split(/\s+/).filter(Boolean);
    const wordish = toks.length ? toks.filter((t) => /^[a-zA-Z]{2,}$/.test(t)).length / toks.length : 1;
    return { ascii: +ascii.toFixed(3), wordHint: +wordish.toFixed(3), score: +((ascii + wordish) / 2).toFixed(3) };
  }
}

export default CodeSkin;
