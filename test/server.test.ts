import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {MemoryDictionaryDatabase} from '../src/memory-database.js';
import {
    DEFAULT_HOST,
    DEFAULT_PORT,
    SERVER_VERSION,
    YOMITAN_VERSION,
    createYomitanApiServer,
    handleYomitanApiRequest,
    renderMarker,
    startYomitanApiServer,
    type StartedYomitanApiServer,
} from '../src/server/index.js';
import {createTranslator} from '../src/index.js';
import {createDefaultOptions, createDefaultProfileOptions} from '../src/settings/index.js';
import type {Options, ProfileOptions} from '../src/settings/index.js';
import type {DictionaryDatabase} from '../src/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DICTIONARY = 'TestDict';

/** Small JMdict-shaped dictionary covering the lookups the API contract needs. */
function createDatabase(): DictionaryDatabase {
    const db = new MemoryDictionaryDatabase([{title: DICTIONARY, format: 3, revision: 'test-1', sequenced: true}]);
    db.addTerms([
        {
            expression: '食べる',
            reading: 'たべる',
            definitionTags: 'v1 vt',
            rules: 'v1',
            score: 100,
            sequence: 10,
            termTags: 'common',
            glossary: ['to eat', {type: 'text', text: 'to consume'}],
            dictionary: DICTIONARY,
            id: 1,
        },
        {
            expression: '食べた',
            reading: 'たべた',
            definitionTags: 'v1',
            rules: 'v1',
            score: 90,
            sequence: -1,
            glossary: ['past tense of 食べる'],
            dictionary: DICTIONARY,
            id: 2,
        },
    ]);
    db.addTermMeta([{expression: '食べる', mode: 'freq', data: 1234, dictionary: DICTIONARY}]);
    db.addKanji([{
        character: '食',
        onyomi: 'ショク ジキ',
        kunyomi: 'た.べる く.う',
        tags: 'n1',
        meanings: ['food', 'to eat'],
        stats: {strokes: 9, grade: 2},
        dictionary: DICTIONARY,
    }]);
    db.addKanjiMeta([{character: '食', mode: 'freq', data: 500, dictionary: DICTIONARY}]);
    db.addTags([{name: 'common', category: 'frequent', order: 1, notes: 'common word', score: 1, dictionary: DICTIONARY}]);
    return db as unknown as DictionaryDatabase;
}

/** Options with `TestDict` enabled in the active profile. */
function createOptions(overrides: (options: Options) => void = () => {}): Options {
    const options = createDefaultOptions();
    const profile = options.profiles[0]!;
    profile.options.dictionaries = [{
        name: DICTIONARY,
        alias: 'Test',
        enabled: true,
        allowSecondarySearches: false,
        definitionsCollapsible: 'not-collapsible',
        partsOfSpeechFilter: false,
        useDeinflections: true,
    }];
    profile.options.general.mainDictionary = DICTIONARY;
    profile.options.parsing.useAllFrequencyDictionaries = true;
    overrides(options);
    return options;
}

function jsonRequest(path: string, body?: unknown, init: RequestInit = {}): Request {
    return new Request(`http://127.0.0.1${path}`, {
        ...init,
        method: init.method ?? (body === undefined ? 'GET' : 'POST'),
        headers: body === undefined ? init.headers : {'Content-Type': 'application/json', ...init.headers},
        body: body === undefined ? init.body : JSON.stringify(body),
    });
}

const translator = createTranslator(createDatabase());
const options = createOptions();
const deps = {translator, options};

// ---------------------------------------------------------------------------
// Metadata endpoints
// ---------------------------------------------------------------------------

describe('server metadata endpoints', () => {
    it('reports the native messaging component version on GET /serverVersion', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/serverVersion'), deps);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({version: SERVER_VERSION});
    });

    it('reports the Yomitan version on GET /yomitanVersion', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/yomitanVersion'), deps);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({version: YOMITAN_VERSION});
    });

    it('defaults to port 19633 on loopback', () => {
        expect(DEFAULT_PORT).toBe(19633);
        expect(DEFAULT_HOST).toBe('127.0.0.1');
    });

    it('answers OPTIONS preflight for any route with open CORS', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/termEntries', undefined, {method: 'OPTIONS'}), deps);
        expect(response.status).toBe(204);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('rejects the wrong method with 405', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/serverVersion', {}), deps);
        expect(response.status).toBe(405);
    });

    it('returns 404 for unknown paths', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/nope', {}), deps);
        expect(response.status).toBe(404);
    });
});

// ---------------------------------------------------------------------------
// /termEntries
// ---------------------------------------------------------------------------

describe('POST /termEntries', () => {
    it('returns a single object with index 0 for a string input', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/termEntries', {term: '食べる'}), deps);
        expect(response.status).toBe(200);

        const body = await response.json() as {
            index: number;
            dictionaryEntries: {type: string; headwords: {term: string}[]; definitions: unknown[]}[];
            originalTextLength: number;
        };

        expect(body.index).toBe(0);
        expect(body.originalTextLength).toBe(3);
        expect(body.dictionaryEntries[0]?.type).toBe('term');
        expect(body.dictionaryEntries[0]?.headwords[0]?.term).toBe('食べる');
        expect(body.dictionaryEntries[0]?.definitions[0]).toBeDefined();
    });

    it('returns an array of per-index results for an array input', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/termEntries', {term: ['食べる', '学生']}), deps);
        const body = await response.json() as {index: number; dictionaryEntries: unknown[]}[];
        expect(Array.isArray(body)).toBe(true);
        expect(body.map((entry) => entry.index)).toEqual([0, 1]);
        expect(body[0]!.dictionaryEntries.length).toBeGreaterThan(0);
    });

    it('carries the internal Yomitan entry shape (type/isPrimary/headwords/definitions)', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/termEntries', {term: '食べる'}), deps);
        const body = await response.json() as {dictionaryEntries: Record<string, unknown>[]};
        const entry = body.dictionaryEntries[0]!;
        expect(entry).toHaveProperty('type', 'term');
        expect(entry).toHaveProperty('isPrimary');
        expect(entry).toHaveProperty('textProcessorRuleChainCandidates');
        expect(entry).toHaveProperty('inflectionRuleChainCandidates');
        expect(entry).toHaveProperty('score');
        expect(entry).toHaveProperty('frequencyOrder');
        expect(entry).toHaveProperty('dictionaryIndex');
        expect(entry).toHaveProperty('dictionaryAlias');
        expect(entry).toHaveProperty('sourceTermExactMatchCount');
        expect(entry).toHaveProperty('matchPrimaryReading');
        expect(entry).toHaveProperty('maxOriginalTextLength');
        expect(entry).toHaveProperty('headwords');
        expect(entry).toHaveProperty('definitions');
        expect(entry).toHaveProperty('pronunciations');
        expect(entry).toHaveProperty('frequencies');
    });

    it('returns an empty entry set for an unknown term', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/termEntries', {term: '存在しない語'}), deps);
        const body = await response.json() as {dictionaryEntries: unknown[]};
        expect(body.dictionaryEntries).toEqual([]);
    });

    it('rejects a non-string term with 400', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/termEntries', {term: 42}), deps);
        expect(response.status).toBe(400);
    });

    it('rejects malformed JSON with 400', async () => {
        const response = await handleYomitanApiRequest(
            new Request('http://127.0.0.1/termEntries', {method: 'POST', body: '{not json'}),
            deps,
        );
        expect(response.status).toBe(400);
    });

    it('reports 500 when no translator is configured', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/termEntries', {term: '食べる'}), {options});
        expect(response.status).toBe(500);
    });
});

// ---------------------------------------------------------------------------
// /kanjiEntries
// ---------------------------------------------------------------------------

describe('POST /kanjiEntries', () => {
    it('returns kanji dictionary entries in Yomitan internal shape', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/kanjiEntries', {character: '食'}), deps);
        expect(response.status).toBe(200);

        const body = await response.json() as Record<string, unknown>[];
        expect(body[0]).toMatchObject({
            type: 'kanji',
            character: '食',
            dictionary: DICTIONARY,
            onyomi: ['ショク', 'ジキ'],
            kunyomi: ['た.べる', 'く.う'],
        });
        expect(body[0]).toHaveProperty('tags');
        expect(body[0]).toHaveProperty('stats');
        expect(body[0]).toHaveProperty('definitions');
        expect(body[0]).toHaveProperty('frequencies');
    });

    it('rejects a missing character field with 400', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/kanjiEntries', {}), deps);
        expect(response.status).toBe(400);
    });
});

// ---------------------------------------------------------------------------
// /tokenize
// ---------------------------------------------------------------------------

describe('POST /tokenize', () => {
    it('splits text into scan segments with readings', async () => {
        const response = await handleYomitanApiRequest(
            jsonRequest('/tokenize', {text: '食べた', scanLength: 10, parser: 'scanning-parser'}),
            deps,
        );
        expect(response.status).toBe(200);

        const body = await response.json() as {
            id: string;
            source: string;
            dictionary: string | null;
            index: number;
            content: {text: string; reading: string}[][];
        }[];

        expect(body[0]).toMatchObject({id: 'scan', source: 'scanning-parser', dictionary: null, index: 0});
        const flat = body[0]!.content.flat();
        expect(flat.map((segment) => segment.text).join('')).toBe('食べた');
    });

    it('emits one result per input string when given an array', async () => {
        const response = await handleYomitanApiRequest(
            jsonRequest('/tokenize', {text: ['食べる', '学生'], scanLength: 10}),
            deps,
        );
        const body = await response.json() as {index: number}[];
        expect(body.map((item) => item.index)).toEqual([0, 1]);
    });

    it('keeps unmatched characters as ungrouped segments', async () => {
        const response = await handleYomitanApiRequest(
            jsonRequest('/tokenize', {text: 'ZZZ食べる', scanLength: 10}),
            deps,
        );
        const body = await response.json() as {content: {text: string; reading: string}[][]} [];
        const flat = body[0]!.content.flat();
        expect(flat.map((segment) => segment.text).join('')).toBe('ZZZ食べる');
    });

    it('rejects a missing scanLength with 400', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/tokenize', {text: '食べる'}), deps);
        expect(response.status).toBe(400);
    });

    it('rejects an unknown parser with 400', async () => {
        const response = await handleYomitanApiRequest(
            jsonRequest('/tokenize', {text: '食べる', scanLength: 10, parser: 'nope'}),
            deps,
        );
        expect(response.status).toBe(400);
    });
});

// ---------------------------------------------------------------------------
// /ankiCardFormats
// ---------------------------------------------------------------------------

describe('POST /ankiCardFormats', () => {
    it('returns the active profile card formats for an empty body', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/ankiCardFormats', {}), deps);
        expect(response.status).toBe(200);

        const body = await response.json() as {name: string; type: string}[];
        expect(body.map((format) => format.name)).toEqual(['Expression', 'Reading', 'Kanji']);
        expect(body.map((format) => format.type)).toEqual(['term', 'term', 'kanji']);
    });

    it('falls back to the default profile when the body is not valid JSON', async () => {
        const response = await handleYomitanApiRequest(
            new Request('http://127.0.0.1/ankiCardFormats', {method: 'POST', body: 'not json'}),
            deps,
        );
        expect(response.status).toBe(200);
    });

    it('returns a requested profile by profileIndex', async () => {
        const twoProfiles = createOptions((opts) => {
            const second = createDefaultProfileOptions();
            second.anki.cardFormats = [{
                name: 'Custom',
                icon: 'big-circle',
                deck: 'D',
                model: 'M',
                type: 'term',
                fields: {},
            }];
            opts.profiles.push({name: 'Second', conditionGroups: [], options: second});
        });

        const response = await handleYomitanApiRequest(
            jsonRequest('/ankiCardFormats', {profileIndex: 1}),
            {options: twoProfiles},
        );
        const body = await response.json() as {name: string}[];
        expect(body).toHaveLength(1);
        expect(body[0]?.name).toBe('Custom');
    });

    it('rejects an out-of-range profileIndex with 400', async () => {
        const response = await handleYomitanApiRequest(jsonRequest('/ankiCardFormats', {profileIndex: 9}), deps);
        expect(response.status).toBe(400);
    });
});

// ---------------------------------------------------------------------------
// /ankiFields
// ---------------------------------------------------------------------------

describe('POST /ankiFields', () => {
    const markers = ['expression', 'reading', 'glossary', 'dictionary', 'tags'];

    it('renders the requested markers for term entries', async () => {
        const response = await handleYomitanApiRequest(
            jsonRequest('/ankiFields', {text: '食べる', type: 'term', markers, maxEntries: 1}),
            deps,
        );
        expect(response.status).toBe(200);

        const body = await response.json() as {fields: Record<string, string>[]; dictionaryMedia: unknown[]; audioMedia: unknown[]};
        expect(body.fields[0]?.expression).toBe('食べる');
        expect(body.fields[0]?.reading).toBe('たべる');
        expect(body.fields[0]?.glossary).toContain('to eat');
        expect(body.fields[0]?.dictionary).toBe(DICTIONARY);
        expect(body.dictionaryMedia).toEqual([]);
        expect(body.audioMedia).toEqual([]);
    });

    it('renders kanji markers for type=kanji', async () => {
        const response = await handleYomitanApiRequest(
            jsonRequest('/ankiFields', {
                text: '食',
                type: 'kanji',
                markers: ['character', 'onyomi', 'kunyomi', 'glossary'],
                maxEntries: 1,
            }),
            deps,
        );
        const body = await response.json() as {fields: Record<string, string>[]};
        expect(body.fields[0]?.character).toBe('食');
        expect(body.fields[0]?.onyomi).toContain('ショク');
        expect(body.fields[0]?.glossary).toContain('food');
    });

    it('honours maxEntries by truncating the rendered fields', async () => {
        const response = await handleYomitanApiRequest(
            jsonRequest('/ankiFields', {text: '食べる', type: 'term', markers: ['expression'], maxEntries: 1}),
            deps,
        );
        const body = await response.json() as {fields: unknown[]};
        expect(body.fields).toHaveLength(1);
    });

    it('rejects an invalid type with 400', async () => {
        const response = await handleYomitanApiRequest(
            jsonRequest('/ankiFields', {text: '食べる', type: 'sentence', markers: ['expression'], maxEntries: 1}),
            deps,
        );
        expect(response.status).toBe(400);
    });

    it('rejects empty markers with 400', async () => {
        const response = await handleYomitanApiRequest(
            jsonRequest('/ankiFields', {text: '食べる', type: 'term', markers: [], maxEntries: 1}),
            deps,
        );
        expect(response.status).toBe(400);
    });
});

// ---------------------------------------------------------------------------
// renderMarker (unit)
// ---------------------------------------------------------------------------

describe('renderMarker', () => {
    it('returns an empty string for markers that need extension media', () => {
        const entry = {type: 'term', headwords: [{term: '食べる', reading: 'たべる'}], definitions: []};
        expect(renderMarker('audio', entry)).toBe('');
        expect(renderMarker('screenshot', entry)).toBe('');
    });

    it('returns an empty string for unknown markers', () => {
        expect(renderMarker('unknown-marker', {type: 'term'})).toBe('');
    });

    it('joins multiple headwords with a comma', () => {
        const entry = {
            type: 'term',
            headwords: [{term: '食べる', reading: 'たべる'}, {term: '喰べる', reading: 'くべる'}],
            definitions: [],
        };
        expect(renderMarker('expression', entry)).toBe('食べる, 喰べる');
    });

    it('flattens structured-content glossaries to text', () => {
        const entry = {
            type: 'term',
            headwords: [{term: '食べる', reading: 'たべる'}],
            definitions: [{
                dictionary: 'D',
                entries: [{type: 'structured-content', content: [{tag: 'li', content: 'to eat'}]}],
            }],
        };
        expect(renderMarker('glossary', entry)).toBe('to eat');
    });
});

// ---------------------------------------------------------------------------
// node:http adapter — end to end over a real socket
// ---------------------------------------------------------------------------

describe('createYomitanApiServer (node:http)', () => {
    let started: StartedYomitanApiServer;

    beforeAll(async () => {
        started = await startYomitanApiServer({port: 0, translator, options});
    });

    afterAll(async () => {
        await started?.close();
    });

    it('binds to an ephemeral loopback port and exposes the expected url', () => {
        expect(started.host).toBe('127.0.0.1');
        expect(started.port).toBeGreaterThan(0);
        expect(started.url).toBe(`http://127.0.0.1:${started.port}`);
    });

    it('serves GET /serverVersion over HTTP', async () => {
        const response = await fetch(`${started.url}/serverVersion`);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({version: SERVER_VERSION});
    });

    it('serves POST /termEntries over HTTP with CORS headers', async () => {
        const response = await fetch(`${started.url}/termEntries`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({term: '食べる'}),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('access-control-allow-origin')).toBe('*');
        const body = await response.json() as {index: number; dictionaryEntries: unknown[]};
        expect(body.index).toBe(0);
        expect(body.dictionaryEntries.length).toBeGreaterThan(0);
    });

    it('serves POST /kanjiEntries over HTTP', async () => {
        const response = await fetch(`${started.url}/kanjiEntries`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({character: '食'}),
        });
        const body = await response.json() as {character: string}[];
        expect(body[0]?.character).toBe('食');
    });

    it('createYomitanApiServer returns a non-listening server', () => {
        const server = createYomitanApiServer({translator, options});
        expect(server.listening).toBe(false);
        server.close();
    });

    it('surfaces handler errors as a 500 JSON body', async () => {
        const response = await fetch(`${started.url}/termEntries`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({term: 123}),
        });
        expect(response.status).toBe(400);
        expect(await response.json()).toHaveProperty('error');
    });
});