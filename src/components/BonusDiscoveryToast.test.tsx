import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BonusDiscoveryToast from "./BonusDiscoveryToast";

describe("BonusDiscoveryToast", () => {
    afterEach(() => cleanup());

    it("renders the bonus find as a non-modal status toast", () => {
        document.body.innerHTML = '<div class="ws-game-board-panel"></div>';
        render(<BonusDiscoveryToast word="SPARROW" seeds={10} />);

        const toast = screen.getByRole("status");
        expect(toast.textContent).toContain("Bonus Sprout!");
        expect(toast.textContent).toContain("SPARROW");
        expect(toast.textContent).toContain("+10 Seeds");
    });

    it("renders nothing when the board panel it anchors to isn't mounted", () => {
        document.body.innerHTML = "";
        render(<BonusDiscoveryToast word="SPARROW" seeds={10} />);
        expect(screen.queryByRole("status")).toBeNull();
    });

    it("mentions the earned Garden Remedy when the bonus word was garden vocabulary", () => {
        document.body.innerHTML = '<div class="ws-game-board-panel"></div>';
        render(<BonusDiscoveryToast word="SOIL" seeds={10} earnedRemedy />);
        expect(screen.getByRole("status").textContent).toContain("Garden Remedy");
    });

    it("says nothing about a remedy when none was earned", () => {
        document.body.innerHTML = '<div class="ws-game-board-panel"></div>';
        render(<BonusDiscoveryToast word="SPARROW" seeds={10} earnedRemedy={false} />);
        expect(screen.getByRole("status").textContent).not.toContain("Garden Remedy");
    });
});
