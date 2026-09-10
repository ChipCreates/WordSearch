/**
 * A tiny deterministic linear-congruential generator. Given the same seed it
 * always produces the same sequence of `() => number` calls in [0, 1), which
 * is what lets a puzzle generation run be reproduced byte-for-byte from a
 * single integer -- essential for reporting and re-investigating a specific
 * bad board found by the audit script (see scripts/audit-puzzles.ts) without
 * needing to capture or replay the whole request payload.
 */
export function createSeededRng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}
