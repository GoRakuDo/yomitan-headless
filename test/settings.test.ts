import {describe, expect, it} from 'vitest';
import {
    YomitanSettings,
    createDefaultOptions,
    createDefaultProfileOptions,
    createInMemorySettingsStore,
    profileSection,
    validateOptions,
    validateProfileOptionsObject,
    yomitanSettingsTree,
} from '../src/settings/index.js';
import type {
    AnkiOptions,
    GeneralOptions,
    Options,
    ProfileOptions,
} from '../src/settings/index.js';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe('createDefaultProfileOptions', () => {
    it('returns a fully populated ProfileOptions object', () => {
        const opts = createDefaultProfileOptions();
        expect(opts.general.enable).toBe(true);
        expect(opts.general.language).toBe('ja');
        expect(opts.general.maxResults).toBe(32);
        expect(opts.audio.enabled).toBe(true);
        expect(opts.audio.volume).toBe(100);
        expect(opts.scanning.delay).toBe(20);
        expect(opts.scanning.length).toBe(16);
        expect(opts.anki.enable).toBe(false);
        expect(opts.anki.server).toBe('http://127.0.0.1:8765');
        expect(opts.anki.tags).toEqual(['yomitan']);
        expect(opts.parsing.readingMode).toBe('hiragana');
        expect(opts.clipboard.maximumSearchLength).toBe(1000);
    });

    it('returns non-empty hotkey and scanning-input arrays', () => {
        const opts = createDefaultProfileOptions();
        expect(opts.inputs.hotkeys.length).toBeGreaterThan(0);
        expect(opts.scanning.inputs.length).toBe(2);
    });

    it('returns non-empty termination characters', () => {
        const opts = createDefaultProfileOptions();
        expect(opts.sentenceParsing.terminationCharacters.length).toBeGreaterThan(0);
    });

    it('returns three default Anki card formats', () => {
        const opts = createDefaultProfileOptions();
        expect(opts.anki.cardFormats).toHaveLength(3);
        expect(opts.anki.cardFormats[0]?.name).toBe('Expression');
        expect(opts.anki.cardFormats[1]?.name).toBe('Reading');
        expect(opts.anki.cardFormats[2]?.name).toBe('Kanji');
    });
});

describe('createDefaultOptions', () => {
    it('returns an Options object with one default profile', () => {
        const opts = createDefaultOptions();
        expect(opts.profiles).toHaveLength(1);
        expect(opts.profiles[0]?.name).toBe('Default');
        expect(opts.profileCurrent).toBe(0);
        expect(opts.version).toBe(0);
        expect(opts.global.database.prefixWildcardsSupported).toBe(false);
    });

    it('passes its own validation', () => {
        expect(validateOptions(createDefaultOptions()).valid).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Settings tree
// ---------------------------------------------------------------------------

describe('yomitanSettingsTree', () => {
    it('contains all expected sections in order', () => {
        const keys = yomitanSettingsTree.map((s) => s.key);
        expect(keys).toEqual([
            'general',
            'dictionaries',
            'scanning',
            'popup-behavior',
            'popup-appearance',
            'result-display',
            'position-size',
            'search-window',
            'audio',
            'anki',
            'inputs',
            'translation',
            'parsing',
            'sentence-parsing',
            'clipboard',
            'accessibility',
            'backup',
            'debug',
        ]);
    });

    it('every section has at least one group with at least one field', () => {
        for (const section of yomitanSettingsTree) {
            expect(section.groups.length, `Section ${section.key} has no groups`).toBeGreaterThan(0);
            for (const group of section.groups) {
                expect(group.fields.length, `Group ${section.key}/${group.key} has no fields`).toBeGreaterThan(0);
            }
        }
    });

    it('every field has a non-empty label and a default value key', () => {
        for (const section of yomitanSettingsTree) {
            for (const group of section.groups) {
                for (const field of group.fields) {
                    expect(field.label.length, `Field ${field.key} has empty label`).toBeGreaterThan(0);
                    expect(field.key.length, `Field has empty key in ${section.key}/${group.key}`).toBeGreaterThan(0);
                }
            }
        }
    });

    it('general section covers all user-required fields', () => {
        const general = yomitanSettingsTree.find((s) => s.key === 'general');
        expect(general).toBeDefined();
        const allKeys = general!.groups.flatMap((g) => g.fields.map((f) => f.key));
        expect(allKeys).toContain('general.enable');
        expect(allKeys).toContain('general.language');
        expect(allKeys).toContain('general.showGuide');
        expect(allKeys).toContain('general.enableContextMenuScanSelected');
        expect(allKeys).toContain('general.maxResults');
        expect(allKeys).toContain('general.enableYomitanApi');
        expect(allKeys).toContain('general.yomitanApiAllowCssSanitizationBypass');
    });

    it('audio section includes sources array and volume', () => {
        const audio = yomitanSettingsTree.find((s) => s.key === 'audio');
        expect(audio).toBeDefined();
        const allKeys = audio!.groups.flatMap((g) => g.fields.map((f) => f.key));
        expect(allKeys).toContain('audio.enabled');
        expect(allKeys).toContain('audio.volume');
        expect(allKeys).toContain('audio.sources');
        expect(allKeys).toContain('audio.autoPlay');
    });

    it('anki section includes enable, server, deck and field mapping entries', () => {
        const anki = yomitanSettingsTree.find((s) => s.key === 'anki');
        expect(anki).toBeDefined();
        const allKeys = anki!.groups.flatMap((g) => g.fields.map((f) => f.key));
        expect(allKeys).toContain('anki.enable');
        expect(allKeys).toContain('anki.server');
        expect(allKeys).toContain('anki.cardFormats');
    });
});

describe('profileSection', () => {
    it('exposes profileCurrent and profiles fields', () => {
        const allKeys = profileSection.groups.flatMap((g) => g.fields.map((f) => f.key));
        expect(allKeys).toContain('profileCurrent');
        expect(allKeys).toContain('profiles');
    });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('validateOptions', () => {
    it('accepts a valid default options object', () => {
        const result = validateOptions(createDefaultOptions());
        expect(result.valid).toBe(true);
    });

    it('rejects a non-object', () => {
        const result = validateOptions('not an object');
        expect(result.valid).toBe(false);
    });

    it('rejects empty profiles array', () => {
        const opts = createDefaultOptions();
        opts.profiles = [];
        const result = validateOptions(opts);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.issues.some((i) => i.path === 'profiles')).toBe(true);
        }
    });

    it('rejects invalid maxResults', () => {
        const opts = createDefaultOptions();
        (opts.profiles[0]!.options.general as GeneralOptions).maxResults = 0;
        const result = validateOptions(opts);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.issues.some((i) => i.path === 'general.maxResults')).toBe(true);
        }
    });

    it('rejects invalid enum value for resultOutputMode', () => {
        const opts = createDefaultOptions();
        (opts.profiles[0]!.options.general as GeneralOptions).resultOutputMode = 'invalid' as never;
        const result = validateOptions(opts);
        expect(result.valid).toBe(false);
    });

    it('rejects out-of-range audio volume', () => {
        const opts = createDefaultOptions();
        opts.profiles[0]!.options.audio.volume = 150;
        const result = validateOptions(opts);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.issues.some((i) => i.path === 'audio.volume')).toBe(true);
        }
    });

    it('rejects invalid anki server URL type', () => {
        const opts = createDefaultOptions();
        (opts.profiles[0]!.options.anki as unknown as Record<string, unknown>).server = 123;
        const result = validateOptions(opts);
        expect(result.valid).toBe(false);
    });
});

describe('validateProfileOptionsObject', () => {
    it('accepts valid defaults', () => {
        expect(validateProfileOptionsObject(createDefaultProfileOptions()).valid).toBe(true);
    });

    it('rejects a non-object', () => {
        expect(validateProfileOptionsObject(null).valid).toBe(false);
        expect(validateProfileOptionsObject('string').valid).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

describe('InMemorySettingsStore', () => {
    it('starts with default options', () => {
        const store = createInMemorySettingsStore();
        expect(store.get().profiles).toHaveLength(1);
        expect(store.getActiveProfileIndex()).toBe(0);
    });

    it('get() returns a deep clone (mutation does not affect store)', () => {
        const store = createInMemorySettingsStore();
        const opts = store.get();
        opts.profiles[0]!.options.general.maxResults = 999;
        expect(store.getActiveProfileOptions().general.maxResults).toBe(32);
    });

    it('set() validates before accepting', () => {
        const store = createInMemorySettingsStore();
        const badOpts = createDefaultOptions();
        badOpts.profiles = [];
        const result = store.set(badOpts);
        expect(result.valid).toBe(false);
        // store still has the old valid options
        expect(store.get().profiles).toHaveLength(1);
    });

    it('set() accepts valid options', () => {
        const store = createInMemorySettingsStore();
        const opts = createDefaultOptions();
        opts.profiles[0]!.name = 'Custom';
        const result = store.set(opts);
        expect(result.valid).toBe(true);
        expect(store.get().profiles[0]?.name).toBe('Custom');
    });

    it('addProfile / removeProfile work correctly', () => {
        const store = createInMemorySettingsStore();
        const idx = store.addProfile('Test Profile');
        expect(idx).toBe(1);
        expect(store.get().profiles).toHaveLength(2);
        expect(store.getProfileByName('Test Profile')).not.toBeNull();

        const removed = store.removeProfile(1);
        expect(removed).toBe(true);
        expect(store.get().profiles).toHaveLength(1);
    });

    it('cannot remove the last profile', () => {
        const store = createInMemorySettingsStore();
        expect(store.removeProfile(0)).toBe(false);
    });

    it('setActiveProfileIndex rejects out-of-range', () => {
        const store = createInMemorySettingsStore();
        expect(store.setActiveProfileIndex(5)).toBe(false);
    });

    it('exportJson / importJson round-trips', () => {
        const store = createInMemorySettingsStore();
        store.addProfile('Second');
        store.setActiveProfileIndex(1);
        const json = store.exportJson();
        expect(typeof json).toBe('string');

        const store2 = createInMemorySettingsStore();
        const result = store2.importJson(json);
        expect(result.valid).toBe(true);
        expect(store2.get().profiles).toHaveLength(2);
        expect(store2.getActiveProfileIndex()).toBe(1);
    });

    it('importJson rejects invalid JSON', () => {
        const store = createInMemorySettingsStore();
        const result = store.importJson('{invalid json}');
        expect(result.valid).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// YomitanSettings facade
// ---------------------------------------------------------------------------

describe('YomitanSettings', () => {
    const settings = new YomitanSettings();

    it('exposes sections array', () => {
        expect(settings.sections.length).toBeGreaterThan(0);
        expect(settings.sections[0]?.key).toBe('general');
    });

    it('exposes profileSection', () => {
        expect(settings.profileSection.key).toBe('profile');
    });

    it('getDefaultOptions returns a valid ProfileOptions', () => {
        const opts = settings.getDefaultOptions();
        expect(validateProfileOptionsObject(opts).valid).toBe(true);
    });

    it('getDefaultRootOptions returns a valid Options', () => {
        const opts = settings.getDefaultRootOptions();
        expect(validateOptions(opts).valid).toBe(true);
    });

    it('createStore returns a working store', () => {
        const store = settings.createStore();
        expect(store.get().profiles).toHaveLength(1);
    });

    it('validate delegates to validateOptions', () => {
        expect(settings.validate(createDefaultOptions()).valid).toBe(true);
        expect(settings.validate('bad').valid).toBe(false);
    });
});
