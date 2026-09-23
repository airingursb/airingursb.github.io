#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = ["opencv-python-headless", "numpy"]
# ///
# How to run: uv run scripts/bear-stories/lamps/register.py
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Final

import cv2
import numpy as np
from numpy.typing import NDArray

ROOT: Final = Path("output/tree-lamps-motion/v1")


@dataclass(frozen=True, slots=True)
class Registration:
    frame: int
    scale: float
    shift_x: float
    shift_y: float
    inliers: int


class RegistrationFailure(RuntimeError):
    def __init__(self, frame: int, reason: str) -> None:
        super().__init__(f"Frame {frame}: {reason}")


def read_image(path: Path) -> NDArray[np.uint8]:
    image = cv2.imread(str(path))
    if image is None:
        raise RegistrationFailure(0, f"Cannot read {path}")
    return image


def main() -> None:
    paths = sorted((ROOT / "raw").glob("frame-*.png"))
    reference = read_image(ROOT / "reference.jpg")
    mask = np.zeros(reference.shape[:2], dtype=np.uint8)
    mask[:520, :] = 255
    detector = cv2.SIFT_create(nfeatures=6000, contrastThreshold=.015)
    points, descriptors = detector.detectAndCompute(reference, mask)
    matcher = cv2.BFMatcher()
    registrations: list[Registration] = []
    destination = ROOT / "stable"
    destination.mkdir(exist_ok=True)
    for number, path in enumerate(paths):
        frame = read_image(path)
        frame_points, frame_descriptors = detector.detectAndCompute(frame, None)
        matches = matcher.knnMatch(descriptors, frame_descriptors, k=2)
        good = [first for first, second in matches if first.distance < .68 * second.distance]
        source = np.float32([frame_points[item.trainIdx].pt for item in good])
        target = np.float32([points[item.queryIdx].pt for item in good])
        transform, inliers = cv2.estimateAffinePartial2D(source, target, method=cv2.RANSAC, ransacReprojThreshold=2)
        if transform is None or inliers is None or int(inliers.sum()) < 30:
            raise RegistrationFailure(number, "Insufficient original-canopy matches")
        registrations.append(Registration(number, float(transform[0, 0]), float(transform[0, 2]), float(transform[1, 2]), int(inliers.sum())))
        transform /= 4
        transform[1, 2] -= 7.5
        stable = cv2.warpAffine(frame, transform, (340, 240), flags=cv2.INTER_NEAREST, borderValue=(255, 255, 255))
        cv2.imwrite(str(destination / path.name), stable)
    stack = np.stack([read_image(destination / path.name) for path in paths])
    plate = np.median(stack, axis=0).astype(np.uint8)
    cv2.imwrite(str(ROOT / "temporal-plate.png"), plate)
    (ROOT / "registration.json").write_text(json.dumps([asdict(item) for item in registrations], indent=2), encoding="utf-8")
    print(json.dumps({"frames":len(paths),"minimum_inliers":min(item.inliers for item in registrations),"min_scale":min(item.scale for item in registrations),"max_scale":max(item.scale for item in registrations)}))


if __name__ == "__main__":
    main()
