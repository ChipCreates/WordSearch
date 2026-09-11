---
type: "query"
date: "2026-09-10T23:21:52.289417+00:00"
question: "review this implementation plan for tier 2 mitigations for Release 1.0 targets."
contributor: "graphify"
outcome: "useful"
source_nodes: ["ACHIEVEMENTS", "Achievement", "GardenView.tsx", "LevelsView.tsx", "persistence.ts", "useWordSearchGame.ts", "backend.ts", "plantsCatalog.ts"]
---

# Q: review this implementation plan for tier 2 mitigations for Release 1.0 targets.

## Answer

Expanded from original query via graph vocab: [achievement, achievements, category, garden, levels, persistence, plant, rewards, save]. Review found release-critical gaps: region category weighting must cover both backend.ts web selection and src-tauri/src/lib.rs native selection; bloomedRarityTiers is currently incremented per bloom rather than tracking unique rarity tiers; reward/milestone triggers need persisted exactly-once semantics; all bloom entry points including watering, fertilizing, and bulk watering must share presentation; and the shared reward-intensity contract should land before dependent UI work. The issue set should be split into foundation, tuning/parity, presentation, and beyond-100 verification slices.

## Outcome

- Signal: useful

## Source Nodes

- ACHIEVEMENTS
- Achievement
- GardenView.tsx
- LevelsView.tsx
- persistence.ts
- useWordSearchGame.ts
- backend.ts
- plantsCatalog.ts