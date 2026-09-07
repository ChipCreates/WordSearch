import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
        expect(screen.getAllByText("LEVEL", { selector: "div" }).length).toBeGreaterThan(0);
        expect(screen.queryAllByText("Daily Goal")).toHaveLength(0);
        expect(screen.queryAllByText("STREAK", { selector: "div" })).toHaveLength(0);
    });
});
