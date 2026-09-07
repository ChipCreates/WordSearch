import { getFieldNotesView, type FieldNotesState, type FieldNoteId } from "../fieldNotes";

type Props = {
    state: FieldNotesState;
    onCollect: (noteId: FieldNoteId) => boolean;
    compact?: boolean;
};

export default function FieldNotesPanel({ state, onCollect, compact = false }: Props) {
    const notes = getFieldNotesView(state);
    return (
        <section className={`ws-field-notes${compact ? " ws-field-notes--compact" : ""}`} aria-label="Field Notes">
            <div className="ws-field-notes__heading"><strong>Field Notes</strong><span>Expedition {state.expeditionIndex + 1}</span></div>
            <div className="ws-field-notes__list">
                {notes.map(note => (
                    <div className={`ws-field-note ${note.completed ? "ws-field-note--complete" : ""}`} key={note.id}>
                        <div className="ws-field-note__copy">
                            <strong>{note.title}</strong>
                            <span>{note.completed ? "Ready to collect" : note.description}</span>
                        </div>
                        <div className="ws-field-note__action">
                            <span aria-label={`${note.progress} of ${note.target}`}>{note.progress}/{note.target}</span>
                            {note.completed && !note.claimed && <button type="button" onClick={() => onCollect(note.id)}>Collect +{note.reward}</button>}
                            {note.claimed && <span className="ws-field-note__claimed">Collected</span>}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
