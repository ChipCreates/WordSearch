import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { keyframes } from "@emotion/react";
import type { MilestoneQueueEvent } from "../presentationQueue";
import { getMilestoneContent, getRegionTransitionIntensity, REGION_TRANSITION_DURATION_MS } from "../milestones";
import { getRegionById } from "../regions";
import { REWARD_PRESENTATION, type RewardIntensity } from "../rewardIntensity";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

// WSP-2.4: the milestone (levels 10/20/30/40/50/70/100) and region-transition
// title card -- distinct from SuccessScreen (the per-level summary, always
// shown) and BotanistPromotionCeremony (rank promotions, a separate and much
// more frequent system, shown inline inside SuccessScreen). This renders on
// top of the success overlay exactly like AchievementBanner already does,
// fed by useWordSearchGame.ts's `milestoneQueue` (one event consumed at a
// time, oldest first) via the shared ordering policy in presentationQueue.ts.
//
// Unlike AchievementBanner's small corner toast, this is deliberately a
// centered "title card" at every intensity -- the acceptance criteria call
// these out by name as title-card moments, not routine toasts -- but the
// scrim/duration/audio-cue/particle weight still come straight from WSP-2.1's
// REWARD_PRESENTATION table, so a "small" milestone (level 10) reads as
// meaningfully lighter than an "exceptional" one (level 100) even though
// both use the same card shell.

const entrance = keyframes`
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;
const overlayFade = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

type Props = {
    event: MilestoneQueueEvent | null;
    onDismiss: () => void;
    isMobile?: boolean;
};

type ResolvedContent = {
    key: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    body: string;
    intensity: RewardIntensity;
    durationMs: { desktop: number; mobile: number };
    ambientThemeKey?: string;
};

function resolveContent(event: MilestoneQueueEvent): ResolvedContent | null {
    if (event.kind === "milestone") {
        const content = getMilestoneContent(event.level);
        if (!content) return null; // defensive -- every MILESTONE_LEVELS entry has content
        const spec = REWARD_PRESENTATION[content.intensity];
        return {
            key: `milestone-${event.level}`,
            eyebrow: `Level ${event.level} milestone`,
            title: content.title,
            subtitle: content.subtitle,
            body: content.body,
            intensity: content.intensity,
            durationMs: { desktop: spec.desktopDurationMs, mobile: spec.mobileDurationMs },
        };
    }

    const region = getRegionById(event.regionId);
    const intensity = getRegionTransitionIntensity(event.transition);
    const isCompletion = event.transition === "completion";
    return {
        key: `region-${event.regionId}-${event.transition}-${event.level}`,
        eyebrow: isCompletion ? "Region complete" : "Entering a new region",
        title: region ? (isCompletion ? `${region.name} Complete` : `Entering ${region.name}`) : "A new region",
        subtitle: region?.tagline ?? "",
        body: `${isCompletion ? "Completion" : "Entry"} reward: +${event.rewardSeeds} Seeds.`,
        intensity,
        // Region transitions get a fixed, deliberately short (3-6s) card
        // regardless of intensity -- see milestones.ts's own comment on why
        // this differs from the milestone branch above.
        durationMs: REGION_TRANSITION_DURATION_MS,
        ambientThemeKey: region?.ambientThemeKey,
    };
}

export default function MilestoneCard({ event, onDismiss, isMobile }: Props) {
    const reducedMotion = usePrefersReducedMotion();
    const resolved = event ? resolveContent(event) : null;
    const duration = resolved ? (isMobile ? resolved.durationMs.mobile : resolved.durationMs.desktop) : 0;

    useEffect(() => {
        if (!resolved) return;
        const timer = setTimeout(onDismiss, duration);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolved?.key, duration]);

    if (!resolved) return null;

    const spec = REWARD_PRESENTATION[resolved.intensity];
    const showScrim = isMobile ? spec.scrim.mobile : spec.scrim.desktop;
    // prefers-reduced-motion: instant static presentation, no exception --
    // the card and scrim simply appear at their final state with no
    // entrance animation and no particle burst. This is not a shorter
    // version of the same motion, it is no motion at all, matching the
    // "instant static transition" wording in the acceptance criteria.
    const skipAnimation = reducedMotion;

    return (
        <>
            {showScrim && (
                <Box
                    aria-hidden="true"
                    key={`${resolved.key}-scrim`}
                    sx={{
                        position: "fixed", inset: 0, zIndex: 2099, pointerEvents: "none",
                        backgroundColor: "rgba(4, 14, 8, 0.6)",
                        backdropFilter: "var(--glass-blur, blur(12px))",
                        ...(skipAnimation ? { opacity: 1 } : { animation: `${overlayFade} 320ms ease-out forwards` }),
                    }}
                />
            )}
            <Box
                key={resolved.key}
                role="dialog"
                aria-modal="false"
                aria-label={`${resolved.eyebrow}: ${resolved.title}`}
                className={`ws-milestone-card ws-milestone-card--${resolved.intensity}${resolved.ambientThemeKey ? ` ws-milestone-card--theme-${resolved.ambientThemeKey}` : ""}`}
                onClick={onDismiss}
                sx={{
                    position: "fixed", top: "50%", left: "50%", zIndex: 2100,
                    width: "calc(100% - 32px)", maxWidth: 460,
                    textAlign: "center", cursor: "pointer",
                    padding: "28px 24px",
                    borderRadius: "18px",
                    border: "1px solid rgba(255,255,255,0.22)",
                    background: "linear-gradient(160deg, rgba(15,82,56,0.92), rgba(6,32,22,0.94))",
                    boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
                    color: "#f4fff2",
                    ...(skipAnimation
                        ? { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }
                        : { animation: `${entrance} 380ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards` }),
                }}
            >
                <Typography component="span" sx={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75, display: "block", mb: 1 }}>
                    {resolved.eyebrow}
                </Typography>
                <Typography component="h2" sx={{ fontFamily: "var(--font-headline)", fontWeight: 800, fontSize: { xs: "1.4rem", sm: "1.7rem" }, mb: 0.5, lineHeight: 1.15 }}>
                    {resolved.title}
                </Typography>
                {resolved.subtitle && (
                    <Typography component="p" sx={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", opacity: 0.85, mb: 1.5 }}>
                        {resolved.subtitle}
                    </Typography>
                )}
                <Typography component="p" sx={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", opacity: 0.92, lineHeight: 1.5, mb: 2 }}>
                    {resolved.body}
                </Typography>
                <Typography component="span" sx={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", opacity: 0.6 }}>
                    Tap to continue
                </Typography>
            </Box>
        </>
    );
}
