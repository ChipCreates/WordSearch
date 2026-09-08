import { beforeEach, describe, expect, it } from "vitest";
import {
    DEFAULT_SCREENSHOT_HOTKEY, loadScreenshotHotkey, saveScreenshotHotkey,
    comboFromEvent, comboMatches, describeCombo, type HotkeyCombo,
} from "./screenshotMode";

function keyEvent(init: KeyboardEventInit & { key: string }): KeyboardEvent {
    return new KeyboardEvent("keydown", init);
}

describe("screenshotMode", () => {
    beforeEach(() => localStorage.clear());

    it("defaults to Ctrl+Shift+H", () => {
        expect(loadScreenshotHotkey()).toEqual(DEFAULT_SCREENSHOT_HOTKEY);
        expect(describeCombo(DEFAULT_SCREENSHOT_HOTKEY)).toBe("Ctrl+Shift+H");
    });

    it("round-trips a rebound combo through its own storage key", () => {
        const combo: HotkeyCombo = { ctrl: false, alt: true, shift: true, key: "s" };
        saveScreenshotHotkey(combo);
        expect(loadScreenshotHotkey()).toEqual(combo);
    });

    it("falls back to the default when storage is empty or corrupt", () => {
        expect(loadScreenshotHotkey()).toEqual(DEFAULT_SCREENSHOT_HOTKEY);
        localStorage.setItem("wordsprout.debug.screenshotHotkey", "not json");
        expect(loadScreenshotHotkey()).toEqual(DEFAULT_SCREENSHOT_HOTKEY);
    });

    it("ignores a bare modifier press when capturing a combo", () => {
        expect(comboFromEvent(keyEvent({ key: "Control", ctrlKey: true }))).toBeNull();
    });

    it("builds a lowercase-keyed combo from a real keydown event", () => {
        const combo = comboFromEvent(keyEvent({ key: "H", ctrlKey: true, shiftKey: true }));
        expect(combo).toEqual({ ctrl: true, alt: false, shift: true, key: "h" });
    });

    it("matches events against a stored combo regardless of key casing", () => {
        expect(comboMatches(DEFAULT_SCREENSHOT_HOTKEY, keyEvent({ key: "H", ctrlKey: true, shiftKey: true }))).toBe(true);
        expect(comboMatches(DEFAULT_SCREENSHOT_HOTKEY, keyEvent({ key: "h", ctrlKey: true, shiftKey: false }))).toBe(false);
    });

    it("never touches the real save's localStorage key", () => {
        saveScreenshotHotkey({ ctrl: true, alt: true, shift: false, key: "x" });
        expect(localStorage.getItem("word_sprout_save_v1")).toBeNull();
    });
});
