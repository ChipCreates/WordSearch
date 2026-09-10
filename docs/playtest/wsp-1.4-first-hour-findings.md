# WSP-1.4 — Early playtest checkpoint findings

Per the release plan (`WordSprout_1.0_Tier0-1_Issues.md`, WSP-1.4), this
checkpoint runs a fresh-save, first-time-player session once onboarding
(1.1), bonus-word feedback (1.2), and the economy (1.3) are all in a
testable state together, and catches first-hour problems before their
copy/timing is treated as final.

**Session:** fresh save, `release/1.0`, desktop (Chrome) and mobile
(Galaxy S24 Ultra emulation, Edge), levels 1–10, no instructions given
going in. Facilitated and played by the project owner; findings triaged
and fixed live rather than filed as a separate backlog, since the session
ran directly against the release branch.

Each entry below separates what was literally observed from what it was
judged to mean, per the checkpoint's own acceptance criteria.

---

## 1. Onboarding coachmark rendered over the level-complete celebration

**Observation:** immediately after finishing level 1, the "Grow your
garden" coachmark appeared as a spotlight cutting out a blank box near the
header, overlapping the "Level 1 Complete!" screen underneath it.

**Interpretation:** `levelsCompleted` increments the instant a level
finishes, well before the delayed celebration animation and success
overlay actually appear. The coachmark had no guard against showing
during that window, and its spotlight — aimed at a real anchor (the Seed
pill) that was itself hidden behind the success overlay's backdrop —
rendered as an empty cutout instead of pointing at anything visible.

**Fix:** suppress the real coachmark while `levelComplete` is true; it now
only shows once the player is back on a fresh puzzle. (`d12ac00`)

## 2. Onboarding coachmark queue could stall indefinitely on mobile

**Observation:** on a 375×812 mobile viewport, the "Bonus sprouts"
coachmark rendered pinned near the top-left of the screen, anchored to
nothing recognizable, instead of pointing at a real element.

**Interpretation:** two compounding bugs. First, the coachmark queue only
ever advanced past a step once it was *dismissed*, never because its
anchor was simply unusable — and the mobile layout hides the entire card
holding "bonus"'s anchor (`.ws-level-goal-card { display: none }` under
767px), so that step could never be dismissed there, permanently blocking
"garden" and "store" behind it. Second, a fallback meant only to keep
jsdom's tests passing (jsdom always reports zero-size rects, so "just use
the first match anyway" was needed there) was firing unconditionally,
including in real browsers where a zero-size rect only ever means
genuinely hidden — so a real hidden anchor got the same "render it
anyway" treatment.

**Fix:** the coachmark now tries every pending step in order and shows
the first whose anchor is actually live; the jsdom fallback is gated on
an actual jsdom-environment check instead of firing unconditionally.
(`d0ce392`)

## 3. No bonus-word indicator existed on mobile at all

**Observation:** the compact mobile board header showed target-word
progress ("0/3") but no equivalent for bonus words, even when the puzzle
had a bonus goal.

**Interpretation:** the desktop bonus-goal banner lives inside
`.ws-level-goal-card`, which mobile hides entirely in favor of a stripped
header — the bonus indicator was never ported over, not deliberately
omitted.

**Fix:** added a second stacked line ("Bonus X/Y") to the mobile header,
which also gave the onboarding "bonus" step a real anchor on mobile for
the first time (closing part of finding #2 at the source, not just
routing around it). (`a0d0de5`)

## 4. Achievement banner surfaced mid-celebration; mobile hang time felt long

**Observation:** same shape as finding #1 — an achievement toast could
appear before the level-complete celebration had played out. Separately,
on mobile the banner's full-screen dimmed/blurred scrim stayed up for the
same 6 seconds as desktop's small corner toast, and felt noticeably
longer given the fuller-screen treatment.

**Interpretation:** achievement evaluation reacts to stats (Seeds,
`levelsCompleted`) that update at the same premature moment as finding
#1, with no equivalent guard.

**Fix:** gated behind `levelComplete`/`showSuccessOverlay` the same way;
gave mobile its own shorter duration (3.5s vs. desktop's 6s). Confirmed
against a real device (playtester's own S24 Ultra, Edge). (`b142eb0`)

## 5. Bonus Goal row disappeared entirely on a bonus-less puzzle; duplicate found-word count

**Observation:** at level 8, the level-goal card's "Bonus Goal" row was
completely absent (no row, no count), where every other level showed it.
The Found Words side panel also showed its own found-word count,
duplicating the one already in the level-goal card above the board.

**Interpretation:** the row was conditionally rendered only when the
puzzle generator successfully placed at least one bonus candidate for
that specific board — a real puzzle-generation possibility, not a bug,
but the row vanishing rather than saying anything left the player unsure
whether the feature had broken.

**Fix (player's call):** the row now always renders, saying "No bonus
words this level" / "No bonus this level" when there's nothing to
advertise, rather than disappearing. Dropped the redundant found-word
count from the Found Words panel. (`85530be`)

## 6. Bonus counter silently capped at the puzzle's nominal goal

**Observation:** a puzzle advertised "2 hidden bonus words" and the header
showed "Bonus 2/2" after finding two — but the player had actually found
five bonus words that level (visible in the Found Words panel's own
list), and the header counter never moved past 2/2.

**Interpretation:** the bonus-goal count is the generator's own placed
candidates, not a hard ceiling — any real dictionary word not on the
target list counts as a bonus find. The displayed progress was explicitly
clamped (`Math.min`) to the goal count, silently hiding the true total
once a player exceeded it.

**Fix:** dropped the clamp everywhere it fed a displayed count. (`609f19c`)

## 7. A target's reverse reading could swallow a different real word; no visible remedy feedback

**Observation:** with target word LOOP on the board, dragging the same
four cells backwards (spelling POOL, a different real word) was rejected
rather than credited as a bonus. Separately, earning a Garden Remedy
charge from a gardening-vocabulary bonus word had no visible feedback on
the board.

**Interpretation:** `classifyWordSelection` checked "does either
direction match a target" as one combined test before ever considering
bonus eligibility, so a target's reverse reading always won even when it
spelled a genuinely different word. The remedy mention only ever lived in
an aria-live status string for screen readers, never anything a sighted
player would see.

**Fix (player's call, on the LOOP/POOL question):** each direction is now
judged independently and in priority order — the dragged direction's own
match (target, then bonus) wins; only if neither applies does the reverse
get a turn, which still correctly covers "a target simply dragged
backwards" (CAT via TAC) without swallowing a distinct second word.
`bonusDiscovery` now carries `earnedRemedy` through to the on-board toast.
(`652023e`)

## 8. No in-play signal that the garden needed attention

**Observation:** no feedback surfaced during play when an owned plant was
overdue for watering or affordable to fertilize — a player would only
find out by visiting the Garden directly.

**Interpretation / design discussion:** the playtester's first instinct
(a per-plant breakdown, "X needs watering", "grow Y for N Seeds") was
deliberately scaled back after reasoning through what it would feel like
with a large collection — since many plants share the same watering
cooldown, a detailed toast could read as a wall of nagging the more
plants a player owns, working against the game's relaxing tone (their own
phrase: "approaches Tamagotchi territory"). Landed on a single, generic,
constant-size signal instead, and explicitly informational/passive — no
action buttons, no navigation, the player decides entirely on their own
whether and where to act.

**Shipped:** a Snackbar reading "🌱 Your garden needs tending.", checked
on a fixed 15-minute real-time cadence (not tied to level completions or
garden size). (`a9b5068`)

---

## Outcome

Every finding above was fixed inline on `release/1.0` during the session
rather than deferred — full test suite green (574/574) and `tsc --noEmit`
clean as of the last fix. No open follow-up issues against WSP-1.1/1.2/1.3
remain from this pass.

This checkpoint is complete per its acceptance criteria: a fresh-save
session was run, observations and interpretations were kept distinct
above, and every surfaced problem was addressed before being treated as
final. A later, broader playtest pass (30-minute / 2-hour / returning
session / accessibility) remains separately scoped under Tier 6 of the
release plan and is not a substitute for this checkpoint or vice versa.
