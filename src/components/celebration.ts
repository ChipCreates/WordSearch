import type { FoundLine } from "../constants";
import { CELEBRATE_BURST_MS, CELEBRATE_DOTS_FORM_MS, CELEBRATE_TRAIL_MS } from "../constants";

// Grid-relative points keep the constellation aligned through canvas resizes.
export function celebrationPoints(lines: FoundLine[]) {
    const seen = new Set<string>();
    return lines.map(line => ({
        x: (line.startC + line.endC + 1) / 2,
        y: (line.startR + line.endR + 1) / 2,
    })).filter(point => {
        const key = `${point.x},${point.y}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function drawConstellation(
    ctx: CanvasRenderingContext2D,
    points: ReturnType<typeof celebrationPoints>,
    cellSize: number,
    progress: number,
    elapsed: number,
) {
    if (!points.length) return;
    const phase = Math.min(1, Math.max(0, progress)) * Math.max(1, points.length - 1);
    const star = (x: number, y: number, radius: number, alpha = 1) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4;
            const r = i % 2 ? radius * 0.25 : radius;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = "#ffffce";
        ctx.shadowColor = "#baff49";
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.restore();
    };
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < points.length - 1; i++) {
        const local = Math.min(1, Math.max(0, phase - i));
        if (local <= 0) continue;
        const a = points[i];
        const b = points[i + 1];
        const x = (a.x + (b.x - a.x) * local) * cellSize;
        const y = (a.y + (b.y - a.y) * local) * cellSize;
        // Layer a broad emerald halo, a lime beam, and a warm white core.
        for (const [width, color] of [[0.4, "rgba(69,255,76,0.24)"], [0.17, "#89ff48"], [0.05, "#f6ffd3"]] as const) {
            ctx.beginPath();
            ctx.moveTo(a.x * cellSize, a.y * cellSize);
            ctx.lineTo(x, y);
            ctx.lineWidth = Math.max(1.5, cellSize * width);
            ctx.strokeStyle = color;
            ctx.shadowColor = "#63ff3b";
            ctx.shadowBlur = 24;
            ctx.stroke();
        }
        if (local < 1) {
            star(x, y, cellSize * 0.38);
            for (let j = 0; j < 9; j++) {
                const behind = Math.max(0, local - j * 0.025);
                const sway = Math.sin(elapsed / 130 + j * 2.4) * cellSize * 0.16;
                star((a.x + (b.x - a.x) * behind) * cellSize + sway,
                    (a.y + (b.y - a.y) * behind) * cellSize - sway,
                    cellSize * (0.07 - j * 0.004), 1 - j / 10);
            }
        }
    }
    points.forEach((point, i) => {
        if (i > phase) return;
        const age = phase - i;
        const pulse = Math.max(0, 1 - age * 2);
        const x = point.x * cellSize;
        const y = point.y * cellSize;
        ctx.beginPath();
        ctx.arc(x, y, cellSize * (0.3 + (1 - pulse) * 0.3), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(186,255,73,${pulse * 0.8})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        star(x, y, cellSize * (0.23 + pulse * 0.16 + Math.sin(elapsed / 220 + i) * 0.025));
    });
    const burst = (elapsed - CELEBRATE_DOTS_FORM_MS - CELEBRATE_TRAIL_MS) / CELEBRATE_BURST_MS;
    if (burst >= 0 && burst <= 1) {
        const last = points[points.length - 1];
        const x = last.x * cellSize;
        const y = last.y * cellSize;
        const radius = cellSize * (0.3 + 2.5 * (1 - (1 - burst) ** 3));
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, "#ffffef");
        gradient.addColorStop(0.18, "#fff89b");
        gradient.addColorStop(0.45, "rgba(186,255,73,0.9)");
        gradient.addColorStop(1, "rgba(69,255,76,0)");
        ctx.globalAlpha = 1 - burst ** 2;
        ctx.fillStyle = gradient;
        ctx.shadowColor = "#baff49";
        ctx.shadowBlur = 28;
        ctx.beginPath();
        for (let i = 0; i < 24; i++) {
            const angle = i * Math.PI / 12 - Math.PI / 2;
            const r = radius * (i % 2 ? 0.24 : 1);
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}
