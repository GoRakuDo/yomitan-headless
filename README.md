# @gorakudo/yomitan-headless

Headless Yomitan engine for Entei / Tauri: Japanese text utilities, deinflection
and the lookup `Translator`, with **no `chrome.*`, `document` or extension runtime**.

> **Maintenance Commitment:**
> We actively maintain this package for the sake of our **[Entei](https://github.com/GoRakuDo/entei)** immersion platform, keeping upstream Yomitan language/deinflection parity intact while ensuring zero DOM or browser-extension runtime dependencies.

## Usage

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

## What is exported

- `src/index.ts` — everything: kana conversion, furigana distribution, mora/pitch
  helpers, `japaneseTransforms`, `LanguageTransformer`, `MultiLanguageTransformer`,
  `Translator`, text processors/language metadata, and the `create*` factories.
- `src/types.ts` — DOM-free contracts: `DictionaryDatabase`, `TermEntry`,
  `KanjiEntry`, `Tag`, `TextScannerLike`, `ScanOptions`, ...
- `dist/index.js` — single-file ESM bundle (JSON inlined), safe for Node/Tauri.
- `dist/index.d.ts` — self-contained type entry point (declarations for our
  sources *and* the vendor modules they re-export live in `dist/types/**`).
  Consumers need neither `allowJs` nor the `vendor/` checkout.

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
