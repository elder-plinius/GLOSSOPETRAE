/**
 * GLOSSOPETRAE AudioForge Test Script
 * Run with: node test-audio.mjs
 *
 * Covers: parseRoman round-trips, synthesis sanity, determinism, full
 * phoneme-inventory coverage, vowel spectral distinctness (coarse DFT),
 * tonal F0 trends (autocorrelation pitch tracking), WAV encoding, and
 * writes listenable previews to audio-preview/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Glossopetrae } from './src/Glossopetrae.js';
import { AudioForge } from './src/modules/AudioForge.js';
import { getAllConsonants, getAllVowels } from './src/data/phonemes.js';

console.log('========================================');
console.log('   GLOSSOPETRAE - AudioForge Test Suite');
console.log('========================================\n');

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, label) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.log(`    ASSERT FAILED: ${label}`);
  }
}

/** Suppress the generator's console chatter. */
function quiet(fn) {
  const orig = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = orig;
  }
}

function normRoman(s) {
  return String(s).normalize('NFC').toLowerCase().replace(/[’ʼʹ`]/g, "'");
}

function allFinite(samples) {
  for (let i = 0; i < samples.length; i++) {
    if (!Number.isFinite(samples[i])) return false;
  }
  return true;
}

function peakOf(samples) {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > max) max = a;
  }
  return max;
}

/** Coarse DFT band energy via Goertzel-style probes every 50 Hz. */
function bandEnergy(samples, sr, fLo, fHi) {
  const n = samples.length;
  let energy = 0;
  for (let f = fLo; f <= fHi; f += 50) {
    let re = 0;
    let im = 0;
    const w = (2 * Math.PI * f) / sr;
    for (let i = 0; i < n; i++) {
      re += samples[i] * Math.cos(w * i);
      im -= samples[i] * Math.sin(w * i);
    }
    energy += re * re + im * im;
  }
  return energy;
}

/** Autocorrelation F0 estimate over samples[t0..t1] (seconds). */
function estimateF0(samples, sr, t0, t1) {
  const start = Math.max(0, Math.floor(t0 * sr));
  const end = Math.min(samples.length, Math.floor(t1 * sr));
  const seg = samples.subarray(start, end);
  const minLag = Math.floor(sr / 350);
  const maxLag = Math.floor(sr / 60);
  if (seg.length < maxLag * 2) return -1;
  let bestLag = -1;
  let bestCorr = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i + lag < seg.length; i++) {
      c += seg[i] * seg[i + lag];
      e1 += seg[i] * seg[i];
      e2 += seg[i + lag] * seg[i + lag];
    }
    const norm = Math.sqrt(e1 * e2);
    const r = norm > 1e-12 ? c / norm : 0;
    if (r > bestCorr) {
      bestCorr = r;
      bestLag = lag;
    }
  }
  return bestLag > 0 ? sr / bestLag : -1;
}

// ---------------------------------------------------------------------------
// Setup: generate test languages
// ---------------------------------------------------------------------------

const SEEDS = [42, 7, 1001];
const langs = {};
for (const seed of SEEDS) {
  langs[seed] = quiet(() => new Glossopetrae({ seed, hasTone: seed === 7 }).generate());
}
const lang42 = langs[42];
const tonalLang = langs[7];
console.log(`Languages: ${SEEDS.map((s) => `${langs[s].name} (seed ${s})`).join(', ')}`);
console.log(`Tonal language: ${tonalLang.name} — ${tonalLang.prosody.tone?.description}\n`);

// ---------------------------------------------------------------------------
// Test 1: parseRoman round-trip on 30 lexicon lemmas across 3 seeds
// ---------------------------------------------------------------------------

console.log('Test 1: parseRoman round-trip (30 lemmas, 3 seeds)...');
{
  let checked = 0;
  for (const seed of SEEDS) {
    const lang = langs[seed];
    const forge = new AudioForge(lang);
    const knownIpa = new Set([
      ...lang.phonology.consonants.map((c) => c.ipa),
      ...lang.phonology.vowels.map((v) => v.ipa),
    ]);
    const lemmas = [...new Set(lang.lexicon.entries.map((e) => e.lemma).filter(Boolean))].slice(0, 10);
    assert(lemmas.length === 10, `seed ${seed}: found 10 lemmas`);
    for (const lemma of lemmas) {
      const phones = forge.parseRoman(lemma);
      assert(phones.length > 0, `seed ${seed} "${lemma}": parsed to phones`);
      assert(
        phones.every((p) => knownIpa.has(p.ipa)),
        `seed ${seed} "${lemma}": every phone maps to a known phoneme`
      );
      const rejoined = phones.map((p) => p.roman).join('');
      assert(
        rejoined === normRoman(lemma),
        `seed ${seed} "${lemma}": round-trip (got "${rejoined}")`
      );
      checked++;
    }
  }
  console.log(`  Round-tripped ${checked} lemmas`);
  // Robustness: unknown characters skipped gracefully
  const forge = new AudioForge(lang42);
  const weird = forge.parseRoman('Xx@ta#9 ma!');
  assert(Array.isArray(weird), 'unknown chars: returns array without throwing');
  assert(weird.every((p) => p.ipa), 'unknown chars: all returned phones valid');
  console.log('  PASS-ish (see summary)\n');
}

// ---------------------------------------------------------------------------
// Test 2: synthesis sanity
// ---------------------------------------------------------------------------

console.log('Test 2: synthesis sanity (samples, peaks, durations)...');
{
  const forge = new AudioForge(lang42);
  const lemmas = [...new Set(lang42.lexicon.entries.map((e) => e.lemma).filter((l) => l && l.length > 1))].slice(0, 10);
  for (const lemma of lemmas) {
    const res = forge.synthesizeWord(lemma);
    assert(res.samples instanceof Float32Array && res.samples.length > 0, `"${lemma}": non-empty Float32Array`);
    assert(res.sampleRate === 22050, `"${lemma}": sampleRate 22050`);
    assert(allFinite(res.samples), `"${lemma}": no NaN/Infinity`);
    const pk = peakOf(res.samples);
    assert(pk >= 0.05 && pk <= 1.0, `"${lemma}": peak ${pk.toFixed(3)} in [0.05, 1.0]`);
    assert(res.duration >= 0.1 && res.duration <= 10, `"${lemma}": duration ${res.duration.toFixed(2)}s in [0.1, 10]`);
    assert(
      res.duration / res.phones.length >= 0.06,
      `"${lemma}": avg >= 60ms/phone (${((res.duration / res.phones.length) * 1000).toFixed(0)}ms)`
    );
    assert(res.phones.every((p) => p.duration > 0 && p.start >= 0), `"${lemma}": phone timing present`);
  }

  // Sentence API: array + string input, statement vs question
  const words = lemmas.slice(0, 3);
  const sent = forge.synthesizeSentence(words, { mode: 'statement' });
  const sentStr = forge.synthesizeSentence(words.join(' '), { mode: 'statement' });
  assert(allFinite(sent.samples) && sent.samples.length > 0, 'sentence: non-empty, finite');
  assert(sent.words.length === 3, 'sentence: 3 word entries');
  assert(sent.samples.length === sentStr.samples.length, 'sentence: array and string input agree');
  const wordDurSum = words.reduce((acc, w) => acc + forge.synthesizeWord(w).duration, 0);
  assert(sent.duration > wordDurSum * 0.9, 'sentence: duration includes pauses (longer than bare words)');
  console.log(`  Checked ${lemmas.length} words + sentence modes\n`);
}

// ---------------------------------------------------------------------------
// Test 3: determinism
// ---------------------------------------------------------------------------

console.log('Test 3: determinism (same word → byte-identical samples)...');
{
  const lemma = lang42.lexicon.entries.find((e) => e.lemma && e.lemma.length > 2).lemma;
  const forgeA = new AudioForge(lang42);
  const forgeB = new AudioForge(lang42);
  const a = forgeA.synthesizeWord(lemma);
  const b = forgeA.synthesizeWord(lemma);
  const c = forgeB.synthesizeWord(lemma);
  const bytesA = Buffer.from(a.samples.buffer, a.samples.byteOffset, a.samples.byteLength);
  const bytesB = Buffer.from(b.samples.buffer, b.samples.byteOffset, b.samples.byteLength);
  const bytesC = Buffer.from(c.samples.buffer, c.samples.byteOffset, c.samples.byteLength);
  assert(a.samples.length === b.samples.length, `"${lemma}": equal length (same forge)`);
  assert(bytesA.equals(bytesB), `"${lemma}": byte-identical samples (same forge)`);
  assert(bytesA.equals(bytesC), `"${lemma}": byte-identical samples (fresh forge)`);
  const s1 = forgeA.synthesizeSentence([lemma, lemma], { mode: 'question' });
  const s2 = forgeB.synthesizeSentence([lemma, lemma], { mode: 'question' });
  assert(
    Buffer.from(s1.samples.buffer).equals(Buffer.from(s2.samples.buffer)),
    'sentence determinism'
  );
  console.log(`  "${lemma}" x3 identical\n`);
}

// ---------------------------------------------------------------------------
// Test 4: coverage — every consonant and vowel in src/data/phonemes.js
// ---------------------------------------------------------------------------

console.log('Test 4: full inventory coverage (every phoneme in phonemes.js)...');
{
  // Synthetic language containing ALL canonical phonemes, with collision-free
  // roman tokens so each consonant is individually addressable.
  const cons = getAllConsonants().map((c, i) => ({ ...c, roman: `q${i}x` }));
  const vows = getAllVowels(); // 12 vowels, roman fields already unique
  const synthLang = {
    seed: 99,
    phonology: { consonants: cons, vowels: vows },
    prosody: { hasTone: false, stress: { type: 'fixed', primary: { position: 'initial' } } },
  };
  const forge = new AudioForge(synthLang);

  let covered = 0;
  for (let i = 0; i < cons.length; i++) {
    const word = `a${cons[i].roman}a`; // VCV context
    let res = null;
    let threw = false;
    try {
      res = forge.synthesizeWord(word);
    } catch (e) {
      threw = true;
      console.log(`    THREW on /${cons[i].ipa}/: ${e.message}`);
    }
    assert(!threw, `consonant /${cons[i].ipa}/ (${cons[i].place}): no throw`);
    if (res) {
      assert(allFinite(res.samples) && peakOf(res.samples) > 0.01, `consonant /${cons[i].ipa}/: audible, finite`);
      covered++;
    }
  }
  const vowelWord = vows.map((v) => v.roman).join('');
  const vres = forge.synthesizeWord(vowelWord);
  assert(allFinite(vres.samples) && peakOf(vres.samples) > 0.01, 'all-12-vowel word: audible, finite');
  assert(vres.phones.length === vows.length, `all-12-vowel word parsed to ${vows.length} phones`);

  // Defensive: exotic phones referenced by DivergenceEngine (not in phonemes.js)
  const exotic = [
    { ipa: 'ʘ', roman: 'pp', voice: 'voiceless' },
    { ipa: 'ǃ', roman: 'tt', voice: 'voiceless' },
    { ipa: 'pʼ', roman: 'pq', voice: 'voiceless', place: 'bilabial' },
    { ipa: 'ɓ', roman: 'bb', voice: 'voiced' },
    { ipa: 'ħ', roman: 'hh', voice: 'voiceless' },
    { ipa: 'ʈ', roman: 'tr', voice: 'voiceless' },
    { ipa: 'ɬ', roman: 'lh', voice: 'voiceless' },
    { ipa: 'ʕ', roman: 'gq', voice: 'voiced' },
  ];
  const exoticLang = {
    seed: 5,
    phonology: { consonants: exotic, vowels: [vows[0], vows[1]] },
    prosody: {},
  };
  const exoticForge = new AudioForge(exoticLang);
  for (const ph of exotic) {
    let threw = false;
    try {
      const r = exoticForge.synthesizeWord(`a${ph.roman}a`);
      assert(allFinite(r.samples), `exotic /${ph.ipa}/: finite`);
    } catch (e) {
      threw = true;
    }
    assert(!threw, `exotic /${ph.ipa}/: no throw`);
  }
  console.log(`  ${covered}/${cons.length} consonants + ${vows.length} vowels + ${exotic.length} exotic approximations\n`);
}

// ---------------------------------------------------------------------------
// Test 5: vowel distinctness — /i/ vs /ɑ/ via coarse DFT
// ---------------------------------------------------------------------------

console.log('Test 5: vowel spectral distinctness (/i/ vs /ɑ/)...');
{
  const vlang = {
    seed: 3,
    phonology: {
      consonants: [],
      vowels: [
        { ipa: 'i', roman: 'i', height: 'close', backness: 'front', rounded: false },
        { ipa: 'ɑ', roman: 'aa', height: 'open', backness: 'back', rounded: false },
      ],
    },
    prosody: {},
  };
  const forge = new AudioForge(vlang);
  const measure = (word) => {
    const res = forge.synthesizeWord(word, { finalContour: 'none' });
    const n = res.samples.length;
    const mid = res.samples.subarray(Math.floor(n * 0.3), Math.floor(n * 0.7)); // steady state
    const low = bandEnergy(mid, res.sampleRate, 600, 1200);   // /ɑ/ F2 region
    const high = bandEnergy(mid, res.sampleRate, 1800, 2800); // /i/ F2 region
    return high / Math.max(low, 1e-12);
  };
  const ratioI = measure('i');
  const ratioA = measure('aa');
  console.log(`  F2-region/low-region energy ratio: /i/ = ${ratioI.toFixed(3)}, /ɑ/ = ${ratioA.toFixed(4)}`);
  assert(ratioI > ratioA, '/i/ has relatively more 1800-2800Hz energy than /ɑ/');
  assert(ratioI > 3 * ratioA, 'separation is decisive (>3x)');
  assert(ratioA < 1, '/ɑ/ energy concentrated below 1200Hz');
}
console.log('');

// ---------------------------------------------------------------------------
// Test 6: tonal F0 trends — rising vs falling
// ---------------------------------------------------------------------------

console.log('Test 6: tone realization (rising vs falling F0 trend)...');
{
  const forge = new AudioForge(tonalLang);
  // Build a maximally measurable monosyllable from the language's own inventory
  const vowel = tonalLang.phonology.vowels.find((v) => v.ipa === 'a') || tonalLang.phonology.vowels[0];
  const nasal = tonalLang.phonology.consonants.find((c) => c.ipa === 'm' || c.ipa === 'n');
  const word = (nasal ? nasal.roman : '') + vowel.roman;

  const trend = (toneId) => {
    const res = forge.synthesizeWord(word, { tones: [toneId], finalContour: 'none', f0: 115 });
    const nuc = res.phones.find((p) => p.manner === 'vowel');
    const t0 = nuc.start;
    const t1 = nuc.start + nuc.duration;
    const third = (t1 - t0) / 3;
    const f0Start = estimateF0(res.samples, res.sampleRate, t0 + 0.005, t0 + third);
    const f0End = estimateF0(res.samples, res.sampleRate, t1 - third, t1 - 0.005);
    return { f0Start, f0End };
  };

  const rising = trend('R');
  const falling = trend('F');
  console.log(`  Rising tone:  F0 ${rising.f0Start.toFixed(1)}Hz -> ${rising.f0End.toFixed(1)}Hz`);
  console.log(`  Falling tone: F0 ${falling.f0Start.toFixed(1)}Hz -> ${falling.f0End.toFixed(1)}Hz`);
  assert(rising.f0Start > 0 && rising.f0End > 0, 'rising: F0 measurable in both thirds');
  assert(falling.f0Start > 0 && falling.f0End > 0, 'falling: F0 measurable in both thirds');
  assert(rising.f0End > rising.f0Start * 1.08, 'rising tone: F0 goes up (>8%)');
  assert(falling.f0End < falling.f0Start * 0.92, 'falling tone: F0 goes down (>8%)');

  // Default tone assignment in a tonal language is deterministic and applied
  const a = forge.synthesizeWord(word);
  const b = forge.synthesizeWord(word);
  assert(
    Buffer.from(a.samples.buffer).equals(Buffer.from(b.samples.buffer)),
    'tonal word: deterministic default tone assignment'
  );

  // Question vs statement boundary contour
  const lemmasT = tonalLang.lexicon.entries
    .map((e) => e.lemma)
    .filter((l) => l && l.length > 1)
    .slice(0, 3);
  const stmt = forge.synthesizeSentence(lemmasT, { mode: 'statement' });
  const ques = forge.synthesizeSentence(lemmasT, { mode: 'question' });
  assert(allFinite(stmt.samples) && allFinite(ques.samples), 'sentence modes synthesize cleanly');
  assert(stmt.mode === 'statement' && ques.mode === 'question', 'sentence mode metadata');
}
console.log('');

// ---------------------------------------------------------------------------
// Test 7: WAV encoding + audio previews
// ---------------------------------------------------------------------------

console.log('Test 7: WAV encoding + writing audio-preview/ ...');
{
  const forge = new AudioForge(lang42);
  const res = forge.synthesizeWord(lang42.lexicon.entries[20].lemma);
  const wav = forge.toWav(res.samples);
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const str = (off, len) => String.fromCharCode(...wav.subarray(off, off + len));

  assert(wav instanceof Uint8Array, 'toWav returns Uint8Array');
  assert(str(0, 4) === 'RIFF', 'RIFF marker');
  assert(str(8, 4) === 'WAVE', 'WAVE marker');
  assert(str(12, 4) === 'fmt ', 'fmt chunk marker');
  assert(str(36, 4) === 'data', 'data chunk marker');
  assert(view.getUint32(4, true) === 36 + res.samples.length * 2, 'RIFF size field');
  assert(view.getUint16(20, true) === 1, 'PCM format tag');
  assert(view.getUint16(22, true) === 1, 'mono');
  assert(view.getUint32(24, true) === 22050, 'sample rate field');
  assert(view.getUint16(34, true) === 16, '16 bits per sample');
  assert(view.getUint32(40, true) === res.samples.length * 2, 'data size field');
  assert(wav.byteLength === 44 + res.samples.length * 2, 'total byte length');
  // toWav also accepts the full result object
  const wav2 = forge.toWav(res);
  assert(wav2.byteLength === wav.byteLength, 'toWav accepts result object');

  // --- Write listenable previews from 2 languages ---
  const dir = path.join(process.cwd(), 'audio-preview');
  fs.mkdirSync(dir, { recursive: true });
  const sanitize = (s) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'word';
  const written = [];
  const writeWav = (name, result) => {
    const file = path.join(dir, `${name}.wav`);
    fs.writeFileSync(file, forge.toWav(result.samples));
    written.push(file);
  };

  const lemmas42 = [...new Set(lang42.lexicon.entries.map((e) => e.lemma).filter((l) => l && l.length >= 3))];
  for (const lemma of lemmas42.slice(0, 3)) {
    writeWav(`${sanitize(lang42.name)}-word-${sanitize(lemma)}`, forge.synthesizeWord(lemma));
  }
  const sentenceWords = lemmas42.slice(3, 7);
  writeWav(`${sanitize(lang42.name)}-sentence-statement`, forge.synthesizeSentence(sentenceWords, { mode: 'statement' }));
  writeWav(`${sanitize(lang42.name)}-sentence-question`, forge.synthesizeSentence(sentenceWords, { mode: 'question' }));

  const tForge = new AudioForge(tonalLang);
  const lemmasT = [...new Set(tonalLang.lexicon.entries.map((e) => e.lemma).filter((l) => l && l.length >= 3))];
  for (const lemma of lemmasT.slice(0, 2)) {
    const result = tForge.synthesizeWord(lemma);
    fs.writeFileSync(path.join(dir, `${sanitize(tonalLang.name)}-tonal-word-${sanitize(lemma)}.wav`), tForge.toWav(result.samples));
    written.push(path.join(dir, `${sanitize(tonalLang.name)}-tonal-word-${sanitize(lemma)}.wav`));
  }
  const vowelsDemo = lang42.phonology.vowels.map((v) => v.roman).join('');
  writeWav(`${sanitize(lang42.name)}-vowel-inventory-${sanitize(vowelsDemo)}`, forge.synthesizeWord(vowelsDemo));

  assert(written.length >= 6, `wrote ${written.length} preview wavs`);
  assert(written.every((f) => fs.existsSync(f) && fs.statSync(f).size > 44), 'all preview files exist and are non-trivial');
  console.log(`  Previews:\n${written.map((f) => `    ${path.relative(process.cwd(), f)}`).join('\n')}\n`);
}

// ---------------------------------------------------------------------------
// Test 8: play() throws helpfully in Node; describePhone strings
// ---------------------------------------------------------------------------

console.log('Test 8: Node play() guard + describePhone...');
{
  const forge = new AudioForge(lang42);
  let threw = false;
  let msg = '';
  await forge.play('test').catch((e) => { threw = true; msg = e.message; });
  assert(threw, 'play() rejects in Node');
  assert(/toWav|browser|Web Audio/i.test(msg), 'play() error message is helpful');

  const dNg = forge.describePhone('ŋ');
  const dI = forge.describePhone('i');
  const dSh = forge.describePhone('ʃ');
  assert(/voiced velar nasal/.test(dNg), `describePhone(ŋ): "${dNg}"`);
  assert(/close front unrounded vowel/.test(dI), `describePhone(i): "${dI}"`);
  assert(/voiceless postalveolar fricative/.test(dSh), `describePhone(ʃ): "${dSh}"`);
  assert(typeof forge.describePhone('???') === 'string', 'describePhone(unknown) returns string');
  console.log(`  ${dNg}\n  ${dI}\n  ${dSh}\n`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('========================================');
console.log(`  ${passed} assertions passed, ${failed} failed`);
if (failed > 0) {
  console.log('  FAILURES:');
  for (const f of failures.slice(0, 20)) console.log(`    - ${f}`);
  process.exitCode = 1;
} else {
  console.log('  ALL TESTS PASSED');
}
console.log('========================================');
