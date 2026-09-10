import { useEffect } from "react";
import { Box } from "@mui/material";
import { keyframes } from "@emotion/react";
import type { Achievement } from "../achievements";
import { assetUrl } from "../categoryThemes";

const TOTAL_MS = 6000;
// Mobile's version dims/blurs the whole screen behind the banner (see the
// scrim below) rather than desktop's small, easily-ignored corner toast --
// that makes the same 6s hang time read as noticeably longer/more
// intrusive on mobile, hence the separate, shorter duration.
const MOBILE_TOTAL_MS = 3500;
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
const overlayFade = keyframes`
  0% { opacity: 0; }
  10%, 85% { opacity: 1; }
  100% { opacity: 0; }
`;

type Props = { achievement: Achievement | null; onDismiss: () => void; persist?: boolean; isMobile?: boolean };

export default function AchievementBanner({ achievement, onDismiss, persist, isMobile }: Props) {
    const duration = isMobile ? MOBILE_TOTAL_MS : TOTAL_MS;
    useEffect(() => {
        if (!achievement || persist) return;
        const timer = setTimeout(onDismiss, duration);
        return () => clearTimeout(timer);
    }, [achievement, onDismiss, persist, duration]);

    if (!achievement) return null;
    const badge = achievement.image;
    return (
        <>
            {/* Mobile only: the banner sits over the busy board, so dim/blur the
                whole screen behind it -- on desktop it's a small corner toast
                that doesn't need the extra weight. */}
            <Box aria-hidden="true" key={`${achievement.id}-scrim`}
                sx={{
                    display: { xs: "block", md: "none" },
                    position: "fixed", inset: 0, zIndex: 1999, pointerEvents: "none",
                    backgroundColor: "rgba(4, 14, 8, 0.55)",
                    backdropFilter: "var(--glass-blur, blur(12px))",
                    ...(persist ? { opacity: 1 } : { animation: `${overlayFade} ${MOBILE_TOTAL_MS}ms ease-in-out forwards` }),
                }} />
            <Box key={achievement.id} className="ws-achievement-banner" role="status"
                sx={{
                    position: "fixed", top: { xs: "max(8px, env(safe-area-inset-top))", md: "auto" },
                    bottom: { xs: "auto", md: 24 }, left: { xs: "50%", md: "auto" },
                    right: { xs: "auto", md: 24 }, zIndex: 2000,
                    width: { xs: "calc(100% - 12px)", sm: 580, md: 620 },
                    maxWidth: "calc(100vw - 12px)",
                    ...(persist
                        ? { opacity: 1, transform: { xs: "translate(-50%, 0)", md: "translateY(0)" } }
                        : {
                            animation: {
                                xs: `${mobileEntrance} ${MOBILE_TOTAL_MS}ms ease-in-out forwards`,
                                md: `${desktopEntrance} ${TOTAL_MS}ms ease-in-out forwards`,
                            },
                        }),
                }}>
                <button type="button" className="ws-achievement-banner__art"
                    onClick={e => { e.stopPropagation(); onDismiss(); }}
                    aria-label={`Achievement unlocked: ${achievement.name}. ${achievement.description}. Dismiss notification.`}>
                    <img className="ws-achievement-banner__frame" src={assetUrl("achievements/botanical-banner-frame-circle.png")} alt="" />
                    <span className="ws-achievement-banner__badge" aria-hidden="true">
                        {badge ? <img src={badge.startsWith("http") ? badge : assetUrl(badge.replace(/^\//, ""))} alt="" /> : achievement.icon}
                    </span>
                    <span className="ws-achievement-banner__copy" aria-hidden="true">
                        <span className="ws-achievement-banner__eyebrow">Achievement unlocked</span>
                        <span className="ws-achievement-banner__name">{achievement.name}</span>
                    </span>
                </button>
            </Box>
        </>
    );
}
