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
    seeds: number;
    categoriesSeen: number;
    foundDiagonal: boolean;
    totalCategories: number;
    bonusWordsFound: number;
};

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: "nimble-planter",
        name: "Nimble Planter",
        description: "Quickly plant your roots in 5 puzzle levels",
        icon: "🌱",
        image: "/achievements/nimble-planter.png",
        maxProgress: 5,
        getProgress: (stats) => Math.min(5, stats.levelsCompleted),
    },
    {
        id: "word-weaver",
        name: "Word Weaver",
        description: "Progress through 5 puzzle levels to weave your lexicon",
        icon: "🕸️",
        image: "/achievements/word-weaver.png",
        maxProgress: 10,
        getProgress: (stats) => Math.min(10, stats.levelsCompleted * 2),
    },
    {
        id: "root-master",
        name: "Root Master",
        description: "Grow your root network across 10 completed levels",
        icon: "🌳",
        image: "/achievements/root-master.png",
        maxProgress: 100,
        getProgress: (stats) => Math.min(100, stats.levelsCompleted * 10),
    },
    {
        id: "solar-scribe",
        name: "Solar Scribe",
        description: "Complete 30 puzzle levels in the Greenhouse",
        icon: "☀️",
        image: "/achievements/solar-scribe.png",
        maxProgress: 30,
        getProgress: (stats) => Math.min(30, stats.levelsCompleted),
    },
    {
        id: "petal-poet",
        name: "Petal Poet",
        description: "Discover 8 unique word categories",
        icon: "🍁",
        image: "/achievements/petal-poet.png",
        maxProgress: 8,
        getProgress: (stats) => Math.min(8, stats.categoriesSeen),
    },
    {
        id: "night-bloomer",
        name: "Night Bloomer",
        description: "Complete your first puzzle level",
        icon: "🌙",
        image: "/achievements/night-bloomer.png",
        maxProgress: 1,
        getProgress: (stats) => (stats.levelsCompleted >= 1 ? 1 : 0),
    },
    {
        id: "verdant-voyager",
        name: "Verdant Voyager",
        description: "Explore through 15 completed puzzle levels",
        icon: "🌲",
        image: "/achievements/world-traveler.png",
        maxProgress: 15,
        getProgress: (stats) => Math.min(15, stats.levelsCompleted),
    },
    {
        id: "moss-mystic",
        name: "Moss Mystic",
        description: "Unlock mystical knowledge across 10 completed levels",
        icon: "🔮",
        image: "/achievements/moss-mystic.png",
        maxProgress: 10,
        getProgress: (stats) => Math.min(10, stats.levelsCompleted),
    },
    {
        id: "bloom-herald",
        name: "Bloom Herald",
        description: "Harvest 1,000 SEEDS by playing levels and nurturing plants",
        icon: "🌱",
        image: "/achievements/bloom-herald.png",
        maxProgress: 1000,
        getProgress: (stats) => Math.min(1000, stats.seeds),
    },
    {
        id: "daily-dew",
        name: "Daily Dew",
        description: "Nurture your sprouts through 7 completed puzzle levels",
        icon: "💧",
        image: "/achievements/daily-dew.png",
        maxProgress: 7,
        getProgress: (stats) => Math.min(7, stats.levelsCompleted),
    },
    {
        id: "zenith-climber",
        name: "Zenith Climber",
        description: "Reach Level 50 by completing puzzle levels",
        icon: "⛰️",
        image: "/achievements/seed-master.png",
        maxProgress: 50,
        getProgress: (stats) => Math.min(50, stats.levelsCompleted),
    },
    {
        // Was a second "complete your first level" achievement, identical
        // to Night Bloomer and unlocking in the same instant. Retargeted at
        // foundDiagonal, which was tracked and persisted but never actually
        // consumed by anything -- and matches the "Diagonal Detective"
        // badge the README has always described.
        id: "midnight-sun",
        name: "Diagonal Detective",
        description: "Find a word placed diagonally on the board",
        icon: "↗️",
        image: "/achievements/midnight-sun.png",
        maxProgress: 1,
        getProgress: (stats) => (stats.foundDiagonal ? 1 : 0),
    },
    {
        // Was a duplicate of Nimble Planter (both "5 completed levels").
        // Retargeted at bonus words -- finding a real word that wasn't on
        // the list is one of the two most distinctive things this game
        // rewards, and previously had no achievement of its own.
        id: "sunlight-harvester",
        name: "Sunlight Harvester",
        description: "Discover 5 bonus words that weren't on the list",
        icon: "☀️",
        image: "/achievements/sunlight-harvester.png",
        maxProgress: 5,
        getProgress: (stats) => Math.min(5, stats.bonusWordsFound),
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
