import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import { POWERUP_DEFINITIONS, type PowerupId } from "../powerups";
import { assetUrl } from "../categoryThemes";
import FieldNotesPanel from "./FieldNotesPanel";
import type { MobilePowerupDrawerProps } from "./sidebar/MobilePowerupDrawer";

type Props = Omit<MobilePowerupDrawerProps, "open" | "onClose" | "returnFocusRef"> & { onBack: () => void };

export default function FieldKitView(props: Props) {
    const inventoryLabel = (id: keyof typeof props.powerupInventory) => `x${props.powerupInventory[id]}`;
    const Art = ({ id }: { id: PowerupId }) => <img src={assetUrl(POWERUP_DEFINITIONS[id].image.replace(/^\//, ""))} alt="" />;
    return <section className="ws-screen-view ws-field-kit-view" aria-labelledby="field-kit-view-title">
        <header className="ws-screen-view__header">
            <button className="ws-round-icon-btn" onClick={props.onBack} aria-label="Back"><ArrowBackRounded /></button>
            <div><span className="ws-screen-view__eyebrow">Botanist tools</span><h1 id="field-kit-view-title">Field Kit</h1></div>
        </header>
        <div className="ws-screen-view__content">
            <p className="ws-field-kit-view__intro">Use a tool, then return to the active puzzle to see it take effect.</p>
            <div className="ws-field-kit-view__grid">
                <button disabled={!props.hintAvailable} onClick={props.onRevealHint}><Art id="single-letter-sprout" /><span>Hint</span><small>{props.freeHintUsesRemaining ? "Free" : inventoryLabel("single-letter-sprout")}</small></button>
                <button disabled={!props.powerupInventory["lumina-cyclone"]} onClick={props.onShuffle}><Art id="lumina-cyclone" /><span>Shuffle</span><small>{inventoryLabel("lumina-cyclone")}</small></button>
                <button disabled={!props.powerupInventory["super-root"]} onClick={props.onSuperRoot}><Art id="super-root" /><span>Super Root</span><small>{inventoryLabel("super-root")}</small></button>
                <button disabled={!props.powerupInventory["bioluminescent-compass"]} onClick={props.onCompass}><Art id="bioluminescent-compass" /><span>Compass</span><small>{inventoryLabel("bioluminescent-compass")}</small></button>
                <button disabled={!props.powerupInventory["flora-spectrometer"]} onClick={props.onSpectrometer}><Art id="flora-spectrometer" /><span>Spectrometer</span><small>{inventoryLabel("flora-spectrometer")}</small></button>
                <button disabled={!props.powerupInventory["nitrogen-booster"] || props.doubleSeedsActive} onClick={props.onDoubleSeeds}><Art id="nitrogen-booster" /><span>2× Seeds</span><small>{props.doubleSeedsActive ? "Active" : inventoryLabel("nitrogen-booster")}</small></button>
                <button className="ws-field-kit-view__restart" onClick={props.onRetry}><RefreshOutlined /><span>Restart</span><small>Same board</small></button>
            </div>
            <div className="ws-field-kit-view__notes"><FieldNotesPanel state={props.fieldNotes} onCollect={props.onCollectFieldNote} /></div>
        </div>
    </section>;
}
