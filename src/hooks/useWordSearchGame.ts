import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPuzzleWords, validateWord, CATEGORY_NAMES, type Tier } from "../backend";
import { BONUS_DISCOVERY_DURATION_MS, HIGHLIGHT_COLORS, type Cell, type FoundLine } from "../constants";
import { ACHIEVEMENTS, evaluateAchievements, type Achievement } from "../achievements";
import { loadSaveDataSync, loadSaveData, writeSaveData, hasLocalSave, isTauri, CURRENT_SCHEMA_VERSION, DEFAULT_SAVE_DATA } from "../persistence";
import { getRandomFillLetter, findWordPlacement, getResponsiveGridSize, REWARDS, MIN_FAVORITE_CATEGORIES, favoriteCategoryForLevel, classifyWordSelection } from "../gameMechanics";
import { consumePowerupCharge as consumeCharge, purchasePowerupCharge as purchaseCharge, type PowerupId, type PowerupInventory } from "../powerups";
import { generatePuzzle, placeWordOnGrid } from "../puzzleGenerator";
import { DEFAULT_ONBOARDING_SEEN, type OnboardingSeen, type OnboardingStepId } from "../onboarding";
import { PLANTS_CATALOG } from "../plantsCatalog";
import { GARDEN_WATERING_COOLDOWN_MS } from "../gameMechanics";
import { getPlantEconomy } from "../economy";
import { getBotanistPromotion, type BotanistPromotion } from "../botanistRanks";
import { applyFieldNoteEvent, claimFieldNote as claimFieldNoteState, type FieldNoteEvent, type FieldNotesState } from "../fieldNotes";
import { isDebugModeRequested } from "../debug/debugMode";
import { DEBUG_CATEGORY, DEBUG_WORDS_BY_SIZE } from "../debug/debugContent";
import {
    advanceAfflictionsOnPuzzleComplete, AFFLICTION_DEFINITIONS, clearAffliction, COMPOST_REFUND_SEEDS,
    isGardenVocabulary, isNeglected, type AfflictionState, type AfflictionType,
} from "../plantAffliction";
import { regionForLevel, regionRewardClaimKey, getRegionById } from "../regions";
import { regionIdForLevel, getRegionPuzzleDifficulty } from "../regionTuning";
import { buildPresentationQueue, type MilestoneQueueEvent, type PresentationEvent } from "../presentationQueue";
import { MILESTONE_LEVELS } from "../milestones";
import { makeBloomEvents, type BloomEvent, type BloomOccurrence } from "../bloomEvents";

export function useWordSearchGame() {
    // Single load of initial unified save data
    const [initialSave] = useState(() => loadSaveDataSync());

    const [highestUnlockedLevel, setHighestUnlockedLevel] = useState(initialSave.highestUnlockedLevel);
    const [playingLevel, setPlayingLevel] = useState(initialSave.highestUnlockedLevel);
    const [seeds, setSeeds] = useState(initialSave.seeds);
    const [difficultyMode, setDifficultyMode] = useState<Tier>(initialSave.difficultyMode);
    const [favoriteCategories, setFavoriteCategories] = useState<string[]>(initialSave.favoriteCategories);
    const [useFavorites, setUseFavorites] = useState(initialSave.useFavorites);
    const [status, setStatus] = useState("Loading...");
    const [levelComplete, setLevelComplete] = useState(false);
    const [category, setCategory] = useState("");

    const [gridSize, setGridSize] = useState(12);
    const [gridData, setGridData] = useState<string[][]>([]);
    const [wordsToFind, setWordsToFind] = useState<string[]>([]);
    const [foundWords, setFoundWords] = useState<Record<string, string>>({});
    const [foundLines, setFoundLines] = useState<FoundLine[]>([]);

    const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(() => new Set(initialSave.unlockedAchievements));
    const [levelsCompleted, setLevelsCompleted] = useState(initialSave.levelsCompleted);
    const [completedLevels, setCompletedLevels] = useState<number[]>(initialSave.completedLevels);
    const [categoriesSeen, setCategoriesSeen] = useState<Set<string>>(() => new Set(initialSave.categoriesSeen));
    const [foundDiagonal, setFoundDiagonal] = useState(initialSave.foundDiagonal);
    const [justUnlocked, setJustUnlocked] = useState<Achievement[]>([]);
    const [promotionQueue, setPromotionQueue] = useState<BotanistPromotion[]>([]);
    // WSP-2.2: region-transition events (entry/completion reward moments),
    // and the future slot WSP-2.4's actual milestone cards will feed into --
    // see presentationQueue.ts's MilestoneQueueEvent. Arbitrated together
    // with justUnlocked/promotionQueue by `presentationQueue` below, which
    // is the one shared ordering policy this issue introduces so no future
    // event source needs its own ad hoc sequencing timer.
    const [milestoneQueue, setMilestoneQueue] = useState<MilestoneQueueEvent[]>([]);
    // WSP-2.2: which region entry/completion rewards this save has already
    // been granted, ever -- see claimedRegionRewards in persistence.ts for
    // why this is the single source of truth for "exactly once".
    const [claimedRegionRewards, setClaimedRegionRewards] = useState<Set<string>>(() => new Set(initialSave.claimedRegionRewards));

    // Unified Botanical Sanctuary State
    const [ownedPlants, setOwnedPlants] = useState<string[]>(initialSave.ownedPlants);
    const [wateredTimestamps, setWateredTimestamps] = useState<Record<string, number>>(initialSave.wateredTimestamps);
    const [growthByPlant, setGrowthByPlant] = useState<Record<string, number>>(initialSave.growthByPlant);
    const [afflictions, setAfflictions] = useState<AfflictionState>(initialSave.afflictions);
    const [remedyCharges, setRemedyCharges] = useState(initialSave.remedyCharges);

    // Lifetime stat feeding the "found a word that wasn't on the list" achievement
    const [bonusWordsFound, setBonusWordsFound] = useState(initialSave.bonusWordsFound);
    const [bonusWordsToFind, setBonusWordsToFind] = useState<string[]>([]);
    const [bonusWordsThisLevel, setBonusWordsThisLevel] = useState<string[]>([]);
    const [bonusSeedsThisLevel, setBonusSeedsThisLevel] = useState(0);
    // Base (target-word) completion reward for the level just finished --
    // tracked separately from `seeds` (the running total) so the completion
    // summary (WSP-1.2) can show base/bonus/total as three distinct numbers
    // instead of just the account balance.
    const [baseSeedsThisLevel, setBaseSeedsThisLevel] = useState(0);
    const [bonusDiscovery, setBonusDiscovery] = useState<{ word: string; seeds: number; earnedRemedy: boolean } | null>(null);
    const [levelsCompletedWithoutHint, setLevelsCompletedWithoutHint] = useState(initialSave.levelsCompletedWithoutHint);
    const [maxBonusWordsInLevel, setMaxBonusWordsInLevel] = useState(initialSave.maxBonusWordsInLevel);
    // Lifetime longest bonus word ever found -- local-only stat, see WSP-1.2.
    const [longestBonusWordFound, setLongestBonusWordFound] = useState(initialSave.longestBonusWordFound);
    const [reverseWordsFound, setReverseWordsFound] = useState(initialSave.reverseWordsFound);
    const [plantsBloomed, setPlantsBloomed] = useState(initialSave.plantsBloomed);
    // The set of distinct plant rarity tiers ("Common", "Rare", ...) actually
    // bloomed, ever -- see persistence.ts's bloomedRarityTierIds and the
    // WSP-2.5 doc comment on AchievementStats.bloomedRarityTiers for why this
    // replaced a raw event counter. Exposed to consumers (App.tsx, the
    // achievement-evaluation effect below) as its `.size`, matching
    // AchievementStats' `bloomedRarityTiers: number` contract.
    const [bloomedRarityTiers, setBloomedRarityTiers] = useState<Set<string>>(() => new Set(initialSave.bloomedRarityTierIds));
    // WSP-2.6: the shared bloom-PRESENTATION queue -- distinct from, and
    // never persisted like, bloomedRarityTiers above. That Set answers "has
    // this rarity tier ever bloomed" for achievements; this array answers
    // "which specific blooms just happened and haven't been shown yet" for
    // BloomCelebration. Every bloom-triggering site (recordPlantBloom below,
    // and waterAllReady's bulk path) appends to it; only index 0 is ever
    // presented, so multiple simultaneous blooms (bulk watering) queue up
    // and present one at a time rather than colliding or being dropped.
    const [bloomEvents, setBloomEvents] = useState<BloomEvent[]>([]);
    const [uniqueCategoriesCompleted, setUniqueCategoriesCompleted] = useState(initialSave.uniqueCategoriesCompleted);
    const [powerupsUsed, setPowerupsUsed] = useState(initialSave.powerupsUsed);
    const [fieldNotes, setFieldNotes] = useState<FieldNotesState>(initialSave.fieldNotes);
    const [hintUsedThisLevel, setHintUsedThisLevel] = useState(false);
    const [onboardingSeen, setOnboardingSeen] = useState<OnboardingSeen>(initialSave.onboardingSeen);
    const fieldNotesRef = useRef(fieldNotes);
    useEffect(() => { fieldNotesRef.current = fieldNotes; }, [fieldNotes]);
    const recordFieldNoteEvent = useCallback((event: FieldNoteEvent) => {
        setFieldNotes(previous => applyFieldNoteEvent(previous, event));
    }, []);
    useEffect(() => {
        if (!bonusDiscovery) return;
        const timer = setTimeout(() => setBonusDiscovery(null), BONUS_DISCOVERY_DURATION_MS);
        return () => clearTimeout(timer);
    }, [bonusDiscovery]);
    // Store-unlocked cosmetics
    const [unlockedThemes, setUnlockedThemes] = useState<string[]>(initialSave.unlockedThemes);
    const [hasGoldenCrest, setHasGoldenCrest] = useState(initialSave.hasGoldenCrest);
    // Nitrogen Booster buff -- ephemeral, scoped to the current puzzle, not persisted
    const [doubleSeedsActive, setDoubleSeedsActive] = useState(false);
    const [spectrometerCells, setSpectrometerCells] = useState<Cell[]>([]);
    const [compassDirection, setCompassDirection] = useState<{ dr: number; dc: number } | null>(null);
    const [powerupInventory, setPowerupInventory] = useState<PowerupInventory>(initialSave.powerupInventory);
    const [freeHintUsesRemaining, setFreeHintUsesRemaining] = useState(1);
    const puzzleInstanceIdRef = useRef(0);
    const rewardedBonusWordsRef = useRef<Set<string>>(new Set());

    // Mirrors state for use inside submitSelection without stale closures.
    const stateRef = useRef({ gridData, wordsToFind, foundWords });
    useEffect(() => {
        stateRef.current = { gridData, wordsToFind, foundWords };
    }, [gridData, wordsToFind, foundWords]);

    // Session-only memory of each favorite category's last puzzle, so custom
    // mode's small pool doesn't immediately repeat the same words the next
    // time that category's turn comes back around. Deliberately not
    // persisted -- this only needs to survive within a play session.
    const recentWordsByCategoryRef = useRef<Map<string, string[]>>(new Map());

    // Native-save recovery: writeSaveData() mirrors every save to the Tauri
    // filesystem, but the initial state above only ever reads localStorage
    // (loadSaveDataSync is, by construction, synchronous and therefore
    // local-only). If localStorage was cleared -- app data wipe, webview
    // cache eviction -- but a native save file still exists on disk, this
    // is the only path that recovers it. Runs once, and only in that
    // recovery scenario, so the common case (localStorage already has a
    // save) never double-loads or flickers.
    useEffect(() => {
        if (hasLocalSave() || !isTauri()) return;
        loadSaveData().then(native => {
            if (!native) return;
            setHighestUnlockedLevel(native.highestUnlockedLevel);
            setPlayingLevel(native.highestUnlockedLevel);
            setSeeds(native.seeds);
            setDifficultyMode(native.difficultyMode);
            setFavoriteCategories(native.favoriteCategories);
            setUseFavorites(native.useFavorites);
            setUnlockedAchievements(new Set(native.unlockedAchievements));
            setLevelsCompleted(native.levelsCompleted);
            setCompletedLevels(native.completedLevels);
            setCategoriesSeen(new Set(native.categoriesSeen));
            setFoundDiagonal(native.foundDiagonal);
            setOwnedPlants(native.ownedPlants);
            setWateredTimestamps(native.wateredTimestamps);
            setGrowthByPlant(native.growthByPlant);
            setBonusWordsFound(native.bonusWordsFound);
            setUnlockedThemes(native.unlockedThemes);
            setHasGoldenCrest(native.hasGoldenCrest);
            setPowerupInventory(native.powerupInventory);
            setLevelsCompletedWithoutHint(native.levelsCompletedWithoutHint);
            setMaxBonusWordsInLevel(native.maxBonusWordsInLevel);
            setLongestBonusWordFound(native.longestBonusWordFound);
            setReverseWordsFound(native.reverseWordsFound);
            setPlantsBloomed(native.plantsBloomed);
            setBloomedRarityTiers(new Set(native.bloomedRarityTierIds));
            setUniqueCategoriesCompleted(native.uniqueCategoriesCompleted);
            setPowerupsUsed(native.powerupsUsed);
            setFieldNotes(native.fieldNotes);
            setOnboardingSeen(native.onboardingSeen);
            setAfflictions(native.afflictions);
            setRemedyCharges(native.remedyCharges);
            setClaimedRegionRewards(new Set(native.claimedRegionRewards));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Unified Save Effect: Sync state changes back to storage. Debounced --
    // a bonus-word streak can touch `seeds` several times a second, and
    // each write is a full serialize + (on Tauri) a synchronous native
    // fs::write over IPC; collapsing rapid-fire changes into one trailing
    // write avoids doing that per word instead of per pause in play.
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            // Debug-panel tampering (fake achievements, granted plants, jumped
            // levels...) must never overwrite the player's real save.
            if (isDebugModeRequested()) return;
            writeSaveData({
                version: CURRENT_SCHEMA_VERSION,
                level: highestUnlockedLevel,
                highestUnlockedLevel,
                completedLevels,
                totalPuzzleCompletions: levelsCompleted,
                seeds,
                difficultyMode,
                favoriteCategories,
                useFavorites,
                levelsCompleted,
                categoriesSeen: Array.from(categoriesSeen),
                foundDiagonal,
                unlockedAchievements: Array.from(unlockedAchievements),
                ownedPlants,
                wateredTimestamps,
                growthByPlant,
                bonusWordsFound,
                unlockedThemes,
                hasGoldenCrest,
                powerupInventory,
                levelsCompletedWithoutHint,
                maxBonusWordsInLevel,
                longestBonusWordFound,
                reverseWordsFound,
                plantsBloomed,
                bloomedRarityTierIds: Array.from(bloomedRarityTiers),
                uniqueCategoriesCompleted,
                powerupsUsed,
                fieldNotes,
                onboardingSeen,
                afflictions,
                remedyCharges,
                claimedRegionRewards: Array.from(claimedRegionRewards),
            });
        }, 400);
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [
        highestUnlockedLevel,
        completedLevels,
        seeds,
        difficultyMode,
        favoriteCategories,
        useFavorites,
        levelsCompleted,
        categoriesSeen,
        foundDiagonal,
        unlockedAchievements,
        ownedPlants,
        wateredTimestamps,
        growthByPlant,
        bonusWordsFound,
        unlockedThemes,
        hasGoldenCrest,
        powerupInventory,
        levelsCompletedWithoutHint,
        maxBonusWordsInLevel,
        longestBonusWordFound,
        reverseWordsFound,
        plantsBloomed,
        bloomedRarityTiers,
        uniqueCategoriesCompleted,
        powerupsUsed,
        fieldNotes,
        onboardingSeen,
        afflictions,
        remedyCharges,
        claimedRegionRewards,
    ]);

    // Re-evaluate achievements on stat updates
    const unlockedRef = useRef(unlockedAchievements);
    useEffect(() => { unlockedRef.current = unlockedAchievements; }, [unlockedAchievements]);
    useEffect(() => {
        const satisfied = evaluateAchievements({
            levelsCompleted,
            seeds,
            categoriesSeen: categoriesSeen.size,
            foundDiagonal,
            totalCategories: CATEGORY_NAMES.length,
            bonusWordsFound,
            levelsCompletedWithoutHint,
            maxBonusWordsInLevel,
            reverseWordsFound,
            plantsBloomed,
            bloomedRarityTiers: bloomedRarityTiers.size,
            uniqueCategoriesCompleted,
            powerupsUsed,
        });
        const newlyUnlockedIds = satisfied.filter(id => !unlockedRef.current.has(id));
        if (newlyUnlockedIds.length > 0) {
            setUnlockedAchievements(prev => new Set([...prev, ...newlyUnlockedIds]));
            setJustUnlocked(prev => [...prev, ...ACHIEVEMENTS.filter(a => newlyUnlockedIds.includes(a.id))]);
        }
    }, [levelsCompleted, seeds, categoriesSeen, foundDiagonal, bonusWordsFound, levelsCompletedWithoutHint, maxBonusWordsInLevel, reverseWordsFound, plantsBloomed, bloomedRarityTiers, uniqueCategoriesCompleted, powerupsUsed]);

    const dismissJustUnlocked = useCallback(() => setJustUnlocked(prev => prev.slice(1)), []);
    const dismissPromotion = useCallback(() => setPromotionQueue(prev => prev.slice(1)), []);
    // Pops whichever bloom is currently shown (index 0) -- same "dismiss the
    // head of the queue" shape as the two callbacks above, so the next
    // queued bloom (if any) becomes current. Called both by
    // BloomCelebration's own auto-dismiss timer and its dismiss button.
    const dismissBloomEvent = useCallback(() => setBloomEvents(prev => prev.slice(1)), []);
    const dismissMilestone = useCallback(() => setMilestoneQueue(prev => prev.slice(1)), []);

    // The one shared arbitration point WSP-2.2 introduces: combines whatever
    // is currently queued across all three independent producers
    // (promotionQueue, milestoneQueue, justUnlocked) into the single
    // canonical presentation order defined in presentationQueue.ts, instead
    // of each producer's queue being consumed with its own separate,
    // uncoordinated timing. The three underlying queues stay in place (and
    // App.tsx/existing tests keep reading them directly) so this is additive
    // -- a correctly-ordered combined view any future consumer (in
    // particular WSP-2.4's milestone/region-transition presentation) can
    // read from without re-deriving the ordering policy itself.
    const presentationQueue = useMemo<PresentationEvent[]>(() => buildPresentationQueue([
        ...promotionQueue.map((promotion): PresentationEvent => ({ kind: "rank-promotion", promotion })),
        ...milestoneQueue,
        ...justUnlocked.map((achievement): PresentationEvent => ({ kind: "achievement", achievement })),
    ]), [promotionQueue, milestoneQueue, justUnlocked]);

    const queueFrontierPromotion = (completedLevel: number) => {
        if (completedLevel !== highestUnlockedLevel) return;
        const promotion = getBotanistPromotion(highestUnlockedLevel, completedLevel + 1);
        if (promotion) {
            setPromotionQueue(prev => prev.some(item => item.level === promotion.level) ? prev : [...prev, promotion]);
        }
    };

    // WSP-2.2: grants a region's entry/completion Seed reward exactly once,
    // ever, per save. Mirrors queueFrontierPromotion's own frontier-only
    // guard immediately below -- `completedLevel !== highestUnlockedLevel`
    // means this is either a replay of an already-completed level, or the
    // Super Root/reveal path re-deriving an already-passed frontier, and
    // either way the region reward (like the rank promotion) must not fire
    // again. Beyond that guard, `claimedRegionRewards` itself is the actual
    // exactly-once source of truth: even a genuine frontier completion is a
    // no-op here if the relevant key is already claimed (covers a save that
    // was migrated with the "no retroactive grants, already marked claimed"
    // backfill in persistence.ts -- see backfillRegionRewardClaims there).
    const queueRegionRewards = (completedLevel: number) => {
        if (completedLevel !== highestUnlockedLevel) return;
        const region = regionForLevel(completedLevel);
        if (completedLevel !== region.end) return; // not a region boundary -- nothing to do
        const events: MilestoneQueueEvent[] = [];

        const completionKey = regionRewardClaimKey(region.id, "completion");
        if (!claimedRegionRewards.has(completionKey)) {
            setClaimedRegionRewards(prev => new Set(prev).add(completionKey));
            setSeeds(s => s + region.completionReward.seeds);
            events.push({ kind: "region-transition", regionId: region.id, transition: "completion", rewardSeeds: region.completionReward.seeds, level: completedLevel });
        }

        // Regions are contiguous with no gaps, so completing a region's
        // final level is exactly the moment the frontier crosses into the
        // next one -- no separate "did the frontier just enter a new
        // region" check is needed beyond the region.end check above.
        const nextRegion = regionForLevel(completedLevel + 1);
        if (nextRegion.id !== region.id && nextRegion.entryReward) {
            const entryKey = regionRewardClaimKey(nextRegion.id, "entry");
            if (!claimedRegionRewards.has(entryKey)) {
                setClaimedRegionRewards(prev => new Set(prev).add(entryKey));
                setSeeds(s => s + nextRegion.entryReward!.seeds);
                events.push({ kind: "region-transition", regionId: nextRegion.id, transition: "entry", rewardSeeds: nextRegion.entryReward!.seeds, level: completedLevel });
            }
        }

        if (events.length) setMilestoneQueue(prev => [...prev, ...events]);
    };

    // WSP-2.4: queues the standalone milestone card at levels 10/20/30/40/50/
    // 70/100. Mirrors queueFrontierPromotion/queueRegionRewards' own
    // frontier-only guard exactly -- `completedLevel !== highestUnlockedLevel`
    // means this is a replay (or a re-derivation of an already-passed
    // frontier), and a milestone, like a rank promotion or a region reward,
    // must never fire again once its level has actually been cleared once.
    // Milestone state is intentionally not persisted (like promotionQueue) --
    // the frontier-only guard is what makes "exactly once" true here, the
    // same way it already does for rank promotions.
    //
    // Pushed into the same milestoneQueue region-transition events use, per
    // presentationQueue.ts's KIND_ORDER: the two kinds are grouped at the
    // same presentation step and never combined, only strictly sequenced,
    // with ties broken by which was queued first. Called before
    // queueRegionRewards below so that on a level that is both a milestone
    // and a region boundary (20/30/40/50/70/100), the milestone card --
    // "you reached level N" -- reads as the headline moment and the
    // region-transition card(s) follow it, rather than the reverse.
    const queueMilestone = (completedLevel: number) => {
        if (completedLevel !== highestUnlockedLevel) return;
        if (!MILESTONE_LEVELS.includes(completedLevel)) return;
        setMilestoneQueue(prev =>
            prev.some(event => event.kind === "milestone" && event.level === completedLevel)
                ? prev
                : [...prev, { kind: "milestone", level: completedLevel }],
        );
    };

    // Runs once per puzzle completion (never on elapsed real time): escalates
    // any already-sick plant and rolls fresh onset for owned, growing,
    // unafflicted plants that have gone unwatered for a while. Shared by both
    // completion paths (a found word finishing the level, and the Super Root
    // instant-solve path) exactly like queueFrontierPromotion above.
    const advancePuzzleCompletionAfflictions = () => {
        const now = Date.now();
        const eligibleForOnset = ownedPlants.filter(plantId => {
            if ((growthByPlant[plantId] ?? 0) >= 100) return false;
            if (afflictions[plantId]) return false;
            return isNeglected(wateredTimestamps[plantId] ?? 0, now, GARDEN_WATERING_COOLDOWN_MS);
        });
        const next = advanceAfflictionsOnPuzzleComplete(afflictions, eligibleForOnset);
        const newlyAfflictedId = Object.keys(next).find(id => !afflictions[id]);
        setAfflictions(next);
        if (newlyAfflictedId) {
            const plantDef = PLANTS_CATALOG.find(p => p.id === newlyAfflictedId);
            const afflictionName = AFFLICTION_DEFINITIONS[next[newlyAfflictedId].type].name;
            setStatus(`🐛 ${afflictionName} has appeared on your ${plantDef?.name ?? "plant"}!`);
        }
    };

    const initGame = async () => {
        puzzleInstanceIdRef.current += 1;
        rewardedBonusWordsRef.current = new Set();
        setStatus("Generating puzzle...");
        setLevelComplete(false);
        setDoubleSeedsActive(false);
        setSpectrometerCells([]);
        setCompassDirection(null);
        setFreeHintUsesRemaining(1);
        setBonusWordsThisLevel([]);
        setBonusWordsToFind([]);
        setBonusSeedsThisLevel(0);
        setBaseSeedsThisLevel(0);
        setBonusDiscovery(null);
        setHintUsedThisLevel(false);
        const size = getResponsiveGridSize(playingLevel, difficultyMode === "challenging" ? "hard" : difficultyMode === "easy" ? "easy" : "normal");
        const count = Math.max(3, size - 1);
        const maxWordLength = size <= 4 ? size : size - 1;

        const usingFavorites = useFavorites && favoriteCategories.length >= MIN_FAVORITE_CATEGORIES;
        const categoryName = usingFavorites ? favoriteCategoryForLevel(favoriteCategories, playingLevel) : undefined;
        const excludeWords = categoryName ? recentWordsByCategoryRef.current.get(categoryName) : undefined;

        // WSP-2.4 Part A1: this is the one call site that actually runs every
        // real puzzle load -- WSP-2.3 added regionId/difficultyOverride
        // support to getPuzzleWords/generatePuzzle specifically for this, but
        // nothing ever passed them until now, so every real puzzle ignored
        // region tuning and category bias entirely. categoryName (favorites
        // mode) still wins unconditionally over regionId inside
        // getPuzzleWords -- passing regionId here is always safe, it's a
        // no-op whenever categoryName is set.
        const regionId = regionIdForLevel(playingLevel);
        const difficultyOverride = getRegionPuzzleDifficulty(playingLevel, difficultyMode, regionId, size);

        const puzzle = await getPuzzleWords({
            count: count + Math.min(count, 8),
            maxLength: maxWordLength,
            level: playingLevel,
            tier: difficultyMode,
            categoryName,
            excludeWords,
            regionId,
        });
        setCategory(puzzle.category);
        setCategoriesSeen(prev => prev.has(puzzle.category) ? prev : new Set(prev).add(puzzle.category));
        const words = puzzle.words;
        const mainWords = words.slice(0, count);
        const bonusWords = words.slice(count);
        if (categoryName) {
            recentWordsByCategoryRef.current.set(categoryName, mainWords);
        }

        const generated = generatePuzzle({
            targetWords: mainWords,
            bonusWords,
            category: puzzle.category,
            level: playingLevel,
            mode: difficultyMode,
            gridSize: size,
            difficultyOverride,
        });

        setWordsToFind(generated.targetWords);
        setBonusWordsToFind(generated.bonusWords);
        setFoundWords({});
        setFoundLines([]);
        setGridSize(generated.gridSize);
        setGridData(generated.grid);
        setStatus("Puzzle generated. Find the words!");
    };

    useEffect(() => { initGame(); }, [playingLevel, difficultyMode, useFavorites, favoriteCategories]);

    const submitSelection = async (startCell: Cell, endCell: Cell) => {
        const { gridData, wordsToFind, foundWords } = stateRef.current;
        const dr = endCell.r - startCell.r;
        const dc = endCell.c - startCell.c;
        const steps = Math.max(Math.abs(dr), Math.abs(dc));
        if (steps < 2) return;

        const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
        const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

        let currentWord = "";
        for (let i = 0; i <= steps; i++) {
            const r = startCell.r + i * stepR;
            const c = startCell.c + i * stepC;
            if (gridData[r] && gridData[r][c]) {
                currentWord += gridData[r][c];
            }
        }

        const reversedWord = currentWord.split('').reverse().join('');

        // Each direction is judged independently -- a target's own spelling
        // is never eligible as a bonus (checked per-direction, not "either
        // direction is a target disqualifies both"), so a genuinely
        // different real word sharing the same cells as a target in the
        // opposite direction (LOOP / POOL) still gets its own bonus chance.
        const validBonusCandidates = new Set<string>();
        if (!wordsToFind.includes(currentWord) && await validateWord(currentWord)) {
            validBonusCandidates.add(currentWord);
        }
        if (reversedWord !== currentWord && !wordsToFind.includes(reversedWord) && await validateWord(reversedWord)) {
            validBonusCandidates.add(reversedWord);
        }
        const selection = classifyWordSelection(currentWord, reversedWord, wordsToFind, foundWords, validBonusCandidates);
        if (selection.kind === "already-found" || (selection.kind === "bonus-found" && rewardedBonusWordsRef.current.has(selection.word))) {
            setStatus(`${selection.word} is already found.`);
            return;
        }
        if (selection.kind === "invalid") {
            setStatus("That selection is not a target or bonus word.");
            return;
        }

        const matchedWord = selection.word;
        if (selection.kind === "target-found" || selection.kind === "bonus-found") {
            const randomColor = HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)];
            const newLine: FoundLine = { startR: startCell.r, startC: startCell.c, endR: endCell.r, endC: endCell.c, color: randomColor };
            const nextFoundWords = { ...foundWords, [matchedWord]: randomColor };

            setFoundLines(prev => [...prev, newLine]);
            setFoundWords(nextFoundWords);
            if (dr !== 0 && dc !== 0) {
                setFoundDiagonal(true);
                recordFieldNoteEvent({ kind: "word_found_diagonal" });
            }
            if (currentWord !== matchedWord) {
                setReverseWordsFound(count => count + 1);
                recordFieldNoteEvent({ kind: "word_found_reverse" });
            }

            const rewardMultiplier = doubleSeedsActive ? 2 : 1;
            if (selection.kind === "bonus-found") {
                rewardedBonusWordsRef.current.add(matchedWord);
                const bonusSeeds = REWARDS.BONUS_WORD_SEEDS * rewardMultiplier;
                setSeeds((s: number) => s + bonusSeeds);
                setBonusWordsFound((n: number) => n + 1);
                setBonusWordsThisLevel(prev => [...prev, matchedWord]);
                setBonusSeedsThisLevel(total => total + bonusSeeds);
                recordFieldNoteEvent({ kind: "bonus_word_found" });
                setMaxBonusWordsInLevel(max => Math.max(max, bonusWordsThisLevel.length + 1));
                setLongestBonusWordFound(longest => matchedWord.length > longest.length ? matchedWord : longest);
                // Any gardening-related word earns a Garden Remedy charge, in
                // ANY category's puzzle -- not just a Gardening-category one.
                // Bonus words are already validated against the full
                // dictionary regardless of category, so this is the one hook
                // that can fire on every puzzle instead of the ~1-in-62
                // chance of the category cycle landing on Gardening.
                const earnedRemedy = isGardenVocabulary(matchedWord);
                if (earnedRemedy) setRemedyCharges(n => n + 1);
                // Carried on bonusDiscovery (not just the status string) so
                // the on-board toast can actually tell the player -- the
                // status string alone only ever reached screen readers via
                // GameCanvas's aria-live region, never a visible cue.
                setBonusDiscovery({ word: matchedWord, seeds: bonusSeeds, earnedRemedy });
                setStatus(`Bonus sprout! ${matchedWord} +${bonusSeeds} Seeds${earnedRemedy ? " · 🌿 +1 Garden Remedy" : ""}`);
            } else {
                const foundMainCount = wordsToFind.filter(w => nextFoundWords[w]).length;
                if (foundMainCount === wordsToFind.length) {
                    setStatus("Triumph! Level complete.");
                    setLevelComplete(true);
                    setLevelsCompleted((n: number) => n + 1);
                    setCompletedLevels(prev => prev.includes(playingLevel) ? prev : [...prev, playingLevel]);
                    queueFrontierPromotion(playingLevel);
                    queueMilestone(playingLevel);
                    queueRegionRewards(playingLevel);
                    setHighestUnlockedLevel(frontier => Math.max(frontier, playingLevel + 1));
                    recordFieldNoteEvent({ kind: "puzzle_completed", isFrontier: playingLevel === highestUnlockedLevel, hintUsed: hintUsedThisLevel, category });
                    if (!hintUsedThisLevel) setLevelsCompletedWithoutHint(count => count + 1);
                    setUniqueCategoriesCompleted(count => Math.max(count, categoriesSeen.size + (categoriesSeen.has(category) ? 0 : 1)));
                    setMaxBonusWordsInLevel(max => Math.max(max, bonusWordsThisLevel.length));
                    advancePuzzleCompletionAfflictions();
                    const completionReward = completedLevels.includes(playingLevel)
                        ? REWARDS.REPLAY_COMPLETE_SEEDS
                        : REWARDS.LEVEL_COMPLETE_SEEDS;
                    setBaseSeedsThisLevel(completionReward * rewardMultiplier);
                    setSeeds((s: number) => s + completionReward * rewardMultiplier);
                }
            }
        }
    };

    // Solves `word` outright -- the paid "Super Root Hint" tier, as opposed
    // to the free/cheap hint which only points at a cell. Mirrors the
    // found-word bookkeeping in submitSelection for a non-bonus match, but
    // doesn't award BONUS_WORD_SEEDS (it's a main word, not a bonus find)
    // and doesn't count toward bonusWordsFound.
    const revealAndSolveWord = (word: string): boolean => {
        const { gridData, wordsToFind, foundWords } = stateRef.current;
        if (!word || foundWords[word] || !gridData.length || levelComplete) return false;
        const placement = findWordPlacement(gridData, gridData.length, word);
        if (!placement) return false;
        const { r, c, dr, dc } = placement;
        const endR = r + (word.length - 1) * dr;
        const endC = c + (word.length - 1) * dc;
        const randomColor = HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)];
        const newLine: FoundLine = { startR: r, startC: c, endR, endC, color: randomColor };
        const nextFoundWords = { ...foundWords, [word]: randomColor };

        // Keep imperative debug/tool calls made in the same event in sync.
        // React has not committed the state update yet, but the next call
        // should still see this word as solved.
        stateRef.current = { ...stateRef.current, foundWords: nextFoundWords };
        setFoundLines(prev => [...prev, newLine]);
        setFoundWords(nextFoundWords);
        if (dr !== 0 && dc !== 0) {
            setFoundDiagonal(true);
            recordFieldNoteEvent({ kind: "word_found_diagonal" });
        }

        const foundMainCount = wordsToFind.filter(w => nextFoundWords[w]).length;
        if (foundMainCount === wordsToFind.length) {
            setStatus("Triumph! Level complete.");
            setLevelComplete(true);
            setLevelsCompleted((n: number) => n + 1);
            setCompletedLevels(prev => prev.includes(playingLevel) ? prev : [...prev, playingLevel]);
            queueFrontierPromotion(playingLevel);
            queueMilestone(playingLevel);
            queueRegionRewards(playingLevel);
            setHighestUnlockedLevel(frontier => Math.max(frontier, playingLevel + 1));
            recordFieldNoteEvent({ kind: "puzzle_completed", isFrontier: playingLevel === highestUnlockedLevel, hintUsed: true, category });
            advancePuzzleCompletionAfflictions();
            const completionReward = completedLevels.includes(playingLevel)
                ? REWARDS.REPLAY_COMPLETE_SEEDS
                : REWARDS.LEVEL_COMPLETE_SEEDS;
            setBaseSeedsThisLevel(completionReward * (doubleSeedsActive ? 2 : 1));
            setSeeds((s: number) => s + completionReward * (doubleSeedsActive ? 2 : 1));
        }
        return true;
    };

    const goToLevel = (lvl: number) => {
        const selectedLevel = Math.max(1, Math.floor(lvl));
        if (selectedLevel <= highestUnlockedLevel) setPlayingLevel(selectedLevel);
    };
    const reshuffle = () => {
        if (!wordsToFind.length || levelComplete) {
            setStatus("There are no unfound words to reshuffle.");
            return false;
        }
        const consumed = consumeCharge(powerupInventory, "lumina-cyclone");
        if (!consumed.consumed) {
            setStatus("Buy a Shuffle charge in the Seed Store first.");
            return false;
        }
        const size = gridSize;
        const unfoundWords = wordsToFind.filter(w => !foundWords[w]);
        const unfoundBonusWords = bonusWordsToFind.filter(word => !rewardedBonusWordsRef.current.has(word));
        const wordsToPlace = [...unfoundWords, ...unfoundBonusWords]
            .sort((a, b) => b.length - a.length);
        let shuffledGrid: string[][] | null = null;

        // Longest-first placement avoids short words consuming the few paths
        // available to longer words. Keep a generous retry budget because a
        // reshuffle is a paid action and should not fail due to unlucky random
        // candidate selection on a board that has already proved solvable.
        for (let attempt = 0; attempt < 100 && !shuffledGrid; attempt++) {
            const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));

            // Preserve completed target cells so their highlight pills remain
            // accurate while every still-hidden target and offered bonus moves.
            foundLines.forEach(line => {
                const dr = Math.sign(line.endR - line.startR);
                const dc = Math.sign(line.endC - line.startC);
                const steps = Math.max(Math.abs(line.endR - line.startR), Math.abs(line.endC - line.startC));
                for (let i = 0; i <= steps; i++) {
                    const r = line.startR + i * dr;
                    const c = line.startC + i * dc;
                    if (gridData[r]?.[c]) grid[r][c] = gridData[r][c];
                }
            });

            if (!wordsToPlace.every(word => placeWordOnGrid(grid, word))) continue;

            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (grid[r][c] === '') grid[r][c] = getRandomFillLetter(unfoundWords.length ? unfoundWords : wordsToFind);
                }
            }
            shuffledGrid = grid;
        }

        if (!shuffledGrid) {
            setStatus("This board is too tightly packed to reshuffle safely.");
            return false;
        }

        setPowerupInventory(consumed.inventory);
        setPowerupsUsed(count => count + 1);
        recordFieldNoteEvent({ kind: "powerup_used" });
        setGridData(shuffledGrid);
        setSpectrometerCells([]);
        setCompassDirection(null);
        setStatus("Board reshuffled!");
        return true;
    };
    const retryLevel = () => {
        setFoundWords({});
        setFoundLines([]);
        setLevelComplete(false);
        // Keep already-paid bonus words associated with this puzzle instance;
        // retrying the same board must not create another reward opportunity.
        setBonusWordsThisLevel(prev => prev.filter(word => rewardedBonusWordsRef.current.has(word)));
        setBonusSeedsThisLevel(0);
        setBaseSeedsThisLevel(0);
        setHintUsedThisLevel(false);
        setBonusDiscovery(null);
    };

    const nextLevel = () => setPlayingLevel(highestUnlockedLevel);
    // Full reset -- every persisted field back to its default, not just
    // level/seeds. A partial reset here previously left achievements,
    // categoriesSeen, and the whole garden untouched, landing the player in
    // an inconsistent state (level 1, but a trophy case for level 50).
    const restart = () => {
        setHighestUnlockedLevel(DEFAULT_SAVE_DATA.highestUnlockedLevel);
        setPlayingLevel(DEFAULT_SAVE_DATA.highestUnlockedLevel);
        setSeeds(DEFAULT_SAVE_DATA.seeds);
        setLevelsCompleted(DEFAULT_SAVE_DATA.levelsCompleted);
        setCompletedLevels(DEFAULT_SAVE_DATA.completedLevels);
        setUnlockedAchievements(new Set(DEFAULT_SAVE_DATA.unlockedAchievements));
        setCategoriesSeen(new Set(DEFAULT_SAVE_DATA.categoriesSeen));
        setFoundDiagonal(DEFAULT_SAVE_DATA.foundDiagonal);
        setJustUnlocked([]);
        setPromotionQueue([]);
        setMilestoneQueue([]);
        setBloomEvents([]);
        setClaimedRegionRewards(new Set(DEFAULT_SAVE_DATA.claimedRegionRewards));
        setFieldNotes(DEFAULT_SAVE_DATA.fieldNotes);
        setOwnedPlants(DEFAULT_SAVE_DATA.ownedPlants);
        setWateredTimestamps(DEFAULT_SAVE_DATA.wateredTimestamps);
        setGrowthByPlant(DEFAULT_SAVE_DATA.growthByPlant);
        setBonusWordsFound(DEFAULT_SAVE_DATA.bonusWordsFound);
        setUnlockedThemes(DEFAULT_SAVE_DATA.unlockedThemes);
        setHasGoldenCrest(DEFAULT_SAVE_DATA.hasGoldenCrest);
        setDoubleSeedsActive(false);
        setSpectrometerCells([]);
        setCompassDirection(null);
        setPowerupInventory(DEFAULT_SAVE_DATA.powerupInventory);
        setFreeHintUsesRemaining(1);
        setLevelsCompletedWithoutHint(DEFAULT_SAVE_DATA.levelsCompletedWithoutHint);
        setMaxBonusWordsInLevel(DEFAULT_SAVE_DATA.maxBonusWordsInLevel);
        setReverseWordsFound(DEFAULT_SAVE_DATA.reverseWordsFound);
        setPlantsBloomed(DEFAULT_SAVE_DATA.plantsBloomed);
        setBloomedRarityTiers(new Set(DEFAULT_SAVE_DATA.bloomedRarityTierIds));
        setUniqueCategoriesCompleted(DEFAULT_SAVE_DATA.uniqueCategoriesCompleted);
        setPowerupsUsed(DEFAULT_SAVE_DATA.powerupsUsed);
        setHintUsedThisLevel(false);
        setOnboardingSeen(DEFAULT_ONBOARDING_SEEN);
        setAfflictions(DEFAULT_SAVE_DATA.afflictions);
        setRemedyCharges(DEFAULT_SAVE_DATA.remedyCharges);
    };

    const spendSeeds = useCallback((cost: number): boolean => {
        if (seeds >= cost) {
            setSeeds((s: number) => Math.max(0, s - cost));
            return true;
        }
        return false;
    }, [seeds]);

    const addSeeds = useCallback((amount: number) => {
        setSeeds((s: number) => s + amount);
    }, []);

    const dismissOnboardingStep = useCallback((id: OnboardingStepId) => {
        setOnboardingSeen(previous => ({ ...previous, dismissed: { ...previous.dismissed, [id]: true } }));
    }, []);

    const replayOnboarding = useCallback(() => {
        setOnboardingSeen(DEFAULT_ONBOARDING_SEEN);
    }, []);

    const purchasePowerupCharge = useCallback((id: PowerupId): boolean => {
        const result = purchaseCharge(seeds, powerupInventory, id);
        if (!result.purchased) return false;
        setSeeds(result.seeds);
        setPowerupInventory(result.inventory);
        return true;
    }, [powerupInventory, seeds]);

    const consumePowerupCharge = useCallback((id: PowerupId): boolean => {
        const result = consumeCharge(powerupInventory, id);
        if (!result.consumed) return false;
        setPowerupInventory(result.inventory);
        return true;
    }, [powerupInventory]);

    const claimFieldNote = useCallback((noteId: Parameters<typeof claimFieldNoteState>[1]): boolean => {
        const result = claimFieldNoteState(fieldNotesRef.current, noteId);
        if (!result) return false;
        fieldNotesRef.current = result.state;
        setFieldNotes(result.state);
        setSeeds(previous => previous + result.reward);
        setStatus(`Field Note collected: +${result.reward} Seeds.`);
        return true;
    }, []);

    const claimHintUse = useCallback((): "free" | "paid" | null => {
        if (freeHintUsesRemaining > 0) {
            setHintUsedThisLevel(true);
            setPowerupsUsed(count => count + 1);
            recordFieldNoteEvent({ kind: "powerup_used" });
            setFreeHintUsesRemaining(previous => previous - 1);
            return "free";
        }
        const result = consumeCharge(powerupInventory, "single-letter-sprout");
        if (!result.consumed) return null;
        setPowerupInventory(result.inventory);
        setHintUsedThisLevel(true);
        setPowerupsUsed(count => count + 1);
        recordFieldNoteEvent({ kind: "powerup_used" });
        return "paid";
    }, [freeHintUsesRemaining, powerupInventory]);

    // Botanical Sanctuary Handlers
    const buyPlantSeed = useCallback((plantId: string, cost: number): boolean => {
        if (ownedPlants.includes(plantId)) return false;
        if (seeds >= cost) {
            setSeeds((s: number) => Math.max(0, s - cost));
            setOwnedPlants(prev => [...prev, plantId]);
            return true;
        }
        return false;
    }, [ownedPlants, seeds]);

    const updateWateredTimestamp = useCallback((plantId: string, timestamp: number) => {
        setWateredTimestamps(prev => ({ ...prev, [plantId]: timestamp }));
    }, []);

    const updatePlantGrowth = useCallback((plantId: string, newGrowth: number) => {
        setGrowthByPlant(prev => ({ ...prev, [plantId]: newGrowth }));
    }, []);

    // Cures are never Seed-purchasable -- the only way to earn a charge is
    // finding a gardening-related bonus word during play (see submitSelection).
    // Treating and composting are both deliberate player actions; neither
    // ever happens automatically.
    const treatPlant = useCallback((plantId: string): boolean => {
        if (remedyCharges <= 0 || !afflictions[plantId]) return false;
        setRemedyCharges(n => Math.max(0, n - 1));
        setAfflictions(prev => clearAffliction(prev, plantId));
        setStatus("Treated! The plant is recovering. 🌿");
        return true;
    }, [remedyCharges, afflictions]);

    const compostAfflictedPlant = useCallback((plantId: string): boolean => {
        const affliction = afflictions[plantId];
        if (!affliction || affliction.severity < 3) return false;
        setAfflictions(prev => clearAffliction(prev, plantId));
        setGrowthByPlant(prev => ({ ...prev, [plantId]: 0 }));
        setSeeds(prev => prev + COMPOST_REFUND_SEEDS);
        setStatus(`Composted. Starting fresh — +${COMPOST_REFUND_SEEDS} Seeds.`);
        return true;
    }, [afflictions]);

    // The single implementation of "one or more plants just bloomed, and
    // here are their rarity tiers" -- every bloom-triggering path
    // (individual water/fertilize via recordPlantBloom below, and bulk
    // waterAllReady) goes through this, so there is exactly one place that
    // increments the lifetime bloom count and tracks which distinct tiers
    // have actually been bloomed (WSP-2.5: this used to be two separate,
    // independently-broken raw-counter implementations -- one inline in
    // each of recordPlantBloom and waterAllReady -- neither of which knew
    // which tier had bloomed at all).
    const registerBlooms = useCallback((tiers: string[]) => {
        if (tiers.length === 0) return;
        setPlantsBloomed(count => count + tiers.length);
        setBloomedRarityTiers(previous => {
            let changed = false;
            const next = new Set(previous);
            for (const tier of tiers) {
                if (!next.has(tier)) {
                    next.add(tier);
                    changed = true;
                }
            }
            return changed ? next : previous;
        });
    }, []);

    // WSP-2.6: recordPlantBloom's public signature changed from a bare
    // `(tier: string)` to a full BloomOccurrence -- GardenView's two
    // individual bloom sites (handleWaterPlant, handleFertilizePlant)
    // already compute plantId/plantName/bounty locally for their own toast
    // text, so handing the whole occurrence over costs those call sites
    // nothing and is what lets BloomCelebration present a specific plant
    // instead of just "a Common plant bloomed somewhere." The WSP-2.5
    // rarity-tracking call into registerBlooms below is unchanged -- still
    // just the tier, still the same corrected Set-based logic.
    const recordPlantBloom = useCallback((bloom: BloomOccurrence) => {
        registerBlooms([bloom.tier]);
        setBloomEvents(prev => [...prev, ...makeBloomEvents([bloom])]);
        recordFieldNoteEvent({ kind: "plant_bloomed" });
    }, [registerBlooms, recordFieldNoteEvent]);

    const waterAllReady = useCallback((now = Date.now()) => {
        const readyPlants = PLANTS_CATALOG.filter(plant => {
            if (!ownedPlants.includes(plant.id) || (growthByPlant[plant.id] ?? 0) >= 100) return false;
            return now - (wateredTimestamps[plant.id] ?? 0) >= GARDEN_WATERING_COOLDOWN_MS;
        });
        if (!readyPlants.length) {
            setStatus("No plants are ready for watering yet.");
            return { watered: 0, bloomed: 0, seeds: 0 };
        }
        recordFieldNoteEvent({ kind: "plant_watered" });
        const nextTimestamps: Record<string, number> = {};
        const nextGrowth: Record<string, number> = {};
        let bloomCount = 0;
        let bounty = 0;
        // WSP-2.6: full occurrences (not just bare tiers) so this, the third
        // and last bloom-triggering path, feeds BloomCelebration the same
        // shape the two individual sites do. Multiple plants can bloom in
        // one bulk-water action -- see registerBlooms/setBloomEvents below
        // for how that's handled (one distinct-tier accounting update, one
        // sequential presentation queue append, in bloom order).
        const bloomedOccurrences: BloomOccurrence[] = [];
        readyPlants.forEach(plant => {
            const currentGrowth = growthByPlant[plant.id] ?? 0;
            const next = Math.min(100, currentGrowth + 25);
            nextTimestamps[plant.id] = now;
            nextGrowth[plant.id] = next;
            if (next === 100 && currentGrowth < 100) {
                bloomCount += 1;
                const plantBounty = getPlantEconomy(plant).bloomBounty;
                bounty += plantBounty;
                bloomedOccurrences.push({ plantId: plant.id, plantName: plant.name, tier: plant.tier, bounty: plantBounty });
            }
        });
        setWateredTimestamps(previous => ({ ...previous, ...nextTimestamps }));
        setGrowthByPlant(previous => ({ ...previous, ...nextGrowth }));
        if (bloomCount) {
            setSeeds(previous => previous + bounty);
            registerBlooms(bloomedOccurrences.map(occurrence => occurrence.tier));
            setBloomEvents(prev => [...prev, ...makeBloomEvents(bloomedOccurrences)]);
            recordFieldNoteEvent({ kind: "plant_bloomed" });
        }
        setStatus(`Watered ${readyPlants.length} plant${readyPlants.length === 1 ? "" : "s"}${bloomCount ? ` and bloomed ${bloomCount}` : ""}.`);
        return { watered: readyPlants.length, bloomed: bloomCount, seeds: bounty };
    }, [ownedPlants, growthByPlant, wateredTimestamps, recordFieldNoteEvent, registerBlooms]);

    // Store power-ups: Nitrogen Booster, theme unlocks, the profile crest.
    // Seed cost is deducted by the caller (SeedStoreDialog's handleRedeem)
    // before these run, matching how the hint/reshuffle redeems already work.
    const activateDoubleSeeds = useCallback(() => {
        if (doubleSeedsActive || levelComplete || !wordsToFind.length) {
            setStatus(doubleSeedsActive ? "2× Seeds is already active for this puzzle." : "Start a puzzle before activating Nitrogen Booster.");
            return false;
        }
        const result = consumeCharge(powerupInventory, "nitrogen-booster");
        if (!result.consumed) return false;
        setPowerupInventory(result.inventory);
        setDoubleSeedsActive(true);
        setPowerupsUsed(count => count + 1);
        recordFieldNoteEvent({ kind: "powerup_used" });
        setStatus("Nitrogen Booster active: 2× Seeds for this puzzle.");
        return true;
    }, [doubleSeedsActive, levelComplete, wordsToFind.length, powerupInventory]);

    const activateSuperRoot = useCallback(() => {
        const target = wordsToFind.find(word => !foundWords[word]);
        if (!target || levelComplete) {
            setStatus("No unfound target is available for Super Root.");
            return false;
        }
        const result = consumeCharge(powerupInventory, "super-root");
        if (!result.consumed) {
            setStatus("Buy a Super Root charge in the Seed Store first.");
            return false;
        }
        setPowerupInventory(result.inventory);
        setPowerupsUsed(count => count + 1);
        setHintUsedThisLevel(true);
        const solved = revealAndSolveWord(target);
        if (!solved) {
            setPowerupInventory(powerupInventory);
            setPowerupsUsed(count => Math.max(0, count - 1));
            setStatus("Super Root could not find a valid target.");
            return false;
        }
        recordFieldNoteEvent({ kind: "powerup_used" });
        setStatus(`Super Root solved ${target}.`);
        return true;
    }, [wordsToFind, foundWords, levelComplete, powerupInventory, revealAndSolveWord]);

    const activateCompass = useCallback(() => {
        const target = wordsToFind.find(word => !foundWords[word]);
        const placement = target ? findWordPlacement(gridData, gridSize, target) : null;
        if (!placement || levelComplete) {
            setStatus("No unfound target is available for the Compass.");
            return false;
        }
        const result = consumeCharge(powerupInventory, "bioluminescent-compass");
        if (!result.consumed) {
            setStatus("Buy a Compass charge in the Seed Store first.");
            return false;
        }
        setPowerupInventory(result.inventory);
        setPowerupsUsed(count => count + 1);
        recordFieldNoteEvent({ kind: "powerup_used" });
        setCompassDirection({ dr: placement.dr, dc: placement.dc });
        setStatus("Compass active for 4 seconds.");
        window.setTimeout(() => setCompassDirection(null), 4000);
        return true;
    }, [wordsToFind, foundWords, gridData, gridSize, levelComplete, powerupInventory]);

    const activateSpectrometer = useCallback(() => {
        const cells = wordsToFind
            .filter(word => !foundWords[word])
            .map(word => findWordPlacement(gridData, gridSize, word))
            .filter((placement): placement is NonNullable<ReturnType<typeof findWordPlacement>> => Boolean(placement))
            .map(placement => ({ r: placement.r, c: placement.c }));
        if (!cells.length || levelComplete) {
            setStatus("No unfound targets are available for the Spectrometer.");
            return false;
        }
        const result = consumeCharge(powerupInventory, "flora-spectrometer");
        if (!result.consumed) {
            setStatus("Buy a Spectrometer charge in the Seed Store first.");
            return false;
        }
        setPowerupInventory(result.inventory);
        setPowerupsUsed(count => count + 1);
        recordFieldNoteEvent({ kind: "powerup_used" });
        setSpectrometerCells(cells);
        setStatus(`${cells.length} unfound word starts highlighted for 5 seconds.`);
        window.setTimeout(() => setSpectrometerCells([]), 5000);
        return true;
    }, [wordsToFind, foundWords, gridData, gridSize, levelComplete, powerupInventory]);

    const unlockTheme = useCallback((themeId: string) => {
        setUnlockedThemes(prev => prev.includes(themeId) ? prev : [...prev, themeId]);
    }, []);

    const unlockGoldenCrest = useCallback(() => {
        setHasGoldenCrest(true);
    }, []);

    // Debug-only surface for the dev `?debug=true` panel (see
    // src/debug/ and src/components/DebugPanel.tsx). `isDebugModeRequested()`
    // is false in every production build, so this object -- and everything
    // it closes over that isn't already used elsewhere in the hook -- is
    // dead code eliminated from release bundles.
    const debugApi = isDebugModeRequested() ? {
        loadGrid: (size: number) => {
            const words = DEBUG_WORDS_BY_SIZE[size] ?? [];
            const generated = generatePuzzle({
                targetWords: words,
                category: DEBUG_CATEGORY,
                level: playingLevel,
                mode: difficultyMode,
                gridSize: size,
            });
            setCategory(generated.category);
            setWordsToFind(generated.targetWords);
            setBonusWordsToFind(generated.bonusWords);
            setFoundWords({});
            setFoundLines([]);
            setGridSize(generated.gridSize);
            setGridData(generated.grid);
            setLevelComplete(false);
            setDoubleSeedsActive(false);
            setSpectrometerCells([]);
            setCompassDirection(null);
            setBonusWordsThisLevel([]);
            setBonusSeedsThisLevel(0);
            setBaseSeedsThisLevel(0);
            setBonusDiscovery(null);
            setHintUsedThisLevel(false);
            setStatus(`Debug: loaded a ${generated.gridSize}x${generated.gridSize} board.`);
        },
        setUnlockedAchievements: (ids: string[]) => setUnlockedAchievements(new Set(ids)),
        setOwnedPlants: (ids: string[]) => setOwnedPlants(ids),
        setGrowthByPlant: (plantId: string, value: number) => setGrowthByPlant(prev => ({ ...prev, [plantId]: value })),
        setAffliction: (plantId: string, type: AfflictionType | null, severity: 1 | 2 | 3 = 1) => {
            setAfflictions(prev => type === null ? clearAffliction(prev, plantId) : { ...prev, [plantId]: { type, severity, puzzlesSinceOnset: 0 } });
        },
        setRemedyCharges: (value: number) => setRemedyCharges(Math.max(0, Math.floor(value))),
        setPowerupInventory: (id: PowerupId, value: number) => setPowerupInventory(prev => ({ ...prev, [id]: value })),
        setHighestUnlockedLevel: (level: number) => {
            setHighestUnlockedLevel(level);
            setPlayingLevel(level);
        },
        setUnlockedThemes: (ids: string[]) => setUnlockedThemes(ids),
        setHasGoldenCrest: (value: boolean) => setHasGoldenCrest(value),
        queuePromotionPreview: (fromLevel: number, toLevel: number) => {
            const promotion = getBotanistPromotion(fromLevel, toLevel);
            if (promotion) setPromotionQueue(prev => [...prev, promotion]);
        },
        queueAchievementPreview: (id: string) => {
            const achievement = ACHIEVEMENTS.find(a => a.id === id);
            if (achievement) setJustUnlocked(prev => [...prev, achievement]);
        },
        // WSP-2.4: preview-only overlays for the DebugPanel, exactly like
        // queuePromotionPreview/queueAchievementPreview above -- pushes
        // straight into milestoneQueue without touching claimedRegionRewards
        // or any real save data, so it can be previewed on demand instead of
        // waiting to actually reach level 10/20/.../100 in a real save.
        queueMilestonePreview: (level: number) => {
            setMilestoneQueue(prev => [...prev, { kind: "milestone", level }]);
        },
        queueRegionTransitionPreview: (regionId: string, transition: "entry" | "completion") => {
            const region = getRegionById(regionId);
            if (!region) return;
            const rewardSeeds = transition === "completion" ? region.completionReward.seeds : (region.entryReward?.seeds ?? 0);
            setMilestoneQueue(prev => [...prev, { kind: "region-transition", regionId, transition, rewardSeeds, level: region.end }]);
        },
    } : undefined;

    return {
        // `level` remains a compatibility alias for existing presentation
        // components; progression decisions use the explicit fields above.
        level: playingLevel, playingLevel, highestUnlockedLevel, completedLevels,
        seeds, status, levelComplete, category, levelsCompleted,
        gridSize, gridData, wordsToFind, foundWords, foundLines,
        submitSelection, revealAndSolveWord, nextLevel, restart, goToLevel, reshuffle, retryLevel, spendSeeds, addSeeds,
        unlockedAchievements, justUnlocked, dismissJustUnlocked, promotionQueue, dismissPromotion,
        milestoneQueue, dismissMilestone, presentationQueue, claimedRegionRewards,
        difficultyMode, setDifficultyMode,
        favoriteCategories, setFavoriteCategories, useFavorites, setUseFavorites,
        categoriesSeen, foundDiagonal, bonusWordsFound, bonusWordsToFind, bonusWordsThisLevel, bonusSeedsThisLevel, baseSeedsThisLevel, bonusDiscovery,
        levelsCompletedWithoutHint, maxBonusWordsInLevel, longestBonusWordFound, reverseWordsFound, plantsBloomed, bloomedRarityTiers, uniqueCategoriesCompleted, powerupsUsed,
        fieldNotes, claimFieldNote,
        // Botanical Sanctuary state & handlers
        ownedPlants, wateredTimestamps, growthByPlant,
        buyPlantSeed, updateWateredTimestamp, updatePlantGrowth, recordPlantBloom, waterAllReady,
        bloomEvents, dismissBloomEvent,
        afflictions, remedyCharges, treatPlant, compostAfflictedPlant,
        // Store power-ups
        doubleSeedsActive, activateDoubleSeeds, activateSuperRoot, activateCompass, activateSpectrometer,
        spectrometerCells, compassDirection,
        powerupInventory, freeHintUsesRemaining, purchasePowerupCharge, consumePowerupCharge, claimHintUse,
        onboardingSeen, dismissOnboardingStep, replayOnboarding,
        unlockedThemes, unlockTheme,
        hasGoldenCrest, unlockGoldenCrest,
        debugApi,
    };
}

export type DebugApi = NonNullable<ReturnType<typeof useWordSearchGame>["debugApi"]>;
