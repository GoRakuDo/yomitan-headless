/**
 * Default Yomitan options factory.
 *
 * Every value here matches `vendor/yomitan/ext/data/schemas/options-schema.json`
 * `default` fields exactly. Callers can use these as a safe starting point and
 * then merge in user overrides.
 */

import type {
    AccessibilityOptions,
    AnkiOptions,
    AudioOptions,
    ClipboardOptions,
    DictionaryOptions,
    GeneralOptions,
    GlobalOptions,
    Hotkey,
    InputsOptions,
    Options,
    ParsingOptions,
    Profile,
    ProfileOptions,
    PopupWindowOptions,
    ScanningInput,
    ScanningOptions,
    SentenceParsingOptions,
    TranslationOptions,
} from './types.js';

// ---------------------------------------------------------------------------
// Default hotkeys (matches Yomitan upstream)
// ---------------------------------------------------------------------------

function defaultHotkeys(): Hotkey[] {
    return [
        {action: 'close',             argument: '',  key: 'Escape',    modifiers: [],       scopes: ['popup'],           enabled: true},
        {action: 'focusSearchBox',    argument: '',  key: 'Escape',    modifiers: [],       scopes: ['search'],          enabled: true},
        {action: 'previousEntry',     argument: '3', key: 'PageUp',    modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'nextEntry',         argument: '3', key: 'PageDown',  modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'lastEntry',         argument: '',  key: 'End',       modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'firstEntry',        argument: '',  key: 'Home',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'previousEntry',     argument: '1', key: 'ArrowUp',   modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'nextEntry',         argument: '1', key: 'ArrowDown', modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'historyBackward',   argument: '',  key: 'KeyB',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'historyForward',    argument: '',  key: 'KeyF',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'profilePrevious',   argument: '',  key: 'Minus',     modifiers: ['alt'],  scopes: ['popup', 'search', 'web'], enabled: true},
        {action: 'profileNext',       argument: '',  key: 'Equal',     modifiers: ['alt'],  scopes: ['popup', 'search', 'web'], enabled: true},
        {action: 'addNote',           argument: '0', key: 'KeyE',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'addNote',           argument: '1', key: 'KeyR',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'addNote',           argument: '2', key: 'KeyK',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'playAudio',         argument: '',  key: 'KeyP',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'viewNotes',         argument: '0', key: 'KeyV',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
        {action: 'copyHostSelection', argument: '',  key: 'KeyC',      modifiers: ['ctrl'], scopes: ['popup'],           enabled: true},
    ];
}

// ---------------------------------------------------------------------------
// Default scanning inputs
// ---------------------------------------------------------------------------

function defaultScanningInputs(): ScanningInput[] {
    return [
        {
            include: 'shift',
            exclude: 'mouse0',
            types: {mouse: true, touch: false, pen: false},
            options: {
                showAdvanced: false,
                searchTerms: true,
                searchKanji: true,
                scanOnTouchTap: true,
                scanOnTouchMove: false,
                scanOnTouchPress: false,
                scanOnTouchRelease: false,
                scanOnPenMove: true,
                scanOnPenHover: false,
                scanOnPenReleaseHover: false,
                scanOnPenPress: true,
                scanOnPenRelease: false,
                preventTouchScrolling: false,
                preventPenScrolling: false,
                minimumTouchTime: 0,
            },
        },
        {
            include: '',
            exclude: '',
            types: {mouse: false, touch: true, pen: true},
            options: {
                showAdvanced: false,
                searchTerms: true,
                searchKanji: true,
                scanOnTouchTap: true,
                scanOnTouchMove: false,
                scanOnTouchPress: false,
                scanOnTouchRelease: false,
                scanOnPenMove: true,
                scanOnPenHover: false,
                scanOnPenReleaseHover: false,
                scanOnPenPress: true,
                scanOnPenRelease: false,
                preventTouchScrolling: true,
                preventPenScrolling: true,
                minimumTouchTime: 0,
            },
        },
    ];
}

// ---------------------------------------------------------------------------
// Default sentence termination characters
// ---------------------------------------------------------------------------

function defaultTerminationCharacters() {
    return [
        {enabled: true, character1: '「', character2: '」', includeCharacterAtStart: false, includeCharacterAtEnd: false},
        {enabled: true, character1: '『', character2: '』', includeCharacterAtStart: false, includeCharacterAtEnd: false},
        {enabled: true, character1: '"',  character2: '"',  includeCharacterAtStart: false, includeCharacterAtEnd: false},
        {enabled: true, character1: "'",  character2: "'",  includeCharacterAtStart: false, includeCharacterAtEnd: false},
        {enabled: true, character1: '.',  character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
        {enabled: true, character1: '!',  character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
        {enabled: true, character1: '?',  character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
        {enabled: true, character1: '．', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
        {enabled: true, character1: '。', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
        {enabled: true, character1: '！', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
        {enabled: true, character1: '？', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
        {enabled: true, character1: '…',  character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
        {enabled: true, character1: '︒', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
        {enabled: true, character1: '︕', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
        {enabled: true, character1: '︖', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
        {enabled: true, character1: '︙', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
    ];
}

// ---------------------------------------------------------------------------
// Default Anki card formats
// ---------------------------------------------------------------------------

function defaultCardFormats() {
    return [
        {name: 'Expression', icon: 'big-circle' as const, deck: '', model: '', fields: {}, type: 'term' as const},
        {name: 'Reading',    icon: 'small-circle' as const, deck: '', model: '', fields: {}, type: 'term' as const},
        {name: 'Kanji',      icon: 'big-circle' as const, deck: '', model: '', fields: {}, type: 'kanji' as const},
    ];
}

// ---------------------------------------------------------------------------
// Sub-object factories
// ---------------------------------------------------------------------------

export function createDefaultGeneralOptions(): GeneralOptions {
    return {
        enable: true,
        language: 'ja',
        resultOutputMode: 'group',
        debugInfo: false,
        maxResults: 32,
        showAdvanced: false,
        showDebug: false,
        popupDisplayMode: 'default',
        popupFullWidthPosition: 'bottom',
        popupWidth: 400,
        popupHeight: 250,
        popupHorizontalOffset: 0,
        popupVerticalOffset: 10,
        popupHorizontalOffset2: 10,
        popupVerticalOffset2: 0,
        popupHorizontalTextPosition: 'below',
        popupVerticalTextPosition: 'before',
        popupScalingFactor: 1,
        popupScaleRelativeToPageZoom: false,
        popupScaleRelativeToVisualViewport: true,
        showGuide: true,
        enableContextMenuScanSelected: true,
        compactTags: false,
        averageFrequency: false,
        glossaryLayoutMode: 'default',
        mainDictionary: '',
        popupTheme: 'site',
        popupOuterTheme: 'site',
        customPopupCss: '',
        customPopupOuterCss: '',
        enableWanakana: true,
        showPitchAccentDownstepNotation: true,
        showPitchAccentPositionNotation: true,
        showPitchAccentGraph: false,
        showIframePopupsInRootFrame: true,
        useSecurePopupFrameUrl: true,
        usePopupShadowDom: true,
        usePopupWindow: false,
        popupCurrentIndicatorMode: 'triangle',
        popupActionBarVisibility: 'auto',
        popupActionBarLocation: 'top',
        frequencyDisplayMode: 'split-tags-grouped',
        termDisplayMode: 'ruby',
        sortFrequencyDictionary: null,
        sortFrequencyDictionaryOrder: 'descending',
        stickySearchHeader: false,
        fontFamily: '',
        fontSize: 14,
        lineHeight: '1.5',
        enableYomitanApi: false,
        yomitanApiServer: 'http://127.0.0.1:19633',
        yomitanApiAllowCssSanitizationBypass: false,
    };
}

export function createDefaultPopupWindowOptions(): PopupWindowOptions {
    return {
        width: 400,
        height: 250,
        left: 0,
        top: 0,
        useLeft: false,
        useTop: false,
        windowType: 'popup',
        windowState: 'normal',
    };
}

export function createDefaultAudioOptions(): AudioOptions {
    return {
        enabled: true,
        volume: 100,
        autoPlay: false,
        fallbackSoundType: 'click',
        sources: [],
        enableDefaultAudioSources: true,
    };
}

export function createDefaultScanningOptions(): ScanningOptions {
    return {
        inputs: defaultScanningInputs(),
        preventMiddleMouse: {
            onTextHover: false,
            onWebPages: false,
            onPopupPages: false,
            onSearchPages: false,
            onSearchQuery: false,
        },
        preventBackForward: {
            onTextHover: false,
            onWebPages: false,
            onPopupPages: false,
            onSearchPages: false,
            onSearchQuery: false,
        },
        selectText: true,
        alphanumeric: true,
        autoHideResults: false,
        delay: 20,
        hideDelay: 0,
        length: 16,
        deepDomScan: false,
        popupNestingMaxDepth: 10,
        enablePopupSearch: false,
        enableOnPopupExpressions: false,
        enableOnSearchPage: true,
        enableSearchTags: false,
        layoutAwareScan: true,
        matchTypePrefix: false,
        hidePopupOnCursorExit: false,
        hidePopupOnCursorExitDelay: 0,
        reducedMotionScrolling: false,
        reducedMotionScrollingScale: 1,
        reducedMotionScrollingSwipeThreshold: 40,
        normalizeCssZoom: true,
        scanWithoutMousemove: true,
        scanResolution: 'character',
    };
}

export function createDefaultTranslationOptions(): TranslationOptions {
    return {
        searchResolution: 'letter',
        textReplacements: {
            searchOriginal: true,
            groups: [],
        },
    };
}

export function createDefaultParsingOptions(): ParsingOptions {
    return {
        enableScanningParser: true,
        enableMecabParser: false,
        selectedParser: null,
        termSpacing: true,
        readingMode: 'hiragana',
        useAllFrequencyDictionaries: false,
    };
}

export function createDefaultAnkiOptions(): AnkiOptions {
    return {
        enable: false,
        server: 'http://127.0.0.1:8765',
        tags: ['yomitan'],
        screenshot: {format: 'png', quality: 92},
        cardFormats: defaultCardFormats(),
        duplicateScope: 'collection',
        duplicateScopeCheckAllModels: false,
        checkForDuplicates: true,
        duplicateBehavior: 'new',
        fieldTemplates: null,
        suspendNewCards: false,
        displayTagsAndFlags: 'never',
        targetTags: [],
        noteGuiMode: 'browse',
        apiKey: '',
        downloadTimeout: 0,
        forceSync: false,
        noteDupeCheckFirst: false,
    };
}

export function createDefaultSentenceParsingOptions(): SentenceParsingOptions {
    return {
        scanExtent: 200,
        terminationCharacterMode: 'custom',
        terminationCharacters: defaultTerminationCharacters(),
    };
}

export function createDefaultInputsOptions(): InputsOptions {
    return {
        hotkeys: defaultHotkeys(),
    };
}

export function createDefaultClipboardOptions(): ClipboardOptions {
    return {
        enableBackgroundMonitor: false,
        enableSearchPageMonitor: false,
        autoSearchContent: true,
        maximumSearchLength: 1000,
    };
}

export function createDefaultAccessibilityOptions(): AccessibilityOptions {
    return {
        forceGoogleDocsHtmlRendering: false,
    };
}

export function createDefaultDictionaries(): DictionaryOptions[] {
    return [];
}

// ---------------------------------------------------------------------------
// Profile & Root
// ---------------------------------------------------------------------------

/** Creates a fresh `ProfileOptions` with all defaults applied. */
export function createDefaultProfileOptions(): ProfileOptions {
    return {
        general: createDefaultGeneralOptions(),
        popupWindow: createDefaultPopupWindowOptions(),
        audio: createDefaultAudioOptions(),
        scanning: createDefaultScanningOptions(),
        translation: createDefaultTranslationOptions(),
        dictionaries: createDefaultDictionaries(),
        parsing: createDefaultParsingOptions(),
        anki: createDefaultAnkiOptions(),
        sentenceParsing: createDefaultSentenceParsingOptions(),
        inputs: createDefaultInputsOptions(),
        clipboard: createDefaultClipboardOptions(),
        accessibility: createDefaultAccessibilityOptions(),
    };
}

/** Creates a named profile with default options. */
export function createDefaultProfile(name = 'Default'): Profile {
    return {
        name,
        conditionGroups: [],
        options: createDefaultProfileOptions(),
    };
}

/** Creates the root `Options` object with one default profile. */
export function createDefaultOptions(): Options {
    return {
        version: 0,
        profiles: [createDefaultProfile()],
        profileCurrent: 0,
        global: createDefaultGlobalOptions(),
    };
}

export function createDefaultGlobalOptions(): GlobalOptions {
    return {
        database: {prefixWildcardsSupported: false},
        dataTransmissionConsentShown: false,
    };
}
