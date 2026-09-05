# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# Run through build.py using Blender's bundled Python.
from __future__ import annotations

from math import exp
import bpy
from mathutils import Matrix, Vector
from geometry import Form, Patch, ellipsoid, merge_sculpt, front_point, facial_patch, curve_line
from materials import Palette, material


def build_panda(m: Palette) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    eye_material = material('Panda · deep soft eyes', (0.0008, 0.001, 0.0012), 0.32)
    eye_material.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value = 0.12
    glint_material = material('Panda · tiny eye catchlight', (0.9, 0.87, 0.79), 0.45)
    head = ellipsoid('Panda · sculpted cheek head', Form((0, 0, 1.60), (1.11, 0.67, 0.73)), m.ivory)
    for vertex in head.data.vertices:
        x, y, z = vertex.co
        fullness = exp(-((z + 0.30) / 0.30) ** 2)
        vertex.co.x *= 1 + 0.105 * fullness
        if y < 0:
            vertex.co.y -= 0.15 * fullness * exp(-((abs(x) - 0.48) / 0.38) ** 2)
        if z < -0.50:
            vertex.co.z = -0.50 + (z + 0.50) * 0.78
    head.data.update()
    torso_parts = [
        ellipsoid('Seated torso', Form((0, 0.04, 0.49), (0.82, 0.56, 0.49)), m.ink),
    ]
    for side in (-1, 1):
        torso_parts.extend([
            ellipsoid('Shoulder', Form((side * 0.65, -0.08, 0.76), (0.30, 0.35, 0.31)), m.ink),
            ellipsoid('Bent upper arm', Form((side * 0.72, -0.27, 0.65), (0.27, 0.32, 0.26)), m.ink),
            ellipsoid('Resting paw', Form((side * 0.59, -0.48, 0.56), (0.26, 0.25, 0.22)), m.ink),
        ])
    body = merge_sculpt('Panda · continuous seated torso', torso_parts, 0.020)
    ellipsoid('Panda · belly coat', Form((0, -0.235, 0.46), (0.60, 0.435, 0.445)), m.ivory)
    for side in (-1, 1):
        ear = ellipsoid('Panda · round ear', Form((side * 0.80, 0.025, 2.15), (0.265, 0.195, 0.29)), m.ink)
        ear.rotation_euler.y = side * 0.25
        foot = ellipsoid('Panda · short foot', Form((side * 0.66, -0.39, 0.205), (0.335, 0.40, 0.23)), m.ink)
        foot.rotation_euler.z = side * 0.32
        facial_patch('Panda · tapered eye patch', head, Patch((side * 0.405, 1.59), (0.165, 0.235), side * 0.54, m.ink, 0.008, 0.04))
        p = front_point(head, (side * 0.37, 1.55), 0.008)
        eye = ellipsoid('Panda · nestled bead eye', Form(tuple(p), (0.065, 0.035, 0.040)), eye_material)
        eye.rotation_euler.y = side * 0.20
        ellipsoid('Panda · eye catchlight', Form((p.x - 0.017, p.y - 0.034, p.z + 0.012), (0.009, 0.004, 0.007)), glint_material)
    muzzle = merge_sculpt('Panda · two soft muzzle lobes', [
        ellipsoid('Left muzzle', Form((-0.15, -0.775, 1.26), (0.23, 0.255, 0.195)), m.ivory),
        ellipsoid('Right muzzle', Form((0.15, -0.775, 1.26), (0.23, 0.255, 0.195)), m.ivory),
    ], 0.010)
    ellipsoid('Panda · open mouth cavity', Form((0, -0.84, 1.11), (0.16, 0.065, 0.13)), m.mouth)
    nose = ellipsoid('Panda · soft triangular nose', Form((0, -1.035, 1.345), (0.145, 0.075, 0.080)), m.nose)
    for vertex in nose.data.vertices:
        vertex.co.x *= 0.85 + 0.15 * (vertex.co.z + 0.080) / 0.16
    nose.data.update()
    curve_line('Panda · philtrum seam', [(0, -1.040, 1.295), (0, -1.040, 1.25), (0, -1.010, 1.20)], (0.004, m.mouth))
    tongue = ellipsoid('Panda · soft curled tongue', Form((0.008, -0.89, 1.035), (0.083, 0.040, 0.10)), m.tongue)
    tongue.rotation_euler.x = -0.16
    for vertex in tongue.data.vertices:
        if vertex.co.y < 0:
            vertex.co.y += 0.010 * exp(-(vertex.co.x / 0.018) ** 2)
    tongue.data.update()
    ellipsoid('Panda · tail', Form((0, 0.55, 0.25), (0.17, 0.16, 0.17)), m.ivory)
    bpy.context.view_layer.update()
    pivot = Vector((0, 0, 1.6))
    tilt = Matrix.Translation(pivot) @ Matrix.Rotation(-0.16, 4, 'Y') @ Matrix.Translation(-pivot)
    for obj in set(bpy.data.objects) - before:
        if any(part in obj.name for part in ('nose', 'mouth', 'philtrum', 'tongue', 'muzzle', 'smile')):
            obj.location.z += 0.11
            bpy.context.view_layer.update()
        if any(part in obj.name for part in ('head', 'ear', 'eye', 'nose', 'mouth', 'philtrum', 'tongue', 'muzzle', 'smile')):
            obj.matrix_world = Matrix.Translation((0.025, 0, -0.075)) @ tilt @ obj.matrix_world
    return list(set(bpy.data.objects) - before)
