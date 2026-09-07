export type FieldNoteId =
    | "frontier-no-hint"
    | "bonus-words"
    | "reverse-word"
    | "diagonal-word"
    | "powerup-use"
    | "water-plant"
    | "bloom-plant"
    | "category-pair";

export type FieldNoteEvent =
    | { kind: "puzzle_completed"; isFrontier: boolean; hintUsed: boolean; category: string }
    | { kind: "bonus_word_found" }
    | { kind: "word_found_reverse" }
    | { kind: "word_found_diagonal" }
    | { kind: "powerup_used" }
    | { kind: "plant_watered" }
    | { kind: "plant_bloomed" }
    | { kind: "category_completed"; category: string };

export type FieldNoteDefinition = {
    id: FieldNoteId;
    title: string;
    description: string;
    target: number;
    reward: number;
};

export type FieldNotesState = {
    expeditionIndex: number;
    activeIds: FieldNoteId[];
    progress: Partial<Record<FieldNoteId, number>>;
    claimedIds: FieldNoteId[];
    categories: string[];
};

export type FieldNoteView = FieldNoteDefinition & {
    progress: number;
    completed: boolean;
    claimed: boolean;
};

export const FIELD_NOTE_DEFINITIONS: readonly FieldNoteDefinition[] = [
    { id: "frontier-no-hint", title: "Quiet Frontier", description: "Complete one frontier puzzle without a hint.", target: 1, reward: 30 },
    { id: "bonus-words", title: "Wildword Sketch", description: "Find two bonus words across puzzles.", target: 2, reward: 20 },
    { id: "reverse-word", title: "Root in Reverse", description: "Find a word placed in reverse.", target: 1, reward: 15 },
    { id: "diagonal-word", title: "Diagonal Trail", description: "Find a word placed diagonally.", target: 1, reward: 15 },
    { id: "powerup-use", title: "Pack the Toolkit", description: "Use one tactical power-up.", target: 1, reward: 15 },
    { id: "water-plant", title: "Morning Dew", description: "Water one plant.", target: 1, reward: 15 },
    { id: "bloom-plant", title: "First Blossom", description: "Bloom one plant.", target: 1, reward: 30 },
    { id: "category-pair", title: "Two Groves", description: "Complete puzzles in two different categories.", target: 2, reward: 25 },
];

const definitionById = new Map(FIELD_NOTE_DEFINITIONS.map(note => [note.id, note]));

export function createFieldNotesState(expeditionIndex = 0): FieldNotesState {
    const state = { expeditionIndex, activeIds: [], progress: {}, claimedIds: [], categories: [] } satisfies FieldNotesState;
    return rotateFieldNotes(state);
}

export function normalizeFieldNotesState(raw?: Partial<FieldNotesState> | null): FieldNotesState {
    const expeditionIndex = Math.max(0, Math.floor(Number(raw?.expeditionIndex) || 0));
    const validIds = new Set(FIELD_NOTE_DEFINITIONS.map(note => note.id));
    const activeIds = Array.isArray(raw?.activeIds) ? raw.activeIds.filter(id => validIds.has(id as FieldNoteId)) as FieldNoteId[] : [];
    const claimedIds = Array.isArray(raw?.claimedIds) ? raw.claimedIds.filter(id => activeIds.includes(id as FieldNoteId)) as FieldNoteId[] : [];
    const progress = Object.fromEntries(Object.entries(raw?.progress ?? {}).filter(([id, value]) => validIds.has(id as FieldNoteId) && Number.isFinite(value)).map(([id, value]) => [id, Math.max(0, Math.floor(Number(value)))])) as FieldNotesState["progress"];
    const categories = Array.isArray(raw?.categories) ? Array.from(new Set(raw.categories.filter(category => typeof category === "string" && category.length > 0))) : [];
    const state: FieldNotesState = { expeditionIndex, activeIds: Array.from(new Set(activeIds)), progress, claimedIds: Array.from(new Set(claimedIds)), categories };
    return state.activeIds.length === 3 ? state : rotateFieldNotes(state);
}

export function rotateFieldNotes(state: FieldNotesState): FieldNotesState {
    const start = (state.expeditionIndex * 3) % FIELD_NOTE_DEFINITIONS.length;
    const activeIds = Array.from({ length: 3 }, (_, index) => FIELD_NOTE_DEFINITIONS[(start + index) % FIELD_NOTE_DEFINITIONS.length].id);
    return { ...state, activeIds, progress: {}, claimedIds: [], categories: [] };
}

function noteProgress(state: FieldNotesState, id: FieldNoteId): number {
    const note = definitionById.get(id);
    return Math.min(note?.target ?? 0, Math.max(0, state.progress[id] ?? 0));
}

export function getFieldNotesView(state: FieldNotesState): FieldNoteView[] {
    return state.activeIds.map(id => {
        const definition = definitionById.get(id)!;
        const progress = noteProgress(state, id);
        return { ...definition, progress, completed: progress >= definition.target, claimed: state.claimedIds.includes(id) };
    });
}

function increment(state: FieldNotesState, id: FieldNoteId, amount = 1): FieldNotesState {
    if (!state.activeIds.includes(id)) return state;
    return { ...state, progress: { ...state.progress, [id]: noteProgress(state, id) + amount } };
}

export function applyFieldNoteEvent(state: FieldNotesState, event: FieldNoteEvent): FieldNotesState {
    let next = state;
    switch (event.kind) {
        case "puzzle_completed":
            if (event.isFrontier && !event.hintUsed) next = increment(next, "frontier-no-hint");
            next = applyFieldNoteEvent(next, { kind: "category_completed", category: event.category });
            break;
        case "bonus_word_found": next = increment(next, "bonus-words"); break;
        case "word_found_reverse": next = increment(next, "reverse-word"); break;
        case "word_found_diagonal": next = increment(next, "diagonal-word"); break;
        case "powerup_used": next = increment(next, "powerup-use"); break;
        case "plant_watered": next = increment(next, "water-plant"); break;
        case "plant_bloomed": next = increment(next, "bloom-plant"); break;
        case "category_completed":
            if (!next.categories.includes(event.category)) {
                const categories = [...next.categories, event.category];
                next = { ...next, categories };
                if (categories.length >= 2) next = increment(next, "category-pair");
            }
            break;
    }
    return next;
}

export function claimFieldNote(state: FieldNotesState, noteId: FieldNoteId): { state: FieldNotesState; reward: number } | null {
    const note = getFieldNotesView(state).find(item => item.id === noteId);
    if (!note || !note.completed || note.claimed) return null;
    const claimedState = { ...state, claimedIds: [...state.claimedIds, noteId] };
    const allClaimed = getFieldNotesView(claimedState).every(item => item.completed && item.claimed);
    return { state: allClaimed ? rotateFieldNotes({ ...claimedState, expeditionIndex: state.expeditionIndex + 1 }) : claimedState, reward: note.reward };
}
