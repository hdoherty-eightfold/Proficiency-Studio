#!/usr/bin/env python3
"""
Remove dark background from logo.png using BFS flood-fill from image edges.
Pixels reachable from the border that are "dark" (all RGB channels below threshold)
are made transparent. This preserves dark pixels inside the shield.
"""

from collections import deque
from PIL import Image
import sys

LOGO_PATH = "src/renderer/assets/logo.png"
# Pixels with all RGB channels below this value are considered background
DARK_THRESHOLD = 80
# How much to soften edges (feather transparent pixels near the boundary)
FEATHER_RADIUS = 2


def is_dark(r, g, b):
    return r < DARK_THRESHOLD and g < DARK_THRESHOLD and b < DARK_THRESHOLD


def remove_background(path: str) -> None:
    img = Image.open(path).convert("RGBA")
    pixels = img.load()
    width, height = img.size

    visited = [[False] * height for _ in range(width)]
    queue = deque()

    # Seed from all four edges
    for x in range(width):
        for y in [0, height - 1]:
            r, g, b, a = pixels[x, y]
            if not visited[x][y] and is_dark(r, g, b):
                visited[x][y] = True
                queue.append((x, y))
    for y in range(height):
        for x in [0, width - 1]:
            r, g, b, a = pixels[x, y]
            if not visited[x][y] and is_dark(r, g, b):
                visited[x][y] = True
                queue.append((x, y))

    # BFS flood fill
    background_pixels = set()
    while queue:
        x, y = queue.popleft()
        background_pixels.add((x, y))
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and not visited[nx][ny]:
                r, g, b, a = pixels[nx, ny]
                if is_dark(r, g, b):
                    visited[nx][ny] = True
                    queue.append((nx, ny))

    print(f"Found {len(background_pixels):,} background pixels to remove")

    # Make background pixels fully transparent
    for x, y in background_pixels:
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)

    # Soften edges: partially transparent pixels adjacent to background
    if FEATHER_RADIUS > 0:
        edge_pixels = set()
        for x, y in background_pixels:
            for dx in range(-FEATHER_RADIUS, FEATHER_RADIUS + 1):
                for dy in range(-FEATHER_RADIUS, FEATHER_RADIUS + 1):
                    nx, ny = x + dx, y + dy
                    if (
                        0 <= nx < width
                        and 0 <= ny < height
                        and (nx, ny) not in background_pixels
                    ):
                        edge_pixels.add((nx, ny))

        for x, y in edge_pixels:
            r, g, b, a = pixels[x, y]
            if a > 0:
                # Count how many neighbours are background
                bg_neighbours = sum(
                    1
                    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1,-1),(1,1),(-1,1),(1,-1)]
                    if (x + dx, y + dy) in background_pixels
                )
                if bg_neighbours > 0:
                    new_alpha = int(a * (1 - bg_neighbours / 8 * 0.7))
                    pixels[x, y] = (r, g, b, new_alpha)

    img.save(path, "PNG", optimize=True)
    print(f"Saved transparent logo to {path}")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else LOGO_PATH
    remove_background(path)
