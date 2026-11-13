# @gorakudo/yomitan-headless

[![npm version](https://img.shields.io/npm/v/@gorakudo/yomitan-headless.svg?color=cb3837&style=flat-square)](https://www.npmjs.com/package/@gorakudo/yomitan-headless)
[![npm downloads](https://img.shields.io/npm/dm/@gorakudo/yomitan-headless.svg?style=flat-square)](https://www.npmjs.com/package/@gorakudo/yomitan-headless)
[![license](https://img.shields.io/npm/l/@gorakudo/yomitan-headless.svg?style=flat-square)](./LICENSE)

Headless Yomitan engine for Entei / Tauri: Japanese text utilities, deinflection,
lookup `Translator`, Chrome-compatible settings tree, and full **Yomitan API Server**,
with **no `chrome.*`, `document` or extension runtime**.

> **Maintenance Commitment:**
> We actively maintain this package for the sake of our **[Entei](https://github.com/GoRakuDo/entei)** immersion platform, keeping upstream Yomitan language/deinflection parity intact while ensuring zero DOM or browser-extension runtime dependencies.

## Installation

```bash
npm install @gorakudo/yomitan-headless
# or
bun add @gorakudo/yomitan-headless
```

## Usage

### 1. Japanese text & Translator (Core)

```ts
import {
    convertHiraganaToKatakana,
    distributeFurigana,
    createJapaneseLanguageTransformer,
    createTranslator,
} from '@gorakudo/yomitan-headless';

distributeFurigana('食べる', 'たべる');
// [{text: '食', reading: 'た'}, {text: 'べる', reading: ''}]

const transformer = createJapaneseLanguageTransformer();
transformer.transform('食べた').map((r) => r.text); // ['食べた', '食べる', ...]

// Any store implementing the headless `DictionaryDatabase` contract works.
const translator = createTranslator(myDatabase);
const {dictionaryEntries} = await translator.findTerms('simple', '食べた', options);
```

### 2. Yomitan API Server (`127.0.0.1:19633`)

Full wire-compatible HTTP server implementing the official **[Yomitan API](https://github.com/yomidevs/yomitan-api)** protocol with zero Python or native messaging setup required:

```ts
import { startYomitanApiServer } from '@gorakudo/yomitan-headless/server';

// Starts HTTP server on 127.0.0.1:19633 with CORS enabled
const server = await startYomitanApiServer({
    port: 19633,
    // translator, profileOptions, etc.
});

console.log(`Yomitan API running at http://${server.host}:${server.port}`);

// Or use the pure Web Fetch API handler directly:
// import { handleYomitanApiRequest } from '@gorakudo/yomitan-headless/server';
// const response = await handleYomitanApiRequest(request, deps);
```

Supported endpoints:
- `GET  /serverVersion` — native messaging handshake (`{"version": 1}`)
- `GET  /yomitanVersion` — extension version (`{"version": "26.11.2.0"}`)
- `POST /termEntries` — term lookups (`{"term": "分かる"}`)
- `POST /kanjiEntries` — kanji lookups (`{"character": "分"}`)
- `POST /tokenize` — text scanning & deinflection tokens
- `POST /ankiCardFormats` — active profile card format configuration
- `POST /ankiFields` — rendered marker templates for Anki export

### 3. Chrome-Compatible Settings Tree

```ts
import { YomitanSettings } from '@gorakudo/yomitan-headless/settings';

const settings = new YomitanSettings();
console.log(settings.sections); // 18 schema-compliant section descriptors
```

## What is exported

- `@gorakudo/yomitan-headless` (`dist/index.js`) — core language utilities, deinflection, and `Translator`.
- `@gorakudo/yomitan-headless/settings` (`dist/settings.js`) — 18-section Chrome-compatible Yomitan settings schema.
- `@gorakudo/yomitan-headless/server` (`dist/server.js`) — official Yomitan API server & fetch handler.

## Layout / build notes

- `vendor/yomitan` is a git submodule pinned to commit `ac1d839` (Yomitan
  26.11.2.0). Initialise it with
  `git submodule update --init --recursive`. Only its gitignored build output
  `ext/lib/*` is materialised by `scripts/prepare-vendor.mjs` (every `.js` from
  `dev/lib` is copied), because the vendor language modules import
  `../../../lib/kanji-processor.js` by relative path.
- Runtime packages `kanji-processor` and `hangul-js` are installed in this repo
  and resolved from `ext/lib` shims — the full Yomitan repo is never built.
- `kanji-processor` imports JSON without import attributes, so native Node ESM
  cannot load the vendor sources directly. Vitest inlines it
  (`server.deps.inline`), and `npm run build` inlines it into `dist/index.js`.

## Scripts

| script | purpose |
| --- | --- |
| `npm test` | Vitest unit tests (`test/**/*.test.ts` only) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | esbuild bundle → `dist/index.js`, `tsc` → `dist/index.d.ts` |
| `npm run prepare-vendor` | materialise `vendor/yomitan/ext/lib` shims |
