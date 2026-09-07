import { useEffect, useRef, type RefObject } from "react";
import { AutoFixHighOutlined, CloseRounded, RefreshOutlined, ShuffleOutlined } from "@mui/icons-material";
import type { PowerupInventory } from "../../powerups";
import FieldNotesPanel from "../FieldNotesPanel";
import type { FieldNoteId, FieldNotesState } from "../../fieldNotes";

type Props = {
    hintAvailable: boolean;
    freeHintUsesRemaining: number;
    powerupInventory: PowerupInventory;
    doubleSeedsActive: boolean;
    onRevealHint: () => void;
    onShuffle: () => void;
    onRetry: () => void;
    onSuperRoot: () => void;
    onCompass: () => void;
    onSpectrometer: () => void;
    onDoubleSeeds: () => void;
    fieldNotes: FieldNotesState;
    onCollectFieldNote: (noteId: FieldNoteId) => boolean;
    open: boolean;
    onClose: () => void;
    returnFocusRef: RefObject<HTMLButtonElement | null>;
};

export default function MobilePowerupDrawer(props: Props) {
    const closeRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!props.open) return;
        closeRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") props.onClose(); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [props.open, props.onClose]);
    const close = () => {
        props.onClose();
        window.setTimeout(() => props.returnFocusRef.current?.focus(), 0);
    };
    const run = (action: () => void) => { action(); close(); };
    const inventoryLabel = (id: keyof PowerupInventory) => ` · x${props.powerupInventory[id]}`;

    return <div className="ws-mobile-toolkit">
        {props.open && <div id="mobile-field-kit" className="ws-mobile-toolkit__panel" role="dialog" aria-label="Field Kit">
            <div className="ws-mobile-toolkit__header"><div><strong>Field Kit</strong><span>Choose one action</span></div><button ref={closeRef} className="ws-mobile-toolkit__close" aria-label="Close Field Kit" onClick={close}><CloseRounded /></button></div>
            <div className="ws-mobile-toolkit__grid">
                <button disabled={!props.hintAvailable} onClick={() => run(props.onRevealHint)}><AutoFixHighOutlined /><span>Hint</span><small>{props.freeHintUsesRemaining ? "Free" : inventoryLabel("single-letter-sprout")}</small></button>
                <button disabled={!props.powerupInventory["lumina-cyclone"]} onClick={() => run(props.onShuffle)}><ShuffleOutlined /><span>Shuffle</span><small>{inventoryLabel("lumina-cyclone")}</small></button>
                <button onClick={() => run(props.onRetry)}><RefreshOutlined /><span>Restart</span><small>Same board</small></button>
                <button disabled={!props.powerupInventory["super-root"]} onClick={() => run(props.onSuperRoot)}><span>🌱</span><span>Super Root</span><small>{inventoryLabel("super-root")}</small></button>
                <button disabled={!props.powerupInventory["bioluminescent-compass"]} onClick={() => run(props.onCompass)}><span>🧭</span><span>Compass</span><small>{inventoryLabel("bioluminescent-compass")}</small></button>
                <button disabled={!props.powerupInventory["flora-spectrometer"]} onClick={() => run(props.onSpectrometer)}><span>🔬</span><span>Spectrometer</span><small>{inventoryLabel("flora-spectrometer")}</small></button>
                <button disabled={!props.powerupInventory["nitrogen-booster"] || props.doubleSeedsActive} onClick={() => run(props.onDoubleSeeds)}><span>⚡</span><span>2× Seeds</span><small>{props.doubleSeedsActive ? "Active" : inventoryLabel("nitrogen-booster")}</small></button>
            </div>
            <div className="ws-mobile-toolkit__notes">
                <FieldNotesPanel state={props.fieldNotes} onCollect={props.onCollectFieldNote} compact />
            </div>
        </div>}
    </div>;
}
