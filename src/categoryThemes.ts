// Categories map to one of three background moods -- nature, mystical, or a
// unified neutral default -- rather than one piece of art per category.
// With 44+ categories across two difficulty tiers, curating bespoke art per
// category isn't practical; grouping by mood keeps the "Verdant Sprout"
// design language consistent while still giving related categories (Ocean
// Life, Weather, Insects... vs. Astrology, Philosophy, Horror Themes...)
// visually distinct backdrops. Categories not listed below fall back to
// DEFAULT_THEME's parchment texture.

export type Theme = {
    background: string;
    backgroundDark?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
};

export function assetUrl(path: string): string {
    return `${import.meta.env.BASE_URL}${path}`;
}

function unifiedBackground(): Theme {
    return {
        background: `url("${assetUrl('backgrounds/parchment-texture.png')}")`,
        backgroundDark: `url("${assetUrl('backgrounds/bg_dark_default.png')}")`,
        backgroundSize: `cover, 400px`,
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat, repeat",
    };
}

function natureBackground(): Theme {
    return {
        background: `url("${assetUrl('backgrounds/bg_nature.png')}")`,
        backgroundDark: `url("${assetUrl('backgrounds/bg_dark_nature.png')}")`,
        backgroundSize: `cover`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
    };
}

function mysticalBackground(): Theme {
    return {
        background: `url("${assetUrl('backgrounds/bg_mystical.png')}")`,
        backgroundDark: `url("${assetUrl('backgrounds/bg_dark_mystical.png')}")`,
        backgroundSize: `cover`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
    };
}

const nature = natureBackground();
const mystical = mysticalBackground();

export const CATEGORY_THEMES: Record<string, Theme> = {
    // Nature themes
    "Animals": nature,
    "Gardening": nature,
    "Ocean Life": nature,
    "Nature": nature,
    "Fruits": nature,
    "Geology/Minerals": nature,
    "Mycology (Fungi)": nature,
    "Weather": nature,
    "Insects": nature,

    // Mystical / Ethereal themes
    "Astrology/Zodiac": mystical,
    "Cryptic/Obscure Adjectives": mystical,
    "Philosophy": mystical,
    "Space & Astronomy": mystical,
    "Emotions": mystical,
    "Mythical Creatures": mystical,
    "Horror Themes": mystical,
};

export const DEFAULT_THEME = unifiedBackground();
