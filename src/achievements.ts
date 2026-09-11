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
    /**
     * Count of *distinct* plant rarity tiers ever bloomed (Common, Rare,
     * Epic, ...), not a raw bloom-event counter. WSP-2.5 fixed a real bug
     * where this used to increment once per bloom regardless of tier, so
     * three Common-tier blooms satisfied "3 rarity tiers". The source of
     * truth is now a persisted set of tier identifiers (see
     * `bloomedRarityTierIds` in src/persistence.ts and the corrected
     * `recordPlantBloom`/`waterAllReady` in useWordSearchGame.ts); this
     * field is always that set's size.
     */
    bloomedRarityTiers: number;
    uniqueCategoriesCompleted: number;
    powerupsUsed: number;
};

export type AchievementTier = "bronze" | "silver" | "gold" | "exceptional";

export type Achievement = {
    id: string;
    name: string;
    description: string;
    icon: string;
    image?: string;
    maxProgress: number;
    getProgress: (stats: AchievementStats) => number;
    family?: string;
    tier?: AchievementTier;
    actionableCopy?: string;
};

const capped = (value: number, max: number) => Math.min(max, value);

export const ACHIEVEMENTS: Achievement[] = [
    { id: "night-bloomer", name: "First Bloom", description: "Complete your first puzzle level", icon: "🌙", image: "/achievements/night-bloomer.png", maxProgress: 1, getProgress: s => s.levelsCompleted >= 1 ? 1 : 0 },
    { id: "petal-poet", name: "Petal Poet", description: "Discover 8 unique word categories", icon: "🍁", image: "/achievements/petal-poet.png", maxProgress: 8, getProgress: s => capped(s.categoriesSeen, 8) },
    { id: "midnight-sun", name: "Diagonal Detective", description: "Find a word placed diagonally on the board", icon: "↗️", image: "/achievements/midnight-sun.png", maxProgress: 1, getProgress: s => s.foundDiagonal ? 1 : 0 },
    { id: "sunlight-harvester", name: "Sunlight Harvester", description: "Discover 5 bonus words that were not on the list", icon: "☀️", image: "/achievements/sunlight-harvester.png", maxProgress: 5, getProgress: s => capped(s.bonusWordsFound, 5) },
    // "Earn" (not "hold" or "reach") would suggest a lifetime-earnings total,
    // but `seeds` is the player's current spendable balance -- capable of
    // going down (store purchases, plant seeds) as well as up. Wording
    // corrected to describe what the predicate actually checks (WSP-2.5
    // audit) rather than adding a new lifetime-earned-Seeds stat, which
    // would be new scope beyond this issue's data/logic-correctness charter.
    { id: "bloom-herald", name: "Bloom Herald", description: "Reach a balance of 1,000 Seeds", icon: "🌱", image: "/achievements/bloom-herald.png", maxProgress: 1000, getProgress: s => capped(s.seeds, 1000) },
    { id: "nimble-planter", name: "Nimble Planter", description: "Complete 5 levels without using a hint", icon: "🌱", image: "/achievements/nimble-planter.png", maxProgress: 5, getProgress: s => capped(s.levelsCompletedWithoutHint, 5) },
    { id: "word-weaver", name: "Word Weaver", description: "Find 3 bonus words in a single level", icon: "🕸️", image: "/achievements/word-weaver.png", maxProgress: 3, getProgress: s => capped(s.maxBonusWordsInLevel, 3) },
    { id: "root-master", name: "Root Master", description: "Find a word in reverse", icon: "🌳", image: "/achievements/root-master.png", maxProgress: 1, getProgress: s => s.reverseWordsFound > 0 ? 1 : 0 },
    { id: "solar-scribe", name: "Solar Scribe", description: "Bloom the starter plant", icon: "☀️", image: "/achievements/solar-scribe.png", maxProgress: 1, getProgress: s => s.plantsBloomed > 0 ? 1 : 0 },
    // Bug fix (WSP-2.5): bloomedRarityTiers used to be a raw bloom-event
    // counter (three Common blooms satisfied this). It's now a genuine count
    // of distinct rarity tiers bloomed -- see the AchievementStats doc comment
    // and src/persistence.ts's bloomedRarityTierIds.
    { id: "verdant-voyager", name: "Verdant Voyager", description: "Bloom plants from 3 rarity tiers", icon: "🌲", image: "/achievements/world-traveler.png", maxProgress: 3, getProgress: s => capped(s.bloomedRarityTiers, 3) },
    { id: "moss-mystic", name: "Moss Mystic", description: "Use a tactical power-up successfully", icon: "🔮", image: "/achievements/moss-mystic.png", maxProgress: 1, getProgress: s => s.powerupsUsed > 0 ? 1 : 0 },
    // Renamed from "daily-dew" (WSP-2.5): the old id implied daily/calendar
    // logic that never existed -- this has only ever checked
    // uniqueCategoriesCompleted. See persistence.ts's ACHIEVEMENT_ID_MIGRATIONS
    // for the never-revoke migration and rewardIntensity.ts's
    // LEGACY_ACHIEVEMENT_INTENSITY for the matching id update.
    { id: "categories-completed-10", name: "Garden Cartographer", description: "Complete levels in 10 unique categories", icon: "💧", image: "/achievements/daily-dew.png", maxProgress: 10, getProgress: s => capped(s.uniqueCategoriesCompleted, 10) },
    { id: "level-clears-10", name: "Pathfinder", description: "Complete 10 puzzle levels", icon: "🌿", maxProgress: 10, getProgress: s => capped(s.levelsCompleted, 10), family: "level-clears", tier: "bronze", actionableCopy: "Complete 10 levels." },
    { id: "level-clears-25", name: "Grove Walker", description: "Complete 25 puzzle levels", icon: "🌿", maxProgress: 25, getProgress: s => capped(s.levelsCompleted, 25), family: "level-clears", tier: "silver", actionableCopy: "Complete 25 levels." },
    // Folded in from the old standalone "zenith-climber" (WSP-2.5): it tracked
    // the exact same levelsCompleted stat as this family, just at a 50-level
    // threshold sitting unlabeled between level-clears-25 and level-clears-100
    // -- two implementations of "complete N levels" that never should have
    // been separate. This is now that family's gold rung. See
    // persistence.ts's ACHIEVEMENT_ID_MIGRATIONS for the never-revoke migration.
    { id: "level-clears-50", name: "Zenith Climber", description: "Complete 50 puzzle levels", icon: "⛰️", maxProgress: 50, getProgress: s => capped(s.levelsCompleted, 50), family: "level-clears", tier: "gold", actionableCopy: "Complete 50 levels." },
    { id: "level-clears-100", name: "Canopy Legend", description: "Complete 100 puzzle levels", icon: "🌿", maxProgress: 100, getProgress: s => capped(s.levelsCompleted, 100), family: "level-clears", tier: "exceptional", actionableCopy: "Complete 100 levels." },
    { id: "bonus-words-25", name: "Wildword Collector", description: "Discover 25 bonus words", icon: "✨", maxProgress: 25, getProgress: s => capped(s.bonusWordsFound, 25), family: "bonus-words", tier: "silver", actionableCopy: "Find 25 words that are not on the list." },
    { id: "bonus-words-100", name: "Bonus Botanist", description: "Discover 100 bonus words", icon: "✨", maxProgress: 100, getProgress: s => capped(s.bonusWordsFound, 100), family: "bonus-words", tier: "gold", actionableCopy: "Find 100 bonus words." },
    { id: "categories-30", name: "World Rooted", description: "Explore 30 unique word categories", icon: "🗺️", maxProgress: 30, getProgress: s => capped(s.categoriesSeen, 30), family: "categories", tier: "silver", actionableCopy: "Explore 30 categories." },
    { id: "categories-all", name: "Flora Atlas", description: "Explore every available word category", icon: "🗺️", maxProgress: 1, getProgress: s => s.totalCategories > 0 && s.categoriesSeen >= s.totalCategories ? 1 : 0, family: "categories", tier: "exceptional", actionableCopy: "Explore every available category." },
    { id: "hint-free-20", name: "Quiet Gardener", description: "Complete 20 levels without using a hint", icon: "🌱", maxProgress: 20, getProgress: s => capped(s.levelsCompletedWithoutHint, 20), family: "hint-free", tier: "silver", actionableCopy: "Complete 20 levels without hints." },
    { id: "hint-free-50", name: "Instinctive Cultivator", description: "Complete 50 levels without using a hint", icon: "🌱", maxProgress: 50, getProgress: s => capped(s.levelsCompletedWithoutHint, 50), family: "hint-free", tier: "gold", actionableCopy: "Complete 50 levels without hints." },
    { id: "plants-bloomed-5", name: "Garden Tender", description: "Bloom 5 plants", icon: "🌸", maxProgress: 5, getProgress: s => capped(s.plantsBloomed, 5), family: "plants-bloomed", tier: "silver", actionableCopy: "Bloom 5 plants." },
    { id: "plants-bloomed-20", name: "Conservatory Keeper", description: "Bloom 20 plants", icon: "🌸", maxProgress: 20, getProgress: s => capped(s.plantsBloomed, 20), family: "plants-bloomed", tier: "gold", actionableCopy: "Bloom 20 plants." },
    { id: "powerups-used-10", name: "Toolwise", description: "Use 10 tactical power-ups", icon: "🧰", maxProgress: 10, getProgress: s => capped(s.powerupsUsed, 10), family: "powerups-used", tier: "silver", actionableCopy: "Use 10 tactical power-ups." },
    { id: "powerups-used-50", name: "Field Master", description: "Use 50 tactical power-ups", icon: "🧰", maxProgress: 50, getProgress: s => capped(s.powerupsUsed, 50), family: "powerups-used", tier: "gold", actionableCopy: "Use 50 tactical power-ups." },
    { id: "reverse-words-10", name: "Root Reverser", description: "Find 10 words in reverse", icon: "↩️", maxProgress: 10, getProgress: s => capped(s.reverseWordsFound, 10), family: "reverse-words", tier: "silver", actionableCopy: "Find 10 words in reverse." },
    { id: "reverse-words-50", name: "Mirror Grove", description: "Find 50 words in reverse", icon: "↩️", maxProgress: 50, getProgress: s => capped(s.reverseWordsFound, 50), family: "reverse-words", tier: "gold", actionableCopy: "Find 50 words in reverse." },
];

export function evaluateAchievements(stats: AchievementStats): string[] {
    return ACHIEVEMENTS.filter(achievement => achievement.getProgress(stats) >= achievement.maxProgress).map(achievement => achievement.id);
}
