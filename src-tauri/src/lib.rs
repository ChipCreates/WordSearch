mod categories;
mod dictionary;
use categories::{Tier, CATEGORIES};
use dictionary::dictionary;
use std::fs;

#[tauri::command]
fn validate_word(word: String) -> bool {
    dictionary().binary_search(&word.as_str()).is_ok()
}

#[derive(serde::Serialize)]
struct PuzzleWords {
    category: String,
    words: Vec<String>,
}

#[tauri::command]
fn get_puzzle_words(count: usize, max_length: usize, level: usize, tier: String) -> PuzzleWords {
    use rand::seq::SliceRandom;
    use rand::thread_rng;

    let mut rng = thread_rng();

    let wanted_tier = if tier == "challenging" { Tier::Challenging } else { Tier::Standard };
    let pool: Vec<&categories::Category> = CATEGORIES.iter().filter(|c| c.tier == wanted_tier).collect();
    let category = pool[(level.saturating_sub(1)) % pool.len()];

    let mut valid_words: Vec<&str> = category
        .words
        .iter()
        .filter(|w| w.len() <= max_length)
        .copied()
        .collect();

    valid_words.shuffle(&mut rng);

    PuzzleWords {
        category: category.name.to_string(),
        words: valid_words.into_iter().take(count).map(|s| s.to_string()).collect(),
    }
}

// save_game_state/load_game_state intentionally use raw std::fs against a
// fixed, non-user-influenced app_data_dir path rather than tauri-plugin-fs
// -- so they sit outside the capability/scope system capabilities/*.json
// otherwise fully describes. Safe (the path isn't attacker- or
// user-controllable), but worth knowing before assuming
// capabilities/default.json is the complete picture of this app's fs access.
#[tauri::command]
fn save_game_state(app: tauri::AppHandle, state: String) -> Result<(), String> {
    use tauri::Manager;
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let save_path = app_dir.join("save_data.json");
    fs::write(save_path, state).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_game_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri::Manager;
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let save_path = app_dir.join("save_data.json");
    if save_path.exists() {
        let content = fs::read_to_string(save_path).map_err(|e| e.to_string())?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            validate_word,
            get_puzzle_words,
            save_game_state,
            load_game_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_puzzle_words_never_panics() {
        for level in 1..=50 {
            for tier in ["standard", "challenging"] {
                let puzzle = get_puzzle_words(5, 10, level, tier.to_string());
                assert!(!puzzle.category.is_empty());
            }
        }
    }

    #[test]
    fn test_validate_word_edge_cases() {
        assert!(!validate_word("".to_string()));
        assert!(!validate_word("12345".to_string()));
        assert!(!validate_word("!@#$%^".to_string()));
        assert!(!validate_word("A".repeat(100)));
    }

    // Asserts every (tier, level) pair against data/category_order.json --
    // the same fixture scripts/gen_categories.py emits from its own
    // DISPLAY_NAMES source of truth. Replaces a 2-spot-check version of
    // this test that only ever verified level 1 and 2 of "standard";
    // backend.test.ts asserts the identical fixture from the TS side, so a
    // web/Tauri category-order drift at any level, in either tier, now
    // fails a test instead of only being noticed by a player.
    #[test]
    fn test_category_selection_parity() {
        let fixture_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../data/category_order.json");
        let fixture_raw = std::fs::read_to_string(&fixture_path)
            .unwrap_or_else(|e| panic!("failed to read {:?}: {}", fixture_path, e));
        let fixture: std::collections::HashMap<String, Vec<String>> =
            serde_json::from_str(&fixture_raw).expect("fixture should be valid JSON");

        assert!(!fixture.is_empty(), "fixture should list at least one tier");
        for (tier, names) in &fixture {
            assert!(!names.is_empty(), "tier {tier} should list at least one category");
            for (i, expected_name) in names.iter().enumerate() {
                let level = i + 1;
                let puzzle = get_puzzle_words(5, 10, level, tier.clone());
                assert_eq!(&puzzle.category, expected_name, "tier={tier} level={level}");
            }
        }
    }

    #[test]
    fn test_save_data_schema_validity() {
        // Matches the flat shape src/persistence.ts's SaveData/writeSaveData
        // actually produces -- no {version, data: {...}} envelope. This is
        // the exact JSON `save_game_state` receives over IPC.
        let sample_json = r#"{"version":1,"level":5,"seeds":250,"unlockedAchievements":["botanist_novice"],"levelsCompleted":4,"categoriesSeen":["Animals"],"foundDiagonal":false,"ownedPlants":["synth_orchid"],"wateredTimestamps":{"synth_orchid":1700000000},"growthByPlant":{"synth_orchid":2},"difficultyMode":"standard","themeMode":"system","musicMuted":false,"musicVolume":0.5,"sfxMuted":false,"sfxVolume":0.5}"#;
        let parsed: Result<serde_json::Value, _> = serde_json::from_str(sample_json);
        assert!(parsed.is_ok());
        let val = parsed.unwrap();
        assert_eq!(val["version"], 1);
        assert_eq!(val["level"], 5);
        assert_eq!(val["seeds"], 250);
        assert!(val.get("data").is_none(), "SaveData is flat -- no nested `data` envelope");
    }

    #[test]
    fn test_word_length_filtering() {
        let p = get_puzzle_words(10, 5, 1, "standard".to_string());
        for word in p.words {
            assert!(word.len() <= 5, "Word {} exceeded max length of 5", word);
        }
    }
}
