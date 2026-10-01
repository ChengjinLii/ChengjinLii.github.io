#!/usr/bin/env python3
"""Build responsive display images without modifying downloadable PNG originals."""

import argparse
from pathlib import Path

from PIL import Image, ImageOps


ASSETS = Path(__file__).resolve().parents[1] / "assets"
IMAGE_NAMES = (
    "studyhub-poster",
    "StudyHub-Agent",
    "ddsurfer_framework_overview",
    "ddsurfer_network_architecture",
    "dMRI-Agent-workflow",
    "dMRI-Agent",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--refresh-webp",
        action="store_true",
        help="Rebuild existing WebP variants after changing the source PNGs.",
    )
    args = parser.parse_args()
    for name in IMAGE_NAMES:
        with Image.open(ASSETS / f"{name}.png") as source:
            original = ImageOps.exif_transpose(source).convert("RGB")
            widths = sorted({640, 960, 1280, 1600, min(2400, original.width)})
            for width in widths:
                height = round(original.height * width / original.width)
                display = original.resize((width, height), Image.Resampling.LANCZOS)
                avif_path = ASSETS / f"{name}-{width}.avif"
                display.save(avif_path, quality=60, speed=6, subsampling="4:4:4")
                webp_path = ASSETS / f"{name}-{width}.webp"
                if args.refresh_webp or not webp_path.exists():
                    display.save(webp_path, quality=84, method=6)
                print(f"{avif_path.name}: {avif_path.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
