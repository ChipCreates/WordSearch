import { useCallback, useEffect, useRef, useState } from "react";
import { getPuzzleWords, validateWord, CATEGORY_NAMES, type Tier } from "../backend";
import { HIGHLIGHT_COLORS, type Cell, type FoundLine } from "../constants";
import { ACHIEVEMENTS, evaluateAchievements, type Achievement } from "../achievements";
import { loadSaveDataSync, loadSaveData, writeSaveData, hasLocalSave, isTauri, CURRENT_SCHEMA_VERSION, DEFAULT_SAVE_DATA } from "../persistence";
import { getRandomFillLetter, findWordPlacement, calculateGridSize, REWARDS, MIN_FAVORITE_CATEGORIES, favoriteCategoryForLevel, classifyWordSelection } from "../gameMechanics";
import { consumePowerupCharge as consumeCharge, purchasePowerupCharge as purchaseCharge, type PowerupId, type PowerupInventory } from "../powerups";
import { generatePuzzle, placeWordOnGrid } from "../puzzleGenerator";

export function useWordSearchGame() {
    // Single load of initial unified save data
    const [initialSave] = useState(() => loadSaveDataSync());

    const [level, setLevel] = useState(initialSave.level);
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
    const [categoriesSeen, setCategoriesSeen] = useState<Set<string>>(() => new Set(initialSave.categoriesSeen));
    const [foundDiagonal, setFoundDiagonal] = useState(initialSave.foundDiagonal);
    const [justUnlocked, setJustUnlocked] = useState<Achievement[]>([]);

    // Unified Botanical Sanctuary State
    const [ownedPlants, setOwnedPlants] = useState<string[]>(initialSave.ownedPlants);
    const [wateredTimestamps, setWateredTimestamps] = useState<Record<string, number>>(initialSave.wateredTimestamps);
    const [growthByPlant, setGrowthByPlant] = useState<Record<string, number>>(initialSave.growthByPlant);

    // Lifetime stat feeding the "found a word that wasn't on the list" achievement
    const [bonusWordsFound, setBonusWordsFound] = useState(initialSave.bonusWordsFound);
    const [bonusWordsThisLevel, setBonusWordsThisLevel] = useState<string[]>([]);
    const [bonusSeedsThisLevel, setBonusSeedsThisLevel] = useState(0);
    const [bonusDiscovery, setBonusDiscovery] = useState<{ word: string; seeds: number } | null>(null);
    const [levelsCompletedWithoutHint, setLevelsCompletedWithoutHint] = useState(initialSave.levelsCompletedWithoutHint);
    const [maxBonusWordsInLevel, setMaxBonusWordsInLevel] = useState(initialSave.maxBonusWordsInLevel);
    const [reverseWordsFound, setReverseWordsFound] = useState(initialSave.reverseWordsFound);
    const [plantsBloomed, setPlantsBloomed] = useState(initialSave.plantsBloomed);
    const [bloomedRarityTiers, setBloomedRarityTiers] = useState(initialSave.bloomedRarityTiers);
    const [uniqueCategoriesCompleted, setUniqueCategoriesCompleted] = useState(initialSave.uniqueCategoriesCompleted);
    const [powerupsUsed, setPowerupsUsed] = useState(initialSave.powerupsUsed);
    const [hintUsedThisLevel, setHintUsedThisLevel] = useState(false);
    useEffect(() => {
        if (!bonusDiscovery) return;
        const timer = setTimeout(() => setBonusDiscovery(null), 2200);
        return () => clearTimeout(timer);
    }, [bonusDiscovery]);
    // Store-unlocked cosmetics
    const [unlockedThemes, setUnlockedThemes] = useState<string[]>(initialSave.unlockedThemes);
    const [hasGoldenCrest, setHasGoldenCrest] = useState(initialSave.hasGoldenCrest);
    // Nitrogen Booster buff -- ephemeral, scoped to the current puzzle, not persisted
    const [doubleSeedsActive, setDoubleSeedsActive] = useState(false);
    const [powerupInventory, setPowerupInventory] = useState<PowerupInventory>(initialSave.powerupInventory);
    const [freeHintUsesRemaining, setFreeHintUsesRemaining] = useState(1);

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
            setLevel(native.level);
            setSeeds(native.seeds);
            setDifficultyMode(native.difficultyMode);
            setFavoriteCategories(native.favoriteCategories);
            setUseFavorites(native.useFavorites);
            setUnlockedAchievements(new Set(native.unlockedAchievements));
            setLevelsCompleted(native.levelsCompleted);
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
            setReverseWordsFound(native.reverseWordsFound);
            setPlantsBloomed(native.plantsBloomed);
            setBloomedRarityTiers(native.bloomedRarityTiers);
            setUniqueCategoriesCompleted(native.uniqueCategoriesCompleted);
            setPowerupsUsed(native.powerupsUsed);
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
            writeSaveData({
                version: CURRENT_SCHEMA_VERSION,
                level,
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
                reverseWordsFound,
                plantsBloomed,
                bloomedRarityTiers,
                uniqueCategoriesCompleted,
                powerupsUsed,
            });
        }, 400);
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [
        level,
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
        reverseWordsFound,
        plantsBloomed,
        bloomedRarityTiers,
        uniqueCategoriesCompleted,
        powerupsUsed,
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
            bloomedRarityTiers,
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

    const initGame = async () => {
        setStatus("Generating puzzle...");
        setLevelComplete(false);
        setDoubleSeedsActive(false);
        setFreeHintUsesRemaining(1);
        setBonusWordsThisLevel([]);
        setBonusSeedsThisLevel(0);
        setBonusDiscovery(null);
        setHintUsedThisLevel(false);
        const size = calculateGridSize(level, difficultyMode === "challenging" ? "hard" : difficultyMode === "easy" ? "easy" : "normal");
        const count = Math.max(3, size - 1);
        const maxWordLength = size <= 4 ? size : size - 1;

        const usingFavorites = useFavorites && favoriteCategories.length >= MIN_FAVORITE_CATEGORIES;
        const categoryName = usingFavorites ? favoriteCategoryForLevel(favoriteCategories, level) : undefined;
        const excludeWords = categoryName ? recentWordsByCategoryRef.current.get(categoryName) : undefined;

        const puzzle = await getPuzzleWords({
            count: count + Math.min(count, 8),
            maxLength: maxWordLength,
            level,
            tier: difficultyMode,
            categoryName,
            excludeWords,
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
            level,
            mode: difficultyMode,
        });

        setWordsToFind(generated.targetWords);
        setFoundWords({});
        setFoundLines([]);
        setGridSize(generated.gridSize);
        setGridData(generated.grid);
        setStatus("Puzzle generated. Find the words!");
    };

    useEffect(() => { initGame(); }, [level, difficultyMode, useFavorites, favoriteCategories]);

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

        const validBonusCandidates = new Set<string>();
        if (!wordsToFind.includes(currentWord) && !wordsToFind.includes(reversedWord)) {
            if (await validateWord(currentWord)) validBonusCandidates.add(currentWord);
            if (reversedWord !== currentWord && await validateWord(reversedWord)) validBonusCandidates.add(reversedWord);
        }
        const selection = classifyWordSelection(currentWord, reversedWord, wordsToFind, foundWords, validBonusCandidates);
        if (selection.kind === "already-found") {
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
            if (dr !== 0 && dc !== 0) setFoundDiagonal(true);
            if (currentWord !== matchedWord) setReverseWordsFound(count => count + 1);

            const rewardMultiplier = doubleSeedsActive ? 2 : 1;
            if (selection.kind === "bonus-found") {
                const bonusSeeds = REWARDS.BONUS_WORD_SEEDS * rewardMultiplier;
                setSeeds((s: number) => s + bonusSeeds);
                setBonusWordsFound((n: number) => n + 1);
                setBonusWordsThisLevel(prev => [...prev, matchedWord]);
                setBonusSeedsThisLevel(total => total + bonusSeeds);
                setMaxBonusWordsInLevel(max => Math.max(max, bonusWordsThisLevel.length + 1));
                setBonusDiscovery({ word: matchedWord, seeds: bonusSeeds });
                setStatus(`Bonus sprout! ${matchedWord} +${bonusSeeds} Seeds`);
            } else {
                const foundMainCount = wordsToFind.filter(w => nextFoundWords[w]).length;
                if (foundMainCount === wordsToFind.length) {
                    setStatus("Triumph! Level complete.");
                    setLevelComplete(true);
                    setLevelsCompleted((n: number) => n + 1);
                    if (!hintUsedThisLevel) setLevelsCompletedWithoutHint(count => count + 1);
                    setUniqueCategoriesCompleted(count => Math.max(count, categoriesSeen.size + (categoriesSeen.has(category) ? 0 : 1)));
                    setMaxBonusWordsInLevel(max => Math.max(max, bonusWordsThisLevel.length));
                    setSeeds((s: number) => s + REWARDS.LEVEL_COMPLETE_SEEDS * rewardMultiplier);
                }
            }
        }
    };

    // Solves `word` outright -- the paid "Super Root Hint" tier, as opposed
    // to the free/cheap hint which only points at a cell. Mirrors the
    // found-word bookkeeping in submitSelection for a non-bonus match, but
    // doesn't award BONUS_WORD_SEEDS (it's a main word, not a bonus find)
    // and doesn't count toward bonusWordsFound.
    const revealAndSolveWord = (word: string) => {
        const { gridData, wordsToFind, foundWords } = stateRef.current;
        if (!word || foundWords[word] || !gridData.length) return;
        const placement = findWordPlacement(gridData, gridData.length, word);
        if (!placement) return;
        const { r, c, dr, dc } = placement;
        const endR = r + (word.length - 1) * dr;
        const endC = c + (word.length - 1) * dc;
        const randomColor = HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)];
        const newLine: FoundLine = { startR: r, startC: c, endR, endC, color: randomColor };
        const nextFoundWords = { ...foundWords, [word]: randomColor };

        setFoundLines(prev => [...prev, newLine]);
        setFoundWords(nextFoundWords);
        if (dr !== 0 && dc !== 0) setFoundDiagonal(true);

        const foundMainCount = wordsToFind.filter(w => nextFoundWords[w]).length;
        if (foundMainCount === wordsToFind.length) {
            setStatus("Triumph! Level complete.");
            setLevelComplete(true);
            setLevelsCompleted((n: number) => n + 1);
            setSeeds((s: number) => s + REWARDS.LEVEL_COMPLETE_SEEDS * (doubleSeedsActive ? 2 : 1));
        }
    };

    const goToLevel = (lvl: number) => setLevel(lvl);
    const reshuffle = () => {
        const consumed = consumeCharge(powerupInventory, "lumina-cyclone");
        if (!consumed.consumed) {
            setStatus("Buy a Shuffle charge in the Seed Store first.");
            return false;
        }
        setPowerupInventory(consumed.inventory);
        setPowerupsUsed(count => count + 1);
        if (!wordsToFind || !wordsToFind.length) return;
        const size = gridSize;
        const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));

        // Reserve the cells already covered by found-word lines so their
        // pills stay visually accurate afterward -- a reshuffle redistributes
        // what's left to find, it doesn't erase what's already been found.
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

        const unfoundWords = wordsToFind.filter(w => !foundWords[w]);
        unfoundWords.forEach(word => {
            placeWordOnGrid(grid, word);
        });
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r][c] === '') {
                    grid[r][c] = getRandomFillLetter(unfoundWords.length ? unfoundWords : wordsToFind);
                }
            }
        }
        setGridData(grid);
        setStatus("Board reshuffled!");
        return true;
    };
    const retryLevel = () => {
        setFoundWords({});
        setFoundLines([]);
        setLevelComplete(false);
        setBonusWordsThisLevel([]);
        setBonusSeedsThisLevel(0);
        setHintUsedThisLevel(false);
        setBonusDiscovery(null);
    };

    const nextLevel = () => setLevel((l: number) => l + 1);
    // Full reset -- every persisted field back to its default, not just
    // level/seeds. A partial reset here previously left achievements,
    // categoriesSeen, and the whole garden untouched, landing the player in
    // an inconsistent state (level 1, but a trophy case for level 50).
    const restart = () => {
        setLevel(DEFAULT_SAVE_DATA.level);
        setSeeds(DEFAULT_SAVE_DATA.seeds);
        setLevelsCompleted(DEFAULT_SAVE_DATA.levelsCompleted);
        setUnlockedAchievements(new Set(DEFAULT_SAVE_DATA.unlockedAchievements));
        setCategoriesSeen(new Set(DEFAULT_SAVE_DATA.categoriesSeen));
        setFoundDiagonal(DEFAULT_SAVE_DATA.foundDiagonal);
        setJustUnlocked([]);
        setOwnedPlants(DEFAULT_SAVE_DATA.ownedPlants);
        setWateredTimestamps(DEFAULT_SAVE_DATA.wateredTimestamps);
        setGrowthByPlant(DEFAULT_SAVE_DATA.growthByPlant);
        setBonusWordsFound(DEFAULT_SAVE_DATA.bonusWordsFound);
        setUnlockedThemes(DEFAULT_SAVE_DATA.unlockedThemes);
        setHasGoldenCrest(DEFAULT_SAVE_DATA.hasGoldenCrest);
        setDoubleSeedsActive(false);
        setPowerupInventory(DEFAULT_SAVE_DATA.powerupInventory);
        setFreeHintUsesRemaining(1);
        setLevelsCompletedWithoutHint(DEFAULT_SAVE_DATA.levelsCompletedWithoutHint);
        setMaxBonusWordsInLevel(DEFAULT_SAVE_DATA.maxBonusWordsInLevel);
        setReverseWordsFound(DEFAULT_SAVE_DATA.reverseWordsFound);
        setPlantsBloomed(DEFAULT_SAVE_DATA.plantsBloomed);
        setBloomedRarityTiers(DEFAULT_SAVE_DATA.bloomedRarityTiers);
        setUniqueCategoriesCompleted(DEFAULT_SAVE_DATA.uniqueCategoriesCompleted);
        setPowerupsUsed(DEFAULT_SAVE_DATA.powerupsUsed);
        setHintUsedThisLevel(false);
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

    const claimHintUse = useCallback((): "free" | "paid" | null => {
        if (freeHintUsesRemaining > 0) {
            setHintUsedThisLevel(true);
            setPowerupsUsed(count => count + 1);
            setFreeHintUsesRemaining(previous => previous - 1);
            return "free";
        }
        const result = consumeCharge(powerupInventory, "single-letter-sprout");
        if (!result.consumed) return null;
        setPowerupInventory(result.inventory);
        setHintUsedThisLevel(true);
        setPowerupsUsed(count => count + 1);
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

    const recordPlantBloom = useCallback(() => {
        setPlantsBloomed(count => count + 1);
        setBloomedRarityTiers(count => Math.min(7, count + 1));
    }, []);

    // Store power-ups: Nitrogen Booster, theme unlocks, the profile crest.
    // Seed cost is deducted by the caller (SeedStoreDialog's handleRedeem)
    // before these run, matching how the hint/reshuffle redeems already work.
    const activateDoubleSeeds = useCallback(() => {
        if (doubleSeedsActive) return false;
        const result = consumeCharge(powerupInventory, "nitrogen-booster");
        if (!result.consumed) return false;
        setPowerupInventory(result.inventory);
        setDoubleSeedsActive(true);
        setPowerupsUsed(count => count + 1);
        return true;
    }, [doubleSeedsActive, powerupInventory]);

    const unlockTheme = useCallback((themeId: string) => {
        setUnlockedThemes(prev => prev.includes(themeId) ? prev : [...prev, themeId]);
    }, []);

    const unlockGoldenCrest = useCallback(() => {
        setHasGoldenCrest(true);
    }, []);

    return {
        level, seeds, status, levelComplete, category,
        gridSize, gridData, wordsToFind, foundWords, foundLines,
        submitSelection, revealAndSolveWord, nextLevel, restart, goToLevel, reshuffle, retryLevel, spendSeeds, addSeeds,
        unlockedAchievements, justUnlocked, dismissJustUnlocked,
        difficultyMode, setDifficultyMode,
        favoriteCategories, setFavoriteCategories, useFavorites, setUseFavorites,
        categoriesSeen, foundDiagonal, bonusWordsFound, bonusWordsThisLevel, bonusSeedsThisLevel, bonusDiscovery,
        levelsCompletedWithoutHint, maxBonusWordsInLevel, reverseWordsFound, plantsBloomed, bloomedRarityTiers, uniqueCategoriesCompleted, powerupsUsed,
        // Botanical Sanctuary state & handlers
        ownedPlants, wateredTimestamps, growthByPlant,
        buyPlantSeed, updateWateredTimestamp, updatePlantGrowth, recordPlantBloom,
        // Store power-ups
        doubleSeedsActive, activateDoubleSeeds,
        powerupInventory, freeHintUsesRemaining, purchasePowerupCharge, consumePowerupCharge, claimHintUse,
        unlockedThemes, unlockTheme,
        hasGoldenCrest, unlockGoldenCrest,
    };
}
