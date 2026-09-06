import os
from PIL import Image
import shutil

# 1. Create a temporary parchment texture (solid color)
os.makedirs('public/backgrounds', exist_ok=True)
img = Image.new('RGB', (10, 10), color='#F8F4E3')
img.save('public/backgrounds/parchment-texture.png')

# 2. Copy existing plant images to the new filenames as placeholders
plants_map = {
    'bio-orchid.png': 'succulent-rosette.png',
    'nebula-pitcher.png': 'monstera-deliciosa.png',
    'bio-orchid.png': 'calathea-orbifolia.png',  # using same fallback for void-tulip
    'bonsai-bloom.png': 'ficus-lyrata.png',
    'starlight-dahlia.png': 'pothos-trailing.png'
}

for old, new in plants_map.items():
    old_path = os.path.join('public/plants', old)
    new_path = os.path.join('public/plants', new)
    if os.path.exists(old_path):
        shutil.copy(old_path, new_path)

# 3. Copy existing achievements to the new filenames
achievements_map = {
    'static-charge.png': 'sunlight-harvester.png',
    'speed-sprouter.png': 'nimble-planter.png'
}

for old, new in achievements_map.items():
    old_path = os.path.join('public/achievements', old)
    new_path = os.path.join('public/achievements', new)
    if os.path.exists(old_path):
        shutil.copy(old_path, new_path)

print("Created placeholders and copied existing images.")
