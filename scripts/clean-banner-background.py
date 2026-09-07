"""Remove baked neutral checkerboard from the approved banner, without redrawing it.

Usage: python scripts/clean-banner-background.py source.png destination.png
Keeps small isolated pale highlights; removes large neutral background components.
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

source, destination = map(Path, sys.argv[1:])
if destination.exists():
    raise SystemExit(f"Refusing to overwrite {destination}")
im = Image.open(source).convert("RGBA")
pixels = np.array(im)
rgb = pixels[:, :, :3].astype(np.int16)
neutral = (rgb.max(axis=2) - rgb.min(axis=2) < 38) & (rgb.min(axis=2) > 135)
height, width = neutral.shape
visited = np.zeros_like(neutral)
remove = np.zeros_like(neutral)
for y, x in zip(*np.where(neutral)):
    if visited[y, x]:
        continue
    queue = deque([(y, x)])
    visited[y, x] = True
    component = []
    while queue:
        cy, cx = queue.popleft()
        component.append((cy, cx))
        for ny, nx in ((cy-1, cx), (cy+1, cx), (cy, cx-1), (cy, cx+1)):
            if 0 <= ny < height and 0 <= nx < width and neutral[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))
    if len(component) >= 100:
        ys, xs = zip(*component)
        remove[ys, xs] = True
pixels[remove] = 0
Image.fromarray(pixels).save(destination, optimize=True)
print(f"Saved {destination}: {width}x{height}, {remove.sum():,} background pixels removed")
assert pixels[0, 0, 3] == 0
assert np.array_equal(pixels[~remove], np.array(im)[~remove])
