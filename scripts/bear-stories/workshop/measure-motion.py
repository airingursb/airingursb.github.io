# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy==2.4.6", "opencv-python-headless==5.0.0.93"]
# ///
# ─── How to run ───
# uv run scripts/bear-stories/workshop/measure-motion.py
"""Track the same rigid machine corner through complete before/after atlases."""
from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Final

import cv2
import numpy as np
from numpy.typing import NDArray

ROOT: Final = Path("output/bear-stories/revision-2/workshop")


@dataclass(frozen=True, slots=True)
class MotionReport:
    variant: str
    minimum_correlation: float
    x_range: float
    y_range: float
    maximum_frame_step: float
    p95_frame_step: float
    acceleration_rms: float
    trajectory: list[list[float]]


def frame(atlas: NDArray[np.uint8], index: int) -> NDArray[np.uint8]:
    """Extract actual served raster pixels without synthetic camera metadata."""
    x, y = index % 10 * 384, index // 10 * 216
    return atlas[y:y + 216, x:x + 384]


def measure(variant: str) -> MotionReport:
    """Estimate subpixel edge position from a small corner that hands never cover."""
    atlas = cv2.imread(str(ROOT / variant / "workshop-atlas.webp"), cv2.IMREAD_GRAYSCALE)
    assert atlas is not None
    atlas = np.asarray(atlas, dtype=np.uint8)
    template = frame(atlas, 0)[142:154, 231:241]
    positions: list[list[float]] = []
    correlations: list[float] = []
    for index in range(181):
        candidate = frame(atlas, index)[132:164, 221:251]
        scores = cv2.matchTemplate(candidate, template, cv2.TM_CCOEFF_NORMED)
        _, confidence, _, (x, y) = cv2.minMaxLoc(scores)
        assert 0 < x < 20 and 0 < y < 20, index
        center = scores[y, x]
        dx = .5 * (scores[y, x - 1] - scores[y, x + 1]) / (scores[y, x - 1] - 2 * center + scores[y, x + 1])
        dy = .5 * (scores[y - 1, x] - scores[y + 1, x]) / (scores[y - 1, x] - 2 * center + scores[y + 1, x])
        positions.append([float(x + dx - 10), float(y + dy - 10)])
        correlations.append(confidence)
    values = np.array(positions)
    steps = np.linalg.norm(np.diff(values, axis=0), axis=1)
    accelerations = np.diff(values, n=2, axis=0)
    return MotionReport(variant, min(correlations), float(np.ptp(values[:, 0])), float(np.ptp(values[:, 1])), float(steps.max()), float(np.percentile(steps, 95)), float(np.sqrt(np.mean(accelerations ** 2))), positions)


def main() -> None:
    """Persist both variants and fail if residual rigid-base movement remains visible."""
    reports = [measure(variant) for variant in ("before", "after")]
    (ROOT / "after/motion-metrics.json").write_text(json.dumps([asdict(report) for report in reports], indent=2))
    for report in reports:
        print(report.variant, report.x_range, report.y_range, report.maximum_frame_step, report.p95_frame_step, report.acceleration_rms)
    assert reports[1].maximum_frame_step < .35
    assert reports[1].acceleration_rms < reports[0].acceleration_rms * .35


if __name__ == "__main__":
    main()
