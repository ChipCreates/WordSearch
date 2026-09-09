import fs from "fs";

// Create an SVG file that displays cloudreach-summit-landscape.webp with the points overlaid
const width = 1376;
const height = 768;

const points = [
  [5, 41],
  [13, 35],
  [21, 30],
  [29, 20],
  [36, 15],
  [44, 25],
  [53, 35],
  [63, 37],
  [77, 47],
  [90, 40],
];

const pixelPoints = points.map(([bx, by]) => ({
  x: (bx / 100) * width,
  y: (by / 100) * height,
}));

let pathD = `M ${pixelPoints[0].x} ${pixelPoints[0].y}`;
for (let i = 0; i < pixelPoints.length - 1; i++) {
  const p0 = pixelPoints[i - 1] ?? pixelPoints[i];
  const p1 = pixelPoints[i];
  const p2 = pixelPoints[i + 1];
  const p3 = pixelPoints[i + 2] ?? p2;
  const c1x = p1.x + (p2.x - p0.x) / 6;
  const c1y = p1.y + (p2.y - p0.y) / 6;
  const c2x = p2.x - (p3.x - p1.x) / 6;
  const c2y = p2.y - (p3.y - p1.y) / 6;
  pathD += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
}

const circlesSvg = pixelPoints.map((p, idx) => `
  <circle cx="${p.x}" cy="${p.y}" r="18" fill="#ffd700" stroke="#000" stroke-width="3" />
  <text x="${p.x}" y="${p.y + 6}" font-size="16" font-weight="bold" text-anchor="middle" fill="#000">${idx + 1}</text>
`).join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <image href="cloudreach-summit-landscape.webp" width="${width}" height="${height}" />
  <path d="${pathD}" fill="none" stroke="#fff" stroke-width="8" opacity="0.8" />
  <path d="${pathD}" fill="none" stroke="#ffaa00" stroke-width="4" />
  ${circlesSvg}
</svg>`;

fs.writeFileSync("public/backgrounds/levels/test_cloudreach_overlay.svg", svg);
console.log("Saved test_cloudreach_overlay.svg");
