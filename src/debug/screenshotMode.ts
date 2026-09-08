// Rebindable hotkey that hides every piece of debug UI (panel, banner,
// floating toggle) without touching game state -- lets a developer dial in
// a state with the debug panel, hide it, and grab a clean screenshot.
//
// Stored under its own localStorage key, deliberately separate from
// `word_sprout_save_v1` (see persistence.ts) -- rebinding this must never
// touch, migrate, or risk the real save schema.

export type HotkeyCombo = {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    key: string;
};

export const DEFAULT_SCREENSHOT_HOTKEY: HotkeyCombo = { ctrl: true, alt: false, shift: true, key: "h" };

const STORAGE_KEY = "wordsprout.debug.screenshotHotkey";

function isHotkeyCombo(value: unknown): value is HotkeyCombo {
    return !!value && typeof value === "object"
        && typeof (value as HotkeyCombo).ctrl === "boolean"
        && typeof (value as HotkeyCombo).alt === "boolean"
        && typeof (value as HotkeyCombo).shift === "boolean"
        && typeof (value as HotkeyCombo).key === "string"
        && (value as HotkeyCombo).key.length > 0;
}

export function loadScreenshotHotkey(): HotkeyCombo {
    if (typeof window === "undefined") return DEFAULT_SCREENSHOT_HOTKEY;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SCREENSHOT_HOTKEY;
        const parsed = JSON.parse(raw);
        return isHotkeyCombo(parsed) ? parsed : DEFAULT_SCREENSHOT_HOTKEY;
    } catch {
        return DEFAULT_SCREENSHOT_HOTKEY;
    }
}

export function saveScreenshotHotkey(combo: HotkeyCombo): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(combo));
}

// Modifier keys on their own (pressing just "Control") arrive with e.key
// equal to "Control"/"Shift"/"Alt" -- not a usable combo, since every combo
// needs a non-modifier key to land on.
const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

export function comboFromEvent(e: KeyboardEvent): HotkeyCombo | null {
    if (MODIFIER_KEYS.has(e.key)) return null;
    return { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, key: e.key.toLowerCase() };
}

export function comboMatches(combo: HotkeyCombo, e: KeyboardEvent): boolean {
    return combo.ctrl === e.ctrlKey
        && combo.alt === e.altKey
        && combo.shift === e.shiftKey
        && combo.key === e.key.toLowerCase();
}

export function describeCombo(combo: HotkeyCombo): string {
    const parts: string[] = [];
    if (combo.ctrl) parts.push("Ctrl");
    if (combo.alt) parts.push("Alt");
    if (combo.shift) parts.push("Shift");
    parts.push(combo.key.length === 1 ? combo.key.toUpperCase() : combo.key);
    return parts.join("+");
}
