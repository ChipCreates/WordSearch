import { useState } from "react";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from "@mui/material";
import { assetUrl } from "../categoryThemes";

type Props = {
    category: string;
    level: number;
    seeds: number;
    bonusWords: string[];
    bonusSeeds: number;
    onNextLevel: () => void;
    onRestart: () => void;
};

// Seed animation — each seed pops in with a staggered delay
function Seed({ delay }: { delay: number }) {
    return (
        <div
            style={{
                display: "inline-block",
                animation: `successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both`,
            }}
        >
            <img
                src={assetUrl("seed.png")}
                alt="Seed"
                style={{
                    width: 48,
                    height: 48,
                    objectFit: "contain",
                    filter: "drop-shadow(0 0 12px rgba(0, 228, 121, 0.7))",
                }}
            />
        </div>
    );
}

export default function SuccessScreen({ category, level, seeds, bonusWords, bonusSeeds, onNextLevel, onRestart }: Props) {
    const [confirmRestartOpen, setConfirmRestartOpen] = useState(false);

    return (
        <div className="ws-success-overlay">
            {/* Emoji burst */}
            <div style={{ fontSize: "3rem", lineHeight: 1 }}>🌸</div>

            <h2 className="ws-success-overlay__heading">
                Level {level} Complete!
            </h2>

            {/* Staggered Seeds */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
                <Seed delay={0.1} />
                <Seed delay={0.25} />
                <Seed delay={0.4} />
            </div>

            <p style={{ margin: "10px 0 0", fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 800, color: "var(--color-primary)", textShadow: "0 0 10px rgba(0,228,121,0.3)" }}>
                +50 SEEDS EARNED!
            </p>

            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--color-on-surface-variant)" }}>
                Total Balance: {seeds} Seeds 🌱
            </p>

            <div aria-label="Bonus word summary" style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, background: "rgba(236, 177, 255, 0.14)", border: "1px solid rgba(236, 177, 255, 0.35)", color: "var(--color-secondary)" }}>
                <strong>Bonus sprouts: {bonusWords.length}</strong>
                <div style={{ fontSize: "0.8rem", marginTop: 4 }}>{bonusWords.length ? bonusWords.join(" · ") : "No bonus words this level"}</div>
                {bonusSeeds > 0 && <div style={{ fontSize: "0.8rem", marginTop: 4 }}>+{bonusSeeds} bonus Seeds</div>}
            </div>

            {category && (
                <p className="ws-success-overlay__category" style={{ marginTop: 8 }}>
                    🌿 {category}
                </p>
            )}

            <div className="ws-success-overlay__actions">
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={onNextLevel}
                    id="success-next-level-btn"
                >
                    Next Level 🌱
                </Button>
                <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    onClick={() => setConfirmRestartOpen(true)}
                    id="success-restart-btn"
                >
                    Restart Game
                </Button>
            </div>

            <Dialog open={confirmRestartOpen} onClose={() => setConfirmRestartOpen(false)}>
                <DialogTitle sx={{ fontFamily: "var(--font-headline)", fontWeight: 700 }}>
                    Restart your whole game?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        This resets everything back to Level 1 with 0 Seeds — including your unlocked
                        achievements, categories seen, and your entire Moonlit Conservatory garden.
                        This can't be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmRestartOpen(false)} id="confirm-restart-cancel">
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => { setConfirmRestartOpen(false); onRestart(); }}
                        id="confirm-restart-confirm"
                    >
                        Restart Everything
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
