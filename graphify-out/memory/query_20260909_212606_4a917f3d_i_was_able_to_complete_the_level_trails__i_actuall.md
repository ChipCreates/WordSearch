---
type: "query"
date: "2026-09-09T21:26:06.943807+00:00"
question: "I was able to complete the level trails. I actually had Gemini create some transitional tiles to seamlessly transition between the level backgrounds. I also built a trail editor in the debug panel. I can edit the trail and stones as true Bezier curve. One thing I noticed was on my 4k uhd display some of the background images were blurry. Can yuo check the resolution and sizes for all of the background images for the levels? These needs to be sharp and not blurry."
contributor: "graphify"
outcome: "useful"
source_nodes: ["LevelsView()", "LevelsView.tsx"]
---

# Q: I was able to complete the level trails. I actually had Gemini create some transitional tiles to seamlessly transition between the level backgrounds. I also built a trail editor in the debug panel. I can edit the trail and stones as true Bezier curve. One thing I noticed was on my 4k uhd display some of the background images were blurry. Can yuo check the resolution and sizes for all of the background images for the levels? These needs to be sharp and not blurry.

## Answer

Expanded from original query via graph vocab: [background, levels, image, canvas, size]. Audited LevelsView and all 17 files under public/backgrounds/levels. The 12 regional assets are 1376x768 landscape or 768x1376 portrait; all 5 transition panoramas are 1376x768. LevelsView derives each tile directly from those dimensions and stretches it to the full map cross-axis with background-size 100% 100%. On a 3840x2160 fullscreen display the physical render is roughly 3700x2080, about 2.7x the source, explaining the blur. All files decode as yuv420p WebP. Recommended replacement size is exact 3x: 4128x2304 landscape and 2304x4128 portrait, with high-quality or lossless WebP. Also found grove-to-falls-landscape.webp is present but not referenced, and no portrait transition images are configured.

## Outcome

- Signal: useful

## Source Nodes

- LevelsView()
- LevelsView.tsx