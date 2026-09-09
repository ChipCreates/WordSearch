const crossSize = 1305;
const tileLength = crossSize * 1376 / 768;
const TILE_OVERLAP = 120;
const REGION_OVERLAP = 180;
const effectiveTileLength = tileLength - TILE_OVERLAP;

const LEVEL_REGIONS = [
  { id: "glowing-grove", start: 1, end: 20 },
  { id: "sunlit-falls", start: 21, end: 30 },
  { id: "crystal-conservatory", start: 31, end: 40 },
  { id: "mosswood-hollows", start: 41, end: 50 },
  { id: "cloudreach-summit", start: 51, end: 70 },
  { id: "verdant-beyond", start: 71, end: 100 },
];

let offset = 0;
const regions = LEVEL_REGIONS.map((base, index) => {
  const tileCount = Math.ceil((base.end - base.start + 1) / 10);
  const rawLength = tileCount * effectiveTileLength + TILE_OVERLAP;
  const regionOffset = index === 0 ? 0 : offset - REGION_OVERLAP;
  const regionLength = index === 0 ? rawLength : rawLength + REGION_OVERLAP;
  offset = regionOffset + regionLength;
  return { ...base, offset: regionOffset, length: regionLength, tileCount };
});

const cloudreach = regions[4];
const verdant = regions[5];
const seamBoundary = cloudreach.offset + cloudreach.length - REGION_OVERLAP / 2;
const transWidth = 1300;
const transLeft = seamBoundary - transWidth / 2;

console.log("Cloudreach:", {
  offset: cloudreach.offset,
  tile1Left: cloudreach.offset + 1 * effectiveTileLength,
  tile1End: cloudreach.offset + 1 * effectiveTileLength + tileLength,
});
console.log("Transition Summit-to-Beyond:", {
  transLeft,
  transRight: transLeft + transWidth,
  seamBoundary,
});
console.log("Verdant Beyond:", {
  offset: verdant.offset,
  tile0Left: verdant.offset,
});

// For any point in Cloudreach Tile 1:
// x = cloudreach.offset + 1 * effectiveTileLength + (baseX / 100) * tileLength
// Position within transition pano (0 to 1376px):
// transPanoPx = ((x - transLeft) / transWidth) * 1376
// Position within viewport if scrollLeft is S:
// screenX = x - S
