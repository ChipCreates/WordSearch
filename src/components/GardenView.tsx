import { useState } from "react";
import { ShowerOutlined, WaterDropOutlined } from "@mui/icons-material";
import EcoLeaf from "./icons/EcoLeaf";

type Props = {
    stars: number; // Seed count multiplier
    level: number;
    unlockedAchievementsCount: number;
};

type FilterTab = "all" | "bloomed" | "seedlings" | "locked";

type Plant = {
    id: string;
    name: string;
    species: string;
    icon: string;
    image?: string;
    reqLevel: number;
    growthPercent: number; // 0 - 100
    description: string;
};

export default function GardenView({ stars, level, unlockedAchievementsCount }: Props) {
    const [filter, setFilter] = useState<FilterTab>("all");
    const [wateredPlants, setWateredPlants] = useState<Set<string>>(new Set());

    const seeds = stars * 100;

    const plants: Plant[] = [
        {
            id: "moss-sprout",
            name: "Deep Moss Sprout",
            species: "Bryophyta Lumina",
            icon: "🌱",
            image: "/plants/moss-sprout.png",
            reqLevel: 1,
            growthPercent: 100,
            description: "Soft bioluminescent carpeting moss that absorbs ambient moisture in crystalline terrarium glass.",
        },
        {
            id: "emerald-fern",
            name: "Emerald Fern",
            species: "Polypodiopsida Emeraldus",
            icon: "🌿",
            image: "/plants/emerald-fern.png",
            reqLevel: 3,
            growthPercent: level >= 3 ? 100 : 40,
            description: "Fronds that glow with a brilliant viridian hue inside geometric brass-bound glass.",
        },
        {
            id: "bio-orchid",
            name: "Bioluminescent Orchid",
            species: "Orchidaceae Aurora",
            icon: "🌸",
            image: "/plants/bio-orchid.png",
            reqLevel: 5,
            growthPercent: level >= 5 ? 100 : Math.min(90, level * 18),
            description: "Produces fragrant neon-pink spores during celestial events in a dodecahedron terrarium.",
        },
        {
            id: "midnight-lotus",
            name: "Midnight Lotus",
            species: "Nelumbo Nocturna",
            icon: "🪷",
            image: "/plants/midnight-lotus.png",
            reqLevel: 8,
            growthPercent: level >= 8 ? 100 : Math.min(80, level * 10),
            description: "Opens only under moonlit glass panels, floating in runic aquatic water spheres.",
        },
        {
            id: "golden-sunflower",
            name: "Golden Sunflower",
            species: "Helianthus Solis",
            icon: "🌻",
            image: "/plants/golden-sunflower.png",
            reqLevel: 10,
            growthPercent: level >= 10 ? 100 : Math.min(70, level * 7),
            description: "Channels solar radiation into pure botanical energy and golden light particles.",
        },
        {
            id: "bonsai-bloom",
            name: "Bonsai Bloom",
            species: "Pinus Ancientis",
            icon: "🪴",
            image: "/plants/bonsai-bloom.png",
            reqLevel: 15,
            growthPercent: level >= 15 ? 100 : Math.min(50, level * 3),
            description: "Miniature ancient tree sculpted over decades of bioluminescent cultivation.",
        },
        {
            id: "crystal-succulent",
            name: "Prismatic Echeveria",
            species: "Succulenta Refracta",
            icon: "💎",
            image: "/plants/crystal-succulent.png",
            reqLevel: 20,
            growthPercent: level >= 20 ? 100 : Math.min(30, level * 1.5),
            description: "Leaf tips crystallize into shimmering light refractors inside a botanical prism.",
        },
        {
            id: "solar-vine",
            name: "Solaris Vine",
            species: "Hedera Aureus",
            icon: "🌿",
            image: "/plants/solar-vine.png",
            reqLevel: 25,
            growthPercent: level >= 25 ? 100 : Math.min(20, level * 0.8),
            description: "Climbs vertical trellises, illuminating structural conservatory arches.",
        },
    ];

    const bloomedCount = plants.filter(p => level >= p.reqLevel).length;

    const filteredPlants = plants.filter(plant => {
        const isUnlocked = level >= plant.reqLevel;
        if (filter === "bloomed") return isUnlocked && plant.growthPercent >= 100;
        if (filter === "seedlings") return isUnlocked && plant.growthPercent < 100;
        if (filter === "locked") return !isUnlocked;
        return true;
    });

    const handleWaterPlant = (id: string) => {
        setWateredPlants(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
            {/* Header Sanctuary Banner Card */}
            <div className="glass-panel" style={{ padding: 24, borderRadius: "1.25rem", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <EcoLeaf style={{ fontSize: 32, color: "var(--color-primary)" }} />
                            <h2 className="glow-text-emerald" style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.75rem", fontWeight: 800, color: "var(--color-primary)" }}>
                                Digital Conservatory & Botanical Sanctuary
                            </h2>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--color-on-surface-variant)", maxWidth: 680, lineHeight: 1.5 }}>
                            Water and nurture your bioluminescent collection. Every level completed increases greenhouse vitality and oxygen output.
                        </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                                <img src="/seed.png" alt="Seed" style={{ width: 28, height: 28, objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(0,228,121,0.6))" }} />
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
                        <span>Conservatory Growth (Level {level}) • {unlockedAchievementsCount} Trophies Unlocked</span>
                        <span>{bloomedCount} / {plants.length} Species Bloomed ({Math.round((bloomedCount / plants.length) * 100)}%)</span>
                    </div>
                    <div style={{ height: 12, width: "100%", background: "var(--color-surface-container-high)", borderRadius: 6, overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                        <div
                            className="bioluminescent-line"
                            style={{
                                height: "100%",
                                width: `${Math.min(100, (bloomedCount / plants.length) * 100)}%`,
                                borderRadius: 6,
                                transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                        />
                    </div>
                </div>

                {/* Filter Tabs */}
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    {(["all", "bloomed", "seedlings", "locked"] as FilterTab[]).map(tab => (
                        <button
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
                            {tab === "all" ? `All Flora (${plants.length})` : tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Plants Grid with Large Bioluminescent Terrarium Tile Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
                {filteredPlants.map(plant => {
                    const isUnlocked = level >= plant.reqLevel;
                    const isWatered = wateredPlants.has(plant.id);

                    return (
                        <div
                            key={plant.id}
                            className="glass-panel"
                            style={{
                                borderRadius: "1.5rem",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                border: `1px solid ${isUnlocked ? "rgba(0, 228, 121, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                                background: isUnlocked
                                    ? "linear-gradient(180deg, rgba(0, 228, 121, 0.08) 0%, rgba(20, 30, 25, 0.6) 100%)"
                                    : "rgba(255, 255, 255, 0.02)",
                                opacity: isUnlocked ? 1 : 0.6,
                                boxShadow: isUnlocked ? "0 8px 32px rgba(0, 228, 121, 0.12)" : "none",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                        >
                            {/* Large Bioluminescent Plant Tile Hero Frame */}
                            <div
                                style={{
                                    height: 220,
                                    width: "100%",
                                    position: "relative",
                                    background: isUnlocked
                                        ? "radial-gradient(circle at 50% 60%, rgba(0, 228, 121, 0.25) 0%, rgba(0, 0, 0, 0.4) 80%)"
                                        : "rgba(0, 0, 0, 0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: 16,
                                    overflow: "hidden",
                                }}
                            >
                                {plant.image ? (
                                    <img
                                        src={plant.image}
                                        alt={plant.name}
                                        style={{
                                            maxHeight: "100%",
                                            maxWidth: "100%",
                                            objectFit: "contain",
                                            filter: isUnlocked
                                                ? "drop-shadow(0 0 20px rgba(0, 228, 121, 0.45))"
                                                : "grayscale(100%) opacity(50%)",
                                            transition: "transform 0.4s ease",
                                        }}
                                    />
                                ) : (
                                    <span style={{ fontSize: "5rem", filter: isUnlocked ? "drop-shadow(0 0 15px rgba(0,228,121,0.5))" : "grayscale(100%)" }}>
                                        {isUnlocked ? plant.icon : "🔒"}
                                    </span>
                                )}

                                {/* Level Badge Tag */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: 14,
                                        right: 14,
                                        padding: "4px 12px",
                                        borderRadius: "9999px",
                                        background: isUnlocked ? "rgba(0, 228, 121, 0.25)" : "rgba(0, 0, 0, 0.5)",
                                        border: `1px solid ${isUnlocked ? "rgba(0, 228, 121, 0.5)" : "rgba(255, 255, 255, 0.15)"}`,
                                        backdropFilter: "blur(8px)",
                                        color: isUnlocked ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        fontFamily: "var(--font-headline)",
                                    }}
                                >
                                    {isUnlocked ? "BLOOMED" : `LVL ${plant.reqLevel}`}
                                </div>
                            </div>

                            {/* Info & Action Controls */}
                            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "space-between" }}>
                                <div>
                                    <h3 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 700, color: isUnlocked ? "var(--color-primary)" : "var(--color-on-surface)" }}>
                                        {plant.name}
                                    </h3>
                                    <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--color-primary)", margin: "2px 0 8px 0" }}>
                                        {plant.species}
                                    </div>
                                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-on-surface-variant)", lineHeight: 1.4 }}>
                                        {plant.description}
                                    </p>
                                </div>

                                {/* Growth progress & Water button */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-on-surface-variant)", marginBottom: 6, fontWeight: 600 }}>
                                        <span>Growth Stage</span>
                                        <span>{isUnlocked ? `${plant.growthPercent}%` : `Locked (Requires Level ${plant.reqLevel})`}</span>
                                    </div>
                                    <div style={{ height: 6, width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
                                        <div
                                            className="bioluminescent-line"
                                            style={{
                                                height: "100%",
                                                width: `${isUnlocked ? plant.growthPercent : 0}%`,
                                                borderRadius: 3,
                                            }}
                                        />
                                    </div>

                                    {isUnlocked && (
                                        <button
                                            onClick={() => handleWaterPlant(plant.id)}
                                            disabled={isWatered}
                                            style={{
                                                width: "100%",
                                                padding: "10px 16px",
                                                borderRadius: "0.85rem",
                                                border: "1px solid var(--glass-border)",
                                                background: isWatered ? "rgba(0, 228, 121, 0.25)" : "var(--color-primary)",
                                                color: "var(--color-on-primary)",
                                                fontFamily: "var(--font-headline)",
                                                fontWeight: 800,
                                                fontSize: "0.9rem",
                                                cursor: isWatered ? "default" : "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 8,
                                                boxShadow: isWatered ? "none" : "0 0 20px rgba(0, 228, 121, 0.3)",
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            {isWatered ? (
                                                <WaterDropOutlined style={{ fontSize: 20 }} />
                                            ) : (
                                                <ShowerOutlined style={{ fontSize: 20 }} />
                                            )}
                                            <span>{isWatered ? "Nurtured Today ✨" : "Water Sprout"}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
