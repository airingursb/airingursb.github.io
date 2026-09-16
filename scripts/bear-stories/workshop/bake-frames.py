# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy==2.4.6", "opencv-python-headless==5.0.0.93"]
# ///
# ─── How to run ───
# uv run scripts/bear-stories/workshop/register.py
# uv run scripts/bear-stories/workshop/bake-frames.py
"""Render the H3 action against its stable first-frame workshop plate."""
import json
from pathlib import Path
from typing import Final

import cv2
import numpy as np
from numpy.typing import NDArray

from matte import recover_glow, remove_matte

RAW: Final = Path("output/bear-stories/workshop/h3-v1/raw")
ROOT: Final = Path("output/bear-stories/revision-2/workshop")
DESTINATION: Final = ROOT / "after" / "frames"


def resize_premultiplied(rgba: NDArray[np.uint8]) -> NDArray[np.uint8]:
    """Area integration avoids sampling-phase crawl; unpremultiply for PNG storage."""
    floating = rgba.astype(np.float32) / 255
    floating[:, :, :3] *= floating[:, :, 3:4]
    small = cv2.resize(floating, (384, 216), interpolation=cv2.INTER_AREA)
    small[:, :, :3] /= np.maximum(small[:, :, 3:4], .00001)
    return np.rint(np.clip(small, 0, 1) * 255).astype(np.uint8)


def main() -> None:
    """Keep the real character frames; freeze only the static bench and outer props."""
    DESTINATION.mkdir(parents=True, exist_ok=True)
    cameras = json.loads((ROOT / "diagnostics/camera-final.json").read_text())
    first = cv2.imread(str(RAW / "0001.png"))
    assert first is not None
    reference = remove_matte(np.asarray(cv2.cvtColor(first, cv2.COLOR_BGR2RGB), dtype=np.uint8))
    for item in cameras:
        raw = cv2.imread(str(RAW / item["name"]))
        assert raw is not None
        rgb = np.asarray(cv2.cvtColor(raw, cv2.COLOR_BGR2RGB), dtype=np.uint8)
        rgba = remove_matte(rgb)
        matrix = np.array([[item["scale"], 0, item["dx"]], [0, item["scale"], item["dy"]]], dtype=np.float64)
        # Premultiplication prevents the removed backing from re-entering filtered edges.
        floating = rgba.astype(np.float32) / 255
        floating[:, :, :3] *= floating[:, :, 3:4]
        aligned = cv2.warpAffine(floating, matrix, (1152, 648), flags=cv2.INTER_LINEAR)
        aligned[:, :, :3] /= np.maximum(aligned[:, :, 3:4], .00001)
        aligned_byte = np.rint(np.clip(aligned, 0, 1) * 255).astype(np.uint8)
        aligned_byte = recover_glow(aligned_byte)
        combined = reference.copy()
        combined[90:458, 401:815] = aligned_byte[90:458, 401:815]
        frame = resize_premultiplied(combined)
        cv2.imwrite(str(DESTINATION / item["name"]), cv2.cvtColor(frame, cv2.COLOR_RGBA2BGRA))
    print(f"Baked {len(cameras)} frames; static front bench retained")


if __name__ == "__main__":
    main()
