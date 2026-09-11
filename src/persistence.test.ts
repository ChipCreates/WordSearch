import { describe, it, expect, beforeEach } from "vitest";
import {
    loadSaveData, loadSaveDataSync, writeSaveData, normalizeSaveData,
    getLoadIssue, resetSaveAfterLoadIssue,
    DEFAULT_SAVE_DATA, CURRENT_SCHEMA_VERSION, type SaveData,
} from "./persistence";
import {
    legacyV1Save, legacyV2Save, legacyV3Save,
    advancedPlayerSave, level100PlayerSave, level150PlayerSaveCurrentShape, largeGardenSave,
    unlockedThemesSave, manyAchievementsSave,
    missingOptionalFieldsSave, malformedRecoverableSave,
} from "./test/fixtures/saves";
import { REGIONS } from "./regions";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementStats } from "./achievements";
import { getBotanistRank } from "./botanistRanks";
import { CATEGORY_NAMES } from "./backend";
import { COMPLETED_ONBOARDING_SEEN, DEFAULT_ONBOARDING_SEEN } from "./onboarding";

const PRIMARY_KEY = "word_sprout_save_v1";

describe("Persistence Module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return default save data when no save exists", async () => {
    const data = await loadSaveData();
    // level 1 -> nothing to backfill, but the one-time backfill passes still
    // mark themselves done so they don't re-run on every future load.
    expect(data).toEqual({ ...DEFAULT_SAVE_DATA, categoriesSeenBackfilled: true, regionRewardsBackfilled: true });
  });

  it("should write and load save data correctly", async () => {
    const customData: SaveData = {
      ...DEFAULT_SAVE_DATA,
      level: 12,
      highestUnlockedLevel: 12,
      seeds: 4500,
      difficultyMode: "challenging",
      unlockedAchievements: ["speed-sprouter", "word-weaver"],
      // Already backfilled -- isolates this round-trip test from the
      // categoriesSeen/region-reward backfills' own behavior, which have
      // their own tests below.
      categoriesSeenBackfilled: true,
      regionRewardsBackfilled: true,
    };

    await writeSaveData(customData);
    const loaded = await loadSaveData();
    expect(loaded).toEqual(customData);
  });

  it("should backfill categoriesSeen for a legacy player past level 1", async () => {
    const legacyData: SaveData = {
      ...DEFAULT_SAVE_DATA,
      level: 12,
      highestUnlockedLevel: 12,
      difficultyMode: "challenging",
      categoriesSeenBackfilled: false,
    };

    await writeSaveData(legacyData);
    const loaded = await loadSaveData();

    expect(loaded.categoriesSeenBackfilled).toBe(true);
    // Levels 1..11 on the challenging tier, same index formula getPuzzleWords uses
    expect(loaded.categoriesSeen).toHaveLength(11);
    expect(loaded.categoriesSeen).toContain("Architecture");
  });

  it("should migrate legacy keys and delete them after loading", async () => {
    localStorage.setItem("wordsearch.level", "5");
    localStorage.setItem("wordsearch.stars", "20");
    localStorage.setItem("wordsearch.difficultyMode", "challenging");
    localStorage.setItem("wordsearch.achievements", JSON.stringify(["speed-sprouter"]));

    const loaded = await loadSaveData();

    expect(loaded.level).toBe(5);
    expect(loaded.seeds).toBe(2000);
    expect(loaded.difficultyMode).toBe("challenging");
    expect(loaded.unlockedAchievements).toEqual(["speed-sprouter"]);

    // Verify legacy keys were removed
    expect(localStorage.getItem("wordsearch.level")).toBeNull();
    expect(localStorage.getItem("wordsearch.stars")).toBeNull();
    expect(localStorage.getItem("wordsearch.difficultyMode")).toBeNull();
    expect(localStorage.getItem("wordsearch.achievements")).toBeNull();

    // Verify primary key exists
    expect(localStorage.getItem("word_sprout_save_v1")).not.toBeNull();
  });

  it("initializes the power-up inventory when loading a pre-inventory save", async () => {
    localStorage.setItem("word_sprout_save_v1", JSON.stringify({
      ...DEFAULT_SAVE_DATA,
      version: 1,
      seeds: 275,
      powerupInventory: undefined,
    }));

    const loaded = await loadSaveData();

    expect(loaded.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(loaded.seeds).toBe(275);
    expect(loaded.powerupInventory["single-letter-sprout"]).toBe(0);
    expect(loaded.powerupInventory["lumina-cyclone"]).toBe(0);
  });

  it("marks pre-onboarding saves as returning players", async () => {
    localStorage.setItem("word_sprout_save_v1", JSON.stringify({ ...DEFAULT_SAVE_DATA, onboardingSeen: undefined, level: 8 }));

    const loaded = await loadSaveData();

    expect(Object.values(loaded.onboardingSeen.dismissed).every(Boolean)).toBe(true);
  });

  it("migrates a v2 frontier conservatively and is idempotent", async () => {
    localStorage.setItem("word_sprout_save_v1", JSON.stringify({
      ...DEFAULT_SAVE_DATA,
      version: 2,
      level: 10,
      highestUnlockedLevel: undefined,
      completedLevels: undefined,
      totalPuzzleCompletions: undefined,
      seeds: 123,
    }));

    const first = await loadSaveData();
    expect(first.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(first.highestUnlockedLevel).toBe(10);
    expect(first.completedLevels).toEqual(Array.from({ length: 9 }, (_, index) => index + 1));
    expect(first.level).toBe(10);

    await writeSaveData(first);
    const second = await loadSaveData();
    expect(second).toEqual(first);
  });

  it("preserves legacy achievement IDs while normalizing a migrated save", async () => {
    localStorage.setItem("word_sprout_save_v1", JSON.stringify({
      ...DEFAULT_SAVE_DATA,
      version: 2,
      level: 8,
      highestUnlockedLevel: undefined,
      completedLevels: undefined,
      unlockedAchievements: ["night-bloomer", "word-weaver"],
    }));

    const loaded = await loadSaveData();
    expect(loaded.unlockedAchievements).toEqual(["night-bloomer", "word-weaver"]);
  });

  it("initializes Field Notes without changing a legacy balance", async () => {
    localStorage.setItem("word_sprout_save_v1", JSON.stringify({
      ...DEFAULT_SAVE_DATA,
      version: 3,
      fieldNotes: undefined,
      seeds: 765,
    }));
    const loaded = await loadSaveData();
    expect(loaded.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(loaded.seeds).toBe(765);
    expect(loaded.fieldNotes.activeIds).toHaveLength(3);
  });
});

describe("WSP-2.2 region reward claims: exactly-once + retroactive-grant policy", () => {
  it("a save mid-region (past Glowing Grove, inside Sunlit Falls, not yet finished) is backfilled without any retroactive Seeds", async () => {
    localStorage.setItem("word_sprout_save_v1", JSON.stringify({
      ...DEFAULT_SAVE_DATA,
      version: 4,
      level: 25,
      highestUnlockedLevel: 25,
      completedLevels: Array.from({ length: 24 }, (_, i) => i + 1),
      seeds: 1000,
      regionRewardsBackfilled: false,
    }));

    const loaded = await loadSaveData();

    expect(loaded.regionRewardsBackfilled).toBe(true);
    // Glowing Grove (1-20) is fully behind this save -> its completion is
    // marked claimed. The frontier has also already crossed into Sunlit
    // Falls (21-30) -> its entry is marked claimed too. Neither Sunlit
    // Falls' own completion (level 30, not yet reached) nor anything about
    // Crystal Conservatory should be marked.
    expect(loaded.claimedRegionRewards.sort()).toEqual([
      "glowing-grove:completion",
      "sunlit-falls:entry",
    ]);
    // The policy is "no retroactive grants" -- the balance this save
    // already had is exactly what it has after the migration.
    expect(loaded.seeds).toBe(1000);
  });

  it("a save well past every region (level 100+) has every completion and entry marked claimed, still with no retroactive Seeds", async () => {
    localStorage.setItem("word_sprout_save_v1", JSON.stringify({
      ...DEFAULT_SAVE_DATA,
      version: 4,
      level: 137,
      highestUnlockedLevel: 137,
      completedLevels: Array.from({ length: 136 }, (_, i) => i + 1),
      seeds: 48_500,
      regionRewardsBackfilled: false,
    }));

    const loaded = await loadSaveData();

    expect(loaded.regionRewardsBackfilled).toBe(true);
    // All 6 completions + all 5 non-first-region entries (Glowing Grove has
    // no entry reward -- a new save already starts inside it).
    expect(loaded.claimedRegionRewards).toHaveLength(11);
    expect(loaded.claimedRegionRewards.sort()).toEqual([
      "cloudreach-summit:completion", "cloudreach-summit:entry",
      "crystal-conservatory:completion", "crystal-conservatory:entry",
      "glowing-grove:completion",
      "mosswood-hollows:completion", "mosswood-hollows:entry",
      "sunlit-falls:completion", "sunlit-falls:entry",
      "verdant-beyond:completion", "verdant-beyond:entry",
    ].sort());
    expect(loaded.seeds).toBe(48_500);
  });

  it("a brand new save (level 1) has nothing claimed -- every region reward is still available to earn normally", async () => {
    const loaded = await loadSaveData();
    expect(loaded.regionRewardsBackfilled).toBe(true);
    expect(loaded.claimedRegionRewards).toEqual([]);
  });

  it("the backfill is idempotent -- loading an already-backfilled save a second time changes nothing", async () => {
    localStorage.setItem("word_sprout_save_v1", JSON.stringify({
      ...DEFAULT_SAVE_DATA,
      highestUnlockedLevel: 25,
      completedLevels: Array.from({ length: 24 }, (_, i) => i + 1),
      seeds: 1000,
      regionRewardsBackfilled: false,
    }));

    const first = await loadSaveData();
    await writeSaveData(first);
    const second = await loadSaveData();

    expect(second).toEqual(first);
    expect(second.claimedRegionRewards).toEqual(first.claimedRegionRewards);
  });

  it("normalizes claimedRegionRewards defensively like every other collection field (non-array falls back to default)", () => {
    const loaded = normalizeSaveData({ ...DEFAULT_SAVE_DATA, claimedRegionRewards: "not-an-array" as unknown as string[] });
    expect(loaded.claimedRegionRewards).toEqual(DEFAULT_SAVE_DATA.claimedRegionRewards);
  });
});

describe("WSP-2.5 achievement id migrations", () => {
  it("preserves an already-earned \"daily-dew\" achievement under its renamed id", async () => {
    localStorage.setItem(PRIMARY_KEY, JSON.stringify({
      ...DEFAULT_SAVE_DATA,
      unlockedAchievements: ["night-bloomer", "daily-dew"],
    }));
    const loaded = await loadSaveData();
    expect(loaded.unlockedAchievements).toContain("categories-completed-10");
    expect(loaded.unlockedAchievements).not.toContain("daily-dew");
    expect(loaded.unlockedAchievements).toContain("night-bloomer");
  });

  it("preserves an already-earned \"zenith-climber\" achievement under its folded level-clears-50 id", async () => {
    localStorage.setItem(PRIMARY_KEY, JSON.stringify({
      ...DEFAULT_SAVE_DATA,
      unlockedAchievements: ["zenith-climber", "level-clears-25"],
    }));
    const loaded = await loadSaveData();
    expect(loaded.unlockedAchievements).toContain("level-clears-50");
    expect(loaded.unlockedAchievements).not.toContain("zenith-climber");
    expect(loaded.unlockedAchievements).toContain("level-clears-25");
  });

  it("de-duplicates if a save somehow already has both the old and new id", () => {
    const loaded = normalizeSaveData({
      ...DEFAULT_SAVE_DATA,
      unlockedAchievements: ["daily-dew", "categories-completed-10", "zenith-climber", "level-clears-50"],
    });
    expect(loaded.unlockedAchievements.filter(id => id === "categories-completed-10")).toHaveLength(1);
    expect(loaded.unlockedAchievements.filter(id => id === "level-clears-50")).toHaveLength(1);
  });

  it("leaves ids it doesn't recognize as renamed untouched", () => {
    const loaded = normalizeSaveData({
      ...DEFAULT_SAVE_DATA,
      unlockedAchievements: ["night-bloomer", "root-master"],
    });
    expect(loaded.unlockedAchievements).toEqual(["night-bloomer", "root-master"]);
  });
});

describe("WSP-2.5 bloomedRarityTiers -> bloomedRarityTierIds migration", () => {
  it("trusts a well-formed bloomedRarityTierIds array as-is", () => {
    const loaded = normalizeSaveData({
      ...DEFAULT_SAVE_DATA,
      bloomedRarityTierIds: ["Common", "Rare", "Common"],
    });
    // De-duplicated -- "distinct tiers", not an event log.
    expect(loaded.bloomedRarityTierIds).toEqual(["Common", "Rare"]);
  });

  it("reconstructs distinct tiers from currently-owned, fully-bloomed plants when only the legacy counter is present", () => {
    const loaded = normalizeSaveData({
      ...DEFAULT_SAVE_DATA,
      bloomedRarityTierIds: undefined, // simulate a save that predates this field -- only the legacy shape below is present
      bloomedRarityTiers: 2, // legacy raw counter shape, no unlockedAchievements entry to protect
      ownedPlants: ["moss-sprout", "emerald-fern", "crystal-succulent"],
      growthByPlant: { "moss-sprout": 100, "emerald-fern": 100, "crystal-succulent": 40 },
    } as unknown as Record<string, unknown>);
    // moss-sprout and emerald-fern are both Common (fully bloomed);
    // crystal-succulent isn't fully grown, so its tier isn't counted.
    expect(loaded.bloomedRarityTierIds).toEqual(["Common"]);
  });

  it("never revokes an already-earned verdant-voyager when the legacy counter can't be exactly reconstructed", () => {
    const loaded = normalizeSaveData({
      ...DEFAULT_SAVE_DATA,
      bloomedRarityTierIds: undefined,
      bloomedRarityTiers: 3, // legacy counter satisfied the old (broken) predicate
      unlockedAchievements: ["verdant-voyager"],
      // No owned/fully-bloomed plants recorded -- exact history is genuinely
      // unrecoverable, but the achievement must still hold after migration.
      ownedPlants: ["moss-sprout"],
      growthByPlant: {},
    } as unknown as Record<string, unknown>);
    expect(loaded.bloomedRarityTierIds.length).toBeGreaterThanOrEqual(3);
    expect(loaded.unlockedAchievements).toContain("verdant-voyager");
  });

  it("does not fabricate tiers for a save that never earned verdant-voyager, even with a nonzero legacy counter", () => {
    const loaded = normalizeSaveData({
      ...DEFAULT_SAVE_DATA,
      bloomedRarityTierIds: undefined,
      bloomedRarityTiers: 5,
      unlockedAchievements: [],
      ownedPlants: ["moss-sprout"],
      growthByPlant: {},
    } as unknown as Record<string, unknown>);
    // Nothing to protect -- the honest (empty) reconstruction stands, rather
    // than padding out to the old counter's value.
    expect(loaded.bloomedRarityTierIds).toEqual([]);
  });

  it("defaults to an empty set for a save with neither shape present", () => {
    const loaded = normalizeSaveData({ ...DEFAULT_SAVE_DATA });
    expect(loaded.bloomedRarityTierIds).toEqual([]);
  });
});

describe("WSP-0.3 fixture library migration coverage", () => {
  const fixtures: Record<string, Record<string, unknown>> = {
    legacyV1Save, legacyV2Save, legacyV3Save,
    advancedPlayerSave, level100PlayerSave, level150PlayerSaveCurrentShape, largeGardenSave,
    unlockedThemesSave, manyAchievementsSave,
    missingOptionalFieldsSave, malformedRecoverableSave,
  };

  for (const [name, fixture] of Object.entries(fixtures)) {
    it(`migrates "${name}" to the current schema without throwing or dropping progress`, async () => {
      localStorage.setItem(PRIMARY_KEY, JSON.stringify(fixture));
      const loaded = await loadSaveData();

      expect(loaded.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(getLoadIssue()).toBeNull();
      // Every array/record field must actually be that shape -- a
      // regression here is exactly what silently corrupted downstream
      // consumers like `new Set(...)` or `Object.values(...)`.
      expect(Array.isArray(loaded.unlockedAchievements)).toBe(true);
      expect(Array.isArray(loaded.categoriesSeen)).toBe(true);
      expect(Array.isArray(loaded.ownedPlants)).toBe(true);
      expect(Array.isArray(loaded.claimedRegionRewards)).toBe(true);
      expect(loaded.regionRewardsBackfilled).toBe(true);
      expect(loaded.ownedPlants.length).toBeGreaterThan(0);
      expect(typeof loaded.wateredTimestamps).toBe("object");
      expect(typeof loaded.growthByPlant).toBe("object");
      expect(typeof loaded.onboardingSeen).toBe("object");
      expect(typeof loaded.onboardingSeen.dismissed).toBe("object");
      expect(["easy", "standard", "challenging"]).toContain(loaded.difficultyMode);
      expect(["system", "sprout", "midnight"]).toContain(loaded.themeMode);
      expect(loaded.seeds).toBeGreaterThanOrEqual(0);
      expect(loaded.musicVolume).toBeGreaterThanOrEqual(0);
      expect(loaded.musicVolume).toBeLessThanOrEqual(1);
      expect(loaded.sfxVolume).toBeGreaterThanOrEqual(0);
      expect(loaded.sfxVolume).toBeLessThanOrEqual(1);
    });
  }

  it("recovers malformedRecoverableSave's well-formed fields exactly, and coerces the bad ones to defaults", () => {
    // Calls normalizeSaveData directly (not loadSaveData) to isolate
    // field-level coercion from the separate categoriesSeen backfill pass,
    // which legitimately repopulates categoriesSeen once coercion clears
    // the malformed value -- that's covered by the migration-coverage test
    // above, not this one.
    const loaded = normalizeSaveData(malformedRecoverableSave);

    // Well-formed fields survive untouched.
    expect(loaded.seeds).toBe(2500);
    expect(loaded.ownedPlants).toEqual(["moss-sprout", "emerald-fern"]);
    // Wrong-typed fields fall back to their defaults instead of propagating.
    expect(loaded.unlockedAchievements).toEqual(DEFAULT_SAVE_DATA.unlockedAchievements);
    expect(loaded.categoriesSeen).toEqual(DEFAULT_SAVE_DATA.categoriesSeen);
    expect(loaded.foundDiagonal).toBe(DEFAULT_SAVE_DATA.foundDiagonal);
    expect(loaded.wateredTimestamps).toEqual({});
    expect(loaded.growthByPlant).toEqual({});
    expect(loaded.unlockedThemes).toEqual(DEFAULT_SAVE_DATA.unlockedThemes);
    expect(loaded.difficultyMode).toBe(DEFAULT_SAVE_DATA.difficultyMode);
    expect(loaded.themeMode).toBe(DEFAULT_SAVE_DATA.themeMode);
    expect(loaded.musicVolume).toBe(1); // clamped from 5
    expect(loaded.sfxVolume).toBe(0); // clamped from -3
    // onboardingSeen is *present* here (just malformed: a plain string),
    // so it's not treated as "predates onboarding entirely" -- it
    // normalizes to a fresh, not-yet-seen state rather than "completed".
    expect(loaded.onboardingSeen).toEqual(DEFAULT_ONBOARDING_SEEN);
    expect(loaded.remedyCharges).toBe(DEFAULT_SAVE_DATA.remedyCharges);
    // Wrong-typed (a number, not a string) falls back to the default too.
    expect(loaded.longestBonusWordFound).toBe(DEFAULT_SAVE_DATA.longestBonusWordFound);
  });

  it("preserves a well-formed longestBonusWordFound (WSP-1.2)", () => {
    const loaded = normalizeSaveData({ ...DEFAULT_SAVE_DATA, longestBonusWordFound: "PHOTOSYNTHESIS" });
    expect(loaded.longestBonusWordFound).toBe("PHOTOSYNTHESIS");
  });

  for (const [name, fixture] of Object.entries(fixtures)) {
    it(`round-trips "${name}" (save -> load -> save -> compare) without drift`, async () => {
      localStorage.setItem(PRIMARY_KEY, JSON.stringify(fixture));
      const first = await loadSaveData();
      await writeSaveData(first);
      const second = await loadSaveData();
      expect(second).toEqual(first);
    });
  }
});

// WSP-2.7 -- beyond-level-100 certification of the level100PlayerSave /
// level150PlayerSaveCurrentShape fixtures specifically. The generic
// "migrates without throwing" / "round-trips without drift" loops above
// already exercise both fixtures structurally; this block asserts the
// sharper, WSP-2.2/2.3/2.5-specific claims those loops don't check on their
// own -- that a long-time player's region claims, achievement ids, and rank
// all come out correct, not just present and well-typed.
describe("WSP-2.7: beyond-level-100 fixture certification", () => {
  it("level100PlayerSave (a save predating WSP-2.2/2.3/2.5, still in its pre-Tier-2 shape) migrates to the current schema correctly", async () => {
    localStorage.setItem(PRIMARY_KEY, JSON.stringify(level100PlayerSave));
    const loaded = await loadSaveData();

    // bloomedRarityTiers (old raw counter, 6) -> bloomedRarityTierIds (new
    // shape). This save has no ownedPlants/growthByPlant of its own and
    // never earned verdant-voyager, so best-effort reconstruction correctly
    // yields nothing recoverable -- see normalizeBloomedRarityTierIds's
    // documented policy in persistence.ts. This is intentional, not data
    // loss: there was never a real record of which tiers were bloomed under
    // the old counter, and nothing here entitles this save to a fabricated
    // one.
    expect(Array.isArray(loaded.bloomedRarityTierIds)).toBe(true);
    expect(loaded.bloomedRarityTierIds).toEqual([]);

    // Frontier (137) is past every region's end -- backfillRegionRewardClaims
    // must mark every region's completion (and every entry past
    // Glowing Grove) claimed, exactly once, with NO retroactive Seeds
    // (the documented "no retroactive grants" policy) -- i.e. this save's
    // 48,500 seeds figure from the fixture is untouched by the migration.
    for (const region of REGIONS) {
      const key = `${region.id}:completion`;
      expect(loaded.claimedRegionRewards).toContain(key);
      if (region.entryReward) expect(loaded.claimedRegionRewards).toContain(`${region.id}:entry`);
    }
    expect(loaded.regionRewardsBackfilled).toBe(true);
    expect(loaded.seeds).toBe(48_500); // unchanged -- no retroactive grant

    // Botanist Rank at level 137 is Cosmic Conservator, same as at level 41
    // -- this is a read of botanistRanks.ts driven by the loaded frontier,
    // not a persisted field, but it's exactly the kind of "does this save's
    // level correctly drive every other system" check this issue exists for.
    expect(getBotanistRank(loaded.highestUnlockedLevel).title).toBe("Cosmic Conservator");

    // Achievement evaluation over this save's actual lifetime stats must not
    // throw, and level-clears-100 (100 <= 136) must be satisfied.
    const stats: AchievementStats = {
      levelsCompleted: loaded.levelsCompleted,
      seeds: loaded.seeds,
      categoriesSeen: loaded.categoriesSeen.length,
      foundDiagonal: loaded.foundDiagonal,
      totalCategories: CATEGORY_NAMES.length,
      bonusWordsFound: loaded.bonusWordsFound,
      levelsCompletedWithoutHint: loaded.levelsCompletedWithoutHint,
      maxBonusWordsInLevel: loaded.maxBonusWordsInLevel,
      reverseWordsFound: loaded.reverseWordsFound,
      plantsBloomed: loaded.plantsBloomed,
      bloomedRarityTiers: loaded.bloomedRarityTierIds.length,
      uniqueCategoriesCompleted: loaded.uniqueCategoriesCompleted,
      powerupsUsed: loaded.powerupsUsed,
    };
    let satisfied: string[] = [];
    expect(() => { satisfied = evaluateAchievements(stats); }).not.toThrow();
    expect(satisfied).toContain("level-clears-100");
    expect(satisfied.every(id => ACHIEVEMENTS.some(a => a.id === id))).toBe(true);
  });

  it("level150PlayerSaveCurrentShape (already on the current schema) round-trips completely inert -- no double-grant, no re-backfill, no id mangling", async () => {
    localStorage.setItem(PRIMARY_KEY, JSON.stringify(level150PlayerSaveCurrentShape));
    const loaded = await loadSaveData();

    // Already-current bloomedRarityTierIds must survive verbatim (as a
    // deduplicated set), not be reprocessed through the legacy-counter
    // reconstruction path.
    expect(new Set(loaded.bloomedRarityTierIds)).toEqual(new Set(["Common", "Rare", "Epic", "Mythic"]));

    // claimedRegionRewards was already fully populated and
    // regionRewardsBackfilled was already true -- the one-time backfill must
    // be a true no-op here (same claim set in, same claim set out; no
    // duplicate keys), and Seeds must be exactly what the fixture says
    // (62,000), never bumped by a second grant.
    const expectedClaims = new Set(level150PlayerSaveCurrentShape.claimedRegionRewards as string[]);
    expect(new Set(loaded.claimedRegionRewards)).toEqual(expectedClaims);
    expect(loaded.claimedRegionRewards.length).toBe(expectedClaims.size); // no duplicates introduced
    expect(loaded.seeds).toBe(62_000);

    // Achievement ids already use the current, post-rename scheme -- the
    // migration map is keyed only by the two legacy ids (daily-dew,
    // zenith-climber), so a save already using categories-completed-10 /
    // level-clears-50 must pass through completely unchanged, not be
    // re-migrated or duplicated.
    const inputIds = level150PlayerSaveCurrentShape.unlockedAchievements as string[];
    expect(new Set(loaded.unlockedAchievements)).toEqual(new Set(inputIds));
    expect(loaded.unlockedAchievements.every(id => ACHIEVEMENTS.some(a => a.id === id))).toBe(true);

    expect(getBotanistRank(loaded.highestUnlockedLevel).title).toBe("Cosmic Conservator");

    // Round-trip stability: saving what was just loaded must produce
    // byte-for-byte the same normalized shape (the same guarantee the
    // generic round-trip loop above checks, repeated here so this
    // WSP-2.7-owned test doesn't depend on that other block for its own
    // certification claim).
    await writeSaveData(loaded);
    const reloaded = await loadSaveData();
    expect(reloaded).toEqual(loaded);
  });
});

describe("WSP-0.3 forward-version and corruption safety", () => {
  it("never interprets a whole-blob-corrupt save as an older schema, and preserves the raw data", async () => {
    localStorage.setItem(PRIMARY_KEY, "{not valid json");
    const loaded = await loadSaveData();

    expect(loaded).toEqual(DEFAULT_SAVE_DATA);
    expect(getLoadIssue()?.kind).toBe("corrupted");
    expect(localStorage.getItem(`${PRIMARY_KEY}_corrupted_backup`)).toBe("{not valid json");
    // The corrupted blob itself is left in place too -- nothing destructive happens automatically.
    expect(localStorage.getItem(PRIMARY_KEY)).toBe("{not valid json");
  });

  it("treats valid JSON that isn't a plausible save object as corrupted, not as empty data", async () => {
    localStorage.setItem(PRIMARY_KEY, JSON.stringify([1, 2, 3]));
    await loadSaveData();
    expect(getLoadIssue()?.kind).toBe("corrupted");
  });

  it("never downgrade-migrates or overwrites a save from a newer schema version", async () => {
    const futureSave = JSON.stringify({ ...DEFAULT_SAVE_DATA, version: CURRENT_SCHEMA_VERSION + 1, seeds: 999_999 });
    localStorage.setItem(PRIMARY_KEY, futureSave);

    const loaded = await loadSaveData();
    expect(loaded.seeds).not.toBe(999_999); // temporary, unpersisted defaults for this session only
    const issue = getLoadIssue();
    expect(issue?.kind).toBe("future-version");
    expect(issue && "foundVersion" in issue ? issue.foundVersion : null).toBe(CURRENT_SCHEMA_VERSION + 1);
    // The real, newer save must still be exactly as it was -- never touched.
    expect(localStorage.getItem(PRIMARY_KEY)).toBe(futureSave);
  });

  it("refuses to write while a load issue is outstanding, and only resetSaveAfterLoadIssue lifts it", async () => {
    const futureSave = JSON.stringify({ ...DEFAULT_SAVE_DATA, version: CURRENT_SCHEMA_VERSION + 1, seeds: 999_999 });
    localStorage.setItem(PRIMARY_KEY, futureSave);
    await loadSaveData();
    expect(getLoadIssue()).not.toBeNull();

    await writeSaveData({ seeds: 42 });
    // The newer save must be completely untouched by that write attempt.
    expect(localStorage.getItem(PRIMARY_KEY)).toBe(futureSave);

    // Merely clearing the flag without resetting the underlying data would
    // deadlock: the very next write re-parses the still-present future
    // save and immediately re-detects the same issue. resetSaveAfterLoadIssue
    // avoids that by replacing the primary save outright -- the only
    // "explicit user action" this module offers.
    await resetSaveAfterLoadIssue();
    expect(getLoadIssue()).toBeNull();
    await writeSaveData({ seeds: 42 });
    expect(getLoadIssue()).toBeNull();
    const loaded = await loadSaveData();
    expect(loaded.seeds).toBe(42);
    expect(loaded.version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("loadSaveDataSync applies the same corruption/future-version safety as the async loader", () => {
    localStorage.setItem(PRIMARY_KEY, "{not valid json");
    const loaded = loadSaveDataSync();
    expect(loaded).toEqual(DEFAULT_SAVE_DATA);
    expect(getLoadIssue()?.kind).toBe("corrupted");
  });

  it("normalizeSaveData({}) treats a genuinely bare object as pre-onboarding legacy data", () => {
    // Deliberate, established behavior (see the "marks pre-onboarding
    // saves as returning players" test above): an object with no
    // `onboardingSeen` key at all reads as "a real save predating that
    // field", not "no save yet" -- callers that mean the latter (a brand
    // new player) pass DEFAULT_SAVE_DATA directly instead of `{}` (see
    // writeSaveData's own null-vs-`{}` handling).
    expect(normalizeSaveData({})).toEqual({ ...DEFAULT_SAVE_DATA, onboardingSeen: COMPLETED_ONBOARDING_SEEN });
  });
});
