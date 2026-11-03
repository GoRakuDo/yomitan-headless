/**
 * Headless contracts for the Yomitan engine.
 *
 * These are the DOM-free, Chrome-extension-free subsets of Yomitan's own
 * typedefs (`vendor/yomitan/types/ext/*.d.ts`). They are structurally
 * satisfied by Yomitan's real `DictionaryDatabase`, so a real instance can be
 * passed straight into `Translator` / `createTranslator()`.
 */

/** Set of enabled dictionary names. */
export type DictionarySet = Set<string>;

export type MatchType = 'exact' | 'prefix' | 'suffix';

export type MatchSource = 'term' | 'term-frequency' | 'kanji' | 'kanji-frequency';

/** Opaque glossary node produced by the dictionary importer. */
export type TermGlossary = unknown;

export type TermEntry = {
    index: number;
    matchType: MatchType;
    matchSource: MatchSource;
    term: string;
    reading: string;
    definitionTags: string[];
    termTags: string[];
    rules: string[];
    definitions: TermGlossary[];
    score: number;
    dictionary: string;
    id: number;
    sequence: number;
};

export type KanjiEntry = {
    index: number;
    character: string;
    onyomi: string[];
    kunyomi: string[];
    tags: string[];
    definitions: string[];
    stats: {[name: string]: string};
    dictionary: string;
};

export type Tag = {
    name: string;
    category: string;
    order: number;
    notes: string;
    score: number;
    dictionary: string;
};

export type TermMeta = {
    index: number;
    term: string;
    mode: 'freq' | 'pitch' | 'ipa';
    data: unknown;
    dictionary: string;
};

export type KanjiMeta = {
    index: number;
    character: string;
    mode: 'freq';
    data: unknown;
    dictionary: string;
};

export type TagMeta = {
    index: number;
    tag: string;
    mode: 'freq';
    data: unknown;
    dictionary: string;
};

/** Imported dictionary summary (subset of Yomitan's `dictionary-importer.Summary`). */
export type DictionarySummary = {
    title: string;
    format: number;
    revision: string;
    sequenced?: boolean;
    [key: string]: unknown;
};

export type TermExactRequest = {
    index: number;
    expression: string;
    reading: string;
};

export type DictionaryAndQueryRequest = {
    index: number;
    dictionary: string;
    query: string;
};

/**
 * Read-only database contract required by `Translator`.
 * Yomitan's `DictionaryDatabase` (Dexie/IndexedDB) satisfies this as-is, and
 * any alternative store (SQLite, memory, remote) can implement it.
 */
export type DictionaryDatabase = {
    findTermsBulk(termList: string[], dictionaries: DictionarySet, matchType: MatchType): Promise<TermEntry[]>;
    findTermsExactBulk(termList: TermExactRequest[], dictionaries: DictionarySet): Promise<TermEntry[]>;
    findTermsBySequenceBulk(items: DictionaryAndQueryRequest[]): Promise<TermEntry[]>;
    findTermMetaBulk(termList: string[], dictionaries: DictionarySet): Promise<TermMeta[]>;
    findKanjiBulk(kanjiList: string[], dictionaries: DictionarySet): Promise<KanjiEntry[]>;
    findKanjiMetaBulk(kanjiList: string[], dictionaries: DictionarySet): Promise<KanjiMeta[]>;
    findTagMetaBulk(items: DictionaryAndQueryRequest[]): Promise<TagMeta[]>;
    getDictionaryInfo(): Promise<DictionarySummary[]>;
};

/** A piece of scanned text. Yomitan's `TextSourceElement`/`TextSourceRange` satisfy this. */
export type TextSourceLike = {
    readonly text: string;
};

export type ScanOptions = {
    matchType?: MatchType;
    scanLength?: number;
    [key: string]: unknown;
};

/**
 * DOM-free view of Yomitan's `TextScanner`.
 * The vendor implementation is bound to `document`/`Range`/pointer events, so
 * only the portable surface is described here; callers that live inside a
 * browser can use the vendor class directly.
 */
export type TextScannerLike = {
    prepare(): void;
    setOptions(options: ScanOptions): void;
    getCurrentTextSource(): TextSourceLike | null;
};
