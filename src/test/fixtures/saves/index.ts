// Fixture library for WSP-0.3 (persistence and migration hardening). Each
// fixture is a raw, pre-normalization blob shaped the way an actual
// localStorage/native save file would look at that point in the game's
// history -- deliberately loose (`Record<string, unknown>`, not `SaveData`)
// since older/malformed shapes are the entire point. Every fixture here
// must round-trip through `normalizeSaveData`/`loadSaveData` without
// throwing and without losing anything a real player would notice missing.

/** A save with no version field at all -- the oldest possible shape, predating schema versioning itself. */
export const legacyV1Save: Record<string, unknown> = {
    level: 5,
    stars: 20,
    difficultyMode: "challenging",
    unlockedAchievements: ["speed-sprouter"],
};

/** version 2: has highestUnlockedLevel/completedLevels-adjacent fields missing (the frontier model didn't exist yet). */
export const legacyV2Save: Record<string, unknown> = {
    version: 2,
    level: 10,
    seeds: 450,
    unlockedAchievements: ["night-bloomer", "word-weaver"],
    ownedPlants: ["moss-sprout", "emerald-fern"],
};

/** version 3: has the frontier model, but predates Field Notes. */
export const legacyV3Save: Record<string, unknown> = {
    version: 3,
    level: 22,
    highestUnlockedLevel: 22,
    completedLevels: Array.from({ length: 21 }, (_, i) => i + 1),
    seeds: 1250,
    unlockedAchievements: ["speed-sprouter", "night-bloomer"],
    ownedPlants: ["moss-sprout", "emerald-fern", "succulent-rosette"],
    growthByPlant: { "moss-sprout": 100, "emerald-fern": 50 },
};

/** A mid-game player: several regions in, a modest collection, nothing extreme. */
export const advancedPlayerSave: Record<string, unknown> = {
    version: 4,
    level: 55,
    highestUnlockedLevel: 55,
    completedLevels: Array.from({ length: 54 }, (_, i) => i + 1),
    totalPuzzleCompletions: 54,
    seeds: 3200,
    unlockedAchievements: ["speed-sprouter", "night-bloomer", "word-weaver", "root-master"],
    levelsCompleted: 54,
    categoriesSeen: ["Mythology", "Psychology", "Astronomy"],
    ownedPlants: ["moss-sprout", "emerald-fern", "succulent-rosette", "midnight-lotus"],
    wateredTimestamps: { "moss-sprout": 1_700_000_000_000, "emerald-fern": 1_700_000_500_000 },
    growthByPlant: { "moss-sprout": 100, "emerald-fern": 75, "succulent-rosette": 25 },
    difficultyMode: "standard",
    powerupInventory: { "single-letter-sprout": 2, "lumina-cyclone": 1 },
};

/** A player who has finished the full 1-100 campaign and kept playing past it. */
export const level100PlayerSave: Record<string, unknown> = {
    version: 4,
    level: 137,
    highestUnlockedLevel: 137,
    completedLevels: Array.from({ length: 136 }, (_, i) => i + 1),
    totalPuzzleCompletions: 136,
    seeds: 48_500,
    unlockedAchievements: ["speed-sprouter", "night-bloomer", "word-weaver", "root-master", "world-rooted", "flora-atlas"],
    levelsCompleted: 136,
    categoriesSeen: ["Mythology", "Psychology", "Astronomy", "Anatomy", "Geology", "Botany"],
    plantsBloomed: 18,
    bloomedRarityTiers: 6,
    uniqueCategoriesCompleted: 12,
    powerupsUsed: 40,
    reverseWordsFound: 95,
    maxBonusWordsInLevel: 5,
    levelsCompletedWithoutHint: 80,
};

/** A player who has bought (and is nurturing) a large share of the whole plant catalog. */
export const largeGardenSave: Record<string, unknown> = {
    version: 4,
    level: 90,
    highestUnlockedLevel: 90,
    completedLevels: Array.from({ length: 89 }, (_, i) => i + 1),
    seeds: 12_000,
    ownedPlants: [
        "moss-sprout", "emerald-fern", "succulent-rosette", "midnight-lotus", "golden-sunflower",
        "bonsai-bloom", "crystal-succulent", "solar-vine", "starlight-dahlia", "monstera-deliciosa",
        "frost-rose", "lunar-bamboo", "amber-flytrap", "calathea-orbifolia", "ether-cherry",
    ],
    wateredTimestamps: Object.fromEntries(
        ["moss-sprout", "emerald-fern", "succulent-rosette", "midnight-lotus", "golden-sunflower"].map((id, i) => [id, 1_700_000_000_000 + i * 10_000]),
    ),
    growthByPlant: Object.fromEntries(
        ["moss-sprout", "emerald-fern", "succulent-rosette", "midnight-lotus", "golden-sunflower", "bonsai-bloom"].map((id, i) => [id, (i * 25) % 100]),
    ),
    plantsBloomed: 6,
};

/** A player with several cosmetic themes unlocked. */
export const unlockedThemesSave: Record<string, unknown> = {
    version: 4,
    level: 40,
    highestUnlockedLevel: 40,
    completedLevels: Array.from({ length: 39 }, (_, i) => i + 1),
    seeds: 5000,
    unlockedThemes: ["midnight-bloom", "sunlit-canopy", "crystal-cavern"],
    hasGoldenCrest: true,
};

/** A player who has unlocked most of the achievement roster. */
export const manyAchievementsSave: Record<string, unknown> = {
    version: 4,
    level: 70,
    highestUnlockedLevel: 70,
    completedLevels: Array.from({ length: 69 }, (_, i) => i + 1),
    seeds: 9000,
    unlockedAchievements: [
        "speed-sprouter", "night-bloomer", "word-weaver", "root-master", "world-rooted", "flora-atlas",
        "diagonal-detective", "sunlight-harvester", "bloom-herald", "nimble-planter", "moss-mystic",
        "garden-cartographer", "pathfinder", "grove-walker", "canopy-legend", "wildword-collector",
        "bonus-botanist", "quiet-gardener", "instinctive-cultivator", "garden-tender", "conservatory-keeper",
    ],
};

/**
 * A valid version-4 save that's nonetheless missing several optional-state
 * fields entirely -- simulates a save written by a build from partway
 * through v4's own development, before every v4 feature existed yet. Every
 * field here should backfill from DEFAULT_SAVE_DATA, not throw or corrupt
 * anything else.
 */
export const missingOptionalFieldsSave: Record<string, unknown> = {
    version: 4,
    level: 15,
    highestUnlockedLevel: 15,
    seeds: 800,
    // fieldNotes, onboardingSeen, afflictions, remedyCharges, powerupInventory: absent.
};

/**
 * A save that parses as valid JSON and is a plausible object, but several
 * individual fields have the wrong type -- a botched write, manual
 * tampering, or a bug in some earlier build. Every field here should
 * recover to its default independently; nothing should throw, and fields
 * that ARE well-formed (seeds, ownedPlants) must survive untouched.
 */
export const malformedRecoverableSave: Record<string, unknown> = {
    version: 4,
    level: 30,
    highestUnlockedLevel: 30,
    seeds: 2500,
    unlockedAchievements: null,
    categoriesSeen: "Mythology",
    foundDiagonal: "yes",
    ownedPlants: ["moss-sprout", "emerald-fern"],
    wateredTimestamps: ["not", "a", "record"],
    growthByPlant: { "moss-sprout": "fully grown" },
    unlockedThemes: 42,
    difficultyMode: "impossible",
    themeMode: "neon",
    musicVolume: 5,
    sfxVolume: -3,
    onboardingSeen: "done",
    remedyCharges: "three",
};
