import { DIRECTIONS } from "./constants";
import { calculateGridSize, getRandomFillLetter } from "./gameMechanics";

export const MAX_GENERATION_ATTEMPTS = 20;

export type PuzzleMode = "easy" | "standard" | "challenging";

export type PuzzleDifficulty = {
    gridSize: number;
    targetCount: number;
    minWordLength: number;
    maxWordLength: number;
    allowedDirections: readonly (readonly number[])[];
    reverseWordProbability: number;
    diagonalProbability: number;
    overlapPressure: number;
    bonusCandidateCount: number;
};

export type PuzzleGenerationRequest = {
    targetWords: string[];
    bonusWords?: string[];
    category: string;
    level: number;
    mode: PuzzleMode;
    gridSize?: number;
    rng?: () => number;
};

export type PuzzleGenerationResult = {
    grid: string[][];
    targetWords: string[];
    bonusWords: string[];
    placements: Record<string, { row: number; col: number; dc: number; dr: number }>;
    category: string;
    gridSize: number;
    attemptCount: number;
    fallbackReason?: string;
};

export function getPuzzleDifficulty(level: number, mode: PuzzleMode, gridSizeOverride?: number): PuzzleDifficulty {
    const gridSize = gridSizeOverride ?? calculateGridSize(level, mode === "challenging" ? "hard" : mode === "easy" ? "easy" : "normal");
    return {
        gridSize,
        targetCount: Math.max(3, gridSize - 1),
        minWordLength: 3,
        maxWordLength: gridSize <= 4 ? gridSize : gridSize - 1,
        allowedDirections: DIRECTIONS,
        reverseWordProbability: mode === "easy" ? 0.2 : mode === "challenging" ? 0.55 : 0.35,
        diagonalProbability: mode === "easy" ? 0.2 : mode === "challenging" ? 0.65 : 0.4,
        overlapPressure: mode === "easy" ? 0.25 : mode === "challenging" ? 0.75 : 0.5,
        bonusCandidateCount: Math.min(gridSize, 8),
    };
}

/** Choose a modest optional bonus goal from difficulty and usable board room. */
export function getBonusGoalCount(
    mode: PuzzleMode,
    gridSize: number,
    emptyCellCount: number,
    candidateCount: number,
): number {
    const difficultyAllowance = mode === "easy" ? 1 : mode === "standard" ? 2 : 3;
    const sizeAllowance = Math.floor(Math.max(0, gridSize - 4) / 4);
    const spacePerBonus = Math.max(3, Math.ceil(gridSize * 0.75));
    const spaceAllowance = Math.floor(Math.max(0, emptyCellCount) / spacePerBonus);
    return Math.max(0, Math.min(candidateCount, difficultyAllowance + sizeAllowance, spaceAllowance));
}

function emptyGrid(size: number): string[][] {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => ""));
}

function canPlace(grid: string[][], word: string, row: number, col: number, direction: readonly number[]): boolean {
    const [dc, dr] = direction;
    return [...word].every((letter, index) => {
        const r = row + index * dr;
        const c = col + index * dc;
        return r >= 0 && r < grid.length && c >= 0 && c < grid.length && (grid[r][c] === "" || grid[r][c] === letter);
    });
}

function overlapScore(grid: string[][], word: string, row: number, col: number, direction: readonly number[]): number {
    const [dc, dr] = direction;
    let score = 0;
    for (let index = 0; index < word.length; index++) {
        if (grid[row + index * dr][col + index * dc] === word[index]) score++;
    }
    return score;
}

type PlacementPreferences = Pick<PuzzleDifficulty, "reverseWordProbability" | "diagonalProbability" | "overlapPressure">;

type GeneratedPlacement = { row: number; col: number; dc: number; dr: number };

function isDiagonal(direction: readonly number[]): boolean {
    return direction[0] !== 0 && direction[1] !== 0;
}

function isReverse(direction: readonly number[]): boolean {
    const [dc, dr] = direction;
    return dc < 0 || (dc === 0 && dr < 0);
}

function placementPreferenceScore(
    candidate: { score: number; direction: readonly number[] },
    wordLength: number,
    preferences: PlacementPreferences,
): number {
    const diagonalFit = isDiagonal(candidate.direction)
        ? preferences.diagonalProbability
        : 1 - preferences.diagonalProbability;
    const reverseFit = isReverse(candidate.direction)
        ? preferences.reverseWordProbability
        : 1 - preferences.reverseWordProbability;
    const overlapRatio = candidate.score / wordLength;
    return (diagonalFit * 3) + (reverseFit * 2) + (overlapRatio * (0.25 + preferences.overlapPressure * 3.5));
}

function placeWord(
    grid: string[][],
    word: string,
    directions: readonly (readonly number[])[],
    rng: () => number,
    preferences: PlacementPreferences,
): GeneratedPlacement | null {
    const candidates: { row: number; col: number; direction: readonly number[]; score: number }[] = [];
    for (const direction of directions) {
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid.length; col++) {
                if (canPlace(grid, word, row, col, direction)) {
                    candidates.push({ row, col, direction, score: overlapScore(grid, word, row, col, direction) });
                }
            }
        }
    }
    if (candidates.length === 0) return null;

    const scoredCandidates = candidates
        .map(candidate => ({ ...candidate, preferenceScore: placementPreferenceScore(candidate, word.length, preferences) }))
        .sort((a, b) => b.preferenceScore - a.preferenceScore);
    const topScore = scoredCandidates[0].preferenceScore;
    const preferred = scoredCandidates.filter(candidate => candidate.preferenceScore >= topScore - 0.75);
    const selected = preferred[Math.floor(rng() * preferred.length) % preferred.length];
    const [dc, dr] = selected.direction;
    for (let index = 0; index < word.length; index++) {
        grid[selected.row + index * dr][selected.col + index * dc] = word[index];
    }
    return { row: selected.row, col: selected.col, dc, dr };
}

export function placeWordOnGrid(grid: string[][], word: string, rng: () => number = Math.random): boolean {
    return placeWord(grid, word.toUpperCase(), DIRECTIONS, rng, {
        reverseWordProbability: 0.35,
        diagonalProbability: 0.4,
        overlapPressure: 0.5,
    }) !== null;
}

function fillGrid(grid: string[][], words: string[], rng: () => number): void {
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid.length; col++) {
            if (grid[row][col] === "") grid[row][col] = getRandomFillLetter(words.length ? words : undefined, rng);
        }
    }
}

export function generatePuzzle(request: PuzzleGenerationRequest): PuzzleGenerationResult {
    const difficulty = getPuzzleDifficulty(request.level, request.mode, request.gridSize);
    const rng = request.rng ?? Math.random;
    const requestedTargets = request.targetWords.slice(0, difficulty.targetCount).map(word => word.toUpperCase());
    const bonusWords = (request.bonusWords ?? []).slice(0, difficulty.bonusCandidateCount).map(word => word.toUpperCase());

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
        const grid = emptyGrid(difficulty.gridSize);
        const placements: Record<string, GeneratedPlacement> = {};
        const placedTargets = requestedTargets
            .slice()
            .sort((a, b) => b.length - a.length)
            .every(word => {
                const placement = placeWord(grid, word, difficulty.allowedDirections, rng, difficulty);
                if (placement) placements[word] = placement;
                return placement !== null;
            });
        if (!placedTargets) continue;

        const emptyCellCount = grid.flat().filter(cell => cell === "").length;
        const bonusGoalCount = getBonusGoalCount(request.mode, difficulty.gridSize, emptyCellCount, bonusWords.length);
        const placedBonusWords: string[] = [];
        for (const word of bonusWords) {
            if (placedBonusWords.length >= bonusGoalCount) break;
            if (placeWord(grid, word, difficulty.allowedDirections, rng, difficulty)) placedBonusWords.push(word);
        }
        if (placedBonusWords.length < bonusGoalCount) continue;
        fillGrid(grid, requestedTargets, rng);
        return {
            grid,
            targetWords: requestedTargets,
            bonusWords: placedBonusWords,
            placements,
            category: request.category,
            gridSize: difficulty.gridSize,
            attemptCount: attempt,
        };
    }

    // The normal path is intentionally randomized, but the fallback is
    // deterministic and still refuses to return a puzzle missing a target.
    const fallbackBonusCap = getBonusGoalCount(
        request.mode,
        difficulty.gridSize,
        difficulty.gridSize * difficulty.gridSize,
        bonusWords.length,
    );
    const fallbackGridSize = Math.max(
        difficulty.gridSize,
        ...requestedTargets.map(word => word.length),
        requestedTargets.length + fallbackBonusCap,
    );
    const grid = emptyGrid(fallbackGridSize);
    const placements: Record<string, GeneratedPlacement> = {};
    requestedTargets.forEach((word, row) => {
        [...word].forEach((letter, col) => { grid[row][col] = letter; });
        placements[word] = { row, col: 0, dc: 1, dr: 0 };
    });
    const placedBonusWords = bonusWords.slice(0, fallbackBonusCap);
    placedBonusWords.forEach((word, index) => {
        const row = requestedTargets.length + index;
        [...word].forEach((letter, col) => { grid[row][col] = letter; });
    });
    fillGrid(grid, requestedTargets, rng);
    return {
        grid,
        targetWords: requestedTargets,
        bonusWords: placedBonusWords,
        placements,
        category: request.category,
        gridSize: fallbackGridSize,
        attemptCount: MAX_GENERATION_ATTEMPTS,
        fallbackReason: "random placement retries exhausted",
    };
}
