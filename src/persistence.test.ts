import { describe, it, expect, beforeEach } from "vitest";
import { loadSaveData, writeSaveData, DEFAULT_SAVE_DATA, type SaveData } from "./persistence";

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
