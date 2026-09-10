import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OnboardingCoachmark from "./OnboardingCoachmark";
import type { OnboardingStep } from "../onboarding";

function makeSteps(): OnboardingStep[] {
    return [
        {
            id: "bonus", unlockAfterLevels: 1,
            title: "Bonus sprouts", body: "Find any extra word.",
            anchorSelector: '[data-onboarding-anchor~="bonus"]',
        },
        {
            id: "garden", unlockAfterLevels: 2,
            title: "Nurture a plant", body: "Water it.",
            anchorSelector: '[data-onboarding-anchor~="garden"]',
        },
    ];
}

describe("OnboardingCoachmark", () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
        vi.unstubAllGlobals();
    });

    it("skips a pending step whose anchor doesn't exist at all, and shows the next eligible one", async () => {
        document.body.innerHTML = '<button data-onboarding-anchor="garden">Garden</button>';
        render(<OnboardingCoachmark steps={makeSteps()} onDismiss={() => {}} />);

        expect(await screen.findByText("Nurture a plant")).toBeTruthy();
        expect(screen.queryByText("Bonus sprouts")).toBeNull();
    });

    it("shows the first step when its anchor exists, even under jsdom's always-zero-size rects", async () => {
        document.body.innerHTML = `
            <div data-onboarding-anchor="bonus">bonus banner</div>
            <button data-onboarding-anchor="garden">Garden</button>
        `;
        render(<OnboardingCoachmark steps={makeSteps()} onDismiss={() => {}} />);

        expect(await screen.findByText("Bonus sprouts")).toBeTruthy();
    });

    // WSP-1.4 regression: the mobile layout hides the whole card holding
    // "bonus"'s anchor via `display: none` (App.css's max-width:767px rule)
    // rather than never rendering it -- a real browser reports a zero-size
    // rect for that, same shape as jsdom's always-zero rects. Without
    // distinguishing the two, the coachmark rendered pinned to (0,0) instead
    // of moving on to "garden". Stubbing navigator.userAgent to a real
    // (non-jsdom) value is enough on its own now -- isJsdomEnvironment()
    // reads it fresh on every call rather than caching it at module load.
    it("in a real browser, treats a present-but-zero-size anchor as unusable and moves to the next step", async () => {
        vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36" });
        document.body.innerHTML = `
            <div data-onboarding-anchor="bonus" style="display:none">bonus banner</div>
            <button data-onboarding-anchor="garden">Garden</button>
        `;
        // jsdom has no layout engine and reports a zero rect for every
        // element regardless of styling -- stubbing a real, positive-size
        // rect on just "garden" is what actually simulates "a real browser
        // where this one is visible and 'bonus' (never stubbed, so still
        // zero) genuinely isn't."
        document.querySelector('[data-onboarding-anchor="garden"]')!.getBoundingClientRect = () =>
            ({ top: 40, left: 40, width: 100, height: 40, right: 140, bottom: 80, x: 40, y: 40, toJSON: () => {} } as DOMRect);
        render(<OnboardingCoachmark steps={makeSteps()} onDismiss={() => {}} />);

        expect(await screen.findByText("Nurture a plant")).toBeTruthy();
        expect(screen.queryByText("Bonus sprouts")).toBeNull();
    });

    it("dismisses the step actually being shown, not necessarily the first in the list", async () => {
        document.body.innerHTML = '<button data-onboarding-anchor="garden">Garden</button>';
        const onDismiss = vi.fn();
        render(<OnboardingCoachmark steps={makeSteps()} onDismiss={onDismiss} />);

        const dismissButton = await screen.findByRole("button", { name: "Got it" });
        dismissButton.click();
        expect(onDismiss).toHaveBeenCalledWith("garden");
    });

    it("renders nothing when no pending step has a resolvable anchor", async () => {
        document.body.innerHTML = "";
        render(<OnboardingCoachmark steps={makeSteps()} onDismiss={() => {}} />);
        expect(screen.queryByRole("status")).toBeNull();
    });
});
