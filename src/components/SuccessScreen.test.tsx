import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SuccessScreen from "./SuccessScreen";

function baseProps() {
    return {
        category: "Animals",
        level: 4,
        seeds: 1200,
        targetWordCount: 3,
        baseSeeds: 50,
        bonusWords: [] as string[],
        bonusSeeds: 0,
        onNextLevel: vi.fn(),
        onRestart: vi.fn(),
    };
}

describe("SuccessScreen", () => {
    afterEach(() => cleanup());

    it("shows the actual base+bonus total, not a hardcoded reward (WSP-1.2)", () => {
        render(<SuccessScreen {...baseProps()} baseSeeds={10} bonusSeeds={0} />);
        // A replay level pays REPLAY_COMPLETE_SEEDS (10), not the first-time
        // LEVEL_COMPLETE_SEEDS (50) this screen used to hardcode regardless.
        expect(screen.getByText("+10 SEEDS EARNED!")).toBeTruthy();
    });

    it("separates target words found, bonus words found, base reward, bonus reward, and total", () => {
        render(<SuccessScreen {...baseProps()} baseSeeds={50} bonusWords={["ECHO", "PRISM"]} bonusSeeds={20} />);

        expect(screen.getByText("Target words found: 3")).toBeTruthy();
        expect(screen.getByText("Bonus sprouts: 2")).toBeTruthy();
        expect(screen.getByText("ECHO · PRISM")).toBeTruthy();
        expect(screen.getByText("Base reward: +50 Seeds")).toBeTruthy();
        expect(screen.getByText("Bonus reward: +20 Seeds")).toBeTruthy();
        expect(screen.getByText("Total: +70 Seeds")).toBeTruthy();
        expect(screen.getByText("+70 SEEDS EARNED!")).toBeTruthy();
    });

    it("shows a no-bonus-words placeholder when none were found", () => {
        render(<SuccessScreen {...baseProps()} />);
        expect(screen.getByText("No bonus words this level")).toBeTruthy();
        expect(screen.getByText("Bonus sprouts: 0")).toBeTruthy();
    });
});
