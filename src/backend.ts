import { invoke } from "@tauri-apps/api/core";

// The Tauri desktop/Android builds get puzzle words and bonus-word
// validation from Rust (src-tauri/src/categories/, dictionary.rs) over IPC.
// A plain web build has no Tauri runtime to call into, so this module picks
// between that real IPC call and a local-JS equivalent at runtime, based on
// whether the Tauri bridge is actually present -- same behavior either way,
// from the caller's perspective. src/categories/*.json and
// public/dictionary.json are generated directly from the same source data
// (scripts/gen_categories.py, the dictionary's earlier equivalent) to
// guarantee they stay in exact sync with what the Tauri build ships.
export type Puzzle = { category: string; words: string[] };
export type Tier = "standard" | "challenging";

type CategoryData = { name: string; tier: Tier; words: string[] };

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

// Eager + import:'default' so this is a plain array available synchronously
// at module load, keyed by nothing but file path -- glob returns entries
// sorted alphabetically by path, which is what scripts/gen_categories.py's
// Rust output also sorts by (per tier), so the same level number lands on
// the same category on both platforms. Adding a category is just a new
// generated .json file here; this loop picks it up with no code change.
const categoryModules = import.meta.glob("./categories/*.json", { eager: true, import: "default" }) as Record<string, CategoryData>;
const WEB_CATEGORIES: CategoryData[] = Object.keys(categoryModules)
    .sort()
    .map(k => categoryModules[k]);

export const CATEGORY_NAMES: string[] = WEB_CATEGORIES.map(c => c.name);

function webPool(tier: Tier): CategoryData[] {
    return WEB_CATEGORIES.filter(c => c.tier === tier);
}

// Names only, per tier, in the same order getPuzzleWords indexes into --
// used to backfill categoriesSeen for players whose `level` was already
// advanced before that counter (and difficulty modes) existed.
export const CATEGORY_NAMES_BY_TIER: Record<Tier, string[]> = {
    standard: webPool("standard").map(c => c.name),
    challenging: webPool("challenging").map(c => c.name),
};

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

export async function getPuzzleWords(count: number, maxLength: number, level: number, tier: Tier): Promise<Puzzle> {
    if (isTauri()) {
        return invoke("get_puzzle_words", { count, maxLength, level, tier });
    }
    const pool = webPool(tier);
    const category = pool[(level - 1) % pool.length];
    const validWords = category.words.filter(w => w.length <= maxLength);
    const words = shuffle(validWords).slice(0, count);
    return { category: category.name, words };
}

export async function validateWord(word: string): Promise<boolean> {
    if (isTauri()) {
        return invoke("validate_word", { word });
    }
    const dictionary = await loadDictionary();
    return dictionary.has(word);
}
