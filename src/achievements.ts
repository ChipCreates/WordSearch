export type AchievementStats = {
    levelsCompleted: number;
    seeds: number;
    categoriesSeen: number;
    foundDiagonal: boolean;
    totalCategories: number;
    bonusWordsFound: number;
    levelsCompletedWithoutHint: number;
    maxBonusWordsInLevel: number;
    reverseWordsFound: number;
    plantsBloomed: number;
    bloomedRarityTiers: number;
    uniqueCategoriesCompleted: number;
    powerupsUsed: number;
};

export type Achievement = {
    id: string;
    name: string;
    description: string;
    icon: string;
    image?: string;
    maxProgress: number;
    getProgress: (stats: AchievementStats) => number;
};

const capped = (value: number, max: number) => Math.min(max, value);

export const ACHIEVEMENTS: Achievement[] = [
    { id: "night-bloomer", name: "First Bloom", description: "Complete your first puzzle level", icon: "🌙", image: "/achievements/night-bloomer.png", maxProgress: 1, getProgress: s => s.levelsCompleted >= 1 ? 1 : 0 },
    { id: "zenith-climber", name: "Zenith Climber", description: "Complete 50 puzzle levels", icon: "⛰️", image: "/achievements/seed-master.png", maxProgress: 50, getProgress: s => capped(s.levelsCompleted, 50) },
    { id: "petal-poet", name: "Petal Poet", description: "Discover 8 unique word categories", icon: "🍁", image: "/achievements/petal-poet.png", maxProgress: 8, getProgress: s => capped(s.categoriesSeen, 8) },
    { id: "midnight-sun", name: "Diagonal Detective", description: "Find a word placed diagonally on the board", icon: "↗️", image: "/achievements/midnight-sun.png", maxProgress: 1, getProgress: s => s.foundDiagonal ? 1 : 0 },
    { id: "sunlight-harvester", name: "Sunlight Harvester", description: "Discover 5 bonus words that were not on the list", icon: "☀️", image: "/achievements/sunlight-harvester.png", maxProgress: 5, getProgress: s => capped(s.bonusWordsFound, 5) },
    { id: "bloom-herald", name: "Bloom Herald", description: "Earn 1,000 Seeds", icon: "🌱", image: "/achievements/bloom-herald.png", maxProgress: 1000, getProgress: s => capped(s.seeds, 1000) },
    { id: "nimble-planter", name: "Nimble Planter", description: "Complete 5 levels without using a hint", icon: "🌱", image: "/achievements/nimble-planter.png", maxProgress: 5, getProgress: s => capped(s.levelsCompletedWithoutHint, 5) },
    { id: "word-weaver", name: "Word Weaver", description: "Find 3 bonus words in a single level", icon: "🕸️", image: "/achievements/word-weaver.png", maxProgress: 3, getProgress: s => capped(s.maxBonusWordsInLevel, 3) },
    { id: "root-master", name: "Root Master", description: "Find a word in reverse", icon: "🌳", image: "/achievements/root-master.png", maxProgress: 1, getProgress: s => s.reverseWordsFound > 0 ? 1 : 0 },
    { id: "solar-scribe", name: "Solar Scribe", description: "Bloom the starter plant", icon: "☀️", image: "/achievements/solar-scribe.png", maxProgress: 1, getProgress: s => s.plantsBloomed > 0 ? 1 : 0 },
    { id: "verdant-voyager", name: "Verdant Voyager", description: "Bloom plants from 3 rarity tiers", icon: "🌲", image: "/achievements/world-traveler.png", maxProgress: 3, getProgress: s => capped(s.bloomedRarityTiers, 3) },
    { id: "moss-mystic", name: "Moss Mystic", description: "Use a tactical power-up successfully", icon: "🔮", image: "/achievements/moss-mystic.png", maxProgress: 1, getProgress: s => s.powerupsUsed > 0 ? 1 : 0 },
    { id: "daily-dew", name: "Garden Cartographer", description: "Complete levels in 10 unique categories", icon: "💧", image: "/achievements/daily-dew.png", maxProgress: 10, getProgress: s => capped(s.uniqueCategoriesCompleted, 10) },
];

export function evaluateAchievements(stats: AchievementStats): string[] {
    return ACHIEVEMENTS.filter(achievement => achievement.getProgress(stats) >= achievement.maxProgress).map(achievement => achievement.id);
}
