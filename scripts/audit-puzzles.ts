// Standalone puzzle-generator audit (WSP-0.2). Generates a large batch of
// boards across every difficulty, region, and grid size and reports
// generation failures, retry counts, direction/diagonal distribution,
// duplicate incidents, and content-safety hits -- run this before any
// release candidate, not just once. See docs/dev-tools (or run `npm run
// audit:puzzles`) for how to invoke it.
import { getPuzzleWords, type Tier } from "../src/backend";
import { findAccidentalDeniedStrings, isDeniedWord } from "../src/contentSafety";
import {
    QUALITY_THRESHOLD,
    generatePuzzle, getPuzzleDifficulty, validatePuzzleInvariants,
    type InvariantViolation, type PuzzleGenerationRequest,
} from "../src/puzzleGenerator";
import { createSeededRng } from "../src/rng";

// Mirrors LEVEL_REGIONS in src/components/LevelsView.tsx. Duplicated rather
// than imported so this audit stays decoupled from the presentation layer
// (LevelsView pulls in React/MUI) -- puzzle generation has no business
// depending on the trail map's component tree. If the campaign's region
// boundaries change, update both.
const REGIONS = [
    { id: "glowing-grove", start: 1, end: 20 },
    { id: "sunlit-falls", start: 21, end: 30 },
    { id: "crystal-conservatory", start: 31, end: 40 },
    { id: "mosswood-hollows", start: 41, end: 50 },
    { id: "cloudreach-summit", start: 51, end: 70 },
    { id: "verdant-beyond", start: 71, end: 100 },
] as const;

const MODES: Tier[] = ["easy", "standard", "challenging"];
const EXPLICIT_GRID_SIZES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export type ValidityFailure = { seed: number; level: number; mode: Tier; gridSize: number; violations: InvariantViolation[] };
export type ContentSafetyHit = { seed: number; kind: "board" | "dictionary"; detail: string };

export type AuditReport = {
    boardsRequested: number;
    boardsGenerated: number;
    validityFailures: ValidityFailure[];
    qualityMisses: number;
    hardFallbacks: number;
    attemptDistribution: Record<number, number>;
    directionCounts: { diagonal: number; straight: number };
    reverseCounts: { reverse: number; straight: number };
    duplicateWordIncidents: number;
    contentSafetyHits: ContentSafetyHit[];
    elapsedMs: number;
};

function emptyReport(boardsRequested: number): AuditReport {
    return {
        boardsRequested,
        boardsGenerated: 0,
        validityFailures: [],
        qualityMisses: 0,
        hardFallbacks: 0,
        attemptDistribution: {},
        directionCounts: { diagonal: 0, straight: 0 },
        reverseCounts: { reverse: 0, straight: 0 },
        duplicateWordIncidents: 0,
        contentSafetyHits: [],
        elapsedMs: 0,
    };
}

/**
 * Runs `boardCount` puzzle generations spanning every mode, region, and
 * explicit grid size, validating each board's invariants and scanning it
 * for content-safety hits. Every board is generated from a seeded RNG (see
 * createSeededRng) so any reported failure's `seed` reproduces it exactly:
 * `generatePuzzle({ ...request, rng: createSeededRng(seed) })`.
 */
export async function runPuzzleAudit(boardCount: number): Promise<AuditReport> {
    const start = Date.now();
    const report = emptyReport(boardCount);
    const deniedDictionaryWords = new Set<string>();

    for (let seed = 1; seed <= boardCount; seed++) {
        const mode = MODES[seed % MODES.length];
        const region = REGIONS[Math.floor(seed / MODES.length) % REGIONS.length];
        const level = region.start + (seed % (region.end - region.start + 1));
        // Every 5th board pins an explicit grid size to make sure every
        // supported size gets certified directly, not just whatever size
        // the level curve happens to land on.
        const gridSizeOverride = seed % 5 === 0 ? EXPLICIT_GRID_SIZES[seed % EXPLICIT_GRID_SIZES.length] : undefined;
        const difficulty = getPuzzleDifficulty(level, mode, gridSizeOverride);

        const puzzle = await getPuzzleWords({
            count: difficulty.targetCount + Math.min(difficulty.targetCount, difficulty.bonusCandidateCount),
            maxLength: difficulty.maxWordLength,
            level,
            tier: mode,
            // Seeded independently of the placement rng below (a fresh
            // generator instance shares no state with another one created
            // from the same seed) so word *selection* is reproducible too --
            // without this, the same seed could report a different failure
            // on every audit run depending on which words got drawn.
            rng: createSeededRng(seed),
        });
        if (puzzle.words.length === 0) continue; // no category data at this (level, tier) pairing to certify against

        for (const word of puzzle.words) {
            if (deniedDictionaryWords.has(word)) continue;
            if (isDeniedWord(word)) {
                deniedDictionaryWords.add(word);
                report.contentSafetyHits.push({ seed, kind: "dictionary", detail: word });
            }
        }

        const targetWords = puzzle.words.slice(0, difficulty.targetCount);
        const bonusWords = puzzle.words.slice(difficulty.targetCount);
        const request: PuzzleGenerationRequest = {
            targetWords, bonusWords, category: puzzle.category, level, mode, gridSize: gridSizeOverride,
            rng: createSeededRng(seed),
        };
        const result = generatePuzzle(request);
        report.boardsGenerated++;

        const violations = validatePuzzleInvariants(result, request);
        if (violations.includes("duplicate-target")) report.duplicateWordIncidents++;
        const realViolations = violations.filter(v => v !== "duplicate-target"); // already deduped away by the generator; tracked separately, not as a failure
        if (realViolations.length > 0) {
            report.validityFailures.push({ seed, level, mode, gridSize: result.gridSize, violations: realViolations });
        }

        if (result.fallbackReason === "random placement retries exhausted") report.hardFallbacks++;
        else if (result.qualityScore < QUALITY_THRESHOLD) report.qualityMisses++;

        report.attemptDistribution[result.attemptCount] = (report.attemptDistribution[result.attemptCount] ?? 0) + 1;

        for (const placement of Object.values(result.placements)) {
            const diagonal = placement.dc !== 0 && placement.dr !== 0;
            if (diagonal) report.directionCounts.diagonal++; else report.directionCounts.straight++;
            const reverse = placement.dc < 0 || (placement.dc === 0 && placement.dr < 0);
            if (reverse) report.reverseCounts.reverse++; else report.reverseCounts.straight++;
        }

        // findAccidentalDeniedStrings already excludes any run sitting
        // entirely inside one placed word's own cells (that's a dictionary
        // content question, handled above, not a board defect), so
        // whatever it returns here is genuinely incidental filler.
        for (const run of findAccidentalDeniedStrings(result.grid, result.placements)) {
            report.contentSafetyHits.push({ seed, kind: "board", detail: run });
        }
    }

    report.elapsedMs = Date.now() - start;
    return report;
}

export function formatAuditReport(report: AuditReport): string {
    const lines: string[] = [];
    lines.push(`Puzzle audit: ${report.boardsGenerated}/${report.boardsRequested} boards generated in ${(report.elapsedMs / 1000).toFixed(1)}s`);
    lines.push(`  Validity failures: ${report.validityFailures.length}`);
    lines.push(`  Duplicate-target incidents (auto-deduped, tracked only): ${report.duplicateWordIncidents}`);
    lines.push(`  Hard fallbacks (no legal board found): ${report.hardFallbacks}`);
    lines.push(`  Quality misses (shipped best-effort under threshold): ${report.qualityMisses}`);
    const totalDirections = report.directionCounts.diagonal + report.directionCounts.straight;
    const totalReverse = report.reverseCounts.reverse + report.reverseCounts.straight;
    lines.push(`  Diagonal share: ${totalDirections ? ((report.directionCounts.diagonal / totalDirections) * 100).toFixed(1) : "0.0"}%`);
    lines.push(`  Reverse share: ${totalReverse ? ((report.reverseCounts.reverse / totalReverse) * 100).toFixed(1) : "0.0"}%`);
    lines.push(`  Content-safety hits: ${report.contentSafetyHits.length}`);
    if (report.contentSafetyHits.length > 0) {
        for (const hit of report.contentSafetyHits.slice(0, 20)) {
            lines.push(`    [${hit.kind}] seed ${hit.seed}: "${hit.detail}"`);
        }
    }
    if (report.validityFailures.length > 0) {
        lines.push("  First 20 validity failures:");
        for (const failure of report.validityFailures.slice(0, 20)) {
            lines.push(`    seed ${failure.seed} (level ${failure.level}, ${failure.mode}, ${failure.gridSize}x${failure.gridSize}): ${failure.violations.join(", ")}`);
        }
    }
    const attemptEntries = Object.entries(report.attemptDistribution).map(([k, v]) => [Number(k), v] as const).sort((a, b) => a[0] - b[0]);
    lines.push(`  Attempt-count distribution: ${attemptEntries.map(([k, v]) => `${k}x${v}`).join(", ")}`);
    return lines.join("\n");
}
