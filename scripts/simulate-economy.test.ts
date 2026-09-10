import { describe, expect, it } from "vitest";
import { PLANTS_CATALOG } from "../src/plantsCatalog";
import { STARTER_PLANT_ID } from "../src/economy";
import { REWARDS } from "../src/gameMechanics";
import {
    PLAYER_PROFILES, forwardProgressAlwaysOutearnsReplaying, formatSimulationReport,
    runFullSimulation, simulateProfile, simulateToLevel,
} from "./simulate-economy";

describe("economy simulation (WSP-1.3)", () => {
    it("runs every profile across the 7-day, 30-day, and 100-level horizons and prints the report", () => {
        const results = runFullSimulation();
        console.log(formatSimulationReport(results));

        expect(results.length).toBe(PLAYER_PROFILES.length * 3);
        for (const result of results) {
            expect(result.seedsEarned).toBeGreaterThan(0);
            expect(Number.isFinite(result.netSeeds)).toBe(true);
        }
    });

    it("no profile ever accumulates Seeds without playing puzzles -- the only income term is puzzle completion", () => {
        // Structural guarantee, not just an output check: simulateProfile has
        // no code path that adds Seeds except inside the per-puzzle loop.
        const idlePlayer = { id: "idle", label: "idle", puzzlesPerDay: 0, avgBonusWordsPerPuzzle: 0, avgPowerupSpendPerPuzzle: 0 };
        const result = simulateProfile(idlePlayer, 30);
        expect(result.seedsEarned).toBe(0);
        expect(result.netSeeds).toBe(0);
    });

    it("a common plant is reachable within roughly one regular-paced day (~15-30 minutes of play)", () => {
        const regular = PLAYER_PROFILES.find(p => p.id === "regular")!;
        const result = simulateProfile(regular, 3);
        // day 0 == affordable by the end of the first day's puzzles.
        expect(result.tierFirstAffordableDay["Common"]).toBe(0);
    });

    it("legendary and cosmic tiers stay genuine multi-day/long-term goals, not same-session purchases", () => {
        const regular = PLAYER_PROFILES.find(p => p.id === "regular")!;
        const result = simulateProfile(regular, 60);
        expect(result.tierFirstAffordableDay["Legendary"]).not.toBeNull();
        expect(result.tierFirstAffordableDay["Legendary"]!).toBeGreaterThan(3);
        expect(result.tierFirstAffordableDay["Cosmic"]).not.toBeNull();
        expect(result.tierFirstAffordableDay["Cosmic"]!).toBeGreaterThan(result.tierFirstAffordableDay["Legendary"]!);
    });

    it("higher-frequency profiles never take longer to afford the same tier than lower-frequency ones", () => {
        const casual = simulateProfile(PLAYER_PROFILES.find(p => p.id === "casual")!, 60);
        const enthusiast = simulateProfile(PLAYER_PROFILES.find(p => p.id === "enthusiast")!, 60);
        for (const tier of Object.keys(casual.tierFirstAffordableDay)) {
            const casualDay = casual.tierFirstAffordableDay[tier];
            const enthusiastDay = enthusiast.tierFirstAffordableDay[tier];
            if (casualDay === null || enthusiastDay === null) continue;
            expect(enthusiastDay).toBeLessThanOrEqual(casualDay);
        }
    });

    it("the hint-heavy profile still nets positive Seeds overall -- convenience spend must never outrun income", () => {
        const hintHeavy = PLAYER_PROFILES.find(p => p.id === "hint-heavy")!;
        const result = simulateProfile(hintHeavy, 30);
        expect(result.netSeeds).toBeGreaterThan(0);
    });

    it("the optimizer profile earns more per puzzle than a same-pace non-optimizer profile", () => {
        const optimizer = simulateProfile(PLAYER_PROFILES.find(p => p.id === "optimizer")!, 7);
        const regular = simulateProfile(PLAYER_PROFILES.find(p => p.id === "regular")!, 7);
        expect(optimizer.seedsEarned / optimizer.puzzlesPlayed).toBeGreaterThan(regular.seedsEarned / regular.puzzlesPlayed);
    });

    it("simulateToLevel reaches exactly the target level and never fabricates completions beyond it", () => {
        const regular = PLAYER_PROFILES.find(p => p.id === "regular")!;
        const result = simulateToLevel(regular, 100);
        expect(result.levelsCompleted).toBe(100);
    });

    it("progressing forward never earns less than replaying an old level, for any bonus-word rate (WSP-1.3's no-exploit requirement)", () => {
        expect(forwardProgressAlwaysOutearnsReplaying()).toBe(true);
        // The bound that actually makes this true -- pin it explicitly so a
        // future rebalance can't silently invert it without a test noticing.
        expect(REWARDS.REPLAY_COMPLETE_SEEDS).toBeLessThan(REWARDS.LEVEL_COMPLETE_SEEDS);
    });

    it("every plant tier that exists in the catalog appears in the simulation's tier breakdown", () => {
        const tiersInCatalog = new Set(PLANTS_CATALOG.filter(p => p.id !== STARTER_PLANT_ID).map(p => p.tier));
        const result = simulateProfile(PLAYER_PROFILES[0], 7);
        for (const tier of tiersInCatalog) {
            expect(Object.keys(result.tierFirstAffordableDay)).toContain(tier);
        }
    });
});
