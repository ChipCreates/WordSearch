mod dictionary;
use dictionary::DICTIONARY;

#[tauri::command]
fn validate_word(word: String) -> bool {
    DICTIONARY.binary_search(&word.as_str()).is_ok()
}

#[tauri::command]
fn get_puzzle_words(count: usize, max_length: usize) -> Vec<String> {
    use rand::seq::SliceRandom;
    use rand::thread_rng;
    
    let mut rng = thread_rng();
    
    let mut valid_words: Vec<&str> = DICTIONARY
        .iter()
        .filter(|w| w.len() <= max_length)
        .copied()
        .collect();
        
    valid_words.shuffle(&mut rng);
    valid_words.into_iter().take(count).map(|s| s.to_string()).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![validate_word, get_puzzle_words])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
