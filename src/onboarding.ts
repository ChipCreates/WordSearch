export const ONBOARDING_VERSION = 1;

export type OnboardingStepId = "play-basics" | "seeds" | "bonus" | "garden" | "store";
export type OnboardingSeen = { version: number; dismissed: Record<OnboardingStepId, boolean> };

export const ONBOARDING_STEP_IDS: OnboardingStepId[] = ["play-basics", "seeds", "bonus", "garden", "store"];

export const DEFAULT_ONBOARDING_SEEN: OnboardingSeen = {
    version: ONBOARDING_VERSION,
    dismissed: { "play-basics": false, seeds: false, bonus: false, garden: false, store: false },
};

export const COMPLETED_ONBOARDING_SEEN: OnboardingSeen = {
    version: ONBOARDING_VERSION,
    dismissed: { "play-basics": true, seeds: true, bonus: true, garden: true, store: true },
};

// Real navigation gating (see App.tsx's selectPrimaryView/openUtilityView),
// not just coachmark sequencing -- WSP-1.1 requires the Garden and the
// Store/trophy case to be genuinely unreachable before these levels, not
// merely un-taught. Deliberately equal to the onboarding steps' own
// unlockAfterLevels+1 below, so the coachmark that introduces a feature and
// the moment it actually becomes reachable are the same moment.
export const GARDEN_UNLOCK_LEVEL = 3;
export const STORE_AND_TROPHIES_UNLOCK_LEVEL = 5;

export type OnboardingStep = {
    id: OnboardingStepId;
    title: string;
    body: string;
    unlockAfterLevels: number;
    // A CSS selector for the real, live UI element this step should point
    // at (see OnboardingCoachmark.tsx) -- an anchored coachmark, never a
    // modal. When the selector can't be resolved to a currently-visible
    // element (e.g. "bonus" before this puzzle actually has a bonus goal),
    // the step simply waits rather than falling back to some default
    // position -- for "bonus" specifically, this is what makes the
    // explanation surface contextually near the player's first real bonus
    // goal instead of firing as a blanket, unprompted interruption.
    anchorSelector: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: "play-basics", unlockAfterLevels: 0,
        title: "Find words",
        body: "Drag from the first letter to the last. Words can run across, down, diagonally, or in reverse.",
        anchorSelector: '[data-onboarding-anchor~="play-basics"]',
    },
    {
        id: "seeds", unlockAfterLevels: 1,
        title: "Grow your garden",
        body: "Complete a level to earn Seeds. Your first hint each level is free.",
        anchorSelector: '[data-onboarding-anchor~="seeds"]',
    },
    {
        id: "bonus", unlockAfterLevels: 1,
        title: "Bonus sprouts",
        body: "Find any extra three-letter word in the grid to earn bonus Seeds.",
        anchorSelector: '[data-onboarding-anchor~="bonus"]',
    },
    {
        id: "garden", unlockAfterLevels: GARDEN_UNLOCK_LEVEL - 1,
        title: "Nurture a plant",
        body: "Water the starter plant every 2 hours to advance its growth toward a first bloom.",
        anchorSelector: '[data-onboarding-anchor~="garden"]',
    },
    {
        id: "store", unlockAfterLevels: STORE_AND_TROPHIES_UNLOCK_LEVEL - 1,
        title: "Seed Store & Trophy Case",
        body: "The full Seed Store and your Trophy Case just unlocked -- spend Seeds on power-ups and collectibles.",
        anchorSelector: '[data-onboarding-anchor~="store"]',
    },
];

export function nextOnboardingStep(levelsCompleted: number, seen: OnboardingSeen): OnboardingStep | null {
    return ONBOARDING_STEPS.find(step => step.unlockAfterLevels <= levelsCompleted && !seen.dismissed[step.id]) ?? null;
}

/**
 * Defends against a save whose onboardingSeen is present but malformed (the
 * wrong shape, or missing/wrong-typed dismissed entries) -- callers like
 * `Object.values(seen.dismissed)` would throw on a missing/non-object
 * `dismissed`, silently crashing rather than just replaying onboarding.
 */
export function normalizeOnboardingSeen(raw: unknown): OnboardingSeen {
    if (!raw || typeof raw !== "object") return DEFAULT_ONBOARDING_SEEN;
    const candidate = raw as Partial<OnboardingSeen>;
    const rawDismissed = candidate.dismissed && typeof candidate.dismissed === "object" ? candidate.dismissed : {};
    const dismissed = Object.fromEntries(
        ONBOARDING_STEP_IDS.map(id => [id, Boolean((rawDismissed as Record<string, unknown>)[id])]),
    ) as Record<OnboardingStepId, boolean>;
    const version = typeof candidate.version === "number" ? candidate.version : ONBOARDING_VERSION;
    return { version, dismissed };
}
