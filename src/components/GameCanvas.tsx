import { useEffect, useRef } from "react";
import { Paper } from "@mui/material";
import type { Cell, FoundLine } from "../constants";

type Props = {
    gridSize: number;
    gridData: string[][];
    foundLines: FoundLine[];
    onSelectionEnd: (startCell: Cell, endCell: Cell) => void;
};

export default function GameCanvas({ gridSize, gridData, foundLines, onSelectionEnd }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const dragRef = useRef({
        isDragging: false,
        startCell: null as Cell | null,
        currentTarget: null as Cell | null,
    });

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { isDragging, startCell, currentTarget } = dragRef.current;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, rect.width, rect.height);
        if (!gridData.length) return;

        const cellSize = rect.width / gridSize;

        const drawLine = (startR: number, startC: number, endR: number, endC: number, color: string) => {
            ctx.beginPath();
            ctx.moveTo(startC * cellSize + cellSize / 2, startR * cellSize + cellSize / 2);
            ctx.lineTo(endC * cellSize + cellSize / 2, endR * cellSize + cellSize / 2);
            ctx.lineWidth = cellSize * 0.75;
            ctx.lineCap = "round";
            ctx.strokeStyle = color;
            ctx.stroke();
        };

        foundLines.forEach(line => drawLine(line.startR, line.startC, line.endR, line.endC, line.color));

        if (isDragging && startCell && currentTarget) {
            drawLine(startCell.r, startCell.c, currentTarget.r, currentTarget.c, "rgba(187, 134, 252, 0.6)");
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${cellSize * 0.65}px 'Segoe UI', sans-serif`;
        ctx.fillStyle = "#e0e0e0";

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                ctx.fillText(gridData[r][c], c * cellSize + cellSize / 2, r * cellSize + cellSize / 2);
            }
        }
    };

    useEffect(() => { draw(); }, [gridData, gridSize, foundLines]);
    useEffect(() => {
        const handleResize = () => draw();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
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
        <Paper elevation={4} sx={{ maxWidth: 540, mx: 'auto', p: 1, borderRadius: 2 }}>
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
