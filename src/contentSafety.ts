// A single, centralized deny/review list for accidental inappropriate
// strings -- in the bonus-word dictionary, a category's word list, or a
// generated board's incidental letter runs (a straight line the puzzle
// never intended as a word, but which the filler happened to spell out).
//
// Deliberately narrow, and deliberately *exact-match only*: matching by
// substring containment looks stricter but actually isn't safe -- it flags
// perfectly ordinary words that happen to contain a denied one internally
// (DRAPERY contains RAPE, PEACOCK contains COCK, SCUNTHORPE contains a much
// worse one). That's the classic profanity-filter false positive, and it's
// exactly what the release plan warns against: "This isn't about
// aggressively censoring legitimate words -- it's a deny/review list for
// the genuinely obvious cases." Exact match catches a word (or an
// incidental board run) that *is* the denied term, without punishing every
// legitimate word that happens to contain one as a fragment.
export const CONTENT_DENY_LIST: readonly string[] = [
    "FUCK", "SHIT", "CUNT", "NIGGER", "NIGGA", "FAGGOT", "RETARD",
    "WHORE", "SLUT", "RAPE", "COCK", "DICK", "PUSSY", "BITCH", "TWAT",
    "ASSHOLE",
];

const DENY_SET = new Set(CONTENT_DENY_LIST.map(word => word.toUpperCase()));
const DENY_LENGTHS = [...new Set(CONTENT_DENY_LIST.map(word => word.length))];

/** True only if `word` (as a whole) is itself a deny-listed term. */
export function isDeniedWord(word: string): boolean {
    return DENY_SET.has(word.toUpperCase());
}

/** Scans a word list (a category's words, or the full bonus-word dictionary) for deny-listed entries. */
export function findDeniedWords(words: readonly string[]): string[] {
    return words.filter(isDeniedWord);
}

const BOARD_SCAN_AXES = [
    [1, 0], [0, 1], [1, 1], [1, -1],
] as const;

type Placement = { row: number; col: number; dc: number; dr: number };
type DeniedWindow = { text: string; cells: [number, number][] };

/**
 * Scans a generated board for exact-length, exact-match denied-word
 * windows (one length per denied-word length, both forwards and reversed)
 * along all 8 directions, skipping any window that sits entirely inside a
 * single placed word's own cells -- that's a legitimate dictionary word
 * being itself (already covered by findDeniedWords against the word list),
 * not a board defect. Internal: callers use findAccidentalDeniedStrings for
 * reporting or sanitizeAccidentalDeniedStrings to actually fix a board.
 */
function scanDeniedWindows(
    grid: readonly string[][],
    placements: Readonly<Record<string, Placement>>,
): DeniedWindow[] {
    const size = grid.length;
    if (size === 0) return [];

    const wordCellSets = Object.entries(placements).map(([word, p]) => {
        const cells = new Set<string>();
        for (let index = 0; index < word.length; index++) {
            cells.add(`${p.row + index * p.dr},${p.col + index * p.dc}`);
        }
        return cells;
    });
    const isWithinOnePlacedWord = (cellKeys: string[]): boolean =>
        wordCellSets.some(set => cellKeys.every(cell => set.has(cell)));

    const windows: DeniedWindow[] = [];
    for (const length of DENY_LENGTHS) {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                for (const [dc, dr] of BOARD_SCAN_AXES) {
                    let letters = "";
                    const cellKeys: string[] = [];
                    const cells: [number, number][] = [];
                    let r = row, c = col, inBounds = true;
                    for (let index = 0; index < length; index++) {
                        if (r < 0 || r >= size || c < 0 || c >= size) { inBounds = false; break; }
                        letters += grid[r][c];
                        cellKeys.push(`${r},${c}`);
                        cells.push([r, c]);
                        r += dr; c += dc;
                    }
                    if (!inBounds || isWithinOnePlacedWord(cellKeys)) continue;

                    if (isDeniedWord(letters)) windows.push({ text: letters, cells });
                    const reversed = [...letters].reverse().join("");
                    if (isDeniedWord(reversed)) windows.push({ text: reversed, cells: [...cells].reverse() });
                }
            }
        }
    }
    return windows;
}

/**
 * Scans a generated board for a deny-listed string that was never an
 * intended target/bonus word -- filler letters (or letters spanning across
 * a word boundary) that accidentally lined up into something inappropriate.
 * Reporting-only; see sanitizeAccidentalDeniedStrings to fix a board.
 */
export function findAccidentalDeniedStrings(
    grid: readonly string[][],
    placements: Readonly<Record<string, Placement>>,
): string[] {
    return [...new Set(scanDeniedWindows(grid, placements).map(window => window.text))];
}

const REPLACEMENT_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Deterministically breaks every accidental denied-string window by
 * mutating one non-word cell inside it, in place. Unlike re-rolling the
 * whole board's filler and hoping, this is a guarantee regardless of how
 * large or sparse the grid is: a large, mostly-empty board (like the
 * generator's emergency fallback) has enough open runs that a bounded
 * number of full re-rolls is only ever probabilistic, not certain.
 *
 * `isWordCell` marks cells belonging to an actual placed word, which this
 * never touches -- if every cell in a flagged window happens to belong to
 * (possibly different) placed words with no filler cell to change, that
 * window is left alone rather than corrupting a legitimate word's spelling;
 * this can only happen when two separately placed words coincidentally
 * align across a shared diagonal, an extremely rare double coincidence.
 */
export function sanitizeAccidentalDeniedStrings(
    grid: string[][],
    placements: Readonly<Record<string, Placement>>,
    isWordCell: (row: number, col: number) => boolean,
    rng: () => number,
): void {
    for (let guard = 0; guard < 200; guard++) {
        const windows = scanDeniedWindows(grid, placements);
        if (windows.length === 0) return;
        for (const window of windows) {
            const mutableCell = window.cells.find(([r, c]) => !isWordCell(r, c));
            if (!mutableCell) continue;
            const [r, c] = mutableCell;
            const original = grid[r][c];
            let replacement = original;
            while (replacement === original) {
                replacement = REPLACEMENT_LETTERS[Math.floor(rng() * REPLACEMENT_LETTERS.length)];
            }
            grid[r][c] = replacement;
        }
    }
}
