Word list sources for `scripts/gen_dictionary.py`, which builds
`src-tauri/src/dictionary.rs` and `public/dictionary.json` (bonus-word
validation) from these two files.

| File | Source | License |
|---|---|---|
| `enable1.txt` | [ENABLE word list](https://web.archive.org/web/2000/http://personal.riverusers.com/~thegrendel/software.html) (Enhanced North American Benchmark LExicon) by Alan Beale, mirrored at [norvig.com/ngrams/enable1.txt](https://norvig.com/ngrams/enable1.txt) | Public domain |
| `blocklist.txt` | Single-word subset of the [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) English blocklist, used to filter profanity/slurs out of the generated dictionary | MIT |
