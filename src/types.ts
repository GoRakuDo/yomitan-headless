/**
 * Headless contracts for the Yomitan engine.
 *
 * These are the DOM-free, Chrome-extension-free subsets of Yomitan's own
 * typedefs (`vendor/yomitan/types/ext/*.d.ts`). They are structurally
 * satisfied by Yomitan's real `DictionaryDatabase`, so a real instance can be
 * passed straight into `Translator` / `createTranslator()`.
 *
 * The shapes here follow what `vendor/yomitan/ext/js/language/translator.js`
 * actually passes and reads, not the Dexie-flavoured typedefs:
 *
 * - `findTermsBulk(termList, dictionaries, matchType)` rows carry `index` = the
 *   index of the query term in `termList` (that is how deinflections are
 *   matched back to their source text).
 * - `findTermsExactBulk` receives `{term, reading}` pairs.
 * - `findTermsBySequenceBulk` receives `{query, dictionary}` pairs.
 * - `findTagMetaBulk` receives `{query, dictionary}` pairs and must return a
 *   positionally aligned array (`undefined` where nothing matched).
 */

/** Set of enabled dictionary names. */
export type DictionarySet = Set<string>;

export type MatchType = 'exact' | 'prefix' | 'suffix';

/** Value of a database row's `matchSource` — mirrors Yomitan's `MatchSource`. */
export type MatchSource = 'term' | 'reading' | 'sequence';

/** Opaque glossary node produced by the dictionary importer. */
export type TermGlossary = unknown;

/** A raw term row as produced by the database layer. */
export type TermEntry = {
    /** Index of the query term in the originating `termList`. */
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
    /** `-1` when the dictionary has no sequence numbers. */
    sequence: number;
};

/** A raw kanji row as produced by the database layer. */
export type KanjiEntry = {
    index: number;
    character: string;
    onyomi: string[];
    kunyomi: string[];
    tags: string[];
    definitions: string[];
    stats: {[name: string]: string | number};
    dictionary: string;
};

/**
 * A tag definition row. `Translator._createTag` / `_createKanjiStat` only read
 * `category`, `notes`, `order` and `score`; everything else is defaulted.
 */
export type Tag = {
    name?: string;
    category: string;
    order: number;
    notes: string;
    score: number;
    dictionary?: string;
};

export type TermMeta = {
    /** Index of the queried term in the originating `termList`. */
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

/** Imported dictionary summary (subset of Yomitan's `dictionary-importer.Summary`). */
export type DictionarySummary = {
    title: string;
    format: number;
    revision: string;
    sequenced?: boolean;
    frequencyMode?: string;
    [key: string]: unknown;
};

/** `{term, reading}` pair used by exact term lookups. */
export type TermExactRequest = {
    term: string;
    reading: string;
};

/** `{query, dictionary}` pair used by sequence and tag lookups. */
export type DictionaryAndQueryRequest = {
    query: string;
    dictionary: string;
};

/**
 * Read-only database contract required by `Translator`.
 * Yomitan's `DictionaryDatabase` (Dexie/IndexedDB) satisfies this as-is, and
 * any alternative store (SQLite, memory, remote) can implement it.
 */
export type DictionaryDatabase = {
    findTermsBulk(termList: string[], dictionaries: DictionarySet, matchType: MatchType): Promise<TermEntry[]>;
    findTermsExactBulk(termList: TermExactRequest[], dictionaries: DictionarySet): Promise<TermEntry[]>;
    findTermsBySequenceBulk(items: {query: number; dictionary: string}[]): Promise<TermEntry[]>;
    findTermMetaBulk(termList: string[], dictionaries: DictionarySet): Promise<TermMeta[]>;
    findKanjiBulk(kanjiList: string[], dictionaries: DictionarySet): Promise<KanjiEntry[]>;
    findKanjiMetaBulk(kanjiList: string[], dictionaries: DictionarySet): Promise<KanjiMeta[]>;
    findTagMetaBulk(items: {query: string; dictionary: string}[]): Promise<(Tag | undefined)[]>;
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