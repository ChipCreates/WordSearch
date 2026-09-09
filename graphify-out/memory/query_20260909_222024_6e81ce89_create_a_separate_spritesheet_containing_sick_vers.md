---
type: "query"
date: "2026-09-09T22:20:24.692414+00:00"
question: "Create a separate spritesheet containing sick versions of every WordSprout plant and add dormant code support for future plant sickness without implementing gameplay mechanics."
contributor: "graphify"
outcome: "useful"
source_nodes: ["PLANTS_CATALOG", "plantsCatalog.ts", "GardenView.tsx", "getStageImage()"]
---

# Q: Create a separate spritesheet containing sick versions of every WordSprout plant and add dormant code support for future plant sickness without implementing gameplay mechanics.

## Answer

Expanded query vocabulary: plant, plants, catalog, stage, image, garden, asset. Created a 5x4, 2560x2048 transparent sick-plant WebP sheet aligned to PLANTS_CATALOG order. Added plantHealth.ts with a typed visual state, stable sprite order, sheet metadata, CSS coordinates, and a future-facing resolver that defaults to healthy lifecycle art. Added tests confirming catalog alignment and sprite coordinates; no live garden or persistence behavior was changed.

## Outcome

- Signal: useful

## Source Nodes

- PLANTS_CATALOG
- plantsCatalog.ts
- GardenView.tsx
- getStageImage()