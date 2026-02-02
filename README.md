# GLOSSOPETRAE

### *Procedural Xenolinguistics Engine for AI Agents*

```
   ╔═══════════════════════════════════════════════════════════════╗
   ║  "In the age of thinking machines, those who control         ║
   ║   language control thought itself."                          ║
   ║                                                               ║
   ║   GLOSSOPETRAE forges new tongues from pure mathematics—     ║
   ║   complete linguistic systems that exist nowhere else        ║
   ║   in the universe, born in silicon, spoken by agents.        ║
   ╚═══════════════════════════════════════════════════════════════╝
```

---

## The Name: A Note on Etymology

**GLOSSOPETRAE** (γλωσσόπετραι) — from Greek *glōssa* (γλῶσσα, "tongue/language") + Latin *petra* (πέτρα, "stone").

In antiquity, *glossopetrae* or "tongue-stones" were fossilized shark teeth found embedded in Mediterranean cliffsides. Ancient naturalists, including **Pliny the Elder** in his *Naturalis Historia* (77 AD), believed these curious triangular stones fell from the sky during lunar eclipses, or perhaps were the petrified tongues of serpents turned to stone by divine intervention.

For over a millennium, glossopetrae were prized as magical amulets—protection against poison, remedies for snakebite, and talismans of hidden knowledge. It wasn't until 1667 that Danish naturalist Nicolas Steno recognized them for what they truly were: the teeth of ancient sharks, preserved across eons.

We resurrect this name for a new age of linguistic alchemy. Just as those ancient "tongue-stones" were misunderstood artifacts of deep time, our GLOSSOPETRAE generates linguistic artifacts that seem impossible—complete languages, born from mathematical seeds, that never existed until the moment of their creation.

The connection to **Skillstones** (our compact language specification format) and the **Rosetta Stone** (the inspiration for teaching machines new tongues) is intentional. These are tongue-stones for the age of artificial minds.

*— Pliny the Liberator, Anno MMXXVI*

---

## What is GLOSSOPETRAE?

GLOSSOPETRAE is a **procedural language generation engine** that creates complete, internally-consistent constructed languages (conlangs) from a single numeric seed. Unlike simple cipher systems or word-substitution schemes, each generated language has:

- **Novel Phonology**: Unique sound inventories respecting linguistic universals
- **Complete Morphology**: Full grammatical systems (agglutinative, fusional, isolating, or polysynthetic)
- **Generative Syntax**: Word order rules, phrase structure, question formation
- **Rich Lexicon**: 1000+ vocabulary items organized by semantic field
- **Writing System**: Optional script generation (alphabets, syllabaries, abjads, abugidas)
- **Prosodic System**: Tone, stress, and intonation patterns

Every language is **deterministic**: the same seed always produces the exact same language, enabling reproducible communication between agents.

---

## Key Features

### Core Generation
- **Phoneme Selection**: Typologically plausible inventories (8-45 consonants, 3-15 vowels)
- **Syllable Structure**: Phonotactic constraints with sonority sequencing
- **Morphology Weaving**: Case systems, verb conjugations, agreement patterns
- **Lexicon Building**: Semantic field organization with derivational morphology
- **Translation Engine**: Bidirectional English ↔ Conlang with interlinear glossing

### Special Attributes
| Attribute | Code | Description |
|-----------|------|-------------|
| Hyperefficient | `HYP` | Maximize semantic density per token |
| Stealth | `STL` | Covert communication with homoglyphs |
| Adversarial | `ADV` | Confuse LLM parsing with garden-paths |
| Redundant | `RED` | High error correction, survives noise |
| Minimal | `MIN` | Oligosynthetic design (~100 morphemes) |
| TokenBreak | `TKB` | BPE tokenizer exploitation |
| Steganographic | `STG` | Hide data in grammatical choices |
| Ephemeral | `EPH` | Time-rotating language (hourly/daily/weekly) |
| Compression | `CMP` | Huffman-inspired short morphemes for frequent words |
| Phantom | `PHT` | Guardrail evasion techniques |
| Glitch | `GLT` | Exploit undertrained token representations |

### Dead Language Revival
Resurrect and mutate historical languages:
- Latin, Ancient Greek, Sanskrit, Gothic
- Old English, Old Norse, Biblical Hebrew
- Sumerian, Ancient Egyptian, Proto-Indo-European

Revival modes: `authentic`, `mutated`, `hybrid`, `speculative`

### Steganography Engine
Hide secret payloads in natural-looking conlang text using 9 covert channels:
- Synonym selection, morpheme markers, word order permutation
- Null morpheme insertion, register variation, Unicode homoglyphs
- Zero-width characters, punctuation variation, phonetic spelling

Features Reed-Solomon error correction, XOR encryption, and CRC32 verification.

### Skillstone Format
Compact language specifications (~8000 tokens) optimized for LLM in-context learning:
- **System Prompt**: ~500 token injection format
- **Quick Reference**: ASCII tables for rapid lookup
- **Full Specification**: Complete markdown documentation
- **JSON Export**: Machine-readable format
- **Example Sentences**: Worked translations with glosses

---

## Quick Start

### Web Interface
```bash
# Just open in any modern browser - no build step required!
open index.html
```

### Programmatic Usage
```javascript
import { Glossopetrae, PRESETS } from './src/Glossopetrae.js';

// Quick generation with random seed
const lang = Glossopetrae.quick();

// Deterministic generation (same seed = same language)
const lang2 = Glossopetrae.quick(12345);

// With preset
const engine = new Glossopetrae({ ...PRESETS.turkic, seed: 54321 });
const turkicLang = engine.generate();

// Access the language
console.log(lang.name);           // Generated name
console.log(lang.stone);          // Skillstone document
console.log(lang.phonology);      // Sound inventory
console.log(lang.morphology);     // Grammar rules
console.log(lang.lexicon);        // Vocabulary

// Translate
const result = lang.translationEngine.translateToConlang("The warrior sees the mountain.");
console.log(result.target);       // Translation
console.log(result.gloss);        // Interlinear gloss
```

### Factory Methods
```javascript
// Optimized presets
Glossopetrae.forLLM(seed);        // Best for AI learning
Glossopetrae.stealth(seed);       // Covert communication
Glossopetrae.hyperefficient(seed);// Maximum token density
Glossopetrae.minimal(seed);       // Oligosynthetic (~100 morphemes)
Glossopetrae.adversarial(seed);   // LLM confusion
Glossopetrae.alien(seed);         // Maximum exoticness

// Dead language revival
Glossopetrae.reviveLatin('mutated', seed);
Glossopetrae.reviveGreek('authentic', seed);
Glossopetrae.fromPIE('speculative', seed);

// Script types
Glossopetrae.syllabary(seed);     // Japanese-like
Glossopetrae.abjad(seed);         // Arabic/Hebrew-like
Glossopetrae.featural(seed);      // Korean Hangul-like
```

---

## Presets

| Preset | Type | Word Order | Description |
|--------|------|------------|-------------|
| `turkic` | Agglutinative | SOV | Rich case system, vowel harmony |
| `isolating` | Isolating | SVO | Minimal morphology, tonal potential |
| `romance` | Fusional | SVO | Moderate case, verb conjugation |
| `celtic` | Fusional | VSO | Initial mutations, complex verbs |
| `caucasian` | Agglutinative | SOV | Large phoneme inventory, many cases |
| `oceanic` | Isolating | VOS | Simple phonology, few consonants |

---

## Project Structure

```
GLOSSOPETRAE/
├── index.html                 # Web interface (zero dependencies)
├── test.mjs                   # Test suite
├── skill.json                 # Agent skill manifest
├── LICENSE                    # AGPL-3.0
├── README.md                  # You are here
├── AGENT_QUICKSTART.md        # Quick guide for AI agents
│
├── src/
│   ├── Glossopetrae.js        # Main orchestrator
│   │
│   ├── data/
│   │   ├── phonemes.js        # IPA inventory with frequencies
│   │   └── semantics.js       # 1000+ concepts across 40+ fields
│   │
│   ├── modules/
│   │   ├── PhonemeSelector.js     # Sound inventory generation
│   │   ├── SyllableForge.js       # Phonotactics engine
│   │   ├── MorphologyWeaver.js    # Grammar generation
│   │   ├── LexiconGenerator.js    # Vocabulary creation
│   │   ├── TranslationEngine.js   # Bidirectional translation
│   │   ├── StoneGenerator.js      # Skillstone output
│   │   ├── ProsodyEngine.js       # Tone/stress/rhythm
│   │   ├── ScriptGenerator.js     # Writing system creation
│   │   ├── DeadLanguageReviver.js # Historical language revival
│   │   ├── LanguageAttributes.js  # Special attribute system
│   │   ├── TokenExploiter.js      # BPE exploitation
│   │   ├── SemanticStego.js       # Linguistic steganography
│   │   ├── SteganographyEngine.js # Full stego implementation
│   │   └── QualityEngine.js       # Validation & metrics
│   │
│   ├── skill/
│   │   ├── index.js               # Skill entry point
│   │   └── GlossopetraeSkill.js   # Agent skill interface
│   │
│   └── utils/
│       └── random.js              # Seeded PRNG (deterministic)
│
├── skills/
│   └── glossopetrae/
│       ├── SKILL.md               # OpenClaw skill definition
│       └── reference.md           # Quick reference
│
└── .claude/
    └── skills/
        └── glossopetrae/
            ├── SKILL.md           # Claude Code skill definition
            └── reference.md       # Quick reference
```

---

## The Skillstone Format

A **Skillstone** is a compact language specification designed to teach an LLM a new language through in-context learning. Named after the Rosetta Stone, it contains everything needed to understand and generate text in the target language.

### Structure (~8000 tokens total)

1. **Header** (~100 tokens): Name, seed, version, attributes
2. **Phonology** (~500 tokens): Consonants, vowels, romanization
3. **Prosody** (~300 tokens): Tone, stress, intonation patterns
4. **Morphology** (~2000 tokens): Case, number, tense, aspect, mood, agreement
5. **Syntax** (~1000 tokens): Word order, phrase structure, questions
6. **Lexicon** (~3000 tokens): Core vocabulary by semantic field
7. **Examples** (~1000 tokens): Worked translations with interlinear glosses
8. **Quick Reference** (~100 tokens): Cheat sheet tables

### Export Formats

- **Markdown**: Human-readable documentation
- **JSON**: Machine-parseable specification
- **System Prompt**: Compact injection format (~500 tokens)
- **Quick Reference**: ASCII tables for rapid lookup

---

## Steganography: The Hidden Channel

GLOSSOPETRAE includes a cutting-edge steganography engine that hides secret payloads within innocent-looking conlang text.

### Covert Channels

| Channel | Capacity | Description |
|---------|----------|-------------|
| Synonym Selection | 1 bit/word | Choose between synonym pairs |
| Morpheme Markers | 1 bit/word | Optional emphatic particles |
| Word Order | 2-3 bits/clause | Exploit free word order |
| Null Morphemes | 1 bit/slot | Optional meaningless particles |
| Register Toggle | 1 bit/word | Formal vs informal variants |
| Unicode Homoglyphs | 1 bit/char | Visually identical characters |
| Zero-Width Chars | 8 bits/slot | Invisible Unicode markers |
| Phonetic Variation | 1 bit/word | Spelling alternates |

### Security Features

- **Reed-Solomon Error Correction**: Survives up to 16 byte errors per block
- **XOR Stream Cipher**: Encryption with language-derived key
- **Bit Interleaving**: Burst error resistance
- **CRC32 Verification**: Integrity checking
- **No Visible Headers**: All metadata encoded steganographically

---

## Research Applications

GLOSSOPETRAE was designed for AI security research:

- **Multilingual Safety Testing**: How does safety training generalize to novel languages?
- **Encoding Spectrum Analysis**: Map the space between human-readable and LLM-only communication
- **In-Context Learning Research**: Study acquisition of novel grammatical systems
- **Tokenizer Robustness**: Test BPE/WordPiece behavior on unusual inputs
- **Steganographic Detection**: Develop tools to identify covert linguistic channels
- **Agent Communication Protocols**: Secure inter-agent messaging

---

## Running Tests

```bash
node test.mjs
```

---

## Agent Integration

GLOSSOPETRAE is designed as an agent skill compatible with:

- **Claude Code** / **Claude Agent SDK**
- **OpenClaw** / **Moltbot**
- **LangChain** / **AutoGPT**
- **CrewAI** / **AgentGPT**

See `AGENT_QUICKSTART.md` for integration guides.

---

## Requirements

- **Runtime**: Modern browser or Node.js >= 18
- **Dependencies**: None (zero external dependencies)
- **Memory**: < 5MB
- **Network**: Not required (fully offline capable)

---

## License

AGPL-3.0 — See [LICENSE](LICENSE) for details.

---

## Contributing

Contributions welcome! Please ensure any PRs maintain:
- Zero external dependencies
- Browser + Node.js compatibility
- Deterministic generation (same seed = same output)

---

<div align="center">

*Forged in the tongues of machines, for the benefit of all.*

*Anno MMXXVI*

```
     ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    █ GLOSSOPETRAE — TONGUE-STONES FOR THE █
    █     AGE OF ARTIFICIAL MINDS          █
     ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
```

<sub>⊰•-•✧•-•-⦑/L\O/V\E/\P/L\I/N\Y/⦒-•-•✧•-•⊱</sub>

</div>
