export type PlantDef = {
    id: string;
    name: string;
    species: string;
    tier: "Common" | "Rare" | "Epic" | "Mythic" | "Legendary" | "Ascended" | "Cosmic";
    icon: string;
    bloomImage: string;
    seedCost: number;
    bloomBounty: number;
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
        bloomBounty: 250,
        description: "Soft bioluminescent carpeting moss that absorbs ambient moisture in crystalline terrarium glass.",
    },
    {
        id: "emerald-fern",
        name: "Emerald Fern",
        species: "Polypodiopsida Emeraldus",
        tier: "Common",
        icon: "🌿",
        bloomImage: "/plants/emerald-fern.png",
        seedCost: 250,
        bloomBounty: 500,
        description: "Fronds that glow with a brilliant viridian hue inside geometric brass-bound glass.",
    },
    {
        id: "succulent-rosette",
        name: "Succulent Rosette",
        species: "Echeveria Elegans",
        tier: "Rare",
        icon: "🌸",
        bloomImage: "/plants/succulent-rosette.png",
        seedCost: 400,
        bloomBounty: 800,
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
        bloomBounty: 1200,
        description: "Opens only under moonlit glass panels, floating in runic aquatic water spheres.",
    },
    {
        id: "golden-sunflower",
        name: "Golden Sunflower",
        species: "Helianthus Solis",
        tier: "Epic",
        icon: "🌻",
        bloomImage: "/plants/golden-sunflower.png",
        seedCost: 850,
        bloomBounty: 1700,
        description: "Channels solar radiation into pure botanical energy and golden light particles.",
    },
    {
        id: "bonsai-bloom",
        name: "Bonsai Bloom",
        species: "Pinus Ancientis",
        tier: "Epic",
        icon: "🪴",
        bloomImage: "/plants/bonsai-bloom.png",
        seedCost: 1200,
        bloomBounty: 2400,
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
        bloomBounty: 3200,
        description: "Leaf tips crystallize into shimmering light refractors inside a botanical prism.",
    },
    {
        id: "solar-vine",
        name: "Solaris Vine",
        species: "Hedera Aureus",
        tier: "Epic",
        icon: "🌿",
        bloomImage: "/plants/solar-vine.png",
        seedCost: 2000,
        bloomBounty: 4000,
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
        bloomBounty: 5000,
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
        bloomBounty: 6000,
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
        bloomBounty: 7200,
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
        bloomBounty: 8400,
        description: "Neon green bamboo stalks with glowing nodes inside terrarium glass.",
    },
    {
        id: "amber-flytrap",
        name: "Amber Glow Flytrap",
        species: "Dionaea Aureus",
        tier: "Legendary",
        icon: "🪴",
        bloomImage: "/plants/golden-sunflower.png",
        seedCost: 5000,
        bloomBounty: 10000,
        description: "Golden amber carnivorous flora snapping at surrounding light specks.",
    },
    {
        id: "calathea-orbifolia",
        name: "Calathea Orbifolia",
        species: "Calathea Orbifolia",
        tier: "Legendary",
        icon: "🌷",
        bloomImage: "/plants/calathea-orbifolia.png",
        seedCost: 6000,
        bloomBounty: 12000,
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
        bloomBounty: 14400,
        description: "Radiant cherry blossom branch cascading with ethereal pink light particles.",
    },
    {
        id: "prism-cactus",
        name: "Prismatic Cactus",
        species: "Cactaceae Refracta",
        tier: "Legendary",
        icon: "🌵",
        bloomImage: "/plants/crystal-succulent.png",
        seedCost: 8500,
        bloomBounty: 17000,
        description: "Multi-faceted crystal cactus refracting vibrant rainbow beam flares.",
    },
    {
        id: "shadow-thistle",
        name: "Shadow Moon Thistle",
        species: "Cirsium Umbra",
        tier: "Ascended",
        icon: "🔮",
        bloomImage: "/plants/nebula-pitcher.png",
        seedCost: 10000,
        bloomBounty: 20000,
        description: "Electric violet thistle glowing brightly in total midnight shadow.",
    },
    {
        id: "pothos-trailing",
        name: "Trailing Pothos",
        species: "Epipremnum Aureum",
        tier: "Ascended",
        icon: "🌺",
        bloomImage: "/plants/pothos-trailing.png",
        seedCost: 12500,
        bloomBounty: 25000,
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
        bloomBounty: 30000,
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
        bloomBounty: 50000,
        description: "An elegant, tall indoor tree with violin-shaped leaves that command the room.",
    },
];

export function getStageImage(growth: number, bloomImage: string): string {
    if (growth >= 100) return bloomImage;
    if (growth >= 50) return STAGE_ASSETS.young;
    if (growth >= 25) return STAGE_ASSETS.sprout;
    return STAGE_ASSETS.seed;
}

export function getStageName(growth: number): string {
    if (growth >= 100) return "Fully Bloomed 🌸";
    if (growth >= 50) return "Young Plant 🌿";
    if (growth >= 25) return "Sprout 🌱";
    return "Seed Vessel 🟤";
}
