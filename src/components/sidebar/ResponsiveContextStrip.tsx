import { useEffect, useState } from "react";
import { getGardenCareModel, formatCareCountdown } from "./gardenModels";
import { getClosestMilestones } from "./achievementModels";
import type { AchievementStats } from "../../achievements";
import type { FieldNoteId, FieldNotesState } from "../../fieldNotes";

type Props = {
    activeTab: "play" | "levels" | "garden" | "achievements" | "settings" | "about";
    highestUnlockedLevel: number;
    playingLevel: number;
    ownedPlants: string[];
    wateredTimestamps: Record<string, number>;
    growthByPlant: Record<string, number>;
    onWaterAllReady: () => void;
    achievementStats: AchievementStats;
    unlockedAchievements: Set<string>;
    fieldNotes: FieldNotesState;
    onCollectFieldNote: (noteId: FieldNoteId) => boolean;
};

export default function ResponsiveContextStrip(props: Props) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);
    const care = getGardenCareModel(props.ownedPlants, props.wateredTimestamps, props.growthByPlant, now);
    const milestones = getClosestMilestones(props.achievementStats, props.unlockedAchievements);

    if (props.activeTab === "settings" || props.activeTab === "about") return null;
    if (props.activeTab === "play") return null;
    return <>
        <section className="ws-responsive-context-strip" aria-label="Context summary">
            {props.activeTab === "levels" && <><strong>Journey · Level {props.playingLevel}</strong><span>Highest unlocked: Level {props.highestUnlockedLevel}</span></>}
            {props.activeTab === "garden" && <><strong>Garden Care</strong><span>{care.readyCount ? `${care.readyCount} ready to water` : `Next watering in ${formatCareCountdown(care.nextReadyAt, now)}`}</span>{care.closestPlant && <span>Closest bloom: {care.closestPlant.name} {care.closestPlant.growth}%</span>}<button disabled={!care.readyCount} onClick={props.onWaterAllReady}>{care.readyCount ? "Water all ready" : "Nothing ready"}</button></>}
            {props.activeTab === "achievements" && <><strong>Closest Milestones</strong>{milestones.slice(0, 2).map(item => <span key={item.achievement.id}>{item.achievement.icon} {item.remaining} to go · {item.achievement.name}</span>)}</>}
        </section>
    </>;
}
