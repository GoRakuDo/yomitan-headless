/**
 * Pure validation for Yomitan options objects.
 *
 * Validates types, enums, numeric ranges and required fields without any DOM
 * or Chrome dependency. Returns a structured result rather than throwing so
 * callers can surface errors in their own UI.
 */

import type {
    AnkiOptions,
    AudioOptions,
    GeneralOptions,
    Options,
    ProfileOptions,
    ScanningOptions,
} from './types.js';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type ValidationIssue = {
    /** Dot-path to the offending field (e.g. `"general.maxResults"`). */
    path: string;
    message: string;
};

export type ValidationResult =
    | {valid: true}
    | {valid: false; issues: ValidationIssue[]};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok: ValidationResult = {valid: true};

function fail(path: string, message: string): ValidationIssue {
    return {path, message};
}

function invalid(valid: boolean, issues: ValidationIssue[]): ValidationResult {
    return valid ? ok : {valid: false, issues};
}

function checkBool(value: unknown, path: string, issues: ValidationIssue[]): boolean {
    if (typeof value !== 'boolean') {
        issues.push(fail(path, `Expected boolean, got ${typeof value}`));
        return false;
    }
    return true;
}

function checkString(value: unknown, path: string, issues: ValidationIssue[]): boolean {
    if (typeof value !== 'string') {
        issues.push(fail(path, `Expected string, got ${typeof value}`));
        return false;
    }
    return true;
}

function checkNumber(value: unknown, path: string, issues: ValidationIssue[], min?: number, max?: number): boolean {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push(fail(path, `Expected finite number, got ${typeof value}`));
        return false;
    }
    if (min !== undefined && value < min) {
        issues.push(fail(path, `Expected >= ${min}, got ${value}`));
        return false;
    }
    if (max !== undefined && value > max) {
        issues.push(fail(path, `Expected <= ${max}, got ${value}`));
        return false;
    }
    return true;
}

function checkInteger(value: unknown, path: string, issues: ValidationIssue[], min?: number, max?: number): boolean {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        issues.push(fail(path, `Expected integer, got ${typeof value}`));
        return false;
    }
    return checkNumber(value, path, issues, min, max);
}

function checkEnum<T extends string>(value: unknown, path: string, allowed: readonly T[], issues: ValidationIssue[]): boolean {
    if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
        issues.push(fail(path, `Expected one of [${allowed.join(', ')}], got ${JSON.stringify(value)}`));
        return false;
    }
    return true;
}

function checkArray(value: unknown, path: string, issues: ValidationIssue[]): boolean {
    if (!Array.isArray(value)) {
        issues.push(fail(path, `Expected array, got ${typeof value}`));
        return false;
    }
    return true;
}

// ---------------------------------------------------------------------------
// Enum constants
// ---------------------------------------------------------------------------

const RESULT_OUTPUT_MODES = ['group', 'merge', 'split', 'term'] as const;
const POPUP_DISPLAY_MODES = ['default', 'full-width'] as const;
const POPUP_FULL_WIDTH_POSITIONS = ['top', 'above-cursor', 'bottom'] as const;
const POPUP_H_TEXT_POSITIONS = ['below', 'above'] as const;
const POPUP_V_TEXT_POSITIONS = ['default', 'before', 'after', 'left', 'right'] as const;
const POPUP_THEMES = ['light', 'dark', 'browser', 'site'] as const;
const POPUP_OUTER_THEMES = ['light', 'dark', 'browser', 'site', 'none'] as const;
const POPUP_INDICATOR_MODES = ['none', 'asterisk', 'triangle', 'bar-left', 'bar-right', 'dot-left', 'dot-right'] as const;
const POPUP_ACTION_BAR_VISIBILITIES = ['auto', 'always'] as const;
const POPUP_ACTION_BAR_LOCATIONS = ['left', 'right', 'top', 'bottom'] as const;
const FREQUENCY_DISPLAY_MODES = ['tags', 'tags-grouped', 'split-tags', 'split-tags-grouped', 'inline-list', 'list', 'list-bordered'] as const;
const TERM_DISPLAY_MODES = ['ruby', 'ruby-and-reading', 'term-and-reading', 'term-only'] as const;
const SORT_FREQ_ORDERS = ['ascending', 'descending'] as const;
const GLOSSARY_LAYOUT_MODES = ['default', 'compact', 'compact-popup-anki'] as const;
const FALLBACK_SOUND_TYPES = ['none', 'click', 'bloop'] as const;
const SCAN_RESOLUTIONS = ['character', 'word'] as const;
const TRANSLATION_SEARCH_RESOLUTIONS = ['letter', 'word'] as const;
const READING_MODES = ['hiragana', 'katakana', 'romaji', 'dictionary-reading', 'none'] as const;
const SCREENSHOT_FORMATS = ['png', 'jpeg'] as const;
const CARD_ICONS = ['big-circle', 'small-circle', 'big-square', 'big-diamond'] as const;
const CARD_TYPES = ['term', 'kanji'] as const;
const DUPLICATE_SCOPES = ['collection', 'deck', 'deck-root'] as const;
const DUPLICATE_BEHAVIORS = ['prevent', 'overwrite', 'new'] as const;
const DISPLAY_TAGS_AND_FLAGS = ['never', 'always', 'non-standard', 'custom'] as const;
const NOTE_GUI_MODES = ['browse', 'edit'] as const;
const OVERWRITE_MODES = ['coalesce', 'coalesce-new', 'skip', 'append', 'prepend', 'overwrite'] as const;
const DEFINITIONS_COLLAPSIBLES = ['not-collapsible', 'expanded', 'collapsed', 'force-collapsed', 'force-expanded'] as const;
const TERMINATION_CHARACTER_MODES = ['custom', 'custom-no-newlines', 'newlines', 'none'] as const;
const WINDOW_TYPES = ['normal', 'popup'] as const;
const WINDOW_STATES = ['normal', 'maximized', 'fullscreen'] as const;

// ---------------------------------------------------------------------------
// Section validators
// ---------------------------------------------------------------------------

function validateGeneral(g: unknown, issues: ValidationIssue[]): void {
    if (typeof g !== 'object' || g === null) {
        issues.push(fail('general', 'Expected object'));
        return;
    }
    const o = g as GeneralOptions;
    checkBool(o.enable, 'general.enable', issues);
    checkString(o.language, 'general.language', issues);
    checkEnum(o.resultOutputMode, 'general.resultOutputMode', RESULT_OUTPUT_MODES, issues);
    checkBool(o.debugInfo, 'general.debugInfo', issues);
    checkInteger(o.maxResults, 'general.maxResults', issues, 1);
    checkBool(o.showAdvanced, 'general.showAdvanced', issues);
    checkBool(o.showDebug, 'general.showDebug', issues);
    checkEnum(o.popupDisplayMode, 'general.popupDisplayMode', POPUP_DISPLAY_MODES, issues);
    checkEnum(o.popupFullWidthPosition, 'general.popupFullWidthPosition', POPUP_FULL_WIDTH_POSITIONS, issues);
    checkNumber(o.popupWidth, 'general.popupWidth', issues, 0);
    checkNumber(o.popupHeight, 'general.popupHeight', issues, 0);
    checkNumber(o.popupHorizontalOffset, 'general.popupHorizontalOffset', issues);
    checkNumber(o.popupVerticalOffset, 'general.popupVerticalOffset', issues);
    checkNumber(o.popupHorizontalOffset2, 'general.popupHorizontalOffset2', issues);
    checkNumber(o.popupVerticalOffset2, 'general.popupVerticalOffset2', issues);
    checkEnum(o.popupHorizontalTextPosition, 'general.popupHorizontalTextPosition', POPUP_H_TEXT_POSITIONS, issues);
    checkEnum(o.popupVerticalTextPosition, 'general.popupVerticalTextPosition', POPUP_V_TEXT_POSITIONS, issues);
    checkNumber(o.popupScalingFactor, 'general.popupScalingFactor', issues);
    checkBool(o.popupScaleRelativeToPageZoom, 'general.popupScaleRelativeToPageZoom', issues);
    checkBool(o.popupScaleRelativeToVisualViewport, 'general.popupScaleRelativeToVisualViewport', issues);
    checkBool(o.showGuide, 'general.showGuide', issues);
    checkBool(o.enableContextMenuScanSelected, 'general.enableContextMenuScanSelected', issues);
    checkBool(o.compactTags, 'general.compactTags', issues);
    checkBool(o.averageFrequency, 'general.averageFrequency', issues);
    checkEnum(o.glossaryLayoutMode, 'general.glossaryLayoutMode', GLOSSARY_LAYOUT_MODES, issues);
    checkString(o.mainDictionary, 'general.mainDictionary', issues);
    checkEnum(o.popupTheme, 'general.popupTheme', POPUP_THEMES, issues);
    checkEnum(o.popupOuterTheme, 'general.popupOuterTheme', POPUP_OUTER_THEMES, issues);
    checkString(o.customPopupCss, 'general.customPopupCss', issues);
    checkString(o.customPopupOuterCss, 'general.customPopupOuterCss', issues);
    checkBool(o.enableWanakana, 'general.enableWanakana', issues);
    checkBool(o.showPitchAccentDownstepNotation, 'general.showPitchAccentDownstepNotation', issues);
    checkBool(o.showPitchAccentPositionNotation, 'general.showPitchAccentPositionNotation', issues);
    checkBool(o.showPitchAccentGraph, 'general.showPitchAccentGraph', issues);
    checkBool(o.showIframePopupsInRootFrame, 'general.showIframePopupsInRootFrame', issues);
    checkBool(o.useSecurePopupFrameUrl, 'general.useSecurePopupFrameUrl', issues);
    checkBool(o.usePopupShadowDom, 'general.usePopupShadowDom', issues);
    checkBool(o.usePopupWindow, 'general.usePopupWindow', issues);
    checkEnum(o.popupCurrentIndicatorMode, 'general.popupCurrentIndicatorMode', POPUP_INDICATOR_MODES, issues);
    checkEnum(o.popupActionBarVisibility, 'general.popupActionBarVisibility', POPUP_ACTION_BAR_VISIBILITIES, issues);
    checkEnum(o.popupActionBarLocation, 'general.popupActionBarLocation', POPUP_ACTION_BAR_LOCATIONS, issues);
    checkEnum(o.frequencyDisplayMode, 'general.frequencyDisplayMode', FREQUENCY_DISPLAY_MODES, issues);
    checkEnum(o.termDisplayMode, 'general.termDisplayMode', TERM_DISPLAY_MODES, issues);
    checkEnum(o.sortFrequencyDictionaryOrder, 'general.sortFrequencyDictionaryOrder', SORT_FREQ_ORDERS, issues);
    checkBool(o.stickySearchHeader, 'general.stickySearchHeader', issues);
    checkString(o.fontFamily, 'general.fontFamily', issues);
    checkNumber(o.fontSize, 'general.fontSize', issues);
    checkString(o.lineHeight, 'general.lineHeight', issues);
    checkBool(o.enableYomitanApi, 'general.enableYomitanApi', issues);
    checkString(o.yomitanApiServer, 'general.yomitanApiServer', issues);
    checkBool(o.yomitanApiAllowCssSanitizationBypass, 'general.yomitanApiAllowCssSanitizationBypass', issues);
}

function validateAudio(a: unknown, issues: ValidationIssue[]): void {
    if (typeof a !== 'object' || a === null) {
        issues.push(fail('audio', 'Expected object'));
        return;
    }
    const o = a as AudioOptions;
    checkBool(o.enabled, 'audio.enabled', issues);
    checkNumber(o.volume, 'audio.volume', issues, 0, 100);
    checkBool(o.autoPlay, 'audio.autoPlay', issues);
    checkEnum(o.fallbackSoundType, 'audio.fallbackSoundType', FALLBACK_SOUND_TYPES, issues);
    checkArray(o.sources, 'audio.sources', issues);
    checkBool(o.enableDefaultAudioSources, 'audio.enableDefaultAudioSources', issues);
}

function validateScanning(s: unknown, issues: ValidationIssue[]): void {
    if (typeof s !== 'object' || s === null) {
        issues.push(fail('scanning', 'Expected object'));
        return;
    }
    const o = s as ScanningOptions;
    checkArray(o.inputs, 'scanning.inputs', issues);
    checkBool(o.selectText, 'scanning.selectText', issues);
    checkBool(o.alphanumeric, 'scanning.alphanumeric', issues);
    checkBool(o.autoHideResults, 'scanning.autoHideResults', issues);
    checkNumber(o.delay, 'scanning.delay', issues, 0);
    checkNumber(o.hideDelay, 'scanning.hideDelay', issues, 0);
    checkInteger(o.length, 'scanning.length', issues, 1);
    checkBool(o.deepDomScan, 'scanning.deepDomScan', issues);
    checkInteger(o.popupNestingMaxDepth, 'scanning.popupNestingMaxDepth', issues, 0);
    checkBool(o.enablePopupSearch, 'scanning.enablePopupSearch', issues);
    checkBool(o.enableOnPopupExpressions, 'scanning.enableOnPopupExpressions', issues);
    checkBool(o.enableOnSearchPage, 'scanning.enableOnSearchPage', issues);
    checkBool(o.enableSearchTags, 'scanning.enableSearchTags', issues);
    checkBool(o.layoutAwareScan, 'scanning.layoutAwareScan', issues);
    checkBool(o.matchTypePrefix, 'scanning.matchTypePrefix', issues);
    checkBool(o.hidePopupOnCursorExit, 'scanning.hidePopupOnCursorExit', issues);
    checkNumber(o.hidePopupOnCursorExitDelay, 'scanning.hidePopupOnCursorExitDelay', issues, 0);
    checkBool(o.reducedMotionScrolling, 'scanning.reducedMotionScrolling', issues);
    checkNumber(o.reducedMotionScrollingScale, 'scanning.reducedMotionScrollingScale', issues);
    checkNumber(o.reducedMotionScrollingSwipeThreshold, 'scanning.reducedMotionScrollingSwipeThreshold', issues, 0);
    checkBool(o.normalizeCssZoom, 'scanning.normalizeCssZoom', issues);
    checkBool(o.scanWithoutMousemove, 'scanning.scanWithoutMousemove', issues);
    checkEnum(o.scanResolution, 'scanning.scanResolution', SCAN_RESOLUTIONS, issues);
}

function validateAnki(a: unknown, issues: ValidationIssue[]): void {
    if (typeof a !== 'object' || a === null) {
        issues.push(fail('anki', 'Expected object'));
        return;
    }
    const o = a as AnkiOptions;
    checkBool(o.enable, 'anki.enable', issues);
    checkString(o.server, 'anki.server', issues);
    checkArray(o.tags, 'anki.tags', issues);
    if (typeof o.screenshot === 'object' && o.screenshot !== null) {
        checkEnum(o.screenshot.format, 'anki.screenshot.format', SCREENSHOT_FORMATS, issues);
        checkInteger(o.screenshot.quality, 'anki.screenshot.quality', issues, 0, 100);
    }
    checkArray(o.cardFormats, 'anki.cardFormats', issues);
    checkEnum(o.duplicateScope, 'anki.duplicateScope', DUPLICATE_SCOPES, issues);
    checkBool(o.duplicateScopeCheckAllModels, 'anki.duplicateScopeCheckAllModels', issues);
    checkBool(o.checkForDuplicates, 'anki.checkForDuplicates', issues);
    checkEnum(o.duplicateBehavior, 'anki.duplicateBehavior', DUPLICATE_BEHAVIORS, issues);
    checkBool(o.suspendNewCards, 'anki.suspendNewCards', issues);
    checkEnum(o.displayTagsAndFlags, 'anki.displayTagsAndFlags', DISPLAY_TAGS_AND_FLAGS, issues);
    checkArray(o.targetTags, 'anki.targetTags', issues);
    checkEnum(o.noteGuiMode, 'anki.noteGuiMode', NOTE_GUI_MODES, issues);
    checkString(o.apiKey, 'anki.apiKey', issues);
    checkNumber(o.downloadTimeout, 'anki.downloadTimeout', issues, 0);
    checkBool(o.forceSync, 'anki.forceSync', issues);
    checkBool(o.noteDupeCheckFirst, 'anki.noteDupeCheckFirst', issues);
}

function validateProfileOptions(po: unknown, issues: ValidationIssue[]): void {
    if (typeof po !== 'object' || po === null) {
        issues.push(fail('options', 'Expected object'));
        return;
    }
    const o = po as ProfileOptions;
    validateGeneral(o.general, issues);
    validateAudio(o.audio, issues);
    validateScanning(o.scanning, issues);
    validateAnki(o.anki, issues);
    // translation
    if (typeof o.translation === 'object' && o.translation !== null) {
        checkEnum(o.translation.searchResolution, 'translation.searchResolution', TRANSLATION_SEARCH_RESOLUTIONS, issues);
        checkBool(o.translation.textReplacements.searchOriginal, 'translation.textReplacements.searchOriginal', issues);
        checkArray(o.translation.textReplacements.groups, 'translation.textReplacements.groups', issues);
    }
    // dictionaries
    checkArray(o.dictionaries, 'dictionaries', issues);
    if (Array.isArray(o.dictionaries)) {
        for (let i = 0; i < o.dictionaries.length; i++) {
            const d = o.dictionaries[i] as Record<string, unknown>;
            const p = `dictionaries[${i}]`;
            checkString(d.name, `${p}.name`, issues);
            checkString(d.alias, `${p}.alias`, issues);
            checkBool(d.enabled, `${p}.enabled`, issues);
            checkBool(d.allowSecondarySearches, `${p}.allowSecondarySearches`, issues);
            checkEnum(d.definitionsCollapsible, `${p}.definitionsCollapsible`, DEFINITIONS_COLLAPSIBLES, issues);
            checkBool(d.partsOfSpeechFilter, `${p}.partsOfSpeechFilter`, issues);
            checkBool(d.useDeinflections, `${p}.useDeinflections`, issues);
        }
    }
    // parsing
    if (typeof o.parsing === 'object' && o.parsing !== null) {
        checkBool(o.parsing.enableScanningParser, 'parsing.enableScanningParser', issues);
        checkBool(o.parsing.enableMecabParser, 'parsing.enableMecabParser', issues);
        checkBool(o.parsing.termSpacing, 'parsing.termSpacing', issues);
        checkEnum(o.parsing.readingMode, 'parsing.readingMode', READING_MODES, issues);
    }
    // sentenceParsing
    if (typeof o.sentenceParsing === 'object' && o.sentenceParsing !== null) {
        checkInteger(o.sentenceParsing.scanExtent, 'sentenceParsing.scanExtent', issues, 0);
        checkEnum(o.sentenceParsing.terminationCharacterMode, 'sentenceParsing.terminationCharacterMode', TERMINATION_CHARACTER_MODES, issues);
        checkArray(o.sentenceParsing.terminationCharacters, 'sentenceParsing.terminationCharacters', issues);
    }
    // inputs
    if (typeof o.inputs === 'object' && o.inputs !== null) {
        checkArray(o.inputs.hotkeys, 'inputs.hotkeys', issues);
    }
    // clipboard
    if (typeof o.clipboard === 'object' && o.clipboard !== null) {
        checkBool(o.clipboard.enableBackgroundMonitor, 'clipboard.enableBackgroundMonitor', issues);
        checkBool(o.clipboard.enableSearchPageMonitor, 'clipboard.enableSearchPageMonitor', issues);
        checkBool(o.clipboard.autoSearchContent, 'clipboard.autoSearchContent', issues);
        checkInteger(o.clipboard.maximumSearchLength, 'clipboard.maximumSearchLength', issues, 0);
    }
    // accessibility
    if (typeof o.accessibility === 'object' && o.accessibility !== null) {
        checkBool(o.accessibility.forceGoogleDocsHtmlRendering, 'accessibility.forceGoogleDocsHtmlRendering', issues);
    }
    // popupWindow
    if (typeof o.popupWindow === 'object' && o.popupWindow !== null) {
        checkInteger(o.popupWindow.width, 'popupWindow.width', issues, 0);
        checkInteger(o.popupWindow.height, 'popupWindow.height', issues, 0);
        checkInteger(o.popupWindow.left, 'popupWindow.left', issues);
        checkInteger(o.popupWindow.top, 'popupWindow.top', issues);
        checkBool(o.popupWindow.useLeft, 'popupWindow.useLeft', issues);
        checkBool(o.popupWindow.useTop, 'popupWindow.useTop', issues);
        checkEnum(o.popupWindow.windowType, 'popupWindow.windowType', WINDOW_TYPES, issues);
        checkEnum(o.popupWindow.windowState, 'popupWindow.windowState', WINDOW_STATES, issues);
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Validates a full `Options` root object. */
export function validateOptions(options: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (typeof options !== 'object' || options === null) {
        return {valid: false, issues: [fail('', 'Expected object')]};
    }
    const o = options as Options;
    checkInteger(o.version, 'version', issues, 0);
    checkArray(o.profiles, 'profiles', issues);
    if (Array.isArray(o.profiles) && o.profiles.length === 0) {
        issues.push(fail('profiles', 'At least one profile is required'));
    }
    checkInteger(o.profileCurrent, 'profileCurrent', issues, 0);
    if (typeof o.global === 'object' && o.global !== null) {
        if (typeof o.global.database === 'object' && o.global.database !== null) {
            checkBool(o.global.database.prefixWildcardsSupported, 'global.database.prefixWildcardsSupported', issues);
        }
        checkBool(o.global.dataTransmissionConsentShown, 'global.dataTransmissionConsentShown', issues);
    }
    if (Array.isArray(o.profiles)) {
        for (let i = 0; i < o.profiles.length; i++) {
            const p = o.profiles[i] as Record<string, unknown>;
            checkString(p.name, `profiles[${i}].name`, issues);
            validateProfileOptions(p.options, issues);
        }
    }
    return invalid(issues.length === 0, issues);
}

/** Validates a single `ProfileOptions` object. */
export function validateProfileOptionsObject(po: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];
    validateProfileOptions(po, issues);
    return invalid(issues.length === 0, issues);
}
