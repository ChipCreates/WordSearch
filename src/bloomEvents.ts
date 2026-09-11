// Word Sprout's bloom-presentation event contract (WSP-2.6).
//
// WSP-2.5's registerBlooms(tiers: string[]) in useWordSearchGame.ts already
// tracks *which distinct rarity tiers* have ever bloomed, for achievement
// purposes -- that accounting logic is correct and stays untouched by this
// module. What it never knew, because it never needed to, is which
// *specific plant* bloomed on a given action, or what its bounty was --
// information every bloom-triggering call site already computes locally
// for its own toast text, but never handed anywhere shared.
//
// This module defines the one typed bloom-presentation event all three
// current bloom-triggering sites emit:
//   1. handleWaterPlant     (GardenView.tsx)
//   2. handleFertilizePlant (GardenView.tsx)
//   3. waterAllReady        (useWordSearchGame.ts, bulk "water all ready")
//
// so BloomCelebration (src/components/BloomCelebration.tsx) can present a
// single consistent occurrence no matter which of the three produced it,
// scaled by src/rewardIntensity.ts's REWARD_PRESENTATION for that plant's
// rarity tier. It is deliberately a parallel mechanism alongside
// registerBlooms, not a replacement for it -- the two solve different
// problems (lifetime achievement accounting vs. one-shot presentation) and
// keeping them separate means this issue never has to touch WSP-2.5's
// already-correct tracking logic.

import type { RewardIntensity } from "./rewardIntensity";
import type { PlantDef } from "./plantsCatalog";

/** What a bloom-triggering call site knows about one plant that just bloomed. */
export type BloomOccurrence = {
    plantId: string;
    plantName: string;
    tier: PlantDef["tier"];
    bounty: number;
};

/** A BloomOccurrence plus a stable identity, so a presentation queue (or a
 *  test) can key/track/dismiss individual entries even when two occurrences
 *  share every other field -- e.g. two Common-tier blooms in one bulk water. */
export type BloomEvent = BloomOccurrence & { id: string };

let bloomEventSequence = 0;

/**
 * Stamps a batch of raw occurrences (already in the order they should be
 * presented) with stable ids. Takes a batch rather than one at a time so
 * bulk watering's several simultaneous blooms get their ids assigned
 * together, in bloom order, rather than interleaving with ids from an
 * unrelated individual water/fertilize action that happens to land the
 * same millisecond.
 */
export function makeBloomEvents(occurrences: readonly BloomOccurrence[]): BloomEvent[] {
    return occurrences.map(occurrence => ({ ...occurrence, id: `bloom-${Date.now()}-${bloomEventSequence++}` }));
}

// Word Sprout ships 7 plant rarity tiers (plantsCatalog.ts) but WSP-2.1's
// reward-intensity scale only has 5 levels -- this is an explicit mapping,
// not a heuristic, so a future 8th tier is a compile error here (see the
// Record<PlantDef["tier"], ...> type) instead of a silent fallthrough.
// Legendary and above are deliberately compressed into "exceptional":
// WSP-2.1's own spec for that level names "legendary-tier blooms" by name as
// one of the three things "exceptional" is reserved for (alongside level
// 100's milestone and the level-100/halfway/full-journey achievements) --
// Ascended and Cosmic are rarer still, so they earn nothing less than that.
const TIER_INTENSITY: Record<PlantDef["tier"], RewardIntensity> = {
    Common: "small",
    Rare: "small",
    Epic: "medium",
    Mythic: "major",
    Legendary: "exceptional",
    Ascended: "exceptional",
    Cosmic: "exceptional",
};

/**
 * Resolves a plant's rarity tier to WSP-2.1's reward-intensity scale. Falls
 * back to "small" for an unrecognized tier string rather than throwing --
 * bloom presentation is cosmetic, and a future save/build drift in the tier
 * string is a much smaller problem for players than a hard crash in the
 * Garden.
 */
export function bloomIntensity(tier: string): RewardIntensity {
    return (TIER_INTENSITY as Record<string, RewardIntensity>)[tier] ?? "small";
}
