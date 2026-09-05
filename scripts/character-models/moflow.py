# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# Run through build.py using Blender's bundled Python.
from __future__ import annotations

from math import copysign
import bpy
from geometry import Form, Patch, ellipsoid, merge_sculpt, front_point, facial_patch, curve_line, heart
from materials import Palette


def build_moflow(m: Palette) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    body = ellipsoid('Moflow base', Form((0, 0, 0.77), (0.855, 0.57, 0.78)), m.blue)
    for vertex in body.data.vertices:
        z = vertex.co.z / 0.78
        vertex.co.x *= 1.04 - 0.10 * z
        vertex.co.z = copysign(abs(z) ** 0.80, z) * 0.75
    body.data.update()
    tuft1 = ellipsoid('Tall sprout', Form((-0.10, 0, 1.52), (0.095, 0.11, 0.22)), m.blue)
    tuft1.rotation_euler.y = -0.25
    tuft2 = ellipsoid('Small sprout', Form((0.055, 0.015, 1.51), (0.102, 0.105, 0.145)), m.blue)
    tuft2.rotation_euler.y = 0.61
    body = merge_sculpt('Moflow · continuous body and double sprout', [body, tuft1, tuft2], 0.016)
    for vertex in body.data.vertices:
        if vertex.co.z < -0.62:
            vertex.co.z = -0.62 + (vertex.co.z + 0.62) * 0.18
    body.location.z -= 0.13
    body.data.update()
    bpy.context.view_layer.update()
    for side in (-1, 1):
        p = front_point(body, (side * 0.255, 1.035), 0.023)
        ellipsoid('Moflow · bead eye', Form(tuple(p), (0.073, 0.052, 0.083)), m.eye)
        facial_patch('Moflow · soft cheek', body, Patch((side * 0.365, 0.895), (0.076, 0.038), -side * 0.06, m.blush, 0.008))
    curve_line('Moflow · small smile', [tuple(front_point(body, p, 0.019)) for p in [(-0.098, 0.905), (-0.063, 0.875), (0, 0.864), (0.063, 0.875), (0.098, 0.905)]], (0.012, m.mouth))
    merge_sculpt('Moflow · puffy heart', [heart('Heart', Form((0, -0.680, 0.50), (0.38, 0.235, 0.34)), m.heart)], 0.009)
    for side in (-1, 1):
        hand = ellipsoid('Moflow · rounded hugging mitten', Form((side * 0.46, -0.43, 0.48), (0.15, 0.40, 0.155)), m.blue)
        for vertex in hand.data.vertices:
            depth = vertex.co.y / 0.40
            vertex.co.x += side * 0.12 * depth
            vertex.co.z += 0.02 * depth
        hand.data.update()
    return list(set(bpy.data.objects) - before)
