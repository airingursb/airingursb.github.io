#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = ["opencv-python-headless", "numpy"]
# ///
# ─── How to run ───
# 1. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run: uv run scripts/bear-stories/garden/stabilize.py
# ──────────────────
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Final

import cv2
import numpy as np
from numpy.typing import NDArray

ROOT: Final = Path("output/bear-stories/garden/h3-v2")


@dataclass(frozen=True, slots=True)
class Registration:
    frame: int
    scale: float
    shift_x: float
    shift_y: float
    inliers: int


class RegistrationFailure(RuntimeError):
    def __init__(self, frame: int, reason: str) -> None:
        self.frame = frame
        self.reason = reason
        super().__init__(f"Frame {frame}: {reason}")


def read_frame(path: Path) -> NDArray[np.uint8]:
    frame = cv2.imread(str(path))
    if frame is None:
        raise RegistrationFailure(0, f"Cannot read {path}")
    return frame


def main() -> None:
    paths = sorted(ROOT.glob("frame-*.png"))
    reference = read_frame(paths[0])
    mask = np.zeros(reference.shape[:2], dtype=np.uint8)
    mask[:370, :] = 255
    detector = cv2.SIFT_create(nfeatures=6000, contrastThreshold=.015)
    reference_points, reference_descriptors = detector.detectAndCompute(reference, mask)
    matcher = cv2.BFMatcher()
    registrations: list[Registration] = []
    for number, path in enumerate(paths):
        frame = read_frame(path)
        points, descriptors = detector.detectAndCompute(frame, None)
        matches = matcher.knnMatch(reference_descriptors, descriptors, k=2)
        good = [first for first, second in matches if first.distance < .68 * second.distance]
        source = np.float32([points[match.trainIdx].pt for match in good])
        target = np.float32([reference_points[match.queryIdx].pt for match in good])
        transform, inlier_mask = cv2.estimateAffinePartial2D(source, target, method=cv2.RANSAC, ransacReprojThreshold=1.5)
        if transform is None or inlier_mask is None or int(inlier_mask.sum()) < 25:
            raise RegistrationFailure(number, "Not enough fixed-canopy correspondences")
        registrations.append(Registration(number, float(transform[0, 0]), float(transform[0, 2]), float(transform[1, 2]), int(inlier_mask.sum())))
    destination = ROOT / "stable"
    destination.mkdir(exist_ok=True)
    for number, path in enumerate(paths):
        neighborhood = registrations[max(0, number - 2):min(len(paths), number + 3)]
        scale = float(np.median([item.scale for item in neighborhood]))
        shift_x = float(np.median([item.shift_x for item in neighborhood]))
        shift_y = float(np.median([item.shift_y for item in neighborhood]))
        transform = np.float32([[scale, 0, shift_x], [0, scale, shift_y]])
        stable = cv2.warpAffine(read_frame(path), transform, (1344, 768), flags=cv2.INTER_NEAREST, borderValue=(255, 255, 255))
        crop = stable[0:720, 160:1180]
        output = cv2.resize(crop, (340, 240), interpolation=cv2.INTER_NEAREST)
        cv2.imwrite(str(destination / path.name), output)
    (ROOT / "registration.json").write_text(json.dumps([asdict(item) for item in registrations], indent=2), encoding="utf-8")
    print(json.dumps({"frames": len(paths), "minimum_inliers": min(item.inliers for item in registrations), "minimum_scale": min(item.scale for item in registrations)}))


if __name__ == "__main__":
    main()
