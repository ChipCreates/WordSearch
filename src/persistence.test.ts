import { describe, it, expect, beforeEach } from "vitest";
import { loadSaveData, writeSaveData, DEFAULT_SAVE_DATA, type SaveData } from "./persistence";

describe("Persistence Module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return default save data when no save exists", async () => {
    const data = await loadSaveData();
    expect(data).toEqual(DEFAULT_SAVE_DATA);
  });

  it("should write and load save data correctly", async () => {
    const customData: SaveData = {
      ...DEFAULT_SAVE_DATA,
      level: 12,
      stars: 45,
      difficultyMode: "challenging",
      unlockedAchievements: ["speed-sprouter", "word-weaver"],
    };

    await writeSaveData(customData);
    const loaded = await loadSaveData();
    expect(loaded).toEqual(customData);
  });

  it("should migrate legacy keys and delete them after loading", async () => {
    localStorage.setItem("wordsearch.level", "5");
    localStorage.setItem("wordsearch.stars", "20");
    localStorage.setItem("wordsearch.difficultyMode", "challenging");
    localStorage.setItem("wordsearch.achievements", JSON.stringify(["speed-sprouter"]));

    const loaded = await loadSaveData();

    expect(loaded.level).toBe(5);
    expect(loaded.stars).toBe(20);
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
});
