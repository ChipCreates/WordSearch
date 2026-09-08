import { afterEach, describe, expect, it } from "vitest";
import { isDebugBuild, isDebugModeRequested } from "./debugMode";

describe("debugMode", () => {
    afterEach(() => {
        window.history.pushState(null, "", "/");
    });

    it("is a dev build under the vitest toolchain", () => {
        expect(isDebugBuild()).toBe(true);
    });

    it("requires the exact debug=true query flag", () => {
        window.history.pushState(null, "", "/?debug=true");
        expect(isDebugModeRequested()).toBe(true);

        window.history.pushState(null, "", "/?debug=false");
        expect(isDebugModeRequested()).toBe(false);

        window.history.pushState(null, "", "/?debug=1");
        expect(isDebugModeRequested()).toBe(false);

        window.history.pushState(null, "", "/");
        expect(isDebugModeRequested()).toBe(false);
    });
});
