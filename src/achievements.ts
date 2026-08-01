export type Achievement = {
    id: string;
    name: string;
    description: string;
    icon: string;
};

export const ACHIEVEMENTS: Achievement[] = [
    { id: "first-steps", name: "First Steps", description: "Complete your first level", icon: "🌱" },
    { id: "warmed-up", name: "Getting Warmed Up", description: "Complete 5 levels", icon: "🔥" },
    { id: "double-digits", name: "Double Digits", description: "Complete 10 levels", icon: "🔟" },
    { id: "halfway-hero", name: "Halfway Hero", description: "Complete 25 levels", icon: "🏅" },
    { id: "search-master", name: "Word Search Master", description: "Complete 50 levels", icon: "👑" },
    { id: "bonus-hunter", name: "Bonus Hunter", description: "Find your first bonus word", icon: "🔍" },
    { id: "star-collector", name: "Star Collector", description: "Earn 10 stars", icon: "⭐" },
    { id: "star-baron", name: "Star Baron", description: "Earn 50 stars", icon: "🌟" },
    { id: "world-traveler", name: "World Traveler", description: "See all 10 word categories", icon: "🌍" },
    { id: "diagonal-detective", name: "Diagonal Detective", description: "Find a word placed diagonally", icon: "↗️" },
];

export type AchievementStats = {
    levelsCompleted: number;
    stars: number;
    categoriesSeen: number;
    foundDiagonal: boolean;
};

// Every achievement id whose unlock condition `stats` currently satisfies --
// checked fresh each time stats change, rather than tracked incrementally,
// so nothing depends on catching the exact moment a threshold was crossed.
export function evaluateAchievements(stats: AchievementStats): string[] {
    const unlocked: string[] = [];
    if (stats.levelsCompleted >= 1) unlocked.push("first-steps");
    if (stats.levelsCompleted >= 5) unlocked.push("warmed-up");
    if (stats.levelsCompleted >= 10) unlocked.push("double-digits");
    if (stats.levelsCompleted >= 25) unlocked.push("halfway-hero");
    if (stats.levelsCompleted >= 50) unlocked.push("search-master");
    if (stats.stars >= 1) unlocked.push("bonus-hunter");
    if (stats.stars >= 10) unlocked.push("star-collector");
    if (stats.stars >= 50) unlocked.push("star-baron");
    if (stats.categoriesSeen >= 10) unlocked.push("world-traveler");
    if (stats.foundDiagonal) unlocked.push("diagonal-detective");
    return unlocked;
}
