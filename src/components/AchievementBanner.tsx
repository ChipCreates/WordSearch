import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { keyframes } from "@emotion/react";
import type { Achievement } from "../achievements";

const TOTAL_MS = 3500;

const lifecycle = keyframes`
  0%   { transform: translate(-50%, -160%) scale(0.7); opacity: 0; }
  10%  { transform: translate(-50%, 14%) scale(1.06); opacity: 1; }
  18%  { transform: translate(-50%, 0) scale(1); opacity: 1; }
  82%  { transform: translate(-50%, 0) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -160%) scale(0.85); opacity: 0; }
`;

const cornerLifecycle = keyframes`
  0%   { transform: translate(0, 24px) scale(0.7); opacity: 0; }
  10%  { transform: translate(0, 0) scale(1.06); opacity: 1; }
  18%  { transform: translate(0, 0) scale(1); opacity: 1; }
  82%  { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(0, 24px) scale(0.85); opacity: 0; }
`;

const shine = keyframes`
  0%, 22% { transform: translateX(-140%) rotate(20deg); }
  55%, 100% { transform: translateX(240%) rotate(20deg); }
`;

const medallionPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
`;

import { assetUrl } from "../categoryThemes";

type Props = {
    achievement: Achievement | null;
    onDismiss: () => void;
};

export default function AchievementBanner({ achievement, onDismiss }: Props) {
    useEffect(() => {
        if (!achievement) return;

        // Auto-dismiss after 3.5 seconds
        const timer = setTimeout(() => {
            onDismiss();
        }, TOTAL_MS);

        // Dismiss immediately when user clicks anywhere on screen
        const handleGlobalClick = () => {
            onDismiss();
        };

        window.addEventListener("click", handleGlobalClick);
        window.addEventListener("touchstart", handleGlobalClick);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("click", handleGlobalClick);
            window.removeEventListener("touchstart", handleGlobalClick);
        };
    }, [achievement, onDismiss]);

    if (!achievement) return null;

    return (
        <Box
            key={achievement.id}
            onClick={(e) => {
                e.stopPropagation();
                onDismiss();
            }}
            sx={{
                position: "fixed",
                top: { xs: 0, md: "auto" },
                bottom: { xs: "auto", md: 24 },
                left: { xs: "50%", md: "auto" },
                right: { xs: "auto", md: 24 },
                zIndex: 2000,
                width: { xs: "calc(100% - 24px)", sm: 520, md: 470 },
                maxWidth: { xs: 520, md: 470 },
                cursor: "pointer",
                pointerEvents: "auto",
                animation: {
                    xs: `${lifecycle} ${TOTAL_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                    md: `${cornerLifecycle} ${TOTAL_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                },
            }}
        >
            <Box
                sx={{
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1.5, sm: 2.5 },
                    mt: { xs: 1.5, sm: 2.5 },
                    p: { xs: 1.5, sm: 2.5 },
                    borderRadius: { xs: 5, md: 6 },
                    background:
                        "linear-gradient(135deg, rgba(12, 34, 26, 0.96) 0%, rgba(13, 78, 51, 0.96) 58%, rgba(82, 143, 73, 0.92) 100%)",
                    border: "1px solid rgba(164,247,146,0.7)",
                    boxShadow:
                        "0 18px 46px rgba(0,0,0,0.55), 0 0 42px rgba(116,195,101,0.34), inset 0 1px 0 rgba(255,255,255,0.18)",
                    backdropFilter: "blur(12px)",
                }}
            >
                {/* Diagonal glint sweep */}
                <Box
                    sx={{
                        position: "absolute",
                        inset: "-40% -10%",
                        background:
                            "linear-gradient(75deg, transparent 40%, rgba(255,255,255,0.65) 50%, transparent 60%)",
                        animation: `${shine} ${TOTAL_MS}ms ease-in-out`,
                    }}
                />

                {/* Medallion */}
                <Box
                    sx={{
                        position: "relative",
                        flexShrink: 0,
                        width: { xs: 60, sm: 76 },
                        height: { xs: 60, sm: 76 },
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "radial-gradient(circle at 35% 30%, rgba(210,255,177,0.32), rgba(23,105,67,0.56) 55%, rgba(17,53,38,0.82))",
                        border: "2px solid rgba(196,255,164,0.76)",
                        boxShadow: "0 0 0 5px rgba(164,247,146,0.1), 0 0 28px rgba(164,247,146,0.42), inset 0 0 18px rgba(255,255,255,0.12)",
                        animation: `${medallionPulse} 1.1s ease-in-out infinite`,
                        overflow: "hidden",
                        padding: 1,
                    }}
                >
                    {achievement.image ? (
                        <img
                            src={achievement.image.startsWith("http") ? achievement.image : assetUrl(achievement.image.startsWith("/") ? achievement.image.slice(1) : achievement.image)}
                            alt={achievement.name}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                filter: "drop-shadow(0 0 6px rgba(0,228,121,0.6))",
                            }}
                        />
                    ) : (
                        <Typography sx={{ fontSize: { xs: "2rem", sm: "2.4rem" }, lineHeight: 1 }}>
                            {achievement.icon}
                        </Typography>
                    )}
                </Box>

                {/* Text */}
                <Box sx={{ position: "relative", minWidth: 0, flex: 1 }}>
                    <Typography
                        sx={{
                            fontSize: { xs: "0.7rem", sm: "0.78rem" },
                            fontWeight: 900,
                            letterSpacing: "0.14em",
                            color: "var(--color-primary)",
                        }}
                    >
                        ACHIEVEMENT UNLOCKED
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: { xs: "1.2rem", sm: "1.45rem" },
                            fontWeight: 900,
                            lineHeight: 1.15,
                            color: "#ffffff",
                            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                            fontFamily: "var(--font-headline)",
                        }}
                    >
                        {achievement.name}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: { xs: "0.8rem", sm: "0.88rem" },
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.85)",
                        }}
                    >
                        {achievement.description}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
