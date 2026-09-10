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
});
