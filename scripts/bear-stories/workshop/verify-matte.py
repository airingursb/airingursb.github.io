# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy==2.4.6", "opencv-python-headless==5.0.0.93"]
# ///
# ─── How to run ───
# uv run scripts/bear-stories/workshop/verify-matte.py
"""Guard the character's light features against destructive white-key cleanup."""
from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Final

import cv2
import numpy as np

from matte import remove_matte

ROOT: Final = Path("output/bear-stories/workshop/h3-v1/raw")
OUT: Final = Path("output/bear-stories/revision-2/workshop/after/matte-preservation.json")


@dataclass(frozen=True, slots=True)
class Sample:
    name: str
    frame: str
    x: int
    y: int
    rgb: list[int]
    rgba: list[int]


def main() -> None:
    """Require source-color identity and full opacity at actual white landmarks."""
    landmarks = [("cream ear", "0001.png", 489, 207), ("cream muzzle", "0001.png", 572, 312), ("panda forehead", "0001.png", 847, 377), ("book page", "0001.png", 802, 422), ("smoke interior", "0061.png", 743, 210)]
    samples: list[Sample] = []
    for name, frame, x, y in landmarks:
        raw = cv2.imread(str(ROOT / frame))
        assert raw is not None
        rgb = np.asarray(cv2.cvtColor(raw, cv2.COLOR_BGR2RGB), dtype=np.uint8)
        rgba = remove_matte(rgb)
        sample = Sample(name, frame, x, y, rgb[y, x].tolist(), rgba[y, x].tolist())
        samples.append(sample)
        assert rgba[y, x, 3] == 255, sample
        assert np.array_equal(rgb[y, x], rgba[y, x, :3]), sample
        assert int(rgb[y, x].min()) > 165, sample
    OUT.write_text(json.dumps([asdict(sample) for sample in samples], indent=2))
    print("Preserved solid cream ear, muzzle, panda, paper, and authored smoke")


if __name__ == "__main__":
    main()
