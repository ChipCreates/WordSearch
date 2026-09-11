// Standalone Seed-economy simulation (WSP-1.3 in
// WordSprout_1.0_Tier0-1_Issues.md): models distinct player profiles across
// several time horizons and reports Seeds earned/spent and time-to-rarity
// per plant tier, so progression targets are tuned from this output rather
// than intuition. Run with `npm run simulate:economy`.
import { getPlantEconomy, STARTER_PLANT_ID } from "../src/economy";
import { REWARDS } from "../src/gameMechanics";
import { PLANTS_CATALOG, type PlantDef } from "../src/plantsCatalog";
import { POWERUP_DEFINITIONS } from "../src/powerups";

export type PlayerProfile = {
    id: string;
    label: string;
    puzzlesPerDay: number;
    // Average bonus words found per puzzle. Casual/regular/enthusiast are
    // ordinary play; optimizer deliberately hunts bonus words, so it's set
    // well above what incidental discovery would produce.
    avgBonusWordsPerPuzzle: number;
    // Average Seeds spent on power-up purchases per puzzle played. Zero for
    // profiles that never buy convenience; the hint-heavy profile spends
    // roughly one mid-tier charge (see POWERUP_DEFINITIONS) most puzzles.
    avgPowerupSpendPerPuzzle: number;
};

export const PLAYER_PROFILES: PlayerProfile[] = [
    { id: "casual", label: "Casual (3 puzzles/day)", puzzlesPerDay: 3, avgBonusWordsPerPuzzle: 0.5, avgPowerupSpendPerPuzzle: 0 },
    { id: "regular", label: "Regular (10 puzzles/day)", puzzlesPerDay: 10, avgBonusWordsPerPuzzle: 0.75, avgPowerupSpendPerPuzzle: 15 },
    { id: "enthusiast", label: "Enthusiast (30 puzzles/day)", puzzlesPerDay: 30, avgBonusWordsPerPuzzle: 1, avgPowerupSpendPerPuzzle: 15 },
    { id: "optimizer", label: "Optimizer (bonus-word-focused)", puzzlesPerDay: 10, avgBonusWordsPerPuzzle: 2.5, avgPowerupSpendPerPuzzle: 5 },
    // "Frequent" is modeled as a purchase on half of all puzzles -- buying
    // literally every single puzzle would be an extreme rather than a
    // realistic heavy-convenience player -- averaging the two cheapest,
    // most-reached-for charges (single-letter-sprout @50, lumina-cyclone
    // @100) on those purchase-puzzles.
    { id: "hint-heavy", label: "Hint-heavy / convenience-heavy", puzzlesPerDay: 10, avgBonusWordsPerPuzzle: 0.5, avgPowerupSpendPerPuzzle: 0.5 * (POWERUP_DEFINITIONS["single-letter-sprout"].cost + POWERUP_DEFINITIONS["lumina-cyclone"].cost) / 2 },
];

const CAMPAIGN_LENGTH = 100;
// WSP-2.7's beyond-level-100 certification horizon: the campaign keeps
// generating fresh levels indefinitely past 100 (see completionSeeds'
// own doc comment below), so a second, longer horizon is run alongside the
// original 100-level one specifically to confirm Seeds keep accumulating at
// the same rate with no cap or slowdown once a player crosses that line --
// not just that level 100 itself is reachable. 150 matches the convention
// already established on the puzzle-generation side (see
// src-tauri/src/lib.rs's and src/regionTuning.test.ts's own beyond-100 test
// levels).
const BEYOND_CAMPAIGN_LENGTH = 150;

// Seeds earned for one puzzle completion by a player who always plays their
// unlocked frontier level -- the natural default this whole file models.
// Per the release plan (Tier 2.1), the campaign keeps generating fresh,
// never-before-seen levels indefinitely past 100, so a forward-progressing
// player always earns the full LEVEL_COMPLETE_SEEDS rate, with no cap or
// slowdown at 100. REPLAY_COMPLETE_SEEDS only applies if a player
// deliberately navigates *backward* to an already-completed level instead
// of progressing -- see forwardProgressAlwaysOutearnsReplaying below for
// why that's never the more profitable choice anyway.
function completionSeeds(profile: PlayerProfile): number {
    return REWARDS.LEVEL_COMPLETE_SEEDS + profile.avgBonusWordsPerPuzzle * REWARDS.BONUS_WORD_SEEDS;
}

/**
 * Confirms the "no economically rational strategy earns more Seeds by
 * avoiding the core loop" requirement for the one alternative the game
 * actually offers: replaying an old completed level instead of progressing
 * forward. Returns true iff progressing is always at least as profitable,
 * for every bonus-word rate a real profile might have.
 */
export function forwardProgressAlwaysOutearnsReplaying(): boolean {
    for (let avgBonusWords = 0; avgBonusWords <= 5; avgBonusWords += 0.5) {
        const forward = REWARDS.LEVEL_COMPLETE_SEEDS + avgBonusWords * REWARDS.BONUS_WORD_SEEDS;
        const replay = REWARDS.REPLAY_COMPLETE_SEEDS + avgBonusWords * REWARDS.BONUS_WORD_SEEDS;
        if (replay > forward) return false;
    }
    return true;
}

export type TierAffordability = Record<string, number | null>; // tier -> day index first affordable, or null if never within horizon

export type SimulationResult = {
    profileId: string;
    horizonLabel: string;
    days: number;
    puzzlesPlayed: number;
    levelsCompleted: number;
    seedsEarned: number;
    seedsSpentOnPowerups: number;
    netSeeds: number;
    tierFirstAffordableDay: TierAffordability;
};

/**
 * The cheapest *purchasable* plant in each tier -- the fastest reachable
 * representative of that rarity. Excludes the starter plant deliberately:
 * it's free and already owned from the first launch (the one documented
 * exception to normal economy rules -- see STARTER_PLANT_ID in economy.ts),
 * so measuring "time to afford Common" against it would trivially read as
 * day zero and say nothing about real purchase pacing.
 */
function cheapestByTier(): Map<string, PlantDef> {
    const map = new Map<string, PlantDef>();
    for (const plant of PLANTS_CATALOG) {
        if (plant.id === STARTER_PLANT_ID) continue;
        const existing = map.get(plant.tier);
        if (!existing || plant.seedCost < existing.seedCost) map.set(plant.tier, plant);
    }
    return map;
}

/**
 * Simulates `days` of play for `profile`, tracking a running Seed balance
 * (income minus power-up spend only -- it does NOT auto-purchase plants,
 * since "time to afford tier X" is exactly the metric being measured: the
 * first day the running balance would cover that tier's cheapest plant).
 */
export function simulateProfile(profile: PlayerProfile, days: number): SimulationResult {
    const tierPlants = cheapestByTier();
    const tierFirstAffordableDay: TierAffordability = {};
    for (const tier of tierPlants.keys()) tierFirstAffordableDay[tier] = null;

    let totalCompletions = 0;
    let seedsEarned = 0;
    let seedsSpent = 0;
    let balance = 0;

    for (let day = 0; day < days; day++) {
        for (let p = 0; p < profile.puzzlesPerDay; p++) {
            const gained = completionSeeds(profile);
            seedsEarned += gained;
            balance += gained;
            totalCompletions++;

            seedsSpent += profile.avgPowerupSpendPerPuzzle;
            balance -= profile.avgPowerupSpendPerPuzzle;
        }
        for (const [tier, plant] of tierPlants) {
            if (tierFirstAffordableDay[tier] === null && balance >= getPlantEconomy(plant).purchaseCost) {
                tierFirstAffordableDay[tier] = day;
            }
        }
    }

    return {
        profileId: profile.id,
        horizonLabel: `${days} days`,
        days,
        puzzlesPlayed: profile.puzzlesPerDay * days,
        levelsCompleted: totalCompletions,
        seedsEarned,
        seedsSpentOnPowerups: seedsSpent,
        netSeeds: balance,
        tierFirstAffordableDay,
    };
}

/** Simulates until `targetLevel` new completions have happened (rather than a fixed day count), for the "100-level horizon" requirement. */
export function simulateToLevel(profile: PlayerProfile, targetLevel: number): SimulationResult {
    const tierPlants = cheapestByTier();
    const tierFirstAffordableDay: TierAffordability = {};
    for (const tier of tierPlants.keys()) tierFirstAffordableDay[tier] = null;

    let totalCompletions = 0;
    let seedsEarned = 0;
    let seedsSpent = 0;
    let balance = 0;
    let day = 0;

    while (totalCompletions < targetLevel) {
        for (let p = 0; p < profile.puzzlesPerDay && totalCompletions < targetLevel; p++) {
            const gained = completionSeeds(profile);
            seedsEarned += gained;
            balance += gained;
            totalCompletions++;

            seedsSpent += profile.avgPowerupSpendPerPuzzle;
            balance -= profile.avgPowerupSpendPerPuzzle;
        }
        for (const [tier, plant] of tierPlants) {
            if (tierFirstAffordableDay[tier] === null && balance >= getPlantEconomy(plant).purchaseCost) {
                tierFirstAffordableDay[tier] = day;
            }
        }
        day++;
    }

    return {
        profileId: profile.id,
        horizonLabel: `${targetLevel}-level campaign`,
        days: day,
        puzzlesPlayed: totalCompletions,
        levelsCompleted: totalCompletions,
        seedsEarned,
        seedsSpentOnPowerups: seedsSpent,
        netSeeds: balance,
        tierFirstAffordableDay,
    };
}

export function runFullSimulation(): SimulationResult[] {
    const results: SimulationResult[] = [];
    for (const profile of PLAYER_PROFILES) {
        results.push(simulateProfile(profile, 7));
        results.push(simulateProfile(profile, 30));
        results.push(simulateToLevel(profile, CAMPAIGN_LENGTH));
        results.push(simulateToLevel(profile, BEYOND_CAMPAIGN_LENGTH));
    }
    return results;
}

export function formatSimulationReport(results: SimulationResult[]): string {
    const lines: string[] = [];
    for (const result of results) {
        lines.push(`--- ${result.profileId} · ${result.horizonLabel} ---`);
        lines.push(`  Puzzles played: ${result.puzzlesPlayed}  |  Levels completed: ${result.levelsCompleted}`);
        lines.push(`  Seeds earned: ${result.seedsEarned}  |  Spent on power-ups: ${result.seedsSpentOnPowerups}  |  Net: ${result.netSeeds}`);
        const tierLine = Object.entries(result.tierFirstAffordableDay)
            .map(([tier, day]) => `${tier}: ${day === null ? "not reached" : `day ${day}`}`)
            .join(", ");
        lines.push(`  Time-to-afford by tier -- ${tierLine}`);
    }
    return lines.join("\n");
}
