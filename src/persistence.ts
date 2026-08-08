export type SaveData = {
    level: number;
    stars: number;
    unlockedAchievements: string[];
    levelsCompleted: number;
    categoriesSeen: string[];
    foundDiagonal: boolean;
    wateredDate: string | null;
    growthByPlant: Record<string, number>;
    difficultyMode: "standard" | "challenging";
    themeMode: "system" | "sprout" | "midnight";
    musicMuted: boolean;
    musicVolume: number;
    sfxMuted: boolean;
    sfxVolume: number;
};

export const DEFAULT_SAVE_DATA: SaveData = {
    level: 1,
    stars: 0,
    unlockedAchievements: [],
    levelsCompleted: 0,
    categoriesSeen: [],
    foundDiagonal: false,
    wateredDate: null,
    growthByPlant: {},
    difficultyMode: "standard",
    themeMode: "system",
    musicMuted: false,
    musicVolume: 0.5,
    sfxMuted: false,
    sfxVolume: 0.5,
};

const PRIMARY_KEY = "word_sprout_save_v1";

const LEGACY_KEYS = {
    level: "wordsearch.level",
    stars: "wordsearch.stars",
    achievements: "wordsearch.achievements",
    levelsCompleted: "wordsearch.levelsCompleted",
    categoriesSeen: "wordsearch.categoriesSeen",
    foundDiagonal: "wordsearch.foundDiagonal",
    difficultyMode: "wordsearch.difficultyMode",
    wateredDate: "wordsearch.wateredDate",
    growthByPlant: "wordsearch.growthByPlant",
    themeMode: "wordsearch.themeMode",
    musicMuted: "wordsearch.musicMuted",
    musicVolume: "wordsearch.musicVolume",
    sfxMuted: "wordsearch.sfxMuted",
    sfxVolume: "wordsearch.sfxVolume",
    legacySave: "ws_save",
};

function isTauri(): boolean {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
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

    // Check for primary store
    const primaryRaw = localStorage.getItem(PRIMARY_KEY);
    if (primaryRaw) {
        try {
            const parsed = JSON.parse(primaryRaw);
            return { ...DEFAULT_SAVE_DATA, ...parsed };
        } catch {
            // fallback to legacy migration
        }
    }

    // Migrate from legacy keys if present
    const migratedData: SaveData = { ...DEFAULT_SAVE_DATA };
    let hasLegacy = false;

    // Check individual legacy keys
    const legacyLevel = localStorage.getItem(LEGACY_KEYS.level);
    if (legacyLevel !== null) {
        migratedData.level = Number(legacyLevel) || 1;
        hasLegacy = true;
    }

    const legacyStars = localStorage.getItem(LEGACY_KEYS.stars);
    if (legacyStars !== null) {
        migratedData.stars = Number(legacyStars) || 0;
        hasLegacy = true;
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

    const legacyWatered = localStorage.getItem(LEGACY_KEYS.wateredDate);
    if (legacyWatered !== null) {
        migratedData.wateredDate = legacyWatered;
        hasLegacy = true;
    }

    const legacyGrowth = localStorage.getItem(LEGACY_KEYS.growthByPlant);
    if (legacyGrowth !== null) {
        migratedData.growthByPlant = parseJson<Record<string, number>>(legacyGrowth, {});
        hasLegacy = true;
    }

    // Single-blob legacy save ws_save
    const wsSave = localStorage.getItem(LEGACY_KEYS.legacySave);
    if (wsSave !== null) {
        const parsedWs = parseJson<Partial<SaveData>>(wsSave, {});
        Object.assign(migratedData, parsedWs);
        hasLegacy = true;
    }

    // Save migrated data and clean up legacy keys
    if (hasLegacy) {
        await writeSaveData(migratedData);
        for (const key of Object.values(LEGACY_KEYS)) {
            localStorage.removeItem(key);
        }
    }

    return migratedData;
}

export async function writeSaveData(data: SaveData): Promise<void> {
    if (typeof window === "undefined") return;
    const serialized = JSON.stringify(data);
    localStorage.setItem(PRIMARY_KEY, serialized);

    if (isTauri()) {
        try {
            // Write to Tauri plugin store or filesystem if present
            const { invoke } = await import("@tauri-apps/api/core");
            await invoke("save_game_state", { state: serialized });
        } catch {
            // Ignore if backend command is not registered yet
        }
    }
}
