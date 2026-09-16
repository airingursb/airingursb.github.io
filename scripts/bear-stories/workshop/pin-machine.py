# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy==2.4.6", "opencv-python-headless==5.0.0.93"]
# ///
# ─── How to run ───
# uv run scripts/bear-stories/workshop/pin-machine.py
"""Correct local camera/parallax residual against the stationary machine base."""
from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Final

import cv2
import numpy as np
from numpy.typing import NDArray

ROOT: Final = Path("output/bear-stories/revision-2/workshop/diagnostics")
RAW: Final = Path("output/bear-stories/workshop/h3-v1/raw")


@dataclass(frozen=True, slots=True)
class Anchor:
    frame: str
    x: float
    y: float
    confidence: float


def subpixel(values: NDArray[np.float32], y: int, x: int) -> tuple[float, float]:
    """Quadratic interpolation around a non-border correlation maximum."""
    center = values[y, x]
    dx = .5 * (values[y, x - 1] - values[y, x + 1]) / (values[y, x - 1] - 2 * center + values[y, x + 1])
    dy = .5 * (values[y - 1, x] - values[y + 1, x]) / (values[y - 1, x] - 2 * center + values[y + 1, x])
    return float(x + dx), float(y + dy)


def main() -> None:
    """Pin the corner, leaving the hands, head, dial, switch and smoke untouched."""
    cameras = json.loads((ROOT / "camera-smooth.json").read_text())
    reference = cv2.imread(str(RAW / "0001.png"), cv2.IMREAD_GRAYSCALE)
    assert reference is not None
    template = reference[433:459, 697:721]
    anchors: list[Anchor] = []
    for item in cameras:
        raw = cv2.imread(str(RAW / item["name"]), cv2.IMREAD_GRAYSCALE)
        assert raw is not None
        matrix = np.array([[item["scale"], 0, item["dx"]], [0, item["scale"], item["dy"]]], dtype=np.float64)
        aligned = cv2.warpAffine(raw, matrix, (1152, 648), flags=cv2.INTER_LINEAR, borderValue=250)
        values = cv2.matchTemplate(aligned[418:474, 682:736], template, cv2.TM_CCOEFF_NORMED)
        _, confidence, _, (x, y) = cv2.minMaxLoc(values)
        assert 0 < x < values.shape[1] - 1 and 0 < y < values.shape[0] - 1, item["name"]
        precise_x, precise_y = subpixel(np.asarray(values, dtype=np.float32), y, x)
        anchors.append(Anchor(item["name"], precise_x - 15, precise_y - 15, confidence))
    positions = np.array([[a.x, a.y] for a in anchors], dtype=np.float64)
    # Smooth only measured rigid-base residual, never the character's motion.
    filtered = cv2.GaussianBlur(positions, (1, 9), 0, sigmaY=1.8, borderType=cv2.BORDER_REFLECT_101)
    filtered -= filtered[0]
    for camera, (x, y) in zip(cameras, filtered, strict=True):
        camera["dx"] -= float(x)
        camera["dy"] -= float(y)
    (ROOT / "machine-anchor.json").write_text(json.dumps([asdict(a) for a in anchors], indent=2))
    (ROOT / "camera-final.json").write_text(json.dumps(cameras, indent=2))
    print(f"Machine corner minimum correlation {min(a.confidence for a in anchors):.4f}; residual range {np.ptp(positions, axis=0).tolist()}")


if __name__ == "__main__":
    main()
