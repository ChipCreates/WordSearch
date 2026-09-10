import gardeningCategory from "./categories/gardening.json";

// Domain state for garden diseases/infestations. Deliberately separate from
// plantHealth.ts, which stays presentation-only (sprite lookup) per its own
// docstring -- this module owns whether and why a plant is sick, and never
// touches art.
export type AfflictionType = "blight" | "mildew" | "aphids" | "slugs";

export type PlantAffliction = {
    type: AfflictionType;
    severity: 1 | 2 | 3;
    puzzlesSinceOnset: number;
};

export type AfflictionState = Record<string /* plantId */, PlantAffliction>;

export type AfflictionDefinition = { name: string; description: string };

export const AFFLICTION_DEFINITIONS: Record<AfflictionType, AfflictionDefinition> = {
    blight: { name: "Blight", description: "Dark blotches are spreading across the leaves." },
    mildew: { name: "Powdery Mildew", description: "A dusty white coating is dulling the leaves." },
    aphids: { name: "Aphids", description: "Aphids have moved in and are multiplying." },
    slugs: { name: "Slugs", description: "Slugs are chewing ragged holes through the leaves." },
};

export const AFFLICTION_TYPES = Object.keys(AFFLICTION_DEFINITIONS) as AfflictionType[];

export const SEVERITY_LABELS: Record<1 | 2 | 3, string> = {
    1: "At Risk",
    2: "Struggling",
    3: "Critical",
};

// A plant is "neglected" -- and therefore eligible to fall sick -- once it's
// gone this many watering cooldowns without being watered.
export const NEGLECT_WATER_MULTIPLIER = 3;

// Per-puzzle-completion onset roll for each eligible neglected plant.
export const ONSET_CHANCE = 0.15;

// puzzlesSinceOnset thresholds for severity 1->2 and 2->3. The second value
// is a hard cap: severity never advances past 3, and nothing worse than
// "critical, needs attention" can ever happen automatically. Consequences
// only ever land on puzzles actually played, never on elapsed real time.
export const ESCALATE_AT: readonly [number, number] = [3, 6];

// Flat Seed refund for deliberately composting a severity-3 plant. Always a
// player-initiated action -- a plant is never removed automatically.
export const COMPOST_REFUND_SEEDS = 40;

// The cure-trigger vocabulary IS the Gardening category's word list, reused
// directly rather than duplicated, so it can never drift out of sync with
// the real dictionary category. Cures come from finding any of these words
// as a bonus word in ANY puzzle's category -- not gated behind landing a
// Gardening-category puzzle specifically (see plan notes on category
// selection being a deterministic ~62-level cycle, far too sparse to gate a
// core mechanic behind).
const GARDEN_VOCABULARY = new Set<string>(gardeningCategory.words);

export function isGardenVocabulary(word: string): boolean {
    return GARDEN_VOCABULARY.has(word.toUpperCase());
}

export function createAfflictionState(): AfflictionState {
    return {};
}

export function normalizeAfflictionState(raw?: unknown): AfflictionState {
    const state: AfflictionState = {};
    if (!raw || typeof raw !== "object") return state;
    const validTypes = new Set<string>(AFFLICTION_TYPES);
    for (const [plantId, value] of Object.entries(raw as Record<string, unknown>)) {
        if (!value || typeof value !== "object") continue;
        const candidate = value as Partial<PlantAffliction>;
        if (typeof candidate.type !== "string" || !validTypes.has(candidate.type)) continue;
        const severity = candidate.severity === 2 || candidate.severity === 3 ? candidate.severity : 1;
        const puzzlesSinceOnset = Math.max(0, Math.floor(Number(candidate.puzzlesSinceOnset) || 0));
        state[plantId] = { type: candidate.type as AfflictionType, severity, puzzlesSinceOnset };
    }
    return state;
}

/**
 * Called once per puzzle completion. Advances every untreated affliction
 * (escalating severity at ESCALATE_AT, capped at 3) and rolls fresh onset
 * for each eligible neglected plant that isn't already sick.
 */
export function advanceAfflictionsOnPuzzleComplete(
    state: AfflictionState,
    eligibleForOnsetPlantIds: string[],
    rng: () => number = Math.random,
): AfflictionState {
    const next: AfflictionState = {};
    for (const [plantId, affliction] of Object.entries(state)) {
        const puzzlesSinceOnset = affliction.puzzlesSinceOnset + 1;
        let severity = affliction.severity;
        if (severity === 1 && puzzlesSinceOnset >= ESCALATE_AT[0]) severity = 2;
        if (severity === 2 && puzzlesSinceOnset >= ESCALATE_AT[1]) severity = 3;
        next[plantId] = { ...affliction, severity, puzzlesSinceOnset };
    }
    for (const plantId of eligibleForOnsetPlantIds) {
        if (next[plantId]) continue;
        if (rng() < ONSET_CHANCE) {
            const type = AFFLICTION_TYPES[Math.floor(rng() * AFFLICTION_TYPES.length)];
            next[plantId] = { type, severity: 1, puzzlesSinceOnset: 0 };
        }
    }
    return next;
}

/** Clears a plant's affliction. Shared by both the Treat and Compost actions -- the hook decides the seed refund/growth reset side effects for compost. */
export function clearAffliction(state: AfflictionState, plantId: string): AfflictionState {
    if (!state[plantId]) return state;
    const { [plantId]: _removed, ...rest } = state;
    return rest;
}

export function isNeglected(lastWatered: number, now: number, cooldownMs: number): boolean {
    return now - lastWatered >= cooldownMs * NEGLECT_WATER_MULTIPLIER;
}
