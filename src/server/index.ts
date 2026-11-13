/**
 * @gorakudo/yomitan-headless/server
 *
 * Yomitan-compatible HTTP / Fetch API server.
 *
 * Mirrors the wire contract of the original `yomitan-api` native messaging host
 * (`https://github.com/yomidevs/yomitan-api`) as implemented by Yomitan's own
 * `ext/js/comm/yomitan-api.js`:
 *
 * - `GET  /serverVersion`   → `{version: number}`
 * - `GET  /yomitanVersion`  → `{version: string}`
 * - `POST /termEntries`     `{term: string | string[]}`
 *   → `{index, dictionaryEntries, originalTextLength}` (array when input is an array)
 * - `POST /kanjiEntries`    `{character: string}` → `KanjiDictionaryEntry[]`
 * - `POST /tokenize`        `{text: string | string[], scanLength, parser?}`
 *   → `ParseTextResultItem[]`
 * - `POST /ankiCardFormats` `{profileIndex?}` → `AnkiCardFormat[]`
 * - `POST /ankiFields`      `{text, type, markers, maxEntries, includeMedia?}`
 *   → `{fields, dictionaryMedia, audioMedia}`
 *
 * CORS is fully open (`Access-Control-Allow-Origin: *`, `OPTIONS` preflight).
 *
 * Two interchangeable surfaces are exported:
 *
 * - `handleYomitanApiRequest(request, deps)` — pure Fetch `Request → Response`,
 *   usable in Bun / Deno / Workers / tests.
 * - `createYomitanApiServer(options)` / `startYomitanApiServer(options)` — a
 *   `node:http` server (default `127.0.0.1:19633`) that adapts
 *   `IncomingMessage` to the Fetch handler.
 */

import {createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http';
import type {AddressInfo} from 'node:net';

import {Translator, distributeFuriganaInflected, isCodePointJapanese} from '../index.js';
import {createDefaultOptions, createDefaultProfileOptions} from '../settings/defaults.js';
import type {AnkiCardFormat, Options, ProfileOptions} from '../settings/types.js';

/** Native messaging component version reported by `/serverVersion`. */
export const SERVER_VERSION = 1;
/** Yomitan version reported by `/yomitanVersion`. */
export const YOMITAN_VERSION = '26.11.2.0';
/** Default port used by the original yomitan-api host. */
export const DEFAULT_PORT = 19633;
/** Default bind address — loopback only. */
export const DEFAULT_HOST = '127.0.0.1';

const CORS_HEADERS: Readonly<Record<string, string>> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
};

/** Subset of `api.ParseTextSegment` returned by `/tokenize`. */
export type TokenizeSegment = {
    text: string;
    reading: string;
    lemma?: string;
    lemmaReading?: string;
    headwords?: TokenizeHeadword[];
};

export type TokenizeHeadword = {
    term: string;
    reading: string;
    sources: unknown[];
    frequencies: unknown[];
    pronunciations: unknown[];
};

/** Subset of `api.ParseTextResultItem`. */
export type TokenizeResult = {
    id: string;
    source: 'scanning-parser' | 'mecab';
    dictionary: string | null;
    index: number;
    content: TokenizeSegment[][];
};

export type YomitanApiServerOptions = {
    /** TCP port to bind on. Defaults to `19633`. Use `0` for an ephemeral port. */
    port?: number;
    /** Bind address. Defaults to `127.0.0.1` (loopback only). */
    host?: string;
    /** Dictionary backend. When omitted, endpoints that need lookups return 500. */
    translator?: Translator;
    /** Root options; defaults to `createDefaultOptions()`. */
    options?: Options;
};

/** Dependencies resolved per request. */
export type YomitanApiDependencies = {
    translator?: Translator;
    options?: Options;
};

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {...CORS_HEADERS, 'Content-Type': 'application/json'},
    });
}

function errorResponse(message: string, status = 400): Response {
    return jsonResponse({error: message}, status);
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
    const raw = await request.text();
    let parsed: unknown;
    try {
        parsed = raw.length > 0 ? JSON.parse(raw) : {};
    } catch {
        throw new YomitanApiError('Invalid JSON body', 400);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new YomitanApiError('Request body must be a JSON object', 400);
    }
    return parsed as Record<string, unknown>;
}

/** Error carrying the HTTP status the response should use. */
export class YomitanApiError extends Error {
    readonly status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = 'YomitanApiError';
        this.status = status;
    }
}

// ---------------------------------------------------------------------------
// Options plumbing (mirrors backend.js `_getProfileOptions` / `_getTranslator*`)
// ---------------------------------------------------------------------------

function resolveProfileOptions(options: Options, profileIndex?: number): ProfileOptions {
    const requested = profileIndex;
    const index = typeof requested === 'number' && Number.isInteger(requested) ? requested : options.profileCurrent;
    const profile = options.profiles[index] ?? options.profiles[options.profileCurrent] ?? options.profiles[0];
    return profile?.options ?? createDefaultProfileOptions();
}

type FindTermDictionary = {
    index: number;
    alias: string;
    allowSecondarySearches: boolean;
    partsOfSpeechFilter: boolean;
    useDeinflections: boolean;
};

type FindKanjiDictionary = {index: number; alias: string};

function enabledDictionaryMaps(options: ProfileOptions): {
    termMap: Map<string, FindTermDictionary>;
    kanjiMap: Map<string, FindKanjiDictionary>;
} {
    const termMap = new Map<string, FindTermDictionary>();
    const kanjiMap = new Map<string, FindKanjiDictionary>();
    for (const dictionary of options.dictionaries ?? []) {
        if (!dictionary.enabled) { continue; }
        const index = termMap.size;
        termMap.set(dictionary.name, {
            index,
            alias: dictionary.alias || dictionary.name,
            allowSecondarySearches: dictionary.allowSecondarySearches,
            partsOfSpeechFilter: dictionary.partsOfSpeechFilter,
            useDeinflections: dictionary.useDeinflections,
        });
        kanjiMap.set(dictionary.name, {index, alias: dictionary.alias || dictionary.name});
    }
    return {termMap, kanjiMap};
}

function textReplacementsFor(options: ProfileOptions): ({pattern: RegExp; replacement: string}[] | null)[] {
    const replacements: ({pattern: RegExp; replacement: string}[] | null)[] = [];
    for (const group of options.translation.textReplacements.groups ?? []) {
        const entries: {pattern: RegExp; replacement: string}[] = [];
        for (const {pattern, ignoreCase, replacement} of group) {
            try {
                entries.push({pattern: new RegExp(pattern, ignoreCase ? 'gi' : 'g'), replacement});
            } catch {
                // Invalid pattern — skip, exactly like backend.js.
            }
        }
        if (entries.length > 0) { replacements.push(entries); }
    }
    if (replacements.length === 0 || options.translation.textReplacements.searchOriginal) {
        replacements.unshift(null);
    }
    return replacements;
}

// ---------------------------------------------------------------------------
// Fetch API handler
// ---------------------------------------------------------------------------

/**
 * Handles one Yomitan API request. Pure Fetch: no sockets, no globals.
 *
 * `dependencies.translator` is required by the lookup endpoints; when it is
 * missing those endpoints answer `500` instead of throwing.
 */
export async function handleYomitanApiRequest(
    request: Request,
    dependencies: YomitanApiDependencies = {},
): Promise<Response> {
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') {
        return new Response(null, {status: 204, headers: CORS_HEADERS});
    }

    let path: string;
    try {
        path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    } catch {
        return errorResponse('Invalid request URL', 400);
    }

    try {
        switch (path) {
            case '/serverVersion':
                if (method !== 'GET') { throw new YomitanApiError('Method not allowed, only GET is accepted', 405); }
                return jsonResponse({version: SERVER_VERSION});

            case '/yomitanVersion':
                if (method !== 'GET') { throw new YomitanApiError('Method not allowed, only GET is accepted', 405); }
                return jsonResponse({version: YOMITAN_VERSION});

            case '/termEntries':
                return await handleTermEntries(request, method, dependencies);

            case '/kanjiEntries':
                return await handleKanjiEntries(request, method, dependencies);

            case '/tokenize':
                return await handleTokenize(request, method, dependencies);

            case '/ankiCardFormats':
                return await handleAnkiCardFormats(request, method, dependencies);

            case '/ankiFields':
                return await handleAnkiFields(request, method, dependencies);

            default:
                return errorResponse('Not found', 404);
        }
    } catch (error) {
        if (error instanceof YomitanApiError) {
            return errorResponse(error.message, error.status);
        }
        const message = error instanceof Error ? error.message : String(error);
        return errorResponse(message, 500);
    }
}

function requireMethod(method: string, allowed: 'GET' | 'POST'): void {
    if (method !== allowed) {
        throw new YomitanApiError(`Method not allowed, only ${allowed} is accepted`, 405);
    }
}

function requireTranslator(dependencies: YomitanApiDependencies): Translator {
    const {translator} = dependencies;
    if (!translator) {
        throw new YomitanApiError('Dictionary backend is not configured: pass {translator} to the server', 500);
    }
    return translator;
}

async function handleTermEntries(
    request: Request,
    method: string,
    dependencies: YomitanApiDependencies,
): Promise<Response> {
    requireMethod(method, 'POST');
    const body = await readJsonBody(request);
    const translator = requireTranslator(dependencies);

    const options = dependencies.options ?? createDefaultOptions();
    const {term} = body;
    const isSingle = typeof term === 'string';
    const terms = isSingle ? [term as string] : Array.isArray(term) ? term.filter((t): t is string => typeof t === 'string') : [];
    if (terms.length === 0) {
        throw new YomitanApiError('Invalid input for termEntries, expected "term" to be a string or a string array', 400);
    }

    const entries = await Promise.all(terms.map(async (text, index) => ({
        index,
        ...(await findTerms(text, options, dependencies)),
    })));

    return jsonResponse(isSingle ? entries[0] : entries);
}

async function handleKanjiEntries(
    request: Request,
    method: string,
    dependencies: YomitanApiDependencies,
): Promise<Response> {
    requireMethod(method, 'POST');
    const body = await readJsonBody(request);
    const translator = requireTranslator(dependencies);

    const options = dependencies.options ?? createDefaultOptions();
    const {character} = body;
    if (typeof character !== 'string' || character.length === 0) {
        throw new YomitanApiError('Invalid input for kanjiEntries, expected "character" to be a string', 400);
    }

    return jsonResponse(await findKanji(character, options, translator));
}

async function handleTokenize(
    request: Request,
    method: string,
    dependencies: YomitanApiDependencies,
): Promise<Response> {
    requireMethod(method, 'POST');
    const body = await readJsonBody(request);
    const translator = requireTranslator(dependencies);

    const {text, scanLength, parser} = body;
    if (typeof text !== 'string' && !Array.isArray(text)) {
        throw new YomitanApiError('Invalid input for tokenize, expected "text" to be a string or a string array', 400);
    }
    if (typeof scanLength !== 'number' || !Number.isFinite(scanLength) || scanLength <= 0) {
        throw new YomitanApiError('Invalid input for tokenize, expected "scanLength" to be a positive number', 400);
    }
    if (parser !== undefined && parser !== 'scanning-parser' && parser !== 'mecab') {
        throw new YomitanApiError(`Invalid input for tokenize, unknown parser "${String(parser)}"`, 400);
    }

    const options = dependencies.options ?? createDefaultOptions();
    const texts = Array.isArray(text) ? text.filter((t): t is string => typeof t === 'string') : [text as string];
    const results: TokenizeResult[] = [];

    for (let index = 0; index < texts.length; index++) {
        // mecab integration is browser/extension-only; the headless build always
        // uses Yomitan's internal scanning parser.
        const content = await parseTextScanning(texts[index]!, scanLength, options, translator);
        results.push({id: 'scan', source: 'scanning-parser', dictionary: null, index, content});
    }

    return jsonResponse(results);
}

async function handleAnkiCardFormats(
    request: Request,
    method: string,
    dependencies: YomitanApiDependencies,
): Promise<Response> {
    requireMethod(method, 'POST');

    let body: Record<string, unknown> = {};
    try {
        body = await readJsonBody(request);
    } catch (error) {
        if (!(error instanceof YomitanApiError)) { throw error; }
        // Empty body is acceptable — fall back to the active profile.
    }

    const options = dependencies.options ?? createDefaultOptions();
    const {profileIndex} = body;
    if (profileIndex !== undefined && typeof profileIndex !== 'number') {
        throw new YomitanApiError('Invalid input for ankiCardFormats, expected "profileIndex" to be a number', 400);
    }

    const profile = options.profiles[profileIndex as number];
    if (profileIndex !== undefined && profile === undefined) {
        throw new YomitanApiError(`Invalid input for ankiCardFormats, unknown profileIndex ${String(profileIndex)}`, 400);
    }

    return jsonResponse((profile?.options ?? resolveProfileOptions(options)).anki.cardFormats satisfies AnkiCardFormat[]);
}

async function handleAnkiFields(
    request: Request,
    method: string,
    dependencies: YomitanApiDependencies,
): Promise<Response> {
    requireMethod(method, 'POST');
    const body = await readJsonBody(request);
    const translator = requireTranslator(dependencies);

    const {text, type, markers, maxEntries, includeMedia} = body;
    if (typeof text !== 'string') {
        throw new YomitanApiError('Invalid input for ankiFields, expected "text" to be a string', 400);
    }
    if (type !== 'term' && type !== 'kanji') {
        throw new YomitanApiError('Invalid input for ankiFields, expected "type" to be "term" or "kanji"', 400);
    }
    if (!Array.isArray(markers) || markers.length === 0 || markers.some((m) => typeof m !== 'string')) {
        throw new YomitanApiError('Invalid input for ankiFields, expected "markers" to be a non-empty array of strings', 400);
    }
    if (typeof maxEntries !== 'number' || maxEntries <= 0) {
        throw new YomitanApiError('Invalid input for ankiFields, expected "maxEntries" to be a positive number', 400);
    }

    const options = dependencies.options ?? createDefaultOptions();
    const limit = Math.floor(maxEntries);
    const dictionaryEntries = (
        type === 'term'
            ? (await findTerms(text, options, dependencies)).dictionaryEntries
            : await findKanji(text, options, translator)
    ).slice(0, limit);

    const fields = dictionaryEntries.map((entry) => {
        const rendered: Record<string, string> = {};
        for (const marker of markers as string[]) {
            rendered[marker] = renderMarker(marker, entry);
        }
        return rendered;
    });

    // Media capture is out of scope for the headless build: it needs the
    // extension's audio downloader, clipboard reader and dictionary media store.
    void includeMedia;

    return jsonResponse({fields, dictionaryMedia: [], audioMedia: []});
}

// ---------------------------------------------------------------------------
// Lookup helpers (mirror backend.js `_onApiTermsFind` / `_onApiKanjiFind`)
// ---------------------------------------------------------------------------

async function findTerms(
    text: string,
    options: Options,
    dependencies: YomitanApiDependencies,
): Promise<{dictionaryEntries: unknown[]; originalTextLength: number}> {
    const translator = requireTranslator(dependencies);
    const profileOptions = resolveProfileOptions(options);
    const {termMap} = enabledDictionaryMaps(profileOptions);
    const {dictionaryEntries, originalTextLength} = await translator.findTerms(profileOptions.general.resultOutputMode, text, {
        matchType: 'exact',
        deinflect: true,
        primaryReading: '',
        mainDictionary: profileOptions.general.mainDictionary,
        sortFrequencyDictionary: profileOptions.general.sortFrequencyDictionary,
        sortFrequencyDictionaryOrder: profileOptions.general.sortFrequencyDictionaryOrder,
        removeNonJapaneseCharacters: !profileOptions.scanning.alphanumeric,
        searchResolution: profileOptions.translation.searchResolution,
        textReplacements: textReplacementsFor(profileOptions),
        enabledDictionaryMap: termMap,
        excludeDictionaryDefinitions: null,
        language: profileOptions.general.language,
        useAllFrequencyDictionaries: profileOptions.parsing.useAllFrequencyDictionaries,
    });
    return {dictionaryEntries: dictionaryEntries.splice(0, profileOptions.general.maxResults), originalTextLength};
}

async function findKanji(text: string, options: Options, translator: Translator): Promise<unknown[]> {
    const profileOptions = resolveProfileOptions(options);
    const {kanjiMap} = enabledDictionaryMaps(profileOptions);
    const entries = await translator.findKanji(text, {
        enabledDictionaryMap: kanjiMap,
        removeNonJapaneseCharacters: !profileOptions.scanning.alphanumeric,
    });
    return entries.splice(0, profileOptions.general.maxResults);
}

/**
 * Port of `backend._textParseScanning`: longest-match tokenisation using
 * `Translator.findTerms('simple', ...)` plus furigana distribution.
 */
async function parseTextScanning(
    text: string,
    scanLength: number,
    options: Options,
    translator: Translator,
): Promise<TokenizeSegment[][]> {
    const profileOptions = resolveProfileOptions(options);
    const {termMap} = enabledDictionaryMaps(profileOptions);
    const findOptions = {
        matchType: 'exact' as const,
        deinflect: true,
        primaryReading: '',
        mainDictionary: profileOptions.general.mainDictionary,
        sortFrequencyDictionary: profileOptions.general.sortFrequencyDictionary,
        sortFrequencyDictionaryOrder: profileOptions.general.sortFrequencyDictionaryOrder,
        removeNonJapaneseCharacters: !profileOptions.scanning.alphanumeric,
        searchResolution: profileOptions.translation.searchResolution,
        textReplacements: textReplacementsFor(profileOptions),
        enabledDictionaryMap: termMap,
        excludeDictionaryDefinitions: null,
        language: profileOptions.general.language,
        useAllFrequencyDictionaries: true,
    };

    const results: TokenizeSegment[][] = [];
    let previousUngrouped: TokenizeSegment | null = null;
    let cursor = 0;

    while (cursor < text.length) {
        const codePoint = text.codePointAt(cursor)!;
        const character = String.fromCodePoint(codePoint);
        const substring = text.substring(cursor, cursor + scanLength);

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('simple', substring, findOptions);
        const segments: TokenizeSegment[] = [];

        if (dictionaryEntries.length > 0 && originalTextLength > 0 &&
            (originalTextLength !== character.length || isCodePointJapanese(codePoint))) {
            const {headwords} = dictionaryEntries[0] as {headwords: {term: string; reading: string}[]};
            const source = substring.substring(0, originalTextLength);
            for (const segment of distributeFuriganaInflected(headwords[0]!.term, headwords[0]!.reading, source)) {
                segments.push({text: segment.text, reading: segment.reading});
            }
            if (segments.length > 0) {
                const token = segments.map((segment) => segment.text).join('');
                segments[0]!.headwords = collectHeadwords(dictionaryEntries as unknown[], token);
            }
        }

        if (segments.length > 0) {
            previousUngrouped = null;
            results.push(segments);
            cursor += originalTextLength;
        } else {
            if (previousUngrouped === null) {
                previousUngrouped = {text: character, reading: ''};
                results.push([previousUngrouped]);
            } else {
                previousUngrouped.text += character;
            }
            cursor += character.length;
        }
    }

    return results;
}

/** Keeps only primary, exact, token-matching sources — same filter as backend.js. */
function collectHeadwords(dictionaryEntries: unknown[], token: string): TokenizeHeadword[] {
    const trimmed: TokenizeHeadword[] = [];
    for (const raw of dictionaryEntries) {
        const entry = raw as {
            headwords?: {term: string; reading: string; sources: Record<string, unknown>[]}[];
            frequencies?: unknown[];
            pronunciations?: unknown[];
        };
        const validHeadwords: TokenizeHeadword[] = [];
        const headwords = entry.headwords ?? [];
        for (let i = 0; i < headwords.length; i++) {
            const headword = headwords[i]!;
            const validSources = (headword.sources ?? []).filter((source) => (
                source.originalText === token && source.isPrimary === true && source.matchType === 'exact'
            ));
            if (validSources.length === 0) { continue; }
            validHeadwords.push({
                term: headword.term,
                reading: headword.reading,
                sources: validSources,
                frequencies: (entry.frequencies ?? []).filter(
                    (frequency) => (frequency as {headwordIndex: number}).headwordIndex === i,
                ),
                pronunciations: (entry.pronunciations ?? []).filter(
                    (pronunciation) => (pronunciation as {headwordIndex: number}).headwordIndex === i,
                ),
            });
        }
        if (validHeadwords.length > 0) { trimmed.push(validHeadwords as unknown as TokenizeHeadword); }
    }
    return trimmed;
}

// ---------------------------------------------------------------------------
// Anki markers
// ---------------------------------------------------------------------------

/** Renders a single Anki marker (`{expression}`, `{glossary}`, ...) as plain text. */
export function renderMarker(marker: string, entry: unknown): string {
    const record = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<string, unknown>;

    if (record.type === 'kanji') {
        switch (marker) {
            case 'character': return String(record.character ?? '');
            case 'onyomi': return Array.isArray(record.onyomi) ? record.onyomi.join(', ') : '';
            case 'kunyomi': return Array.isArray(record.kunyomi) ? record.kunyomi.join(', ') : '';
            case 'glossary': return Array.isArray(record.definitions) ? record.definitions.join(', ') : '';
            case 'dictionary': return String(record.dictionary ?? '');
            case 'dictionary-alias': return String(record.dictionaryAlias ?? '');
            default: return '';
        }
    }

    const headwords = Array.isArray(record.headwords) ? record.headwords as Record<string, unknown>[] : [];
    const definitions = Array.isArray(record.definitions) ? record.definitions as Record<string, unknown>[] : [];

    switch (marker) {
        case 'expression':
            return headwords.map((headword) => String(headword.term ?? '')).join(', ');
        case 'reading':
            return headwords.map((headword) => String(headword.reading ?? '')).join(', ');
        case 'glossary':
            return definitions.flatMap((definition) => glossaryToText(definition.entries)).join('\n');
        case 'dictionary':
            return String(definitions[0]?.dictionary ?? '');
        case 'tags':
            return definitions
                .flatMap((definition) => Array.isArray(definition.tags) ? definition.tags as Record<string, unknown>[] : [])
                .map((tag) => String(tag.name ?? ''))
                .join(', ');
        // Media markers need the extension's audio downloader / screenshot capture.
        case 'audio':
        case 'screenshot':
        case 'clipboard-image':
        case 'clipboard-text':
        case 'popup-selection-text':
            return '';
        default:
            return '';
    }
}

function glossaryToText(entries: unknown): string[] {
    if (typeof entries === 'string') { return [entries]; }
    if (Array.isArray(entries)) { return entries.map((entry) => glossaryToText(entry).join('')).filter(Boolean) as string[]; }
    if (typeof entries === 'object' && entries !== null) {
        const record = entries as Record<string, unknown>;
        if (typeof record.text === 'string') { return [record.text]; }
        if ('content' in record) { return glossaryToText(record.content); }
    }
    return [];
}

// ---------------------------------------------------------------------------
// node:http adapter
// ---------------------------------------------------------------------------

/**
 * Creates a `node:http` server around {@link handleYomitanApiRequest}.
 * The returned server is not listening — call `.listen(port, host)` or use
 * {@link startYomitanApiServer}.
 */
export function createYomitanApiServer(options: YomitanApiServerOptions = {}): Server {
    const dependencies: YomitanApiDependencies = {translator: options.translator, options: options.options};

    return createHttpServer((req: IncomingMessage, res: ServerResponse) => {
        void (async () => {
            try {
                const method = req.method ?? 'GET';
                const host = req.headers.host ?? `${DEFAULT_HOST}:${DEFAULT_PORT}`;
                const headers = new Headers();
                for (const [key, value] of Object.entries(req.headers)) {
                    if (typeof value === 'string') {
                        headers.set(key, value);
                    } else if (Array.isArray(value)) {
                        headers.set(key, value.join(', '));
                    }
                }

                const body = await readRequestBody(req);
                const request = new Request(`http://${host}${req.url ?? '/'}`, {
                    method,
                    headers,
                    body: method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || body.byteLength === 0
                        ? undefined
                        : new Uint8Array(body),
                });

                const response = await handleYomitanApiRequest(request, dependencies);
                const responseHeaders: Record<string, string> = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });
                res.writeHead(response.status, responseHeaders);
                res.end(Buffer.from(await response.arrayBuffer()));
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                res.writeHead(500, {...CORS_HEADERS, 'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: message}));
            }
        })();
    });
}

function readRequestBody(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

export type StartedYomitanApiServer = {
    server: Server;
    port: number;
    host: string;
    url: string;
    close: () => Promise<void>;
};

/** Creates and starts the server, resolving once it is listening. */
export async function startYomitanApiServer(options: YomitanApiServerOptions = {}): Promise<StartedYomitanApiServer> {
    const host = options.host ?? DEFAULT_HOST;
    const port = options.port ?? DEFAULT_PORT;
    const server = createYomitanApiServer({...options, host, port});

    await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => {
            server.off('listening', onListening);
            reject(error);
        };
        const onListening = () => {
            server.off('error', onError);
            resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, host);
    });

    const address = server.address() as AddressInfo | null;
    const boundPort = address?.port ?? port;

    return {
        server,
        port: boundPort,
        host,
        url: `http://${host}:${boundPort}`,
        close: () => new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        }),
    };
}