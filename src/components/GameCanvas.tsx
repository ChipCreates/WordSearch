import { useEffect, useRef } from "react";
import { Paper } from "@mui/material";
import {
    type Cell,
    type FoundLine,
    CORNER_RADIUS_PX,
    CELEBRATE_DOTS_FORM_MS,
    CELEBRATE_FADE_DELAY_MS,
    CELEBRATE_FADE_DURATION_MS,
} from "../constants";

type Props = {
    gridSize: number;
    gridData: string[][];
    foundLines: FoundLine[];
    onSelectionEnd: (startCell: Cell, endCell: Cell) => void;
    celebrate?: boolean;
};

// HIGHLIGHT_COLORS (constants.ts) is mostly light pastels, so a fixed light
// letter color washes out on top of them -- pick black/white per pill by its
// actual luminance instead.
function contrastingTextColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? "#121212" : "#f5f5f5";
}

export default function GameCanvas({ gridSize, gridData, foundLines, onSelectionEnd, celebrate = false }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const dragRef = useRef({
        isDragging: false,
        startCell: null as Cell | null,
        currentTarget: null as Cell | null,
    });

    // 0 = normal board, 1 = fully celebrated (letters faded out, pills
    // collapsed to dots). A ref, not state, since it's driven by a rAF loop
    // that redraws imperatively every frame rather than through React render.
    const celebrateProgressRef = useRef(0);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { isDragging, startCell, currentTarget } = dragRef.current;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const targetWidth = Math.round(rect.width * dpr);
        const targetHeight = Math.round(rect.height * dpr);
        // Reassigning canvas.width/height always clears the bitmap, even when
        // set to the same value -- during a live window-resize drag this fires
        // on every tick and flashes the board blank, so only touch it when the
        // backing size actually changed.
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }
        // setTransform (not scale) because scale() compounds across calls;
        // resizing the canvas used to reset this for free, but we now skip
        // that reset above when the size is unchanged.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.clearRect(0, 0, rect.width, rect.height);
        if (!gridData.length) return;

        const cellSize = rect.width / gridSize;
        const t = celebrateProgressRef.current;

        const drawLine = (startR: number, startC: number, endR: number, endC: number, color: string) => {
            ctx.beginPath();
            ctx.moveTo(startC * cellSize + cellSize / 2, startR * cellSize + cellSize / 2);
            ctx.lineTo(endC * cellSize + cellSize / 2, endR * cellSize + cellSize / 2);
            ctx.lineWidth = cellSize * 0.75;
            ctx.lineCap = "round";
            ctx.strokeStyle = color;
            ctx.stroke();
        };

        // On level complete, each pill collapses toward its own midpoint
        // while its stroke width grows to 2*CORNER_RADIUS_PX -- a
        // zero-length round-capped line is exactly a filled circle of
        // radius (lineWidth/2), so at t=1 this *is* a dot of that radius,
        // no separate arc-drawing code path needed. At t=0 it's identical
        // to the plain drawLine above.
        const drawCelebratingLine = (line: FoundLine) => {
            const sx = line.startC * cellSize + cellSize / 2;
            const sy = line.startR * cellSize + cellSize / 2;
            const ex = line.endC * cellSize + cellSize / 2;
            const ey = line.endR * cellSize + cellSize / 2;
            const mx = (sx + ex) / 2;
            const my = (sy + ey) / 2;
            ctx.beginPath();
            ctx.moveTo(sx + (mx - sx) * t, sy + (my - sy) * t);
            ctx.lineTo(ex + (mx - ex) * t, ey + (my - ey) * t);
            ctx.lineWidth = cellSize * 0.75 + (2 * CORNER_RADIUS_PX - cellSize * 0.75) * t;
            ctx.lineCap = "round";
            ctx.strokeStyle = line.color;
            ctx.stroke();
        };

        foundLines.forEach(drawCelebratingLine);

        if (isDragging && startCell && currentTarget) {
            drawLine(startCell.r, startCell.c, currentTarget.r, currentTarget.c, "rgba(187, 134, 252, 0.6)");
        }

        // Map every cell a found-word pill passes through to that pill's
        // color, so the letter drawn on top can contrast against it instead
        // of always using the default board color.
        const pillColorByCell = new Map<string, string>();
        foundLines.forEach(line => {
            const dr = Math.sign(line.endR - line.startR);
            const dc = Math.sign(line.endC - line.startC);
            const steps = Math.max(Math.abs(line.endR - line.startR), Math.abs(line.endC - line.startC));
            for (let i = 0; i <= steps; i++) {
                pillColorByCell.set(`${line.startR + i * dr},${line.startC + i * dc}`, line.color);
            }
        });

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${cellSize * 0.65}px 'Segoe UI', sans-serif`;
        // Letters fade out over the same celebration progress as the pills
        // collapse, so the whole board dissolves to reveal the background
        // behind it (the Paper card itself fades via a separate CSS
        // transition on its own opacity).
        ctx.globalAlpha = 1 - t;

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const pillColor = pillColorByCell.get(`${r},${c}`);
                ctx.fillStyle = pillColor ? contrastingTextColor(pillColor) : "#e0e0e0";
                ctx.fillText(gridData[r][c], c * cellSize + cellSize / 2, r * cellSize + cellSize / 2);
            }
        }
        ctx.globalAlpha = 1;
    };

    useEffect(() => { draw(); }, [gridData, gridSize, foundLines]);

    // Always call the latest draw closure from the observer below, without
    // tearing down and recreating the ResizeObserver on every render.
    const drawRef = useRef(draw);
    drawRef.current = draw;

    useEffect(() => {
        let rafId: number | null = null;
        if (!celebrate) {
            // Snap back instantly (not a reverse animation) -- by the time
            // celebrate goes false a new puzzle is already loading, so
            // there's nothing worth animating back to.
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
        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [celebrate]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let rafId: number | null = null;
        // Coalesce a burst of resize callbacks (a live window-drag can fire
        // many per second) down to one draw per animation frame, instead of
        // doing a full redraw synchronously on every single event.
        const observer = new ResizeObserver(() => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                drawRef.current();
                rafId = null;
            });
        });
        observer.observe(canvas);
        return () => {
            observer.disconnect();
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, []);

    const getCellFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): Cell | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cellSize = rect.width / gridSize;
        let c = Math.floor(x / cellSize);
        let r = Math.floor(y / cellSize);

        // Clamp to grid boundaries so fast swipes don't disconnect
        c = Math.max(0, Math.min(gridSize - 1, c));
        r = Math.max(0, Math.min(gridSize - 1, r));

        return { r, c };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        // Once the board is dissolving there's nothing left to select.
        if (celebrate) return;
        e.currentTarget.setPointerCapture(e.pointerId);

        const cell = getCellFromEvent(e);
        if (cell) {
            dragRef.current.isDragging = true;
            dragRef.current.startCell = cell;
            dragRef.current.currentTarget = cell;
            draw();
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!dragRef.current.isDragging || !dragRef.current.startCell) return;

        let cell = getCellFromEvent(e);
        if (cell) {
            // Snap to the nearest 45-degree direction
            const dr = cell.r - dragRef.current.startCell.r;
            const dc = cell.c - dragRef.current.startCell.c;
            const angle = Math.atan2(dr, dc) * 180 / Math.PI;
            const snapped = Math.round(angle / 45) * 45;
            const rad = snapped * Math.PI / 180;

            const dist = Math.max(Math.abs(dr), Math.abs(dc));
            // Unit step per grid cell in the snapped direction -- e.g. for a
            // diagonal, sin/cos of 45deg is ~0.707, which is a Euclidean
            // component, not a whole grid step, so it must be rounded to
            // +-1 *before* scaling by dist rather than after.
            const unitR = Math.round(Math.sin(rad));
            const unitC = Math.round(Math.cos(rad));
            cell = {
                r: dragRef.current.startCell.r + unitR * dist,
                c: dragRef.current.startCell.c + unitC * dist
            };

            cell.c = Math.max(0, Math.min(gridSize - 1, cell.c));
            cell.r = Math.max(0, Math.min(gridSize - 1, cell.r));

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
            onSelectionEnd(startCell, currentTarget);
        }

        dragRef.current.startCell = null;
        dragRef.current.currentTarget = null;
        draw();
    };

    return (
        <Paper
            elevation={4}
            sx={{
                width: '100%',
                maxWidth: 540,
                // As a flex row sibling, an item with no flex-basis shrinks
                // to its content's intrinsic size -- for a <canvas> that's
                // its default 300x300, not the 100%-width the CSS asks for.
                // flex-basis:0 + flex-grow:1 makes it claim space instead.
                flex: '1 1 0',
                mx: 'auto',
                p: 1,
                borderRadius: `${CORNER_RADIUS_PX}px`,
                // Fades the whole card (now showing just the collapsed dots)
                // out on level complete, revealing the category background
                // image behind it -- delayed until after the canvas-level
                // pill-to-dot animation has finished forming the dots, so
                // there's a beat where they're clearly visible before the
                // card itself disappears. celebrate:false resets instantly
                // (no transition) since a new puzzle is already loading by
                // then and there's nothing worth animating back from.
                opacity: celebrate ? 0 : 1,
                transition: celebrate
                    ? `opacity ${CELEBRATE_FADE_DURATION_MS}ms ease ${CELEBRATE_FADE_DELAY_MS}ms`
                    : 'none',
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ width: '100%', aspectRatio: '1 / 1', display: 'block', touchAction: 'none', borderRadius: '4px' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            />
        </Paper>
    );
}
