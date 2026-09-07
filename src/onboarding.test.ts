import { describe, expect, it } from "vitest";
import { COMPLETED_ONBOARDING_SEEN, DEFAULT_ONBOARDING_SEEN, nextOnboardingStep } from "./onboarding";

describe("onboarding cadence", () => {
    it("starts with play basics and advances by completion milestones", () => {
        expect(nextOnboardingStep(0, DEFAULT_ONBOARDING_SEEN)?.id).toBe("play-basics");
        expect(nextOnboardingStep(1, { ...DEFAULT_ONBOARDING_SEEN, dismissed: { ...DEFAULT_ONBOARDING_SEEN.dismissed, "play-basics": true } })?.id).toBe("seeds");
        expect(nextOnboardingStep(4, COMPLETED_ONBOARDING_SEEN)).toBeNull();
    });

    it("does not force a returning player through acknowledged steps", () => {
        const seen = { ...DEFAULT_ONBOARDING_SEEN, dismissed: { ...DEFAULT_ONBOARDING_SEEN.dismissed, "play-basics": true } };
        expect(nextOnboardingStep(0, seen)).toBeNull();
    });
});
