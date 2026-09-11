import { describe, it, expect } from "vitest";
import { buildPresentationQueue, type PresentationEvent } from "./presentationQueue";
import type { Achievement } from "./achievements";
import type { BotanistPromotion, BotanistRank } from "./botanistRanks";

const rank = (title: string): BotanistRank => ({ title, avatarIndex: 0, minLevel: 1, maxLevel: null });
const promotion = (level: number): BotanistPromotion => ({ from: rank("Seedling Scout"), to: rank("Moss Tender"), level });
const achievement = (id: string): Achievement => ({
    id, name: id, description: id, icon: "🌱", maxProgress: 1, getProgress: () => 1,
});

describe("buildPresentationQueue (WSP-2.2)", () => {
    it("returns an empty queue for zero coincident events", () => {
        expect(buildPresentationQueue([])).toEqual([]);
    });

    it("returns a single event unchanged for one coincident event", () => {
        const events: PresentationEvent[] = [{ kind: "achievement", achievement: achievement("night-bloomer") }];
        expect(buildPresentationQueue(events)).toEqual(events);
    });

    it("orders the maximum realistic level-50 stack: rank promotion, then region-transition/milestone, then achievement", () => {
        // Deliberately constructed out of canonical order, and interleaved
        // with a second same-tier event, to prove the sort actually
        // reorders by kind rather than happening to already be sorted.
        const achievementEvent: PresentationEvent = { kind: "achievement", achievement: achievement("zenith-climber") };
        const rankEvent: PresentationEvent = { kind: "rank-promotion", promotion: promotion(50) };
        const regionEvent: PresentationEvent = { kind: "region-transition", regionId: "mosswood-hollows", transition: "completion", rewardSeeds: 300, level: 50 };
        const milestoneEvent: PresentationEvent = { kind: "milestone", level: 50 };

        const input = [achievementEvent, milestoneEvent, rankEvent, regionEvent];
        const ordered = buildPresentationQueue(input);

        // Every event survives -- nothing dropped, nothing duplicated.
        expect(ordered).toHaveLength(4);
        expect(new Set(ordered)).toEqual(new Set(input));

        expect(ordered[0]).toBe(rankEvent);
        // milestone and region-transition share a tier; queue order (as
        // produced) breaks the tie -- milestoneEvent was produced before
        // regionEvent in `input`.
        expect(ordered[1]).toBe(milestoneEvent);
        expect(ordered[2]).toBe(regionEvent);
        expect(ordered[3]).toBe(achievementEvent);
    });

    it("keeps same-kind events in their original relative order (stable within a tier)", () => {
        const first: PresentationEvent = { kind: "achievement", achievement: achievement("first") };
        const second: PresentationEvent = { kind: "achievement", achievement: achievement("second") };
        const third: PresentationEvent = { kind: "achievement", achievement: achievement("third") };

        expect(buildPresentationQueue([first, second, third])).toEqual([first, second, third]);
        // Feeding them in a different order proves this isn't accidental --
        // the function preserves *input* order per tier, it doesn't sort by
        // achievement id or anything else incidental.
        expect(buildPresentationQueue([third, first, second])).toEqual([third, first, second]);
    });

    it("groups region-transition and milestone at the same step regardless of input order", () => {
        const milestoneEvent: PresentationEvent = { kind: "milestone", level: 20 };
        const regionEvent: PresentationEvent = { kind: "region-transition", regionId: "glowing-grove", transition: "completion", rewardSeeds: 150, level: 20 };

        expect(buildPresentationQueue([regionEvent, milestoneEvent])).toEqual([regionEvent, milestoneEvent]);
        expect(buildPresentationQueue([milestoneEvent, regionEvent])).toEqual([milestoneEvent, regionEvent]);
    });

    it("never drops or duplicates events across a larger mixed batch", () => {
        const events: PresentationEvent[] = [
            { kind: "achievement", achievement: achievement("a1") },
            { kind: "rank-promotion", promotion: promotion(10) },
            { kind: "region-transition", regionId: "sunlit-falls", transition: "entry", rewardSeeds: 50, level: 20 },
            { kind: "achievement", achievement: achievement("a2") },
            { kind: "milestone", level: 10 },
        ];
        const ordered = buildPresentationQueue(events);
        expect(ordered).toHaveLength(events.length);
        expect(ordered.map(e => e.kind)).toEqual(["rank-promotion", "region-transition", "milestone", "achievement", "achievement"]);
    });
});
