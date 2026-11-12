/**
 * Chrome-compatible Yomitan settings descriptor tree.
 *
 * This is a pure-data description of every settings section, group and field
 * that Yomitan exposes. A host UI can iterate over it to render forms without
 * any knowledge of the underlying options shape. The tree mirrors the
 * Yomitan Chrome extension settings page section order.
 *
 * DOM-free: no React, no `document`, no extension runtime.
 */

import type {
    AnkiOptions,
    AudioSourceType,
    CardIcon,
    CardType,
    DefinitionsCollapsible,
    DisplayTagsAndFlags,
    DuplicateBehavior,
    DuplicateScope,
    FallbackSoundType,
    FrequencyDisplayMode,
    GlossaryLayoutMode,
    NoteGuiMode,
    OverwriteMode,
    PopupActionBarLocation,
    PopupActionBarVisibility,
    PopupCurrentIndicatorMode,
    PopupDisplayMode,
    PopupFullWidthPosition,
    PopupHorizontalTextPosition,
    PopupOuterTheme,
    PopupTheme,
    PopupVerticalTextPosition,
    ReadingMode,
    ResultOutputMode,
    ScanResolution,
    ScreenshotFormat,
    SortFrequencyDictionaryOrder,
    TermDisplayMode,
    TerminationCharacterMode,
    TranslationSearchResolution,
    WindowState,
    WindowType,
} from './types.js';

// ---------------------------------------------------------------------------
// Descriptor types
// ---------------------------------------------------------------------------

/** Discriminated union of field value types a UI renderer can switch on. */
export type SettingFieldType =
    | 'boolean'
    | 'string'
    | 'number'
    | 'integer'
    | 'select'
    | 'text'
    | 'password'
    | 'array'
    | 'section-header';

export type SelectOption = {
    value: string;
    label: string;
};

export type SettingFieldDescriptor = {
    /** Dot-path key into `ProfileOptions` (e.g. `"general.enable"`). */
    key: string;
    type: SettingFieldType;
    label: string;
    description?: string;
    default: unknown;
    /** For `select` fields. */
    options?: SelectOption[];
    /** For `number` / `integer` fields. */
    min?: number;
    max?: number;
    step?: number;
    /** For `string` / `text` fields — placeholder hint. */
    placeholder?: string;
    /** Whether this field requires a page reload to take effect. */
    requiresReload?: boolean;
};

export type SettingGroupDescriptor = {
    key: string;
    label: string;
    description?: string;
    fields: SettingFieldDescriptor[];
};

export type SettingSectionDescriptor = {
    key: string;
    label: string;
    description?: string;
    icon?: string;
    groups: SettingGroupDescriptor[];
};

// ---------------------------------------------------------------------------
// Helper builders
// ---------------------------------------------------------------------------

function bool(key: string, label: string, def: boolean, description?: string, requiresReload = false): SettingFieldDescriptor {
    return {key, type: 'boolean', label, default: def, description, requiresReload};
}

function str(key: string, label: string, def: string, description?: string, placeholder?: string): SettingFieldDescriptor {
    return {key, type: 'string', label, default: def, description, placeholder};
}

function int(key: string, label: string, def: number, min?: number, max?: number, description?: string): SettingFieldDescriptor {
    return {key, type: 'integer', label, default: def, min, max, description};
}

function num(key: string, label: string, def: number, min?: number, max?: number, step?: number, description?: string): SettingFieldDescriptor {
    return {key, type: 'number', label, default: def, min, max, step, description};
}

function select(key: string, label: string, def: string, options: SelectOption[], description?: string): SettingFieldDescriptor {
    return {key, type: 'select', label, default: def, options, description};
}

function textarea(key: string, label: string, def: string, description?: string, placeholder?: string): SettingFieldDescriptor {
    return {key, type: 'text', label, default: def, description, placeholder};
}

// ---------------------------------------------------------------------------
// Section descriptors
// ---------------------------------------------------------------------------

function generalSection(): SettingSectionDescriptor {
    return {
        key: 'general',
        label: 'General',
        description: 'Core Yomitan behaviour and language settings.',
        icon: 'settings',
        groups: [
            {
                key: 'general-enable',
                label: 'Enable',
                fields: [
                    bool('general.enable', 'Enable Yomitan', true, 'Master switch for all Yomitan functionality.'),
                ],
            },
            {
                key: 'general-language',
                label: 'Language',
                fields: [
                    str('general.language', 'Language', 'ja', 'BCP 47 language tag for dictionary lookups.'),
                ],
            },
            {
                key: 'general-guide',
                label: 'Welcome',
                fields: [
                    bool('general.showGuide', 'Show welcome guide', true, 'Display the onboarding guide on first launch.'),
                ],
            },
            {
                key: 'general-context-menu',
                label: 'Context menu',
                fields: [
                    bool('general.enableContextMenuScanSelected', 'Show Lookup in right-click menu', true),
                ],
            },
            {
                key: 'general-results',
                label: 'Results',
                fields: [
                    int('general.maxResults', 'Maximum number of results', 32, 1),
                ],
            },
            {
                key: 'general-api',
                label: 'Yomitan API',
                fields: [
                    bool('general.enableYomitanApi', 'Enable Yomitan API', false, 'Allow external applications to communicate with Yomitan.'),
                    str('general.yomitanApiServer', 'API server URL', 'http://127.0.0.1:19633', undefined, 'http://127.0.0.1:19633'),
                    bool('general.yomitanApiAllowCssSanitizationBypass', 'Allow bypassing CSS sanitization', false, 'Permits unsafe CSS in dictionary definitions.'),
                ],
            },
            {
                key: 'general-debug',
                label: 'Debug',
                fields: [
                    bool('general.debugInfo', 'Show debug information', false),
                    bool('general.showAdvanced', 'Show advanced settings', false),
                    bool('general.showDebug', 'Show debug settings', false),
                ],
            },
        ],
    };
}

function dictionariesSection(): SettingSectionDescriptor {
    return {
        key: 'dictionaries',
        label: 'Dictionaries',
        description: 'Install, enable and prioritise dictionaries.',
        icon: 'book',
        groups: [
            {
                key: 'dictionaries-info',
                label: 'Installed Dictionaries',
                description: 'Dictionary entries are managed at runtime. The settings tree exposes per-dictionary fields once a dictionary is installed.',
                fields: [
                    {
                        key: 'dictionaries',
                        type: 'array',
                        label: 'Dictionary list',
                        description: 'Array of DictionaryOptions objects. Import dictionary ZIP files to populate this list.',
                        default: [],
                    },
                ],
            },
            {
                key: 'dictionaries-per-entry',
                label: 'Per-dictionary options',
                description: 'These fields apply to each entry in the dictionaries array.',
                fields: [
                    str('dictionaries[].name', 'Name', ''),
                    str('dictionaries[].alias', 'Alias', ''),
                    bool('dictionaries[].enabled', 'Enabled', true),
                    bool('dictionaries[].allowSecondarySearches', 'Allow secondary searches', false),
                    select('dictionaries[].definitionsCollapsible', 'Definitions collapsible', 'not-collapsible', [
                        {value: 'not-collapsible', label: 'Not collapsible'},
                        {value: 'expanded', label: 'Expanded'},
                        {value: 'collapsed', label: 'Collapsed'},
                        {value: 'force-collapsed', label: 'Force collapsed'},
                        {value: 'force-expanded', label: 'Force expanded'},
                    ] as SelectOption[]),
                    bool('dictionaries[].partsOfSpeechFilter', 'Parts of speech filter', true),
                    bool('dictionaries[].useDeinflections', 'Use deinflections', true),
                ],
            },
            {
                key: 'dictionaries-main',
                label: 'Main Dictionary',
                fields: [
                    str('general.mainDictionary', 'Main dictionary name', '', 'Dictionary used for frequency sorting and result merging.'),
                ],
            },
        ],
    };
}

function scanningSection(): SettingSectionDescriptor {
    return {
        key: 'scanning',
        label: 'Scanning',
        description: 'Text scanning input behaviour, modifiers and delays.',
        icon: 'scan',
        groups: [
            {
                key: 'scanning-inputs',
                label: 'Scan Inputs',
                description: 'Each input defines a combination of modifier keys and pointer types.',
                fields: [
                    {
                        key: 'scanning.inputs',
                        type: 'array',
                        label: 'Scan input definitions',
                        description: 'Array of ScanningInput objects. Each defines include/exclude modifiers and pointer type flags.',
                        default: [],
                    },
                ],
            },
            {
                key: 'scanning-behaviour',
                label: 'Behaviour',
                fields: [
                    bool('scanning.selectText', 'Select text when scanning', true),
                    bool('scanning.alphanumeric', 'Scan alphanumeric characters', true),
                    bool('scanning.autoHideResults', 'Auto-hide results', false),
                    bool('scanning.deepDomScan', 'Deep DOM scan', false, 'Scan inside shadow DOM and iframe boundaries.'),
                    bool('scanning.layoutAwareScan', 'Layout-aware scan', true),
                    bool('scanning.matchTypePrefix', 'Match type prefix', false),
                    bool('scanning.scanWithoutMousemove', 'Scan without mousemove', true),
                    select('scanning.scanResolution', 'Scan resolution', 'character', [
                        {value: 'character', label: 'Character'},
                        {value: 'word', label: 'Word'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'scanning-delays',
                label: 'Delays',
                fields: [
                    num('scanning.delay', 'Scan delay (ms)', 20, 0),
                    num('scanning.hideDelay', 'Hide delay (ms)', 0, 0),
                    num('scanning.hidePopupOnCursorExitDelay', 'Hide popup on cursor exit delay (ms)', 0, 0),
                    bool('scanning.hidePopupOnCursorExit', 'Hide popup on cursor exit', false),
                ],
            },
            {
                key: 'scanning-length',
                label: 'Scan Length',
                fields: [
                    int('scanning.length', 'Scan length (characters)', 16, 1),
                    int('scanning.popupNestingMaxDepth', 'Popup nesting max depth', 10, 0),
                ],
            },
            {
                key: 'scanning-features',
                label: 'Features',
                fields: [
                    bool('scanning.enablePopupSearch', 'Enable popup search', false),
                    bool('scanning.enableOnPopupExpressions', 'Scan expressions in popup', false),
                    bool('scanning.enableOnSearchPage', 'Scan on search page', true),
                    bool('scanning.enableSearchTags', 'Enable search tags', false),
                    bool('scanning.normalizeCssZoom', 'Normalize CSS zoom', true),
                ],
            },
            {
                key: 'scanning-motion',
                label: 'Reduced Motion',
                fields: [
                    bool('scanning.reducedMotionScrolling', 'Reduced motion scrolling', false),
                    num('scanning.reducedMotionScrollingScale', 'Scrolling scale', 1, undefined, undefined, 0.1),
                    num('scanning.reducedMotionScrollingSwipeThreshold', 'Swipe threshold', 40, 0),
                ],
            },
            {
                key: 'scanning-prevent-middle-mouse',
                label: 'Prevent Middle Mouse',
                fields: [
                    bool('scanning.preventMiddleMouse.onTextHover', 'On text hover', false),
                    bool('scanning.preventMiddleMouse.onWebPages', 'On web pages', false),
                    bool('scanning.preventMiddleMouse.onPopupPages', 'On popup pages', false),
                    bool('scanning.preventMiddleMouse.onSearchPages', 'On search pages', false),
                    bool('scanning.preventMiddleMouse.onSearchQuery', 'On search query', false),
                ],
            },
            {
                key: 'scanning-prevent-back-forward',
                label: 'Prevent Back/Forward',
                fields: [
                    bool('scanning.preventBackForward.onTextHover', 'On text hover', false),
                    bool('scanning.preventBackForward.onWebPages', 'On web pages', false),
                    bool('scanning.preventBackForward.onPopupPages', 'On popup pages', false),
                    bool('scanning.preventBackForward.onSearchPages', 'On search pages', false),
                    bool('scanning.preventBackForward.onSearchQuery', 'On search query', false),
                ],
            },
        ],
    };
}

function popupBehaviorSection(): SettingSectionDescriptor {
    return {
        key: 'popup-behavior',
        label: 'Popup Behavior',
        description: 'How the popup appears and responds to interactions.',
        icon: 'panel',
        groups: [
            {
                key: 'popup-behavior-display',
                label: 'Display Mode',
                fields: [
                    select('general.popupDisplayMode', 'Display mode', 'default', [
                        {value: 'default', label: 'Default'},
                        {value: 'full-width', label: 'Full width'},
                    ] as SelectOption[]),
                    select('general.popupFullWidthPosition', 'Full-width position', 'bottom', [
                        {value: 'top', label: 'Top'},
                        {value: 'above-cursor', label: 'Above cursor'},
                        {value: 'bottom', label: 'Bottom'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'popup-behavior-window',
                label: 'Popup Window',
                fields: [
                    bool('general.usePopupWindow', 'Open results in a separate window', false),
                ],
            },
            {
                key: 'popup-behavior-indicator',
                label: 'Current Indicator',
                fields: [
                    select('general.popupCurrentIndicatorMode', 'Current indicator mode', 'triangle', [
                        {value: 'none', label: 'None'},
                        {value: 'asterisk', label: 'Asterisk'},
                        {value: 'triangle', label: 'Triangle'},
                        {value: 'bar-left', label: 'Bar (left)'},
                        {value: 'bar-right', label: 'Bar (right)'},
                        {value: 'dot-left', label: 'Dot (left)'},
                        {value: 'dot-right', label: 'Dot (right)'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'popup-behavior-action-bar',
                label: 'Action Bar',
                fields: [
                    select('general.popupActionBarVisibility', 'Action bar visibility', 'auto', [
                        {value: 'auto', label: 'Auto'},
                        {value: 'always', label: 'Always'},
                    ] as SelectOption[]),
                    select('general.popupActionBarLocation', 'Action bar location', 'top', [
                        {value: 'left', label: 'Left'},
                        {value: 'right', label: 'Right'},
                        {value: 'top', label: 'Top'},
                        {value: 'bottom', label: 'Bottom'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'popup-behavior-frame',
                label: 'Frame Security',
                fields: [
                    bool('general.showIframePopupsInRootFrame', 'Show iframe popups in root frame', true),
                    bool('general.useSecurePopupFrameUrl', 'Use secure popup frame URL', true),
                    bool('general.usePopupShadowDom', 'Use popup shadow DOM', true),
                ],
            },
        ],
    };
}

function popupAppearanceSection(): SettingSectionDescriptor {
    return {
        key: 'popup-appearance',
        label: 'Appearance',
        description: 'Visual appearance of the popup.',
        icon: 'palette',
        groups: [
            {
                key: 'popup-appearance-theme',
                label: 'Theme',
                fields: [
                    select('general.popupTheme', 'Popup theme', 'site', [
                        {value: 'light', label: 'Light'},
                        {value: 'dark', label: 'Dark'},
                        {value: 'browser', label: 'Browser'},
                        {value: 'site', label: 'Site'},
                    ] as SelectOption[]),
                    select('general.popupOuterTheme', 'Outer theme', 'site', [
                        {value: 'light', label: 'Light'},
                        {value: 'dark', label: 'Dark'},
                        {value: 'browser', label: 'Browser'},
                        {value: 'site', label: 'Site'},
                        {value: 'none', label: 'None'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'popup-appearance-font',
                label: 'Font',
                fields: [
                    str('general.fontFamily', 'Font family', '', undefined, 'e.g. Noto Sans JP'),
                    num('general.fontSize', 'Font size (px)', 14, undefined, undefined, 1),
                    str('general.lineHeight', 'Line height', '1.5'),
                ],
            },
            {
                key: 'popup-appearance-custom-css',
                label: 'Custom CSS',
                fields: [
                    textarea('general.customPopupCss', 'Custom popup CSS', '', 'CSS injected into the popup frame.'),
                    textarea('general.customPopupOuterCss', 'Custom outer CSS', '', 'CSS injected into the host page around the popup.'),
                ],
            },
            {
                key: 'popup-appearance-wanakana',
                label: 'Input',
                fields: [
                    bool('general.enableWanakana', 'Enable Wanakana (romaji → kana)', true),
                ],
            },
        ],
    };
}

function resultDisplaySection(): SettingSectionDescriptor {
    return {
        key: 'result-display',
        label: 'Result Display',
        description: 'How dictionary results are presented.',
        icon: 'list',
        groups: [
            {
                key: 'result-display-mode',
                label: 'Output Mode',
                fields: [
                    select('general.resultOutputMode', 'Result output mode', 'group', [
                        {value: 'group', label: 'Group'},
                        {value: 'merge', label: 'Merge'},
                        {value: 'split', label: 'Split'},
                        {value: 'term', label: 'Term'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'result-display-glossary',
                label: 'Glossary',
                fields: [
                    select('general.glossaryLayoutMode', 'Glossary layout', 'default', [
                        {value: 'default', label: 'Default'},
                        {value: 'compact', label: 'Compact'},
                        {value: 'compact-popup-anki', label: 'Compact (popup + Anki)'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'result-display-term',
                label: 'Term Display',
                fields: [
                    select('general.termDisplayMode', 'Term display mode', 'ruby', [
                        {value: 'ruby', label: 'Ruby furigana'},
                        {value: 'ruby-and-reading', label: 'Ruby + reading'},
                        {value: 'term-and-reading', label: 'Term + reading'},
                        {value: 'term-only', label: 'Term only'},
                    ] as SelectOption[]),
                    select('general.frequencyDisplayMode', 'Frequency display mode', 'split-tags-grouped', [
                        {value: 'tags', label: 'Tags'},
                        {value: 'tags-grouped', label: 'Tags (grouped)'},
                        {value: 'split-tags', label: 'Split tags'},
                        {value: 'split-tags-grouped', label: 'Split tags (grouped)'},
                        {value: 'inline-list', label: 'Inline list'},
                        {value: 'list', label: 'List'},
                        {value: 'list-bordered', label: 'List (bordered)'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'result-display-tags',
                label: 'Tags',
                fields: [
                    bool('general.compactTags', 'Compact tags', false),
                    bool('general.averageFrequency', 'Average frequency', false),
                ],
            },
            {
                key: 'result-display-pitch',
                label: 'Pitch Accent',
                fields: [
                    bool('general.showPitchAccentDownstepNotation', 'Show downstep notation', true),
                    bool('general.showPitchAccentPositionNotation', 'Show position notation', true),
                    bool('general.showPitchAccentGraph', 'Show pitch accent graph', false),
                ],
            },
            {
                key: 'result-display-sorting',
                label: 'Frequency Sorting',
                fields: [
                    str('general.sortFrequencyDictionary', 'Sort frequency dictionary', '', 'Dictionary name used for sorting.'),
                    select('general.sortFrequencyDictionaryOrder', 'Sort order', 'descending', [
                        {value: 'ascending', label: 'Ascending'},
                        {value: 'descending', label: 'Descending'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'result-display-search-header',
                label: 'Search Header',
                fields: [
                    bool('general.stickySearchHeader', 'Sticky search header', false),
                ],
            },
        ],
    };
}

function positionSizeSection(): SettingSectionDescriptor {
    return {
        key: 'position-size',
        label: 'Position & Size',
        description: 'Popup dimensions, offsets and scaling.',
        icon: 'resize',
        groups: [
            {
                key: 'position-size-dimensions',
                label: 'Dimensions',
                fields: [
                    num('general.popupWidth', 'Width (px)', 400, 0),
                    num('general.popupHeight', 'Height (px)', 250, 0),
                ],
            },
            {
                key: 'position-size-offsets',
                label: 'Offsets',
                fields: [
                    num('general.popupHorizontalOffset', 'Horizontal offset (px)', 0),
                    num('general.popupVerticalOffset', 'Vertical offset (px)', 10),
                    num('general.popupHorizontalOffset2', 'Horizontal offset 2 (px)', 10),
                    num('general.popupVerticalOffset2', 'Vertical offset 2 (px)', 0),
                    select('general.popupHorizontalTextPosition', 'Horizontal text position', 'below', [
                        {value: 'below', label: 'Below'},
                        {value: 'above', label: 'Above'},
                    ] as SelectOption[]),
                    select('general.popupVerticalTextPosition', 'Vertical text position', 'before', [
                        {value: 'default', label: 'Default'},
                        {value: 'before', label: 'Before'},
                        {value: 'after', label: 'After'},
                        {value: 'left', label: 'Left'},
                        {value: 'right', label: 'Right'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'position-size-scaling',
                label: 'Scaling',
                fields: [
                    num('general.popupScalingFactor', 'Scaling factor', 1, undefined, undefined, 0.1),
                    bool('general.popupScaleRelativeToPageZoom', 'Scale relative to page zoom', false),
                    bool('general.popupScaleRelativeToVisualViewport', 'Scale relative to visual viewport', true),
                ],
            },
        ],
    };
}

function searchWindowSection(): SettingSectionDescriptor {
    return {
        key: 'search-window',
        label: 'Search Window',
        description: 'Standalone search window dimensions and state.',
        icon: 'window',
        groups: [
            {
                key: 'search-window-size',
                label: 'Size',
                fields: [
                    int('popupWindow.width', 'Width (px)', 400, 0),
                    int('popupWindow.height', 'Height (px)', 250, 0),
                ],
            },
            {
                key: 'search-window-position',
                label: 'Position',
                fields: [
                    int('popupWindow.left', 'Left (px)', 0),
                    int('popupWindow.top', 'Top (px)', 0),
                    bool('popupWindow.useLeft', 'Use left', false),
                    bool('popupWindow.useTop', 'Use top', false),
                ],
            },
            {
                key: 'search-window-type',
                label: 'Window Type',
                fields: [
                    select('popupWindow.windowType', 'Window type', 'popup', [
                        {value: 'normal', label: 'Normal'},
                        {value: 'popup', label: 'Popup'},
                    ] as SelectOption[]),
                    select('popupWindow.windowState', 'Window state', 'normal', [
                        {value: 'normal', label: 'Normal'},
                        {value: 'maximized', label: 'Maximized'},
                        {value: 'fullscreen', label: 'Fullscreen'},
                    ] as SelectOption[]),
                ],
            },
        ],
    };
}

function audioSection(): SettingSectionDescriptor {
    return {
        key: 'audio',
        label: 'Audio',
        description: 'Audio playback for dictionary entries.',
        icon: 'volume',
        groups: [
            {
                key: 'audio-enable',
                label: 'Enable',
                fields: [
                    bool('audio.enabled', 'Enable audio', true),
                    bool('audio.autoPlay', 'Auto-play audio', false),
                    bool('audio.enableDefaultAudioSources', 'Enable default audio sources', true),
                ],
            },
            {
                key: 'audio-volume',
                label: 'Volume',
                fields: [
                    num('audio.volume', 'Volume (%)', 100, 0, 100, 1),
                ],
            },
            {
                key: 'audio-fallback',
                label: 'Fallback',
                fields: [
                    select('audio.fallbackSoundType', 'Fallback sound type', 'click', [
                        {value: 'none', label: 'None'},
                        {value: 'click', label: 'Click'},
                        {value: 'bloop', label: 'Bloop'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'audio-sources',
                label: 'Audio Sources',
                description: 'Array of AudioSource objects. Each defines type, url and voice.',
                fields: [
                    {
                        key: 'audio.sources',
                        type: 'array',
                        label: 'Audio source list',
                        description: 'Array of {type, url, voice} objects. Types: jpod101, language-pod-101, jisho, lingua-libre, wiktionary, text-to-speech, text-to-speech-reading, custom, custom-json.',
                        default: [],
                    },
                ],
            },
            {
                key: 'audio-source-types',
                label: 'Available source types',
                fields: [
                    select('audio.sources[0].type', 'Audio source type', 'jpod101', [
                        {value: 'jpod101', label: 'JapanesePod101'},
                        {value: 'language-pod-101', label: 'LanguagePod101'},
                        {value: 'jisho', label: 'Jisho'},
                        {value: 'lingua-libre', label: 'Lingua Libre'},
                        {value: 'wiktionary', label: 'Wiktionary'},
                        {value: 'text-to-speech', label: 'Text-to-Speech'},
                        {value: 'text-to-speech-reading', label: 'Text-to-Speech (Reading)'},
                        {value: 'custom', label: 'Custom URL'},
                        {value: 'custom-json', label: 'Custom JSON'},
                    ] as SelectOption[]),
                    str('audio.sources[0].url', 'Custom audio URL', '', undefined, 'https://...'),
                    str('audio.sources[0].voice', 'TTS voice', '', undefined, 'Voice name'),
                ],
            },
        ],
    };
}

function ankiSection(): SettingSectionDescriptor {
    return {
        key: 'anki',
        label: 'Anki',
        description: 'AnkiConnect integration for card creation.',
        icon: 'layers',
        groups: [
            {
                key: 'anki-enable',
                label: 'Enable',
                fields: [
                    bool('anki.enable', 'Enable Anki integration', false),
                    str('anki.server', 'AnkiConnect server URL', 'http://127.0.0.1:8765', undefined, 'http://127.0.0.1:8765'),
                    str('anki.apiKey', 'API key', '', undefined, 'Leave empty if no key is set'),
                ],
            },
            {
                key: 'anki-tags',
                label: 'Tags',
                fields: [
                    {
                        key: 'anki.tags',
                        type: 'array',
                        label: 'Tags to add to new cards',
                        description: 'Array of strings. Default: ["yomitan"].',
                        default: ['yomitan'],
                    },
                    {
                        key: 'anki.targetTags',
                        type: 'array',
                        label: 'Target tags (for filtering)',
                        description: 'Array of strings.',
                        default: [],
                    },
                ],
            },
            {
                key: 'anki-screenshot',
                label: 'Screenshot',
                fields: [
                    select('anki.screenshot.format', 'Screenshot format', 'png', [
                        {value: 'png', label: 'PNG'},
                        {value: 'jpeg', label: 'JPEG'},
                    ] as SelectOption[]),
                    int('anki.screenshot.quality', 'JPEG quality', 92, 0, 100),
                ],
            },
            {
                key: 'anki-duplicates',
                label: 'Duplicates',
                fields: [
                    bool('anki.checkForDuplicates', 'Check for duplicates', true),
                    bool('anki.noteDupeCheckFirst', 'Note duplicate check first', false),
                    select('anki.duplicateScope', 'Duplicate scope', 'collection', [
                        {value: 'collection', label: 'Collection'},
                        {value: 'deck', label: 'Deck'},
                        {value: 'deck-root', label: 'Deck root'},
                    ] as SelectOption[]),
                    bool('anki.duplicateScopeCheckAllModels', 'Check all models', false),
                    select('anki.duplicateBehavior', 'Duplicate behavior', 'new', [
                        {value: 'prevent', label: 'Prevent'},
                        {value: 'overwrite', label: 'Overwrite'},
                        {value: 'new', label: 'Allow new'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'anki-cards',
                label: 'Card Formats',
                description: 'Array of AnkiCardFormat objects defining deck, model and field mappings.',
                fields: [
                    {
                        key: 'anki.cardFormats',
                        type: 'array',
                        label: 'Card format list',
                        description: 'Array of {name, icon, deck, model, type, fields} objects.',
                        default: [],
                    },
                    select('anki.cardFormats[0].icon', 'Card icon', 'big-circle', [
                        {value: 'big-circle', label: 'Big circle'},
                        {value: 'small-circle', label: 'Small circle'},
                        {value: 'big-square', label: 'Big square'},
                        {value: 'big-diamond', label: 'Big diamond'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'anki-behaviour',
                label: 'Behaviour',
                fields: [
                    bool('anki.suspendNewCards', 'Suspend new cards', false),
                    bool('anki.forceSync', 'Force sync before adding', false),
                    select('anki.noteGuiMode', 'Note GUI mode', 'browse', [
                        {value: 'browse', label: 'Browse'},
                        {value: 'edit', label: 'Edit'},
                    ] as SelectOption[]),
                    select('anki.displayTagsAndFlags', 'Display tags and flags', 'never', [
                        {value: 'never', label: 'Never'},
                        {value: 'always', label: 'Always'},
                        {value: 'non-standard', label: 'Non-standard'},
                        {value: 'custom', label: 'Custom'},
                    ] as SelectOption[]),
                    num('anki.downloadTimeout', 'Download timeout (ms)', 0, 0),
                ],
            },
            {
                key: 'anki-field-templates',
                label: 'Field Templates',
                fields: [
                    textarea('anki.fieldTemplates', 'Handlebars field templates', '', 'Custom Handlebars templates for field content generation.'),
                ],
            },
        ],
    };
}

function inputsSection(): SettingSectionDescriptor {
    return {
        key: 'inputs',
        label: 'Keyboard Shortcuts',
        description: 'Keyboard hotkey bindings for popup and search page actions.',
        icon: 'keyboard',
        groups: [
            {
                key: 'inputs-hotkeys',
                label: 'Hotkeys',
                description: 'Array of Hotkey objects: {action, argument, key, modifiers[], scopes[], enabled}.',
                fields: [
                    {
                        key: 'inputs.hotkeys',
                        type: 'array',
                        label: 'Hotkey list',
                        description: 'Each hotkey defines action, argument, key, modifiers, scopes and enabled.',
                        default: [],
                    },
                ],
            },
        ],
    };
}

function translationSection(): SettingSectionDescriptor {
    return {
        key: 'translation',
        label: 'Translation',
        description: 'Text replacement and search resolution options.',
        icon: 'translate',
        groups: [
            {
                key: 'translation-resolution',
                label: 'Search Resolution',
                fields: [
                    select('translation.searchResolution', 'Search resolution', 'letter', [
                        {value: 'letter', label: 'Letter'},
                        {value: 'word', label: 'Word'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'translation-replacements',
                label: 'Text Replacements',
                fields: [
                    bool('translation.textReplacements.searchOriginal', 'Search original text', true),
                    {
                        key: 'translation.textReplacements.groups',
                        type: 'array',
                        label: 'Replacement groups',
                        description: 'Array of arrays of {pattern, ignoreCase, replacement} objects.',
                        default: [],
                    },
                ],
            },
        ],
    };
}

function parsingSection(): SettingSectionDescriptor {
    return {
        key: 'parsing',
        label: 'Parsing',
        description: 'Sentence parsing and reading display options.',
        icon: 'puzzle',
        groups: [
            {
                key: 'parsing-enable',
                label: 'Parsers',
                fields: [
                    bool('parsing.enableScanningParser', 'Enable scanning parser', true),
                    bool('parsing.enableMecabParser', 'Enable MeCab parser', false),
                    str('parsing.selectedParser', 'Selected parser', '', 'Parser ID or empty for auto.'),
                ],
            },
            {
                key: 'parsing-display',
                label: 'Display',
                fields: [
                    bool('parsing.termSpacing', 'Term spacing', true),
                    select('parsing.readingMode', 'Reading mode', 'hiragana', [
                        {value: 'hiragana', label: 'Hiragana'},
                        {value: 'katakana', label: 'Katakana'},
                        {value: 'romaji', label: 'Romaji'},
                        {value: 'dictionary-reading', label: 'Dictionary reading'},
                        {value: 'none', label: 'None'},
                    ] as SelectOption[]),
                ],
            },
        ],
    };
}

function sentenceParsingSection(): SettingSectionDescriptor {
    return {
        key: 'sentence-parsing',
        label: 'Sentence Parsing',
        description: 'Sentence scanning extent and termination characters.',
        icon: 'text',
        groups: [
            {
                key: 'sentence-parsing-extent',
                label: 'Scan Extent',
                fields: [
                    int('sentenceParsing.scanExtent', 'Scan extent (characters)', 200, 0),
                    select('sentenceParsing.terminationCharacterMode', 'Termination character mode', 'custom', [
                        {value: 'custom', label: 'Custom'},
                        {value: 'custom-no-newlines', label: 'Custom (no newlines)'},
                        {value: 'newlines', label: 'Newlines only'},
                        {value: 'none', label: 'None'},
                    ] as SelectOption[]),
                ],
            },
            {
                key: 'sentence-parsing-terminators',
                label: 'Termination Characters',
                description: 'Array of TerminationCharacter objects.',
                fields: [
                    {
                        key: 'sentenceParsing.terminationCharacters',
                        type: 'array',
                        label: 'Termination character list',
                        description: 'Each entry: {enabled, character1, character2, includeCharacterAtStart, includeCharacterAtEnd}.',
                        default: [],
                    },
                ],
            },
        ],
    };
}

function clipboardSection(): SettingSectionDescriptor {
    return {
        key: 'clipboard',
        label: 'Clipboard',
        description: 'Clipboard monitoring for auto-search.',
        icon: 'clipboard',
        groups: [
            {
                key: 'clipboard-enable',
                label: 'Enable',
                fields: [
                    bool('clipboard.enableBackgroundMonitor', 'Enable background monitor', false),
                    bool('clipboard.enableSearchPageMonitor', 'Enable search page monitor', false),
                    bool('clipboard.autoSearchContent', 'Auto-search clipboard content', true),
                ],
            },
            {
                key: 'clipboard-limits',
                label: 'Limits',
                fields: [
                    int('clipboard.maximumSearchLength', 'Maximum search length', 1000, 0),
                ],
            },
        ],
    };
}

function accessibilitySection(): SettingSectionDescriptor {
    return {
        key: 'accessibility',
        label: 'Accessibility',
        description: 'Accessibility-related rendering options.',
        icon: 'accessibility',
        groups: [
            {
                key: 'accessibility-rendering',
                label: 'Rendering',
                fields: [
                    bool('accessibility.forceGoogleDocsHtmlRendering', 'Force Google Docs HTML rendering', false),
                ],
            },
        ],
    };
}

function backupSection(): SettingSectionDescriptor {
    return {
        key: 'backup',
        label: 'Backup',
        description: 'Export and import settings as JSON.',
        icon: 'save',
        groups: [
            {
                key: 'backup-actions',
                label: 'Actions',
                description: 'Export/import is handled by the host application. The settings tree exposes these as action slots.',
                fields: [
                    {
                        key: '__backup.export',
                        type: 'section-header',
                        label: 'Export Settings',
                        description: 'Download all settings as a JSON file.',
                        default: null,
                    },
                    {
                        key: '__backup.import',
                        type: 'section-header',
                        label: 'Import Settings',
                        description: 'Upload a JSON file to replace all settings.',
                        default: null,
                    },
                ],
            },
        ],
    };
}

function debugSection(): SettingSectionDescriptor {
    return {
        key: 'debug',
        label: 'Debug',
        description: 'Developer and diagnostic options.',
        icon: 'bug',
        groups: [
            {
                key: 'debug-info',
                label: 'Debug Info',
                fields: [
                    bool('general.showDebug', 'Show debug settings', false),
                    bool('general.debugInfo', 'Show debug information', false),
                ],
            },
            {
                key: 'debug-global',
                label: 'Global',
                fields: [
                    bool('global.database.prefixWildcardsSupported', 'Prefix wildcards supported', false),
                    bool('global.dataTransmissionConsentShown', 'Data transmission consent shown', false),
                ],
            },
        ],
    };
}

// ---------------------------------------------------------------------------
// Exported tree
// ---------------------------------------------------------------------------

/**
 * Ordered settings sections matching the Yomitan Chrome extension layout.
 *
 * A host UI can iterate this array to render the full settings page:
 *
 * ```ts
 * for (const section of yomitanSettingsTree) {
 *   renderSection(section);
 *   for (const group of section.groups) {
 *     renderGroup(group);
 *     for (const field of group.fields) {
 *       renderField(field);  // switch on field.type
 *     }
 *   }
 * }
 * ```
 */
export const yomitanSettingsTree: readonly SettingSectionDescriptor[] = [
    generalSection(),
    dictionariesSection(),
    scanningSection(),
    popupBehaviorSection(),
    popupAppearanceSection(),
    resultDisplaySection(),
    positionSizeSection(),
    searchWindowSection(),
    audioSection(),
    ankiSection(),
    inputsSection(),
    translationSection(),
    parsingSection(),
    sentenceParsingSection(),
    clipboardSection(),
    accessibilitySection(),
    backupSection(),
    debugSection(),
] as const;

// ---------------------------------------------------------------------------
// Profile section (top-level, outside ProfileOptions)
// ---------------------------------------------------------------------------

/** Profile management section — not part of ProfileOptions, handled separately. */
export const profileSection: SettingSectionDescriptor = {
    key: 'profile',
    label: 'Profile',
    description: 'Active profile selection and profile management.',
    icon: 'user',
    groups: [
        {
            key: 'profile-current',
            label: 'Active Profile',
            fields: [
                {
                    key: 'profileCurrent',
                    type: 'integer',
                    label: 'Current profile index',
                    description: 'Zero-based index into the profiles array.',
                    default: 0,
                    min: 0,
                },
                {
                    key: '__profile.configure',
                    type: 'section-header',
                    label: 'Configure profiles…',
                    description: 'Open the profile management dialog.',
                    default: null,
                },
            ],
        },
        {
            key: 'profile-list',
            label: 'Profiles',
            fields: [
                {
                    key: 'profiles',
                    type: 'array',
                    label: 'Profile list',
                    description: 'Array of Profile objects: {name, conditionGroups[], options}.',
                    default: [],
                },
            ],
        },
    ],
};
