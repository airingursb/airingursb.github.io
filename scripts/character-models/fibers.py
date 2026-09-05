from __future__ import annotations

from bisect import bisect_left
from math import sqrt
from random import Random
import bpy
from mathutils import Vector
from geometry import Vec3, mesh_object


def add_fibers(surface: bpy.types.Object, count: int, length: float) -> bpy.types.Object:
    mesh = surface.data
    mesh.calc_loop_triangles()
    areas: list[float] = []
    area = 0.0
    for triangle in mesh.loop_triangles:
        area += triangle.area
        areas.append(area)
    rng = Random(1607 + len(mesh.vertices))
    vertices: list[Vec3] = []
    faces: list[tuple[int, ...]] = []
    for index in range(count):
        triangle = mesh.loop_triangles[bisect_left(areas, rng.random() * area)]
        va, vb, vc = [mesh.vertices[i] for i in triangle.vertices]
        u = sqrt(rng.random())
        v = rng.random()
        weights = (1-u, u*(1-v), u*v)
        p = va.co * weights[0] + vb.co * weights[1] + vc.co * weights[2]
        normal = (va.normal * weights[0] + vb.normal * weights[1] + vc.normal * weights[2]).normalized()
        tangent = normal.cross(Vector((0.37, 0.69, 0.23))).normalized()
        height = length * rng.uniform(0.55, 1.15)
        width = height * 0.065
        root = p - normal * height * 0.15
        tip = p + normal * height + tangent * height * 0.25
        start = len(vertices)
        vertices.extend([tuple(root - tangent*width), tuple(root + tangent*width), tuple(tip)])
        faces.append((start, start+1, start+2))
    obj = mesh_object(surface.name + ' · velvet fibers', vertices, faces)
    obj.matrix_world = surface.matrix_world.copy()
    obj.data.materials.append(surface.data.materials[0])
    return obj
