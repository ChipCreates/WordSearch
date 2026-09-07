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
    rng?: () => number;
};

export type PuzzleGenerationResult = {
    grid: string[][];
    targetWords: string[];
    bonusWords: string[];
    category: string;
    gridSize: number;
    attemptCount: number;
    fallbackReason?: string;
};

export function getPuzzleDifficulty(level: number, mode: PuzzleMode): PuzzleDifficulty {
    const gridSize = calculateGridSize(level, mode === "challenging" ? "hard" : mode === "easy" ? "easy" : "normal");
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

function placeWord(
    grid: string[][],
    word: string,
    directions: readonly (readonly number[])[],
    rng: () => number,
    overlapPressure: number,
): boolean {
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
    if (candidates.length === 0) return false;

    candidates.sort((a, b) => b.score - a.score);
    const topScore = candidates[0].score;
    const preferred = candidates.filter(candidate => candidate.score >= topScore * overlapPressure);
    const selected = preferred[Math.floor(rng() * preferred.length) % preferred.length];
    const [dc, dr] = selected.direction;
    for (let index = 0; index < word.length; index++) {
        grid[selected.row + index * dr][selected.col + index * dc] = word[index];
    }
    return true;
}

export function placeWordOnGrid(grid: string[][], word: string, rng: () => number = Math.random): boolean {
    return placeWord(grid, word.toUpperCase(), DIRECTIONS, rng, 0.5);
}

function fillGrid(grid: string[][], words: string[], rng: () => number): void {
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid.length; col++) {
            if (grid[row][col] === "") grid[row][col] = getRandomFillLetter(words.length ? words : undefined);
        }
    }
    // Keep the generator's deterministic test seam meaningful without making
    // the production letter pool part of the public API.
    void rng;
}

export function generatePuzzle(request: PuzzleGenerationRequest): PuzzleGenerationResult {
    const difficulty = getPuzzleDifficulty(request.level, request.mode);
    const rng = request.rng ?? Math.random;
    const requestedTargets = request.targetWords.slice(0, difficulty.targetCount).map(word => word.toUpperCase());
    const bonusWords = (request.bonusWords ?? []).slice(0, difficulty.bonusCandidateCount).map(word => word.toUpperCase());

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
        const grid = emptyGrid(difficulty.gridSize);
        const placedTargets = requestedTargets
            .slice()
            .sort((a, b) => b.length - a.length)
            .every(word => placeWord(grid, word, difficulty.allowedDirections, rng, difficulty.overlapPressure));
        if (!placedTargets) continue;

        const placedBonusWords = bonusWords.filter(word => placeWord(grid, word, difficulty.allowedDirections, rng, difficulty.overlapPressure));
        fillGrid(grid, requestedTargets, rng);
        return {
            grid,
            targetWords: requestedTargets,
            bonusWords: placedBonusWords,
            category: request.category,
            gridSize: difficulty.gridSize,
            attemptCount: attempt,
        };
    }

    // The normal path is intentionally randomized, but the fallback is
    // deterministic and still refuses to return a puzzle missing a target.
    const fallbackGridSize = Math.max(difficulty.gridSize, ...requestedTargets.map(word => word.length));
    const grid = emptyGrid(fallbackGridSize);
    for (const word of requestedTargets) {
        if (!placeWord(grid, word, [[1, 0]], rng, 0)) {
            throw new Error(`Unable to place required target word "${word}" on the fallback board`);
        }
    }
    fillGrid(grid, requestedTargets, rng);
    return {
        grid,
        targetWords: requestedTargets,
        bonusWords: [],
        category: request.category,
        gridSize: fallbackGridSize,
        attemptCount: MAX_GENERATION_ATTEMPTS,
        fallbackReason: "random placement retries exhausted",
    };
}
