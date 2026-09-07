# Playing screen artwork

The portrait background is the user-supplied `1788740127338.png`, converted to
`public/backgrounds/playing-portrait.webp` using ImageMagick at quality 90.
The five navigation buttons come from `1788740138160.png`. Circular alpha masks
remove its baked-in checkerboard; the results are lossless WebP files in
`public/navigation/`. Labels and active/focus states are provided by the UI.

The landscape background was created with the built-in image-generation tool,
using the portrait image as its reference. It is stored at
`public/backgrounds/playing-landscape.webp` (1536 × 864, WebP quality 86).
The browser selects portrait or landscape using a picture source media query.

Theme and Help/About use generated transparent assets, `public/navigation/theme.webp`
and `public/navigation/help.webp`, reduced to 112 × 112 lossless WebP with matching
padding. Both were created with the built-in image-generation tool using the
original navigation sheet as a style reference.

## Theme and help generation prompts

Shared prompt: Create ONE standalone circular game navigation button, matching the supplied reference sheet's polished illustrated gold-and-dark-teal beveled double rim, glossy rounded face, dimensional inset emblem, warm highlights from upper left. Centered straight-on, single perfectly round button filling 90% of a square canvas. TRUE transparent background, absolutely no checkerboard pattern, no text labels, no other objects, no extra buttons, no outer sparkles. Must remain clear at 40 pixels.

Theme addition: THEME button: rich midnight indigo glossy face, raised gold SUN and ivory CRESCENT MOON side by side forming a balanced day/night emblem. Same gold and green rim as reference. Actual transparent cutout.

Help addition: HELP / ABOUT button: rich teal emerald glossy face, one large raised ivory QUESTION MARK with a small round dot, subtly gold bevelled edges on the question mark. Same gold and green rim as reference. Actual transparent cutout.

## Landscape generation prompt

Create a LANDSCAPE 1536x864 horizontal variant of this supplied portrait game background. Preserve its exact illustration style and palette: enchanting green woodland, golden fireflies and warm sunlight, distant soft forest, richly illustrated dark green leaves and curling vines framing all FOUR edges, small sprouts on a golden forest floor. Extend the woodland composition sideways into a wide central clearing with ample calm dark green negative space for a word-search playing board. Border foliage must stay at the outer edges, clearing centered. This is a background-only game asset, no letters, text, buttons, interface, border frame bars or logos. Do not rotate the portrait image or stretch it. Recompose naturally for wide screens.
