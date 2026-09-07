import { ACHIEVEMENTS, type Achievement, type AchievementStats } from "../../achievements";

export type ClosestMilestone = { achievement: Achievement; progress: number; remaining: number; ratioRemaining: number };

export function getClosestMilestones(stats: AchievementStats, unlockedIds: Set<string>, limit = 3): ClosestMilestone[] {
    return ACHIEVEMENTS
        .filter(achievement => !unlockedIds.has(achievement.id) && achievement.maxProgress > 0)
        .map((achievement, catalogIndex) => {
            const progress = Math.min(achievement.maxProgress, Math.max(0, achievement.getProgress(stats)));
            const remaining = Math.max(0, achievement.maxProgress - progress);
            return { achievement, progress, remaining, ratioRemaining: remaining / achievement.maxProgress, catalogIndex };
        })
        .filter(item => Number.isFinite(item.ratioRemaining) && item.remaining > 0)
        .sort((a, b) => a.ratioRemaining - b.ratioRemaining || a.catalogIndex - b.catalogIndex)
        .slice(0, limit)
        .map(({ catalogIndex: _catalogIndex, ...item }) => item);
}
