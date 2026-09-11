import { useState, useEffect } from "react";
import { ShowerOutlined, WaterDropOutlined, StorefrontOutlined } from "@mui/icons-material";
import { assetUrl } from "../categoryThemes";
import EcoLeaf from "./icons/EcoLeaf";
import { PLANTS_CATALOG, getStageImage, getStageName } from "../plantsCatalog";
import { getPlantArtwork } from "../plantHealth";
import { GARDEN_WATERING_COOLDOWN_MS } from "../gameMechanics";
import { getPlantEconomy, MIN_FERTILIZER_COST, STARTER_BLOOM_BOUNTY } from "../economy";
import { AFFLICTION_DEFINITIONS, COMPOST_REFUND_SEEDS, SEVERITY_LABELS, type AfflictionState } from "../plantAffliction";
import type { BloomEvent, BloomOccurrence } from "../bloomEvents";
import BloomCelebration from "./BloomCelebration";
import WateringBeat, { type CareAction } from "./WateringBeat";

type Props = {
    seeds: number;
    ownedPlants: string[];
    wateredTimestamps: Record<string, number>;
    growthByPlant: Record<string, number>;
    afflictions: AfflictionState;
    remedyCharges: number;
    onOpenStore: () => void;
    addSeeds: (amount: number) => void;
    spendSeeds: (cost: number) => boolean;
    updateWateredTimestamp: (plantId: string, timestamp: number) => void;
    updatePlantGrowth: (plantId: string, newGrowth: number) => void;
    recordPlantBloom: (bloom: BloomOccurrence) => void;
    onTreatPlant: (plantId: string) => boolean;
    onCompostPlant: (plantId: string) => boolean;
    showToast: (message: string) => void;
    /** WSP-2.6: the shared bloom-presentation queue -- fed by this view's own
     *  water/fertilize handlers AND (while this view isn't mounted) bulk
     *  "water all ready" elsewhere in the app. Rendered here via
     *  BloomCelebration so the two individual-action sources get a
     *  first-class, directly-testable presentation without waiting on
     *  App.tsx; App.tsx mounts its own copy only while the Garden tab is NOT
     *  active, so the two never double-render the same queue at once. */
    bloomEvents: BloomEvent[];
    onDismissBloomEvent: () => void;
    isMobile?: boolean;
};

// Sub-1.5s per WSP-2.6's acceptance criteria for the watering/fertilizing
// beat (tap -> animation -> soil/droplet response -> plant reacts -> quiet
// feedback). Also doubles as a mash-guard window: see triggerCareBeat below.
const CARE_BEAT_DURATION_MS = 1400;

type FilterTab = "all" | "bloomed" | "seedlings";

const COOLDOWN_MS = GARDEN_WATERING_COOLDOWN_MS;

function formatCooldown(remainingMs: number): string {
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}

// Owns its own 1s ticker so only this button re-renders while a cooldown
// counts down, instead of the whole plant grid re-rendering every second.
function WaterButton({
    lastWatered, growth, onWater, beatActive,
}: {
    lastWatered: number;
    growth: number;
    onWater: () => void;
    /** WSP-2.6: true while this plant's watering beat is still playing --
     *  disables the button as a visible mash-guard, on top of (not instead
     *  of) handleWaterPlant's own internal guard. */
    beatActive?: boolean;
}) {
    const [, setTick] = useState(0);
    const cooldownActiveNow = COOLDOWN_MS - (Date.now() - lastWatered) > 0;
    useEffect(() => {
        if (!cooldownActiveNow) return;
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, [cooldownActiveNow]);

    const fullyBloomed = growth >= 100;
    const remainingMs = COOLDOWN_MS - (Date.now() - lastWatered);
    const cooldownActive = remainingMs > 0;

    return (
        <button
            className="ws-garden-action ws-garden-action--water"
            onClick={onWater}
            disabled={cooldownActive || fullyBloomed || beatActive}
            style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "0.85rem",
                border: "1px solid var(--glass-border)",
                background: fullyBloomed
                    ? "rgba(0, 228, 121, 0.1)"
                    : cooldownActive
                        ? "rgba(255, 255, 255, 0.05)"
                        : "var(--color-primary)",
                color: fullyBloomed
                    ? "var(--color-primary)"
                    : cooldownActive
                        ? "var(--color-on-surface-variant)"
                        : "var(--color-on-primary)",
                fontFamily: "var(--font-headline)",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: (cooldownActive || fullyBloomed) ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: (cooldownActive || fullyBloomed) ? "none" : "0 0 20px rgba(0, 228, 121, 0.3)",
                transition: "all 0.2s ease",
            }}
        >
            {fullyBloomed ? (
                <span>Fully Bloomed ✨</span>
            ) : cooldownActive ? (
                <>
                    <WaterDropOutlined style={{ fontSize: 20 }} />
                    <span>Water in {formatCooldown(remainingMs)}</span>
                </>
            ) : (
                <>
                    <ShowerOutlined style={{ fontSize: 20 }} />
                    <span>Water Vessel</span>
                </>
            )}
        </button>
    );
}

export default function GardenView({
    seeds,
    ownedPlants,
    wateredTimestamps,
    growthByPlant,
    afflictions,
    remedyCharges,
    onOpenStore,
    addSeeds,
    spendSeeds,
    updateWateredTimestamp,
    updatePlantGrowth,
    recordPlantBloom,
    onTreatPlant,
    onCompostPlant,
    showToast,
    bloomEvents,
    onDismissBloomEvent,
    isMobile,
}: Props) {
    const [filter, setFilter] = useState<FilterTab>("all");
    // WSP-2.6 Part 1: which plant card(s) are currently mid-beat, and which
    // action triggered it. A map (not a single id) because a player can
    // legitimately tap Water on one card and Fertilize on another in quick
    // succession -- each card's beat is independent.
    const [activeBeats, setActiveBeats] = useState<Record<string, CareAction>>({});

    const getPlantGrowth = (plantId: string) => {
        return growthByPlant[plantId] !== undefined ? growthByPlant[plantId] : 0;
    };

    // Starts a plant card's watering/fertilizing beat and clears it after
    // CARE_BEAT_DURATION_MS. Also doubles as this view's own mash-guard:
    // handleWaterPlant/handleFertilizePlant both bail out immediately if a
    // beat is already active for that plant, so rapidly re-clicking a
    // button before the parent's cooldown/growth props have re-rendered
    // can't fire the underlying mutation (updateWateredTimestamp, bounty,
    // recordPlantBloom, ...) more than once per beat window.
    const triggerCareBeat = (plantId: string, action: CareAction) => {
        setActiveBeats(prev => ({ ...prev, [plantId]: action }));
        setTimeout(() => {
            setActiveBeats(prev => {
                if (prev[plantId] !== action) return prev; // a newer beat already took over
                const next = { ...prev };
                delete next[plantId];
                return next;
            });
        }, CARE_BEAT_DURATION_MS);
    };

    const handleTreatPlant = (plantId: string, plantName: string) => {
        if (onTreatPlant(plantId)) {
            showToast(`🌿 ${plantName} treated! It's recovering.`);
        } else {
            showToast("No Garden Remedy charges — find gardening-related bonus words to earn one.");
        }
    };

    const handleCompostPlant = (plantId: string, plantName: string) => {
        if (onCompostPlant(plantId)) {
            showToast(`🍂 Composted ${plantName}. Starting fresh with a Seed refund.`);
        }
    };

    const handleWaterPlant = (plantId: string, plantName: string) => {
        // Mash-guard (WSP-2.6): while this plant's beat is still playing,
        // ignore further taps rather than re-running the watering mutation.
        if (activeBeats[plantId]) return;

        const lastWatered = wateredTimestamps[plantId] || 0;
        const now = Date.now();
        if (now - lastWatered < COOLDOWN_MS) {
            showToast("This plant is already hydrated. Come back in 2 hours!");
            return;
        }

        const currentGrowth = getPlantGrowth(plantId);
        const newGrowth = Math.min(100, currentGrowth + 25);

        // Save watered timestamp and growth level via centralized updaters
        updateWateredTimestamp(plantId, now);
        updatePlantGrowth(plantId, newGrowth);
        triggerCareBeat(plantId, "water");

        // Find plant def for bounty amount
        const plantDef = PLANTS_CATALOG.find(p => p.id === plantId);
        const bounty = plantDef ? getPlantEconomy(plantDef).bloomBounty : STARTER_BLOOM_BOUNTY;

        if (newGrowth === 100 && currentGrowth < 100) {
            addSeeds(bounty); // Bloom bounty!
            // WSP-2.6: BloomCelebration now owns this moment's presentation
            // entirely -- the old plain "🎉 Fantastic!" toast is gone here,
            // replaced by the shared, rarity-scaled celebration queued below.
            recordPlantBloom({ plantId, plantName, tier: plantDef?.tier ?? "Common", bounty });
        } else {
            showToast(`💧 ${plantName} grew 25%. Keep nurturing it toward bloom!`);
        }
    };

    const handleFertilizePlant = (plantId: string, plantName: string) => {
        if (activeBeats[plantId]) return;

        const currentGrowth = getPlantGrowth(plantId);
        if (currentGrowth >= 100) {
            showToast("This plant is already fully bloomed!");
            return;
        }

        const plantDef = PLANTS_CATALOG.find(p => p.id === plantId);
        const fertilizerCost = plantDef ? getPlantEconomy(plantDef).fertilizerCost : MIN_FERTILIZER_COST;
        const success = spendSeeds(fertilizerCost);
        if (!success) {
            showToast(`Not enough Seeds for Botanical Fertilizer! (Costs ${fertilizerCost} Seeds) 🌱`);
            return;
        }

        const newGrowth = Math.min(100, currentGrowth + 25);

        // Save growth state via centralized updater
        updatePlantGrowth(plantId, newGrowth);
        triggerCareBeat(plantId, "fertilize");

        // Find plant def for bounty amount
        const bounty = plantDef ? getPlantEconomy(plantDef).bloomBounty : STARTER_BLOOM_BOUNTY;

        if (newGrowth === 100) {
            addSeeds(bounty); // Bloom bounty!
            // WSP-2.6: same shared BloomCelebration path as handleWaterPlant
            // above and waterAllReady's bulk path -- see bloomEvents.ts.
            recordPlantBloom({ plantId, plantName, tier: plantDef?.tier ?? "Common", bounty });
        } else {
            showToast(`🧪 Fertilized! ${plantName} growth boosted by 25%!`);
        }
    };

    // Filter to plants owned by the player
    const userOwnedPlantDefs = PLANTS_CATALOG.filter(plant => ownedPlants.includes(plant.id));
    const bloomedCount = userOwnedPlantDefs.filter(p => getPlantGrowth(p.id) >= 100).length;

    const filteredPlants = userOwnedPlantDefs.filter(plant => {
        const growth = getPlantGrowth(plant.id);
        if (filter === "bloomed") return growth >= 100;
        if (filter === "seedlings") return growth < 100;
        return true;
    });

    const unownedPlants = PLANTS_CATALOG.filter(plant => !ownedPlants.includes(plant.id));

    return (
        <div className="ws-garden" style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
            {/* WSP-2.6: the shared bloom-presentation queue, fed by
                handleWaterPlant/handleFertilizePlant above (App.tsx mounts
                its own copy for bulk waterAllReady blooms triggered while
                this view isn't mounted -- see App.tsx's own BloomCelebration
                for why the two never run at once). */}
            <BloomCelebration events={bloomEvents} onDismiss={onDismissBloomEvent} isMobile={isMobile} />

            {/* Garden summary */}
            <div className="glass-panel ws-garden__summary" style={{ padding: 24, borderRadius: "1.25rem", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <EcoLeaf style={{ fontSize: 32, color: "var(--color-primary)" }} />
                            <h2 className="glow-text-emerald" style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.75rem", fontWeight: 800, color: "var(--color-primary)" }}>
                                The Garden
                            </h2>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--color-on-surface-variant)", maxWidth: 680, lineHeight: 1.5 }}>
                            Acquire rare plant seeds from the store and nurture them inside terrarium vessels. Water every 2 hours and bloom plants to grow your collection! Neglected plants can fall sick — find gardening-related bonus words in any puzzle to earn a Garden Remedy and treat them.
                        </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                                <span aria-hidden="true" style={{ fontSize: "1.6rem" }}>🌿</span>
                                <span style={{ fontFamily: "var(--font-headline)", fontSize: "1.6rem", fontWeight: 800, color: "var(--color-primary)" }}>
                                    {remedyCharges}
                                </span>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                                GARDEN REMEDIES
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                                <img src={assetUrl("seed.png")} alt="Seed" style={{ width: 36, height: 36, objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(0,228,121,0.6))" }} />
                                <span style={{ fontFamily: "var(--font-headline)", fontSize: "1.6rem", fontWeight: 800, color: "var(--color-primary)" }}>
                                    {seeds}
                                </span>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                                AVAILABLE SEEDS
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vitality Progress Meter */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--color-on-surface-variant)", marginBottom: 6, fontWeight: 700 }}>
                        <span>Garden Collection: {userOwnedPlantDefs.length} / {PLANTS_CATALOG.length} Seeds Acquired</span>
                        <span>{bloomedCount} Bloomed ({userOwnedPlantDefs.length ? Math.round((bloomedCount / userOwnedPlantDefs.length) * 100) : 0}%)</span>
                    </div>
                    <div style={{ height: 12, width: "100%", background: "var(--color-surface-container-high)", borderRadius: 6, overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                        <div
                            className="bioluminescent-line"
                            style={{
                                height: "100%",
                                width: `${Math.min(100, (bloomedCount / PLANTS_CATALOG.length) * 100)}%`,
                                borderRadius: 6,
                                transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                        />
                    </div>
                </div>

                {/* WSP-2.6 Part 4: Conservatory Shelf -- a deliberately cheap
                    accumulation visual, NOT a decorating/arrangement system.
                    One token per owned plant, in acquisition order
                    (ownedPlants' own order -- no separate layout state), using
                    each plant's current growth-stage art so a shelf of blooms
                    visibly reads different from a shelf of seed vessels. As
                    the collection grows the shelf just gets longer/fuller;
                    there is nothing here for a player to rearrange. */}
                {userOwnedPlantDefs.length > 0 && (
                    <div className="ws-conservatory-shelf" data-testid="conservatory-shelf">
                        <div className="ws-conservatory-shelf__label">
                            🪟 Conservatory Shelf · {userOwnedPlantDefs.length} plant{userOwnedPlantDefs.length === 1 ? "" : "s"}
                        </div>
                        <div className="ws-conservatory-shelf__row">
                            {userOwnedPlantDefs.map(plant => (
                                <img
                                    key={plant.id}
                                    className="ws-conservatory-shelf__token"
                                    src={assetUrl(getStageImage(getPlantGrowth(plant.id), plant.id).replace(/^\//, ""))}
                                    alt={`${plant.name} (${getStageName(getPlantGrowth(plant.id))})`}
                                    title={plant.name}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Filter Tabs & Shop Action */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
                    <div style={{ display: "flex", gap: 12 }}>
                        {(["all", "bloomed", "seedlings"] as FilterTab[]).map(tab => (
                            <button
                                className={`ws-garden-filter${filter === tab ? " is-selected" : ""}`}
                                key={tab}
                                onClick={() => setFilter(tab)}
                                style={{
                                    padding: "8px 18px",
                                    borderRadius: "9999px",
                                    border: "1px solid",
                                    borderColor: filter === tab ? "var(--color-primary)" : "var(--glass-border)",
                                    background: filter === tab ? "rgba(0, 228, 121, 0.15)" : "transparent",
                                    color: filter === tab ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                                    fontFamily: "var(--font-headline)",
                                    fontWeight: 700,
                                    fontSize: "0.85rem",
                                    textTransform: "capitalize",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                {tab === "all" ? `My Flora (${userOwnedPlantDefs.length})` : tab}
                            </button>
                        ))}
                    </div>

                    <button
                        className="ws-garden-action ws-garden-action--primary"
                        onClick={onOpenStore}
                        style={{
                            padding: "8px 18px",
                            borderRadius: "9999px",
                            border: "1px solid var(--color-primary)",
                            background: "var(--color-primary)",
                            color: "var(--color-on-primary)",
                            fontFamily: "var(--font-headline)",
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            boxShadow: "0 0 16px rgba(0, 228, 121, 0.3)",
                        }}
                    >
                        <StorefrontOutlined style={{ fontSize: 18 }} />
                        <span>Acquire New Seeds in Store ({unownedPlants.length} Available)</span>
                    </button>
                </div>
            </div>

            {/* Plants Grid with Large Bioluminescent Terrarium Tile Cards */}
            {filteredPlants.length > 0 ? (
                <div className="ws-garden__grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
                    {filteredPlants.map(plant => {
                        const growth = getPlantGrowth(plant.id);
                        const lastWatered = wateredTimestamps[plant.id] || 0;
                        const rawStageImage = getStageImage(growth, plant.id);
                        const plantImage = assetUrl(rawStageImage.startsWith("/") ? rawStageImage.slice(1) : rawStageImage);
                        const affliction = afflictions[plant.id];
                        // Critical (severity 3) borrows the dead sprite sheet purely as a
                        // sharper visual warning -- the plant is still fully recoverable via
                        // Treat or Compost, exactly like severity 1-2. No game-state change.
                        const afflictionArtwork = affliction
                            ? getPlantArtwork(growth, plant.id, affliction.severity === 3 ? "dead" : "sick")
                            : null;
                        // WSP-2.6 Part 1: this card's in-flight watering/
                        // fertilizing beat, if any -- drives both the
                        // WateringBeat overlay and the plant art's brief
                        // "reacting" pulse.
                        const beatAction = activeBeats[plant.id] ?? null;

                        return (
                            <div
                                key={plant.id}
                                className="glass-panel ws-garden-card"
                                style={{
                                    borderRadius: "1.5rem",
                                    overflow: "hidden",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    border: "1px solid rgba(0, 228, 121, 0.3)",
                                    background: "linear-gradient(180deg, rgba(0, 228, 121, 0.08) 0%, rgba(20, 30, 25, 0.6) 100%)",
                                    boxShadow: "0 8px 32px rgba(0, 228, 121, 0.12)",
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                            >
                                {/* Large Bioluminescent Terrarium Hero Frame */}
                                <div
                                    style={{
                                        height: 220,
                                        width: "100%",
                                        position: "relative",
                                        background: "radial-gradient(circle at 50% 60%, rgba(0, 228, 121, 0.25) 0%, rgba(0, 0, 0, 0.4) 80%)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: 16,
                                        overflow: "hidden",
                                    }}
                                >
                                    {afflictionArtwork && afflictionArtwork.kind === "sprite" ? (
                                        <div
                                            className={`ws-plant-art ${affliction?.severity === 3 ? "ws-plant-art--critical" : "ws-plant-art--sick"}`}
                                            role="img"
                                            aria-label={`${plant.name} (${affliction?.severity === 3 ? "critical" : "sick"})`}
                                            style={{
                                                width: 180,
                                                height: 180,
                                                backgroundImage: `url(${assetUrl(afflictionArtwork.src.startsWith("/") ? afflictionArtwork.src.slice(1) : afflictionArtwork.src)})`,
                                                backgroundSize: afflictionArtwork.backgroundSize,
                                                backgroundPosition: afflictionArtwork.backgroundPosition,
                                                backgroundRepeat: "no-repeat",
                                                filter: affliction?.severity === 3
                                                    ? "drop-shadow(0 0 20px rgba(255, 107, 107, 0.55)) saturate(0.4) brightness(0.85)"
                                                    : "drop-shadow(0 0 20px rgba(255, 107, 107, 0.4)) saturate(0.7)",
                                            }}
                                        />
                                    ) : (
                                        <img
                                            className={`ws-plant-art${beatAction ? " ws-plant-art--reacting" : ""}`}
                                            src={plantImage}
                                            alt={plant.name}
                                            style={{
                                                maxHeight: "100%",
                                                maxWidth: "100%",
                                                objectFit: "contain",
                                                filter: "drop-shadow(0 0 20px rgba(0, 228, 121, 0.45))",
                                                transition: "transform 0.4s ease",
                                            }}
                                        />
                                    )}

                                    {/* WSP-2.6 Part 1: the watering/fertilizing beat -- purely
                                        decorative, pointer-events:none, never blocks the
                                        buttons below it. */}
                                    <WateringBeat action={beatAction} />

                                    {/* Affliction Badge Tag */}
                                    {affliction && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 14,
                                                left: 14,
                                                padding: "4px 12px",
                                                borderRadius: "9999px",
                                                background: "rgba(255, 107, 107, 0.22)",
                                                border: "1px solid rgba(255, 107, 107, 0.5)",
                                                backdropFilter: "var(--glass-blur, blur(12px))",
                                                color: "#ff8a8a",
                                                fontSize: "0.75rem",
                                                fontWeight: 800,
                                                fontFamily: "var(--font-headline)",
                                            }}
                                        >
                                            🐛 {AFFLICTION_DEFINITIONS[affliction.type].name} · {SEVERITY_LABELS[affliction.severity]}
                                        </div>
                                    )}

                                    {/* Stage Badge Tag */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 14,
                                            right: 14,
                                            padding: "4px 12px",
                                            borderRadius: "9999px",
                                            background: "rgba(0, 228, 121, 0.25)",
                                            border: "1px solid rgba(0, 228, 121, 0.5)",
                                            backdropFilter: "var(--glass-blur, blur(12px))",
                                            color: "var(--color-primary)",
                                            fontSize: "0.75rem",
                                            fontWeight: 800,
                                            fontFamily: "var(--font-headline)",
                                        }}
                                    >
                                        {getStageName(growth)}
                                    </div>
                                </div>

                                {/* Info & Action Controls */}
                                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "space-between" }}>
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <h3 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 700, color: "var(--color-primary)" }}>
                                                {plant.name}
                                            </h3>
                                            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--color-primary)", background: "rgba(0,228,121,0.15)", padding: "2px 8px", borderRadius: 4 }}>
                                                {plant.tier}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--color-primary)", margin: "2px 0 8px 0" }}>
                                            {plant.species}
                                        </div>
                                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-on-surface-variant)", lineHeight: 1.4 }}>
                                            {plant.description}
                                        </p>
                                        {affliction && (
                                            <p style={{ margin: "8px 0 0 0", fontSize: "0.8rem", color: "#ff8a8a", lineHeight: 1.4 }}>
                                                {AFFLICTION_DEFINITIONS[affliction.type].description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Growth progress & Water/Fertilize buttons */}
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-on-surface-variant)", marginBottom: 6, fontWeight: 600 }}>
                                            <span>Vessel Growth Stage</span>
                                            <span>{growth}% (Bounty: +{getPlantEconomy(plant).bloomBounty} Seeds)</span>
                                        </div>
                                        <div style={{ height: 6, width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
                                            <div
                                                className="bioluminescent-line"
                                                style={{
                                                    height: "100%",
                                                    width: `${growth}%`,
                                                    borderRadius: 3,
                                                }}
                                            />
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            {/* Treat/Compost -- only ever player-initiated, never automatic */}
                                            {affliction && (
                                                <button
                                                    className="ws-garden-action ws-garden-action--treat"
                                                    onClick={() => handleTreatPlant(plant.id, plant.name)}
                                                    disabled={remedyCharges <= 0}
                                                    style={{
                                                        width: "100%",
                                                        padding: "8px 16px",
                                                        borderRadius: "0.85rem",
                                                        border: "1px solid rgba(0, 228, 121, 0.4)",
                                                        background: remedyCharges > 0 ? "rgba(0, 228, 121, 0.15)" : "rgba(255,255,255,0.05)",
                                                        color: remedyCharges > 0 ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                                                        fontFamily: "var(--font-headline)",
                                                        fontWeight: 700,
                                                        fontSize: "0.85rem",
                                                        cursor: remedyCharges > 0 ? "pointer" : "default",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: 6,
                                                        transition: "all 0.2s ease",
                                                    }}
                                                >
                                                    <span>🌿 {remedyCharges > 0 ? `Treat (×${remedyCharges} Remedy available)` : "Treat (find a gardening bonus word first)"}</span>
                                                </button>
                                            )}
                                            {affliction && affliction.severity === 3 && (
                                                <button
                                                    className="ws-garden-action ws-garden-action--compost"
                                                    onClick={() => handleCompostPlant(plant.id, plant.name)}
                                                    style={{
                                                        width: "100%",
                                                        padding: "8px 16px",
                                                        borderRadius: "0.85rem",
                                                        border: "1px solid rgba(255,255,255,0.2)",
                                                        background: "rgba(255,255,255,0.05)",
                                                        color: "var(--color-on-surface-variant)",
                                                        fontFamily: "var(--font-headline)",
                                                        fontWeight: 700,
                                                        fontSize: "0.85rem",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: 6,
                                                        transition: "all 0.2s ease",
                                                    }}
                                                >
                                                    <span>🍂 Compost &amp; start fresh (+{COMPOST_REFUND_SEEDS} Seeds)</span>
                                                </button>
                                            )}

                                            {/* Water Button -- owns its own ticker, isolated from the rest of the card */}
                                            <WaterButton
                                                lastWatered={lastWatered}
                                                growth={growth}
                                                onWater={() => handleWaterPlant(plant.id, plant.name)}
                                                beatActive={beatAction === "water"}
                                            />

                                            {/* Fertilizer Button */}
                                            {growth < 100 && (
                                                <button
                                                    className="ws-garden-action ws-garden-action--fertilize"
                                                    onClick={() => handleFertilizePlant(plant.id, plant.name)}
                                                    disabled={beatAction === "fertilize"}
                                                    style={{
                                                        width: "100%",
                                                        padding: "8px 16px",
                                                        borderRadius: "0.85rem",
                                                        border: "1px solid rgba(244, 201, 93, 0.4)",
                                                        background: "rgba(244, 201, 93, 0.1)",
                                                        color: "#f4c95d",
                                                        fontFamily: "var(--font-headline)",
                                                        fontWeight: 700,
                                                        fontSize: "0.85rem",
                                                        cursor: beatAction === "fertilize" ? "default" : "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: 6,
                                                        transition: "all 0.2s ease",
                                                        opacity: beatAction === "fertilize" ? 0.6 : 1,
                                                    }}
                                                >
                                                    <span>🧪 Apply Fertilizer (Costs {getPlantEconomy(plant).fertilizerCost} Seeds)</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Empty Garden State */
                <div
                    className="glass-panel"
                    style={{
                        padding: 40,
                        borderRadius: "1.5rem",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 16,
                    }}
                >
                    <div style={{ fontSize: "3.5rem" }}>🪴</div>
                    <h3 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.4rem", fontWeight: 800, color: "var(--color-primary)" }}>
                                        Your Garden is Ready for Planting
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-on-surface-variant)", maxWidth: 500 }}>
                        Head over to the Seed Store to purchase your first botanical plant seeds and watch them grow inside geometric terrariums!
                    </p>
                    <button
                        className="ws-garden-action ws-garden-action--primary"
                        onClick={onOpenStore}
                        style={{
                            padding: "12px 24px",
                            borderRadius: "9999px",
                            border: "none",
                            background: "var(--color-primary)",
                            color: "var(--color-on-primary)",
                            fontFamily: "var(--font-headline)",
                            fontWeight: 800,
                            fontSize: "1rem",
                            cursor: "pointer",
                            boxShadow: "0 0 20px rgba(0, 228, 121, 0.4)",
                        }}
                    >
                        Browse Seed Store Catalog 🛒
                    </button>
                </div>
            )}
        </div>
    );
}
