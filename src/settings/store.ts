/**
 * Settings store contract and in-memory implementation.
 *
 * The store provides a typed, path-based read/write interface over an
 * `Options` object. It is pure TypeScript — persistence (Chrome storage,
 * localStorage, file, database) is the host application's responsibility.
 */

import type {Options, ProfileOptions} from './types.js';
import {createDefaultOptions, createDefaultProfileOptions} from './defaults.js';
import type {ValidationResult} from './validation.js';
import {validateOptions} from './validation.js';

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

/**
 * Read/write interface over the full `Options` tree.
 *
 * Implementations are responsible for persistence. The in-memory store is
 * the simplest; host apps can wrap it or implement their own backed by
 * Chrome storage, Tauri FS, localStorage, etc.
 */
export interface SettingsStore {
    /** Returns the full options object (deep clone — safe to mutate). */
    get(): Options;
    /** Replaces the full options object. Validates before accepting. */
    set(options: Options): ValidationResult;
    /** Returns the currently active profile options. */
    getActiveProfileOptions(): ProfileOptions;
    /** Returns the active profile index. */
    getActiveProfileIndex(): number;
    /** Switches the active profile by index. Returns false if out of range. */
    setActiveProfileIndex(index: number): boolean;
    /** Returns a profile by name, or null. */
    getProfileByName(name: string): Options['profiles'][number] | null;
    /** Adds a new profile with default options. Returns the new index. */
    addProfile(name: string): number;
    /** Removes a profile by index. Returns false if it is the last profile. */
    removeProfile(index: number): boolean;
    /** Serialises options to a JSON string (for export). */
    exportJson(): string;
    /** Parses and loads a JSON string (for import). Validates before accepting. */
    importJson(json: string): ValidationResult;
}

// ---------------------------------------------------------------------------
// In-memory implementation
// ---------------------------------------------------------------------------

function deepClone<T>(value: T): T {
    return structuredClone(value);
}

export class InMemorySettingsStore implements SettingsStore {
    private _options: Options;

    constructor(initial?: Options) {
        this._options = initial ? deepClone(initial) : createDefaultOptions();
    }

    get(): Options {
        return deepClone(this._options);
    }

    set(options: Options): ValidationResult {
        const result = validateOptions(options);
        if (result.valid) {
            this._options = deepClone(options);
        }
        return result;
    }

    getActiveProfileOptions(): ProfileOptions {
        const profile = this._options.profiles[this._options.profileCurrent];
        if (!profile) {
            return createDefaultProfileOptions();
        }
        return profile.options;
    }

    getActiveProfileIndex(): number {
        return this._options.profileCurrent;
    }

    setActiveProfileIndex(index: number): boolean {
        if (index < 0 || index >= this._options.profiles.length) {
            return false;
        }
        this._options.profileCurrent = index;
        return true;
    }

    getProfileByName(name: string): Options['profiles'][number] | null {
        return this._options.profiles.find((p) => p.name === name) ?? null;
    }

    addProfile(name: string): number {
        this._options.profiles.push({
            name,
            conditionGroups: [],
            options: createDefaultProfileOptions(),
        });
        return this._options.profiles.length - 1;
    }

    removeProfile(index: number): boolean {
        if (this._options.profiles.length <= 1) {
            return false;
        }
        if (index < 0 || index >= this._options.profiles.length) {
            return false;
        }
        this._options.profiles.splice(index, 1);
        if (this._options.profileCurrent >= this._options.profiles.length) {
            this._options.profileCurrent = this._options.profiles.length - 1;
        }
        return true;
    }

    exportJson(): string {
        return JSON.stringify(this._options, null, 2);
    }

    importJson(json: string): ValidationResult {
        try {
            const parsed = JSON.parse(json) as unknown;
            return this.set(parsed as Options);
        } catch (error) {
            return {
                valid: false,
                issues: [{path: '', message: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`}],
            };
        }
    }
}

/** Creates a new in-memory store pre-populated with defaults. */
export function createInMemorySettingsStore(initial?: Options): InMemorySettingsStore {
    return new InMemorySettingsStore(initial);
}
