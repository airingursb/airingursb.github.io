#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = ["opencv-python-headless", "numpy"]
# ///
# How to run: uv run scripts/bear-stories/garden/footer-mask.py
from __future__ import annotations

from pathlib import Path
from typing import Final

import cv2
import numpy as np
from numpy.typing import NDArray

ROOT: Final = Path("output/bear-stories/revision-3/garden")


def read_image(path: Path) -> NDArray[np.uint8]:
    image = cv2.imread(str(path))
    if image is None:
        raise FileNotFoundError(path)
    return image


def fill(mask: NDArray[np.uint8]) -> NDArray[np.uint8]:
    result = np.zeros_like(mask)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(result, contours, -1, 255, cv2.FILLED)
    return result


def main() -> None:
    destination = Path("output/bear-stories/revision-4/masks")
    destination.mkdir(parents=True, exist_ok=True)
    plate = read_image(ROOT / "h3/temporal-plate.png")
    for index, path in enumerate(sorted((ROOT / "h3/stable").glob("frame-*.png"))):
        frame = read_image(path)
        blue, green, red = cv2.split(frame.astype(np.int16))
        fur = ((red > 140) & (red < 201) & (green > 91) & (green < 151) & (blue > 58) & (blue < 115) & (red - green > 31) & (green - blue > 20) & (blue / np.maximum(green, 1) > .58)).astype(np.uint8) * 255
        fur[:126] = 0
        fur[:, :110] = 0
        fur[:, 278:] = 0
        fur[235:] = 0
        count, labels, stats, _ = cv2.connectedComponentsWithStats(fur)
        label = 1 + int(np.argmax(stats[1:count, cv2.CC_STAT_AREA]))
        core = (labels == label).astype(np.uint8) * 255
        ys, xs = np.nonzero(core)
        center = int(np.median(xs))
        body = fur.copy()
        body[:, :max(110, center - 43)] = 0
        body[:, min(278, center + 44):] = 0
        body[:int(ys.min())] = 0
        body_points = cv2.findNonZero(body)
        mask = np.zeros_like(fur)
        cv2.fillConvexPoly(mask, cv2.convexHull(body_points), 255)
        mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))
        neutral = (np.minimum(np.minimum(red, green), blue) > 214) & (np.maximum(np.maximum(red, green), blue) - np.minimum(np.minimum(red, green), blue) < 28)
        water = (blue - red > 5) & (green - red > 3)
        neutral &= ~water
        _, white_labels = cv2.connectedComponents(neutral.astype(np.uint8))
        edge_labels = np.unique(np.concatenate([white_labels[0], white_labels[-1], white_labels[:, 0], white_labels[:, -1]]))
        outside = np.isin(white_labels, edge_labels[edge_labels != 0])
        mask[outside] = 0
        # A closed book lies on the original bench only until the bear retrieves it.
        if 17 <= index <= 126:
            book = np.zeros_like(mask)
            book[190:211, 94:137] = ((green[190:211, 94:137] > red[190:211, 94:137] - 20) & (blue[190:211, 94:137] > red[190:211, 94:137] - 90)).astype(np.uint8) * 255
            book = fill(cv2.dilate(book, np.ones((3, 3), np.uint8)))
            mask = np.maximum(mask, book)
        # The source can's moving silhouette is isolated from its static shrub backdrop.
        if 44 <= index <= 106:
            difference = np.max(np.abs(frame.astype(np.int16) - plate.astype(np.int16)), axis=2)
            care = np.zeros_like(mask)
            care[158:230, 229:306] = (difference[158:230, 229:306] > 13).astype(np.uint8) * 255
            care = fill(cv2.morphologyEx(care, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)))
            care[outside] = 0
            mask = np.maximum(mask, care)
        # Preserve the stationary original pot; retain only water above its soil.
        mask[202:, 278:] = 0
        bright_matte = (np.minimum(np.minimum(red, green), blue) > 235) & (np.maximum(np.maximum(red, green), blue) - np.minimum(np.minimum(red, green), blue) < 20) & ~water
        mask[outside | bright_matte] = 0
        mask[:126] = 0
        mask[235:] = 0
        cv2.imwrite(str(destination / path.name), mask)
    print(f"Wrote {index + 1} actor masks")


if __name__ == "__main__":
    main()
