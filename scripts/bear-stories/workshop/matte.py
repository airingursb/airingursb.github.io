# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy==2.4.6", "opencv-python-headless==5.0.0.93"]
# ///
# ─── How to run ───
# Imported by: uv run scripts/bear-stories/workshop/bake-frames.py
"""Remove connected white backing and its color spill without eroding artwork."""
import cv2
import numpy as np
from numpy.typing import NDArray


def remove_matte(rgb: NDArray[np.uint8]) -> NDArray[np.uint8]:
    """Infer boundary coverage from nearby interior color; retain solid cream areas."""
    low, high = rgb.min(axis=2), rgb.max(axis=2)
    possible = ((low >= 226) & ((high - low) <= 24)).astype(np.uint8)
    _, labels = cv2.connectedComponents(possible, connectivity=4)
    border_labels = np.unique(np.concatenate((labels[0], labels[-1], labels[:, 0], labels[:, -1])))
    exterior = np.isin(labels, border_labels[border_labels != 0]) & (possible > 0)
    support = (~exterior).astype(np.uint8)
    depth = cv2.distanceTransform(support, cv2.DIST_L2, cv2.DIST_MASK_PRECISE)
    # This inset selects reliable color samples only. It is NOT the output alpha.
    core = ((depth > 1.5) & ((low < 95) | ((high - low > 50) & (low < 155)))).astype(np.uint8)
    distance, nearest = cv2.distanceTransformWithLabels(1 - core, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    core_y, core_x = np.nonzero(core)
    foreground = rgb[core_y, core_x].astype(np.float32)[np.maximum(nearest - 1, 0)]
    edge = (depth > 0) & (depth <= 10.0)
    backing = np.median(rgb[exterior], axis=0)
    sample = rgb.astype(np.float32)
    direction = foreground - backing
    squared = np.sum(direction * direction, axis=2)
    coverage = np.clip(np.sum((sample - backing) * direction, axis=2) / np.maximum(squared, 1), 0, 1)
    predicted = backing + coverage[:, :, None] * direction
    residual = np.linalg.norm(sample - predicted, axis=2)
    mixed = edge & (coverage < .98) & (squared > 1800) & (residual < 48) & (distance < 12)
    alpha = support.astype(np.float32)
    alpha[mixed] = coverage[mixed]
    corrected = np.clip((sample - backing * (1 - alpha[:, :, None])) / np.maximum(alpha[:, :, None], .01), 0, 255)
    corrected[mixed] = foreground[mixed]
    corrected[~mixed] = sample[~mixed]
    corrected[exterior] = 0
    return np.dstack((corrected.astype(np.uint8), np.rint(alpha * 255).astype(np.uint8)))


def recover_glow(rgba: NDArray[np.uint8]) -> NDArray[np.uint8]:
    """Recover the pale lamp aura as warm light, keeping its opaque bulb and other whites."""
    result = rgba.copy()
    region = result[292:384, 630:741]
    colors = region[:, :, :3].astype(np.float32)
    yy, xx = np.mgrid[292:384, 630:741]
    warm = ((colors[:, :, 0] - colors[:, :, 1] >= 3) & (colors[:, :, 1] - colors[:, :, 2] >= 5) & (colors[:, :, 2] > 175) & (region[:, :, 3] > 0)).astype(np.uint8)
    _, labels = cv2.connectedComponents(warm, connectivity=8)
    # Only the connected warm aura on the right of the lamp qualifies. The bear's
    # cream muzzle, panda, book and grey smoke cannot enter this component.
    sample = (xx >= 711) & (xx <= 730) & (yy >= 314) & (yy <= 358) & (warm > 0)
    selected = np.unique(labels[sample])
    outside_bulb = ((xx - 687) / 20) ** 2 + ((yy - 337) / 23) ** 2 > 1
    glow = np.isin(labels, selected[selected != 0]) & outside_bulb
    coverage = np.clip((248 - colors[:, :, 2]) / 198, .01, 1)
    recovered = np.clip((colors - 248 * (1 - coverage[:, :, None])) / coverage[:, :, None], 0, 255)
    region[:, :, :3][glow] = np.rint(recovered[glow]).astype(np.uint8)
    region[:, :, 3][glow] = np.rint(region[:, :, 3][glow] * coverage[glow]).astype(np.uint8)
    return result
