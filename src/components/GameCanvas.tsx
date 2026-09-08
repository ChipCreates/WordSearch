import { useEffect, useMemo, useRef, useState } from "react";
import {
    type Cell,
    type FoundLine,
    CELEBRATE_DOTS_FORM_MS,
    CELEBRATE_TRAIL_MS,
    CELEBRATE_FADE_DELAY_MS,
} from "../constants";
import { celebrationPoints, drawConstellation } from "./celebration";

type Props = {
    gridSize: number;
    gridData: string[][];
    foundLines: FoundLine[];
    onSelectionEnd: (startCell: Cell, endCell: Cell) => void;
    onSwipe?: () => void;
    celebrate?: boolean;
    // Dev-only: render the celebration in its fully-formed end state -- every
    // pill collapsed to a dot, every constellation link fully drawn -- as a
    // single frozen frame, instead of animating the reveal from scratch. Lets
    // the debug panel preview "what the end screen looks like" without
    // waiting through (or repeatedly re-triggering) the timed sweep.
    celebrateStatic?: boolean;
    hintCell?: Cell | null;
    // Flora Spectrometer power-up: same glow treatment as hintCell, applied
    // to every currently-unfound word's start cell at once.
    spectrometerCells?: Cell[];
    // Bioluminescent Compass power-up: a direction vector (not a cell) from
    // grid center toward the nearest unfound word -- rendered as a fixed
    // HUD arrow, not part of the per-frame canvas draw.
    compassDirection?: { dr: number; dc: number } | null;
    status?: string;
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
function surfaceLetterColor(canvas: HTMLCanvasElement): string {
    if (typeof window === "undefined") return "#1d1c12";
    return getComputedStyle(canvas)
        .getPropertyValue("--color-on-surface")
        .trim() || "#1d1c12";
}

function surfacePrimaryColor(canvas: HTMLCanvasElement): string {
    if (typeof window === "undefined") return "#00e479";
    return getComputedStyle(canvas)
        .getPropertyValue("--color-primary")
        .trim() || "#00e479";
}

export default function GameCanvas({ gridSize, gridData, foundLines, onSelectionEnd, onSwipe, celebrate = false, celebrateStatic = false, hintCell, spectrometerCells = [], compassDirection = null, status = "" }: Props) {
    // Static preview is visually identical to a genuine celebration -- same
    // collapsed dots, same fully-drawn constellation -- it just skips the
    // driving rAF loop below instead of animating toward that state.
    const celebrateActive = celebrate || celebrateStatic;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const reducedMotionRef = useRef(false);
    const [focusedCell, setFocusedCell] = useState<Cell>({ r: 0, c: 0 });
    const [keyboardSelection, setKeyboardSelection] = useState<{ start: Cell; end: Cell } | null>(null);

    const dragRef = useRef({
        isDragging: false,
        startCell: null as Cell | null,
        currentTarget: null as Cell | null,
    });

    const celebrateProgressRef = useRef(0);
    const celebrateElapsedRef = useRef(0);
    const points = useMemo(() => celebrationPoints(foundLines), [foundLines]);

    useEffect(() => {
        const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        if (!media) return;
        const update = () => { reducedMotionRef.current = media.matches; };
        update();
        media.addEventListener?.("change", update);
        return () => media.removeEventListener?.("change", update);
    }, []);

    const pillColorByCell = useMemo(() => {
        const map = new Map<string, string>();
        foundLines.forEach(line => {
            const dr = Math.sign(line.endR - line.startR);
            const dc = Math.sign(line.endC - line.startC);
            const steps = Math.max(
                Math.abs(line.endR - line.startR),
                Math.abs(line.endC - line.startC)
            );
            for (let i = 0; i <= steps; i++) {
                map.set(
                    `${line.startR + i * dr},${line.startC + i * dc}`,
                    line.color
                );
            }
        });
        return map;
    }, [foundLines]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            requestAnimationFrame(() => drawRef.current());
            return;
        }

        const { isDragging, startCell, currentTarget } = dragRef.current;

        const dpr = window.devicePixelRatio || 1;
        const targetWidth  = Math.max(1, Math.round(rect.width  * dpr));
        const targetHeight = Math.max(1, Math.round(rect.height * dpr));
        let resized = false;
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width  = targetWidth;
            canvas.height = targetHeight;
            resized = true;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        if (!gridData.length) return;

        const cellSize = rect.width / gridSize;
        const compactViewport = window.matchMedia?.("(max-width: 767px)").matches ?? false;
        const roomyPhoneViewport = compactViewport && window.matchMedia?.("(min-width: 400px)").matches;
        // Large cells on small grids otherwise make the glyphs feel oversized
        // on phones. Keep the denser boards readable while giving 4x4 and 5x5
        // layouts enough breathing room inside the board panel.
        const letterScale = compactViewport
            ? (gridSize <= 4 ? 0.64 : gridSize <= 5 ? 0.69 : roomyPhoneViewport ? 0.64 : 0.74)
            : 0.75;
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
                ctx.globalAlpha = 0.35;
                ctx.shadowColor = line.color;
                ctx.shadowBlur = 18;
                ctx.fill();
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.moveTo(sx + (mx - sx) * t, sy + (my - sy) * t);
                ctx.lineTo(ex + (mx - ex) * t, ey + (my - ey) * t);
                ctx.lineWidth = cellSize * (0.75 - 0.19 * t);
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

        // Draw Reveal Root hint glow (full strength) and Flora Spectrometer
        // glow (dimmer, multiple cells at once) with the same circle style.
        if (!celebrateActive && hintCell && hintCell.r >= 0 && hintCell.c >= 0) {
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
        (celebrateActive ? [] : spectrometerCells).forEach(cell => {
            const sx = cell.c * cellSize + cellSize / 2;
            const sy = cell.r * cellSize + cellSize / 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(sx, sy, cellSize * 0.38, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(236, 177, 255, 0.22)";
            ctx.shadowColor = "#c49dff";
            ctx.shadowBlur = 14;
            ctx.fill();
            ctx.strokeStyle = "rgba(196, 157, 255, 0.7)";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        });

        if (isDragging && startCell && currentTarget) {
            drawSelectionTrace(startCell.r, startCell.c, currentTarget.r, currentTarget.c);
        }

        const letterColor = surfaceLetterColor(canvas);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Use Space Grotesk — gated on document.fonts.ready in the useEffect below.
        ctx.font = `bold ${cellSize * letterScale}px 'Space Grotesk', 'Segoe UI', sans-serif`;

        if (!celebrateActive && focusedCell) {
            ctx.save();
            ctx.strokeStyle = surfacePrimaryColor(canvas);
            ctx.lineWidth = 3;
            ctx.shadowColor = surfacePrimaryColor(canvas);
            ctx.shadowBlur = 10;
            const focusRadius = Math.max(10, cellSize * 0.45);
            const focusCellCenterX = focusedCell.c * cellSize + cellSize / 2;
            const focusCellCenterY = focusedCell.r * cellSize + cellSize / 2;
            const focusedGlyph = gridData[focusedCell.r]?.[focusedCell.c] ?? "";
            const glyphMetrics = ctx.measureText(focusedGlyph);
            const glyphOffsetX = Number.isFinite(glyphMetrics.actualBoundingBoxLeft) && Number.isFinite(glyphMetrics.actualBoundingBoxRight)
                ? (glyphMetrics.actualBoundingBoxRight - glyphMetrics.actualBoundingBoxLeft) / 2
                : 0;
            const glyphOffsetY = Number.isFinite(glyphMetrics.actualBoundingBoxAscent) && Number.isFinite(glyphMetrics.actualBoundingBoxDescent)
                ? (glyphMetrics.actualBoundingBoxDescent - glyphMetrics.actualBoundingBoxAscent) / 2
                : 0;
            const opticalX = Math.max(-cellSize * 0.08, Math.min(cellSize * 0.08, glyphOffsetX));
            const opticalY = Math.max(-cellSize * 0.08, Math.min(cellSize * 0.08, glyphOffsetY));
            // Center on the visible glyph bounds, but keep the first-row ring
            // inside the canvas on narrow/mobile layouts.
            const focusY = Math.max(
                focusCellCenterY + opticalY,
                focusRadius + ctx.lineWidth / 2 + 2,
            );
            ctx.beginPath();
            ctx.arc(
                focusCellCenterX + opticalX,
                focusY,
                focusRadius,
                0,
                Math.PI * 2,
            );
            ctx.stroke();
            ctx.restore();
        }

        ctx.globalAlpha = 1 - t * 0.30;

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const pillColor = pillColorByCell.get(`${r},${c}`);
                const isHintCell = hintCell && hintCell.r === r && hintCell.c === c;
                ctx.fillStyle = isHintCell
                    ? "#ffffff"
                    : (pillColor && !celebrateActive ? contrastingTextColor(pillColor) : letterColor);

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

        if (celebrateActive && celebrateElapsedRef.current >= CELEBRATE_DOTS_FORM_MS) {
            drawConstellation(ctx, points, cellSize,
                (celebrateElapsedRef.current - CELEBRATE_DOTS_FORM_MS) / CELEBRATE_TRAIL_MS,
                celebrateElapsedRef.current);
        }

        if (resized) {
            requestAnimationFrame(() => drawRef.current());
        }
    };

    const drawRef = useRef(draw);
    drawRef.current = draw;

    const schedulePaint = () => {
        requestAnimationFrame(() => {
            drawRef.current();
            requestAnimationFrame(() => {
                drawRef.current();
            });
        });
    };

    // Trigger multi-stage layout & GPU surface paints on mount and font load
    useEffect(() => {
        schedulePaint();
        const t1 = setTimeout(() => schedulePaint(), 50);
        const t2 = setTimeout(() => schedulePaint(), 180);
        const t3 = setTimeout(() => schedulePaint(), 400);
        document.fonts.ready.then(() => schedulePaint());
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, []);

    useEffect(() => { schedulePaint(); }, [gridData, gridSize, foundLines, hintCell, spectrometerCells, focusedCell, keyboardSelection]);

    // Celebration rAF loop (pill → dot collapse). `celebrateStatic` wins over
    // `celebrate` here -- it freezes progress/elapsed at the fully-revealed
    // moment (every dot collapsed, every constellation link drawn, the flare
    // burst included) instead of animating toward it, then paints that one
    // frame and stops. Nothing else in `draw()` distinguishes the two --
    // they share `celebrateActive` for every other rendering decision.
    useEffect(() => {
        let rafId: number | null = null;
        if (celebrateStatic) {
            celebrateProgressRef.current = 1;
            celebrateElapsedRef.current = CELEBRATE_DOTS_FORM_MS + CELEBRATE_TRAIL_MS;
            schedulePaint();
            return;
        }
        if (!celebrate || reducedMotionRef.current) {
            celebrateProgressRef.current = 0;
            celebrateElapsedRef.current = 0;
            schedulePaint();
            return;
        }
        const start = performance.now();
        const tick = (now: number) => {
            celebrateElapsedRef.current = now - start;
            celebrateProgressRef.current = Math.min(1, (now - start) / CELEBRATE_DOTS_FORM_MS);
            drawRef.current();
            if (celebrateElapsedRef.current < CELEBRATE_FADE_DELAY_MS) {
                rafId = requestAnimationFrame(tick);
            }
        };
        rafId = requestAnimationFrame(tick);
        return () => { if (rafId !== null) cancelAnimationFrame(rafId); };
    }, [celebrate, celebrateStatic]);

    // ResizeObserver — coalesced via rAF
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let rafId: number | null = null;
        const observer = new ResizeObserver(() => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => { schedulePaint(); rafId = null; });
        });
        observer.observe(canvas);
        return () => { observer.disconnect(); if (rafId !== null) cancelAnimationFrame(rafId); };
    }, []);

    const computeDragString = (start: Cell | null, end: Cell | null): string | null => {
        if (!start || !end || !gridData || !gridData.length) return null;
        const dr = Math.sign(end.r - start.r);
        const dc = Math.sign(end.c - start.c);
        const steps = Math.max(Math.abs(end.r - start.r), Math.abs(end.c - start.c));
        let str = "";
        for (let i = 0; i <= steps; i++) {
            const r = start.r + i * dr;
            const c = start.c + i * dc;
            if (gridData[r] && gridData[r][c] !== undefined) {
                str += gridData[r][c];
            }
        }
        return str || null;
    };

    const updateBubble = (str: string | null) => {
        if (!bubbleRef.current) return;
        if (str) {
            bubbleRef.current.textContent = str;
            bubbleRef.current.style.display = "block";
        } else {
            bubbleRef.current.style.display = "none";
            bubbleRef.current.textContent = "";
        }
    };

    // ── Pointer handling ──────────────────────────────────────────────────────
    const getCellFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): Cell | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const cellSize = rect.width / gridSize;
        // On touch devices, slightly offset clientY (-12px) so selection sits above the thumb
        const offsetY = e.pointerType === "touch" ? -12 : 0;
        let c = Math.floor((e.clientX - rect.left)  / cellSize);
        let r = Math.floor((e.clientY + offsetY - rect.top) / cellSize);
        c = Math.max(0, Math.min(gridSize - 1, c));
        r = Math.max(0, Math.min(gridSize - 1, r));
        return { r, c };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (celebrateActive) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const cell = getCellFromEvent(e);
        if (cell) {
            setFocusedCell(cell);
            dragRef.current.isDragging    = true;
            dragRef.current.startCell     = cell;
            dragRef.current.currentTarget = cell;
            updateBubble(computeDragString(cell, cell));
            draw();
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!dragRef.current.isDragging || !dragRef.current.startCell) return;
        let cell = getCellFromEvent(e);
        if (cell) {
            setFocusedCell(cell);
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
            updateBubble(computeDragString(dragRef.current.startCell, cell));
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
        updateBubble(null);
        draw();
    };

    const moveCell = (cell: Cell, key: string): Cell => {
        const delta: Record<string, Cell> = {
            ArrowUp: { r: -1, c: 0 }, ArrowDown: { r: 1, c: 0 },
            ArrowLeft: { r: 0, c: -1 }, ArrowRight: { r: 0, c: 1 },
        };
        const direction = delta[key];
        if (!direction) return cell;
        return {
            r: Math.max(0, Math.min(gridSize - 1, cell.r + direction.r)),
            c: Math.max(0, Math.min(gridSize - 1, cell.c + direction.c)),
        };
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
        if (celebrateActive) return;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
            const next = moveCell(focusedCell, e.key);
            setFocusedCell(next);
            if (keyboardSelection) {
                setKeyboardSelection({ ...keyboardSelection, end: next });
                dragRef.current = { isDragging: true, startCell: keyboardSelection.start, currentTarget: next };
                updateBubble(computeDragString(keyboardSelection.start, next));
            }
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            setKeyboardSelection(null);
            dragRef.current = { isDragging: false, startCell: null, currentTarget: null };
            updateBubble(null);
            draw();
            return;
        }
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!keyboardSelection) {
                const selection = { start: focusedCell, end: focusedCell };
                setKeyboardSelection(selection);
                dragRef.current = { isDragging: true, startCell: focusedCell, currentTarget: focusedCell };
                updateBubble(computeDragString(focusedCell, focusedCell));
            } else {
                const { start, end } = keyboardSelection;
                setKeyboardSelection(null);
                dragRef.current = { isDragging: false, startCell: null, currentTarget: null };
                updateBubble(null);
                onSwipe?.();
                onSelectionEnd(start, end);
            }
            draw();
        }
    };

    const selectionText = keyboardSelection ? computeDragString(keyboardSelection.start, keyboardSelection.end) : null;

    return (
        <div className="ws-planter">
            {compassDirection && !celebrateActive && (
                <div
                    className="ws-compass-indicator"
                    style={{
                        position: "absolute",
                        top: -56,
                        left: "50%",
                        transform: `translateX(-50%) rotate(${Math.atan2(compassDirection.dr, compassDirection.dc) * 180 / Math.PI}deg)`,
                        fontSize: "1.8rem",
                        lineHeight: 1,
                        color: "var(--color-primary)",
                        filter: "drop-shadow(0 0 10px rgba(0, 228, 121, 0.7))",
                        zIndex: 25,
                        pointerEvents: "none",
                    }}
                    aria-label="Compass pointing toward the nearest unfound word"
                >
                    ➤
                </div>
            )}
            <div
                ref={bubbleRef}
                className="ws-drag-preview-bubble glow-emerald"
                style={{
                    position: "absolute",
                    top: -28,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--color-primary-container)",
                    color: "var(--color-on-primary)",
                    padding: "6px 18px",
                    borderRadius: "9999px",
                    fontFamily: "var(--font-grid)",
                    fontWeight: 800,
                    fontSize: "1.15rem",
                    letterSpacing: "0.25em",
                    boxShadow: "0 0 24px rgba(0, 228, 121, 0.6)",
                    border: "2px solid var(--color-primary)",
                    zIndex: 30,
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    display: "none",
                }}
            />
            <canvas
                ref={canvasRef}
                width={360}
                height={360}
                tabIndex={0}
                role="application"
                aria-label={`Word search puzzle, ${gridSize} by ${gridSize} grid`}
                aria-describedby="word-grid-instructions word-grid-live"
                onKeyDown={handleKeyDown}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            />
            <p id="word-grid-instructions" className="ws-sr-only">
                Use arrow keys to focus a cell. Press Enter or Space to start a word, use arrow keys to choose its direction and length, then press Enter or Space to submit. Press Escape to cancel.
            </p>
            <div id="word-grid-live" className="ws-sr-only" aria-live="polite" aria-atomic="true">
                {`Focused letter ${gridData[focusedCell.r]?.[focusedCell.c] ?? ""}, row ${focusedCell.r + 1}, column ${focusedCell.c + 1}.`}
                {selectionText ? ` Current selection: ${selectionText}.` : ""}
                {status ? ` ${status}` : ""}
            </div>
            <div className="ws-sr-grid" role="grid" aria-label="Word search letters">
                {gridData.map((row, r) => row.map((letter, c) => (
                    <button
                        key={`${r}-${c}`}
                        type="button"
                        role="gridcell"
                        tabIndex={-1}
                        aria-label={`${letter}, row ${r + 1}, column ${c + 1}${pillColorByCell.has(`${r},${c}`) ? ", part of a found word" : ""}`}
                    >
                        {letter}
                    </button>
                )))}
            </div>
        </div>
    );
}
