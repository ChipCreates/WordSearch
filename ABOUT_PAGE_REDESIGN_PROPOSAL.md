# About & How to Play — Redesign Proposal

## Status

Proposal for review. No implementation in this document — see [Screenshot Production Plan](#screenshot-production-plan) for one blocker that needs a decision before build.

## Why this page needs work

`src/components/AboutDialog.tsx` is the only major feature surface in the app still shaped like a bolted-on modal. Every other destination — Levels, Garden, Trophies — is a full-bleed page rendered inside `ws-main-layout` (`src/App.tsx:351`), reachable from the top nav and bottom nav. About & How to Play is a `Dialog` capped at `maxWidth="xs"` (444px) on desktop, and even on mobile where it does go `fullScreen`, it renders as a single unstyled scroll of five short bullet points.

Three concrete problems, all raised in the request:

1. **Not a real page.** On desktop it's a narrow card in the middle of the screen — everything else in the app has graduated out of that pattern.
2. **Stale, thin content.** The "How to play" section has five bullets and says "10 achievements unlock as you play." The game actually ships **28 achievements** (`src/achievements.ts`), 6 powerups, 10 botanist ranks, a 20-plant garden with 7 rarity tiers, rotating field-note quests, 3 difficulty tiers, and 2 purchasable cosmetic themes plus a crest — none of which the page mentions.
3. **Footer carries a fictitious identity.** `src/App.tsx:565-568` renders `© {year} Word Sprout Studio. v{__APP_VERSION__}` — "Word Sprout Studio" is not a real entity — and `.ws-footer` (`src/App.css:1622-1689`) hides the whole thing below 768px, so mobile players can't see the version number at all today.

## Proposed direction

### 1. Promote it to a page, not a bigger modal

Give it a `ws-main-layout`-shaped view, matching `LevelsView`/`GardenView`/`AchievementsView`. Concretely:

- Add `"about"` to the `ActiveTab` union (`src/App.tsx:48`) and render a new `AboutView` component the same way the other three are rendered (lazy-loaded, `Suspense`-wrapped, conditioned on `activeTab`).
- **Entry points stay exactly where they are** — the "About & How to Play" button in `ContextSidebar` (`src/components/sidebar/ContextSidebar.tsx:108`, reachable on mobile through the Field Kit drawer) — just have `onHelp` call `setActiveTab("about")` instead of `setAboutOpen(true)`. This avoids crowding the primary top-nav/bottom-nav 4-tab set (Play/Levels/Garden/Trophies) with a reference page that isn't part of the core play loop.
- Layout: single scrolling column on mobile; on desktop, a sticky section-jump rail down the left (short anchor list: Basics, Progression, Garden, Achievements, Cosmetics, Credits), content column on the right, capped at a comfortable reading width (~760px) rather than stretched edge-to-edge — "full width" means the *page* is full width, not that every line of text is.
- Reuse the existing glass-panel styling tokens (`--glass-bg`, `--glass-blur`, `--glass-border`) already used throughout instead of `AboutDialog`'s one-off `Dialog` paper overrides.
- `AboutDialog.tsx` and its lazy import get deleted once the view ships; `onReplayOnboarding` moves into the new view's Credits/Basics section.

### 2. Rewrite the content to match the real game

Replace the 5-bullet list with sections that actually cover what a level-40 player has accumulated. Proposed structure, each with a one-line description of the illustration it needs (see next section for how those get produced):

| Section | Covers | Illustration |
|---|---|---|
| Overview | One-paragraph pitch (kept close to current intro copy) | none |
| Basics | Drag-select across/up/down/diagonal, either direction; completing a level | Board mid-drag with a highlighted word |
| Bonus & special words | Any valid word off-list scores a bonus; diagonal and reverse placements are tracked separately | Bonus-word toast |
| Progression | Levels grow the grid and word list; Standard vs. Challenging difficulty; favorite-category mode | Levels view |
| Botanist ranks | 10 ranks from Seedling Scout to Cosmic Conservator, tied to level, with a promotion ceremony | Promotion ceremony popup |
| Seeds & the Store | How Seeds are earned (levels, bonus words, blooms) and spent (plants, fertilizer, powerups, cosmetics) | Tactical Toolkit sidebar |
| Powerups | Reference table: Single Letter Sprout, Lumina Cyclone, Super Root Hint, Bioluminescent Compass, Flora Spectrometer, Nitrogen Booster — cost and effect each | Toolkit-in-use crop (shared with above, or omit) |
| The Garden | Owning/watering plants, 4 growth stages, blooming, 7 rarity tiers, fertilizer to speed growth | Garden view with plants at different stages |
| Field Notes | Rotating 3-of-8 mini-quest "expeditions," claiming rewards | Field Notes panel |
| Achievements | 28 achievements across one-off milestones and bronze→gold→exceptional tiers | Trophies view + an achievement banner |
| Cosmetics | Autumn Canopy / Ocean Trench themes, Golden Sprout Crest, all Seed Store purchases | Settings or Seed Store crop |
| Credits | Built-with line, GitHub link, art attribution (all kept verbatim from today), **app version**, replayable onboarding button | none |

This list came from an actual feature audit of `achievements.ts`, `powerups.ts`, `botanistRanks.ts`, `plantsCatalog.ts`, `fieldNotes.ts`, `economy.ts`, and `onboarding.ts` — not a guess — so it should already track the shipped game. Onboarding's 5 coachmark steps only teach basics/seeds/bonus-words/watering/store-unlock; this page is meant to be the deeper reference those teasers point to, not a duplicate of them.

### 3. Remove the footer, relocate the version number

- Delete the `<footer className="ws-footer">...</footer>` block, `src/App.tsx:565-568`.
- Delete the `.ws-footer` rule set and its mobile `display: none` override, `src/App.css:1622-1689` (verify no other selector depends on `.ws-footer` existing before removing — a quick grep at implementation time is enough).
- Add a line to the new Credits section reading the same `__APP_VERSION__` global (already wired through `vite.config.ts` / `vite.web.config.ts` / `src/vite-env.d.ts` — no build changes needed), e.g. "Word Sprout v{version}".
- **Open question, needs your call before implementation:** the copyright line's "Word Sprout Studio" needs to become *something* or be dropped. Options: (a) drop the copyright line entirely and keep just the version + "Built with Tauri, React, and Rust" + GitHub link (the source link already points at `github.com/ChipCreates/WordSprout`, so the identity is implicit); (b) attribute it to your GitHub handle directly, e.g. "© {year} ChipCreates"; (c) something else you have in mind. This proposal defaults to (a) — quietest option, nothing fictitious, nothing to keep updated — but flagging it since it's a naming decision, not an engineering one.

## Screenshot Production Plan

Every illustration above can be staged deterministically using the debug panel and screenshot-mode hotkey already shipped (`src/components/DebugPanel.tsx`, `src/debug/screenshotMode.ts`) — no new tooling needed to *produce* the states. For each row in the content table:

1. Open the app with `?debug=true`, open the debug panel, drive it to the target state (e.g. Achievements → "Preview banner" for the achievement-banner shot; Botanist rank → "Preview promotion ceremony"; Garden → "Bloom all" then back off one or two plants to show mixed growth stages; Board → pick a size and drag a word by hand for the Basics shot).
2. Press the screenshot hotkey (default `Ctrl+Shift+H`) to hide the debug panel, banner, and floating toggle without touching game state.
3. Capture and save into `docs/screenshots/` with a `howto-<topic>.{webp,png}` naming convention (e.g. `howto-drag-select.webp`, `howto-garden.webp`), matching the existing `docs/screenshots/{banner,desktop,mobile}.jpg` convention. Prefer WebP at a modest width (the existing `backgrounds/*.webp` assets are the local precedent) — these ship inside the app bundle, not just the README, so keep them compressed.
4. One technical note that came out of checking `scripts/check-build-budget.mjs` and the PWA config: the service worker's `globPatterns` (`vite.web.config.ts`) only precache `js/css/html/ico/svg/webmanifest` plus `dictionary.json` — images are *not* auto-precached, so these illustrations won't threaten the 20 MB install-payload budget as long as they're referenced as normal `<img src={assetUrl(...)}>` and not inlined as data URIs (which would count toward the 500 KB JS-chunk budget instead).

**Status: deferred, real screenshots not yet in the repo.** Every illustrated state in the table above has been driven and visually verified in the real running dev server (so the content plan is grounded in the actual current UI, not guesswork), but no automated path in this environment could get the resulting frames into `docs/screenshots/`:

- The in-session browser preview has no screenshot-to-disk capability at all.
- Connecting the Claude in Chrome extension (in Microsoft Edge, driving a real dev server on `localhost:1420`) and using its `save_to_disk` option looked promising, but only delivered 3 of 10 captured images as chat attachments, unpredictably — not a reliable pipeline.

Decision: shelve real screenshot capture for now rather than keep fighting the tooling. Content and component work (see [Suggested build order](#suggested-build-order)) can proceed with placeholder illustration slots; capturing the actual frames is a fast manual pass (steps above, ~10 states) whenever it's convenient — the debug panel and screenshot hotkey exist specifically to make that a few minutes of work, not a research project.

**Aside — a real bug found while staging one of these states:** the debug panel's "Preview promotion ceremony" button (`src/hooks/useWordSearchGame.ts:804-807`) always calls `getBotanistPromotion(highestUnlockedLevel, toLevel)` with the *same* current level on both sides, so it can never detect a rank change and silently no-ops. Getting a real promotion screen for this proposal required actually playing levels 1→3 through with the debug board-solver instead. Not part of this proposal's scope; flagged separately.

## Suggested build order

1. Content + copy pass (no visuals yet) — get the 12 sections above written and reviewed, since copy accuracy was the most concrete complaint.
2. `AboutView` component + `ActiveTab` wiring, styled per [Proposed direction §1](#1-promote-it-to-a-page-not-a-bigger-modal), with placeholder illustration slots.
3. Footer removal + version relocation (small, independent, can land anytime after step 2 gives the version a new home).
4. Screenshot capture pass, once the copyright-line decision above is made and the section copy is stable (no point illustrating a section that's about to be reworded).
5. Delete `AboutDialog.tsx` and its now-dead lazy import.

Each step is small enough to land as its own PR if you'd rather review incrementally rather than all at once.
