import { describe, expect, it } from "vitest";
import { formatAuditReport, runPuzzleAudit } from "./audit-puzzles";

// WSP-0.2's certification requirement: generate at least 50,000 boards
// across every difficulty, region, and grid size, and report generation
// failures, retry counts, direction/diagonal distribution, and duplicate
// incidents -- runnable standalone (`npm run audit:puzzles`) ahead of any
// release candidate, and cheap enough to run as part of the normal suite
// too so a generator regression gets caught immediately, not just before
// a release.
const BOARD_COUNT = 50_000;

describe("puzzle generator audit (WSP-0.2)", () => {
    it(`generates ${BOARD_COUNT} boards with zero validity failures and zero content-safety hits`, async () => {
        const report = await runPuzzleAudit(BOARD_COUNT);
        console.log(formatAuditReport(report));

        expect(report.boardsGenerated).toBeGreaterThan(0);
        expect(report.validityFailures).toEqual([]);
        expect(report.contentSafetyHits).toEqual([]);
    }, 180_000);
});
