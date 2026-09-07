import { describe, expect, it } from "vitest";
import { BOTANIST_RANKS, getBotanistPromotion, getBotanistRank } from "./botanistRanks";

describe("botanist ranks", () => {
    it("uses granular titles across the level journey", () => {
        expect(getBotanistRank(1).title).toBe("Seedling Scout");
        expect(getBotanistRank(12).title).toBe("Moonlit Keeper");
        expect(getBotanistRank(41).title).toBe("Cosmic Conservator");
    });

    it("assigns one unique avatar to each title", () => {
        expect(new Set(BOTANIST_RANKS.map(rank => rank.avatarIndex)).size).toBe(BOTANIST_RANKS.length);
    });

    it("reports promotions only when a frontier crosses a rank boundary", () => {
        expect(getBotanistPromotion(3, 4)?.to.title).toBe("Moss Tender");
        expect(getBotanistPromotion(4, 5)).toBeNull();
    });
});
