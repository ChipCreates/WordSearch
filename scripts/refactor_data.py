import sys

def refactor_plants(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. bio-orchid -> succulent-rosette
    content = content.replace(
        'id: "bio-orchid",\n        name: "Bioluminescent Orchid",\n        species: "Orchidaceae Aurora",',
        'id: "succulent-rosette",\n        name: "Succulent Rosette",\n        species: "Echeveria Elegans",'
    )
    content = content.replace(
        'bloomImage: "/plants/bio-orchid.png",\n        seedCost: 400,\n        bloomBounty: 800,\n        description: "Produces fragrant neon-pink spores during celestial events in a dodecahedron terrarium."',
        'bloomImage: "/plants/succulent-rosette.png",\n        seedCost: 400,\n        bloomBounty: 800,\n        description: "A compact, fleshy rosette that thrives in arid greenhouse conditions."'
    )

    # 2. nebula-pitcher -> monstera-deliciosa
    content = content.replace(
        'id: "nebula-pitcher",\n        name: "Nebula Pitcher Plant",\n        species: "Nepenthes Cosmicus",',
        'id: "monstera-deliciosa",\n        name: "Monstera Deliciosa",\n        species: "Monstera Deliciosa",'
    )
    content = content.replace(
        'bloomImage: "/plants/nebula-pitcher.png",\n        seedCost: 3000,\n        bloomBounty: 6000,\n        description: "Deep violet and cyan glowing pitcher plant trapping interstellar energy particles."',
        'bloomImage: "/plants/monstera-deliciosa.png",\n        seedCost: 3000,\n        bloomBounty: 6000,\n        description: "A classic large-leafed beauty with iconic fenestrations, bringing jungle vibes indoors."'
    )

    # 3. void-tulip -> calathea-orbifolia
    content = content.replace(
        'id: "void-tulip",\n        name: "Cosmic Void Tulip",\n        species: "Tulipa Universis",',
        'id: "calathea-orbifolia",\n        name: "Calathea Orbifolia",\n        species: "Calathea Orbifolia",'
    )
    content = content.replace(
        'bloomImage: "/plants/bio-orchid.png",\n        seedCost: 6000,\n        bloomBounty: 12000,\n        description: "Dark magenta petals surrounding an infinite glowing singularity core."',
        'bloomImage: "/plants/calathea-orbifolia.png",\n        seedCost: 6000,\n        bloomBounty: 12000,\n        description: "A broad-leafed plant with beautiful silver striping that thrives in the humid greenhouse air."'
    )

    # 4. chronos-tree -> ficus-lyrata
    content = content.replace(
        'id: "chronos-tree",\n        name: "Chronos World Tree",\n        species: "Yggdrasil Temporis",',
        'id: "ficus-lyrata",\n        name: "Fiddle Leaf Fig",\n        species: "Ficus Lyrata",'
    )
    content = content.replace(
        'bloomImage: "/plants/bonsai-bloom.png",\n        seedCost: 20000,\n        bloomBounty: 50000,\n        description: "Ancient cosmic tree holding temporal equilibrium inside pristine geometric glass."',
        'bloomImage: "/plants/ficus-lyrata.png",\n        seedCost: 20000,\n        bloomBounty: 50000,\n        description: "An elegant, tall indoor tree with violin-shaped leaves that command the room."'
    )

    # 5. plasma-hibiscus -> pothos-trailing
    content = content.replace(
        'id: "plasma-hibiscus",\n        name: "Plasma Glow Hibiscus",\n        species: "Hibiscus Plasma",',
        'id: "pothos-trailing",\n        name: "Trailing Pothos",\n        species: "Epipremnum Aureum",'
    )
    content = content.replace(
        'bloomImage: "/plants/starlight-dahlia.png",\n        seedCost: 12500,\n        bloomBounty: 25000,\n        description: "Vibrant orange plasma petals radiating heatless bioluminescent energy."',
        'bloomImage: "/plants/pothos-trailing.png",\n        seedCost: 12500,\n        bloomBounty: 25000,\n        description: "A resilient vine that cascades beautifully over shelves and hanging baskets."'
    )

    with open(filepath, 'w') as f:
        f.write(content)

def refactor_achievements(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # static-charge -> sunlight-harvester
    content = content.replace(
        'id: "static-charge",\n        name: "Static Charge",\n        description: "Charge your botanical energy across 5 completed levels",\n        icon: "⚡",\n        image: "/achievements/static-charge.png",',
        'id: "sunlight-harvester",\n        name: "Sunlight Harvester",\n        description: "Bask in golden rays across 5 completed levels",\n        icon: "☀️",\n        image: "/achievements/sunlight-harvester.png",'
    )

    # speed-sprouter -> nimble-planter
    content = content.replace(
        'id: "speed-sprouter",\n        name: "Speed Sprouter",\n        description: "Complete 5 puzzle levels",\n        icon: "⚡",\n        image: "/achievements/speed-sprouter.png",',
        'id: "nimble-planter",\n        name: "Nimble Planter",\n        description: "Quickly plant your roots in 5 puzzle levels",\n        icon: "🌱",\n        image: "/achievements/nimble-planter.png",'
    )

    with open(filepath, 'w') as f:
        f.write(content)

refactor_plants('/home/chip/Projects/WordSearch/src/plantsCatalog.ts')
refactor_achievements('/home/chip/Projects/WordSearch/src/achievements.ts')
print("Updated catalog and achievements")
