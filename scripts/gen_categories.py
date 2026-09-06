#!/usr/bin/env python3
"""Generate src-tauri/src/categories/*.rs and src/categories/*.json from the
plain word-per-line source files under data/categories/{standard,challenging}/.

One .txt file in, one .rs + one .json out, always in sync -- this is the same
parity-generation pattern already used for dictionary.rs/dictionary.json.
Adding a new category later is: drop a new .txt file in the right tier
folder, add its {slug: display name} entry below, re-run this script.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "categories"
RUST_OUT_DIR = ROOT / "src-tauri" / "src" / "categories"
WEB_OUT_DIR = ROOT / "src" / "categories"
# Ground-truth (tier -> ordered display names), asserted against in full by
# both backend.test.ts and lib.rs's test_category_selection_parity, so the
# "web glob-sort matches Rust declaration order" assumption is actually
# checked rather than spot-checked at two hardcoded indices.
ORDER_FIXTURE = ROOT / "data" / "category_order.json"

# slug -> display name shown in the game (category cycling order follows
# this dict's iteration order within each tier, which is insertion order).
DISPLAY_NAMES = {
    "easy": {
        "shapes": "Shapes",
        "numbers": "Numbers",
        "body_parts": "Body Parts",
        "family": "Family",
        "clothing": "Clothing",
        "pets": "Pets",
        "farm_animals": "Farm Animals",
        "zoo_animals": "Zoo Animals",
        "bugs": "Bugs",
        "drinks": "Drinks",
        "breakfast": "Breakfast Foods",
        "playground": "Playground",
        "school_supplies": "School Supplies",
        "calendar": "Days & Months",
        "bathroom": "Bathroom Items",
        "bedroom": "Bedroom Items",
        "seasons": "Seasons",
        "baby_animals": "Baby Animals",
        "transportation": "Transportation",
        "picnic": "Picnic",
    },
    "standard": {
        "animals": "Animals",
        "food": "Food",
        "nature": "Nature",
        "household": "Household",
        "fruits": "Fruits",
        "countries": "Countries",
        "sports": "Sports",
        "colors": "Colors",
        "weather": "Weather",
        "musical_instruments": "Musical Instruments",
        "kitchen_items": "Kitchen Items",
        "space_astronomy": "Space & Astronomy",
        "occupations": "Occupations",
        "emotions": "Emotions",
        "ocean_life": "Ocean Life",
        "vehicles": "Vehicles",
        "movies_tv": "Movies & TV",
        "school_subjects": "School Subjects",
        "holidays": "Holidays",
        "gardening": "Gardening",
        "insects": "Insects",
        "desserts": "Desserts",
        "mythical_creatures": "Mythical Creatures",
        "tools": "Tools",
        "musical_genres": "Musical Genres",
        "card_games": "Card Games",
        "dance_styles": "Dance Styles",
        "horror_themes": "Horror Themes",
        "comedy": "Comedy",
        "romance": "Romance",
        "action_adventure": "Action & Adventure",
        "sci_fi": "Sci-Fi",
        "fantasy": "Fantasy",
        "western": "Western",
        "mystery_thriller": "Mystery & Thriller",
        "war_films": "War Films",
        "musicals": "Musicals",
        "superheroes": "Superheroes & Comics",
        "crime_noir": "Crime & Noir",
        "anime_manga": "Anime & Manga",
        "pirates": "Pirates",
        "fairy_tales": "Fairy Tales",
        "camping": "Camping & Outdoors",
        "farm_life": "Farm Life",
        "birds": "Birds",
        "board_games": "Board Games",
        "circus": "Circus & Carnival",
        "weddings": "Weddings",
        "photography": "Photography",
        "knights_castles": "Knights & Castles",
        "video_games": "Video Games",
        "baking": "Baking",
        "toys": "Toys",
        "beach_summer": "Beach & Summer",
    },
    "challenging": {
        "chemistry": "Chemistry Elements/Terms",
        "legal_terms": "Legal Terms",
        "medical_terminology": "Medical Terminology",
        "nautical_terms": "Nautical Terms",
        "geology_minerals": "Geology/Minerals",
        "philosophy": "Philosophy",
        "architecture": "Architecture",
        "grammar_linguistics": "Grammar/Linguistics",
        "cryptic_adjectives": "Cryptic/Obscure Adjectives",
        "mycology": "Mycology (Fungi)",
        "cooking_techniques": "Cooking Techniques",
        "astrology_zodiac": "Astrology/Zodiac",
        "types_of_government": "Types of Government",
        "weaving_textiles": "Weaving/Textiles",
        "forensics": "Forensics",
        "etymology_word_roots": "Etymology/Word Roots",
        "computer_science": "Computer Science",
        "mythology": "Mythology",
        "psychology": "Psychology",
        "music_theory": "Music Theory",
        "paleontology": "Paleontology",
        "archaeology": "Archaeology",
        "economics_finance": "Economics & Finance",
        "physics": "Physics",
        "literary_devices": "Literary Devices",
        "heraldry": "Heraldry",
        "cryptography": "Cryptography",
        "anatomy": "Anatomy",
    },
}

WORD_RE = re.compile(r"^[A-Z]{3,10}$")


def load_words(path: Path):
    seen = set()
    words = []
    dropped = []
    for line in path.read_text().splitlines():
        w = line.strip().upper()
        if not w:
            continue
        if not WORD_RE.match(w):
            dropped.append(w)
            continue
        if w not in seen:
            seen.add(w)
            words.append(w)
    words.sort()
    return words, dropped


def rust_string_literal(s: str) -> str:
    # Category display names only ever contain letters/spaces/&/()/,/, so a
    # straight escape of the two characters Rust string literals care about
    # is enough -- no need for a general-purpose escaper here.
    return s.replace("\\", "\\\\").replace('"', '\\"')


def main():
    RUST_OUT_DIR.mkdir(parents=True, exist_ok=True)
    WEB_OUT_DIR.mkdir(parents=True, exist_ok=True)
    for stale in list(RUST_OUT_DIR.glob("*.rs")) + list(WEB_OUT_DIR.glob("*.json")):
        stale.unlink()

    mod_lines = []
    category_entries = []  # (slug, tier)
    total_words = 0

    for tier in ("easy", "standard", "challenging"):
        names = DISPLAY_NAMES[tier]
        tier_dir = DATA_DIR / tier
        # Sorted by slug (not dict insertion order): this must match the
        # order `import.meta.glob('./categories/*.json')` naturally returns
        # on the web side (alphabetical by file path, and the filename stem
        # *is* the slug) -- otherwise the same level number could show a
        # different category on Tauri vs. the web build, since both index
        # into their tier-filtered pool by (level - 1) % pool.length.
        for slug, display_name in sorted(names.items()):
            src = tier_dir / f"{slug}.txt"
            if not src.exists():
                raise SystemExit(f"missing source file: {src}")
            words, dropped = load_words(src)
            if not words:
                raise SystemExit(f"{src} produced zero valid words")
            total_words += len(words)
            print(f"{tier:11} {slug:24} {len(words):4} words"
                  + (f"  (dropped {len(dropped)}: {', '.join(dropped[:5])}{'...' if len(dropped) > 5 else ''})" if dropped else ""))

            rust_path = RUST_OUT_DIR / f"{slug}.rs"
            with rust_path.open("w", newline="\n") as f:
                f.write("pub static WORDS: &[&str] = &[\n")
                for w in words:
                    f.write(f'    "{w}",\n')
                f.write("];\n")

            json_path = WEB_OUT_DIR / f"{slug}.json"
            with json_path.open("w", newline="\n") as f:
                json.dump({"name": display_name, "tier": tier, "words": words}, f, indent=2)
                f.write("\n")

            mod_lines.append(f"mod {slug};")
            category_entries.append((slug, display_name, tier))

    mod_rs = RUST_OUT_DIR / "mod.rs"
    with mod_rs.open("w", newline="\n") as f:
        f.write("// Generated by scripts/gen_categories.py -- do not hand-edit.\n\n")
        for line in mod_lines:
            f.write(line + "\n")
        f.write("\n")
        f.write("#[derive(Clone, Copy, PartialEq, Eq, serde::Serialize)]\n")
        f.write('#[serde(rename_all = "lowercase")]\n')
        f.write("pub enum Tier {\n    Easy,\n    Standard,\n    Challenging,\n}\n\n")
        f.write("pub struct Category {\n")
        f.write("    pub name: &'static str,\n")
        f.write("    pub tier: Tier,\n")
        f.write("    pub words: &'static [&'static str],\n")
        f.write("}\n\n")
        f.write("pub static CATEGORIES: &[Category] = &[\n")
        tier_variants = {"easy": "Easy", "standard": "Standard", "challenging": "Challenging"}
        for slug, display_name, tier in category_entries:
            tier_variant = tier_variants[tier]
            f.write(f'    Category {{ name: "{rust_string_literal(display_name)}", tier: Tier::{tier_variant}, words: {slug}::WORDS }},\n')
        f.write("];\n")

    order_fixture = {
        tier: [display_name for _, display_name, entry_tier in category_entries if entry_tier == tier]
        for tier in ("easy", "standard", "challenging")
    }
    with ORDER_FIXTURE.open("w", newline="\n") as f:
        json.dump(order_fixture, f, indent=2)
        f.write("\n")

    print(f"\n{len(category_entries)} categories, {total_words} total words")
    print(f"wrote {mod_rs}")
    print(f"wrote {ORDER_FIXTURE}")


if __name__ == "__main__":
    main()
