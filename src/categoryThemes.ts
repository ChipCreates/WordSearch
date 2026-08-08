// Per-category background art (see public/backgrounds/CREDITS.md for
// sourcing). Two kinds of asset:
//   - "scene" images (a single wide illustration) are shown with
//     background-size: cover, which on a narrow phone viewport only reveals
//     a ~25-35% wide vertical slice -- background-position picks which
//     slice, and a couple of the source crops were tightened in imagemagick
//     so their subject survives that crop instead of landing off-window.
//   - "pattern" images (animals, food) are seamless tiles: repeating them
//     at a fixed size guarantees even coverage regardless of viewport,
//     rather than gambling on a single "cover" crop happening to land on
//     a subject.
//
// The scrim itself is darkest at the very top/bottom (where text sits
// directly on the image -- the AppBar and the status/chip row above the
// canvas, the Restart button below it) and lighter through the middle,
// since the opaque canvas card already owns contrast there regardless of
// how much of the image shows through.
// SCRIM is now a CSS custom-property reference so it adapts to the
// Sprout (light) and Midnight (dark) themes defined in App.css.
const SCRIM = "var(--scrim)";

type Theme = {
    background: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
};

// Root-absolute paths ("/backgrounds/...") only work when the app is served
// from "/" (the Tauri build). Under GitHub Pages the app lives at
// "/WordSearch/", and since these URLs are built at runtime (not static
// asset references Vite's bundler can see and rewrite), they need
// import.meta.env.BASE_URL explicitly -- it's "/" for Tauri and
// "/WordSearch/" for the web build, so this works for both unchanged.
export function assetUrl(path: string): string {
    return `${import.meta.env.BASE_URL}${path}`;
}

function scene(file: string, position = "center"): Theme {
    return {
        background: `${SCRIM}, url("${assetUrl(`backgrounds/${file}`)}")`,
        backgroundSize: "cover, cover",
        backgroundPosition: `center, ${position}`,
        backgroundRepeat: "no-repeat, no-repeat",
    };
}

function pattern(file: string, tile = "420px"): Theme {
    return {
        background: `${SCRIM}, url("${assetUrl(`backgrounds/${file}`)}")`,
        backgroundSize: `cover, ${tile}`,
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat, repeat",
    };
}

// Keyed by category display name. Only the categories that predate the
// 44-category expansion have dedicated art (sourced from Pixabay, see
// CREDITS.md); the ~34 categories added alongside it fall back to
// DEFAULT_THEME below rather than reusing/faking art for them. Ocean,
// Space, Transportation, and Music were renamed to their closest match in
// the new list (Ocean Life, Space & Astronomy, Vehicles, Musical
// Instruments) -- same art, just re-keyed.
export const CATEGORY_THEMES: Record<string, Theme> = {
    Animals: pattern("animals.jpg"),
    Insects: pattern("animals.jpg"),
    "Mythical Creatures": pattern("animals.jpg"),

    Food: pattern("food.jpg"),
    Fruits: pattern("food.jpg"),
    Desserts: pattern("food.jpg"),
    "Cooking Techniques": pattern("food.jpg"),

    Nature: scene("nature.jpg"),
    Gardening: scene("nature.jpg"),
    "Geology/Minerals": scene("nature.jpg"),
    "Mycology (Fungi)": scene("nature.jpg"),

    Weather: scene("weather.jpg"),
    "Horror Themes": scene("weather.jpg"),

    "Ocean Life": scene("ocean.jpg"),
    "Nautical Terms": scene("ocean.jpg"),

    "Space & Astronomy": scene("space.jpg", "40% center"),
    "Astrology/Zodiac": scene("space.jpg", "40% center"),

    Sports: scene("sports.jpg"),

    Household: scene("household.jpg"),
    "Kitchen Items": scene("household.jpg"),
    Tools: scene("household.jpg"),

    Vehicles: scene("transportation.jpg"),

    "Musical Instruments": scene("music.svg"),
    "Musical Genres": scene("music.svg"),
    "Dance Styles": scene("music.svg"),
};

export const DEFAULT_THEME = CATEGORY_THEMES.Nature;
