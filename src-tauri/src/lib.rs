mod categories;
mod dictionary;
use categories::{Tier, CATEGORIES};
use dictionary::dictionary;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![validate_word, get_puzzle_words])
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

    #[test]
    fn test_category_selection_parity() {
        let p1 = get_puzzle_words(5, 10, 1, "standard".to_string());
        assert_eq!(p1.category, "Animals");

        let p2 = get_puzzle_words(5, 10, 2, "standard".to_string());
        assert_eq!(p2.category, "Card Games");
    }
}
