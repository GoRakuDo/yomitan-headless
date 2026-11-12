/**
 * @gorakudo/yomitan-headless/settings
 *
 * Chrome-compatible Yomitan settings system: types, defaults, descriptor tree,
 * validation and a settings store — all DOM-free and Chrome-free.
 *
 * Host applications (Entei, Tauri apps, etc.) can use this to render a full
 * Yomitan settings UI without any knowledge of the underlying options shape.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type {
    AccessibilityOptions,
    AnkiCardField,
    AnkiCardFormat,
    AnkiOptions,
    AnkiScreenshotOptions,
    AudioSource,
    AudioSourceType,
    AudioOptions,
    CardIcon,
    CardType,
    ClipboardOptions,
    DefinitionsCollapsible,
    DisplayTagsAndFlags,
    DictionaryOptions,
    DuplicateBehavior,
    DuplicateScope,
    FallbackSoundType,
    FrequencyDisplayMode,
    GeneralOptions,
    GlobalOptions,
    GlossaryLayoutMode,
    Hotkey,
    HotkeyAction,
    HotkeyModifier,
    HotkeyScope,
    InputsOptions,
    NoteGuiMode,
    Options,
    OverwriteMode,
    ParsingOptions,
    PopupActionBarLocation,
    PopupActionBarVisibility,
    PopupCurrentIndicatorMode,
    PopupDisplayMode,
    PopupFullWidthPosition,
    PopupHorizontalTextPosition,
    PopupOuterTheme,
    PopupTheme,
    PopupVerticalTextPosition,
    PopupWindowOptions,
    Profile,
    ProfileCondition,
    ProfileConditionGroup,
    ProfileOptions,
    ReadingMode,
    ResultOutputMode,
    ScanResolution,
    ScanningInput,
    ScanningInputOptions,
    ScanningInputTypes,
    ScanningOptions,
    ScreenshotFormat,
    SentenceParsingOptions,
    SortFrequencyDictionaryOrder,
    TermDisplayMode,
    TerminationCharacter,
    TerminationCharacterMode,
    TextReplacement,
    TranslationOptions,
    TranslationSearchResolution,
    WindowState,
    WindowType,
} from './types.js';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
export {
    createDefaultAccessibilityOptions,
    createDefaultAnkiOptions,
    createDefaultAudioOptions,
    createDefaultClipboardOptions,
    createDefaultDictionaries,
    createDefaultGeneralOptions,
    createDefaultGlobalOptions,
    createDefaultInputsOptions,
    createDefaultOptions,
    createDefaultParsingOptions,
    createDefaultPopupWindowOptions,
    createDefaultProfile,
    createDefaultProfileOptions,
    createDefaultScanningOptions,
    createDefaultSentenceParsingOptions,
    createDefaultTranslationOptions,
} from './defaults.js';

// ---------------------------------------------------------------------------
// Settings tree
// ---------------------------------------------------------------------------
export type {
    SelectOption,
    SettingFieldDescriptor,
    SettingFieldType,
    SettingGroupDescriptor,
    SettingSectionDescriptor,
} from './tree.js';
export {profileSection, yomitanSettingsTree} from './tree.js';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export type {ValidationIssue, ValidationResult} from './validation.js';
export {validateOptions, validateProfileOptionsObject} from './validation.js';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export type {SettingsStore} from './store.js';
export {createInMemorySettingsStore, InMemorySettingsStore} from './store.js';

// ---------------------------------------------------------------------------
// Top-level convenience class
// ---------------------------------------------------------------------------

import {createDefaultOptions, createDefaultProfileOptions} from './defaults.js';
import {yomitanSettingsTree, profileSection} from './tree.js';
import type {SettingSectionDescriptor} from './tree.js';
import type {Options, ProfileOptions} from './types.js';
import {createInMemorySettingsStore, InMemorySettingsStore} from './store.js';
import type {SettingsStore} from './store.js';
import {validateOptions} from './validation.js';
import type {ValidationResult} from './validation.js';

/**
 * Top-level settings facade — the recommended entry point for host apps.
 *
 * ```ts
 * import {YomitanSettings} from '@gorakudo/yomitan-headless/settings';
 *
 * const settings = new YomitanSettings();
 * settings.sections         // → readonly SettingSectionDescriptor[]
 * settings.getDefaultOptions() // → ProfileOptions
 * settings.createStore()    // → InMemorySettingsStore
 * ```
 */
export class YomitanSettings {
    /** Ordered settings sections (same as `yomitanSettingsTree`). */
    readonly sections: readonly SettingSectionDescriptor[];

    /** Profile management section (outside ProfileOptions). */
    readonly profileSection: SettingSectionDescriptor;

    constructor() {
        this.sections = yomitanSettingsTree;
        this.profileSection = profileSection;
    }

    /** Creates a fresh ProfileOptions with all defaults. */
    getDefaultOptions(): ProfileOptions {
        return createDefaultProfileOptions();
    }

    /** Creates a full root Options object with one default profile. */
    getDefaultRootOptions(): Options {
        return createDefaultOptions();
    }

    /** Creates a new in-memory store backed by a deep clone of the given options. */
    createStore(initial?: Options): InMemorySettingsStore {
        return createInMemorySettingsStore(initial);
    }

    /** Validates any object against the full Options schema. */
    validate(options: unknown): ValidationResult {
        return validateOptions(options);
    }
}
