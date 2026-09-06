import { Box, Button, useMediaQuery, Typography, Chip } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import StarRateRoundedIcon from "@mui/icons-material/StarRateRounded";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { REWARDS } from "../gameMechanics";

type Props = {
    currentLevel: number;
    onSelectLevel: (lvl: number) => void;
};

export default function LevelsView({ currentLevel, onSelectLevel }: Props) {
    const isMobile = useMediaQuery("(max-width: 900px)");
    const [selectedLevel, setSelectedLevel] = useState(currentLevel);
    
    // Endless levels: Render up to currentLevel + 50
    const totalRenderedLevels = Math.max(50, Math.ceil(currentLevel / 50) * 50 + 50);
    const levels = Array.from({ length: totalRenderedLevels }, (_, i) => i + 1);

    const scrollRef = useRef<HTMLDivElement>(null);

    const nodeSpacing = isMobile ? 140 : 220;
    const amplitude = isMobile ? 120 : 180;
    const getPoint = (l: number) => {
        return {
            x: (isMobile ? 150 : 400) + (l - 1) * nodeSpacing, // Offset initially so first node isn't hidden by HUD
            y: Math.sin(l * 0.8) * amplitude
        };
    };

    // Windowed rendering -- levels are "endless" by design (see above), so
    // only mount the node DOM for whatever's actually within/near the
    // viewport instead of every level up to currentLevel + 50 at once.
    const [scrollLeft, setScrollLeft] = useState(() => {
        const initialViewport = typeof window !== "undefined" ? window.innerWidth : 1200;
        return Math.max(0, getPoint(currentLevel).x - initialViewport / 2);
    });
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        let rafId: number | null = null;
        const onScroll = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                setScrollLeft(el.scrollLeft);
                rafId = null;
            });
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            el.removeEventListener("scroll", onScroll);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, []);
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    const viewportBuffer = nodeSpacing * 3;
    const visibleLevels = levels.filter(lvl => {
        const x = getPoint(lvl).x;
        return x >= scrollLeft - viewportBuffer && x <= scrollLeft + viewportWidth + viewportBuffer;
    });

    useEffect(() => {
        if (scrollRef.current) {
            // Center the current level horizontally
            const targetX = getPoint(currentLevel).x - window.innerWidth / 2;
            scrollRef.current.scrollTo({ left: Math.max(0, targetX), behavior: "smooth" });
        }
    }, [currentLevel]);

    // SVG Path calculation for smooth curves
    let pathD = "";
    levels.forEach(lvl => {
        const pt = getPoint(lvl);
        if (lvl === 1) {
            pathD += `M ${pt.x},${pt.y} `;
        } else {
            const prevPt = getPoint(lvl - 1);
            const cx = (prevPt.x + pt.x) / 2;
            pathD += `C ${cx},${prevPt.y} ${cx},${pt.y} ${pt.x},${pt.y} `;
        }
    });

    return (
        <Box sx={{ width: "100%", height: "100%", position: "relative", background: "var(--color-surface)", color: "var(--color-on-surface)", overflow: "hidden", borderRadius: isMobile ? 0 : "1rem" }}>
            
            {/* The Horizontal Scrolling Map Area */}
            <Box ref={scrollRef} sx={{ width: "100%", height: "100%", overflowX: "auto", overflowY: "hidden", position: "relative" }}>
                <Box sx={{ width: (isMobile ? 300 : 800) + totalRenderedLevels * nodeSpacing, height: "100%", position: "relative", display: "flex", alignItems: "center" }}>
                    
                    {/* SVG Curve */}
                    <svg style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 2, overflow: "visible", zIndex: 0, pointerEvents: "none" }}>
                        <g>
                            <path 
                                d={pathD}
                                fill="none"
                                stroke="var(--color-primary)"
                                strokeWidth="4"
                                style={{
                                    filter: `drop-shadow(0 0 10px var(--color-primary))`,
                                    opacity: 0.6
                                }}
                            />
                        </g>
                    </svg>

                    {/* Nodes */}
                    <Box sx={{ position: "absolute", top: "50%", left: 0, width: "100%", zIndex: 1 }}>
                        {visibleLevels.map(lvl => {
                            const pt = getPoint(lvl);
                            const isUnlocked = lvl <= currentLevel;
                            const isSelected = lvl === selectedLevel;
                            
                            return (
                                <Box 
                                    key={lvl}
                                    sx={{
                                        position: "absolute",
                                        left: pt.x,
                                        top: pt.y,
                                        transform: "translate(-50%, -50%)",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: isUnlocked ? "pointer" : "default",
                                        zIndex: 2,
                                    }}
                                    onClick={() => isUnlocked && setSelectedLevel(lvl)}
                                >
                                    <Box
                                        className={isSelected ? "ws-pulse-glow" : ""}
                                        sx={{
                                            width: isSelected ? 72 : 60,
                                            height: isSelected ? 72 : 60,
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: isUnlocked ? "var(--color-surface)" : "var(--color-surface-container)",
                                            border: `2px solid ${isUnlocked ? "var(--color-primary)" : "var(--color-outline-variant)"}`,
                                            color: isUnlocked ? "var(--color-primary)" : "var(--color-outline)",
                                            fontSize: isSelected ? "1.75rem" : "1.25rem",
                                            fontWeight: 800,
                                            fontFamily: "var(--font-headline)",
                                            boxShadow: isUnlocked ? `0 0 ${isSelected ? '30px' : '15px'} var(--color-primary), inset 0 0 20px rgba(var(--color-primary-rgb), 0.2)` : "none",
                                            transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                        }}
                                    >
                                        {lvl}
                                    </Box>
                                    {/* Stars (only for unlocked) */}
                                    {isUnlocked && (
                                        <Box sx={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "2px", mt: 1, background: "var(--color-surface-container-high)", px: 1, py: 0.5, borderRadius: 2, border: "1px solid var(--glass-border)" }}>
                                            <StarRateRoundedIcon sx={{ fontSize: 12, color: lvl < currentLevel ? "var(--color-primary)" : "var(--color-outline-variant)" }} />
                                            <StarRateRoundedIcon sx={{ fontSize: 12, color: lvl < currentLevel ? "var(--color-primary)" : "var(--color-outline-variant)" }} />
                                            <StarRateRoundedIcon sx={{ fontSize: 12, color: lvl < currentLevel ? "var(--color-primary)" : "var(--color-outline-variant)" }} />
                                        </Box>
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            </Box>



            {/* Right HUD Panel (Level Detail Card) */}
            <Box className="glass-panel" sx={{ 
                position: "absolute", 
                top: 24, 
                right: 24, 
                width: 340, 
                p: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                zIndex: 10,
                ...(isMobile && { top: 16, bottom: "auto", right: "50%", transform: "translateX(50%)", width: "90%", borderRadius: "1rem" })
            }}>
                <Box sx={{ 
                    width: "100%", 
                    height: isMobile ? "auto" : 140, 
                    p: isMobile ? 2 : 0,
                    background: "linear-gradient(145deg, var(--color-primary-container), var(--color-surface))", 
                    position: "relative",
                    display: isMobile ? "flex" : "block",
                    alignItems: "center",
                    justifyContent: "space-between"
                }}>
                    {/* Simulated Background Image Overlay */}
                    {!isMobile && <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 30%, rgba(var(--color-primary-rgb),0.15) 0%, transparent 60%)" }} />}
                    {!isMobile && <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 0%, var(--color-surface) 100%)" }} />}
                    
                    <Box sx={{ position: isMobile ? "relative" : "absolute", bottom: isMobile ? "auto" : 16, left: isMobile ? "auto" : 24, right: isMobile ? "auto" : 24 }}>
                        <Chip label={selectedLevel === currentLevel ? "NEXT LEVEL" : selectedLevel < currentLevel ? "COMPLETED" : "LOCKED"} 
                              size="small" 
                              sx={{ background: selectedLevel <= currentLevel ? "var(--color-primary)" : "var(--color-surface-container-high)", color: selectedLevel <= currentLevel ? "var(--color-on-primary)" : "var(--color-on-surface-variant)", fontWeight: 800, height: 20, fontSize: "0.65rem", mb: isMobile ? 0.5 : 1.5 }} />
                        <Typography sx={{ fontFamily: "var(--font-headline)", fontWeight: 800, fontSize: isMobile ? "1.1rem" : "1.35rem", color: "var(--color-on-surface)", lineHeight: 1.1 }}>
                            Level {selectedLevel}: {selectedLevel % 3 === 0 ? "Neon Canopy" : selectedLevel % 2 === 0 ? "Biolume Basin" : "Obsidian Grove"}
                        </Typography>
                    </Box>

                    {/* Compact Play Button for Mobile */}
                    {isMobile && (
                        <Button 
                            variant="contained" 
                            onClick={() => onSelectLevel(selectedLevel)}
                            disabled={selectedLevel > currentLevel}
                            sx={{ 
                                background: "var(--color-primary)", 
                                color: "var(--color-on-primary)", 
                                fontWeight: 800, 
                                minWidth: "auto",
                                px: 2,
                                py: 1,
                                borderRadius: "0.5rem",
                                "&:hover": { background: "var(--color-primary-container)" },
                                "&.Mui-disabled": { background: "var(--color-surface-container-high)", color: "var(--color-outline)" }
                            }}
                        >
                            <PlayArrowIcon />
                        </Button>
                    )}
                </Box>
                
                {/* Expanded Details (Hidden on Mobile) */}
                {!isMobile && (
                    <Box sx={{ p: 3, pt: 1, background: "var(--color-surface)" }}>
                        <Typography sx={{ color: "var(--color-outline)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: 1, mb: 2 }}>HOW TO CLEAR</Typography>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <CheckCircleOutlinedIcon sx={{ color: selectedLevel < currentLevel ? "var(--color-primary)" : "var(--color-outline)", fontSize: 18 }} />
                                <Typography sx={{ fontSize: "0.85rem", color: "var(--color-on-surface)" }}>Find every word on the list</Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <RadioButtonUncheckedIcon sx={{ color: "var(--color-outline)", fontSize: 18 }} />
                                <Typography sx={{ fontSize: "0.85rem", color: "var(--color-on-surface-variant)" }}>Optional: drag out bonus words for extra Seeds</Typography>
                            </Box>
                        </Box>

                        <Box sx={{ height: 1, background: "var(--glass-border)", mb: 3 }} />

                        <Typography sx={{ color: "var(--color-outline)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: 1, mb: 2 }}>REWARDS</Typography>
                        <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
                            <Box sx={{ background: "rgba(var(--color-primary-rgb), 0.1)", color: "var(--color-primary)", px: 1.5, py: 0.75, borderRadius: 1.5, display: "flex", alignItems: "center", gap: 0.5, border: "1px solid var(--glass-border)" }}>
                                <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>+{REWARDS.LEVEL_COMPLETE_SEEDS} Seeds on completion</Typography>
                            </Box>
                            <Box sx={{ background: "var(--color-surface-container)", color: "var(--color-tertiary)", px: 1.5, py: 0.75, borderRadius: 1.5, display: "flex", alignItems: "center", gap: 0.5, border: "1px solid var(--glass-border)" }}>
                                <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>+{REWARDS.BONUS_WORD_SEEDS} per bonus word</Typography>
                            </Box>
                        </Box>

                        <Button 
                            fullWidth 
                            variant="contained" 
                            onClick={() => onSelectLevel(selectedLevel)}
                            disabled={selectedLevel > currentLevel}
                            sx={{ 
                                background: "var(--color-primary)", 
                                color: "var(--color-on-primary)", 
                                fontWeight: 800, 
                                fontFamily: "var(--font-headline)",
                                fontSize: "1.1rem",
                                py: 1.5,
                                borderRadius: "0.5rem",
                                "&:hover": {
                                    background: "var(--color-primary-container)",
                                    boxShadow: `0 0 20px var(--color-primary)`
                                },
                                "&.Mui-disabled": {
                                    background: "var(--color-surface-container-high)",
                                    color: "var(--color-outline)"
                                }
                            }}
                        >
                            <PlayArrowIcon sx={{ mr: 0.5 }} />
                            Play Level
                        </Button>
                    </Box>
                )}
            </Box>

        </Box>
    );
}
