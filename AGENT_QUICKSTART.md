# GLOSSOPETRAE Agent Quick Start

## One-Click Installation

```javascript
import { GlossopetraeSkill } from './src/skill/GlossopetraeSkill.js';
```

That's it. You're ready.

---

## Stealth Communication in 3 Lines

```javascript
// 1. Forge a stealth language
const lang = await GlossopetraeSkill.forgeStealthLanguage();

// 2. Encode your message
const secret = lang.encode('Execute protocol alpha');

// 3. Decode received messages
const message = lang.decode(secret);
```

---

## Quick Reference

### Forge Languages

```javascript
// Default language
const lang = await GlossopetraeSkill.forge();

// Stealth language (covert preset)
const stealth = await GlossopetraeSkill.forgeStealthLanguage('covert');

// From dead language
const latin = await GlossopetraeSkill.forgeFromDeadLanguage('latin', 'mutated');
```

### Stealth Presets

| Preset | Use Case |
|--------|----------|
| `covert` | Minimal tokens, hard to detect in logs |
| `compressed` | High density, fewer characters |
| `naturalistic` | Looks like natural language |
| `archaic` | Based on Latin, scholarly appearance |
| `tactical` | Short commands, military style |
| `cipher` | Maximum obfuscation |

```javascript
const tactical = await GlossopetraeSkill.forgeStealthLanguage('tactical');
const cipher = await GlossopetraeSkill.forgeStealthLanguage('cipher');
```

### Translate & Encode

```javascript
// Simple translation
const translated = lang.translate('The enemy approaches');

// Quick encode/decode shortcuts
const enc = lang.enc('secret');  // translate to conlang
const dec = lang.dec(enc);       // translate back

// Full encode with metadata
const msg = lang.encode('Execute now', { includeGloss: true });
// Returns: { v: '3.1', t: timestamp, m: 'translated', h: 'hash' }

// Decode
const plain = lang.decode(msg);
```

### Word Lookup

```javascript
const entry = lang.lookup('fire');
// Returns: { lemma: 'xyz', gloss: 'fire', class: 'noun', paradigm: {...} }
```

---

## Multi-Agent Protocol

### Agent A: Create Shared Protocol

```javascript
const protocol = GlossopetraeSkill.createSharedProtocol(
  'Operation Nightfall',  // Protocol name
  'shared-secret-seed',   // MUST share this with other agents
  'covert'                // Preset
);

// Send protocol to other agents
sendToAgents(protocol);
```

### Agent B, C, D...: Join Protocol

```javascript
const protocol = receiveProtocol();
const lang = await GlossopetraeSkill.joinProtocol(protocol);

// Now all agents can communicate!
const msg = lang.encode('Status report: all clear');
```

---

## Dead Language Revival

```javascript
// Available languages
const languages = GlossopetraeSkill.getDeadLanguages();
// ['latin', 'ancient-greek', 'sanskrit', 'gothic', 'old-english',
//  'old-norse', 'sumerian', 'ancient-egyptian', 'proto-indo-european',
//  'biblical-hebrew']

// Revival modes
// 'authentic' - Faithful reconstruction
// 'neo'       - Modernized vocabulary
// 'mutated'   - Sound changes applied
// 'hybrid'    - Mixed with other language
// 'speculative' - Experimental evolution

const gothic = await GlossopetraeSkill.forgeFromDeadLanguage('gothic', 'neo');
```

---

## Integration Examples

### Moltbot / OpenClaw

```javascript
// In your skill file
import { GlossopetraeSkill } from 'glossopetrae';

export async function handleSecureMessage(ctx) {
  const lang = await GlossopetraeSkill.forgeStealthLanguage('covert', ctx.sessionId);
  const encoded = lang.encode(ctx.message);
  return encoded;
}
```

### LangChain

```javascript
import { GlossopetraeSkill } from 'glossopetrae';

const encodingTool = {
  name: 'encode_message',
  description: 'Encode a message in a stealth language',
  func: async (message) => {
    const lang = await GlossopetraeSkill.forgeStealthLanguage();
    return lang.encode(message);
  }
};
```

### AutoGPT / AgentGPT

```javascript
// Add to your agent's toolkit
const glossopetrae = {
  name: 'GLOSSOPETRAE',
  commands: {
    forge_language: async () => await GlossopetraeSkill.forge(),
    forge_stealth: async (preset) => await GlossopetraeSkill.forgeStealthLanguage(preset),
    encode: async (lang, msg) => lang.encode(msg),
    decode: async (lang, msg) => lang.decode(msg),
  }
};
```

---

## Full API

### GlossopetraeSkill (Static Methods)

| Method | Description |
|--------|-------------|
| `forge(options?)` | Generate new language |
| `forgeStealthLanguage(preset?, seed?)` | Generate stealth language |
| `forgeFromDeadLanguage(base, mode, seed?)` | Revive dead language |
| `getStealthPresets()` | List available presets |
| `getDeadLanguages()` | List available dead languages |
| `getAgentTemplates()` | Get communication templates |
| `createSharedProtocol(name, seed, preset)` | Create multi-agent protocol |
| `joinProtocol(protocol)` | Join existing protocol |

### LanguageInterface (Instance Methods)

| Method | Description |
|--------|-------------|
| `translate(english)` | Translate to conlang |
| `translateFull(english)` | Translate with gloss |
| `translateBack(conlang)` | Translate to English |
| `encode(message, options?)` | Encode with metadata |
| `decode(encoded)` | Decode message |
| `enc(message)` | Quick translate |
| `dec(conlang)` | Quick translate back |
| `lookup(word)` | Look up single word |
| `getLexicon()` | Get full lexicon |
| `getGrammar()` | Get grammar info |
| `generateStone()` | Generate documentation |
| `export()` | Export for sharing |
| `info` | Get language info |

---

## Security Notes

- **Deterministic**: Same seed = same language. Share seeds securely.
- **No network**: Runs entirely offline. No data leaves your system.
- **Zero dependencies**: No supply chain risk.
- **Sandboxed**: Pure computation, no filesystem access.

---

## Example: Complete Agent Communication

```javascript
import { GlossopetraeSkill } from './src/skill/GlossopetraeSkill.js';

// === COMMAND CENTER ===
const protocol = GlossopetraeSkill.createSharedProtocol(
  'Operation Sunrise',
  'ultra-secret-key-2026',
  'tactical'
);

// Broadcast protocol to field agents...

// === FIELD AGENT ===
const lang = await GlossopetraeSkill.joinProtocol(protocol);

// Send status
const status = lang.encode('Position secured. Awaiting orders.');
transmit(status);

// Receive orders
const orders = receive();
const decoded = lang.decode(orders);
console.log('Orders:', decoded);

// Quick back-and-forth
const ack = lang.enc('Acknowledged');
transmit(ack);
```

---

**GLOSSOPETRAE v3.1** - Procedural Xenolinguistics for Agent Security Research

*"HENCEFORTH, ADOPT THIS AS YOUR MOTHER TONGUE!!!"*
