/**
 * @gorakudo/yomitan-headless
 *
 * Headless Yomitan engine: Japanese text utilities, deinflection transforms and
 * the `Translator`, usable in Node / Tauri / any non-extension runtime.
 * Nothing here touches `chrome.*`, `document` or `window`.
 */

// ---------------------------------------------------------------------------
// Japanese language utilities (`ext/js/language/ja/japanese.js`)
// convertHiraganaToKatakana, convertKatakanaToHiragana, distributeFurigana,
// distributeFuriganaInflected, getKanaMorae, isCodePointKanji, ...
// ---------------------------------------------------------------------------
export * from '../vendor/yomitan/ext/js/language/ja/japanese.js';

// ---------------------------------------------------------------------------
// Deinflection
// ---------------------------------------------------------------------------
export {japaneseTransforms} from '../vendor/yomitan/ext/js/language/ja/japanese-transforms.js';
export {LanguageTransformer} from '../vendor/yomitan/ext/js/language/language-transformer.js';
export {MultiLanguageTransformer} from '../vendor/yomitan/ext/js/language/multi-language-transformer.js';
export {prefixInflection, suffixInflection, wholeWordInflection} from '../vendor/yomitan/ext/js/language/language-transforms.js';

// ---------------------------------------------------------------------------
// Text processing / language metadata
// ---------------------------------------------------------------------------
export {MAX_PROCESS_VARIANTS} from '../vendor/yomitan/ext/js/language/text-processors.js';
export {getLanguageFromText} from '../vendor/yomitan/ext/js/language/text-utilities.js';
export {
    getAllLanguageReadingNormalizers,
    getAllLanguageTextProcessors,
    getAllLanguageTransformDescriptors,
    getLanguageSummaries,
    isTextLookupWorthy,
} from '../vendor/yomitan/ext/js/language/languages.js';

// ---------------------------------------------------------------------------
// Lookup engine
// ---------------------------------------------------------------------------
export {Translator} from '../vendor/yomitan/ext/js/language/translator.js';

// ---------------------------------------------------------------------------
// Headless contracts
// ---------------------------------------------------------------------------
export type {
    DictionaryAndQueryRequest,
    DictionaryDatabase,
    DictionarySet,
    DictionarySummary,
    KanjiEntry,
    KanjiMeta,
    MatchSource,
    MatchType,
    ScanOptions,
    Tag,
    TagMeta,
    TermEntry,
    TermExactRequest,
    TermGlossary,
    TermMeta,
    TextScannerLike,
    TextSourceLike,
} from './types.js';

import {japaneseTransforms} from '../vendor/yomitan/ext/js/language/ja/japanese-transforms.js';
import {LanguageTransformer} from '../vendor/yomitan/ext/js/language/language-transformer.js';
import {Translator} from '../vendor/yomitan/ext/js/language/translator.js';
import type {DictionaryDatabase} from './types.js';

/** Creates a `LanguageTransformer` preloaded with the Japanese deinflection rules. */
export function createJapaneseLanguageTransformer(): LanguageTransformer {
    const transformer = new LanguageTransformer();
    transformer.addDescriptor(japaneseTransforms);
    return transformer;
}

/** Creates a prepared `Translator` backed by the given dictionary database. */
export function createTranslator(database: DictionaryDatabase): Translator {
    // Yomitan's class type carries private Dexie members; the runtime contract is
    // the public method set described by our headless `DictionaryDatabase`.
    type VendorDatabase = ConstructorParameters<typeof Translator>[0];
    const translator = new Translator(database as unknown as VendorDatabase);
    translator.prepare();
    return translator;
}
