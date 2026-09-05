# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# How to run: /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scripts/character-models/build.py
from __future__ import annotations

from pathlib import Path
import sys
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))
from materials import create_palette, material
from panda import build_panda
from moflow import build_moflow


def prepare_uv(objects: list[bpy.types.Object]) -> None:
    for obj in objects:
        if not obj.data.uv_layers:
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.015)
            bpy.ops.object.mode_set(mode='OBJECT')


def export(objects: list[bpy.types.Object], destination: Path) -> None:
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB', use_selection=True,
                              export_apply=True, export_animations=False, export_materials='EXPORT',
                              export_yup=True, export_cameras=False, export_lights=False,
                              export_vertex_color='ACTIVE', export_tangents=False)


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    output = root / 'output/character-models/v3'
    models = output / 'raw'
    models.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    palette = create_palette()
    panda = build_panda(palette)
    moflow = build_moflow(palette)
    prepare_uv(panda + moflow)
    export(panda, models / 'panda-v3.glb')
    export(moflow, models / 'moflow-v3.glb')
    for obj in panda:
        obj.location.x -= 0.79
    for obj in moflow:
        obj.location.x += 0.98
        obj.location.y -= 0.10
    export(panda + moflow, output / 'companions-v3.glb')
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1536
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get('Background')
    background.inputs['Color'].default_value = (1.0, 0.88, 0.72, 1)
    background.inputs['Strength'].default_value = 0.65
    scene.view_settings.view_transform = 'AgX'
    bpy.ops.mesh.primitive_plane_add(size=200)
    floor = bpy.context.object
    floor.name = 'Studio · matte floor'
    floor.location.z = -0.025
    floor.data.materials.append(material('Studio ivory', (0.95, 0.83, 0.67), 0.9))
    for name, position, power, size in [('Key', (-3, -4, 6), 650, 5), ('Fill', (4, -2, 4), 350, 4), ('Rim', (1, 3, 5), 600, 3)]:
        bpy.ops.object.light_add(type='AREA', location=position)
        light = bpy.context.object
        light.name = name
        light.data.energy = power
        light.data.shape = 'DISK'
        light.data.size = size
        light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add(location=(0, -9, 2.75))
    camera = bpy.context.object
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 4.75
    camera.rotation_euler = (Vector((0, 0, 1.23)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    bpy.ops.wm.save_as_mainfile(filepath=str(output / 'companions-v3.blend'))
    scene.render.filepath = str(output / 'front.png')
    bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    main()
