#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = ["opencv-python-headless", "numpy"]
# ///
# How to run: uv run scripts/bear-stories/lamps/mask.py
from __future__ import annotations

from pathlib import Path
from typing import Final
import cv2
import numpy as np
from numpy.typing import NDArray

ROOT: Final = Path("output/tree-lamps-motion/v1")


def read_image(path: Path) -> NDArray[np.uint8]:
    image = cv2.imread(str(path))
    if image is None:
        raise FileNotFoundError(path)
    return image


def main() -> None:
    destination = ROOT / "masks"
    destination.mkdir(exist_ok=True)
    for index, path in enumerate(sorted((ROOT / "stable").glob("frame-*.png"))[:150]):
        frame = read_image(path)
        blue, green, red = cv2.split(frame.astype(np.int16))
        fur = ((red > 140) & (red < 201) & (green > 91) & (green < 151)
               & (blue > 58) & (blue < 119) & (red - green > 31)
               & (green - blue > 20) & (blue / np.maximum(green, 1) > .60)).astype(np.uint8) * 255
        fur[:119] = 0
        fur[213:] = 0
        fur[:, :133] = 0
        fur[:, 222:] = 0
        count, labels, stats, _ = cv2.connectedComponentsWithStats(fur)
        largest = 1 + int(np.argmax(stats[1:count, cv2.CC_STAT_AREA]))
        left, top, actor_width, actor_height, _ = stats[largest]
        fur[:, :max(133, left - 4)] = 0
        fur[:, min(222, left + actor_width + 4):] = 0
        mask = np.zeros_like(fur)
        cv2.fillConvexPoly(mask, cv2.convexHull(cv2.findNonZero(fur)), 255)
        mask = cv2.dilate(mask, np.ones((7, 7), np.uint8))
        # The same book is put down beside the bear, then picked up again.
        if 15 <= index <= 123:
            book = np.zeros_like(mask)
            book[182:209, 106:175] = ((green[182:209, 106:175] > red[182:209, 106:175] - 14)
                                    & (blue[182:209, 106:175] < green[182:209, 106:175] - 15)
                                    & (red[182:209, 106:175] < 240)).astype(np.uint8) * 255
            points = cv2.findNonZero(book)
            if points is not None:
                cv2.fillConvexPoly(book, cv2.convexHull(points), 255)
                mask = np.maximum(mask, cv2.dilate(book, np.ones((5, 5), np.uint8)))
        mask[:116] = 0
        mask[:, 222:] = 0
        mask[214:] = 0
        cv2.imwrite(str(destination / path.name), mask)
    print(f"Wrote {index + 1} lamp actor masks")


if __name__ == "__main__":
    main()
