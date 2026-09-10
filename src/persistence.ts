import { CATEGORY_NAMES_BY_TIER } from "./backend";
import { DEFAULT_POWERUP_INVENTORY, normalizePowerupInventory, type PowerupInventory } from "./powerups";
import { COMPLETED_ONBOARDING_SEEN, DEFAULT_ONBOARDING_SEEN, type OnboardingSeen } from "./onboarding";
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
    return {
        ...DEFAULT_SAVE_DATA,
        ...raw,
        level: highestUnlockedLevel,
        highestUnlockedLevel,
        completedLevels: Array.from(new Set(completedLevels)).sort((a, b) => a - b),
        totalPuzzleCompletions: Math.max(0, Math.floor(Number(raw.totalPuzzleCompletions) || Number(raw.levelsCompleted) || 0)),
        seeds,
        powerupInventory: normalizePowerupInventory(raw.powerupInventory),
        fieldNotes: normalizeFieldNotesState(raw.fieldNotes),
        onboardingSeen: raw.onboardingSeen ?? COMPLETED_ONBOARDING_SEEN,
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

export async function loadSaveData(): Promise<SaveData> {
    if (typeof window === "undefined") return { ...DEFAULT_SAVE_DATA };

    // Try loading from native Tauri filesystem store first
    if (isTauri()) {
        try {
            const nativeState = await invoke<string | null>("load_game_state");
            if (nativeState) {
                const parsed = JSON.parse(nativeState);
                return backfillCategoriesSeen(normalizeSaveData(parsed));
            }
        } catch (e) {
            console.warn("Tauri native load failed, falling back to localStorage", e);
        }
    }

    // Check for primary store in localStorage
    const primaryRaw = localStorage.getItem(PRIMARY_KEY);
    if (primaryRaw) {
        try {
            const parsed = JSON.parse(primaryRaw);
            if (parsed.wateredDate && !parsed.wateredTimestamps) {
                parsed.wateredTimestamps = {};
            }
            if (!Array.isArray(parsed.ownedPlants) || parsed.ownedPlants.length === 0) {
                parsed.ownedPlants = ["moss-sprout"];
            }
            return backfillCategoriesSeen(normalizeSaveData(parsed));
        } catch {
            // fallback to legacy migration
        }
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

    const primaryRaw = localStorage.getItem(PRIMARY_KEY);
    if (primaryRaw) {
        try {
            const parsed = JSON.parse(primaryRaw);
            if (!Array.isArray(parsed.ownedPlants) || parsed.ownedPlants.length === 0) {
                parsed.ownedPlants = ["moss-sprout"];
            }
            return backfillCategoriesSeen(normalizeSaveData(parsed));
        } catch {}
    }

    return { ...DEFAULT_SAVE_DATA };
}

export async function writeSaveData(data: Partial<SaveData>): Promise<void> {
    if (typeof window === "undefined") return;
    const existing = loadSaveDataSync();
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
