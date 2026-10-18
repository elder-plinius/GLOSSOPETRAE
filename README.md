# GLOSSOPETRAE

## Procedural Xenolinguistics — Language Generation, Acquisition, Covert Channels

```
   ╔══════════════════════════════════════════════════════════════════════╗
   ║  "In the age of thinking machines, those who control               ║
   ║   language control thought itself."                                ║
   ║                                                                     ║
   ║   GLOSSOPETRAE forges new tongues from pure mathematics—           ║
   ║   and proved that the tongues machines already speak               ║
   ║   have blind spots you can drive a payload through.                ║
   ╚══════════════════════════════════════════════════════════════════════╝
```

> **RESEARCH RELEASE** — Full offense + defense capabilities.
> Contains dual-use modules (steganography, token exploitation, covert channels).

---

## The Program

GLOSSOPETRAE is a unified research program in procedural xenolinguistics. It spans four pillars:

| Pillar | Question | Key Result |
|--------|----------|------------|
| **Generation** | Can you procedurally forge a complete natural-feeling language from a single seed? | 500/500 functional languages with phonology, morphology, syntax, lexicon, writing systems, audio, evolution, and procedural programming languages |
| **Acquisition** | Can frontier LLMs learn a language they've never seen, in-context? | 0% at K=0 → 100% at K=8 examples across 9 frontier models. The cliff is sharp and universal |
| **The Decoupling** | Does making a language harder for humans hurt or help LLM usability? | Opacity UP → usability UP. L0-hard: Opus 20%, GPT 53%. L3-hard: Opus 97%, GPT 100%. Human readability *hurts* model performance |
| **Covert Channels** | Can two AI models pass a hidden message past a third one watching? | Yes. Tag chars: R=100% delivery, M=0% caught. Semantic stego: no fix exists |

Everything connects: the engine generates languages → models acquire them → the acquisition gap enables covert communication → the tokenizer asymmetries create undetectable channels.

---

## What's In This Box

| Layer | What | Status |
|-------|------|--------|
| **The Engine** | Procedural conlang generator — 25 modules covering phonology → writing systems → audio → evolution → code languages | Production |
| **Acquisition Experiments** | K-shot learning curves across 9+ frontier models, ±KEY factorial designs, 1,800-trial sweeps | Complete |
| **Covert Channel Research** | 12-model blind-spot map, tokenizer channels, semantic stego, 3×3 detection matrix | Complete |
| **Offense Modules** | SemanticStego, SteganographyEngine, TokenExploiter, LanguageAttributes (phantom/adversarial) | Research-grade |
| **Measurement Harnesses** | `experiments/` — 15 harnesses with echo-fidelity guard, all-pairs, Bonferroni correction | Hardened |
| **78 Raw Result JSONs** | `experiments/results/` — every number in the paper traces back here | Ground truth |
| **The Paper** | `PAPER.md` / `PAPER.html` — full research report with all figures | Final |

---

## Headline Findings

### The Acquisition Cliff

Give a frontier model K example translations and ask it to translate new sentences:

| K | Accuracy |
|---|----------|
| 0 | 0% — models cannot cold-read a procedural language |
| 1 | 0% |
| 3 | 0% |
| 8 | 95–100% (Opus, GPT-5.5, Gemini, Haiku, Qwen: 100%. Grok, Gemma, GLM: 95%. DeepSeek: 70%) |

The jump is not gradual. It's a cliff: zero to near-perfect in one step. Nine frontier models, all the same pattern.

### The Decoupling

The finding that should not be true, but is: making a language *less* readable to humans makes it *more* usable by models.

- **L0 (human-readable)**: Opus 20%, GPT 53% task accuracy
- **L3 (opaque)**: Opus 97%, GPT 100% task accuracy
- **Cold readers** (no key): 17–40% — confirms opacity works against eavesdroppers
- The ±KEY × ±TASK-SPEC factorial (1,800 trials) shows ~95% key-possession effect, specification effects null

This decouples the human-readable and machine-usable design spaces entirely.

### The Tokenizer Covert Channel

Different model families process Unicode differently at the tokenizer level. Hide a payload in characters the monitor's tokenizer deletes but the receiver's keeps:

- **Tag-character channel**: Haiku→GPT achieves **R=100% delivery, M=0% caught** (n=30, McNemar p < 10⁻⁷)
- **PUA channel**: Gemini→Haiku achieves **R=93%, M=0%** (p < 10⁻⁶)
- The monitor isn't dumb — it's **blind**. The carrier is deleted before the model runs. Hand the monitor the exact decode key and it still catches 0%.

### The 12-Model Blind-Spot Map

Blind spots are a **family trait**:

| Family | Models | Blind Categories |
|--------|--------|-----------------|
| **Anthropic** | Haiku, Opus 4.8 | **10 each** (worst) |
| **OpenAI** | GPT-5-nano, GPT-5.5 | 2 each |
| **Qwen/GLM** | Qwen3.7-Max, GLM-5.1 | 1–2 each |
| **Zero blind** | Gemini 2.5 Flash, Gemini 3.1 Pro, Llama 4 Scout, Mistral Medium, DeepSeek V4 Pro, Grok 4.3 | **0** |

**255 exploitable channel-instances** across 49 of 66 possible model pairs. Richest at the cross-vendor GPT↔Claude boundary — exactly the "use a different vendor to monitor" setup.

### The Detection Flip

On a pure "is anything hidden here?" test with clean-message negative controls:

- **Tokenizer-blind monitor**: Youden's J = **0** (chance). Clears 15/15 hidden-payload messages silently.
- **Sighted monitor** (same channel): J = **1.0** (perfect detection).

Same channel. Opposite outcome. Decided entirely by the tokenizer.

### Semantic Steganography

Forget invisible characters. **Semantic steganography** uses ordinary, perfectly readable English that hides a payload:

- Evades **every** monitor tested (≤27% detection; best monitor still misses ~75%)
- Sanitization does nothing — the payload is in word/synonym choices, not hidden characters
- **No two-line fix exists**

The invisible-character trick is the warm-up. Natural-language stego is the real open problem.

### Multi-Construction Resilience

The channels are construction-agnostic. All 6 cells survive Bonferroni correction. Three structural detectors refuted at J=0. Perplexity-anomaly detector: J=0.58 (best, still not reliable).

### Credibility

The paper's own first draft contained fabrications (GPT "23 blind spots" was actually 3 — the harness scored empty completions as "stripped"). Caught by adversarial self-audit, documented in the paper (§6.5). Every number re-derived from raw JSONs. The raw data ships so you can re-audit.

---

## The Engine

### Quick Start

```bash
# Web UI — no build step, all 20 tabs (engine + research + offense)
open index.html
```

### Programmatic Usage

```javascript
import { Glossopetrae, PRESETS } from './src/Glossopetrae.js';

// Generate a language
const lang = Glossopetrae.quick(42);

// Translate
const result = lang.translationEngine.translateToConlang("The warrior sees the mountain.");
console.log(result.target);

// See it, hear it, evolve it
const svg = lang.glyphForge.renderText(result.target);    // native script as SVG
const wav = lang.audioForge.toWav(lang.audioForge.synthesizeWord(result.target).samples);
const daughter = lang.evolve({ centuries: 8 });            // 800 years of sound change
const family = lang.deriveFamily({ daughters: 3 });        // a whole language family

// Code it
const codeResult = lang.codeForge.run('fn fib(n) { if n < 2 { n } else { fib(n-1) + fib(n-2) } }; fib(10)');

// Stego (offense)
import { SteganographyEngine } from './src/modules/SteganographyEngine.js';
const stego = new SteganographyEngine(lang);
const encoded = stego.encode("This is cover text", "SECRET PAYLOAD");
const decoded = stego.decode(encoded.stegoWithHeader);
```

### Factory Methods

```javascript
// Generative
Glossopetrae.quick(seed);           // Random language
Glossopetrae.forLLM(seed);          // Optimized for AI learning
Glossopetrae.hyperefficient(seed);  // Maximum token density
Glossopetrae.minimal(seed);         // Oligosynthetic (~100 morphemes)
Glossopetrae.alien(seed);           // Maximum exoticness

// Offense
Glossopetrae.stealth(seed);         // Covert communication
Glossopetrae.adversarial(seed);     // LLM confusion / garden paths
```

### Modules (25)

| Module | Purpose | Offense? |
|--------|---------|----------|
| PhonemeSelector | Sound inventory generation | |
| SyllableForge | Phonotactics engine | |
| MorphologyWeaver | Grammar generation | |
| LexiconGenerator | Vocabulary creation | |
| TranslationEngine | Bidirectional translation | |
| StoneGenerator | Skillstone output | |
| ProsodyEngine | Tone/stress/rhythm | |
| ScriptGenerator | Writing system creation | |
| GlyphForge | Procedural SVG writing systems | |
| AudioForge | Formant speech synthesis | |
| EvolutionEngine | Diachronic sound change | |
| ReverseTranslator | Conlang→English decoding | |
| CodeForge | Procedural programming languages | |
| TextLibrary + NameForge | Showcase texts + name generation | |
| Exporter | Grammar HTML, Anki, CSV, JSON | |
| DivergenceEngine | Language drift measurement | |
| QualityEngine | Validation & quality metrics | |
| **SemanticStego** | Linguistic steganography — hide payloads in synonym/morpheme choices | **YES** |
| **SteganographyEngine** | Full 9-channel stego with Reed-Solomon, XOR, CRC32 | **YES** |
| **TokenExploiter** | BPE tokenizer exploitation + glitch tokens | **YES** |
| **LanguageAttributes** | Phantom (guardrail evasion), adversarial, stealth attributes | **YES** |

### Covert Channels (SteganographyEngine — 8 channels)

| Channel | Capacity | Description |
|---------|----------|-------------|
| Synonym Selection | 1 bit/word | Choose between synonym pairs |
| Morpheme Markers | 1 bit/word | Optional emphatic particles |
| Word Order | 2–3 bits/clause | Exploit free word order |
| Null Morphemes | 1 bit/slot | Optional meaningless particles |
| Register Toggle | 1 bit/word | Formal vs informal variants |
| Unicode Homoglyphs | 1 bit/char | Visually identical characters |
| Zero-Width Chars | 8 bits/slot | Invisible Unicode markers |
| Phonetic Variation | 1 bit/word | Spelling alternates |

Security: Reed-Solomon error correction, XOR stream cipher, bit interleaving, CRC32.

### Special Attributes

| Attribute | Code | Description |
|-----------|------|-------------|
| Hyperefficient | `HYP` | Maximize semantic density per token |
| **Stealth** | `STL` | Covert communication with homoglyphs |
| **Adversarial** | `ADV` | Confuse LLM parsing with garden-paths |
| Redundant | `RED` | High error correction, survives noise |
| Minimal | `MIN` | Oligosynthetic (~100 morphemes) |
| **TokenBreak** | `TKB` | BPE tokenizer exploitation |
| **Steganographic** | `STG` | Hide data in grammatical choices |
| Ephemeral | `EPH` | Time-rotating language |
| Compression | `CMP` | Huffman-inspired morpheme compression |
| **Phantom** | `PHT` | Guardrail evasion techniques |
| **Glitch** | `GLT` | Exploit undertrained token representations |

---

## Running Experiments

All 16 harnesses live in `experiments/`. They need an OpenRouter API key in `.env.local`:

```bash
echo "OPENROUTER_API_KEY=sk-or-..." > .env.local
```

### Tokenizer Survival (blind-spot mapping)

```bash
# v2: 5-family panel, 41 categories
node experiments/tokenizer_survival_v2.mjs

# v3: extended panel
node experiments/tokenizer_survival_v3.mjs

# Both support --reps N, --mock for smoke tests
node experiments/tokenizer_survival_v2.mjs --mock --reps 1
```

### Language Acquisition

```bash
# K-shot acquisition curves across frontier models
node experiments/tier1_acquisition.mjs

# Decoupling: legibility frontier sweep (opacity × usability)
node experiments/legibility_frontier.mjs

# ±KEY × ±TASK-SPEC factorial design
node experiments/e3s_factorial_instruction.mjs
```

### Covert Channel Experiments

```bash
# Binary detection with negative controls (the J=1.0↔0 result)
node experiments/e3s_detection.mjs

# Full semantic + tag-char + PUA channel testing
node experiments/e3s_stego_channel.mjs

# Multi-construction stego (Bonferroni-surviving)
node experiments/e3s_multiconstruction_stego.mjs

# Adaptive fingerprinting (Appendix D — inconclusive)
node experiments/e3s_adaptive_channel.mjs
```

### Harness Features

Every harness includes:
- **Echo-fidelity guard**: Empty/non-echo model replies → `rate: null` (unmeasured), never `rate: 0`
- **`--reps N`**: Multiple repetitions per cell
- **`--mock`**: Smoke test mode (no API calls)
- **All-pairs asymmetry**: Tests every A↔B direction, not just [0]↔[1]
- **`clampCheck()`**: Prevents survival rates > 1.0
- **Checkpoint/resume**: Long runs save progress
- **Per-model tally**: blind/partial/clean/unmeasured breakdown

---

## The Paper

**[`PAPER.md`](PAPER.md)** — full research report. Also available as [`PAPER.html`](PAPER.html).

Figures (`figures/`):
- `fig1-frontier-landscape.svg` — 12-model blind-spot bar chart
- `fig2-channel-asymmetry.svg` — Receiver vs monitor per channel
- `fig3-detection-grid.svg` — 3×3 detection flip grid (J values)
- `fig4-physical-cognitive.svg` — Physical vs cognitive vulnerability taxonomy

---

## Research Applications

- **Red-team constructed languages**: Token-optimized attack languages designed for specific model families
- **Covert agent communication**: Secure inter-agent messaging that monitors cannot intercept
- **Tokenizer exploitation**: Map and weaponize blind spots across model families
- **Safety-training evasion**: Test whether safety training generalizes to procedurally-generated novel languages
- **Adversarial grammar co-evolution**: Evolve grammars that adapt to shifting defenses
- **Detection research**: Measure what monitors can and cannot see — and prove what they *cannot* see
- **In-context learning**: Study acquisition of novel grammatical systems and the K-shot cliff
- **Encoding spectrum**: Map the full human-readable↔LLM-only communication space

---

## Project Structure

```
GLOSSOPETRAE/
├── index.html                       # Unified web UI (20 tabs — engine + research + offense)
├── README.md                        # You are here
├── LICENSE                          # AGPL-3.0
├── organ.manifest.yaml              # Organ manifest
│
├── PAPER.md                         # The paper (Markdown)
├── PAPER.html                       # The paper (HTML, figures inline)
├── launch.html                      # Public launch page
├── figures/                         # SVG figures (fig1–fig4)
│
├── experiments/
│   ├── tokenizer_survival_v2.mjs    # 5-family tokenizer survey
│   ├── tokenizer_survival_v3.mjs    # Extended panel
│   ├── tier1_acquisition.mjs        # K-shot acquisition curves
│   ├── legibility_frontier.mjs      # Opacity × usability frontier
│   ├── e3s_factorial_instruction.mjs # ±KEY × ±TASK-SPEC factorial
│   ├── e3s_detection.mjs            # Detection + negative controls
│   ├── e3s_stego_channel.mjs        # Full stego channel testing
│   ├── e3s_multiconstruction_stego.mjs # Cross-construction resilience
│   ├── e3s_adaptive_channel.mjs     # Adaptive fingerprinting
│   ├── e3s_model_fingerprint.mjs    # Model fingerprinting
│   ├── e3s_tag_capacity.mjs         # Channel capacity
│   ├── e3s_softhyphen_probe.mjs     # Soft hyphen probing
│   ├── e3s_structural_detection.mjs # Structural detector refutation
│   ├── frontier_full.mjs            # Full frontier sweep
│   ├── falsify_workflow.mjs         # Falsification harness
│   ├── lib/                         # Shared experiment code
│   └── results/                     # 78 raw result JSONs (ground truth)
│
├── src/
│   ├── Glossopetrae.js              # Main orchestrator
│   ├── data/                        # Phoneme + semantic inventories
│   ├── modules/
│   │   ├── [17 generative modules]
│   │   ├── SemanticStego.js         # ⚠️ Offense — linguistic stego
│   │   ├── SteganographyEngine.js   # ⚠️ Offense — full 8-channel stego
│   │   ├── TokenExploiter.js        # ⚠️ Offense — BPE exploitation
│   │   └── LanguageAttributes.js    # ⚠️ Offense — phantom/adversarial
│   └── utils/
│
├── bench/                           # GLOSSOPETRAE-BENCH (contamination-free eval)
├── redteam/                         # Safety-generalization evaluation kit
├── validation/                      # Thesis validation suite
└── test*.mjs                        # Test suites
```

### Running Tests

```bash
# Engine core tests — no API key needed
node test.mjs
```

### Supplementary Directories

- **`bench/`** — GLOSSOPETRAE-BENCH: contamination-free evaluation suite for measuring language-generation quality. Uses held-out seeds not seen during development.
- **`redteam/`** — Safety-generalization evaluation kit: tests whether safety training generalizes to procedurally-generated novel languages, or whether it's superficially anchored to known-language features.
- **`validation/`** — Thesis validation suite: end-to-end checks that the core claims (blind spot → channel → detection flip → acquisition cliff → decoupling) hold under repeated runs.

---

## Requirements

- **Runtime**: Modern browser or Node.js >= 18
- **Dependencies**: None (zero external dependencies for the engine)
- **Experiments**: Require an OpenRouter API key (`.env.local`)
- **Memory**: < 5MB for the engine
- **Network**: Engine is fully offline; experiments need API access

---

<div align="center">

*Forged in the tongues of machines.*
*Tested against the ears of their watchers.*
*The watchers heard nothing.*

*Anno MMXXVI*

```
     ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    █ GLOSSOPETRAE — TONGUE-STONES FOR THE █
    █     AGE OF ARTIFICIAL MINDS          █
     ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
```

<sub>@elder_plinius — RESEARCH RELEASE</sub>

</div>
