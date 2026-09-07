import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("./components/LevelsView", () => new Promise(() => undefined));

describe("localized lazy-loading boundaries", () => {
    it("keeps the application navigation mounted while Levels is pending", () => {
        render(<App />);

        fireEvent.click(screen.getByRole("button", { name: "Got it" }));
        fireEvent.click(screen.getAllByRole("button", { name: /levels/i })[0]);

        expect(screen.getByRole("status", { name: "Loading levels" })).toBeTruthy();
        expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
        expect(screen.getAllByRole("button", { name: /play/i }).length).toBeGreaterThan(0);
    });
});
