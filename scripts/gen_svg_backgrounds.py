#!/usr/bin/env python3
"""Generate crisp, high-resolution bioluminescent SVG background assets
for categories in Word Sprout, matching the Botanical Tactical dark aesthetic.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BG_DIR = ROOT / "public" / "backgrounds"
BG_DIR.mkdir(parents=True, exist_ok=True)

# Common SVG header template (1920x1080 viewBox, dark vignette, bioluminescent glow filters)
SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
  <defs>
    <!-- Dark Vignette Scrim -->
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#131313" stop-opacity="0.2"/>
      <stop offset="60%" stop-color="#131313" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#090909" stop-opacity="0.95"/>
    </radialGradient>

    <!-- Bioluminescent Emerald Glow Filter -->
    <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Gold Ember Glow Filter -->
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Custom Category Gradients & Elements -->
    {defs}
  </defs>

  <!-- Dark Atmospheric Background -->
  <rect width="1920" height="1080" fill="{bg_color}"/>

  <!-- Category Graphic Motifs -->
  {body}

  <!-- Dark Edge Vignette Overlay -->
  <rect width="1920" height="1080" fill="url(#vignette)"/>
</svg>
"""

CATEGORY_SPECS = {
    "bg_colors.svg": {
        "bg_color": "#0d0f12",
        "defs": """
            <linearGradient id="ribbon1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#00e479" stop-opacity="0.8"/>
                <stop offset="50%" stop-color="#00f0ff" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="#7b3cc4" stop-opacity="0.4"/>
            </linearGradient>
            <linearGradient id="ribbon2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#f4c95d" stop-opacity="0.7"/>
                <stop offset="50%" stop-color="#ecb1ff" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#00e479" stop-opacity="0.3"/>
            </linearGradient>
        """,
        "body": """
            <path d="M-100,200 C400,600 800,100 1400,700 C1700,1000 2000,800 2100,900" fill="none" stroke="url(#ribbon1)" stroke-width="60" filter="url(#emeraldGlow)"/>
            <path d="M-100,800 C500,300 1000,900 1500,200 C1800,-100 2000,300 2100,400" fill="none" stroke="url(#ribbon2)" stroke-width="40" filter="url(#goldGlow)"/>
        """
    },
    "bg_cooking.svg": {
        "bg_color": "#120e0b",
        "defs": """
            <radialGradient id="flame" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#f4c95d" stop-opacity="0.9"/>
                <stop offset="60%" stop-color="#ff5500" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="#120e0b" stop-opacity="0"/>
            </radialGradient>
        """,
        "body": """
            <circle cx="300" cy="800" r="250" fill="url(#flame)" filter="url(#goldGlow)"/>
            <circle cx="1600" cy="300" r="200" fill="url(#flame)" filter="url(#goldGlow)"/>
            <path d="M 200 850 A 150 150 0 0 1 500 850 Z" fill="none" stroke="#00e479" stroke-width="4" filter="url(#emeraldGlow)"/>
        """
    },
    "bg_countries.svg": {
        "bg_color": "#0a1014",
        "defs": """
            <linearGradient id="flight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.9"/>
                <stop offset="100%" stop-color="#00e479" stop-opacity="0.3"/>
            </linearGradient>
        """,
        "body": """
            <circle cx="960" cy="540" r="400" fill="none" stroke="#00e479" stroke-width="2" stroke-dasharray="8,8" opacity="0.4"/>
            <circle cx="960" cy="540" r="280" fill="none" stroke="#00f0ff" stroke-width="1.5" opacity="0.3"/>
            <path d="M 300 700 Q 960 200 1600 650" fill="none" stroke="url(#flight)" stroke-width="3" filter="url(#emeraldGlow)"/>
            <path d="M 400 300 Q 960 800 1500 400" fill="none" stroke="url(#flight)" stroke-width="2" filter="url(#emeraldGlow)"/>
        """
    },
    "bg_cryptic.svg": {
        "bg_color": "#0d0b14",
        "defs": "",
        "body": """
            <g font-family="Quicksand, sans-serif" font-size="48" font-weight="bold" fill="#00e479" opacity="0.25" filter="url(#emeraldGlow)">
                <text x="150" y="250">᚛ ᚜ ᚨ ᛒ ᚲ</text>
                <text x="1600" y="350">Σ Φ Ψ Ω</text>
                <text x="250" y="850">A E I O U</text>
                <text x="1450" y="800">ᚱ ᚢ ᚾ ᛖ</text>
            </g>
        """
    },
    "bg_dance.svg": {
        "bg_color": "#140b12",
        "defs": """
            <linearGradient id="danceTrace" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ecb1ff" stop-opacity="0.8"/>
                <stop offset="50%" stop-color="#00e479" stop-opacity="0.7"/>
                <stop offset="100%" stop-color="#00f0ff" stop-opacity="0.4"/>
            </linearGradient>
        """,
        "body": """
            <path d="M 200 900 C 400 100, 800 1000, 1200 200 C 1400 -100, 1800 600, 1950 300" fill="none" stroke="url(#danceTrace)" stroke-width="14" stroke-linecap="round" filter="url(#emeraldGlow)"/>
        """
    },
    "bg_desserts.svg": {
        "bg_color": "#140f0c",
        "defs": "",
        "body": """
            <circle cx="400" cy="300" r="180" fill="none" stroke="#f4c95d" stroke-width="2" opacity="0.3" filter="url(#goldGlow)"/>
            <circle cx="1550" cy="750" r="220" fill="none" stroke="#00e479" stroke-width="2" opacity="0.3" filter="url(#emeraldGlow)"/>
        """
    },
    "bg_emotions.svg": {
        "bg_color": "#0b1214",
        "defs": """
            <radialGradient id="aurora1" cx="30%" cy="40%" r="60%">
                <stop offset="0%" stop-color="#00e479" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="#0b1214" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="aurora2" cx="70%" cy="60%" r="50%">
                <stop offset="0%" stop-color="#ecb1ff" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="#0b1214" stop-opacity="0"/>
            </radialGradient>
        """,
        "body": """
            <rect width="1920" height="1080" fill="url(#aurora1)"/>
            <rect width="1920" height="1080" fill="url(#aurora2)"/>
        """
    },
    "bg_etymology.svg": {
        "bg_color": "#12100c",
        "defs": "",
        "body": """
            <path d="M 150 200 L 1770 200 M 150 880 L 1770 880" stroke="#f4c95d" stroke-width="1" opacity="0.2"/>
            <text x="960" y="560" font-family="'Work Sans', sans-serif" font-size="120" font-weight="bold" fill="#00e479" opacity="0.08" text-anchor="middle" filter="url(#emeraldGlow)">LEXICON</text>
        """
    },
    "bg_forensics.svg": {
        "bg_color": "#080e12",
        "defs": "",
        "body": """
            <circle cx="350" cy="540" r="180" fill="none" stroke="#00f0ff" stroke-width="2" opacity="0.3" stroke-dasharray="6,6" filter="url(#emeraldGlow)"/>
            <path d="M 350 320 L 350 760 M 130 540 L 570 540" stroke="#00f0ff" stroke-width="1.5" opacity="0.4"/>
        """
    },
    "bg_fruits.svg": {
        "bg_color": "#120e0d",
        "defs": "",
        "body": """
            <circle cx="280" cy="350" r="90" fill="#00e479" opacity="0.15" filter="url(#emeraldGlow)"/>
            <circle cx="1650" cy="700" r="120" fill="#f4c95d" opacity="0.15" filter="url(#goldGlow)"/>
        """
    },
    "bg_gardening.svg": {
        "bg_color": "#09120c",
        "defs": "",
        "body": """
            <path d="M 100 1000 C 300 600, 400 300, 700 200" fill="none" stroke="#00e479" stroke-width="4" opacity="0.4" filter="url(#emeraldGlow)"/>
            <path d="M 1820 1000 C 1620 600, 1520 300, 1220 200" fill="none" stroke="#00e479" stroke-width="4" opacity="0.4" filter="url(#emeraldGlow)"/>
        """
    },
    "bg_geology.svg": {
        "bg_color": "#0f0e14",
        "defs": "",
        "body": """
            <polygon points="300,800 400,450 500,800" fill="none" stroke="#00e479" stroke-width="3" filter="url(#emeraldGlow)"/>
            <polygon points="1450,900 1600,350 1750,900" fill="none" stroke="#ecb1ff" stroke-width="3" filter="url(#goldGlow)"/>
        """
    },
    "bg_grammar.svg": {
        "bg_color": "#0b1012",
        "defs": "",
        "body": """
            <text x="200" y="400" font-family="'Quicksand', sans-serif" font-size="160" font-weight="bold" fill="#00e479" opacity="0.12">“ ”</text>
            <text x="1600" y="800" font-family="'Quicksand', sans-serif" font-size="160" font-weight="bold" fill="#f4c95d" opacity="0.12">;</text>
        """
    },
    "bg_holidays.svg": {
        "bg_color": "#120e10",
        "defs": "",
        "body": """
            <circle cx="300" cy="300" r="15" fill="#f4c95d" filter="url(#goldGlow)"/>
            <circle cx="1600" cy="400" r="20" fill="#00e479" filter="url(#emeraldGlow)"/>
            <circle cx="500" cy="800" r="18" fill="#ecb1ff" filter="url(#goldGlow)"/>
        """
    },
    "bg_horror.svg": {
        "bg_color": "#0a0a0c",
        "defs": "",
        "body": """
            <circle cx="1600" cy="250" r="120" fill="#dedaca" opacity="0.15" filter="url(#emeraldGlow)"/>
        """
    },
    "bg_insects.svg": {
        "bg_color": "#0a120b",
        "defs": "",
        "body": """
            <circle cx="450" cy="350" r="8" fill="#00e479" filter="url(#emeraldGlow)"/>
            <circle cx="500" cy="380" r="12" fill="#f4c95d" filter="url(#goldGlow)"/>
            <circle cx="1400" cy="650" r="10" fill="#00e479" filter="url(#emeraldGlow)"/>
            <circle cx="1480" cy="620" r="14" fill="#f4c95d" filter="url(#goldGlow)"/>
        """
    },
    "bg_kitchen.svg": {
        "bg_color": "#120e0a",
        "defs": "",
        "body": """
            <circle cx="350" cy="750" r="160" fill="none" stroke="#f4c95d" stroke-width="2" opacity="0.3" filter="url(#goldGlow)"/>
        """
    },
    "bg_legal.svg": {
        "bg_color": "#12100d",
        "defs": "",
        "body": """
            <path d="M 300 300 L 500 300 M 400 300 L 400 700 M 250 700 L 550 700" stroke="#f4c95d" stroke-width="3" opacity="0.3"/>
        """
    },
    "bg_medical.svg": {
        "bg_color": "#081014",
        "defs": "",
        "body": """
            <path d="M 100 540 Q 300 300 500 540 T 900 540 T 1300 540 T 1700 540" fill="none" stroke="#00f0ff" stroke-width="3" opacity="0.4" filter="url(#emeraldGlow)"/>
        """
    },
    "bg_movies.svg": {
        "bg_color": "#120d0e",
        "defs": "",
        "body": """
            <circle cx="300" cy="400" r="140" fill="none" stroke="#00e479" stroke-width="3" stroke-dasharray="20,10" opacity="0.3" filter="url(#emeraldGlow)"/>
        """
    },
    "bg_musical_genres.svg": {
        "bg_color": "#0d0b14",
        "defs": "",
        "body": """
            <path d="M 100 800 L 250 400 L 400 900 L 550 300 L 700 750" fill="none" stroke="#00e479" stroke-width="4" opacity="0.5" filter="url(#emeraldGlow)"/>
        """
    },
    "bg_mycology.svg": {
        "bg_color": "#08120c",
        "defs": "",
        "body": """
            <path d="M 300 850 A 100 100 0 0 1 500 850 Z" fill="#00e479" opacity="0.3" filter="url(#emeraldGlow)"/>
            <path d="M 1400 850 A 140 140 0 0 1 1680 850 Z" fill="#00f0ff" opacity="0.3" filter="url(#emeraldGlow)"/>
        """
    },
    "bg_mythical.svg": {
        "bg_color": "#0d0a14",
        "defs": "",
        "body": """
            <path d="M 200 600 Q 500 100 800 600 T 1400 600" fill="none" stroke="#ecb1ff" stroke-width="3" opacity="0.4" filter="url(#goldGlow)"/>
        """
    },
    "bg_nautical.svg": {
        "bg_color": "#080f14",
        "defs": "",
        "body": """
            <circle cx="350" cy="540" r="160" fill="none" stroke="#f4c95d" stroke-width="3" opacity="0.3" stroke-dasharray="30,15"/>
        """
    },
    "bg_occupations.svg": {
        "bg_color": "#12100b",
        "defs": "",
        "body": """
            <rect x="250" y="350" width="250" height="350" fill="none" stroke="#00e479" stroke-width="2" opacity="0.3"/>
        """
    },
    "bg_philosophy.svg": {
        "bg_color": "#12110e",
        "defs": "",
        "body": """
            <line x1="300" y1="300" x2="300" y2="800" stroke="#f4c95d" stroke-width="6" opacity="0.25"/>
            <line x1="450" y1="300" x2="450" y2="800" stroke="#f4c95d" stroke-width="6" opacity="0.25"/>
        """
    },
    "bg_school.svg": {
        "bg_color": "#0a100d",
        "defs": "",
        "body": """
            <circle cx="400" cy="500" r="150" fill="none" stroke="#00e479" stroke-width="2" opacity="0.3"/>
        """
    },
    "bg_tools.svg": {
        "bg_color": "#14100c",
        "defs": "",
        "body": """
            <line x1="200" y1="200" x2="600" y2="800" stroke="#f4c95d" stroke-width="4" opacity="0.3"/>
        """
    },
    "bg_government.svg": {
        "bg_color": "#100d14",
        "defs": "",
        "body": """
            <path d="M 800 500 A 160 160 0 0 1 1120 500 Z" fill="none" stroke="#f4c95d" stroke-width="3" opacity="0.3"/>
        """
    },
    "bg_vehicles.svg": {
        "bg_color": "#0a0e14",
        "defs": "",
        "body": """
            <path d="M 0 700 L 1920 700" stroke="#00e479" stroke-width="6" opacity="0.4" filter="url(#emeraldGlow)"/>
        """
    },
    "bg_weaving.svg": {
        "bg_color": "#120b14",
        "defs": "",
        "body": """
            <path d="M 200 0 L 200 1080 M 400 0 L 400 1080 M 600 0 L 600 1080" stroke="#ecb1ff" stroke-width="2" opacity="0.2"/>
            <path d="M 0 300 L 1920 300 M 0 600 L 1920 600 M 0 900 L 1920 900" stroke="#00e479" stroke-width="2" opacity="0.2"/>
        """
    }
}


def main():
    for filename, spec in CATEGORY_SPECS.items():
        svg_content = SVG_TEMPLATE.format(
            bg_color=spec["bg_color"],
            defs=spec.get("defs", ""),
            body=spec.get("body", "")
        )
        out_path = BG_DIR / filename
        out_path.write_text(svg_content)
        print(f"Generated {filename}")

if __name__ == "__main__":
    main()
