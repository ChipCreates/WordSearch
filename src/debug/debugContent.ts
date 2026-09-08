// Dummy word pools used by the debug panel's board-size preview. Each list
// is sized to fit the board it's keyed by -- every word's length sits
// between 3 and `maxWordLengthForSize(size)`, mirroring the same bounds
// `getPuzzleDifficulty()` (see puzzleGenerator.ts) derives from `gridSize`,
// so `generatePuzzle({ gridSize: size, ... })` can place every one of them
// on a real `size`x`size` board without falling back to a larger grid.

export const DEBUG_CATEGORY = "Debug Grove";

export function maxWordLengthForSize(size: number): number {
    return size <= 4 ? size : size - 1;
}

export function targetCountForSize(size: number): number {
    return Math.max(3, size - 1);
}

export const DEBUG_WORDS_BY_SIZE: Record<number, string[]> = {
    4: ["OAK", "SUN", "LEAF", "MOSS", "FERN"],
    5: ["OAK", "SUN", "LEAF", "MOSS", "FERN", "SEED", "VINE"],
    6: ["PETAL", "BLOOM", "GROVE", "PLANT", "ROOTS", "SEEDS", "VINES"],
    7: ["FLOWER", "GARDEN", "SPROUT", "PETALS", "BRANCH", "FOREST", "MEADOW"],
    8: ["BLOSSOM", "BOTANIC", "SUNBEAM", "PETUNIA", "JASMINE", "ORCHARD", "MEADOWS", "HARVEST"],
    9: ["GREENERY", "SUNLIGHT", "BLOSSOMS", "BOTANIST", "FLOWERED", "SPROUTED", "WOODLAND", "GARDENER", "BEEHIVES"],
    10: ["GERMINATE", "POLLINATE", "CULTIVATE", "SUCCULENT", "BOTANICAL", "WATERFALL", "SUNFLOWER", "EVERGREEN", "TERRARIUM", "MOONLIGHT"],
    11: ["GREENHOUSE", "WILDFLOWER", "BUTTERCUPS", "MOONFLOWER", "DANDELIONS", "EVERGREENS", "GERMINATE", "POLLINATE", "CULTIVATE", "SUCCULENT", "TERRARIUM"],
    12: ["WILDFLOWERS", "GREENHOUSES", "SUCCULENTS", "BOTANICALS", "CULTIVATOR", "POLLINATOR", "GERMINATED", "EVERGREENS", "DANDELIONS", "BUTTERCUPS", "MOONFLOWER", "WATERFALLS"],
};
