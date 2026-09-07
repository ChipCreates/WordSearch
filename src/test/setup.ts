import { vi, beforeEach } from "vitest";

// Polyfill document.fonts for jsdom
if (typeof document !== "undefined" && !document.fonts) {
    Object.defineProperty(document, "fonts", {
        value: {
            ready: Promise.resolve(),
        },
        writable: true,
    });
}

if (typeof window !== "undefined") {
    if (!window.ResizeObserver) {
        window.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    }
    if (typeof HTMLCanvasElement !== "undefined") {
        // jsdom defines getContext(), but its implementation intentionally
        // logs a warning and returns null unless the optional native canvas
        // package is installed. GameCanvas only needs this small 2D surface
        // for deterministic interaction tests, so replace the warning path
        // rather than hiding console output in individual tests.
        HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
            clearRect: () => {},
            fillRect: () => {},
            fillText: () => {},
            strokeText: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            fill: () => {},
            save: () => {},
            restore: () => {},
            scale: () => {},
            translate: () => {},
            rotate: () => {},
            arc: () => {},
            setTransform: () => {},
            measureText: () => ({ width: 10 } as TextMetrics),
        })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    }
}

// Mock fetch for backend dictionary loading and audio assets in node/jsdom environment
globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (typeof url === "string" && url.includes("dictionary.json")) {
        return Promise.resolve({
            ok: true,
            json: async () => [],
            blob: async () => new Blob([]),
        } as unknown as Response);
    }
    return Promise.resolve({
        ok: true,
        json: async () => ({}),
        blob: async () => new Blob([]),
    } as unknown as Response);
});

// Polyfill/mock localStorage for unit tests
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
    getItem: (key: string) => localStorageStore[key] ?? null,
    setItem: (key: string, value: string) => {
        localStorageStore[key] = value.toString();
    },
    removeItem: (key: string) => {
        delete localStorageStore[key];
    },
    clear: () => {
        Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);
    },
    get length() {
        return Object.keys(localStorageStore).length;
    },
    key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
};

Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
});

beforeEach(() => {
    window.localStorage.clear();
});
