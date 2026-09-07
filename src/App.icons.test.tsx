import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

describe("Icon System Migration", () => {
    it("renders App with zero material-symbols-outlined elements", () => {
        const { container } = render(<App />);
        const materialSymbolsElements = container.querySelectorAll(".material-symbols-outlined");
        expect(materialSymbolsElements.length).toBe(0);
    });

    it("describes the current puzzle as a level goal, not a daily goal or streak", () => {
        render(<App />);

        expect(screen.getAllByText("Level Goal").length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Find all \d+ target words/).length).toBeGreaterThan(0);
        expect(document.querySelector(".ws-level-goal-card__level")).toBeTruthy();
        expect(screen.queryAllByText("Daily Goal")).toHaveLength(0);
        expect(screen.queryAllByText("STREAK", { selector: "div" })).toHaveLength(0);
    });

    it("exposes the canvas puzzle with keyboard instructions and semantic cells", async () => {
        const { container } = render(<App />);

        const canvas = container.querySelector('canvas[role="application"]');
        expect(canvas).not.toBeNull();
        expect(canvas?.getAttribute("tabindex")).toBe("0");
        expect(canvas?.getAttribute("aria-describedby")).toBe("word-grid-instructions word-grid-live");
        expect(container.querySelector('[role="grid"][aria-label="Word search letters"]')).toBeTruthy();
        await waitFor(() => expect(container.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0));
        expect(container.textContent).toContain("Use arrow keys to focus a cell");
    });
});
