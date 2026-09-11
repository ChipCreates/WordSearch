mod categories;
mod dictionary;
mod regions;
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
fn get_puzzle_words(
    count: usize,
    max_length: usize,
    level: usize,
    tier: String,
    category_name: Option<String>,
    exclude_words: Vec<String>,
    region_id: Option<String>,
) -> PuzzleWords {
    use rand::seq::SliceRandom;
    use rand::thread_rng;

    let mut rng = thread_rng();

    // An explicit category name (custom "favorite categories" mode) wins
    // over the tier pool -- and over region_id below -- the caller has
    // already picked which category to show at this level, from whichever
    // tier it happens to belong to. Region bias (WSP-2.3) only ever
    // influences which category gets *auto-selected* from the tier pool;
    // it never overrides a player's explicit favorite.
    let category = if let Some(name) = category_name {
        CATEGORIES.iter().find(|c| c.name == name)
    } else {
        let wanted_tier = match tier.as_str() {
            "easy" => Tier::Easy,
            "challenging" => Tier::Challenging,
            _ => Tier::Standard,
        };
        let pool: Vec<&categories::Category> = CATEGORIES.iter().filter(|c| c.tier == wanted_tier).collect();
        if pool.is_empty() {
            None
        } else {
            match region_id.as_deref().and_then(regions::RegionId::from_str) {
                Some(region) => {
                    let bias = regions::category_bias(region);
                    let sequence = regions::build_biased_sequence(&pool, bias.favored, bias.weight);
                    Some(sequence[(level.saturating_sub(1)) % sequence.len()])
                }
                None => Some(pool[(level.saturating_sub(1)) % pool.len()]),
            }
        }
    };

    let Some(category) = category else {
        return PuzzleWords { category: String::new(), words: Vec::new() };
    };

    let excluded: std::collections::HashSet<&str> = exclude_words.iter().map(|s| s.as_str()).collect();
    let candidates: Vec<&str> = category.words.iter().filter(|w| w.len() <= max_length).copied().collect();
    let fresh: Vec<&str> = candidates.iter().filter(|w| !excluded.contains(*w)).copied().collect();
    let mut valid_words: Vec<&str> = if fresh.len() >= count { fresh } else { candidates };

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
            for tier in ["easy", "standard", "challenging"] {
                let puzzle = get_puzzle_words(5, 10, level, tier.to_string(), None, vec![], None);
                assert!(!puzzle.category.is_empty());
            }
        }
    }

    #[test]
    fn test_get_puzzle_words_with_region_bias_never_panics() {
        // Every region against every tier and a healthy level spread,
        // including well past level 100 (WSP-2.7's "beyond level 100"
        // concern) -- a region's bias must keep producing a valid category
        // regardless of how far past its own nominal level range play goes.
        let region_ids = [
            "glowing-grove", "sunlit-falls", "crystal-conservatory",
            "mosswood-hollows", "cloudreach-summit", "verdant-beyond",
        ];
        for region_id in region_ids {
            for tier in ["easy", "standard", "challenging"] {
                for level in [1, 10, 25, 50, 75, 100, 150] {
                    let puzzle = get_puzzle_words(
                        5, 10, level, tier.to_string(), None, vec![], Some(region_id.to_string()),
                    );
                    assert!(!puzzle.category.is_empty(), "region={region_id} tier={tier} level={level}");
                }
            }
        }
    }

    #[test]
    fn test_region_bias_never_overrides_an_explicit_category_name() {
        // Favorites-mode precedence (WSP-2.3 acceptance criteria): an
        // explicit category_name must win regardless of region_id.
        let p = get_puzzle_words(
            5, 10, 1, "standard".to_string(), Some("Mythology".to_string()), vec![],
            Some("glowing-grove".to_string()),
        );
        assert_eq!(p.category, "Mythology");
    }

    #[test]
    fn test_unrecognized_region_id_falls_back_to_the_unbiased_pool() {
        // An id this native build doesn't recognize (e.g. a future region
        // added web-side before this binary is updated) must degrade to the
        // plain tier-pool cycle, not panic or return an empty category.
        let biased = get_puzzle_words(5, 10, 1, "standard".to_string(), None, vec![], None);
        let unrecognized = get_puzzle_words(
            5, 10, 1, "standard".to_string(), None, vec![], Some("not-a-real-region".to_string()),
        );
        assert_eq!(biased.category, unrecognized.category);
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
                let puzzle = get_puzzle_words(5, 10, level, tier.clone(), None, vec![], None);
                assert_eq!(&puzzle.category, expected_name, "tier={tier} level={level}");
            }
        }
    }

    // WSP-2.3's required parity check: confirms get_puzzle_words' region
    // bias (Rust/native) and pickCategoryForLevel/getPuzzleWords' region
    // bias (TS/web, asserted independently in backend.test.ts's identically
    // named describe block) produce the same category for the same
    // (region, tier, level) inputs. Both sides compute their own "expected"
    // sequence from the exact same two JSON fixtures --
    // data/category_order.json (the unbiased tier pool order) and
    // data/region_category_bias.json (the favored-category lists and
    // weights) -- using the weighting rule documented on
    // regions::build_biased_sequence / src/regionTuning.ts's
    // buildBiasedCategorySequence. If get_puzzle_words' hand-maintained
    // regions::category_bias table (or its weighting logic) ever drifts
    // from data/region_category_bias.json, or from backend.ts's TS
    // implementation, this test catches the first and backend.test.ts's
    // equivalent catches the second -- together they're the "paired tests,
    // one per platform's test infrastructure" WSP-2.3 asks for.
    #[test]
    fn test_region_category_bias_parity() {
        let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        let order_path = manifest_dir.join("../data/category_order.json");
        let bias_path = manifest_dir.join("../data/region_category_bias.json");

        let order_raw = std::fs::read_to_string(&order_path)
            .unwrap_or_else(|e| panic!("failed to read {:?}: {}", order_path, e));
        let order: std::collections::HashMap<String, Vec<String>> =
            serde_json::from_str(&order_raw).expect("category_order.json should be valid JSON");

        let bias_raw = std::fs::read_to_string(&bias_path)
            .unwrap_or_else(|e| panic!("failed to read {:?}: {}", bias_path, e));
        #[derive(serde::Deserialize)]
        struct BiasEntry {
            #[serde(rename = "favoredCategories")]
            favored_categories: Vec<String>,
            weight: usize,
        }
        let bias: std::collections::HashMap<String, BiasEntry> =
            serde_json::from_str(&bias_raw).expect("region_category_bias.json should be valid JSON");

        assert!(!order.is_empty());
        assert!(!bias.is_empty());

        for (region_id, entry) in &bias {
            let favored: std::collections::HashSet<&str> =
                entry.favored_categories.iter().map(|s| s.as_str()).collect();
            for (tier, names) in &order {
                // Build the same weighted sequence the parity contract
                // documents, directly from the fixture data -- not by
                // calling regions::build_biased_sequence, so this test
                // would still catch that function itself drifting from the
                // documented rule, not just from the fixture.
                let mut expected_sequence: Vec<&str> = Vec::new();
                for name in names {
                    let times = if favored.contains(name.as_str()) { entry.weight.max(1) } else { 1 };
                    for _ in 0..times {
                        expected_sequence.push(name.as_str());
                    }
                }
                assert!(!expected_sequence.is_empty(), "region={region_id} tier={tier}");

                for (i, expected_name) in expected_sequence.iter().enumerate() {
                    let level = i + 1;
                    let puzzle = get_puzzle_words(
                        5, 10, level, tier.clone(), None, vec![], Some(region_id.clone()),
                    );
                    assert_eq!(
                        &puzzle.category, expected_name,
                        "region={region_id} tier={tier} level={level}",
                    );
                }
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
        let p = get_puzzle_words(10, 5, 1, "standard".to_string(), None, vec![], None);
        for word in p.words {
            assert!(word.len() <= 5, "Word {} exceeded max length of 5", word);
        }
    }

    #[test]
    fn test_custom_category_and_exclusion() {
        // Explicit category_name overrides the tier pool entirely.
        let p = get_puzzle_words(5, 10, 1, "standard".to_string(), Some("Mythology".to_string()), vec![], None);
        assert_eq!(p.category, "Mythology");

        // Excluded words are avoided as long as enough non-excluded ones exist.
        let first = get_puzzle_words(10, 10, 1, "standard".to_string(), Some("Mythology".to_string()), vec![], None);
        let p2 = get_puzzle_words(5, 10, 1, "standard".to_string(), Some("Mythology".to_string()), first.words.clone(), None);
        for w in &p2.words {
            assert!(!first.words.contains(w), "word {} should have been excluded", w);
        }
    }
}
