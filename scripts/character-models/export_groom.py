# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# Run with Blender --background <source.blend> --python export_groom.py
from __future__ import annotations

from pathlib import Path
from random import Random
import sys
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))
from geometry import Vec3, mesh_object
from materials import material
from build import export


def convert_strands(obj: bpy.types.Object, evaluated: bpy.types.Object) -> bpy.types.Object:
    system = evaluated.particle_systems[0]
    count = len(system.particles) + len(system.child_particles)
    vertices: list[Vec3] = []
    normals: list[Vec3] = []
    faces: list[tuple[int, ...]] = []
    colors: list[tuple[float, float, float, float]] = []
    rng = Random(1607)
    for particle in range(count):
        samples = [system.co_hair(evaluated, particle_no=particle, step=step) for step in range(9)]
        # Blender returns zero vectors after each variable-length child's cached tip.
        while samples and samples[-1].length_squared == 0:
            samples.pop()
        if len(samples) < 2:
            continue
        points = [samples[0], samples[(len(samples) - 1) // 2], samples[-1]]
        axis = points[-1] - points[0]
        if axis.length < 0.0005:
            continue
        if axis.length > 0.2:
            raise RuntimeError(f'Invalid groom curve length on {obj.name}: {axis.length}')
        axis.normalize()
        sideways = axis.cross(Vector((rng.random(), rng.random(), rng.random()))).normalized()
        normal = axis.copy()
        width = 0.0013 if 'Panda' in obj.name else 0.00095
        tint = rng.uniform(0.86, 1.0)
        start = len(vertices)
        for j, point in enumerate(points):
            radius = width * (1 - j / 2) ** 0.7 + 0.00005
            vertices.extend([tuple(point-sideways*radius), tuple(point+sideways*radius)])
            normals.extend([tuple((normal-sideways*0.12).normalized()), tuple((normal+sideways*0.12).normalized())])
            value = tint * (0.90 + 0.10 * j / 2)
            colors.extend([(value, value, value, 1), (value, value, value, 1)])
            if j < 2:
                a = start + j * 2
                faces.extend([(a, a+1, a+3), (a, a+3, a+2)])
    if not vertices:
        raise RuntimeError(f'No groomed curves read from {obj.name}')
    result = mesh_object(obj.name + ' · groomed web fur', vertices, faces)
    result.data.normals_split_custom_set_from_vertices(normals)
    color = result.data.color_attributes.new(name='Fur tint', type='FLOAT_COLOR', domain='POINT')
    for entry, value in zip(color.data, colors, strict=True):
        entry.color = value
    base = obj.data.materials[0]
    name = base.name + ' · web hair'
    fur = bpy.data.materials.get(name)
    if fur is None:
        fur = material(name, tuple(base.diffuse_color[:3]), 0.82)
    result.data.materials.append(fur)
    return result


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    output = root / 'output/character-models/v3/groom-raw'
    output.mkdir(parents=True, exist_ok=True)
    surfaces = [obj for obj in bpy.data.objects if obj.particle_systems]
    for obj in surfaces:
        obj.particle_systems[0].settings.child_percent = 8
        obj.particle_systems[0].settings.display_step = 3
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in surfaces:
        convert_strands(obj, obj.evaluated_get(depsgraph))
    for obj in surfaces:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.particle_system_remove()
        obj.data.materials.pop(index=1)
    all_characters = [obj for obj in bpy.data.objects if obj.type == 'MESH' and obj.name.startswith(('Panda', 'Moflow'))]
    export(all_characters, output / 'companions-v3.glb')
    for prefix, offset, filename in [('Panda', 0.79, 'panda-v3.glb'), ('Moflow', -0.98, 'moflow-v3.glb')]:
        objects = [obj for obj in all_characters if obj.name.startswith(prefix)]
        for obj in objects:
            obj.location.x += offset
        export(objects, output / filename)
        for obj in objects:
            obj.location.x -= offset


if __name__ == '__main__':
    main()
