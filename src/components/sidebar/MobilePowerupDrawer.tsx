import { useEffect, useRef, useState } from "react";
import { AutoFixHighOutlined, CloseRounded, RefreshOutlined, ShuffleOutlined } from "@mui/icons-material";
import type { PowerupInventory } from "../../powerups";

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
};

export default function MobilePowerupDrawer(props: Props) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const close = () => {
        setOpen(false);
        window.setTimeout(() => triggerRef.current?.focus(), 0);
    };
    useEffect(() => {
        if (!open) return;
        closeRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);
    const run = (action: () => void) => { action(); close(); };
    const inventoryLabel = (id: keyof PowerupInventory) => ` · x${props.powerupInventory[id]}`;

    return <div className="ws-mobile-toolkit">
        <button ref={triggerRef} className="ws-mobile-toolkit__trigger" aria-expanded={open} aria-controls="mobile-field-kit" onClick={() => setOpen(value => !value)}>
            <span aria-hidden="true">🧰</span><strong>Field Kit</strong><span className="ws-mobile-toolkit__hint">{props.freeHintUsesRemaining ? "Free hint ready" : "Power-ups & restart"}</span><span aria-hidden="true">{open ? "⌃" : "⌄"}</span>
        </button>
        {open && <div id="mobile-field-kit" className="ws-mobile-toolkit__panel" role="dialog" aria-label="Field Kit power-ups">
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
        </div>}
    </div>;
}
