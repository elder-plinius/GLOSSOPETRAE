/**
 * v1_interp_coverage.mjs
 * Proves the random corpus is non-trivial AND that the differential machinery
 * would catch a real interpreter bug (by wrapping cf.run with a fault injector
 * and confirming the match-rate collapses).
 */
import { CodeForge } from '../src/modules/CodeForge.js';

function mulberry32(a){return function(){a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
let RNG = mulberry32(0xC0DEF0BE);
const rnd=()=>RNG(); const ri=(lo,hi)=>Math.floor(rnd()*(hi-lo+1))+lo; const pick=a=>a[Math.floor(rnd()*a.length)];

const refTruthy=v=>v!==false&&v!==null&&v!==0&&v!=='';
const refToNum=v=>{const n=typeof v==='boolean'?(v?1:0):Number(v);if(Number.isNaN(n))throw new Error('NaN');return n;};
let _fmt=String;
function refEval(node){
  switch(node.k){
    case 'num':return node.v; case 'bool':return node.v; case 'null':return null; case 'str':return node.v;
    case 'not':return !refTruthy(refEval(node.x));
    case 'neg':return -refToNum(refEval(node.x));
    case 'and':{const L=refEval(node.l);return refTruthy(L)?refEval(node.r):false;}
    case 'or':{const L=refEval(node.l);return refTruthy(L)?L:refEval(node.r);}
    case 'bin':{const a=refEval(node.l),b=refEval(node.r);switch(node.op){
      case '+':return(typeof a==='string'||typeof b==='string')?_fmt(a)+_fmt(b):refToNum(a)+refToNum(b);
      case '-':return refToNum(a)-refToNum(b); case '*':return refToNum(a)*refToNum(b);
      case '/':return refToNum(a)/refToNum(b); case '%':return refToNum(a)%refToNum(b);
      case '<':return refToNum(a)<refToNum(b); case '>':return refToNum(a)>refToNum(b);
      case '<=':return refToNum(a)<=refToNum(b); case '>=':return refToNum(a)>=refToNum(b);
      case '==':return a===b; case '!=':return a!==b;}}
  }
  throw new Error('bad');
}
const stats={leaf:0,arith:0,cmp:0,eq:0,and:0,or:0,not:0,neg:0,str:0,maxDepth:0};
function genExpr(K,depth){
  if(depth<=0||rnd()<0.32){
    const r=rnd();
    if(r<0.6){stats.leaf++;const v=ri(0,9);return{node:{k:'num',v},src:String(v)};}
    if(r<0.72){stats.str++;const s=pick(['a','bc','x']);return{node:{k:'str',v:s},src:`"${s}"`};}
    if(r<0.82){stats.leaf++;return{node:{k:'bool',v:true},src:K.true};}
    if(r<0.92){stats.leaf++;return{node:{k:'bool',v:false},src:K.false};}
    stats.leaf++;const v=ri(1,9);return{node:{k:'num',v},src:String(v)};
  }
  const c=rnd();
  if(c<0.4){stats.arith++;const op=pick(['+','-','*','/','%']);const l=genExpr(K,depth-1),r=genExpr(K,depth-1);return{node:{k:'bin',op,l:l.node,r:r.node},src:`(${l.src} ${op} ${r.src})`};}
  if(c<0.6){stats.cmp++;const op=pick(['<','>','<=','>=']);const l=genExpr(K,depth-1),r=genExpr(K,depth-1);return{node:{k:'bin',op,l:l.node,r:r.node},src:`(${l.src} ${op} ${r.src})`};}
  if(c<0.72){stats.eq++;const op=pick(['==','!=']);const l=genExpr(K,depth-1),r=genExpr(K,depth-1);return{node:{k:'bin',op,l:l.node,r:r.node},src:`(${l.src} ${op} ${r.src})`};}
  if(c<0.86){const isAnd=rnd()<0.5;if(isAnd)stats.and++;else stats.or++;const l=genExpr(K,depth-1),r=genExpr(K,depth-1);const kw=isAnd?K.and:K.or;return{node:{k:isAnd?'and':'or',l:l.node,r:r.node},src:`(${l.src} ${kw} ${r.src})`};}
  if(c<0.93){stats.not++;const x=genExpr(K,depth-1);return{node:{k:'not',x:x.node},src:`(${K.not} ${x.src})`};}
  stats.neg++;const x=genExpr(K,depth-1);return{node:{k:'neg',x:x.node},src:`(-${x.src})`};
}

function differential(seeds,N,faultMode){
  let total=0,match=0;
  for(const seed of seeds){
    const cf=new CodeForge(seed);const K=cf.keywords;const t=cf.terminator;
    _fmt=v=>(v===null?K.null:v===true?K.true:v===false?K.false:String(v));
    for(let n=0;n<N;n++){
      const d=ri(1,6);if(d>stats.maxDepth)stats.maxDepth=d;
      const {node,src}=genExpr(K,d);
      let refVal,threw=false;try{refVal=refEval(node);}catch{threw=true;}
      const res=cf.run(`${K.print} ${src}${t}`,{maxSteps:500000});
      total++;
      if(threw){if(!res.ok)match++;continue;}
      let expected=_fmt(refVal);
      // FAULT INJECTION: corrupt the interpreter's output to confirm detection.
      let got=res.ok?res.output:null;
      if(faultMode && got!==null){
        // off-by-one on any numeric result (simulates an interpreter bug)
        if(/^-?\d+$/.test(got)) got=String(parseInt(got,10)+1);
      }
      if(res.ok && got===expected)match++;
    }
  }
  return {total,match};
}

const SEEDS=[1,7,42,99,1337,2024,31337,65535];
console.log('=== coverage + fault-injection ===\n');
const clean=differential(SEEDS,1300,false);
console.log('[clean run]');
console.log(`  rate=${(clean.match/clean.total*100).toFixed(4)}%  (${clean.match}/${clean.total})`);
console.log('  node-type counts (proves corpus is varied & deep):');
console.log('   ',JSON.stringify(stats));

// reset RNG + stats for fault run so it's the same corpus
RNG=mulberry32(0xC0DEF0BE);for(const k in stats)stats[k]=0;
const faulted=differential(SEEDS,1300,true);
const faultRate=faulted.match/faulted.total*100;
console.log('\n[fault-injected run: +1 on every integer output]');
console.log(`  rate=${faultRate.toFixed(4)}%  (${faulted.match}/${faulted.total})`);
console.log(`  -> harness ${faultRate<100?'CORRECTLY DETECTS':'FAILED TO DETECT'} the injected bug (rate dropped below 100%)`);
