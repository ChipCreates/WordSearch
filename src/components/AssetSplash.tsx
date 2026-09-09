type Props = { progress: number };

export default function AssetSplash({ progress }: Props) {
    const rounded = Math.max(0, Math.min(100, Math.round(progress)));
    return <main className="ws-splash" aria-busy="true" aria-label={`Loading Word Sprout, ${rounded}%`}>
        <div className="ws-splash__glow" style={{ backgroundImage: `radial-gradient(circle at 50% 35%, #b7ff5030, transparent 34%), url("${import.meta.env.BASE_URL}backgrounds/garden-landscape.webp")` }} aria-hidden="true" />
        <img className="ws-splash__logo" src={`${import.meta.env.BASE_URL}branding/word-sprout-logo.webp`} alt="Word Sprout" />
        <p>Preparing the garden…</p>
        <div className="ws-splash__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rounded}>
            <span style={{ width: `${rounded}%` }} />
        </div>
        <strong>{rounded}%</strong>
    </main>;
}
