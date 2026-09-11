// Word Sprout's milestone campaign moments (WSP-2.4).
//
// Distinct from BotanistPromotionCeremony (rank promotions, roughly every
// 3-4 levels -- a much more frequent, separate system) and from
// SuccessScreen (the per-level completion summary that shows every single
// time). A milestone is a once-per-save, standalone "you've come this far"
// beat at seven specific levels the plan calls out by name.
//
// "Progress indefinitely" past level 100 is scoped precisely here, not
// loosely: Botanist Rank tops out at Cosmic Conservator (level 41, no rank
// beyond it -- see src/botanistRanks.ts) and achievements are a finite list
// (src/achievements.ts) -- neither "unlocks forever." What actually
// continues without limit is puzzle generation itself, the level/frontier
// counter, and lifetime stats (Seeds, bonus words, plants bloomed, ...).
// Level 100's copy below says so explicitly rather than implying otherwise.

import type { RewardIntensity } from "./rewardIntensity";

export const MILESTONE_LEVELS: readonly number[] = [10, 20, 30, 40, 50, 70, 100];

export function isMilestoneLevel(level: number): boolean {
    return MILESTONE_LEVELS.includes(level);
}

export type MilestoneContent = {
    level: number;
    title: string;
    subtitle: string;
    body: string;
    /** WSP-2.1's shared reward-intensity scale -- level 100 is the only
     *  "exceptional" milestone; the rest step up progressively rather than
     *  all reading as the same weight of moment. */
    intensity: RewardIntensity;
};

// Copy intentionally references only ambient theme *keys* (regions.ts) and
// existing systems -- no new art/audio direction here, that's Tier 3's job
// (see WordSprout_1.0_Plan.md sections 3.1-3.3).
const MILESTONE_CONTENT: Record<number, MilestoneContent> = {
    10: {
        level: 10, title: "Ten Levels In", subtitle: "Roots are taking hold",
        body: "Ten puzzles solved. The Glowing Grove still has plenty left to show you.",
        intensity: "small",
    },
    20: {
        level: 20, title: "The Glowing Grove Blooms", subtitle: "First region complete",
        body: "Every puzzle the Grove had to offer, found. Sunlit Falls is next.",
        intensity: "medium",
    },
    30: {
        level: 30, title: "Sunlit Falls Behind You", subtitle: "Second region complete",
        body: "Confidence earned in the light. The Crystal Conservatory awaits ahead.",
        intensity: "medium",
    },
    40: {
        level: 40, title: "The Crystal Conservatory Settles", subtitle: "Third region complete",
        body: "Rarer words, sharper focus. Onward into Mosswood Hollows.",
        intensity: "medium",
    },
    50: {
        level: 50, title: "Halfway to the Beyond", subtitle: "Level 50 -- the journey's midpoint",
        body: "Fifty levels of patient searching. The path ahead is exactly as wide as the one behind you.",
        intensity: "major",
    },
    70: {
        level: 70, title: "Cloudreach Summit Conquered", subtitle: "Fifth region complete",
        body: "The air is thin and the words are long up here. The Verdant Beyond opens below -- the final stretch of the mapped trail.",
        intensity: "major",
    },
    100: {
        level: 100, title: "The Verdant Beyond Blooms", subtitle: "The journey's summit",
        // Explicit, per WSP-2.4's acceptance criteria: this is not an
        // ending. Botanist Rank and achievements are finite by design and
        // this copy doesn't pretend otherwise -- what keeps going is the
        // puzzles themselves, the level counter, and your Garden.
        body: "One hundred levels of patient searching, and the Grove still has more to give. "
            + "Your garden keeps growing, your record keeps counting, and there are always more "
            + "words to find. This isn't the end of the trail -- it's just how far it's been mapped so far.",
        intensity: "exceptional",
    },
};

export function getMilestoneContent(level: number): MilestoneContent | undefined {
    return MILESTONE_CONTENT[level];
}

// Region-transition presentation (also WSP-2.4) shares this module rather
// than getting a second scattered home, since it's tuned by the same
// intensity contract. Region transitions get a fixed, deliberately short
// (3-6s) duration regardless of intensity -- unlike milestones, which use
// WSP-2.1's own per-intensity duration directly (see
// src/rewardIntensity.ts's REWARD_PRESENTATION) so level 100 can hold the
// screen as long as an "exceptional" moment warrants. The intensity here
// still governs everything else (scrim, audio cue, particle weight) --
// completion reads as a bigger moment than merely entering a new region.
export type RegionTransitionKind = "entry" | "completion";

export function getRegionTransitionIntensity(kind: RegionTransitionKind): RewardIntensity {
    return kind === "completion" ? "medium" : "small";
}

export const REGION_TRANSITION_DURATION_MS = {
    desktop: 5500,
    mobile: 3800,
} as const;
