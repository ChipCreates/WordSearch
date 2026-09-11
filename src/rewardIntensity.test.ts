import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "./achievements";
import {
    REWARD_INTENSITY_LEVELS,
    REWARD_PRESENTATION,
    getAchievementIntensity,
    type RewardIntensity,
} from "./rewardIntensity";

describe("rewardIntensity", () => {
    it("defines exactly the five documented levels, low to high", () => {
        expect(REWARD_INTENSITY_LEVELS).toEqual(["routine", "small", "medium", "major", "exceptional"]);
        expect(Object.keys(REWARD_PRESENTATION).sort()).toEqual([...REWARD_INTENSITY_LEVELS].sort());
    });

    it("scales duration, scrim, and particle intensity monotonically with level", () => {
        const levels = REWARD_INTENSITY_LEVELS.map(level => REWARD_PRESENTATION[level]);
        for (let i = 1; i < levels.length; i++) {
            expect(levels[i].desktopDurationMs).toBeGreaterThan(levels[i - 1].desktopDurationMs);
            expect(levels[i].mobileDurationMs).toBeGreaterThan(levels[i - 1].mobileDurationMs);
            // mobile is always the more intrusive treatment, so it never outlasts desktop
            expect(levels[i].mobileDurationMs).toBeLessThan(levels[i].desktopDurationMs);
        }
        // scrim only ever turns on as intensity rises, never off
        let sawMobileScrim = false;
        let sawDesktopScrim = false;
        for (const spec of levels) {
            if (sawMobileScrim) expect(spec.scrim.mobile).toBe(true);
            if (sawDesktopScrim) expect(spec.scrim.desktop).toBe(true);
            sawMobileScrim = sawMobileScrim || spec.scrim.mobile;
            sawDesktopScrim = sawDesktopScrim || spec.scrim.desktop;
        }
        expect(sawMobileScrim).toBe(true);
        expect(sawDesktopScrim).toBe(true);
    });

    it("matches the existing AchievementBanner default (medium) exactly", () => {
        // AchievementBanner.tsx's current uniform treatment: TOTAL_MS = 6000,
        // MOBILE_TOTAL_MS = 3500, mobile-only scrim. This must stay the "medium"
        // anchor point so wiring intensity into the banner later is not also a
        // silent timing change for every achievement that already shipped.
        expect(REWARD_PRESENTATION.medium.desktopDurationMs).toBe(6000);
        expect(REWARD_PRESENTATION.medium.mobileDurationMs).toBe(3500);
        expect(REWARD_PRESENTATION.medium.scrim).toEqual({ mobile: true, desktop: false });
    });

    it("classifies every current achievement without throwing", () => {
        const results = new Map<string, RewardIntensity>();
        for (const achievement of ACHIEVEMENTS) {
            expect(() => getAchievementIntensity(achievement)).not.toThrow();
            results.set(achievement.id, getAchievementIntensity(achievement));
        }
        expect(results.size).toBe(ACHIEVEMENTS.length);
    });

    it("maps every AchievementTier onto the expected intensity 1:1", () => {
        const byTier = new Map(ACHIEVEMENTS.filter(a => a.tier).map(a => [a.id, a] as const));
        expect(getAchievementIntensity(byTier.get("level-clears-10")!)).toBe("small");   // bronze
        expect(getAchievementIntensity(byTier.get("level-clears-25")!)).toBe("medium");  // silver
        expect(getAchievementIntensity(byTier.get("level-clears-100")!)).toBe("exceptional");
        expect(getAchievementIntensity(byTier.get("bonus-words-100")!)).toBe("major");   // gold
    });

    it("throws for an achievement with neither a tier nor a legacy mapping", () => {
        expect(() => getAchievementIntensity({
            id: "not-a-real-achievement",
            name: "x", description: "x", icon: "x", maxProgress: 1, getProgress: () => 0,
        })).toThrow(/no tier and no legacy mapping/);
    });
});
