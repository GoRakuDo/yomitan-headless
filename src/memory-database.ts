/**
 * In-memory `DictionaryDatabase` for tests, examples and lightweight local use.
 *
 * Implements exactly the lookup contract `Translator` relies on (see
 * `./types.ts`): rows carry the index of the query item that produced them, and
 * `findTagMetaBulk` returns a positionally aligned array.
 *
 * Deletion / detailed sequence modelling is out of scope: `sequence` is stored
 * verbatim and defaults to `-1` ("no sequence"), which is all `Translator`
 * needs to skip merge grouping.
 */

import type {
    DictionaryDatabase,
    DictionarySet,
    DictionarySummary,
    KanjiEntry,
    KanjiMeta,
    MatchType,
    Tag,
    TermEntry,
    TermExactRequest,
    TermMeta,
} from './types.js';

export type MemoryTerm = {
    expression: string;
    reading?: string;
    definitionTags?: string;
    rules?: string;
    score?: number;
    glossary?: unknown[];
    sequence?: number;
    termTags?: string;
    dictionary: string;
    id: number;
};

export type MemoryKanji = {
    character: string;
    onyomi?: string;
    kunyomi?: string;
    tags?: string;
    meanings?: string[];
    stats?: {[name: string]: string | number};
    dictionary: string;
};

export type MemoryTermMeta =
    | {expression: string; mode: 'freq'; data: unknown; dictionary: string}
    | {expression: string; mode: 'pitch'; data: unknown; dictionary: string}
    | {expression: string; mode: 'ipa'; data: unknown; dictionary: string};

export type MemoryKanjiMeta = {
    character: string;
    mode: 'freq';
    data: unknown;
    dictionary: string;
};

export type MemoryTag = {
    name: string;
    category: string;
    order: number;
    notes: string;
    score: number;
    dictionary: string;
};

/** Dictionary metadata accepted by the store; `format`/`revision` default when omitted. */
export type MemoryDictionaryInfo = {
    title: string;
    format?: number;
    revision?: string;
    sequenced?: boolean;
    frequencyMode?: string;
    [key: string]: unknown;
};

function splitField(value: string | undefined): string[] {
    return typeof value === 'string' && value.length > 0 ? value.split(' ') : [];
}

export class MemoryDictionaryDatabase implements DictionaryDatabase {
    private readonly _dictionaries = new Map<string, MemoryDictionaryInfo>();
    private readonly _terms: MemoryTerm[] = [];
    private readonly _kanji: MemoryKanji[] = [];
    private readonly _termMeta: MemoryTermMeta[] = [];
    private readonly _kanjiMeta: MemoryKanjiMeta[] = [];
    private readonly _tags: MemoryTag[] = [];

    constructor(dictionaries: MemoryDictionaryInfo[] = []) {
        for (const dictionary of dictionaries) {
            this._dictionaries.set(dictionary.title, dictionary);
        }
    }

    addDictionary(info: MemoryDictionaryInfo): void {
        this._dictionaries.set(info.title, info);
    }

    addTerms(terms: MemoryTerm[]): void {
        this._terms.push(...terms);
    }

    addKanji(entries: MemoryKanji[]): void {
        this._kanji.push(...entries);
    }

    addTermMeta(entries: MemoryTermMeta[]): void {
        this._termMeta.push(...entries);
    }

    addKanjiMeta(entries: MemoryKanjiMeta[]): void {
        this._kanjiMeta.push(...entries);
    }

    addTags(entries: MemoryTag[]): void {
        this._tags.push(...entries);
    }

    async findTermsBulk(termList: string[], dictionaries: DictionarySet, matchType: MatchType): Promise<TermEntry[]> {
        const results: TermEntry[] = [];
        for (let i = 0; i < termList.length; i++) {
            const query = termList[i]!;
            for (const entry of this._terms) {
                if (!dictionaries.has(entry.dictionary)) { continue; }
                const reading = entry.reading ?? '';
                if (!matchesTerm(entry.expression, query, matchType) && !matchesTerm(reading, query, matchType)) {
                    continue;
                }
                results.push(this.toTermEntry(entry, i, matchType, 'term'));
            }
        }
        return results;
    }

    async findTermsExactBulk(termList: TermExactRequest[], dictionaries: DictionarySet): Promise<TermEntry[]> {
        const results: TermEntry[] = [];
        for (let i = 0; i < termList.length; i++) {
            const {term, reading} = termList[i]!;
            for (const entry of this._terms) {
                if (!dictionaries.has(entry.dictionary)) { continue; }
                if (entry.expression !== term) { continue; }
                if ((entry.reading ?? '') !== reading) { continue; }
                results.push(this.toTermEntry(entry, i, 'exact', 'term'));
            }
        }
        return results;
    }

    async findTermsBySequenceBulk(items: {query: number; dictionary: string}[]): Promise<TermEntry[]> {
        const results: TermEntry[] = [];
        for (let i = 0; i < items.length; i++) {
            const {query, dictionary} = items[i]!;
            for (const entry of this._terms) {
                if (entry.dictionary !== dictionary) { continue; }
                if ((entry.sequence ?? -1) !== query) { continue; }
                results.push(this.toTermEntry(entry, i, 'exact', 'sequence'));
            }
        }
        return results;
    }

    async findTermMetaBulk(termList: string[], dictionaries: DictionarySet): Promise<TermMeta[]> {
        const results: TermMeta[] = [];
        for (let i = 0; i < termList.length; i++) {
            const term = termList[i]!;
            for (const entry of this._termMeta) {
                if (!dictionaries.has(entry.dictionary)) { continue; }
                if (entry.expression !== term) { continue; }
                results.push({index: i, term, mode: entry.mode, data: entry.data, dictionary: entry.dictionary});
            }
        }
        return results;
    }

    async findKanjiBulk(kanjiList: string[], dictionaries: DictionarySet): Promise<KanjiEntry[]> {
        const results: KanjiEntry[] = [];
        for (let i = 0; i < kanjiList.length; i++) {
            const character = kanjiList[i]!;
            for (const entry of this._kanji) {
                if (!dictionaries.has(entry.dictionary)) { continue; }
                if (entry.character !== character) { continue; }
                results.push(this.toKanjiEntry(entry, i));
            }
        }
        return results;
    }

    async findKanjiMetaBulk(kanjiList: string[], dictionaries: DictionarySet): Promise<KanjiMeta[]> {
        const results: KanjiMeta[] = [];
        for (let i = 0; i < kanjiList.length; i++) {
            const character = kanjiList[i]!;
            for (const entry of this._kanjiMeta) {
                if (!dictionaries.has(entry.dictionary)) { continue; }
                if (entry.character !== character) { continue; }
                results.push({index: i, character, mode: entry.mode, data: entry.data, dictionary: entry.dictionary});
            }
        }
        return results;
    }

    async findTagMetaBulk(items: {query: string; dictionary: string}[]): Promise<(Tag | undefined)[]> {
        return items.map(({query, dictionary}) => {
            const name = query.includes(':') ? query.slice(0, query.indexOf(':')) : query;
            return this._tags.find((entry) => entry.name === name && entry.dictionary === dictionary);
        });
    }

    async getDictionaryInfo(): Promise<DictionarySummary[]> {
        return [...this._dictionaries.values()].map((info) => ({
            ...info,
            format: info.format ?? 3,
            revision: info.revision ?? '',
        }));
    }

    private toTermEntry(
        entry: MemoryTerm,
        index: number,
        matchType: MatchType,
        matchSource: TermEntry['matchSource'],
    ): TermEntry {
        const term = entry.expression;
        return {
            index,
            matchType,
            matchSource,
            term,
            reading: entry.reading !== undefined && entry.reading.length > 0 ? entry.reading : term,
            definitionTags: splitField(entry.definitionTags),
            termTags: splitField(entry.termTags),
            rules: splitField(entry.rules),
            definitions: entry.glossary ?? [],
            score: entry.score ?? 0,
            dictionary: entry.dictionary,
            id: entry.id,
            sequence: entry.sequence ?? -1,
        };
    }

    private toKanjiEntry(entry: MemoryKanji, index: number): KanjiEntry {
        return {
            index,
            character: entry.character,
            onyomi: splitField(entry.onyomi),
            kunyomi: splitField(entry.kunyomi),
            tags: splitField(entry.tags),
            definitions: entry.meanings ?? [],
            stats: entry.stats ?? {},
            dictionary: entry.dictionary,
        };
    }
}

function matchesTerm(candidate: string, query: string, matchType: MatchType): boolean {
    switch (matchType) {
        case 'exact':
            return candidate === query;
        case 'prefix':
            return candidate.startsWith(query);
        case 'suffix':
            return candidate.endsWith(query);
    }
}