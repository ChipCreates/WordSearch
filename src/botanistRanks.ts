export type BotanistRank = {
    title: string;
    avatarIndex: number;
    minLevel: number;
    maxLevel: number | null;
};

export type BotanistPromotion = {
    from: BotanistRank;
    to: BotanistRank;
    level: number;
};

const RANKS: BotanistRank[] = [
    { title: "Seedling Scout", avatarIndex: 0, minLevel: 1, maxLevel: 3 },
    { title: "Moss Tender", avatarIndex: 1, minLevel: 4, maxLevel: 6 },
    { title: "Fern Forager", avatarIndex: 2, minLevel: 7, maxLevel: 9 },
    { title: "Moonlit Keeper", avatarIndex: 3, minLevel: 10, maxLevel: 12 },
    { title: "Canopy Guide", avatarIndex: 4, minLevel: 13, maxLevel: 16 },
    { title: "Glowgarden Warden", avatarIndex: 5, minLevel: 17, maxLevel: 20 },
    { title: "Crystal Cultivator", avatarIndex: 6, minLevel: 21, maxLevel: 25 },
    { title: "Starlight Sage", avatarIndex: 7, minLevel: 26, maxLevel: 30 },
    { title: "Aurora Steward", avatarIndex: 8, minLevel: 31, maxLevel: 40 },
    { title: "Cosmic Conservator", avatarIndex: 9, minLevel: 41, maxLevel: null },
];

export function getBotanistRank(level: number): BotanistRank {
    const safeLevel = Math.max(1, Math.floor(level));
    return RANKS.find(rank => safeLevel >= rank.minLevel && (rank.maxLevel === null || safeLevel <= rank.maxLevel)) ?? RANKS[0];
}

export function getNextBotanistRank(level: number): BotanistRank | null {
    const current = getBotanistRank(level);
    return RANKS.find(rank => rank.minLevel > current.minLevel) ?? null;
}

export function getRankProgress(level: number): number {
    const rank = getBotanistRank(level);
    if (rank.maxLevel === null) return 1;
    const span = rank.maxLevel - rank.minLevel + 1;
    return Math.min(1, Math.max(0, (Math.max(1, Math.floor(level)) - rank.minLevel + 1) / span));
}

export function getBotanistPromotion(previousLevel: number, nextLevel: number): BotanistPromotion | null {
    const from = getBotanistRank(previousLevel);
    const to = getBotanistRank(nextLevel);
    return from.title === to.title ? null : { from, to, level: Math.max(1, Math.floor(nextLevel)) };
}

export { RANKS as BOTANIST_RANKS };
