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
export type Tier = "easy" | "standard" | "challenging";

type CategoryData = { name: string; tier: Tier; words: string[] };

function isTauri(): boolean {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// array.sort(() => Math.random() - 0.5) is a well-known-biased shuffle;
// Fisher-Yates is the correct way to get every ordering with equal
// probability (mirrors the fix already applied to word placement).
function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
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
export const MAX_TARGET_WORD_LENGTH = Math.max(
    ...WEB_CATEGORIES.flatMap(category => category.words.map(word => word.length)),
);

function webPool(tier: Tier): CategoryData[] {
    return WEB_CATEGORIES.filter(c => c.tier === tier);
}

// Names only, per tier, in the same order getPuzzleWords indexes into --
// used to backfill categoriesSeen for players whose `level` was already
// advanced before that counter (and difficulty modes) existed.
export const CATEGORY_NAMES_BY_TIER: Record<Tier, string[]> = {
    easy: webPool("easy").map(c => c.name),
    standard: webPool("standard").map(c => c.name),
    challenging: webPool("challenging").map(c => c.name),
};

// Every category with its tier, for UI that lets a player browse/select
// from the full set regardless of which tier it belongs to (the custom
// "favorite categories" picker).
export const ALL_CATEGORIES: { name: string; tier: Tier }[] = WEB_CATEGORIES.map(c => ({ name: c.name, tier: c.tier }));

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

export type PuzzleRequest = {
    count: number;
    maxLength: number;
    level: number;
    tier: Tier;
    // When set, pulls from this exact category (used by the "favorite
    // categories" custom mode) instead of cycling through `tier`'s pool.
    categoryName?: string;
    // Words shown in this category's last puzzle -- excluded from the
    // candidate pool where possible so picking the same small handful of
    // favorite categories over and over doesn't immediately repeat words,
    // without needing to persist any history for it.
    excludeWords?: string[];
    // Web path only (the Tauri/native path always uses its own Rust-side
    // randomness). Lets a caller make word *selection* reproducible from a
    // seed, not just generatePuzzle's own placement rng -- the puzzle audit
    // script (scripts/audit-puzzles.ts) needs both to fully reproduce a
    // reported board from its seed alone.
    rng?: () => number;
};

export async function getPuzzleWords(req: PuzzleRequest): Promise<Puzzle> {
    if (isTauri()) {
        return invoke("get_puzzle_words", {
            count: req.count,
            maxLength: req.maxLength,
            level: req.level,
            tier: req.tier,
            categoryName: req.categoryName ?? null,
            excludeWords: req.excludeWords ?? [],
        });
    }
    const category = req.categoryName
        ? WEB_CATEGORIES.find(c => c.name === req.categoryName)
        : webPool(req.tier)[(req.level - 1) % webPool(req.tier).length];
    if (!category) return { category: "", words: [] };

    const exclude = new Set(req.excludeWords ?? []);
    const candidates = category.words.filter(w => w.length <= req.maxLength);
    const fresh = candidates.filter(w => !exclude.has(w));
    const pool = fresh.length >= req.count ? fresh : candidates;
    const words = shuffle(pool, req.rng).slice(0, req.count);
    return { category: category.name, words };
}

export async function validateWord(word: string): Promise<boolean> {
    if (isTauri()) {
        return invoke("validate_word", { word });
    }
    const dictionary = await loadDictionary();
    return dictionary.has(word);
}
