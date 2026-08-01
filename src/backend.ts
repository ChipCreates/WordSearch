// The Tauri desktop/Android builds get puzzle words and bonus-word
// validation from Rust (src-tauri/src/categories.rs, dictionary.rs) over
// IPC. A plain web build has no Tauri runtime to call into, so this module
// picks between that real IPC call and a local-JS equivalent at runtime,
// based on whether the Tauri bridge is actually present -- same behavior
// either way, from the caller's perspective. webCategories.json and
// public/dictionary.json are generated directly from the Rust source (see
// the conversion step in the web-target setup) to guarantee they stay in
// exact sync with what the Tauri build ships.
import webCategoriesData from "./webCategories.json";

export type Puzzle = { category: string; words: string[] };

function isTauri(): boolean {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// array.sort(() => Math.random() - 0.5) is a well-known-biased shuffle;
// Fisher-Yates is the correct way to get every ordering with equal
// probability (mirrors the fix already applied to word placement).
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const WEB_CATEGORIES: { name: string; words: string[] }[] = webCategoriesData;

let dictionaryPromise: Promise<Set<string>> | null = null;
function loadDictionary(): Promise<Set<string>> {
    if (!dictionaryPromise) {
        dictionaryPromise = fetch(`${import.meta.env.BASE_URL}dictionary.json`)
            .then(r => r.json())
            .then((words: string[]) => new Set(words));
    }
    return dictionaryPromise;
}
// Kick off the fetch as soon as this module loads in a web build, so it's
// likely already resolved by the time a bonus word needs checking.
if (!isTauri()) {
    loadDictionary();
}

export async function getPuzzleWords(count: number, maxLength: number, level: number): Promise<Puzzle> {
    if (isTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");
        return invoke("get_puzzle_words", { count, maxLength, level });
    }
    const category = WEB_CATEGORIES[(level - 1) % WEB_CATEGORIES.length];
    const validWords = category.words.filter(w => w.length <= maxLength);
    const words = shuffle(validWords).slice(0, count);
    return { category: category.name, words };
}

export async function validateWord(word: string): Promise<boolean> {
    if (isTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");
        return invoke("validate_word", { word });
    }
    const dictionary = await loadDictionary();
    return dictionary.has(word);
}
