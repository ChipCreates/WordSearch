import { getBotanistRank, getNextBotanistRank, getRankProgress } from "../../botanistRanks";

export type SidebarProfileModel = {
    level: number;
    rankTitle: string;
    progress: number;
    nextRankTitle: string | null;
    levelsToNextRank: number;
    isMaxRank: boolean;
};

export function getSidebarProfileModel(highestUnlockedLevel: number): SidebarProfileModel {
    const rank = getBotanistRank(highestUnlockedLevel);
    const nextRank = getNextBotanistRank(highestUnlockedLevel);
    return {
        level: highestUnlockedLevel,
        rankTitle: rank.title,
        progress: getRankProgress(highestUnlockedLevel),
        nextRankTitle: nextRank?.title ?? null,
        levelsToNextRank: nextRank ? Math.max(0, nextRank.minLevel - highestUnlockedLevel) : 0,
        isMaxRank: !nextRank,
    };
}
