import {describe, expect, it} from 'vitest';
import {
    convertHiraganaToKatakana,
    convertKatakanaToHiragana,
    createJapaneseLanguageTransformer,
    createTranslator,
    distributeFurigana,
    distributeFuriganaInflected,
} from '../src/index.js';
import type {DictionaryDatabase, TermEntry} from '../src/index.js';

/** Minimal in-memory dictionary database, structurally compatible with Yomitan's. */
function createStubDatabase(): DictionaryDatabase {
    const terms: Array<{expression: string, reading: string, glossary: string}> = [
        {expression: '食べる', reading: 'たべる', glossary: 'to eat'},
    ];
    return {
        async findTermsBulk(termList: string[]): Promise<TermEntry[]> {
            return termList.flatMap((term, termIndex) => terms
                .filter((entry) => entry.expression === term)
                .map((entry, index) => toTermEntry(entry, termIndex + index, 'prefix')));
        },
        async findTermsExactBulk(termList): Promise<TermEntry[]> {
            return termList.flatMap(({expression, reading, index}) => terms
                .filter((entry) => entry.expression === expression && entry.reading === reading)
                .map((entry) => toTermEntry(entry, index, 'exact')));
        },
        async findTermsBySequenceBulk(): Promise<TermEntry[]> {
            return [];
        },
        async findTermMetaBulk() {
            return [];
        },
        async findKanjiBulk() {
            return [];
        },
        async findKanjiMetaBulk() {
            return [];
        },
        async findTagMetaBulk() {
            return [];
        },
        async getDictionaryInfo() {
            return [];
        },
    };
}

function toTermEntry(
    {expression, reading, glossary}: {expression: string, reading: string, glossary: string},
    index: number,
    matchType: 'exact' | 'prefix' | 'suffix',
): TermEntry {
    return {
        index,
        matchType,
        matchSource: 'term',
        term: expression,
        reading,
        definitionTags: [],
        termTags: [],
        rules: [],
        definitions: [{type: 'text', text: glossary}],
        score: 1,
        dictionary: 'TestDict',
        id: index + 1,
        sequence: index + 1,
    };
}

describe('furigana', () => {
    it('distributes readings onto the matching kanji', () => {
        expect(distributeFurigana('食べる', 'たべる')).toEqual([
            {text: '食', reading: 'た'},
            {text: 'べる', reading: ''},
        ]);
    });

    it('distributes furigana for an inflected surface form using the dictionary form', () => {
        // `distributeFuriganaInflected` emits segments for the *source* (dictionary)
        // form, with the inflection's reading folded in — the shape Anki needs.
        expect(distributeFuriganaInflected('食べた', 'たべた', '食べる')).toEqual([
            {text: '食', reading: 'た'},
            {text: 'べる', reading: ''},
        ]);
    });
});

describe('kana conversion', () => {
    it('converts hiragana to katakana', () => {
        expect(convertHiraganaToKatakana('たべる')).toBe('タベル');
        expect(convertHiraganaToKatakana('とうきょう')).toBe('トウキョウ');
    });

    it('converts katakana to hiragana', () => {
        expect(convertKatakanaToHiragana('タベル')).toBe('たべる');
    });

    it('round-trips mixed text without touching kanji', () => {
        expect(convertKatakanaToHiragana(convertHiraganaToKatakana('食べる'))).toBe('食べる');
    });
});

describe('deinflection', () => {
    const transformer = createJapaneseLanguageTransformer();

    it('deinflects the past tense to the dictionary form', () => {
        const results = transformer.transform('食べた');
        expect(results.map((result) => result.text)).toContain('食べる');
    });

    it('deinflects causative passive back to the dictionary form', () => {
        const results = transformer.transform('食べさせられた');
        expect(results.map((result) => result.text)).toContain('食べる');
    });

    it('keeps the original text as the first candidate', () => {
        const results = transformer.transform('食べた');
        expect(results[0]?.text).toBe('食べた');
    });

    it('does not invent deinflections for a plain noun', () => {
        expect(transformer.transform('学生')).toHaveLength(1);
    });
});

describe('translator (headless)', () => {
    it('finds a dictionary entry for an inflected word without any extension runtime', async () => {
        const translator = createTranslator(createStubDatabase());
        const {dictionaryEntries} = await translator.findTerms('simple', '食べた', {
            enabledDictionaryMap: new Map([['TestDict', {
                index: 0,
                alias: 'Test',
                allowKanjiSearch: true,
                allowVariants: true,
                priority: 0,
                definitions: true,
                frequencies: true,
                pronunciations: true,
            }]]),
            excludeDictionaryDefinitions: null,
            sortFrequencyDictionary: null,
            sortFrequencyDictionaryOrder: 'descending',
            language: 'ja',
            primaryReading: 'expression',
            useAllFrequencyDictionaries: false,
            textReplacements: new Map(),
            searchResolution: 'word',
            deinflect: true,
            matchType: 'exact',
            maxResults: 16,
            maxEntriesPerResult: 1,
            removeNonJapaneseCharacters: false,
            convertHalfWidthCharacters: 'false',
            convertNumericCharacters: 'false',
            convertAlphabeticCharacters: 'false',
            convertHiraganaToKatakana: false,
            convertKatakanaToHiragana: false,
            collapseEmphaticSequences: 'false',
        });

        expect(dictionaryEntries.length).toBeGreaterThan(0);
        expect(dictionaryEntries[0]?.headwords[0]?.term).toBe('食べる');
    });
});
