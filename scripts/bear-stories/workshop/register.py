# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy==2.4.6", "opencv-python-headless==5.0.0.93"]
# ///
# ─── How to run ───
# uv run scripts/bear-stories/workshop/register.py
"""Measure the source camera from the complete rigid peg rail and its tools."""
from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Final

import cv2
import numpy as np
from numpy.typing import NDArray

ROOT: Final = Path("output/bear-stories/workshop/h3-v1")
OUT: Final = Path("output/bear-stories/revision-2/workshop/diagnostics")
SIZE: Final = (1152, 648)


@dataclass(frozen=True, slots=True)
class Camera:
    name: str
    scale: float
    dx: float
    dy: float
    correlation: float


def measure() -> list[Camera]:
    """Refine coarse initial transforms using all textured pixels, not a widest row."""
    coarse = json.loads((ROOT / "registration.json").read_text())
    reference = cv2.imread(str(ROOT / "raw" / "0001.png"), cv2.IMREAD_GRAYSCALE)
    assert reference is not None
    crop = reference[178:322, 259:434]
    cameras: list[Camera] = []
    local_origin = np.array([[1, 0, 259], [0, 1, 178], [0, 0, 1]], dtype=np.float64)
    for item in coarse:
        current = cv2.imread(str(ROOT / "raw" / item["name"]), cv2.IMREAD_GRAYSCALE)
        assert current is not None
        initial = np.array([[item["scale"], 0, item["dx"]], [0, item["scale"], item["dy"]], [0, 0, 1]], dtype=np.float64)
        aligned = cv2.warpAffine(current, initial[:2], SIZE, flags=cv2.INTER_LINEAR, borderValue=250)
        correlation, correction = cv2.findTransformECC(crop, aligned[178:322, 259:434], np.eye(2, 3, dtype=np.float32), cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 120, 0.000001))
        global_correction = local_origin @ np.vstack([correction, [0, 0, 1]]) @ np.linalg.inv(local_origin)
        refined = np.linalg.inv(global_correction) @ initial
        # No skew/rotation is authored by this locked frontal source camera.
        scale = float(np.sqrt(np.linalg.det(refined[:2, :2])))
        source_center = np.linalg.inv(initial) @ np.array([346.5, 249.0, 1.0])
        target_center = refined @ source_center
        cameras.append(Camera(item["name"], scale, float(target_center[0] - scale * source_center[0]), float(target_center[1] - scale * source_center[1]), float(correlation)))
    return cameras


def smooth(cameras: list[Camera]) -> list[Camera]:
    """Remove high-frequency estimator noise without filtering any actor pixels."""
    values = np.array([[c.scale, c.dx, c.dy] for c in cameras], dtype=np.float64)
    filtered: NDArray[np.float64] = np.asarray(cv2.GaussianBlur(values, (1, 15), 0, sigmaY=3.0, borderType=cv2.BORDER_REFLECT_101), dtype=np.float64)
    # Anchor the starting pose exactly; ease out the one-sided endpoint correction.
    offset = filtered[0] - np.array([1, 0, 0], dtype=np.float64)
    for index in range(len(cameras)):
        filtered[index] -= offset * np.exp(-index / 4.0)
    return [Camera(c.name, float(v[0]), float(v[1]), float(v[2]), c.correlation) for c, v in zip(cameras, filtered, strict=True)]


def main() -> None:
    """Write both measured and smoothed transforms for an auditable comparison."""
    cameras = measure()
    (OUT / "camera-measured.json").write_text(json.dumps([asdict(c) for c in cameras], indent=2))
    (OUT / "camera-smooth.json").write_text(json.dumps([asdict(c) for c in smooth(cameras)], indent=2))
    print(f"Measured {len(cameras)} camera transforms; minimum correlation {min(c.correlation for c in cameras):.4f}")


if __name__ == "__main__":
    main()
