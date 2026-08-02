import { Box, Typography } from "@mui/material";
import { keyframes } from "@emotion/react";
import type { Achievement } from "../achievements";

// One continuous timeline (drop in with overshoot -> hold -> slide back out)
// instead of a phase state machine -- onAnimationEnd fires exactly once,
// right when the whole thing is done, so that's the only hook the queue
// (App.tsx's justUnlocked/dismissJustUnlocked) needs.
const TOTAL_MS = 4200;

const lifecycle = keyframes`
  0%   { transform: translate(-50%, -160%) scale(0.7); opacity: 0; }
  9%   { transform: translate(-50%, 14%) scale(1.06); opacity: 1; }
  15%  { transform: translate(-50%, 0) scale(1); opacity: 1; }
  85%  { transform: translate(-50%, 0) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -160%) scale(0.85); opacity: 0; }
`;

const shine = keyframes`
  0%, 22% { transform: translateX(-140%) rotate(20deg); }
  55%, 100% { transform: translateX(240%) rotate(20deg); }
`;

const medallionPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
`;

const sparkle = keyframes`
  0% { transform: translate(0, 0) scale(0.4); opacity: 0; }
  35% { opacity: 1; }
  100% { transform: var(--sparkle-travel) scale(1.15); opacity: 0; }
`;

const SPARKLES = [
  { top: "-6px", left: "10%", dx: "-22px", dy: "-28px", delay: "0.3s" },
  { top: "-2px", left: "85%", dx: "26px", dy: "-24px", delay: "0.6s" },
  { top: "60%", left: "-4%", dx: "-30px", dy: "10px", delay: "0.9s" },
  { top: "70%", left: "96%", dx: "28px", dy: "16px", delay: "1.2s" },
  { top: "20%", left: "50%", dx: "0px", dy: "-34px", delay: "1.5s" },
];

type Props = {
  achievement: Achievement | null;
  onDismiss: () => void;
};

export default function AchievementBanner({ achievement, onDismiss }: Props) {
  if (!achievement) return null;

  return (
    <Box
      key={achievement.id}
      onAnimationEnd={onDismiss}
      sx={{
        position: "fixed",
        top: 0,
        left: "50%",
        zIndex: 2000,
        width: { xs: "calc(100% - 24px)", sm: 520 },
        maxWidth: 520,
        pointerEvents: "none",
        animation: `${lifecycle} ${TOTAL_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
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
          borderRadius: 5,
          background: "linear-gradient(135deg, #7a4a00 0%, #d99a00 35%, #fbbc04 65%, #ffe37a 100%)",
          border: "2px solid rgba(255,255,255,0.55)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(251,188,4,0.55)",
        }}
      >
        {/* One-shot diagonal glint sweeping across the whole banner */}
        <Box
          sx={{
            position: "absolute",
            inset: "-40% -10%",
            background:
              "linear-gradient(75deg, transparent 40%, rgba(255,255,255,0.75) 50%, transparent 60%)",
            animation: `${shine} ${TOTAL_MS}ms ease-in-out`,
          }}
        />

        {/* Gold medallion + pulsing icon */}
        <Box
          sx={{
            position: "relative",
            flexShrink: 0,
            width: { xs: 64, sm: 84 },
            height: { xs: 64, sm: 84 },
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at 35% 30%, #fff9df 0%, #ffd54a 35%, #b8790a 100%)",
            border: "3px solid rgba(255,255,255,0.85)",
            boxShadow: "inset 0 0 12px rgba(0,0,0,0.35), 0 4px 14px rgba(0,0,0,0.4)",
            animation: `${medallionPulse} 1.1s ease-in-out infinite`,
          }}
        >
          <Typography sx={{ fontSize: { xs: "2.1rem", sm: "2.6rem" }, lineHeight: 1 }}>
            {achievement.icon}
          </Typography>
          {SPARKLES.map((s, i) => (
            <Box
              key={i}
              sx={{
                position: "absolute",
                top: s.top,
                left: s.left,
                fontSize: "1rem",
                "--sparkle-travel": `translate(${s.dx}, ${s.dy})`,
                animation: `${sparkle} 1.8s ease-out infinite`,
                animationDelay: s.delay,
              }}
            >
              ✨
            </Box>
          ))}
        </Box>

        <Box sx={{ position: "relative", minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: { xs: "0.7rem", sm: "0.78rem" },
              fontWeight: 900,
              letterSpacing: "0.14em",
              color: "rgba(30,18,0,0.75)",
            }}
          >
            ACHIEVEMENT UNLOCKED
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "1.3rem", sm: "1.65rem" },
              fontWeight: 900,
              lineHeight: 1.15,
              color: "#1a1200",
              textShadow: "0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            {achievement.name}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              fontWeight: 600,
              color: "rgba(30,18,0,0.8)",
            }}
          >
            {achievement.description}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
