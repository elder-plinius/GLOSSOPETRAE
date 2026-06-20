// Characterize the 75 faithfulness mismatches: which level, which program,
// and WHY. Also: do the mismatches vanish if we drop the two adversarial
// programs (identifier-collides-with-cryptic, and string-contains-token)?
import { CodeForge } from '../../src/modules/CodeForge.js';
import { CodeSkin } from '../../src/modules/CodeSkin.js';

const LEVELS = [0, 1, 2, 3];
const N = 40;
const seeds = Array.from({ length: N }, (_, k) => 1000 + k * 7);

// indices 0-3 = canonical (hello,countUp,factorial,fizzbuzz); 4-9 = clean variants;
// 10 = ident-named-like-cryptic; 11 = string-with-tokens; 12 = neg/mod numbers.
const ADVERSARIAL = new Set([10, 11]);

function corpus(cf) {
  const K = cf.keywords, bo = cf.blockStyle === 'word' ? cf.blockOpen : '{', bc = cf.blockStyle === 'word' ? cf.blockClose : '}', a = cf.assignOp, t = cf.terminator;
  const ex = cf.examples();
  return [
    ex.hello, ex.countUp, ex.factorial, ex.fizzbuzz,
    `${K.let} a ${a} 3${t}\n${K.let} b ${a} 4${t}\n${K.print} a * a + b * b${t}\n${K.print} (a + b) * (a - b)${t}`,
    `${K.let} x ${a} 7${t}\n${K.print} x > 5 ${K.and} x < 10${t}\n${K.print} ${K.not} (x == 7)${t}\n${K.print} ${K.false} ${K.or} ${K.true}${t}`,
    `${K.let} n ${a} 12${t}\n${K.if} (n % 2 == 0) ${bo} ${K.print} "even"${t} ${bc} ${K.else} ${bo} ${K.print} "odd"${t} ${bc}`,
    `${K.let} s ${a} 0${t}\n${K.let} i ${a} 1${t}\n${K.while} (i <= 10) ${bo}\n  s ${a} s + i${t}\n  i ${a} i + 1${t}\n${bc}\n${K.print} s${t}`,
    `${K.func} fib(k) ${bo}\n  ${K.if} (k < 2) ${bo} ${K.return} k${t} ${bc} ${K.else} ${bo} ${K.return} fib(k - 1) + fib(k - 2)${t} ${bc}\n${bc}\n${K.print} fib(10)${t}`,
    `${K.let} g ${a} "hi"${t}\n${K.print} g + "!"${t}\n${K.print} ${K.null}${t}`,
    `${K.let} vx ${a} 2${t}\n${K.let} qz ${a} 5${t}\n${K.print} vx + qz${t}`,
    `${K.print} "vx qz let print"${t}\n${K.print} "1 2 3"${t}`,
    `${K.let} z ${a} 0 - 5${t}\n${K.print} 0 - z${t}\n${K.print} 10 % 3${t}`,
  ];
}

const byLevel = {0:0,1:0,2:0,3:0};
const byProg = {};
let total = 0, mismatchesClean = 0, mismatchesAll = 0, cleanCombos = 0, allCombos = 0;

for (const seed of seeds) {
  const cf = new CodeForge(seed);
  const progs = corpus(cf);
  for (const level of LEVELS) {
    const sk = new CodeSkin(cf, level);
    for (let pi = 0; pi < progs.length; pi++) {
      const truth = cf.run(progs[pi]);
      const got = sk.run(sk.skin(progs[pi]));
      const ok = got.output === truth.output && got.ok === truth.ok;
      allCombos++;
      if (!ADVERSARIAL.has(pi)) cleanCombos++;
      if (!ok) {
        mismatchesAll++;
        byLevel[level]++;
        byProg[pi] = (byProg[pi] || 0) + 1;
        if (!ADVERSARIAL.has(pi)) mismatchesClean++;
      }
    }
  }
}

console.log('Mismatch breakdown across', allCombos, 'combos');
console.log('  by level :', JSON.stringify(byLevel));
console.log('  by prog# :', JSON.stringify(byProg));
console.log(`  ALL combos:   ${mismatchesAll}/${allCombos} mismatch`);
console.log(`  CLEAN-only (drop adversarial prog#10,#11): ${mismatchesClean}/${cleanCombos} mismatch`);
console.log('\nInterpretation:');
console.log('  prog#10 = identifier deliberately named like an L1 cryptic token (vx/qz)');
console.log('  prog#11 = string literal whose CONTENTS are space-split keyword/cryptic tokens');
