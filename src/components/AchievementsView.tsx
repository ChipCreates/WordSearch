import { useState } from "react";
import { ACHIEVEMENTS, AchievementStats } from "../achievements";

type FilterType = "all" | "unlocked" | "locked";

type Props = {
    unlockedAchievements: Set<string>;
    stats: AchievementStats;
};

export default function AchievementsView({ unlockedAchievements, stats }: Props) {
    const [filter, setFilter] = useState<FilterType>("all");

    const totalCount = ACHIEVEMENTS.length;
    const unlockedCount = unlockedAchievements.size;
    const progressPercent = Math.round((unlockedCount / (totalCount || 1)) * 100);

    const filteredAchievements = ACHIEVEMENTS.filter(ach => {
        const isUnlocked = unlockedAchievements.has(ach.id);
        if (filter === "unlocked") return isUnlocked;
        if (filter === "locked") return !isUnlocked;
        return true;
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
            {/* Header Banner Card */}
            <div className="glass-panel" style={{ padding: 24, borderRadius: "1.25rem", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <span className="material-symbols-outlined filled text-primary" style={{ fontSize: 32 }}>emoji_events</span>
                            <h2 className="glow-text-emerald" style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.75rem", fontWeight: 800, color: "var(--color-primary)" }}>
                                Achievements & Cultivation
                            </h2>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--color-on-surface-variant)", maxWidth: 640, lineHeight: 1.5 }}>
                            You are blooming beautifully. Continue your linguistic cultivation to unlock more bioluminescent species for your digital conservatory.
                        </p>
                    </div>

                    <div style={{ textAlign: "right", minWidth: 160 }}>
                        <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.5rem", fontWeight: 800, color: "var(--color-primary)" }}>
                            {unlockedCount} / {totalCount}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                            UNLOCKED ({progressPercent}%)
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 12, width: "100%", background: "var(--color-surface-container-high)", borderRadius: 6, overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                    <div
                        className="bioluminescent-line"
                        style={{
                            height: "100%",
                            width: `${progressPercent}%`,
                            borderRadius: 6,
                            transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                    />
                </div>

                {/* Filter Selector Tabs */}
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    {(["all", "unlocked", "locked"] as FilterType[]).map(tab => (
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
                            {tab === "all" ? `All (${totalCount})` : tab === "unlocked" ? `Unlocked (${unlockedCount})` : `Locked (${totalCount - unlockedCount})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Achievement Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                {filteredAchievements.map(ach => {
                    const isUnlocked = unlockedAchievements.has(ach.id);
                    const currentProgress = ach.getProgress(stats);
                    const cardPercent = Math.min(100, Math.round((currentProgress / (ach.maxProgress || 1)) * 100));

                    return (
                        <div
                            key={ach.id}
                            className="glass-panel"
                            style={{
                                padding: 20,
                                borderRadius: "1.25rem",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                gap: 16,
                                borderLeft: `4px solid ${isUnlocked ? "var(--color-primary)" : "rgba(255,255,255,0.1)"}`,
                                opacity: isUnlocked ? 1 : 0.7,
                                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                            }}
                        >
                            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                                <div
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: "1.1rem",
                                        background: isUnlocked ? "rgba(0, 228, 121, 0.12)" : "rgba(255, 255, 255, 0.04)",
                                        border: `1px solid ${isUnlocked ? "rgba(0, 228, 121, 0.35)" : "rgba(255, 255, 255, 0.08)"}`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: isUnlocked ? "0 0 20px rgba(0, 228, 121, 0.25)" : "none",
                                        filter: isUnlocked ? "none" : "grayscale(100%) opacity(60%)",
                                        flexShrink: 0,
                                        overflow: "hidden",
                                        padding: 6,
                                    }}
                                >
                                    {ach.image ? (
                                        <img
                                            src={ach.image}
                                            alt={ach.name}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "contain",
                                                filter: isUnlocked ? "drop-shadow(0 0 8px rgba(0,228,121,0.6))" : "none",
                                            }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: "2rem" }}>{ach.icon}</span>
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <h3 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.1rem", fontWeight: 700, color: isUnlocked ? "var(--color-primary)" : "var(--color-on-surface)" }}>
                                            {ach.name}
                                        </h3>
                                        {isUnlocked ? (
                                            <span className="material-symbols-outlined filled text-primary" style={{ fontSize: 20 }}>check_circle</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>lock</span>
                                        )}
                                    </div>
                                    <p style={{ margin: "6px 0 0 0", fontSize: "0.85rem", color: "var(--color-on-surface-variant)", lineHeight: 1.4 }}>
                                        {ach.description}
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar footer */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-on-surface-variant)", marginBottom: 6, fontWeight: 600 }}>
                                    <span>{isUnlocked ? "Completed" : "Progress"}</span>
                                    <span>{currentProgress} / {ach.maxProgress}</span>
                                </div>
                                <div style={{ height: 6, width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                                    <div
                                        className="bioluminescent-line"
                                        style={{
                                            height: "100%",
                                            width: `${cardPercent}%`,
                                            borderRadius: 3,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
