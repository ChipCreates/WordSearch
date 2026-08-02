import { useEffect, useRef } from "react";
import {
    type Cell,
    type FoundLine,
    CORNER_RADIUS_PX,
    CELEBRATE_DOTS_FORM_MS,
} from "../constants";

type Props = {
    gridSize: number;
    gridData: string[][];
    foundLines: FoundLine[];
    onSelectionEnd: (startCell: Cell, endCell: Cell) => void;
    onSwipe?: () => void;
    celebrate?: boolean;
    hintCell?: Cell | null;
};

// Pick a contrasting letter color (dark/light) for a given pill background.
function contrastingTextColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "#1d1c12" : "#f5f5f0";
}

// Resolve the current theme-mode letter color from the CSS custom property.
// Falls back to dark-on-light for SSR safety.
function surfaceLetterColor(): string {
    if (typeof window === "undefined") return "#1d1c12";
    return getComputedStyle(document.documentElement)
        .getPropertyValue("--color-on-surface")
        .trim() || "#1d1c12";
}

export default function GameCanvas({ gridSize, gridData, foundLines, onSelectionEnd, onSwipe, celebrate = false, hintCell }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const dragRef = useRef({
        isDragging: false,
        startCell: null as Cell | null,
        currentTarget: null as Cell | null,
    });

    const celebrateProgressRef = useRef(0);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { isDragging, startCell, currentTarget } = dragRef.current;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const targetWidth  = Math.round(rect.width  * dpr);
        const targetHeight = Math.round(rect.height * dpr);
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width  = targetWidth;
            canvas.height = targetHeight;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        if (!gridData.length) return;

        const cellSize = rect.width / gridSize;
        const t = celebrateProgressRef.current;

        // Draws a found-word pill — collapses to a dot as celebrate progress t→1
        const drawCelebratingLine = (line: FoundLine) => {
            const sx = line.startC * cellSize + cellSize / 2;
            const sy = line.startR * cellSize + cellSize / 2;
            const ex = line.endC   * cellSize + cellSize / 2;
            const ey = line.endR   * cellSize + cellSize / 2;
            const mx = (sx + ex) / 2;
            const my = (sy + ey) / 2;

            if (t >= 0.95) {
                // Render as a glowing bioluminescent dot at center (mx, my)
                ctx.save();
                ctx.beginPath();
                ctx.arc(mx, my, cellSize * 0.28, 0, 2 * Math.PI);
                ctx.fillStyle = line.color;
                ctx.shadowColor = line.color;
                ctx.shadowBlur = 18;
                ctx.fill();
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.moveTo(sx + (mx - sx) * t, sy + (my - sy) * t);
                ctx.lineTo(ex + (mx - ex) * t, ey + (my - ey) * t);
                ctx.lineWidth = cellSize * 0.75 + (2 * CORNER_RADIUS_PX - cellSize * 0.75) * t;
                ctx.lineCap   = "round";
                ctx.strokeStyle = line.color;
                ctx.stroke();
            }
        };

        // Active-selection "Sprout Trace" — soft gel look with double stroke
        const drawSelectionTrace = (
            startR: number, startC: number, endR: number, endC: number
        ) => {
            const x1 = startC * cellSize + cellSize / 2;
            const y1 = startR * cellSize + cellSize / 2;
            const x2 = endC   * cellSize + cellSize / 2;
            const y2 = endR   * cellSize + cellSize / 2;

            // Soft outer glow
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth  = cellSize * 0.88;
            ctx.lineCap    = "round";
            ctx.strokeStyle = "rgba(116,195,101,0.22)";
            ctx.stroke();

            // Sharper inner trace
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth  = cellSize * 0.70;
            ctx.lineCap    = "round";
            ctx.strokeStyle = "rgba(116,195,101,0.50)";
            ctx.stroke();
        };

        foundLines.forEach(drawCelebratingLine);

        // Draw Reveal Root hint glow if hintCell is active
        if (hintCell && hintCell.r >= 0 && hintCell.c >= 0) {
            const hx = hintCell.c * cellSize + cellSize / 2;
            const hy = hintCell.r * cellSize + cellSize / 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(hx, hy, cellSize * 0.44, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(0, 228, 121, 0.35)";
            ctx.shadowColor = "#00e479";
            ctx.shadowBlur = 22;
            ctx.fill();
            ctx.strokeStyle = "#00e479";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }

        if (isDragging && startCell && currentTarget) {
            drawSelectionTrace(startCell.r, startCell.c, currentTarget.r, currentTarget.c);
        }

        // Map every cell covered by a pill to its color (for letter contrast).
        const pillColorByCell = new Map<string, string>();
        foundLines.forEach(line => {
            const dr = Math.sign(line.endR - line.startR);
            const dc = Math.sign(line.endC - line.startC);
            const steps = Math.max(
                Math.abs(line.endR - line.startR),
                Math.abs(line.endC - line.startC)
            );
            for (let i = 0; i <= steps; i++) {
                pillColorByCell.set(
                    `${line.startR + i * dr},${line.startC + i * dc}`,
                    line.color
                );
            }
        });

        const letterColor = surfaceLetterColor();
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        // Use Space Grotesk — gated on document.fonts.ready in the useEffect below.
        ctx.font = `bold ${cellSize * 0.58}px 'Space Grotesk', 'Segoe UI', sans-serif`;
        ctx.globalAlpha = Math.max(0.4, 1 - t * 0.6);

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const pillColor = pillColorByCell.get(`${r},${c}`);
                const isHintCell = hintCell && hintCell.r === r && hintCell.c === c;
                ctx.fillStyle = isHintCell
                    ? "#ffffff"
                    : (pillColor ? contrastingTextColor(pillColor) : letterColor);

                if (isHintCell) {
                    ctx.save();
                    ctx.shadowColor = "#00e479";
                    ctx.shadowBlur = 12;
                }

                ctx.fillText(
                    gridData[r][c],
                    c * cellSize + cellSize / 2,
                    r * cellSize + cellSize / 2
                );

                if (isHintCell) {
                    ctx.restore();
                }
            }
        }
        ctx.globalAlpha = 1;
    };

    // Gate the initial draw on the custom font being loaded so letters
    // always render in Space Grotesk rather than a fallback.
    useEffect(() => {
        document.fonts.ready.then(() => draw());
    }, []);

    useEffect(() => { draw(); }, [gridData, gridSize, foundLines, hintCell]);

    const drawRef = useRef(draw);
    drawRef.current = draw;

    // Celebration rAF loop (pill → dot collapse)
    useEffect(() => {
        let rafId: number | null = null;
        if (!celebrate) {
            celebrateProgressRef.current = 0;
            drawRef.current();
            return;
        }
        const start = performance.now();
        const tick = (now: number) => {
            celebrateProgressRef.current = Math.min(1, (now - start) / CELEBRATE_DOTS_FORM_MS);
            drawRef.current();
            if (celebrateProgressRef.current < 1) {
                rafId = requestAnimationFrame(tick);
            }
        };
        rafId = requestAnimationFrame(tick);
        return () => { if (rafId !== null) cancelAnimationFrame(rafId); };
    }, [celebrate]);

    // ResizeObserver — coalesced via rAF
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let rafId: number | null = null;
        const observer = new ResizeObserver(() => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => { drawRef.current(); rafId = null; });
        });
        observer.observe(canvas);
        return () => { observer.disconnect(); if (rafId !== null) cancelAnimationFrame(rafId); };
    }, []);

    // ── Pointer handling ──────────────────────────────────────────────────────
    const getCellFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): Cell | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const cellSize = rect.width / gridSize;
        let c = Math.floor((e.clientX - rect.left)  / cellSize);
        let r = Math.floor((e.clientY - rect.top) / cellSize);
        c = Math.max(0, Math.min(gridSize - 1, c));
        r = Math.max(0, Math.min(gridSize - 1, r));
        return { r, c };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (celebrate) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const cell = getCellFromEvent(e);
        if (cell) {
            dragRef.current.isDragging    = true;
            dragRef.current.startCell     = cell;
            dragRef.current.currentTarget = cell;
            draw();
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!dragRef.current.isDragging || !dragRef.current.startCell) return;
        let cell = getCellFromEvent(e);
        if (cell) {
            const dr   = cell.r - dragRef.current.startCell.r;
            const dc   = cell.c - dragRef.current.startCell.c;
            const angle  = Math.atan2(dr, dc) * 180 / Math.PI;
            const snapped = Math.round(angle / 45) * 45;
            const rad  = snapped * Math.PI / 180;
            const dist = Math.max(Math.abs(dr), Math.abs(dc));
            const unitR = Math.round(Math.sin(rad));
            const unitC = Math.round(Math.cos(rad));
            cell = {
                r: Math.max(0, Math.min(gridSize - 1, dragRef.current.startCell.r + unitR * dist)),
                c: Math.max(0, Math.min(gridSize - 1, dragRef.current.startCell.c + unitC * dist)),
            };
            dragRef.current.currentTarget = cell;
            draw();
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (!dragRef.current.isDragging) return;
        dragRef.current.isDragging = false;
        const { startCell, currentTarget } = dragRef.current;
        if (startCell && currentTarget) {
            onSwipe?.();
            onSelectionEnd(startCell, currentTarget);
        }
        dragRef.current.startCell     = null;
        dragRef.current.currentTarget = null;
        draw();
    };

    return (
        <div className="ws-planter">
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            />
        </div>
    );
}
