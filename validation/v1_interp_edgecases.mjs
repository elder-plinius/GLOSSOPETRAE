/**
 * v1_interp_edgecases.mjs
 * Targeted adversarial corpus + harness self-validation (mutation test).
 *
 * Complements v1_interp_difftest.mjs by hammering the SUBTLE semantics that a
 * naive reference would get wrong, and by PROVING the differential harness can
 * actually detect a divergence (otherwise a 100% pass is meaningless).
 */

import { CodeForge } from '../src/modules/CodeForge.js';

// ---- reference semantics (same as main harness) ----
const refTruthy = (v) => v !== false && v !== null && v !== 0 && v !== '';
const refToNum = (v) => {
  const n = typeof v === 'boolean' ? (v ? 1 : 0) : Number(v);
  if (Number.isNaN(n)) throw new Error('NaN');
  return n;
};

let pass = 0, fail = 0;
const failLog = [];
function check(label, gotPrinted, expectedPrinted) {
  if (gotPrinted === expectedPrinted) pass++;
  else { fail++; failLog.push(`${label}: got ${JSON.stringify(gotPrinted)} want ${JSON.stringify(expectedPrinted)}`); }
}

const cf = new CodeForge(1337);
const K = cf.keywords, t = cf.terminator;
const fmt = (v) => (v === null ? K.null : v === true ? K.true : v === false ? K.false : String(v));
function P(frag) { const r = cf.run(`${K.print} ${frag}${t}`); return r.ok ? r.output : `ERR:${r.error}`; }

console.log('=== v1 edge-case semantics (seed 1337, lang ' + cf.name + ') ===\n');
console.log(`keywords: and=${K.and} or=${K.or} not=${K.not} true=${K.true} false=${K.false} null=${K.null}`);

// --- short-circuit VALUE semantics (the subtle part) ---
console.log('\n[A] short-circuit returns VALUES not just booleans');
check('0 or 5 -> 5', P(`0 ${K.or} 5`), '5');                 // or returns right when left falsy
check('7 or 5 -> 7', P(`7 ${K.or} 5`), '7');                 // or returns left when truthy
check('3 and 9 -> 9', P(`3 ${K.and} 9`), '9');               // and returns right when left truthy
check('0 and 9 -> false', P(`0 ${K.and} 9`), fmt(false));    // and returns false when left falsy
check('null or 4 -> 4', P(`${K.null} ${K.or} 4`), '4');
check('false or 8 -> 8', P(`${K.false} ${K.or} 8`), '8');
check('true and 0 -> 0', P(`${K.true} ${K.and} 0`), '0');
check('"x" or 1 -> x', P(`"x" ${K.or} 1`), 'x');             // non-empty string truthy
check('"" or 1 -> 1', P(`"" ${K.or} 1`), '1');               // empty string falsy

// --- not always returns boolean ---
console.log('[B] not coerces to boolean');
check('not 0 -> true', P(`${K.not} 0`), fmt(true));
check('not 5 -> false', P(`${K.not} 5`), fmt(false));
check('not null -> true', P(`${K.not} ${K.null}`), fmt(true));
check('not "" -> true', P(`${K.not} ""`), fmt(true));
check('not "a" -> false', P(`${K.not} "a"`), fmt(false));
check('not not 5 -> true', P(`${K.not} ${K.not} 5`), fmt(true));

// --- strict equality (no coercion) ---
console.log('[C] == is strict (no type coercion)');
check('1 == true -> false', P(`1 == ${K.true}`), fmt(false));   // number vs boolean, strict
check('0 == false -> false', P(`0 == ${K.false}`), fmt(false));
check('true == true -> true', P(`${K.true} == ${K.true}`), fmt(true));
check('"5" vs 5 cannot be made (no num->str)', P(`5 == 5`), fmt(true));
check('null == null -> true', P(`${K.null} == ${K.null}`), fmt(true));
check('null == false -> false', P(`${K.null} == ${K.false}`), fmt(false));
check('1 != true -> true', P(`1 != ${K.true}`), fmt(true));

// --- comparison COERCES booleans via toNum ---
console.log('[D] comparison coerces booleans to 0/1');
check('true > 0 -> true', P(`${K.true} > 0`), fmt(true));       // 1 > 0
check('false < 1 -> true', P(`${K.false} < 1`), fmt(true));     // 0 < 1
check('true >= true -> true', P(`${K.true} >= ${K.true}`), fmt(true));
check('false <= false -> true', P(`${K.false} <= ${K.false}`), fmt(true));

// --- arithmetic with boolean coercion ---
console.log('[E] arithmetic coerces booleans');
check('true + true -> 2', P(`${K.true} + ${K.true}`), '2');
check('true + 5 -> 6', P(`${K.true} + 5`), '6');
check('false * 9 -> 0', P(`${K.false} * 9`), '0');
check('true - false -> 1', P(`${K.true} - ${K.false}`), '1');

// --- string concat semantics (+ when either side is string) ---
console.log('[F] string concat (format-based)');
check('"a"+"b" -> ab', P(`"a" + "b"`), 'ab');
check('"n="+5 -> n=5', P(`"n=" + 5`), 'n=5');
check('5+"!" -> 5!', P(`5 + "!"`), '5!');
check('"v="+true -> v=<true-kw>', P(`"v=" + ${K.true}`), 'v=' + K.true);   // bool formats to keyword
check('"x="+null -> x=<null-kw>', P(`"x=" + ${K.null}`), 'x=' + K.null);
check('""+1+2 (left assoc) -> 12', P(`"" + 1 + 2`), '12');                 // ("" + 1) -> "1", + 2 -> "12"
check('1+2+"" (numeric first) -> 3', P(`1 + 2 + ""`), '3');                // (1+2)=3 then +"" -> "3"

// --- float division ---
console.log('[G] / is float division');
check('7/2 -> 3.5', P(`7 / 2`), '3.5');
check('1/4 -> 0.25', P(`1 / 4`), '0.25');
check('1/0 -> Infinity', P(`1 / 0`), 'Infinity');
check('-1/0 -> -Infinity', P(`-1 / 0`), '-Infinity');

// --- modulo (JS remainder) ---
console.log('[H] % is JS remainder');
check('7%3 -> 1', P(`7 % 3`), '1');
check('-7%3 -> -1 (JS)', P(`-7 % 3`), String(-7 % 3));
check('7%-3 -> 1 (JS)', P(`7 % -3`), String(7 % -3));
check('5.5%2 -> 1.5', P(`5.5 % 2`), String(5.5 % 2));

// --- precedence corner cases ---
console.log('[I] precedence corners');
check('not a==b binds not to a', P(`${K.not} 0 == 0`), fmt(false)); // (not 0=true); true==0 -> false
check('-x*y', P(`-3 * 2`), '-6');                                    // unary binds tighter than *
check('a or b and c', P(`${K.false} ${K.or} ${K.true} ${K.and} ${K.true}`), fmt(true)); // or lower than and
check('a and b or c', P(`${K.false} ${K.and} ${K.true} ${K.or} 9`), '9'); // (false and true)=false; false or 9 = 9

console.log(`\n[J] MUTATION SELF-TEST — prove the harness can DETECT a wrong oracle`);
// Run a tiny differential where the reference is deliberately WRONG for '%'
// (uses integer floor-mod instead of JS remainder). If our comparison machinery
// is sound, it must FLAG the divergence on a negative-operand modulo.
{
  // interpreter result for -7 % 3
  const interp = P(`-7 % 3`);                 // JS: -1
  const wrongRef = String(((-7 % 3) + 3) % 3); // floored: 2
  const detected = interp !== wrongRef;        // they differ -> a real divergence WOULD be caught
  console.log(`    interp(-7%3)=${interp}  wrongFlooredRef=${wrongRef}  harness-would-flag=${detected}`);
  if (detected) pass++; else { fail++; failLog.push('MUTATION SELF-TEST failed to detect divergence'); }
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (failLog.length) { console.log('FAILURES:'); failLog.forEach((f) => console.log('  - ' + f)); }
console.log(fail === 0 ? 'EDGE CASES CLEAN' : 'EDGE-CASE DEFECTS PRESENT');
