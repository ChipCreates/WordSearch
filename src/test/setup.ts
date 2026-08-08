import { vi, beforeEach } from "vitest";

// Mock fetch for backend dictionary loading in node/jsdom environment
globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (typeof url === "string" && url.includes("dictionary.json")) {
        return Promise.resolve({
            ok: true,
            json: async () => [],
        } as Response);
    }
    return Promise.resolve({
        ok: true,
        json: async () => ({}),
    } as Response);
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
