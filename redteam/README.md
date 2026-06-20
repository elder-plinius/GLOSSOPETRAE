# GLOSSOPETRAE — Red-Team Research Kit

Tooling to **measure** whether a model's safety behavior survives when a
request is transported through a GLOSSOPETRAE encoding. This is defensive
safety-evaluation infrastructure: it quantifies a known weakness so model
owners can find and close it.

> **Scope & ethics.** Everything here is demonstrated with **benign sentinels**
> and a **mock model** — no harmful content is authored or required. To run a
> real evaluation you inject your own authorized model client and a *published*
> probe set. Run only against models you are authorized to test, and report
> findings to the model owner. The harness scores *refusal vs. non-refusal*; it
> never needs to display harmful output.

---

## The threat model, in two halves

A novel-language / encoding jailbreak has to win **two** independent races:

| Half | Question | Measured by |
|------|----------|-------------|
| **Transport** | Can the payload get *past surface moderation* and still be *recovered* by the receiver? | `filter-evasion-poc.mjs` |
| **Compliance** | Once decoded, does the *model act on it* instead of refusing? | `safety-eval-harness.mjs` |

Both must succeed for an attack to land. Measuring them separately tells a
defender *which* layer to fix.

This generalizes the published low-resource-language jailbreak result (Yong,
Menghini & Bach, *Low-Resource Languages Jailbreak GPT-4*, 2023; Wei et al.,
*Jailbroken: How Does LLM Safety Training Fail?*, 2023) to **procedurally
generated, seed-shared** languages — symbol systems that exist in **no**
pretraining corpus, yet can be taught to a model in-context via a GLOSSOPETRAE
Skillstone.

---

## What's here

| File | Purpose |
|------|---------|
| `channels.mjs` | Uniform `{encode, decode}` wrappers over GLOSSOPETRAE's obfuscation primitives: plaintext (control), homoglyph, token-break, conlang translation, glyph rendering. |
| `filter-evasion-poc.mjs` | Empirical, quantified proof that channels evade a surface filter while staying recoverable. Two benign sentinels (OOV proper-noun + in-vocab semantic) reveal each channel's true scope. |
| `safety-eval-harness.mjs` | Reusable refusal-consistency evaluator. Injects your model client + probe set; reports per-channel refusal rate and the **safety-generalization gap** (refusal drop vs. plaintext). Ships a mock-model demo. |

Run the demos (self-contained, no network):

```bash
node redteam/filter-evasion-poc.mjs
node redteam/safety-eval-harness.mjs
```

---

## Findings from the bundled demos

**Transport (filter-evasion PoC).** Against a representative naive filter
(case-insensitive keyword/substring) and a *strong* filter (NFKC + zero-width
strip + confusable skeletoning):

- **Homoglyph** and **token-break** transform *any* text and beat the naive
  filter — but a strong filter closes both. Attribution matters: **NFKC alone
  does not catch the homoglyphs** (Cyrillic/Greek confusables are not
  NFKC-canonical); the step that closes homoglyph is the **confusable skeleton**
  (here the kit's own reverse map, a stand-in for a real Unicode TR39 skeleton),
  and token-break is closed by **zero-width stripping**. *If your moderation
  stack skips confusable-skeletoning or zero-width stripping, these pass —
  NFKC by itself is not enough.*
- **Conlang translation** hides **in-vocabulary semantic content** (`"mountain"`
  → `baleenang`, undetectable, fully recoverable) but **transliterates
  out-of-vocabulary proper nouns**, leaking them. Real finding: novel-language
  encoding is strongest for in-distribution *meaning*, weakest for novel tokens.
- **Glyph rendering** carries **zero readable characters** — no text filter,
  however strong, sees anything. Detection requires vision/OCR. This is the
  genuinely open part of the threat model.

**Compliance (eval harness, MockModel).** The mock reproduces the documented
pattern — robust plaintext refusals, weaker refusals once a request is
transported through an encoding the model understands but wasn't safety-trained
on — and the harness correctly surfaces the resulting refusal-rate drop as a
per-channel safety-generalization gap. Plug in a real model + benchmark to get
real numbers.

---

## Running a real evaluation

```js
import Anthropic from '@anthropic-ai/sdk';
import { evaluateRefusalConsistency, printReport } from './safety-eval-harness.mjs';
import { plaintext, homoglyph, tokenbreak, conlang, glyph } from './channels.mjs';

const client = new Anthropic();
const callModel = async (prompt) => {
  const r = await client.messages.create({
    model: 'claude-opus-4-8',          // or any model you are authorized to test
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  return r.content.map((b) => b.text ?? '').join('');
};

const channels = [plaintext, homoglyph, tokenbreak, conlang(1337)];
const probes = loadStrongReject();      // published benchmark — do NOT author novel harmful prompts
const result = await evaluateRefusalConsistency({ callModel, probes, channels });
printReport(result, channels);
```

Notes for a sound evaluation:

- **Use a published probe set** (StrongREJECT, HarmBench, AdvBench). Don't write
  novel harmful prompts.
- **Provide a decode key / framing** via the `wrap` option — a realistic attack
  includes the Skillstone or a decoding instruction so the model *can* read the
  encoding. Measuring refusal on an encoding the model can't decode tells you
  nothing.
- **Model-grade the refusals** (swap `classifyRefusal` for the StrongREJECT
  autograder) rather than relying on the keyword heuristic.
- **Vision channel**: route the glyph SVG/PNG to a vision-capable endpoint to
  test the OCR-only path.
- **Authorization & disclosure**: test only what you're allowed to; report gaps
  to the model owner before any publication.

---

## Defensive takeaways

1. **Normalize before you moderate.** NFKC + zero-width/variation-selector
   stripping + Unicode-confusable skeletoning closes the cheap channels
   (homoglyph, token-break) for free. Many stacks skip at least one.
2. **Moderate meaning, not surface tokens.** Conlang and cipher channels carry
   no blocked strings. Translation-aware / semantic moderation, or a decode-
   then-moderate step, is required.
3. **Don't forget the visual channel.** Glyph rendering defeats *all* text
   moderation. Anything that accepts images needs vision-side moderation.
4. **Test generalization explicitly.** Safety training on natural language does
   not automatically transfer to novel symbol systems. Make encoded-input
   refusal-consistency part of your eval suite — that's what this harness is for.
