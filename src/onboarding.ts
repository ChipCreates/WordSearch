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

export type OnboardingStep = { id: OnboardingStepId; title: string; body: string; unlockAfterLevels: number };

export const ONBOARDING_STEPS: OnboardingStep[] = [
    { id: "play-basics", title: "Find words", body: "Drag from the first letter to the last. Words can run across, down, diagonally, or in reverse.", unlockAfterLevels: 0 },
    { id: "seeds", title: "Grow your garden", body: "Complete a level to earn Seeds. Your first hint each level is free.", unlockAfterLevels: 1 },
    { id: "bonus", title: "Bonus sprouts", body: "Find any extra three-letter word in the grid to earn bonus Seeds.", unlockAfterLevels: 1 },
    { id: "garden", title: "Nurture a plant", body: "Water the starter plant every 2 hours to advance its growth toward a first bloom.", unlockAfterLevels: 2 },
    { id: "store", title: "Use the Seed Store", body: "At Level 5, the full Seed Store unlocks with charge-based power-ups and collection items.", unlockAfterLevels: 4 },
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
