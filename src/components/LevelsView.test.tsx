import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LevelsView from "./LevelsView";

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

    it("extends the same scrolling surface near its end without resetting position", () => {
        orientation.landscape = landscape;
        const { container } = render(<LevelsView currentLevel={1} onSelectLevel={() => {}} />);
        const scroller = screen.getByLabelText("Scroll through levels");
        const map = container.querySelector<HTMLElement>(".ws-trail__map")!;
        const dimension = landscape ? "width" : "height";
        const axis = landscape ? "scrollLeft" : "scrollTop";
        const initialLength = parseFloat(map.style[dimension]);
        scroller[axis] = initialLength - 800;
        fireEvent.scroll(scroller);
        expect(parseFloat(map.style[dimension])).toBeGreaterThan(initialLength);
        expect(scroller[axis]).toBe(initialLength - 800);
        // Rendering stays bounded even while the trail grows.
        expect(container.querySelectorAll(".ws-trail__node").length).toBeLessThan(50);
        scroller[axis] = 0;
        fireEvent.scroll(scroller);
        expect(screen.getByRole("button", { name: "Level 2, locked" })).toBeTruthy();
    });
});
