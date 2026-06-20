// v5_refute.mjs — ADVERSARIAL refutation of v5_engine_fuzzing.mjs headline claims.
//
// We try to BREAK the strongest "confirmed" claims, not re-confirm them:
//   A) Glyph distinctness "0 duplicate svgPaths" — push logographic + all scripts
//      at larger scale and at the nudge-loop tail (nudge<8 can give up).
//   B) Audio peak "in (0,1]" — find a legitimately-generatable word whose synth
//      output has peak==0 (silence) or peak>1; cross-INSTANCE determinism.
//   C) Evolution determinism — cross-instance, and re-running deriveFamily.
//   D) deriveFamily naming bug — characterize the TRUE rate, confirm gen=1 clean,
//      and check whether the dup corrupts the TREE/cognate keys (worse than cosmetic).
//   E) Translation recall metric leniency — does eng.includes(w) inflate recall via
//      spurious substring hits? Re-grade with word-boundary matching.
//   F) Exporter: hunt for [object Object]/undefined/NaN with hostile-ish seeds + tone.
//
// Run: node validation/v5_refute.mjs 2>/dev/null
import { Glossopetrae } from '../src/Glossopetrae.js';

const _rawLog = console.log.bind(console);
console.log = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('[GLOSSOPETRAE]')) return; _rawLog(...a); };
const out = (...a) => _rawLog(...a);

const SCRIPT_TYPES = ['alphabet', 'abjad', 'abugida', 'syllabary', 'logographic', 'featural'];
const findings = [];
function FIND(tag, msg) { findings.push(`[${tag}] ${msg}`); out('  !! REFUTE/ANOMALY ' + `[${tag}] ` + msg); }

// ===========================================================================
// A) GLYPH DISTINCTNESS — the nudge<8 tail. _register() unconditionally adds
//    svgPath to the set even if still colliding after 8 nudges (line ~1090).
//    Probe logographic (largest tables) + every script across many seeds and
//    look for EXACT duplicate svgPath within a language.
// ===========================================================================
function attackGlyphDistinctness() {
  out('\n=== A) GLYPH svgPath DISTINCTNESS (tail attack) ===');
  let langs = 0, glyphs = 0, dupLangs = 0, dupGlyphs = 0;
  let biggestTable = 0;
  const dupExamples = [];
  // wider + denser seed coverage than their N=30; emphasize logographic.
  const SEEDS = [];
  for (let s = 0; s < 60; s++) SEEDS.push(20000 + s * 1313 + 7);
  for (const st of SCRIPT_TYPES) {
    const seedList = st === 'logographic' ? SEEDS : SEEDS.slice(0, 25);
    for (const seed of seedList) {
      let gt;
      try {
        const l = new Glossopetrae({ seed, scriptType: st }).generate();
        gt = l.glyphForge.getGlyphTable();
      } catch (e) { FIND('A-throw', `script=${st} seed=${seed} ${e.message}`); continue; }
      langs++;
      biggestTable = Math.max(biggestTable, gt.length);
      const seen = new Map();
      for (const g of gt) {
        glyphs++;
        if (g.svgPath == null) continue;
        if (seen.has(g.svgPath)) {
          dupGlyphs++;
          if (dupExamples.length < 6) dupExamples.push(`script=${st} seed=${seed} keys=${seen.get(g.svgPath)}&${g.key} pathLen=${g.svgPath.length}`);
        } else seen.set(g.svgPath, g.key);
      }
      // count this language once if it had any dup
      const before = dupGlyphs;
      if (dupExamples.length && dupExamples[dupExamples.length-1].includes(`seed=${seed}`)) {/* noop */}
    }
  }
  // recompute dupLangs cleanly
  out(`  langs=${langs} glyphs=${glyphs} biggestTable=${biggestTable}`);
  out(`  duplicate svgPath glyphs found: ${dupGlyphs}`);
  if (dupGlyphs) { dupExamples.forEach(e => FIND('A-dup', e)); }
  else out('  -> claim SURVIVES: 0 exact-duplicate svgPaths at this larger scale.');
  return { dupGlyphs, glyphs, biggestTable };
}

// ===========================================================================
// B) AUDIO peak ∈ (0,1] and cross-instance determinism.
// ===========================================================================
function attackAudio() {
  out('\n=== B) AUDIO peak bounds + determinism ===');
  let peakZero = 0, peakOver = 0, nonDet = 0, checked = 0;
  const ex = [];
  function peakOf(s){ let p=0; for(let i=0;i<s.length;i++){ const a=Math.abs(s[i]); if(!Number.isFinite(s[i]))return NaN; if(a>p)p=a;} return p; }

  // B1: every single phoneme on its own (consonant-only words may be unvoiced -> silence?)
  for (let s = 0; s < 25; s++) {
    const seed = 30000 + s * 911;
    let l; try { l = Glossopetrae.quick(seed); } catch { continue; }
    const cons = l.phonology.consonants.map(c => c.roman);
    const vows = l.phonology.vowels.map(v => v.roman);
    // adversarial single-token words: each consonant ALONE, each vowel alone
    const words = [...cons, ...vows];
    for (const w of words) {
      if (!w) continue;
      let r; try { r = l.audioForge.synthesizeWord(w); } catch (e) { FIND('B-throw', `seed=${seed} w=${JSON.stringify(w)} ${e.message}`); continue; }
      checked++;
      const p = peakOf(r.samples);
      if (Number.isNaN(p)) { FIND('B-nan', `seed=${seed} w=${JSON.stringify(w)}`); continue; }
      if (!(p > 0)) { peakZero++; if (ex.length < 8) ex.push(`SILENCE seed=${seed} w=${JSON.stringify(w)} len=${r.samples.length}`); }
      if (p > 1.0000001) { peakOver++; if (ex.length < 8) ex.push(`OVER seed=${seed} w=${JSON.stringify(w)} peak=${p}`); }
    }
  }
  out(`  single-token words checked=${checked} peak==0(silence): ${peakZero}  peak>1: ${peakOver}`);
  ex.forEach(e => FIND('B-peak', e));

  // B2: cross-INSTANCE determinism (their test reuses ONE instance). Two fresh
  // quick(seed) instances must synth byte-identical PCM for the same word.
  let detChecked = 0;
  for (let s = 0; s < 15; s++) {
    const seed = 31000 + s * 777;
    const la = Glossopetrae.quick(seed), lb = Glossopetrae.quick(seed);
    const cons = la.phonology.consonants.map(c=>c.roman); const vows = la.phonology.vowels.map(v=>v.roman);
    let word=''; for(let i=0;i<cons.length;i++) word += cons[i]+vows[i%vows.length]; word = word.slice(0,80);
    let a,b; try{ a=la.audioForge.synthesizeWord(word); b=lb.audioForge.synthesizeWord(word);}catch(e){FIND('B-det-throw',e.message);continue;}
    detChecked++;
    let same = a.samples.length === b.samples.length;
    if (same) for (let i=0;i<a.samples.length;i+=131){ if(a.samples[i]!==b.samples[i]){same=false;break;} }
    if (!same) { nonDet++; FIND('B-det', `cross-instance synth differs seed=${seed}`); }
  }
  out(`  cross-instance determinism checked=${detChecked} nonDeterministic=${nonDet}`);
  return { peakZero, peakOver, nonDet };
}

// ===========================================================================
// C) EVOLUTION determinism: cross-instance + repeated deriveFamily.
// ===========================================================================
function attackEvolutionDeterminism() {
  out('\n=== C) EVOLUTION determinism (cross-instance) ===');
  let evoFails = 0, famFails = 0;
  for (let s = 0; s < 15; s++) {
    const seed = 40000 + s * 521;
    const a = Glossopetrae.quick(seed).evolve({ centuries: 11, intensity: 0.6, seed: 3 });
    const b = Glossopetrae.quick(seed).evolve({ centuries: 11, intensity: 0.6, seed: 3 });
    const ja = JSON.stringify(a.lexicon.entries.map(e=>e.lemma));
    const jb = JSON.stringify(b.lexicon.entries.map(e=>e.lemma));
    if (ja !== jb) { evoFails++; FIND('C-evo', `cross-instance evolve differs seed=${seed}`); }
    // deriveFamily reproducibility
    const fa = Glossopetrae.quick(seed).deriveFamily({ daughters: 5, centuries: 7, generations: 2, seed: 99 });
    const fb = Glossopetrae.quick(seed).deriveFamily({ daughters: 5, centuries: 7, generations: 2, seed: 99 });
    if (JSON.stringify(fa.tree) !== JSON.stringify(fb.tree)) { famFails++; FIND('C-fam', `deriveFamily tree non-deterministic seed=${seed}`); }
  }
  out(`  evolve cross-instance fails=${evoFails}/15  deriveFamily nondet=${famFails}/15`);
  return { evoFails, famFails };
}

// ===========================================================================
// D) deriveFamily NAMING bug — true rate, gen split, and TREE/COGNATE corruption.
//    The known repro shows a dup at gen=2. Question: does the dup name corrupt
//    the cognate table (keyed by name) or the tree structure? And: is gen=1
//    REALLY clean across a big sweep, or does the headline understate it?
// ===========================================================================
function attackFamilyNaming() {
  out('\n=== D) deriveFamily naming bug — rate, gen split, structural impact ===');
  const treeNames = (node, acc=[]) => { if(!node) return acc; if(node.name) acc.push(node.name); for(const k of (node.children||[])) treeNames(k,acc); return acc; };

  for (const gen of [1, 2, 3]) {
    let dupFams = 0, fams = 0, dupTreeNodes = 0;
    const PROTOS = 8, PER = 25; // 200 families per gen
    for (let p = 0; p < PROTOS; p++) {
      let proto; try { proto = Glossopetrae.quick(50000 + p * 101); } catch { continue; }
      for (let k = 0; k < PER; k++) {
        fams++;
        const fseed = 1 + k + p * 1000;
        let fam; try { fam = proto.deriveFamily({ daughters: 6, centuries: 6, generations: gen, seed: fseed }); } catch (e) { FIND('D-throw', `gen=${gen} ${e.message}`); continue; }
        const names = treeNames(fam.tree);
        const seen = new Set(), dups = new Set();
        for (const n of names) { if (seen.has(n)) dups.add(n); seen.add(n); }
        if (dups.size) { dupFams++; dupTreeNodes += dups.size; }
      }
    }
    out(`  gen=${gen}: ${dupFams}/${fams} families have duplicate tree names  (distinct dup-names total=${dupTreeNodes})`);
    if (gen === 1 && dupFams > 0) FIND('D-gen1', `gen=1 ALSO produces dup names in ${dupFams}/${fams} families — refutes "gen=2 only"`);
  }

  // Structural impact: when a grandchild name collides with a sibling-branch
  // daughter, does the cognate table or daughters[] lose/merge an entry?
  // Also check: do duplicate names appear among the FLAT daughters[] list
  // (not just the tree), which would corrupt the cognate columns (keyed by name)?
  let cogCorrupt = 0, flatDup = 0, checked = 0;
  for (let p = 0; p < 12; p++) {
    let proto; try { proto = Glossopetrae.quick(50000 + p * 101); } catch { continue; }
    for (let k = 0; k < 40; k++) {
      const fseed = 1 + k + p * 1000;
      let fam; try { fam = proto.deriveFamily({ daughters: 6, centuries: 6, generations: 2, seed: fseed }); } catch { continue; }
      checked++;
      const dn = fam.daughters.map(d => d.name);
      // flat-daughter dup (would collide cognate columns which key on name)
      if (new Set(dn).size !== dn.length) { flatDup++; FIND('D-flatdup', `daughters[] has duplicate name fseed=${fseed} names=[${dn.join(',')}]`); }
      // cognate reflex columns: number of distinct daughter columns vs daughters
      for (const cog of fam.cognates) {
        const cols = Object.keys(cog.reflexes || {});
        if (cols.length < dn.length && new Set(dn).size < dn.length) {
          cogCorrupt++; break;
        }
      }
    }
  }
  out(`  structural: families checked=${checked} flat-daughter dup-names=${flatDup} cognate-column-collisions=${cogCorrupt}`);
  return { flatDup, cogCorrupt };
}

// ===========================================================================
// E) TRANSLATION recall metric leniency. Their recall uses eng.includes(w),
//    a raw SUBSTRING test. That can (a) FALSELY credit a hit when w is a
//    substring of an unrelated word, inflating recall; or (b) be too strict.
//    Re-grade with strict word-boundary matching and compare distributions.
// ===========================================================================
const SENTENCES = [
  'the cat sat on the mat','I see the big house','the man gives water to the child',
  'we will go to the mountain tomorrow','she eats fish and drinks milk',
  'the king ruled the land for many years','birds fly over the river at night',
  'the woman walked through the forest','good people help their friends','the sun rises in the east',
];
const STOP = new Set(['the','a','an','to','on','in','at','of','and','or','for','with','their','her','his','will','is','are','over','through']);
const contentWords = s => s.toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/).filter(w=>w&&!STOP.has(w));

function attackTranslationMetric() {
  out('\n=== E) TRANSLATION recall metric leniency (substring vs word-boundary) ===');
  const recSub = [], recWord = [];
  let inflated = 0, throws = 0;
  for (let s = 0; s < 50; s++) {
    const seed = 7000 + s * 7 + 1;
    let l; try { l = Glossopetrae.quick(seed); } catch { continue; }
    for (const sent of SENTENCES) {
      const cw = contentWords(sent);
      let fwd, back;
      try { fwd = l.translationEngine.translateToConlang(sent); back = l.translateToEnglish(fwd.target); }
      catch (e) { throws++; recSub.push(0); recWord.push(0); continue; }
      const eng = (back.english||'').toLowerCase();
      const engWords = new Set(eng.replace(/[^a-z\s]/g,' ').split(/\s+/).filter(Boolean));
      let hitSub=0, hitWord=0;
      for (const w of cw) {
        const subHit = eng.includes(w);
        const wordHit = engWords.has(w);
        if (subHit) hitSub++;
        if (wordHit) hitWord++;
        if (subHit && !wordHit) inflated++; // substring credit with no real word
      }
      recSub.push(cw.length?hitSub/cw.length:1);
      recWord.push(cw.length?hitWord/cw.length:1);
    }
  }
  const stats = (arr) => { const a=[...arr].sort((x,y)=>x-y); const pc=p=>a[Math.min(a.length-1,Math.floor(p/100*a.length))]; const mean=a.reduce((s,x)=>s+x,0)/a.length; return {mean,p10:pc(10),p50:pc(50),p90:pc(90),min:a[0]}; };
  const ss = stats(recSub), sw = stats(recWord);
  out(`  SUBSTRING recall : mean=${ss.mean.toFixed(3)} p10=${ss.p10.toFixed(3)} p50=${ss.p50.toFixed(3)} p90=${ss.p90.toFixed(3)} min=${ss.min.toFixed(3)}`);
  out(`  WORD-BOUND recall: mean=${sw.mean.toFixed(3)} p10=${sw.p10.toFixed(3)} p50=${sw.p50.toFixed(3)} p90=${sw.p90.toFixed(3)} min=${sw.min.toFixed(3)}`);
  out(`  spurious substring-only credits: ${inflated}  throws: ${throws}`);
  if (ss.mean - sw.mean > 0.02) FIND('E-inflate', `substring metric inflates mean recall by ${(ss.mean-sw.mean).toFixed(3)} (${inflated} spurious credits) — headline mean=0.851 is optimistic under strict matching`);
  else out('  -> metric leniency negligible; headline recall not materially inflated.');
  return { subMean: ss.mean, wordMean: sw.mean, inflated };
}

// ===========================================================================
// F) EXPORTER hostile hunt (tone langs, extreme inventories).
// ===========================================================================
function attackExporters() {
  out('\n=== F) EXPORTER token-leak hunt (tone + extreme inventories) ===');
  let bad = 0, checked = 0;
  const cfgs = [];
  for (let s=0;s<20;s++) cfgs.push({ seed: 60000+s*333, hasTone: s%2===0 });
  for (const cfg of cfgs) {
    let l; try { l = new Glossopetrae(cfg).generate(); } catch (e){ FIND('F-gen', `${JSON.stringify(cfg)} ${e.message}`); continue; }
    let outs; try {
      outs = { html: l.exporter.toGrammarHTML(), anki: l.exporter.toAnkiCSV(), dj: l.exporter.toDictionaryJSON(), csv: l.exporter.toCSV() };
    } catch (e) { FIND('F-throw', `${JSON.stringify(cfg)} ${e.message}`); continue; }
    checked++;
    for (const [name, str] of Object.entries(outs)) {
      for (const tok of ['undefined','[object Object]']) if (str.includes(tok)) { bad++; FIND('F-tok', `${tok} in ${name} cfg=${JSON.stringify(cfg)}`); }
      if (/\bNaN\b/.test(str)) { bad++; FIND('F-nan', `NaN in ${name} cfg=${JSON.stringify(cfg)}`); }
      if (name==='dj') { try { JSON.parse(str); } catch(e){ bad++; FIND('F-json', `JSON parse fail cfg=${JSON.stringify(cfg)} ${e.message}`); } }
    }
  }
  out(`  exporter configs checked=${checked} bad=${bad}`);
  return { bad };
}

(function main(){
  const t0 = Date.now();
  out('GLOSSOPETRAE v5 REFUTATION HARNESS'); out('node', process.version);
  const A = attackGlyphDistinctness();
  const B = attackAudio();
  const C = attackEvolutionDeterminism();
  const D = attackFamilyNaming();
  const E = attackTranslationMetric();
  const F = attackExporters();
  out('\n=== REFUTATION SUMMARY ===');
  out(`findings/anomalies recorded: ${findings.length}`);
  findings.slice(0,40).forEach((f,i)=>out(`  ${(i+1).toString().padStart(2)}. ${f}`));
  out(`\nelapsed: ${((Date.now()-t0)/1000).toFixed(1)}s`);
})();
