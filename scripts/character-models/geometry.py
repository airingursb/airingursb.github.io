# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# How to run: imported by build.py inside Blender's bundled Python.
"""Continuous character surfaces and conforming facial details."""
from __future__ import annotations

from dataclasses import dataclass
from math import cos, sin, pi

import bpy
from mathutils import Vector

Vec3 = tuple[float, float, float]


@dataclass(frozen=True, slots=True)
class Form:
    center: Vec3
    radii: Vec3


@dataclass(frozen=True, slots=True)
class Patch:
    center: tuple[float, float]
    radii: tuple[float, float]
    angle: float
    material: bpy.types.Material
    lift: float = 0.008
    contour: float = 0.0


def mesh_object(name: str, vertices: list[Vec3], faces: list[tuple[int, ...]]) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def ellipsoid(name: str, form: Form, material: bpy.types.Material) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=40, location=form.center)
    obj = bpy.context.object
    obj.name = name
    obj.scale = form.radii
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def merge_sculpt(name: str, parts: list[bpy.types.Object], voxel: float = 0.022) -> bpy.types.Object:
    """Voxel union with smoothing makes overlapping masses one sculpted surface."""
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    remesh = obj.modifiers.new('Continuous sculpt', 'REMESH')
    remesh.mode = 'VOXEL'
    remesh.voxel_size = voxel
    remesh.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth = obj.modifiers.new('Clay polish', 'SMOOTH')
    smooth.factor = 0.7
    smooth.iterations = 6
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    sub = obj.modifiers.new('Sculpt finish', 'SUBSURF')
    sub.levels = 1
    bpy.ops.object.modifier_apply(modifier=sub.name)
    return obj


def front_point(obj: bpy.types.Object, xz: tuple[float, float], lift: float = 0.0) -> Vector:
    """Ray-project onto the actual sculpt, so face elements follow its curvature."""
    x, z = xz
    inv = obj.matrix_world.inverted()
    origin = inv @ Vector((x, -4, z))
    direction = inv.to_3x3() @ Vector((0, 1, 0))
    hit, point, normal, index = obj.ray_cast(origin, direction)
    if not hit:
        raise RuntimeError(f'Face projection missed {obj.name} at {xz}')
    world = obj.matrix_world @ point
    world.y -= lift
    return world


def facial_patch(name: str, surface: bpy.types.Object, patch: Patch) -> bpy.types.Object:
    vertices: list[Vec3] = []
    faces: list[tuple[int, ...]] = []
    segments, rings = 64, 12
    for j in range(rings + 1):
        radius = max(j / rings, 0.0001)
        for i in range(segments):
            a = i * 2 * pi / segments
            shaped = radius * (1 + patch.contour * (0.3 * sin(3*a) + 0.2 * cos(5*a) - 0.5 * sin(a)))
            dx, dz = cos(a) * patch.radii[0] * shaped, sin(a) * patch.radii[1] * shaped
            x = patch.center[0] + dx * cos(patch.angle) - dz * sin(patch.angle)
            z = patch.center[1] + dx * sin(patch.angle) + dz * cos(patch.angle)
            point = front_point(surface, (x, z), patch.lift + 0.005 * (1 - radius * radius))
            vertices.append(tuple(point))
    for j in range(rings):
        for i in range(segments):
            a, b = j * segments + i, j * segments + (i + 1) % segments
            faces.append((a, a + segments, b + segments, b))
    obj = mesh_object(name, vertices, faces)
    obj.data.materials.append(patch.material)
    return obj


def curve_line(name: str, points: list[Vec3], style: tuple[float, bpy.types.Material]) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 20
    curve.bevel_depth = style[0]
    curve.bevel_resolution = 4
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for node, point in zip(spline.bezier_points, points, strict=True):
        node.co = point
        node.handle_left_type = 'AUTO'
        node.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(style[1])
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return obj


def heart(name: str, form: Form, material: bpy.types.Material) -> bpy.types.Object:
    """Inflated heart with closed front/back surfaces and a rounded seam."""
    vertices: list[Vec3] = []
    faces: list[tuple[int, ...]] = []
    sectors, rings = 96, 32
    for j in range(rings + 1):
        latitude = pi * j / rings
        radial = max(sin(latitude), 0.0001)
        for i in range(sectors):
            t = 2 * pi * i / sectors
            x = sin(t) ** 3
            z = (13 * cos(t) - 5 * cos(2*t) - 2 * cos(3*t) - cos(4*t)) / 16
            z = -0.82 + (z + 0.82) * 0.48 if z < -0.82 else z
            vertices.append((form.center[0] + x * radial * form.radii[0],
                             form.center[1] - cos(latitude) * form.radii[1],
                             form.center[2] + z * radial * form.radii[2]))
    for j in range(rings):
        for i in range(sectors):
            a, b = j * sectors + i, j * sectors + (i+1) % sectors
            faces.append((a, b, b + sectors, a + sectors))
    obj = mesh_object(name, vertices, faces)
    obj.data.materials.append(material)
    return obj
