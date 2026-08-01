import json

with open('dictionary.json', 'r') as f:
    words = json.load(f)

with open('tauri-app/src-tauri/src/dictionary.rs', 'w') as f:
    f.write("pub static DICTIONARY: &[&str] = &[\n")
    for w in words:
        f.write(f'    "{w}",\n')
    f.write("];\n")
