import { Button } from "@mui/material";

type Props = {
    category: string;
    level: number;
    stars: number;
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
                src="/seed.png"
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

export default function SuccessScreen({ category, level, onNextLevel, onRestart }: Props) {
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

            {category && (
                <p className="ws-success-overlay__category">
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
                    onClick={onRestart}
                    id="success-restart-btn"
                >
                    Restart Game
                </Button>
            </div>
        </div>
    );
}
