# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# How to run: imported by build.py inside Blender's bundled Python.
"""Shared exportable plush materials, with a packed tangent normal texture."""
from __future__ import annotations

from dataclasses import dataclass

import bpy
import numpy as np


def material(name: str, color: tuple[float, float, float], roughness: float) -> bpy.types.Material:
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Specular IOR Level'].default_value = 0.25
    return result


def plush(name: str, color: tuple[float, float, float], texture: bpy.types.Image) -> bpy.types.Material:
    result = material(name, color, 0.92)
    nodes, links = result.node_tree.nodes, result.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Sheen Weight'].default_value = 0.0
    shader.inputs['Sheen Roughness'].default_value = 0.8
    image = nodes.new('ShaderNodeTexImage')
    image.image = texture
    normal = nodes.new('ShaderNodeNormalMap')
    normal.inputs['Strength'].default_value = 0.12
    links.new(image.outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    return result


@dataclass(frozen=True, slots=True)
class Palette:
    ivory: bpy.types.Material
    ink: bpy.types.Material
    blue: bpy.types.Material
    heart: bpy.types.Material
    blush: bpy.types.Material
    eye: bpy.types.Material
    nose: bpy.types.Material
    mouth: bpy.types.Material
    tongue: bpy.types.Material


def create_palette() -> Palette:
    image = bpy.data.images.new('Short velvet · tangent normal', width=512, height=512)
    image.colorspace_settings.name = 'Non-Color'
    rng = np.random.default_rng(1607)
    grain = rng.normal(0, 0.18, (512, 512, 2))
    pixels = np.ones((512, 512, 4), dtype=np.float32)
    pixels[:, :, :2] = np.clip(grain + 0.5, 0, 1)
    pixels[:, :, 2] = 1
    image.pixels.foreach_set(pixels.ravel())
    image.pack()
    return Palette(
        plush('Warm ivory velvet', (0.86, 0.80, 0.67), image),
        plush('Soft ink velvet', (0.004, 0.005, 0.006), image),
        plush('Moflow powder blue', (0.41, 0.66, 0.75), image),
        plush('Rose heart', (0.91, 0.39, 0.43), image),
        material('Soft cheek pink', (0.90, 0.41, 0.44), 0.95),
        material('Quiet bead eyes', (0.007, 0.009, 0.011), 0.12),
        material('Panda button nose', (0.009, 0.007, 0.005), 0.54),
        material('Small smile', (0.020, 0.008, 0.006), 0.86),
        material('Salmon tongue', (0.76, 0.19, 0.17), 0.81),
    )
