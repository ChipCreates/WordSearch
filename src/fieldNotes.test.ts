import { describe, expect, it } from "vitest";
import { applyFieldNoteEvent, claimFieldNote, createFieldNotesState, getFieldNotesView, rotateFieldNotes } from "./fieldNotes";

describe("field notes", () => {
    it("generates the same three-note expedition deterministically", () => {
        expect(createFieldNotesState(2).activeIds).toEqual(createFieldNotesState(2).activeIds);
        expect(createFieldNotesState(0).activeIds).not.toEqual(createFieldNotesState(1).activeIds);
    });

    it("increments relevant objectives exactly once per event", () => {
        let state = createFieldNotesState(0);
        state = applyFieldNoteEvent(state, { kind: "bonus_word_found" });
        state = applyFieldNoteEvent(state, { kind: "bonus_word_found" });
        const note = getFieldNotesView(state).find(item => item.id === "bonus-words");
        expect(note?.progress).toBe(2);
    });

    it("requires a deliberate claim and pays each note once", () => {
        let state = createFieldNotesState(0);
        state = applyFieldNoteEvent(state, { kind: "puzzle_completed", isFrontier: true, hintUsed: false, category: "Animals" });
        const result = claimFieldNote(state, "frontier-no-hint");
        expect(result?.reward).toBe(30);
        expect(result && claimFieldNote(result.state, "frontier-no-hint")).toBeNull();
    });

    it("rotates only after all three active notes are completed and claimed", () => {
        let state = createFieldNotesState(0);
        for (const id of state.activeIds) {
            const events = id === "frontier-no-hint"
                ? [{ kind: "puzzle_completed", isFrontier: true, hintUsed: false, category: "Animals" } as const]
                : id === "bonus-words"
                    ? [{ kind: "bonus_word_found" } as const, { kind: "bonus_word_found" } as const]
                    : id === "category-pair"
                        ? [{ kind: "category_completed", category: "Animals" } as const, { kind: "category_completed", category: "Plants" } as const]
                        : id === "reverse-word"
                            ? [{ kind: "word_found_reverse" } as const]
                            : id === "diagonal-word"
                                ? [{ kind: "word_found_diagonal" } as const]
                                : id === "powerup-use"
                                    ? [{ kind: "powerup_used" } as const]
                                    : id === "water-plant"
                                        ? [{ kind: "plant_watered" } as const]
                                        : [{ kind: "plant_bloomed" } as const];
            for (const event of events) state = applyFieldNoteEvent(state, event);
        }
        const activeBefore = [...state.activeIds];
        for (const id of activeBefore) state = claimFieldNote(state, id)!.state;
        expect(state.expeditionIndex).toBe(1);
        expect(state.activeIds).toEqual(rotateFieldNotes({ ...state, expeditionIndex: 1 }).activeIds);
    });
});
