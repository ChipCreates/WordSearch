import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import LevelsView, { shouldUseHighResLevelArt } from "./LevelsView";

const orientation = vi.hoisted(() => ({ landscape: false }));
vi.mock("@mui/material", () => ({ useMediaQuery: () => orientation.landscape }));

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(800);
    vi.stubGlobal("ResizeObserver", class {
        observe() {}
        disconnect() {}
    });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each([false, true])("continuous trail, landscape=%s", landscape => {
    it("shows levels across the former chapter boundary without pagination", () => {
        orientation.landscape = landscape;
        render(<LevelsView currentLevel={20} onSelectLevel={() => {}} />);
        expect(screen.queryByRole("navigation", { name: "Trail chapters" })).toBeNull();
        expect(screen.getByRole("button", { name: "Level 20, current" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Level 21, locked" })).toBeTruthy();
    });

    it("composes all approved regions into one orientation-aware scrolling surface", () => {
        orientation.landscape = landscape;
        const { container } = render(<LevelsView currentLevel={1} onSelectLevel={() => {}} />);
        const map = container.querySelector<HTMLElement>(".ws-trail__map")!;
        const dimension = landscape ? "width" : "height";
        const regions = [...container.querySelectorAll<HTMLElement>(".ws-trail__region")];
        expect(parseFloat(map.style[dimension])).toBeGreaterThan(800);
        expect(regions).toHaveLength(6);
        const firstTile = regions[0].querySelector<HTMLElement>(".ws-trail__tile");
        expect(firstTile?.style.backgroundImage).toContain(landscape ? "-landscape.webp" : "-portrait.webp");
        expect(regions[0].querySelectorAll(".ws-trail__tile").length).toBeGreaterThan(1);
        const transitions = [...container.querySelectorAll<HTMLElement>(".ws-trail__transition-pano")];
        expect(transitions).toHaveLength(5);
        expect(transitions[0].style.backgroundImage).toContain(landscape ? "-landscape.webp" : "-portrait.webp");
        expect(screen.getByRole("button", { name: "Level 2, locked" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Level 100, locked" })).toBeTruthy();
    });
});

describe("level art resolution selection", () => {
    it("selects 3x art for 4K displays even when OS scaling changes CSS pixels", () => {
        expect(shouldUseHighResLevelArt(3840, 2160, 1)).toBe(true);
        expect(shouldUseHighResLevelArt(2560, 1440, 1.5)).toBe(true);
    });

    it("keeps standard art on lower-resolution mobile displays", () => {
        expect(shouldUseHighResLevelArt(430, 932, 3)).toBe(false);
    });
});
