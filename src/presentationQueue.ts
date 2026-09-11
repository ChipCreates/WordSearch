// Word Sprout's shared presentation-queue/ordering policy (WSP-2.2, Part 3).
//
// The problem this exists to solve: a single level completion can produce
// several independent "I want the screen" moments at once -- a rank
// promotion (BotanistPromotionCeremony), a region transition or milestone
// (WSP-2.4, not yet built), and an achievement unlock (AchievementBanner)
// -- and nothing previously defined what order those present in, or what
// happens if two want a full-screen presentation simultaneously. Before this
// module, `justUnlocked` and `promotionQueue` (useWordSearchGame.ts) were two
// separate arrays with no shared arbitration at all; App.tsx's only ordering
// guarantee was an ad hoc gate ("don't show the achievement banner until the
// success overlay is up"). This module is the one place that ordering is
// decided, so a future third, fourth, ... event source (milestones, region
// transitions) plugs into the same policy instead of inventing its own timer
// that races the others.
//
// This module defines the *policy* (the event shape + ordering function). It
// does not own React state -- useWordSearchGame.ts still owns justUnlocked,
// promotionQueue, and the new milestoneQueue as the actual queues players'
// dismiss actions mutate; it derives one combined, correctly-ordered view by
// calling buildPresentationQueue() below. That split keeps every existing
// consumer (App.tsx, existing tests) working against the field names they
// already use, while still giving every producer one real, shared ordering
// contract instead of ad hoc sequencing.

import type { Achievement } from "./achievements";
import type { BotanistPromotion } from "./botanistRanks";

export type RegionTransitionEvent = {
    kind: "region-transition";
    regionId: string;
    /** Which of the region's two possible one-time rewards this moment is. */
    transition: "entry" | "completion";
    rewardSeeds: number;
    /** The level whose completion triggered this -- lets a future title-card
     *  UI reference "Level 20" context without re-deriving it from state. */
    level: number;
};

// A slot WSP-2.4 will populate for the level 10/20/30/40/50/70/100 milestone
// cards -- distinct from RegionTransitionEvent because a level can be a
// milestone without being a region boundary (level 10, for instance, sits
// inside Glowing Grove). Nothing constructs this yet (see
// WordSprout_1.0_Tier2_Issues.md's WSP-2.4), but its shape is fixed now so
// that issue can start feeding buildPresentationQueue() without renegotiating
// this module's API, per this issue's own acceptance criteria.
export type MilestoneEvent = {
    kind: "milestone";
    level: number;
};

export type RankPromotionEvent = { kind: "rank-promotion"; promotion: BotanistPromotion };
export type AchievementEvent = { kind: "achievement"; achievement: Achievement };

/** Anything that can end up in the shared presentation queue. */
export type PresentationEvent = RankPromotionEvent | RegionTransitionEvent | MilestoneEvent | AchievementEvent;

/** The subset of PresentationEvent that useWordSearchGame.ts's own
 *  `milestoneQueue` state holds today (region-transition, produced by this
 *  issue) or will hold once WSP-2.4 lands (milestone). */
export type MilestoneQueueEvent = RegionTransitionEvent | MilestoneEvent;

// --- Ordering policy --------------------------------------------------
//
// Chosen order, low (presented first) to high (presented last):
//
//   0. rank-promotion        Already visually COMBINED into the completion
//                            summary today -- App.tsx passes
//                            `promotionQueue[0]` straight into SuccessScreen,
//                            which renders it inline rather than as a
//                            separate overlay. That existing behavior is
//                            preserved, not reinvented: the completion
//                            summary itself is never a queued
//                            PresentationEvent (it isn't dismissible the same
//                            way -- it's the base screen every level
//                            completion shows), so "completion summary, then
//                            rank promotion" is really one combined screen,
//                            step 0 here just orders the promotion relative
//                            to what comes after it once that screen closes.
//
//   1. region-transition /   Grouped at the same step -- the plan's own
//      milestone             phrasing treats "milestone/region transition"
//                            as one moment, and a level can be both at once
//                            (10/20/30/40/50/70 are milestones per WSP-2.4's
//                            list; 20/30/40/50/70/100 are also region
//                            boundaries). Ties fall back to queue order
//                            (whichever was produced first), never dropped.
//
//   2. achievement toast     Smallest and most frequent, shown last so a
//                            bigger moment (a region transition or milestone)
//                            is never buried underneath a routine achievement
//                            pop that happened to fire in the same tick.
//
// Rank promotion, region-transition/milestone, and achievement events never
// visually COMBINE with each other (only rank-promotion combines with the
// completion summary, above) -- each is its own full presentation at its own
// WSP-2.1 intensity (different scrim/duration/audio per kind), and combining
// two of those would blur two deliberately different weights into one. They
// STRICTLY SEQUENCE instead: the ordered queue is consumed one event at a
// time (index 0 is "current"), a consumer dismisses it, and the next one
// becomes current.
const KIND_ORDER: Record<PresentationEvent["kind"], number> = {
    "rank-promotion": 0,
    "region-transition": 1,
    "milestone": 1,
    "achievement": 2,
};

/**
 * Pure ordering function: given every presentable event one level completion
 * produced, in whatever order each system happened to produce them, returns
 * them in the one canonical presentation order defined above. Stable with
 * respect to input order within the same step (explicit index tie-break,
 * not relied on from Array.prototype.sort) -- nothing is dropped, nothing is
 * duplicated, and same-step ties never reorder unpredictably.
 */
export function buildPresentationQueue(events: readonly PresentationEvent[]): PresentationEvent[] {
    return events
        .map((event, index) => ({ event, index }))
        .sort((a, b) => KIND_ORDER[a.event.kind] - KIND_ORDER[b.event.kind] || a.index - b.index)
        .map(({ event }) => event);
}
