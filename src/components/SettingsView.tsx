import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { SettingsContent, type SettingsProps } from "./SettingsDialog";

type Props = Omit<SettingsProps, "open" | "onClose"> & { onBack: () => void };

export default function SettingsView({ onBack, ...settings }: Props) {
    return <section className="ws-screen-view ws-settings-view" aria-labelledby="settings-view-title">
        <header className="ws-screen-view__header">
            <button className="ws-round-icon-btn" onClick={onBack} aria-label="Back"><ArrowBackRounded /></button>
            <div><span className="ws-screen-view__eyebrow">Preferences</span><h1 id="settings-view-title">Settings</h1></div>
        </header>
        <div className="ws-screen-view__content ws-settings-view__content">
            <SettingsContent {...settings} />
        </div>
    </section>;
}
