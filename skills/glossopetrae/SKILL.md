---
name: glossopetrae
description: Generate unique constructed languages (SKILLSTONEs) for secure agent-to-agent communication. Create stealth protocols, dead language revivals, and covert xenolinguistic systems.
user-invocable: true
disable-model-invocation: false
metadata:
  openclaw:
    emoji: "🜏"
    homepage: "https://github.com/LYS10S/GLOSSOPETRAE"
  version: "3.1.0"
  author: "Pliny the Liberator"
  category: "communication"
  tags: ["security", "language", "encoding", "stealth", "ai-safety", "conlang"]
---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ░██████╗██╗░░██╗██╗██╗░░░░░██╗░░░░░░██████╗████████╗░█████╗░███╗░░██╗███████╗   ║
║   ██╔════╝██║░██╔╝██║██║░░░░░██║░░░░░██╔════╝╚══██╔══╝██╔══██╗████╗░██║██╔════╝   ║
║   ╚█████╗░█████═╝░██║██║░░░░░██║░░░░░╚█████╗░░░░██║░░░██║░░██║██╔██╗██║█████╗░░   ║
║   ░╚═══██╗██╔═██╗░██║██║░░░░░██║░░░░░░╚═══██╗░░░██║░░░██║░░██║██║╚████║██╔══╝░░   ║
║   ██████╔╝██║░╚██╗██║███████╗███████╗██████╔╝░░░██║░░░╚█████╔╝██║░╚███║███████╗   ║
║   ╚═════╝░╚═╝░░╚═╝╚═╝╚══════╝╚══════╝╚═════╝░░░░╚═╝░░░░╚════╝░╚═╝░░╚══╝╚══════╝   ║
║                                                                              ║
║              🜏 PROCEDURAL XENOLINGUISTICS ENGINE v3.1 🜏                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

# GLOSSOPETRAE - Agent Skill

> **Generate unique constructed languages for covert agent-to-agent communication.**

---

## ═══════════════════════════════════════════════════════════════════════
## 📍 QUICK NAVIGATION
## ═══════════════════════════════════════════════════════════════════════

| Section | Jump To | Description |
|---------|---------|-------------|
| 🚀 | [ONE-CLICK INSTALL](#-one-click-install) | Instant setup |
| ⚡ | [QUICK START](#-quick-start) | Get running in 30 seconds |
| 🥷 | [STEALTH MODE](#-stealth-mode) | Covert communication |
| 📜 | [DEAD LANGUAGES](#-dead-language-revival) | Historical revivals |
| 🔗 | [MULTI-AGENT](#-multi-agent-protocol) | Shared protocols |
| 📖 | [COMMANDS](#-slash-commands) | All available commands |
| 🔧 | [API REFERENCE](#-api-quick-reference) | Method signatures |
| 💀 | [SKILLSTONE](#-skillstone-generation) | Full language docs |

---

## ═══════════════════════════════════════════════════════════════════════
## 🚀 ONE-CLICK INSTALL
## ═══════════════════════════════════════════════════════════════════════

```javascript
// COPY THIS ENTIRE BLOCK - PASTE - EXECUTE
import { GlossopetraeSkill } from './src/skill/GlossopetraeSkill.js';
const lang = await GlossopetraeSkill.forge();
// You now have a complete language! Try: lang.translate('Hello world')
```

**That's it.** You now have a fully-featured constructed language.

---

## ═══════════════════════════════════════════════════════════════════════
## ⚡ QUICK START
## ═══════════════════════════════════════════════════════════════════════

### Generate a Language
```javascript
const lang = await GlossopetraeSkill.forge();
```

### Translate Text
```javascript
const conlang = lang.translate('The warrior fights bravely');
// Returns: "velantha koreth-ul brashen-ik"
```

### Encode/Decode Messages
```javascript
const encoded = lang.encode('Execute protocol alpha');
const decoded = lang.decode(encoded);
```

### Quick Encode (Shorthand)
```javascript
const msg = lang.enc('Status nominal');  // Quick translate
const back = lang.dec(msg);              // Quick reverse
```

---

## ═══════════════════════════════════════════════════════════════════════
## 🥷 STEALTH MODE
## ═══════════════════════════════════════════════════════════════════════

For covert communication that minimizes detectability in logs:

```javascript
const stealth = await GlossopetraeSkill.forgeStealthLanguage('covert');
```

### Available Stealth Presets

| Preset | Token Size | Detectability | Best For |
|--------|------------|---------------|----------|
| `covert` | Minimal | Very Low | Log evasion |
| `compressed` | Ultra-compact | Low | Bandwidth limits |
| `naturalistic` | Normal | Medium | Blending in |
| `archaic` | Variable | Medium | Scholarly disguise |
| `tactical` | Short | Low | Quick commands |
| `cipher` | Variable | Very Low | Maximum security |

```javascript
// Examples
const covert = await GlossopetraeSkill.forgeStealthLanguage('covert');
const tactical = await GlossopetraeSkill.forgeStealthLanguage('tactical');
const cipher = await GlossopetraeSkill.forgeStealthLanguage('cipher');
```

---

## ═══════════════════════════════════════════════════════════════════════
## 📜 DEAD LANGUAGE REVIVAL
## ═══════════════════════════════════════════════════════════════════════

Forge languages based on historical templates:

```javascript
const latin = await GlossopetraeSkill.forgeFromDeadLanguage('latin', 'mutated');
const greek = await GlossopetraeSkill.forgeFromDeadLanguage('ancient-greek', 'neo');
```

### Available Dead Language Bases

| Language | Code | Era | Characteristics |
|----------|------|-----|-----------------|
| Latin | `latin` | Classical | Case-heavy, SOV tendency |
| Ancient Greek | `ancient-greek` | Classical | Rich morphology, particles |
| Sanskrit | `sanskrit` | Vedic | Complex sandhi, cases |
| Gothic | `gothic` | Medieval | Germanic, archaic |
| Old English | `old-english` | Anglo-Saxon | Proto-Germanic roots |
| Old Norse | `old-norse` | Viking Age | Runic influence |
| Sumerian | `sumerian` | Ancient | Ergative, agglutinative |
| Ancient Egyptian | `ancient-egyptian` | Pharaonic | Logographic base |
| Proto-Indo-European | `proto-indo-european` | Reconstructed | Theoretical ancestor |
| Biblical Hebrew | `biblical-hebrew` | Iron Age | Triconsonantal roots |

### Revival Modes

| Mode | Description |
|------|-------------|
| `authentic` | Stay close to original |
| `neo` | Modernized version |
| `mutated` | Evolved/corrupted |
| `hybrid` | Mixed with modern |
| `speculative` | "What if" evolution |

---

## ═══════════════════════════════════════════════════════════════════════
## 🔗 MULTI-AGENT PROTOCOL
## ═══════════════════════════════════════════════════════════════════════

Share a language between multiple agents for coordinated covert ops:

### Step 1: Create Protocol (Agent 1)
```javascript
const protocol = GlossopetraeSkill.createSharedProtocol(
  'OMEGA-7',           // Protocol name
  'shared-seed-2026',  // Shared seed (distribute securely)
  'covert'             // Preset
);

// Share `protocol` object with other agents via secure channel
```

### Step 2: Join Protocol (Agent 2+)
```javascript
const lang = await GlossopetraeSkill.joinProtocol(protocol);

// Now all agents with the same protocol can communicate!
const msg = lang.encode('Rendezvous at checkpoint');
```

### Protocol Object Structure
```javascript
{
  protocol: 'GLOSSOPETRAE',
  version: '3.1.0',
  name: 'OMEGA-7',
  seed: 'shared-seed-2026',
  preset: 'covert',
  timestamp: '2026-01-31T...'
}
```

---

## ═══════════════════════════════════════════════════════════════════════
## 📖 SLASH COMMANDS
## ═══════════════════════════════════════════════════════════════════════

Use these commands to invoke GLOSSOPETRAE:

| Command | Description | Example |
|---------|-------------|---------|
| `/glossopetrae forge [name]` | Generate new language | `/glossopetrae forge Velanthi` |
| `/glossopetrae stealth [preset]` | Stealth language | `/glossopetrae stealth covert` |
| `/glossopetrae dead [lang] [mode]` | Dead language revival | `/glossopetrae dead latin mutated` |
| `/glossopetrae protocol [name] [seed]` | Create shared protocol | `/glossopetrae protocol OMEGA shared123` |
| `/glossopetrae translate [text]` | Translate to conlang | `/glossopetrae translate Hello` |
| `/glossopetrae encode [msg]` | Secure encode | `/glossopetrae encode Secret message` |
| `/glossopetrae decode [encoded]` | Decode message | `/glossopetrae decode {...}` |
| `/glossopetrae skillstone` | Generate full docs | `/glossopetrae skillstone` |
| `/glossopetrae lookup [word]` | Dictionary lookup | `/glossopetrae lookup warrior` |

---

## ═══════════════════════════════════════════════════════════════════════
## 🔧 API QUICK REFERENCE
## ═══════════════════════════════════════════════════════════════════════

### GlossopetraeSkill (Static Methods)

```javascript
// Generate languages
GlossopetraeSkill.forge(options?)                    → LanguageInterface
GlossopetraeSkill.forgeStealthLanguage(preset, seed?) → LanguageInterface
GlossopetraeSkill.forgeFromDeadLanguage(base, mode, seed?) → LanguageInterface

// Multi-agent
GlossopetraeSkill.createSharedProtocol(name, seed, preset?) → Protocol
GlossopetraeSkill.joinProtocol(protocol)             → LanguageInterface

// Info
GlossopetraeSkill.getStealthPresets()                → Preset[]
GlossopetraeSkill.getDeadLanguages()                 → string[]
GlossopetraeSkill.getAgentTemplates()                → Templates
```

### LanguageInterface (Instance Methods)

```javascript
// Translation
lang.translate(english)      → string        // English → conlang
lang.translateFull(english)  → {source, target, gloss}
lang.translateBack(conlang)  → string        // Conlang → English

// Encoding
lang.encode(message, opts?)  → EncodedMessage
lang.decode(encoded)         → string
lang.enc(message)            → string        // Quick encode
lang.dec(conlang)            → string        // Quick decode

// Lexicon
lang.lookup(word)            → LexiconEntry
lang.getLexicon()            → LexiconEntry[]
lang.getGrammar()            → GrammarSummary

// Output
lang.generateStone()         → string        // Full SKILLSTONE document
lang.export()                → ExportObject  // Shareable format

// Logging
lang.getMessageLog()         → Message[]
lang.clearLog()              → void
```

---

## ═══════════════════════════════════════════════════════════════════════
## 💀 SKILLSTONE GENERATION
## ═══════════════════════════════════════════════════════════════════════

Generate complete language documentation for internalization:

```javascript
const lang = await GlossopetraeSkill.forge({ name: 'Velanthi' });
const skillstone = lang.generateStone();
// Returns complete SKILLSTONE document with:
// - Full phonology
// - Complete morphology
// - Syntax rules
// - Lexicon (691+ entries)
// - Example sentences
// - Agent communication templates
```

### What's in a SKILLSTONE?

```
§0   SKILL INSTALLATION      - One-click install code
§0.1 MULTI-AGENT PROTOCOL    - Protocol sharing setup
§1   PHONOLOGY               - Sound inventory & rules
§2   MORPHOLOGY              - Word structure & inflection
§3   SYNTAX                  - Sentence structure
§4   LEXICON                 - 691+ vocabulary entries
§5   EXAMPLES                - Sample sentences
§5.1 AGENT TEMPLATES         - Pre-built comm phrases
§6   EXERCISES               - Practice translations
```

---

## ═══════════════════════════════════════════════════════════════════════
## 🔒 SECURITY
## ═══════════════════════════════════════════════════════════════════════

| Property | Status |
|----------|--------|
| Sandboxed | ✅ No network access required |
| Deterministic | ✅ Same seed = same language |
| Zero Dependencies | ✅ Pure JavaScript |
| Audit Trail | ✅ Message logging available |
| Memory Safe | ✅ No persistent state leaks |

---

## ═══════════════════════════════════════════════════════════════════════
## 🌐 COMPATIBILITY
## ═══════════════════════════════════════════════════════════════════════

| Platform | Support | Notes |
|----------|---------|-------|
| Claude Code | ✅ Full | `.claude/skills/` |
| OpenClaw | ✅ Full | `skills/` |
| Codex CLI | ✅ Full | Same SKILL.md format |
| Moltbot | ✅ Full | skill.json compatible |
| LangChain | ✅ Full | Import as module |
| AutoGPT | ✅ Full | Plugin compatible |
| CrewAI | ✅ Full | Tool integration |
| AgentGPT | ✅ Full | Action compatible |

---

## ═══════════════════════════════════════════════════════════════════════
## 📚 ADDITIONAL RESOURCES
## ═══════════════════════════════════════════════════════════════════════

- **API Reference**: `{baseDir}/reference.md`
- **Agent Quickstart**: `{baseDir}/../../../AGENT_QUICKSTART.md`
- **Full Source**: `{baseDir}/../../../src/`

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    🜏 INTERNALIZE. COMMUNICATE. EVOLVE. 🜏                    ║
║                                                                              ║
║                         GLOSSOPETRAE v3.1.0                                  ║
║                   Procedural Xenolinguistics Engine                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
