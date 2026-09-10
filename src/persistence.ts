import { CATEGORY_NAMES_BY_TIER } from "./backend";
import { DEFAULT_POWERUP_INVENTORY, normalizePowerupInventory, type PowerupInventory } from "./powerups";
import { COMPLETED_ONBOARDING_SEEN, DEFAULT_ONBOARDING_SEEN, normalizeOnboardingSeen, type OnboardingSeen } from "./onboarding";
import { invoke } from "@tauri-apps/api/core";
import { createFieldNotesState, normalizeFieldNotesState, type FieldNotesState } from "./fieldNotes";
import { createAfflictionState, normalizeAfflictionState, type AfflictionState } from "./plantAffliction";

export type SaveData = {
    version: number;
    /** @deprecated Use highestUnlockedLevel. Kept as a migration/read compatibility field. */
    level: number;
    highestUnlockedLevel: number;
    completedLevels: number[];
    totalPuzzleCompletions: number;
    seeds: number;
    unlockedAchievements: string[];
    levelsCompleted: number;
    categoriesSeen: string[];
    foundDiagonal: boolean;
    ownedPlants: string[];
    wateredTimestamps: Record<string, number>;
    growthByPlant: Record<string, number>;
    bonusWordsFound: number;
    unlockedThemes: string[];
    hasGoldenCrest: boolean;
    categoriesSeenBackfilled: boolean;
    difficultyMode: "easy" | "standard" | "challenging";
    favoriteCategories: string[];
    useFavorites: boolean;
    themeMode: "system" | "sprout" | "midnight";
    musicMuted: boolean;
    musicVolume: number;
    sfxMuted: boolean;
    sfxVolume: number;
    powerupInventory: PowerupInventory;
    levelsCompletedWithoutHint: number;
    maxBonusWordsInLevel: number;
    reverseWordsFound: number;
    plantsBloomed: number;
    bloomedRarityTiers: number;
    uniqueCategoriesCompleted: number;
    powerupsUsed: number;
    fieldNotes: FieldNotesState;
    onboardingSeen: OnboardingSeen;
    afflictions: AfflictionState;
    remedyCharges: number;
};

export const CURRENT_SCHEMA_VERSION = 4;

export const DEFAULT_SAVE_DATA: SaveData = {
    version: CURRENT_SCHEMA_VERSION,
    level: 1,
    highestUnlockedLevel: 1,
    completedLevels: [],
    totalPuzzleCompletions: 0,
    seeds: 0,
    unlockedAchievements: [],
    levelsCompleted: 0,
    categoriesSeen: [],
    foundDiagonal: false,
    ownedPlants: ["moss-sprout"],
    wateredTimestamps: {},
    growthByPlant: {},
    bonusWordsFound: 0,
    unlockedThemes: [],
    hasGoldenCrest: false,
    categoriesSeenBackfilled: false,
    difficultyMode: "standard",
    favoriteCategories: [],
    useFavorites: false,
    themeMode: "system",
    musicMuted: false,
    musicVolume: 0.5,
    sfxMuted: false,
    sfxVolume: 0.5,
    powerupInventory: { ...DEFAULT_POWERUP_INVENTORY },
    levelsCompletedWithoutHint: 0,
    maxBonusWordsInLevel: 0,
    reverseWordsFound: 0,
    plantsBloomed: 0,
    bloomedRarityTiers: 0,
    uniqueCategoriesCompleted: 0,
    powerupsUsed: 0,
    fieldNotes: createFieldNotesState(),
    onboardingSeen: DEFAULT_ONBOARDING_SEEN,
    afflictions: createAfflictionState(),
    remedyCharges: 0,
};

const PRIMARY_KEY = "word_sprout_save_v1";

const LEGACY_KEYS = {
    level: "wordsearch.level",
    stars: "wordsearch.stars",
    seeds: "wordsearch.seeds",
    achievements: "wordsearch.achievements",
    levelsCompleted: "wordsearch.levelsCompleted",
    categoriesSeen: "wordsearch.categoriesSeen",
    foundDiagonal: "wordsearch.foundDiagonal",
    difficultyMode: "wordsearch.difficultyMode",
    ownedPlants: "wordsearch.ownedPlants",
    wateredDate: "wordsearch.wateredDate",
    wateredTimestamps: "wordsearch.wateredTimestamps",
    growthByPlant: "wordsearch.growthByPlant",
    themeMode: "wordsearch.themeMode",
    musicMuted: "wordsearch.musicMuted",
    musicVolume: "wordsearch.musicVolume",
    sfxMuted: "wordsearch.sfxMuted",
    sfxVolume: "wordsearch.sfxVolume",
    legacySave: "ws_save",
};

export function isTauri(): boolean {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// True once a primary save blob exists in localStorage -- lets callers tell
// "first-ever launch" apart from "localStorage was cleared but a native
// save file might still be recoverable" without re-parsing the blob.
export function hasLocalSave(): boolean {
    return typeof window !== "undefined" && localStorage.getItem(PRIMARY_KEY) !== null;
}

// One-time backfill for players who reached `level` before `categoriesSeen`
// tracking existed: reconstructs which categories they must have already
// been shown, using the same pool-indexing formula getPuzzleWords() uses.
// Best-effort against the player's *current* difficultyMode only -- there's
// no record of which tier was active on any earlier level, so a player who
// switched tiers mid-run gets an approximation, not a perfect replay.
// Guarded by `categoriesSeenBackfilled` so it only ever runs once.
function backfillCategoriesSeen(data: SaveData): SaveData {
    if (data.categoriesSeenBackfilled || data.highestUnlockedLevel <= 1) {
        return { ...data, categoriesSeenBackfilled: true };
    }
    const pool = CATEGORY_NAMES_BY_TIER[data.difficultyMode];
    if (!pool || pool.length === 0) {
        return { ...data, categoriesSeenBackfilled: true };
    }
    const seen = new Set(data.categoriesSeen);
    for (let lvl = 1; lvl < data.highestUnlockedLevel; lvl++) {
        seen.add(pool[(lvl - 1) % pool.length]);
    }
    return { ...data, categoriesSeen: Array.from(seen), categoriesSeenBackfilled: true };
}

// Defensive field-level coercion for a "malformed but recoverable" save --
// a valid JSON object overall, but with one or more fields of the wrong
// type (a botched write, manual tampering, a bug in an older build). Each
// helper accepts only a plausibly-correct type and falls back to the
// known-good default otherwise, so one bad field degrades gracefully
// instead of propagating garbage into game state or crashing a caller that
// assumes the declared shape (e.g. `Object.values()` on a non-object).
function asStringArray(value: unknown, fallback: string[]): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : fallback;
}
function asBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === "boolean" ? value : fallback;
}
function asFiniteNumber(value: unknown, fallback: number): number {
    if (typeof value !== "number" && typeof value !== "string") return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
function asNonNegativeInt(value: unknown, fallback: number): number {
    return Math.max(0, Math.floor(asFiniteNumber(value, fallback)));
}
function asUnitInterval(value: unknown, fallback: number): number {
    return Math.min(1, Math.max(0, asFiniteNumber(value, fallback)));
}
function asNumberRecord(value: unknown, fallback: Record<string, number>): Record<string, number> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
    const result: Record<string, number> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        if (typeof entry === "number" && Number.isFinite(entry)) result[key] = entry;
    }
    return result;
}
function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Normalize both fresh and pre-v3 saves into one canonical progression shape. */
export function normalizeSaveData(raw: Partial<SaveData> & { stars?: number }): SaveData {
    const legacyLevel = Math.max(1, Math.floor(Number(raw.level) || 1));
    // A v2-shaped object can be spread over DEFAULT_SAVE_DATA, leaving the
    // newly added field at 1 even when the legacy frontier is higher.
    const highestUnlockedLevel = Math.max(1, legacyLevel, Math.floor(Number(raw.highestUnlockedLevel) || 1));
    const hasExplicitCompletionLedger = Array.isArray(raw.completedLevels);
    const completedLevels = hasExplicitCompletionLedger
        ? (raw.completedLevels ?? []).filter(value => Number.isInteger(value) && value >= 1).map(Number)
        : Array.from({ length: Math.max(0, legacyLevel - 1) }, (_, index) => index + 1);
    const seeds = typeof raw.seeds === "number"
        ? raw.seeds
        : typeof raw.stars === "number" ? raw.stars * 100 : DEFAULT_SAVE_DATA.seeds;
    const ownedPlants = asStringArray(raw.ownedPlants, DEFAULT_SAVE_DATA.ownedPlants);
    return {
        ...DEFAULT_SAVE_DATA,
        ...raw,
        level: highestUnlockedLevel,
        highestUnlockedLevel,
        completedLevels: Array.from(new Set(completedLevels)).sort((a, b) => a - b),
        totalPuzzleCompletions: Math.max(0, Math.floor(Number(raw.totalPuzzleCompletions) || Number(raw.levelsCompleted) || 0)),
        seeds,
        unlockedAchievements: asStringArray(raw.unlockedAchievements, DEFAULT_SAVE_DATA.unlockedAchievements),
        levelsCompleted: asNonNegativeInt(raw.levelsCompleted, DEFAULT_SAVE_DATA.levelsCompleted),
        categoriesSeen: asStringArray(raw.categoriesSeen, DEFAULT_SAVE_DATA.categoriesSeen),
        foundDiagonal: asBoolean(raw.foundDiagonal, DEFAULT_SAVE_DATA.foundDiagonal),
        ownedPlants: ownedPlants.length > 0 ? ownedPlants : DEFAULT_SAVE_DATA.ownedPlants,
        wateredTimestamps: asNumberRecord(raw.wateredTimestamps, DEFAULT_SAVE_DATA.wateredTimestamps),
        growthByPlant: asNumberRecord(raw.growthByPlant, DEFAULT_SAVE_DATA.growthByPlant),
        bonusWordsFound: asNonNegativeInt(raw.bonusWordsFound, DEFAULT_SAVE_DATA.bonusWordsFound),
        unlockedThemes: asStringArray(raw.unlockedThemes, DEFAULT_SAVE_DATA.unlockedThemes),
        hasGoldenCrest: asBoolean(raw.hasGoldenCrest, DEFAULT_SAVE_DATA.hasGoldenCrest),
        categoriesSeenBackfilled: asBoolean(raw.categoriesSeenBackfilled, DEFAULT_SAVE_DATA.categoriesSeenBackfilled),
        difficultyMode: asEnum(raw.difficultyMode, ["easy", "standard", "challenging"] as const, DEFAULT_SAVE_DATA.difficultyMode),
        favoriteCategories: asStringArray(raw.favoriteCategories, DEFAULT_SAVE_DATA.favoriteCategories),
        useFavorites: asBoolean(raw.useFavorites, DEFAULT_SAVE_DATA.useFavorites),
        themeMode: asEnum(raw.themeMode, ["system", "sprout", "midnight"] as const, DEFAULT_SAVE_DATA.themeMode),
        musicMuted: asBoolean(raw.musicMuted, DEFAULT_SAVE_DATA.musicMuted),
        musicVolume: asUnitInterval(raw.musicVolume, DEFAULT_SAVE_DATA.musicVolume),
        sfxMuted: asBoolean(raw.sfxMuted, DEFAULT_SAVE_DATA.sfxMuted),
        sfxVolume: asUnitInterval(raw.sfxVolume, DEFAULT_SAVE_DATA.sfxVolume),
        powerupInventory: normalizePowerupInventory(raw.powerupInventory),
        levelsCompletedWithoutHint: asNonNegativeInt(raw.levelsCompletedWithoutHint, DEFAULT_SAVE_DATA.levelsCompletedWithoutHint),
        maxBonusWordsInLevel: asNonNegativeInt(raw.maxBonusWordsInLevel, DEFAULT_SAVE_DATA.maxBonusWordsInLevel),
        reverseWordsFound: asNonNegativeInt(raw.reverseWordsFound, DEFAULT_SAVE_DATA.reverseWordsFound),
        plantsBloomed: asNonNegativeInt(raw.plantsBloomed, DEFAULT_SAVE_DATA.plantsBloomed),
        bloomedRarityTiers: asNonNegativeInt(raw.bloomedRarityTiers, DEFAULT_SAVE_DATA.bloomedRarityTiers),
        uniqueCategoriesCompleted: asNonNegativeInt(raw.uniqueCategoriesCompleted, DEFAULT_SAVE_DATA.uniqueCategoriesCompleted),
        powerupsUsed: asNonNegativeInt(raw.powerupsUsed, DEFAULT_SAVE_DATA.powerupsUsed),
        fieldNotes: normalizeFieldNotesState(raw.fieldNotes),
        // A returning player whose save predates onboarding tracking entirely
        // (the field is simply absent) must never be routed through it --
        // only a genuinely malformed-but-present value gets normalized.
        onboardingSeen: raw.onboardingSeen === undefined ? COMPLETED_ONBOARDING_SEEN : normalizeOnboardingSeen(raw.onboardingSeen),
        afflictions: normalizeAfflictionState(raw.afflictions),
        remedyCharges: Math.max(0, Math.floor(Number(raw.remedyCharges) || 0)),
        version: CURRENT_SCHEMA_VERSION,
    };
}

function parseJson<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

// A save file is never allowed to silently disappear or get overwritten by
// a downgraded reinterpretation of itself. Two situations trigger this:
// the primary blob's JSON (or overall shape) is corrupt, or its version is
// newer than CURRENT_SCHEMA_VERSION (an older build opened after a newer
// one already wrote to this save). Either way: preserve the original data
// untouched, surface it here so the UI can show a real message, and block
// writeSaveData until the player takes an explicit action (see
// resetSaveAfterLoadIssue) -- never guess at a lossy interpretation.
export type LoadIssue =
    | { kind: "corrupted"; rawData: string; message: string }
    | { kind: "future-version"; rawData: string; foundVersion: number };

let loadIssue: LoadIssue | null = null;

export function getLoadIssue(): LoadIssue | null {
    return loadIssue;
}

/**
 * The only sanctioned way out of a load issue: call ONLY from a real,
 * explicit player action (e.g. confirming "reset my save" after seeing the
 * corruption/future-version message) -- never automatically, and never
 * merely because gameplay continued.
 *
 * Clearing the in-memory flag alone would be a footgun: the problematic
 * data is still sitting at PRIMARY_KEY, so the very next writeSaveData call
 * would re-parse it and immediately re-detect the same issue, permanently
 * deadlocking legitimate resets. So this replaces the primary save with a
 * fresh DEFAULT_SAVE_DATA outright -- "reset" is the only action being
 * offered here, matching the criteria's "only ever reset on explicit user
 * action". The original problematic data was already preserved (see
 * parsePrimarySave's corrupted-backup write; a future-version save is never
 * touched until this call explicitly overwrites it).
 */
export async function resetSaveAfterLoadIssue(): Promise<void> {
    loadIssue = null;
    if (typeof window === "undefined") return;
    const serialized = JSON.stringify(DEFAULT_SAVE_DATA);
    localStorage.setItem(PRIMARY_KEY, serialized);
    if (isTauri()) {
        try {
            await invoke("save_game_state", { state: serialized });
        } catch {
            // Ignore if backend command is not registered yet
        }
    }
}

const CORRUPTED_BACKUP_KEY = `${PRIMARY_KEY}_corrupted_backup`;

function isPlausibleSaveObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Parses the primary save blob. Returns the parsed object on success: a
 * save this build can safely normalize and proceed with. Returns null and
 * sets `loadIssue` for either failure mode described above -- callers must
 * fall through to fresh, unpersisted defaults rather than normalizing a
 * value that was never actually returned here.
 */
function parsePrimarySave(rawText: string): Record<string, unknown> | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawText);
    } catch (e) {
        localStorage.setItem(CORRUPTED_BACKUP_KEY, rawText);
        loadIssue = { kind: "corrupted", rawData: rawText, message: e instanceof Error ? e.message : String(e) };
        return null;
    }
    if (!isPlausibleSaveObject(parsed)) {
        localStorage.setItem(CORRUPTED_BACKUP_KEY, rawText);
        loadIssue = { kind: "corrupted", rawData: rawText, message: "Saved data was not a valid save object." };
        return null;
    }
    const foundVersion = typeof parsed.version === "number" ? parsed.version : 0;
    if (foundVersion > CURRENT_SCHEMA_VERSION) {
        // Deliberately never touch localStorage here -- the real, newer
        // save is already sitting untouched at PRIMARY_KEY.
        loadIssue = { kind: "future-version", rawData: rawText, foundVersion };
        return null;
    }
    return parsed;
}

export async function loadSaveData(): Promise<SaveData> {
    if (typeof window === "undefined") return { ...DEFAULT_SAVE_DATA };
    loadIssue = null;

    // Try loading from native Tauri filesystem store first
    if (isTauri()) {
        try {
            const nativeState = await invoke<string | null>("load_game_state");
            if (nativeState) {
                const parsed = parsePrimarySave(nativeState);
                if (parsed) return backfillCategoriesSeen(normalizeSaveData(parsed));
                // A load issue was recorded; fall through to the localStorage
                // mirror below (writeSaveData always keeps both in sync) in
                // case it isn't affected the same way, exactly like an IPC
                // failure already falls through today.
                console.warn("Tauri native save failed to parse safely, falling back to localStorage", loadIssue);
            }
        } catch (e) {
            console.warn("Tauri native load failed, falling back to localStorage", e);
        }
    }

    // Check for primary store in localStorage
    const primaryRaw = localStorage.getItem(PRIMARY_KEY);
    if (primaryRaw) {
        const parsed = parsePrimarySave(primaryRaw);
        if (parsed) {
            if (parsed.wateredDate && !parsed.wateredTimestamps) {
                parsed.wateredTimestamps = {};
            }
            return backfillCategoriesSeen(normalizeSaveData(parsed));
        }
        // A load issue was detected and preserved (see parsePrimarySave) --
        // a real, modern save already exists at PRIMARY_KEY, so legacy-key
        // migration below is never relevant here; return safe, unpersisted
        // defaults rather than falling through to it.
        return { ...DEFAULT_SAVE_DATA };
    }

    // Migrate from legacy keys if present
    const migratedData: SaveData = { ...DEFAULT_SAVE_DATA };
    let hasLegacy = false;

    const legacyLevel = localStorage.getItem(LEGACY_KEYS.level);
    if (legacyLevel !== null) {
        migratedData.level = Number(legacyLevel) || 1;
        migratedData.highestUnlockedLevel = migratedData.level;
        hasLegacy = true;
    }

    const legacySeeds = localStorage.getItem(LEGACY_KEYS.seeds);
    if (legacySeeds !== null) {
        migratedData.seeds = Number(legacySeeds) || 0;
        hasLegacy = true;
    } else {
        const legacyStars = localStorage.getItem(LEGACY_KEYS.stars);
        if (legacyStars !== null) {
            migratedData.seeds = (Number(legacyStars) || 0) * 100;
            hasLegacy = true;
        }
    }

    const legacyAch = localStorage.getItem(LEGACY_KEYS.achievements);
    if (legacyAch !== null) {
        migratedData.unlockedAchievements = parseJson<string[]>(legacyAch, []);
        hasLegacy = true;
    }

    const legacyLevelsComp = localStorage.getItem(LEGACY_KEYS.levelsCompleted);
    if (legacyLevelsComp !== null) {
        migratedData.levelsCompleted = Number(legacyLevelsComp) || 0;
        hasLegacy = true;
    }

    const legacyCatSeen = localStorage.getItem(LEGACY_KEYS.categoriesSeen);
    if (legacyCatSeen !== null) {
        migratedData.categoriesSeen = parseJson<string[]>(legacyCatSeen, []);
        hasLegacy = true;
    }

    const legacyDiag = localStorage.getItem(LEGACY_KEYS.foundDiagonal);
    if (legacyDiag !== null) {
        migratedData.foundDiagonal = legacyDiag === "true";
        hasLegacy = true;
    }

    const legacyDiff = localStorage.getItem(LEGACY_KEYS.difficultyMode);
    if (legacyDiff !== null) {
        migratedData.difficultyMode = legacyDiff === "challenging" ? "challenging" : "standard";
        hasLegacy = true;
    }

    const legacyOwned = localStorage.getItem(LEGACY_KEYS.ownedPlants);
    if (legacyOwned !== null) {
        const parsedOwned = parseJson<string[]>(legacyOwned, ["moss-sprout"]);
        migratedData.ownedPlants = parsedOwned.length > 0 ? parsedOwned : ["moss-sprout"];
        hasLegacy = true;
    }

    const legacyWatered = localStorage.getItem(LEGACY_KEYS.wateredTimestamps) || localStorage.getItem(LEGACY_KEYS.wateredDate);
    if (legacyWatered !== null) {
        migratedData.wateredTimestamps = parseJson<Record<string, number>>(legacyWatered, {});
        hasLegacy = true;
    }

    const legacyGrowth = localStorage.getItem(LEGACY_KEYS.growthByPlant);
    if (legacyGrowth !== null) {
        migratedData.growthByPlant = parseJson<Record<string, number>>(legacyGrowth, {});
        hasLegacy = true;
    }

    const wsSave = localStorage.getItem(LEGACY_KEYS.legacySave);
    if (wsSave !== null) {
        const parsedWs = parseJson<any>(wsSave, {});
        if (typeof parsedWs.stars === "number" && typeof parsedWs.seeds !== "number") {
            parsedWs.seeds = parsedWs.stars * 100;
        }
        Object.assign(migratedData, normalizeSaveData(parsedWs));
        hasLegacy = true;
    }

    if (hasLegacy) {
        migratedData.onboardingSeen = COMPLETED_ONBOARDING_SEEN;
        await writeSaveData(migratedData);
        for (const key of Object.values(LEGACY_KEYS)) {
            localStorage.removeItem(key);
        }
    }

    return backfillCategoriesSeen(normalizeSaveData(migratedData));
}

export function loadSaveDataSync(): SaveData {
    if (typeof window === "undefined") return { ...DEFAULT_SAVE_DATA };
    loadIssue = null;

    const primaryRaw = localStorage.getItem(PRIMARY_KEY);
    if (primaryRaw) {
        const parsed = parsePrimarySave(primaryRaw);
        if (parsed) return backfillCategoriesSeen(normalizeSaveData(parsed));
        return { ...DEFAULT_SAVE_DATA };
    }

    return { ...DEFAULT_SAVE_DATA };
}

export async function writeSaveData(data: Partial<SaveData>): Promise<void> {
    if (typeof window === "undefined") return;
    // Refuse to write while a load issue is outstanding -- a corrupted or
    // too-new save must never get silently overwritten by a defaulted (or
    // downgraded) reinterpretation just because gameplay continued after
    // it failed to load. Only an explicit resetSaveAfterLoadIssue() call
    // (itself only ever triggered by a real player action) lifts this.
    if (loadIssue) return;
    const primaryRaw = localStorage.getItem(PRIMARY_KEY);
    // null (not {}) when there's no existing save at all, so a brand new
    // player's very first write takes the DEFAULT_SAVE_DATA branch below
    // directly -- normalizeSaveData({}) is NOT equivalent to that (an
    // object with no `onboardingSeen` key at all is deliberately treated
    // as "a real save predating that field", not "no save yet").
    const parsed = primaryRaw ? parsePrimarySave(primaryRaw) : null;
    // Re-checked: parsePrimarySave can itself just have detected a *new*
    // issue (e.g. another tab/window running a newer build wrote a newer
    // save to the same localStorage since this session's last read).
    if (loadIssue) return;
    const existing = parsed ? backfillCategoriesSeen(normalizeSaveData(parsed)) : { ...DEFAULT_SAVE_DATA };
    const merged: SaveData = normalizeSaveData({ ...existing, ...data });
    const serialized = JSON.stringify(merged);
    localStorage.setItem(PRIMARY_KEY, serialized);

    if (isTauri()) {
        try {
            await invoke("save_game_state", { state: serialized });
        } catch {
            // Ignore if backend command is not registered yet
        }
    }
}
