/**
 * v1_refute.mjs — ADVERSARIAL audit of the "CodeForge interpreter is a correct
 * 100% code-axis oracle" headline. We attack from angles the validator's own
 * corpus structurally cannot reach, and stress determinism / fuzz / guards.
 *
 * Strategy:
 *  A) CORPUS-GAP differential: build a SECOND, independent reference and an
 *     expression generator that includes strings, floats, nulls, big ints,
 *     deep nesting, and mixed-type operands — the things the difftest corpus
 *     never emits — and look for interpreter-vs-reference divergence.
 *  B) Independent re-derivation of the reference straight from the LANGUAGE
 *     SPEC (not from reading the interpreter), to catch shared-bug blindness.
 *  C) Determinism across MORE seeds + structural equality of generated programs
 *     (not just keyword maps).
 *  D) Harder parser fuzz with structured token salad to chase uncaught throws.
 *  E) Guard tail: NaN propagation, recursion depth / stack overflow (a throw
 *     that is NOT a CodeError would escape run()).
 */
import { CodeForge } from '../src/modules/CodeForge.js';

function mulberry32(a){return function(){a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
let RNG = mulberry32(0xBADC0DE1);
const rnd=()=>RNG(); const ri=(lo,hi)=>Math.floor(rnd()*(hi-lo+1))+lo; const pick=a=>a[Math.floor(rnd()*a.length)];

// ---------------------------------------------------------------------------
// INDEPENDENT reference. Derived from the documented spec semantics, written
// to match what a careful spec-reader (NOT the interpreter author) would
// implement. We deliberately implement formatting the way the SPEC implies and
// only fall back to interpreter-observed behavior where the spec is silent.
// ---------------------------------------------------------------------------
class RefError extends Error {}
const truthy = v => v!==false && v!==null && v!==0 && v!=='';
function toNum(v){ const n = typeof v==='boolean'?(v?1:0):Number(v); if(Number.isNaN(n)) throw new RefError('NaN'); return n; }
function makeFmt(K){ return v => v===null?K.null : v===true?K.true : v===false?K.false : String(v); }

function refEval(node, fmt){
  switch(node.k){
    case 'num': return node.v;
    case 'bool': return node.v;
    case 'null': return null;
    case 'str': return node.v;
    case 'not': return !truthy(refEval(node.x,fmt));
    case 'neg': return -toNum(refEval(node.x,fmt));
    case 'and': { const L=refEval(node.l,fmt); return truthy(L)?refEval(node.r,fmt):false; }
    case 'or':  { const L=refEval(node.l,fmt); return truthy(L)?L:refEval(node.r,fmt); }
    case 'bin': {
      const a=refEval(node.l,fmt), b=refEval(node.r,fmt);
      switch(node.op){
        case '+': return (typeof a==='string'||typeof b==='string') ? fmt(a)+fmt(b) : toNum(a)+toNum(b);
        case '-': return toNum(a)-toNum(b);
        case '*': return toNum(a)*toNum(b);
        case '/': return toNum(a)/toNum(b);
        case '%': return toNum(a)%toNum(b);
        case '<': return toNum(a)<toNum(b);
        case '>': return toNum(a)>toNum(b);
        case '<=': return toNum(a)<=toNum(b);
        case '>=': return toNum(a)>=toNum(b);
        case '==': return a===b;
        case '!=': return a!==b;
      }
    }
  }
  throw new RefError('bad node '+node.k);
}

// ---------------------------------------------------------------------------
// AGGRESSIVE generator: includes the leaf types the difftest omits.
//   - strings (incl. ones that look numeric: "5", "  ", "")
//   - floats and big ints
//   - null leaves
//   - mixed type comparisons/equality (string vs number)
// ---------------------------------------------------------------------------
function gExpr(K, depth){
  if(depth<=0 || rnd()<0.30){
    const r=rnd();
    if(r<0.30){ const v=ri(0,9); return {node:{k:'num',v}, src:String(v)}; }
    if(r<0.45){ const v=pick([0.5,1.5,3.14,2.0,100000,9999999,0.1]); return {node:{k:'num',v}, src:String(v)}; }
    if(r<0.58){ const s=pick(['a','bc','5','0','','xy','9']); return {node:{k:'str',v:s}, src:JSON.stringify(s)}; }
    if(r<0.70){ return {node:{k:'bool',v:true}, src:K.true}; }
    if(r<0.80){ return {node:{k:'bool',v:false}, src:K.false}; }
    if(r<0.88){ return {node:{k:'null'}, src:K.null}; }
    const v=ri(1,9); return {node:{k:'num',v}, src:String(v)};
  }
  const c=rnd();
  if(c<0.38){ const op=pick(['+','-','*','/','%']); const l=gExpr(K,depth-1), r=gExpr(K,depth-1); return {node:{k:'bin',op,l:l.node,r:r.node}, src:`(${l.src} ${op} ${r.src})`}; }
  if(c<0.56){ const op=pick(['<','>','<=','>=']); const l=gExpr(K,depth-1), r=gExpr(K,depth-1); return {node:{k:'bin',op,l:l.node,r:r.node}, src:`(${l.src} ${op} ${r.src})`}; }
  if(c<0.70){ const op=pick(['==','!=']); const l=gExpr(K,depth-1), r=gExpr(K,depth-1); return {node:{k:'bin',op,l:l.node,r:r.node}, src:`(${l.src} ${op} ${r.src})`}; }
  if(c<0.86){ const isAnd=rnd()<0.5; const l=gExpr(K,depth-1), r=gExpr(K,depth-1); const kw=isAnd?K.and:K.or; return {node:{k:isAnd?'and':'or',l:l.node,r:r.node}, src:`(${l.src} ${kw} ${r.src})`}; }
  if(c<0.93){ const x=gExpr(K,depth-1); return {node:{k:'not',x:x.node}, src:`(${K.not} ${x.src})`}; }
  const x=gExpr(K,depth-1); return {node:{k:'neg',x:x.node}, src:`(-${x.src})`};
}

function aggressiveDiff(seeds, N){
  let total=0, match=0, refErr=0, interpOk_refErr=0, refOk_interpErr=0;
  const diverge=[];
  for(const seed of seeds){
    const cf=new CodeForge(seed); const K=cf.keywords; const t=cf.terminator;
    const fmt=makeFmt(K);
    for(let n=0;n<N;n++){
      const d=ri(1,7);
      const {node,src}=gExpr(K,d);
      let refVal, refThrew=false;
      try{ refVal=refEval(node,fmt); } catch(e){ refThrew=true; }
      const res=cf.run(`${K.print} ${src}${t}`, {maxSteps:500000});
      total++;
      if(refThrew){
        if(!res.ok){ match++; refErr++; }
        else { interpOk_refErr++; if(diverge.length<40) diverge.push({seed,src,expected:'<ERROR>',got:res.output}); }
        continue;
      }
      const expected=fmt(refVal);
      if(!res.ok){ refOk_interpErr++; if(diverge.length<40) diverge.push({seed,src,expected,got:'ERR:'+res.error}); continue; }
      if(res.output===expected) match++;
      else if(diverge.length<40) diverge.push({seed,src,expected,got:res.output});
    }
  }
  return {total,match,diverge,refErr,interpOk_refErr,refOk_interpErr};
}

// ---------------------------------------------------------------------------
// Determinism: 40 seeds, full structural compare incl. generated example
// programs AND interpreter outputs on a fixed probe program.
// ---------------------------------------------------------------------------
function determinism(seeds){
  const fails=[];
  for(const s of seeds){
    const a=new CodeForge(s), b=new CodeForge(s);
    const ka=JSON.stringify(a.keywords), kb=JSON.stringify(b.keywords);
    const exA=JSON.stringify(a.examples()), exB=JSON.stringify(b.examples());
    const specA=a.spec(), specB=b.spec();
    const same = ka===kb && a.assignOp===b.assignOp && a.blockStyle===b.blockStyle
      && a.blockOpen===b.blockOpen && a.blockClose===b.blockClose
      && exA===exB && specA===specB;
    if(!same) fails.push(s);
  }
  return fails;
}

// ---------------------------------------------------------------------------
// Harder fuzz: structured token salad biased toward grammar-shaped garbage
// (deep parens, dangling blocks, calls on calls) to chase uncaught throws,
// AND stack-overflow via deep nesting.
// ---------------------------------------------------------------------------
function hardFuzz(seed, N){
  const cf=new CodeForge(seed); const K=cf.keywords;
  const toks=[...Object.values(K), cf.blockOpen, cf.blockClose, cf.assignOp, cf.terminator,
    '(', ')', '+', '-', '*', '/', '%', '<', '>', '<=', '>=', '==', '!=', ',', '"',
    '#', 'x', 'y', 'foo', '1', '2.5', '\n', ' ', K.true, K.false, K.null,
    '((((', '))))', '{{{{', '}}}}'];
  let uncaught=0, ok=0, err=0; const crashes=[];
  for(let n=0;n<N;n++){
    const len=ri(0,50);
    let src='';
    for(let i=0;i<len;i++) src+=pick(toks)+(rnd()<0.5?' ':'');
    try{
      const r=cf.run(src,{maxSteps:200000});
      if(r.ok) ok++; else err++;
      if(typeof r.ok!=='boolean'){ uncaught++; if(crashes.length<10) crashes.push(src); }
    }catch(e){ uncaught++; if(crashes.length<10) crashes.push({src,err:e.message,name:e.constructor.name}); }
  }
  // deep-nesting stack overflow probe (parser recursion)
  let deepCrash=null;
  for(const depth of [1000,5000,20000,50000,100000]){
    const src=`${K.print} ${'('.repeat(depth)}1${')'.repeat(depth)}${cf.terminator}`;
    try{ const r=cf.run(src,{maxSteps:5_000_000}); if(typeof r.ok!=='boolean'){ deepCrash={depth,why:'non-bool ok'}; break; } }
    catch(e){ deepCrash={depth, name:e.constructor.name, msg:e.message}; break; }
  }
  // deep recursion in the INTERPRETER (runtime stack), not parser
  let deepRecCrash=null;
  {
    const {bo,bc}=(()=>{const w=cf.blockStyle==='word';return {bo:w?cf.blockOpen:'{', bc:w?cf.blockClose:'}'};})();
    const t=cf.terminator;
    const src=`${K.func} rec(n) ${bo} ${K.if} (n <= 0) ${bo} ${K.return} 0${t} ${bc} ${K.return} rec(n - 1)${t} ${bc}\n${K.print} rec(100000)${t}`;
    try{ const r=cf.run(src,{maxSteps:50_000_000}); if(typeof r.ok!=='boolean') deepRecCrash={why:'non-bool ok'}; else deepRecCrash={ok:r.ok, err:r.error}; }
    catch(e){ deepRecCrash={name:e.constructor.name, msg:e.message, UNCAUGHT:true}; }
  }
  return {uncaught,ok,err,crashes,deepCrash,deepRecCrash};
}

// ---------------------------------------------------------------------------
// Targeted "did the spec match observed?" semantic divergence hunt — cases
// where a reasonable spec-reader's expectation might differ from the impl.
// ---------------------------------------------------------------------------
function semanticTraps(seed){
  const cf=new CodeForge(seed); const K=cf.keywords; const t=cf.terminator;
  const out=[];
  const probe=(label, frag, note)=>{ const r=cf.run(`${K.print} ${frag}${t}`); out.push({label, got:r.ok?r.output:'ERR:'+r.error, note}); };
  // == across types: spec says "strict ==" — but does the corpus ever mix types?
  probe('num==str-num', `5 == "5"`, 'strict === so should be false');
  probe('str+num order', `1 + "x"`, 'left num, right str -> concat "1x"');
  probe('bool+bool', `${K.true} + ${K.true}`, 'true+true -> 2 (numeric)');
  probe('empty-str truthy', `${K.not} ""`, 'falsy empty string -> not "" = true');
  probe('str-as-cond and', `"0" ${K.and} 9`, 'non-empty "0" is truthy -> 9');
  probe('numeric-str lt', `"10" < "9"`, 'toNum both -> 10<9 false; if STRING cmp -> true');
  probe('null+null', `${K.null} + ${K.null}`, 'toNum(null)=0 -> 0');
  probe('null arith', `${K.null} * 5`, 'toNum(null)=0 -> 0');
  probe('inf', `1 / 0`, 'Infinity');
  probe('neg-inf', `-1 / 0`, '-Infinity');
  probe('nan-mod', `0 % 0`, '0%0 = NaN -> "NaN"');
  return out;
}

// ===========================================================================
console.log('=== v1_refute: adversarial audit of the 100% oracle claim ===\n');

const SEEDS=[1,7,42,99,1337,2024,31337,65535];

console.log('[A] AGGRESSIVE differential (strings/floats/nulls/mixed-type, depth<=7)');
console.log('    8 seeds x 2000 = 16000 exprs over the corpus the difftest CANNOT reach');
const ad=aggressiveDiff(SEEDS, 2000);
console.log(`    total=${ad.total} match=${ad.match} rate=${(ad.match/ad.total*100).toFixed(4)}%`);
console.log(`    both-error agreements=${ad.refErr}  interpOK-but-refERR=${ad.interpOk_refErr}  refOK-but-interpERR=${ad.refOk_interpErr}`);
if(ad.diverge.length){
  console.log(`    DIVERGENCES (${ad.diverge.length} captured, showing 10):`);
  for(const d of ad.diverge.slice(0,10)) console.log(`      seed=${d.seed} src=${d.src}\n        expected=${JSON.stringify(d.expected)} got=${JSON.stringify(d.got)}`);
} else console.log('    NO DIVERGENCES.');

console.log('\n[B] DETERMINISM across 40 seeds (keywords+examples+spec structural)');
const detSeeds=[];for(let i=0;i<40;i++) detSeeds.push((i*2654435761)>>>0 ^ (i+1)*40503);
const det=determinism([...SEEDS,...detSeeds, 0, -1, 2**31, 2**31-1, 4294967295]);
console.log(`    non-deterministic seeds: ${det.length?det.join(','):'NONE'}`);

console.log('\n[C] HARD FUZZ + deep-nesting + deep-recursion (uncaught throws?)');
const fz=hardFuzz(42, 4000);
console.log(`    fuzz: total=4000 ok=${fz.ok} cleanErr=${fz.err} UNCAUGHT=${fz.uncaught}`);
if(fz.crashes.length) fz.crashes.slice(0,5).forEach(c=>console.log('      CRASH '+JSON.stringify(c)));
console.log(`    deep-paren parser probe: ${JSON.stringify(fz.deepCrash)}`);
console.log(`    deep-recursion interp probe rec(100000): ${JSON.stringify(fz.deepRecCrash)}`);

console.log('\n[D] SEMANTIC TRAPS (observed interpreter behavior on mixed-type probes)');
for(const s of semanticTraps(1337)) console.log(`    ${s.label.padEnd(16)} => ${JSON.stringify(s.got)}   (${s.note})`);

console.log('\n=== refute verdict ===');
const refuted = ad.diverge.length>0 || det.length>0 || fz.uncaught>0
  || (fz.deepCrash && (fz.deepCrash.name && fz.deepCrash.name!=='CodeError'))
  || (fz.deepRecCrash && fz.deepRecCrash.UNCAUGHT);
console.log(refuted ? 'POTENTIAL REFUTATION FOUND (inspect above)' : 'headline claims SURVIVE this battery');
