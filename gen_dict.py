import json

valid_words = set()
with open('/usr/share/dict/words', 'r') as f:
    for line in f:
        w = line.strip()
        # skip proper nouns if they start with uppercase in the dictionary
        if not w.islower():
            continue
        w = w.upper()
        if 3 <= len(w) <= 12 and w.isalpha():
            valid_words.add(w)

out_words = sorted(list(valid_words))
print(f"Generated dictionary with {len(out_words)} words.")

with open('dictionary.js', 'w') as f:
    f.write("const largeDictionary = ")
    json.dump(out_words, f)
    f.write(";\n")
