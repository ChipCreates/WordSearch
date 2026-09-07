import { useEffect } from "react";
import { Box } from "@mui/material";
import { keyframes } from "@emotion/react";
import type { Achievement } from "../achievements";
import { assetUrl } from "../categoryThemes";

const TOTAL_MS = 6000;
const mobileEntrance = keyframes`
  0% { transform: translate(-50%, -110%); opacity: 0; }
  10%, 85% { transform: translate(-50%, 0); opacity: 1; }
  100% { transform: translate(-50%, -110%); opacity: 0; }
`;
const desktopEntrance = keyframes`
  0% { transform: translateY(28px); opacity: 0; }
  10%, 85% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(28px); opacity: 0; }
`;

type Props = { achievement: Achievement | null; onDismiss: () => void };

export default function AchievementBanner({ achievement, onDismiss }: Props) {
    useEffect(() => {
        if (!achievement) return;
        const timer = setTimeout(onDismiss, TOTAL_MS);
        return () => clearTimeout(timer);
    }, [achievement, onDismiss]);

    if (!achievement) return null;
    const badge = achievement.image;
    return (
        <Box key={achievement.id} className="ws-achievement-banner" role="status"
            sx={{
                position: "fixed", top: { xs: "max(8px, env(safe-area-inset-top))", md: "auto" },
                bottom: { xs: "auto", md: 24 }, left: { xs: "50%", md: "auto" },
                right: { xs: "auto", md: 24 }, zIndex: 2000,
                width: { xs: "calc(100% - 12px)", sm: 580, md: 620 },
                maxWidth: "calc(100vw - 12px)",
                animation: {
                    xs: `${mobileEntrance} ${TOTAL_MS}ms ease-in-out forwards`,
                    md: `${desktopEntrance} ${TOTAL_MS}ms ease-in-out forwards`,
                },
            }}>
            <button type="button" className="ws-achievement-banner__art"
                onClick={e => { e.stopPropagation(); onDismiss(); }}
                aria-label={`Achievement unlocked: ${achievement.name}. ${achievement.description}. Dismiss notification.`}>
                <img className="ws-achievement-banner__frame" src={assetUrl("achievements/botanical-banner-frame-tall.png")} alt="" />
                <span className="ws-achievement-banner__badge" aria-hidden="true">
                    {badge ? <img src={badge.startsWith("http") ? badge : assetUrl(badge.replace(/^\//, ""))} alt="" /> : achievement.icon}
                </span>
                <span className="ws-achievement-banner__copy" aria-hidden="true">
                    <span className="ws-achievement-banner__eyebrow">Achievement unlocked</span>
                    <span className="ws-achievement-banner__name">{achievement.name}</span>
                </span>
            </button>
        </Box>
    );
}
