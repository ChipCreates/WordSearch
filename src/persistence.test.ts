import { describe, it, expect, beforeEach } from "vitest";
import {
    loadSaveData, loadSaveDataSync, writeSaveData, normalizeSaveData,
    getLoadIssue, resetSaveAfterLoadIssue,
    DEFAULT_SAVE_DATA, CURRENT_SCHEMA_VERSION, type SaveData,
} from "./persistence";
import {
    legacyV1Save, legacyV2Save, legacyV3Save,
    advancedPlayerSave, level100PlayerSave, largeGardenSave,
    unlockedThemesSave, manyAchievementsSave,
    missingOptionalFieldsSave, malformedRecoverableSave,
} from "./test/fixtures/saves";
import { COMPLETED_ONBOARDING_SEEN, DEFAULT_ONBOARDING_SEEN } from "./onboarding";

const PRIMARY_KEY = "word_sprout_save_v1";

describe("Persistence Module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return default save data when no save exists", async () => {
    const data = await loadSaveData();
    // level 1 -> nothing to backfill, but the one-time backfill pass still
    // marks itself done so it doesn't re-run on every future load.
    expect(data).toEqual({ ...DEFAULT_SAVE_DATA, categoriesSeenBackfilled: true });
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
      // categoriesSeen backfill's own behavior, which has its own test below.
      categoriesSeenBackfilled: true,
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

    expect(loaded.version).toBe(4);
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
    expect(first.version).toBe(4);
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
    expect(loaded.version).toBe(4);
    expect(loaded.seeds).toBe(765);
    expect(loaded.fieldNotes.activeIds).toHaveLength(3);
  });
});

describe("WSP-0.3 fixture library migration coverage", () => {
  const fixtures: Record<string, Record<string, unknown>> = {
    legacyV1Save, legacyV2Save, legacyV3Save,
    advancedPlayerSave, level100PlayerSave, largeGardenSave,
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
