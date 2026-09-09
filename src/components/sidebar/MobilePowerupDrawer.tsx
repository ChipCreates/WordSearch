import { useEffect, useRef, type RefObject } from "react";
import { CloseRounded, RefreshOutlined } from "@mui/icons-material";
import { POWERUP_DEFINITIONS, type PowerupId, type PowerupInventory } from "../../powerups";
import { assetUrl } from "../../categoryThemes";
import FieldNotesPanel from "../FieldNotesPanel";
import type { FieldNoteId, FieldNotesState } from "../../fieldNotes";

export type MobilePowerupDrawerProps = {
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

export default function MobilePowerupDrawer(props: MobilePowerupDrawerProps) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!props.open) return;
        closeRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                props.onClose();
                return;
            }
            if (event.key !== "Tab" || !panelRef.current) return;
            const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"));
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [props.open, props.onClose]);
    const close = () => {
        props.onClose();
        window.setTimeout(() => props.returnFocusRef.current?.focus(), 0);
    };
    const run = (action: () => void) => { action(); close(); };
    const inventoryLabel = (id: keyof PowerupInventory) => ` · x${props.powerupInventory[id]}`;
    const PowerupArt = ({ id }: { id: PowerupId }) => <img src={assetUrl(POWERUP_DEFINITIONS[id].image.replace(/^\//, ""))} alt="" />;

    return <div className="ws-mobile-toolkit">
        {props.open && <div id="mobile-field-kit" ref={panelRef} className="ws-mobile-toolkit__panel" role="dialog" aria-modal="true" aria-labelledby="mobile-field-kit-title">
            <div className="ws-mobile-toolkit__header"><div><strong id="mobile-field-kit-title">Field Kit</strong><span>Tools, rewards, and Field Notes</span></div><button ref={closeRef} className="ws-mobile-toolkit__close" aria-label="Close Field Kit" onClick={close}><CloseRounded /></button></div>
            <div className="ws-mobile-toolkit__grid">
                <button disabled={!props.hintAvailable} onClick={() => run(props.onRevealHint)}><PowerupArt id="single-letter-sprout" /><span>Hint</span><small>{props.freeHintUsesRemaining ? "Free" : inventoryLabel("single-letter-sprout")}</small></button>
                <button disabled={!props.powerupInventory["lumina-cyclone"]} onClick={() => run(props.onShuffle)}><PowerupArt id="lumina-cyclone" /><span>Shuffle</span><small>{inventoryLabel("lumina-cyclone")}</small></button>
                <button disabled={!props.powerupInventory["super-root"]} onClick={() => run(props.onSuperRoot)}><PowerupArt id="super-root" /><span>Super Root</span><small>{inventoryLabel("super-root")}</small></button>
                <button disabled={!props.powerupInventory["bioluminescent-compass"]} onClick={() => run(props.onCompass)}><PowerupArt id="bioluminescent-compass" /><span>Compass</span><small>{inventoryLabel("bioluminescent-compass")}</small></button>
                <button disabled={!props.powerupInventory["flora-spectrometer"]} onClick={() => run(props.onSpectrometer)}><PowerupArt id="flora-spectrometer" /><span>Spectrometer</span><small>{inventoryLabel("flora-spectrometer")}</small></button>
                <button disabled={!props.powerupInventory["nitrogen-booster"] || props.doubleSeedsActive} onClick={() => run(props.onDoubleSeeds)}><PowerupArt id="nitrogen-booster" /><span>2× Seeds</span><small>{props.doubleSeedsActive ? "Active" : inventoryLabel("nitrogen-booster")}</small></button>
                <button className="ws-mobile-toolkit__restart" onClick={() => run(props.onRetry)}><RefreshOutlined /><span>Restart</span><small>Same board</small></button>
            </div>
            <div className="ws-mobile-toolkit__notes">
                <FieldNotesPanel state={props.fieldNotes} onCollect={props.onCollectFieldNote} compact />
            </div>
        </div>}
    </div>;
}
