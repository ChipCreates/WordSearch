// Word Sprout's shared reward-intensity hierarchy (WSP-2.1).
//
// This is the one contract that milestone presentation (WSP-2.4) and bloom
// presentation (WSP-2.6) both build against, so an "exceptional" milestone
// and an "exceptional" bloom read as comparably significant even though two
// different implementers build them independently. Don't redefine this
// scale per-feature -- import it.
//
// The five levels, low to high: routine -> small -> medium -> major ->
// exceptional. Each level below carries concrete presentation parameters
// (not just a name) precisely so two implementers converge on the same
// weight without having to re-derive intent from prose.

export type RewardIntensity = "routine" | "small" | "medium" | "major" | "exceptional";

export const REWARD_INTENSITY_LEVELS: readonly RewardIntensity[] = [
    "routine", "small", "medium", "major", "exceptional",
];

// Abstract categories, not filenames -- Tier 3 (WordSprout_1.0_Plan.md
// section 3.3) owns actually producing/assigning audio assets. Where a
// matching effect already exists (useAudio.ts), the category name says so.
export type RewardAudioCue =
    | "none"       // no dedicated cue; ordinary interaction sound is enough
    | "chime"      // quick, bright cue -- matches the existing bonus-chime (playBonusChime)
    | "award"      // matches the existing "award" SFX (useAudio.ts's SFX_FILES.award)
    | "fanfare"    // matches the existing "achievement" SFX, played fuller/louder
    | "signature"; // the Tier 3 signature motif's biggest variant (plan section 3.3)

export type ParticleIntensity = "none" | "subtle" | "moderate" | "full" | "maximal";

export type RewardPresentationSpec = {
    /** Desktop banner/overlay hang time, matching AchievementBanner's TOTAL_MS pattern. */
    desktopDurationMs: number;
    /** Mobile hang time -- shorter than desktop at every level above "routine", same
     *  reasoning as AchievementBanner's MOBILE_TOTAL_MS: a full-screen scrim reads as
     *  more intrusive per second than a small corner toast, so it must not also run longer. */
    mobileDurationMs: number;
    /** Whether a full-screen dimmed/blurred scrim applies, per platform. Desktop stays a
     *  small corner toast at the lower levels (matching AchievementBanner's current
     *  mobile-only scrim); only "major" and "exceptional" earn a desktop scrim too. */
    scrim: { mobile: boolean; desktop: boolean };
    audioCue: RewardAudioCue;
    particleIntensity: ParticleIntensity;
    /** One line of guidance a presentation implementer can build against directly. */
    note: string;
};

export const REWARD_PRESENTATION: Record<RewardIntensity, RewardPresentationSpec> = {
    routine: {
        desktopDurationMs: 2200,
        mobileDurationMs: 1600,
        scrim: { mobile: false, desktop: false },
        audioCue: "none",
        particleIntensity: "none",
        note: "First-time, one-off unlocks (e.g. \"found your first diagonal word\"). "
            + "No dedicated particle effect -- ordinary micro-interaction feedback (icon pop, "
            + "toast) is enough. Must barely interrupt play.",
    },
    small: {
        desktopDurationMs: 3500,
        mobileDurationMs: 2200,
        scrim: { mobile: false, desktop: false },
        audioCue: "chime",
        particleIntensity: "subtle",
        note: "One light, localized glow/sparkle burst -- comparable in scale to "
            + "BonusDiscoveryToast's leaf/glow burst. Maps to AchievementTier \"bronze\".",
    },
    medium: {
        desktopDurationMs: 6000,
        mobileDurationMs: 3500,
        scrim: { mobile: true, desktop: false },
        audioCue: "award",
        particleIntensity: "moderate",
        note: "A fuller glow bloom with a handful of seed/leaf particles animating outward in "
            + "a single burst. This matches AchievementBanner's current uniform default "
            + "(6000ms desktop / 3500ms mobile, mobile-only scrim). Maps to AchievementTier \"silver\".",
    },
    major: {
        desktopDurationMs: 7500,
        mobileDurationMs: 4500,
        scrim: { mobile: true, desktop: true },
        audioCue: "fanfare",
        particleIntensity: "full",
        note: "Sustained glow bloom, multi-directional particle burst, brief scrim highlight "
            + "on both platforms (desktop's is a light vignette, not full opacity). "
            + "Maps to AchievementTier \"gold\".",
    },
    exceptional: {
        desktopDurationMs: 9000,
        mobileDurationMs: 6000,
        scrim: { mobile: true, desktop: true },
        audioCue: "signature",
        particleIntensity: "maximal",
        note: "The single biggest celebratory sequence in the game -- comparable in weight to "
            + "the existing level-complete constellation animation. Reserved for level 100's "
            + "milestone, legendary-tier blooms, and the level-100/halfway/full-journey "
            + "achievements. Maps to AchievementTier \"exceptional\".",
    },
};

// --- Mapping every existing achievement onto this scale --------------------
//
// AchievementTier (src/achievements.ts) stays as its own type rather than
// being replaced: it's already load-bearing for AchievementsView's banner
// CSS classes (ws-achievement-card__banner--bronze/silver/gold/exceptional)
// and asserted directly in achievements.test.ts. Replacing it would be a
// presentation-layer change this issue isn't scoped to make. Instead: a
// straight 1:1 mapping for the ~13 achievements that already carry a tier,
// plus an explicit per-id mapping for the ~13 older achievements that
// predate the tier/family system and carry no tier at all.

import type { Achievement, AchievementTier } from "./achievements";

const TIER_TO_INTENSITY: Record<AchievementTier, RewardIntensity> = {
    bronze: "small",
    silver: "medium",
    gold: "major",
    exceptional: "exceptional",
};

// Every achievement that predates the family/tier system, classified
// individually since they have no shared tier to fall back on. Kept as an
// explicit id map, not a heuristic, so a future rename is a one-line update
// here, not a silent reclassification.
//
// WSP-2.5 update: "zenith-climber" was folded into the level-clears family
// as its new "gold" tier member (level-clears-50) -- it now gets its
// intensity from `tier` automatically via TIER_TO_INTENSITY and no longer
// needs (or has) an entry here. "daily-dew" was renamed to
// "categories-completed-10" (the id never had anything to do with daily/
// calendar logic -- it always checked uniqueCategoriesCompleted); the key
// below was updated to match, per src/persistence.ts's
// ACHIEVEMENT_ID_MIGRATIONS which keeps a player's earned unlock intact
// under the new id.
const LEGACY_ACHIEVEMENT_INTENSITY: Record<string, RewardIntensity> = {
    "night-bloomer": "routine",     // first level completed
    "petal-poet": "small",          // 8 categories
    "midnight-sun": "routine",      // first diagonal find
    "sunlight-harvester": "small",  // 5 bonus words
    "bloom-herald": "medium",       // reach a 1,000-Seed balance
    "nimble-planter": "small",      // 5 hint-free levels
    "word-weaver": "small",         // 3 bonus words in one level
    "root-master": "routine",       // first reverse find
    "solar-scribe": "routine",      // first bloom
    "verdant-voyager": "medium",    // 3 distinct rarity tiers bloomed (WSP-2.5 made this real)
    "moss-mystic": "routine",       // first power-up use
    "categories-completed-10": "small", // 10 unique categories (formerly "daily-dew")
};

/**
 * Resolves any achievement to a reward intensity. Throws for an achievement
 * with neither a `tier` nor a `LEGACY_ACHIEVEMENT_INTENSITY` entry, so a
 * future achievement added without classification fails loudly (in tests)
 * instead of silently defaulting -- see the "no achievement is left without
 * an intensity classification" requirement this type exists to satisfy.
 */
export function getAchievementIntensity(achievement: Achievement): RewardIntensity {
    if (achievement.tier) return TIER_TO_INTENSITY[achievement.tier];
    const legacy = LEGACY_ACHIEVEMENT_INTENSITY[achievement.id];
    if (!legacy) {
        throw new Error(
            `getAchievementIntensity: "${achievement.id}" has no tier and no legacy mapping -- `
            + `add it to LEGACY_ACHIEVEMENT_INTENSITY in src/rewardIntensity.ts.`,
        );
    }
    return legacy;
}
