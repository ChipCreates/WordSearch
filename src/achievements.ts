export type Achievement = {
    id: string;
    name: string;
    description: string;
    icon: string;
    image?: string;
    maxProgress: number;
    getProgress: (stats: AchievementStats) => number;
};

export type AchievementStats = {
    levelsCompleted: number;
    stars: number; // Represents seeds
    categoriesSeen: number;
    foundDiagonal: boolean;
    totalCategories: number;
};

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: "speed-sprouter",
        name: "Speed Sprouter",
        description: "Solve 50 puzzles in under 30 seconds each",
        icon: "⚡",
        image: "/achievements/speed-sprouter.png",
        maxProgress: 5,
        getProgress: (stats) => Math.min(5, stats.levelsCompleted),
    },
    {
        id: "word-weaver",
        name: "Word Weaver",
        description: "Create 10 words of 8 letters or more in a single session",
        icon: "🕸️",
        image: "/achievements/word-weaver.png",
        maxProgress: 10,
        getProgress: (stats) => Math.min(10, stats.levelsCompleted * 2),
    },
    {
        id: "root-master",
        name: "Root Master",
        description: "Connect words using the same root letter 100 times",
        icon: "🌳",
        image: "/achievements/root-master.png",
        maxProgress: 100,
        getProgress: (stats) => Math.min(100, stats.levelsCompleted * 10),
    },
    {
        id: "solar-scribe",
        name: "Solar Scribe",
        description: "Reach a daily streak of 30 days in the Greenhouse",
        icon: "☀️",
        image: "/achievements/solar-scribe.png",
        maxProgress: 30,
        getProgress: (stats) => Math.min(30, stats.levelsCompleted),
    },
    {
        id: "petal-poet",
        name: "Petal Poet",
        description: "Collect every flower type in the Autumn biome",
        icon: "🍁",
        image: "/achievements/petal-poet.png",
        maxProgress: 8,
        getProgress: (stats) => Math.min(8, stats.categoriesSeen),
    },
    {
        id: "night-bloomer",
        name: "Night Bloomer",
        description: "Explore the greenhouse during Midnight mode",
        icon: "🌙",
        image: "/achievements/night-bloomer.png",
        maxProgress: 1,
        getProgress: (stats) => (stats.levelsCompleted >= 1 ? 1 : 0),
    },
    {
        id: "verdant-voyager",
        name: "Verdant Voyager",
        description: "Unlock all levels in the Ancient Forest world",
        icon: "🌲",
        image: "/achievements/world-traveler.png",
        maxProgress: 15,
        getProgress: (stats) => Math.min(15, stats.levelsCompleted),
    },
    {
        id: "moss-mystic",
        name: "Moss Mystic",
        description: "Use the 'Hint' spell without breaking your combo 10 times",
        icon: "🔮",
        image: "/achievements/root-master.png",
        maxProgress: 10,
        getProgress: (stats) => Math.min(10, stats.levelsCompleted),
    },
    {
        id: "bloom-herald",
        name: "Bloom Herald",
        description: "Harvest your first 100 SEEDS in the conservatory",
        icon: "💰",
        image: "/achievements/bloom-herald.png",
        maxProgress: 100,
        getProgress: (stats) => Math.min(100, stats.stars * 100),
    },
    {
        id: "daily-dew",
        name: "Daily Dew",
        description: "Log in 7 consecutive days to water your sprouts",
        icon: "💧",
        image: "/achievements/solar-scribe.png",
        maxProgress: 7,
        getProgress: (stats) => Math.min(7, stats.levelsCompleted),
    },
    {
        id: "zenith-climber",
        name: "Zenith Climber",
        description: "Reach Level 50 in Word Search",
        icon: "⛰️",
        image: "/achievements/seed-master.png",
        maxProgress: 50,
        getProgress: (stats) => Math.min(50, stats.levelsCompleted),
    },
    {
        id: "midnight-sun",
        name: "Midnight Sun",
        description: "Play in Midnight mode with 100% puzzle accuracy",
        icon: "☯️",
        image: "/achievements/night-bloomer.png",
        maxProgress: 1,
        getProgress: (stats) => (stats.levelsCompleted >= 1 ? 1 : 0),
    },
    {
        id: "static-charge",
        name: "Static Charge",
        description: "Complete 5 puzzles back-to-back without errors",
        icon: "⚡",
        image: "/achievements/speed-sprouter.png",
        maxProgress: 5,
        getProgress: (stats) => Math.min(5, stats.levelsCompleted),
    },
];

export function evaluateAchievements(stats: AchievementStats): string[] {
    const unlocked: string[] = [];
    for (const ach of ACHIEVEMENTS) {
        if (ach.getProgress(stats) >= ach.maxProgress) {
            unlocked.push(ach.id);
        }
    }
    return unlocked;
}
