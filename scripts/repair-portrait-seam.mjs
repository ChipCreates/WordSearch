// Deterministic edge-only repair. Originals are never overwritten.
// Run from the project root: node scripts/repair-portrait-seam.mjs
import { execFileSync } from 'node:child_process';

const W = 768, H = 1376;
const source = 'vertical_seamless_endless_scrolling_background_texture_for_a_casual_mobile.png';
const output = 'public/backgrounds/level-trail-portrait-seamless.webp';
const magick = (args, input) => execFileSync('magick', args, { input, maxBuffer: 32 * 1024 * 1024 });
const pixels = magick([source, '-alpha', 'off', '-depth', '8', 'rgb:-']);

function rawRoadAt(y) {
    const runs = [];
    let start = -1;
    for (let x = 100; x <= 700; x++) {
        const i = (y * W + x) * 3;
        const bright = x < 700 && pixels[i] > 95 && pixels[i + 1] > 130 && pixels[i] > pixels[i + 2] * 1.2;
        if (bright && start < 0) start = x;
        if (!bright && start >= 0) { runs.push([start, x - 1]); start = -1; }
    }
    const run = runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
    if (!run || run[1] - run[0] < 10) throw new Error(`No reliable road at row ${y}`);
    return { center: (run[0] + run[1]) / 2, half: (run[1] - run[0]) / 2 };
}

// Average neighboring scanlines so stone joints and individual sparkles cannot
// make the displacement jump from one row to the next.
function roadAt(y) {
    const rows = [];
    for (let row = Math.max(0, y - 16); row <= Math.min(H - 1, y + 16); row++) rows.push(rawRoadAt(row));
    const averaged = {
        center: rows.reduce((sum, road) => sum + road.center, 0) / rows.length,
        half: rows.reduce((sum, road) => sum + road.half, 0) / rows.length,
    };
    const distance = Math.min(y, H - 1 - y);
    if (distance >= 32) return averaged;
    const raw = rawRoadAt(y);
    const blend = distance / 32;
    return { center: raw.center * (1 - blend) + averaged.center * blend, half: raw.half * (1 - blend) + averaged.half * blend };
}

// The central 1,076 rows remain byte-for-byte unchanged before encoding.
const topBand = 100, bottomStart = 1176;
const edge = roadAt(0);
const smooth = t => t * t * (3 - 2 * t);
const repaired = Buffer.from(pixels);
for (let y = 0; y < H; y++) {
    if (y >= topBand && y <= bottomStart) continue;
    const road = roadAt(y);
    const amount = y < topBand ? smooth(1 - y / topBand) : smooth((y - bottomStart) / (H - 1 - bottomStart));
    const center = road.center * (1 - amount) + edge.center * amount;
    const half = road.half * (1 - amount) + edge.half * amount;
    // Piecewise-linear horizontal remap keeps both outside edges fixed and
    // matches the road's center AND width, rather than crossfading two roads.
    const dst = [0, center - half, center + half, W - 1];
    const src = [0, road.center - road.half, road.center + road.half, W - 1];
    for (let x = 0; x < W; x++) {
        const segment = x < dst[1] ? 0 : x < dst[2] ? 1 : 2;
        const u = src[segment] + (x - dst[segment]) / (dst[segment + 1] - dst[segment]) * (src[segment + 1] - src[segment]);
        const left = Math.max(0, Math.min(W - 1, Math.floor(u)));
        const right = Math.min(W - 1, left + 1);
        for (let c = 0; c < 3; c++) {
            repaired[(y * W + x) * 3 + c] = Math.round(
                pixels[(y * W + left) * 3 + c] * (1 - (u - left)) + pixels[(y * W + right) * 3 + c] * (u - left));
        }
    }
}

// A shared edge strip removes the remaining ground/foliage color discontinuity.
// Smoothstep makes the blend ease into the untouched portions of the artwork.
const beforeBlend = Buffer.from(repaired);
const blendRows = 40;
for (let distance = 0; distance < blendRows; distance++) {
    const amount = (1 - smooth(distance / (blendRows - 1))) / 2;
    for (const y of [distance, H - 1 - distance]) {
        for (let i = 0; i < W * 3; i++) {
            const index = y * W * 3 + i;
            const opposite = (H - 1 - y) * W * 3 + i;
            repaired[index] = Math.round(beforeBlend[index] * (1 - amount) + beforeBlend[opposite] * amount);
        }
    }
}

// Lossless WebP preserves identical boundary pixels after decoding.
magick(['-size', `${W}x${H}`, '-depth', '8', 'rgb:-', '-define', 'webp:lossless=true', output], repaired);
const decoded = magick([output, '-depth', '8', 'rgb:-']);
if (!decoded.subarray(0, W * 3).equals(decoded.subarray((H - 1) * W * 3))) throw new Error('Decoded seam mismatch');
for (let y = topBand; y <= bottomStart; y++) {
    if (!decoded.subarray(y * W * 3, (y + 1) * W * 3).equals(pixels.subarray(y * W * 3, (y + 1) * W * 3))) {
        throw new Error(`Unexpected central artwork change at row ${y}`);
    }
}
console.log(`Saved ${output}; decoded edges match exactly; central artwork unchanged.`);
console.log(`Original road center: top ${edge.center}, bottom ${roadAt(H - 1).center}; repaired both to ${edge.center}.`);
