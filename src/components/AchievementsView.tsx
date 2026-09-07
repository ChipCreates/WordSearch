import { useState } from "react";
import { EmojiEventsOutlined, CheckCircleOutlined, LockOutlined } from "@mui/icons-material";
import { ACHIEVEMENTS, AchievementStats } from "../achievements";
import { assetUrl } from "../categoryThemes";

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
                            <EmojiEventsOutlined style={{ fontSize: 32, color: "var(--color-primary)" }} />
                            <h2 className="glow-text-emerald" style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.75rem", fontWeight: 800, color: "var(--color-primary)" }}>
                                Achievements & Cultivation
                            </h2>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--color-on-surface-variant)", maxWidth: 640, lineHeight: 1.5 }}>
                            You are blooming beautifully. Keep finding words to bring new species to the Moonlit Conservatory.
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
                            className={`glass-panel ${isUnlocked ? "glow-emerald" : ""}`}
                            style={{
                                padding: 20,
                                borderRadius: "1.25rem",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                gap: 16,
                                borderLeft: `4px solid ${isUnlocked ? "var(--color-primary)" : "rgba(255,255,255,0.1)"}`,
                                opacity: isUnlocked ? 1 : 0.7,
                                boxShadow: isUnlocked
                                    ? "0 0 24px rgba(0, 228, 121, 0.22), var(--glass-shadow)"
                                    : "var(--glass-shadow)",
                                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                            }}
                        >
                            <div>
                                    <div className={`ws-achievement-card__banner ${isUnlocked ? "" : "ws-achievement-card__banner--locked"} ${ach.tier ? `ws-achievement-card__banner--${ach.tier}` : ""}`}>
                                    <img className="ws-achievement-card__frame" src={assetUrl("achievements/botanical-banner-frame-circle.png")} alt="" />
                                    <span className="ws-achievement-card__badge">
                                        {ach.image ? (
                                            <img
                                                className="ws-achievement-art"
                                                src={ach.image.startsWith("http") ? ach.image : assetUrl(ach.image.startsWith("/") ? ach.image.slice(1) : ach.image)}
                                                alt={ach.name}
                                                style={{ filter: isUnlocked ? "drop-shadow(0 0 10px rgba(0, 228, 121, 0.75))" : "none" }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: "2.2rem" }}>{ach.icon}</span>
                                        )}
                                    </span>
                                    <div className="ws-achievement-card__title-row">
                                        <h3 className="ws-achievement-card__title" style={{ color: isUnlocked ? "var(--color-primary)" : "var(--color-on-surface)" }}>
                                            {ach.name}
                                        </h3>
                                    </div>
                                    <span className="ws-achievement-card__status-icon" aria-hidden="true">
                                        {isUnlocked ? (
                                            <CheckCircleOutlined style={{ fontSize: 20, color: "var(--color-primary)" }} />
                                        ) : (
                                            <LockOutlined style={{ fontSize: 18, color: "var(--color-on-surface-variant)" }} />
                                        )}
                                    </span>
                                </div>

                                <p className="ws-achievement-card__description">
                                    {!isUnlocked && ach.actionableCopy ? ach.actionableCopy : ach.description}
                                </p>
                                {ach.tier && (
                                    <span style={{ alignSelf: "flex-start", padding: "3px 8px", borderRadius: 999, background: isUnlocked ? "rgba(244, 201, 93, 0.16)" : "rgba(255,255,255,0.06)", color: isUnlocked ? "#f4c95d" : "var(--color-on-surface-variant)", border: "1px solid rgba(244, 201, 93, 0.28)", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                        {ach.tier}
                                    </span>
                                )}
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
