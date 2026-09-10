export type PlantDef = {
    id: string;
    name: string;
    species: string;
    tier: "Common" | "Rare" | "Epic" | "Mythic" | "Legendary" | "Ascended" | "Cosmic";
    icon: string;
    bloomImage: string;
    seedCost: number;
    description: string;
};

export const STAGE_ASSETS = {
    seed: "/plants/vessel-seed.png",
    sprout: "/plants/vessel-sprout.png",
    young: "/plants/vessel-young.png",
};

export const PLANTS_CATALOG: PlantDef[] = [
    {
        id: "moss-sprout",
        name: "Deep Moss Sprout",
        species: "Bryophyta Lumina",
        tier: "Common",
        icon: "🌱",
        bloomImage: "/plants/moss-sprout.png",
        seedCost: 100,
        description: "Soft glowing moss that drinks in the mist beneath the glass.",
    },
    {
        id: "emerald-fern",
        name: "Emerald Fern",
        species: "Polypodiopsida Emeraldus",
        tier: "Common",
        icon: "🌿",
        bloomImage: "/plants/emerald-fern.png",
        seedCost: 250,
        description: "Bright green fronds glowing inside an old brass frame.",
    },
    {
        id: "succulent-rosette",
        name: "Succulent Rosette",
        species: "Echeveria Elegans",
        tier: "Rare",
        icon: "🌸",
        bloomImage: "/plants/succulent-rosette.png",
        seedCost: 400,
        description: "A compact, fleshy rosette that thrives in arid greenhouse conditions.",
    },
    {
        id: "midnight-lotus",
        name: "Midnight Lotus",
        species: "Nelumbo Nocturna",
        tier: "Rare",
        icon: "🪷",
        bloomImage: "/plants/midnight-lotus.png",
        seedCost: 600,
        description: "Opens beneath the moon and floats in a quiet pool.",
    },
    {
        id: "golden-sunflower",
        name: "Golden Sunflower",
        species: "Helianthus Solis",
        tier: "Epic",
        icon: "🌻",
        bloomImage: "/plants/golden-sunflower.png",
        seedCost: 850,
        description: "Catches the sun and fills the room with warm golden light.",
    },
    {
        id: "bonsai-bloom",
        name: "Bonsai Bloom",
        species: "Pinus Ancientis",
        tier: "Epic",
        icon: "🪴",
        bloomImage: "/plants/bonsai-bloom.png",
        seedCost: 1200,
        description: "Miniature ancient tree sculpted over decades of bioluminescent cultivation.",
    },
    {
        id: "crystal-succulent",
        name: "Prismatic Echeveria",
        species: "Succulenta Refracta",
        tier: "Epic",
        icon: "💎",
        bloomImage: "/plants/crystal-succulent.png",
        seedCost: 1600,
        description: "Its leaf tips catch the light like tiny crystals.",
    },
    {
        id: "solar-vine",
        name: "Solaris Vine",
        species: "Hedera Aureus",
        tier: "Epic",
        icon: "🌿",
        bloomImage: "/plants/solar-vine.png",
        seedCost: 2000,
        description: "Climbs vertical trellises, illuminating structural conservatory arches.",
    },
    {
        id: "starlight-dahlia",
        name: "Starlight Dahlia",
        species: "Dahlia Stellaris",
        tier: "Mythic",
        icon: "✨",
        bloomImage: "/plants/starlight-dahlia.png",
        seedCost: 2500,
        description: "Radiant silver-white petals glowing with concentrated starlight brilliance.",
    },
    {
        id: "monstera-deliciosa",
        name: "Monstera Deliciosa",
        species: "Monstera Deliciosa",
        tier: "Mythic",
        icon: "🌌",
        bloomImage: "/plants/monstera-deliciosa.png",
        seedCost: 3000,
        description: "A classic large-leafed beauty with iconic fenestrations, bringing jungle vibes indoors.",
    },
    {
        id: "frost-rose",
        name: "Celestial Frost Rose",
        species: "Rosa Cryonis",
        tier: "Mythic",
        icon: "❄️",
        bloomImage: "/plants/starlight-dahlia.png",
        seedCost: 3600,
        description: "Crystalline icy blue petals shimmering with sub-zero bioluminescent aura.",
    },
    {
        id: "lunar-bamboo",
        name: "Luminescent Bamboo",
        species: "Bambusa Nocturna",
        tier: "Mythic",
        icon: "🎋",
        bloomImage: "/plants/emerald-fern.png",
        seedCost: 4200,
        description: "Tall green bamboo with lantern-bright joints.",
    },
    {
        id: "amber-flytrap",
        name: "Amber Glow Flytrap",
        species: "Dionaea Aureus",
        tier: "Legendary",
        icon: "🪴",
        bloomImage: "/plants/golden-sunflower.png",
        seedCost: 5000,
        description: "Golden pitcher leaves that curl toward every little spark.",
    },
    {
        id: "calathea-orbifolia",
        name: "Calathea Orbifolia",
        species: "Calathea Orbifolia",
        tier: "Legendary",
        icon: "🌷",
        bloomImage: "/plants/calathea-orbifolia.png",
        seedCost: 6000,
        description: "A broad-leafed plant with beautiful silver striping that thrives in the humid greenhouse air.",
    },
    {
        id: "ether-cherry",
        name: "Ether Blossom Cherry",
        species: "Prunus Aetheris",
        tier: "Legendary",
        icon: "🌸",
        bloomImage: "/plants/bonsai-bloom.png",
        seedCost: 7200,
        description: "A cherry branch dusted with drifting pink light.",
    },
    {
        id: "prism-cactus",
        name: "Prismatic Cactus",
        species: "Cactaceae Refracta",
        tier: "Legendary",
        icon: "🌵",
        bloomImage: "/plants/crystal-succulent.png",
        seedCost: 8500,
        description: "A crystal cactus that scatters rainbows across the shelves.",
    },
    {
        id: "shadow-thistle",
        name: "Shadow Moon Thistle",
        species: "Cirsium Umbra",
        tier: "Ascended",
        icon: "🔮",
        bloomImage: "/plants/nebula-pitcher.png",
        seedCost: 10000,
        description: "A violet thistle that shines brightest after dark.",
    },
    {
        id: "pothos-trailing",
        name: "Trailing Pothos",
        species: "Epipremnum Aureum",
        tier: "Ascended",
        icon: "🌺",
        bloomImage: "/plants/pothos-trailing.png",
        seedCost: 12500,
        description: "A resilient vine that cascades beautifully over shelves and hanging baskets.",
    },
    {
        id: "aurora-clover",
        name: "Four-Leaf Aurora Clover",
        species: "Trifolium Borealis",
        tier: "Ascended",
        icon: "🍀",
        bloomImage: "/plants/solar-vine.png",
        seedCost: 15000,
        description: "Ultra-rare four-leaf emerald clover glowing with celestial aurora ribbons.",
    },
    {
        id: "ficus-lyrata",
        name: "Fiddle Leaf Fig",
        species: "Ficus Lyrata",
        tier: "Cosmic",
        icon: "🌳",
        bloomImage: "/plants/ficus-lyrata.png",
        seedCost: 20000,
        description: "An elegant, tall indoor tree with violin-shaped leaves that command the room.",
    },
];

export function getStageImage(growth: number, plantId: string): string {
    const stage = growth >= 100 ? "bloom" : growth >= 50 ? "young" : growth >= 25 ? "sprout" : "vessel";
    return `/plants/lifecycle/${plantId}-${stage}.webp`;
}

export function getStageName(growth: number): string {
    if (growth >= 100) return "Fully Bloomed 🌸";
    if (growth >= 50) return "Young Plant 🌿";
    if (growth >= 25) return "Sprout 🌱";
    return "Seed Vessel 🟤";
}
