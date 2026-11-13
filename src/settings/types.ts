/**
 * Chrome-compatible Yomitan options types.
 *
 * These mirror `vendor/yomitan/ext/data/schemas/options-schema.json` exactly
 * (types, enums and constraints). They are DOM-free and Chrome-free so they
 * can be used in Node, Tauri, Deno or any other runtime.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type ResultOutputMode = 'group' | 'merge' | 'split' | 'term';
export type PopupDisplayMode = 'default' | 'full-width';
export type PopupFullWidthPosition = 'top' | 'above-cursor' | 'bottom';
export type PopupHorizontalTextPosition = 'below' | 'above';
export type PopupVerticalTextPosition = 'default' | 'before' | 'after' | 'left' | 'right';
export type PopupTheme = 'light' | 'dark' | 'browser' | 'site';
export type PopupOuterTheme = 'light' | 'dark' | 'browser' | 'site' | 'none';
export type PopupCurrentIndicatorMode = 'none' | 'asterisk' | 'triangle' | 'bar-left' | 'bar-right' | 'dot-left' | 'dot-right';
export type PopupActionBarVisibility = 'auto' | 'always';
export type PopupActionBarLocation = 'left' | 'right' | 'top' | 'bottom';
export type FrequencyDisplayMode = 'tags' | 'tags-grouped' | 'split-tags' | 'split-tags-grouped' | 'inline-list' | 'list' | 'list-bordered';
export type TermDisplayMode = 'ruby' | 'ruby-and-reading' | 'term-and-reading' | 'term-only';
export type SortFrequencyDictionaryOrder = 'ascending' | 'descending';
export type GlossaryLayoutMode = 'default' | 'compact' | 'compact-popup-anki';

export type AudioSourceType =
    | 'jpod101'
    | 'language-pod-101'
    | 'jisho'
    | 'lingua-libre'
    | 'wiktionary'
    | 'text-to-speech'
    | 'text-to-speech-reading'
    | 'custom'
    | 'custom-json';

export type FallbackSoundType = 'none' | 'click' | 'bloop';

export type ScanResolution = 'character' | 'word';
export type TranslationSearchResolution = 'letter' | 'word';
export type ReadingMode = 'hiragana' | 'katakana' | 'romaji' | 'dictionary-reading' | 'none';

export type ScreenshotFormat = 'png' | 'jpeg';
export type CardIcon = 'big-circle' | 'small-circle' | 'big-square' | 'big-diamond';
export type CardType = 'term' | 'kanji';
export type DuplicateScope = 'collection' | 'deck' | 'deck-root';
export type DuplicateBehavior = 'prevent' | 'overwrite' | 'new';
export type DisplayTagsAndFlags = 'never' | 'always' | 'non-standard' | 'custom';
export type NoteGuiMode = 'browse' | 'edit';
export type OverwriteMode = 'coalesce' | 'coalesce-new' | 'skip' | 'append' | 'prepend' | 'overwrite';

export type DefinitionsCollapsible = 'not-collapsible' | 'expanded' | 'collapsed' | 'force-collapsed' | 'force-expanded';
export type TerminationCharacterMode = 'custom' | 'custom-no-newlines' | 'newlines' | 'none';

export type WindowType = 'normal' | 'popup';
export type WindowState = 'normal' | 'maximized' | 'fullscreen';

export type HotkeyModifier = 'alt' | 'ctrl' | 'shift' | 'meta';
export type HotkeyScope = 'popup' | 'search' | 'web';

// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------

export type GeneralOptions = {
    enable: boolean;
    language: string;
    resultOutputMode: ResultOutputMode;
    debugInfo: boolean;
    maxResults: number;
    showAdvanced: boolean;
    showDebug: boolean;
    popupDisplayMode: PopupDisplayMode;
    popupFullWidthPosition: PopupFullWidthPosition;
    popupWidth: number;
    popupHeight: number;
    popupHorizontalOffset: number;
    popupVerticalOffset: number;
    popupHorizontalOffset2: number;
    popupVerticalOffset2: number;
    popupHorizontalTextPosition: PopupHorizontalTextPosition;
    popupVerticalTextPosition: PopupVerticalTextPosition;
    popupScalingFactor: number;
    popupScaleRelativeToPageZoom: boolean;
    popupScaleRelativeToVisualViewport: boolean;
    showGuide: boolean;
    enableContextMenuScanSelected: boolean;
    compactTags: boolean;
    averageFrequency: boolean;
    glossaryLayoutMode: GlossaryLayoutMode;
    mainDictionary: string;
    popupTheme: PopupTheme;
    popupOuterTheme: PopupOuterTheme;
    customPopupCss: string;
    customPopupOuterCss: string;
    enableWanakana: boolean;
    showPitchAccentDownstepNotation: boolean;
    showPitchAccentPositionNotation: boolean;
    showPitchAccentGraph: boolean;
    showIframePopupsInRootFrame: boolean;
    useSecurePopupFrameUrl: boolean;
    usePopupShadowDom: boolean;
    usePopupWindow: boolean;
    popupCurrentIndicatorMode: PopupCurrentIndicatorMode;
    popupActionBarVisibility: PopupActionBarVisibility;
    popupActionBarLocation: PopupActionBarLocation;
    frequencyDisplayMode: FrequencyDisplayMode;
    termDisplayMode: TermDisplayMode;
    sortFrequencyDictionary: string | null;
    sortFrequencyDictionaryOrder: SortFrequencyDictionaryOrder;
    stickySearchHeader: boolean;
    fontFamily: string;
    fontSize: number;
    lineHeight: string;
    enableYomitanApi: boolean;
    yomitanApiServer: string;
    yomitanApiAllowCssSanitizationBypass: boolean;
};

// ---------------------------------------------------------------------------
// Popup Window
// ---------------------------------------------------------------------------

export type PopupWindowOptions = {
    width: number;
    height: number;
    left: number;
    top: number;
    useLeft: boolean;
    useTop: boolean;
    windowType: WindowType;
    windowState: WindowState;
};

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

export type AudioSource = {
    type: AudioSourceType;
    url: string;
    voice: string;
};

export type AudioOptions = {
    enabled: boolean;
    volume: number;
    autoPlay: boolean;
    fallbackSoundType: FallbackSoundType;
    sources: AudioSource[];
    enableDefaultAudioSources: boolean;
};

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

export type ScanningInputTypes = {
    mouse: boolean;
    touch: boolean;
    pen: boolean;
};

export type ScanningInputOptions = {
    showAdvanced: boolean;
    searchTerms: boolean;
    searchKanji: boolean;
    scanOnTouchTap: boolean;
    scanOnTouchMove: boolean;
    scanOnTouchPress: boolean;
    scanOnTouchRelease: boolean;
    scanOnPenMove: boolean;
    scanOnPenHover: boolean;
    scanOnPenReleaseHover: boolean;
    scanOnPenPress: boolean;
    scanOnPenRelease: boolean;
    preventTouchScrolling: boolean;
    preventPenScrolling: boolean;
    minimumTouchTime: number;
};

export type ScanningInput = {
    include: string;
    exclude: string;
    types: ScanningInputTypes;
    options: ScanningInputOptions;
};

export type PreventMouseButtons = {
    onTextHover: boolean;
    onWebPages: boolean;
    onPopupPages: boolean;
    onSearchPages: boolean;
    onSearchQuery: boolean;
};

export type ScanningOptions = {
    inputs: ScanningInput[];
    preventMiddleMouse: PreventMouseButtons;
    preventBackForward: PreventMouseButtons;
    selectText: boolean;
    alphanumeric: boolean;
    autoHideResults: boolean;
    delay: number;
    hideDelay: number;
    length: number;
    deepDomScan: boolean;
    popupNestingMaxDepth: number;
    enablePopupSearch: boolean;
    enableOnPopupExpressions: boolean;
    enableOnSearchPage: boolean;
    enableSearchTags: boolean;
    layoutAwareScan: boolean;
    matchTypePrefix: boolean;
    hidePopupOnCursorExit: boolean;
    hidePopupOnCursorExitDelay: number;
    reducedMotionScrolling: boolean;
    reducedMotionScrollingScale: number;
    reducedMotionScrollingSwipeThreshold: number;
    normalizeCssZoom: boolean;
    scanWithoutMousemove: boolean;
    scanResolution: ScanResolution;
};

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

export type TextReplacement = {
    pattern: string;
    ignoreCase: boolean;
    replacement: string;
};

export type TranslationOptions = {
    searchResolution: TranslationSearchResolution;
    textReplacements: {
        searchOriginal: boolean;
        groups: TextReplacement[][];
    };
};

// ---------------------------------------------------------------------------
// Dictionaries
// ---------------------------------------------------------------------------

export type DictionaryOptions = {
    name: string;
    alias: string;
    enabled: boolean;
    allowSecondarySearches: boolean;
    definitionsCollapsible: DefinitionsCollapsible;
    partsOfSpeechFilter: boolean;
    useDeinflections: boolean;
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export type ParsingOptions = {
    enableScanningParser: boolean;
    enableMecabParser: boolean;
    selectedParser: string | null;
    termSpacing: boolean;
    readingMode: ReadingMode;
    /** Forces frequency/pitch/ipa metadata even in `simple` FindTermsMode. */
    useAllFrequencyDictionaries: boolean;
};

// ---------------------------------------------------------------------------
// Anki
// ---------------------------------------------------------------------------

export type AnkiScreenshotOptions = {
    format: ScreenshotFormat;
    quality: number;
};

export type AnkiCardField = {
    value: string;
    overwriteMode: OverwriteMode;
};

export type AnkiCardFormat = {
    name: string;
    icon: CardIcon;
    deck: string;
    model: string;
    type: CardType;
    fields: {[fieldName: string]: AnkiCardField};
};

export type AnkiOptions = {
    enable: boolean;
    server: string;
    tags: string[];
    screenshot: AnkiScreenshotOptions;
    cardFormats: AnkiCardFormat[];
    duplicateScope: DuplicateScope;
    duplicateScopeCheckAllModels: boolean;
    checkForDuplicates: boolean;
    duplicateBehavior: DuplicateBehavior;
    fieldTemplates: string | null;
    suspendNewCards: boolean;
    displayTagsAndFlags: DisplayTagsAndFlags;
    targetTags: string[];
    noteGuiMode: NoteGuiMode;
    apiKey: string;
    downloadTimeout: number;
    forceSync: boolean;
    noteDupeCheckFirst: boolean;
};

// ---------------------------------------------------------------------------
// Sentence Parsing
// ---------------------------------------------------------------------------

export type TerminationCharacter = {
    enabled: boolean;
    character1: string;
    character2: string | null;
    includeCharacterAtStart: boolean;
    includeCharacterAtEnd: boolean;
};

export type SentenceParsingOptions = {
    scanExtent: number;
    terminationCharacterMode: TerminationCharacterMode;
    terminationCharacters: TerminationCharacter[];
};

// ---------------------------------------------------------------------------
// Inputs / Hotkeys
// ---------------------------------------------------------------------------

export type HotkeyAction = string;

export type Hotkey = {
    action: HotkeyAction;
    argument: string;
    key: string | null;
    modifiers: HotkeyModifier[];
    scopes: HotkeyScope[];
    enabled: boolean;
};

export type InputsOptions = {
    hotkeys: Hotkey[];
};

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

export type ClipboardOptions = {
    enableBackgroundMonitor: boolean;
    enableSearchPageMonitor: boolean;
    autoSearchContent: boolean;
    maximumSearchLength: number;
};

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

export type AccessibilityOptions = {
    forceGoogleDocsHtmlRendering: boolean;
};

// ---------------------------------------------------------------------------
// Profile & Root
// ---------------------------------------------------------------------------

/** Per-profile settings. Every profile carries its own independent copy. */
export type ProfileOptions = {
    general: GeneralOptions;
    popupWindow: PopupWindowOptions;
    audio: AudioOptions;
    scanning: ScanningOptions;
    translation: TranslationOptions;
    dictionaries: DictionaryOptions[];
    parsing: ParsingOptions;
    anki: AnkiOptions;
    sentenceParsing: SentenceParsingOptions;
    inputs: InputsOptions;
    clipboard: ClipboardOptions;
    accessibility: AccessibilityOptions;
};

export type ProfileCondition = {
    type: string;
    operator: string;
    value: unknown;
};

export type ProfileConditionGroup = {
    conditions: ProfileCondition[];
};

export type Profile = {
    name: string;
    conditionGroups: ProfileConditionGroup[];
    options: ProfileOptions;
};

export type GlobalOptions = {
    database: {
        prefixWildcardsSupported: boolean;
    };
    dataTransmissionConsentShown: boolean;
};

/** Root options object (Chrome `chrome.storage.local.options`). */
export type Options = {
    version: number;
    profiles: Profile[];
    profileCurrent: number;
    global: GlobalOptions;
};
