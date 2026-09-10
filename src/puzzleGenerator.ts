import { DIRECTIONS } from "./constants";
import { findAccidentalDeniedStrings, sanitizeAccidentalDeniedStrings } from "./contentSafety";
import { calculateGridSize, getRandomFillLetter } from "./gameMechanics";

export const MAX_GENERATION_ATTEMPTS = 20;

// Once a board legally places every target/bonus word, generation keeps
// searching for a *good* one -- but only among the first MAX_QUALITY_ATTEMPTS
// valid boards it finds, never open-ended. If none of those clears
// QUALITY_THRESHOLD, the best-scoring one of them ships rather than
// retrying forever chasing a perfect board (see scorePuzzleQuality below).
export const MAX_QUALITY_ATTEMPTS = 6;
export const QUALITY_THRESHOLD = 0.45;

// A word the generator will actually place on a board. Real content is
// always uppercase-able A-Z (see src/categories/*.json) -- this exists as a
// defensive backstop, not a content-authoring rule, so a malformed word
// can never silently corrupt a board instead of being dropped.
const PLACEABLE_WORD_PATTERN = /^[A-Z]+$/;
export function isPlaceableWord(word: string): boolean {
    return PLACEABLE_WORD_PATTERN.test(word.toUpperCase());
}

// Case-insensitive de-dup that keeps first-seen order, so a caller passing
// the same word twice (or the same word in two cases) never asks the
// generator to place one word at two different board locations under a
// single shared `placements[word]` entry -- silently losing the first.
function dedupeWords(words: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const word of words) {
        const key = word.toUpperCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(word);
    }
    return result;
}

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
    // 0..1, from scorePuzzleQuality. Set even on a fallback board (usually a
    // low score) so callers/audits never have to guess whether a result was
    // quality-checked -- 0 there just means "not applicable", not "unknown".
    qualityScore: number;
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

/** Every cell any placed word (target or bonus) occupies, as "row,col" keys. */
function wordCells(placements: Record<string, GeneratedPlacement>): Set<string> {
    const cells = new Set<string>();
    for (const [word, p] of Object.entries(placements)) {
        for (let index = 0; index < word.length; index++) {
            cells.add(`${p.row + index * p.dr},${p.col + index * p.dc}`);
        }
    }
    return cells;
}

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

export type QualityScore = {
    directionScore: number;
    reverseScore: number;
    overlapScore: number;
    bonusDensity: number;
    total: number;
};

/**
 * Scores a *structurally valid* board (every requested target/bonus word
 * already placed) on how well it matches the difficulty's intent, not just
 * whether it's legal -- a board can pass every placement rule and still be
 * a bad one: everything crammed in one corner with zero diagonals is
 * "valid" by canPlace's rules but not the puzzle the difficulty asked for.
 *
 * Each sub-score is 0..1, closer to 1 the nearer the board's actual
 * direction/reverse/overlap distribution sits to what the difficulty
 * profile targets; `total` is their average. Intentionally a coarse, cheap
 * heuristic re-evaluated on a handful of candidate boards per puzzle (see
 * MAX_QUALITY_ATTEMPTS/QUALITY_THRESHOLD) -- not a full solvability or
 * fun-ness analysis.
 */
export function scorePuzzleQuality(
    placements: Record<string, GeneratedPlacement>,
    bonusWordCount: number,
    bonusGoalCount: number,
    difficulty: PuzzleDifficulty,
): QualityScore {
    const entries = Object.entries(placements);
    if (entries.length === 0) {
        return { directionScore: 0, reverseScore: 0, overlapScore: 0, bonusDensity: 0, total: 0 };
    }

    let diagonalCount = 0;
    let reverseCount = 0;
    let placedCells = 0;
    let overlapCells = 0;
    const occupied = new Map<string, number>();
    for (const [word, placement] of entries) {
        const direction = [placement.dc, placement.dr] as const;
        if (isDiagonal(direction)) diagonalCount++;
        if (isReverse(direction)) reverseCount++;
        for (let index = 0; index < word.length; index++) {
            const key = `${placement.row + index * placement.dr},${placement.col + index * placement.dc}`;
            occupied.set(key, (occupied.get(key) ?? 0) + 1);
            placedCells++;
        }
    }
    for (const count of occupied.values()) {
        if (count > 1) overlapCells += count - 1;
    }

    const actualDiagonalRatio = diagonalCount / entries.length;
    const actualReverseRatio = reverseCount / entries.length;
    const actualOverlapRatio = placedCells > 0 ? overlapCells / placedCells : 0;

    // 1 - |actual - target| (clamped) rewards landing near the difficulty's
    // intended ratio, whichever direction a board happens to miss it by.
    const directionScore = 1 - Math.min(1, Math.abs(actualDiagonalRatio - difficulty.diagonalProbability));
    const reverseScore = 1 - Math.min(1, Math.abs(actualReverseRatio - difficulty.reverseWordProbability));
    // A little overlap makes a board feel interconnected rather than a pile
    // of disjoint words; the target scales with overlapPressure, the same
    // knob placeWord's own per-candidate preference scoring already uses.
    const targetOverlap = 0.08 + difficulty.overlapPressure * 0.22;
    const overlapScoreValue = 1 - Math.min(1, Math.abs(actualOverlapRatio - targetOverlap) / Math.max(targetOverlap, 0.1));
    const bonusDensity = bonusGoalCount > 0 ? Math.min(1, bonusWordCount / bonusGoalCount) : 1;

    const total = (directionScore + reverseScore + overlapScoreValue + bonusDensity) / 4;
    return { directionScore, reverseScore, overlapScore: overlapScoreValue, bonusDensity, total };
}

export type InvariantViolation =
    | "missing-target"
    | "target-out-of-bounds"
    | "target-illegal-characters"
    | "board-size-mismatch"
    | "duplicate-target";

/**
 * Re-checks a generated result against every WSP-0.2 invariant from
 * scratch, independent of whatever generatePuzzle itself already enforced
 * -- the point is an audit that would still catch a regression in
 * generatePuzzle's own enforcement, not one that trusts it. Returns an
 * empty array when the result is fully valid.
 */
export function validatePuzzleInvariants(
    result: PuzzleGenerationResult,
    request: PuzzleGenerationRequest,
): InvariantViolation[] {
    const violations = new Set<InvariantViolation>();
    const difficulty = getPuzzleDifficulty(request.level, request.mode, request.gridSize);

    const seen = new Set<string>();
    for (const word of result.targetWords) {
        const key = word.toUpperCase();
        if (seen.has(key)) violations.add("duplicate-target");
        seen.add(key);
        if (!isPlaceableWord(word)) violations.add("target-illegal-characters");
    }

    for (const word of result.targetWords) {
        const placement = result.placements[word];
        if (!placement) { violations.add("missing-target"); continue; }
        for (let index = 0; index < word.length; index++) {
            const r = placement.row + index * placement.dr;
            const c = placement.col + index * placement.dc;
            if (r < 0 || r >= result.gridSize || c < 0 || c >= result.gridSize) {
                violations.add("target-out-of-bounds");
            }
        }
    }

    // The emergency fallback deliberately grows the board rather than ever
    // dropping a promised target -- that trade-off is the point of it, so a
    // size mismatch only counts against the normal (non-fallback) path.
    if (!result.fallbackReason && result.gridSize !== difficulty.gridSize) {
        violations.add("board-size-mismatch");
    }

    return [...violations];
}

type Candidate = {
    grid: string[][];
    placements: Record<string, GeneratedPlacement>;
    bonusWords: string[];
    score: number;
};

const QUALITY_FALLBACK_REASON = "quality threshold not met within retry bound; used best-scoring valid board";

function buildResult(
    candidate: Candidate,
    requestedTargets: string[],
    difficulty: PuzzleDifficulty,
    request: PuzzleGenerationRequest,
    attemptCount: number,
): PuzzleGenerationResult {
    return {
        grid: candidate.grid,
        targetWords: requestedTargets,
        bonusWords: candidate.bonusWords,
        placements: candidate.placements,
        category: request.category,
        gridSize: difficulty.gridSize,
        attemptCount,
        qualityScore: candidate.score,
        ...(candidate.score < QUALITY_THRESHOLD ? { fallbackReason: QUALITY_FALLBACK_REASON } : {}),
    };
}

export function generatePuzzle(request: PuzzleGenerationRequest): PuzzleGenerationResult {
    const difficulty = getPuzzleDifficulty(request.level, request.mode, request.gridSize);
    const rng = request.rng ?? Math.random;
    // Defensive backstops (see isPlaceableWord/dedupeWords): real category
    // content never trips these, but a generated puzzle must never violate
    // them regardless of what a caller passes in.
    const requestedTargets = dedupeWords(request.targetWords.map(word => word.toUpperCase()))
        .filter(isPlaceableWord)
        .slice(0, difficulty.targetCount);
    const targetSet = new Set(requestedTargets);
    const bonusWords = dedupeWords((request.bonusWords ?? []).map(word => word.toUpperCase()))
        .filter(word => isPlaceableWord(word) && !targetSet.has(word))
        .slice(0, difficulty.bonusCandidateCount);

    // Two nested bounds, both hard limits: MAX_GENERATION_ATTEMPTS caps the
    // search for *any* legal board at all (unchanged from before quality
    // scoring existed); MAX_QUALITY_ATTEMPTS separately caps how many legal
    // boards we'll compare before settling for the best one seen rather
    // than continuing to search for one over QUALITY_THRESHOLD. Neither
    // bound can starve the other into looping indefinitely.
    let best: Candidate | null = null;
    let validAttempts = 0;

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
            const placement = placeWord(grid, word, difficulty.allowedDirections, rng, difficulty);
            if (placement) { placements[word] = placement; placedBonusWords.push(word); }
        }
        // bonusGoalCount is a heuristic estimate of leftover *cell count*,
        // not leftover *contiguous run length* -- a board with plenty of
        // scattered empty cells can still have nowhere a 6+ letter word
        // actually fits once the targets' overlap-seeking placement has
        // fragmented it. Discarding an otherwise fully-valid, well-placed
        // board over a bonus shortfall used to send ~98% of real (longer,
        // more numerous) target-word sets straight to the emergency
        // fallback -- bonus words are explicitly optional ("if you can"),
        // so a shortfall belongs in the quality score's bonusDensity term
        // below, not a hard reject here.

        // Filled in now (not deferred to the winning candidate only) so the
        // content-safety pass below sees the real filler. Sanitizing in
        // place -- rather than discarding the whole candidate and retrying
        // -- fixes the common case (filler, or filler crossing into a word)
        // deterministically instead of depending on luck across retries.
        fillGrid(grid, requestedTargets, rng);
        const placedCells = wordCells(placements);
        sanitizeAccidentalDeniedStrings(grid, placements, (r, c) => placedCells.has(`${r},${c}`), rng);
        // The one thing sanitize can't fix without corrupting a legitimate
        // placed word: two separately-placed words happening to sit
        // adjacently such that their own letters, read together, spell a
        // denied term -- every cell in that window already belongs to some
        // real word, so there's nothing safe to mutate. Rare, but real
        // content, densely packed boards, and ~9 four-letter denied terms
        // make it not rare *enough* to ignore -- discard the whole
        // candidate and let the outer retry loop try a different layout,
        // exactly like a failed placement.
        if (findAccidentalDeniedStrings(grid, placements).length > 0) continue;

        validAttempts++;
        const score = scorePuzzleQuality(placements, placedBonusWords.length, bonusGoalCount, difficulty).total;
        const candidate: Candidate = { grid, placements, bonusWords: placedBonusWords, score };
        if (!best || score > best.score) best = candidate;

        if (score >= QUALITY_THRESHOLD || validAttempts >= MAX_QUALITY_ATTEMPTS) {
            return buildResult(best, requestedTargets, difficulty, request, attempt);
        }
    }

    if (best) {
        return buildResult(best, requestedTargets, difficulty, request, MAX_GENERATION_ATTEMPTS);
    }

    // The normal path is intentionally randomized, but the fallback is
    // deterministic and still refuses to return a puzzle missing a target:
    // word placement itself never changes across re-rolls below, only the
    // filler in the empty cells around it.
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
        placements[word] = { row, col: 0, dc: 1, dr: 0 };
    });
    fillGrid(grid, requestedTargets, rng);
    // See the main loop's identical call above: sanitize in place rather
    // than re-roll-and-hope. This grid is even more filler-heavy than a
    // normal board (a handful of isolated word rows in an otherwise mostly
    // empty grid), so a bounded number of full re-rolls would only ever be
    // probabilistic here, not a guarantee. Unlike the main loop, there's no
    // more attempt budget left to discard-and-retry a residual cross-word
    // coincidence (two adjacent word-rows' own letters spelling a denied
    // term diagonally) if sanitize can't clear it without corrupting a
    // word -- an accepted, documented residual risk unique to this
    // already-rare last-resort path, not the normal one above.
    const placedCells = wordCells(placements);
    sanitizeAccidentalDeniedStrings(grid, placements, (r, c) => placedCells.has(`${r},${c}`), rng);

    return {
        grid,
        targetWords: requestedTargets,
        bonusWords: placedBonusWords,
        placements,
        category: request.category,
        gridSize: fallbackGridSize,
        attemptCount: MAX_GENERATION_ATTEMPTS,
        fallbackReason: "random placement retries exhausted",
        qualityScore: 0,
    };
}
