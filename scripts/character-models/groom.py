# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# Run with Blender --background <source.blend> --python groom.py
from __future__ import annotations

from math import cos, sin
from pathlib import Path
import bpy


def strand_material(surface: bpy.types.Material) -> bpy.types.Material:
    name = surface.name + ' · physical hair'
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    nodes = result.node_tree.nodes
    nodes.clear()
    hair = nodes.new('ShaderNodeBsdfHairPrincipled')
    hair.parametrization = 'COLOR'
    hair.inputs['Color'].default_value = surface.diffuse_color
    hair.inputs['Roughness'].default_value = 0.48
    info = nodes.new('ShaderNodeHairInfo')
    variation = nodes.new('ShaderNodeMapRange')
    variation.inputs['From Min'].default_value = 0
    variation.inputs['From Max'].default_value = 1
    variation.inputs['To Min'].default_value = 0.78
    variation.inputs['To Max'].default_value = 1.0
    multiply = nodes.new('ShaderNodeMixRGB')
    multiply.blend_type = 'MULTIPLY'
    multiply.inputs[0].default_value = 1
    multiply.inputs[1].default_value = surface.diffuse_color
    result.node_tree.links.new(info.outputs['Random'], variation.inputs['Value'])
    result.node_tree.links.new(variation.outputs['Result'], multiply.inputs[2])
    result.node_tree.links.new(multiply.outputs[0], hair.inputs['Color'])
    output = nodes.new('ShaderNodeOutputMaterial')
    result.node_tree.links.new(hair.outputs[0], output.inputs['Surface'])
    return result


def groom(obj: bpy.types.Object) -> None:
    mat = obj.data.materials[0]
    obj.data.materials.append(strand_material(mat))
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.particle_system_add()
    system = obj.particle_systems[-1]
    settings = system.settings
    settings.type = 'HAIR'
    settings.count = 6500 if 'head' in obj.name or 'body and' in obj.name else 1200
    settings.hair_length = 0.060 if 'Panda' in obj.name else 0.016
    if 'head' in obj.name:
        settings.hair_length = 0.075
    if 'muzzle' in obj.name or 'eye patch' in obj.name:
        settings.hair_length = 0.025
    settings.length_random = 0.24
    settings.tangent_factor = (0.012 if 'head' in obj.name else 0.004) if 'Panda' in obj.name else 0.002
    settings.tangent_phase = 0.12
    settings.hair_step = 3
    settings.child_type = 'INTERPOLATED'
    settings.child_percent = 8
    settings.rendered_child_count = 45
    settings.child_length = 0.85
    settings.clump_factor = 0.10
    settings.roughness_1 = 0.008 if 'Panda' in obj.name else 0.002
    settings.roughness_2 = 0.004 if 'Panda' in obj.name else 0.0015
    settings.roughness_endpoint = 0.003
    settings.root_radius = 0.55
    settings.tip_radius = 0.06
    settings.radius_scale = 0.0016
    settings.shape = -0.15
    settings.material = len(obj.data.materials)
    if 'head' in obj.name:
        density = obj.vertex_groups.new(name='Eye patch exclusion')
        for vertex in obj.data.vertices:
            weight = 1.0
            x, y, z = vertex.co
            if y < 0:
                for side in (-1, 1):
                    dx, dz, a = x-side*0.405, z+0.01, side*0.54
                    ellipse = ((dx*cos(a)+dz*sin(a))/0.22)**2 + ((-dx*sin(a)+dz*cos(a))/0.29)**2
                    weight = min(weight, max(0, min(1, (ellipse-1.30)*8)))
                if abs(x) < 0.32 and z < -0.22:
                    weight = 0.08
            density.add([vertex.index], weight, 'REPLACE')
        system.vertex_group_density = density.name


def main() -> None:
    output = Path(__file__).resolve().parents[2] / 'output/character-models/v3'
    for obj in list(bpy.data.objects):
        if 'velvet fibers' in obj.name:
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in list(bpy.data.objects):
        if obj.type == 'MESH' and obj.name.startswith(('Panda', 'Moflow')):
            mat = obj.data.materials[0]
            if 'velvet' in mat.name or 'powder blue' in mat.name or 'Rose heart' in mat.name:
                groom(obj)
    scene = bpy.context.scene
    scene.cycles.samples = 80
    bpy.data.objects['Key'].data.color = (1, 0.95, 0.88)
    scene.render.resolution_x = 1536
    scene.render.resolution_y = 1024
    scene.render.filepath = str(output / 'plush-front.png')
    for prefix in ('Panda', 'Moflow'):
        collection = bpy.data.collections.new(prefix)
        scene.collection.children.link(collection)
        for obj in list(bpy.data.objects):
            if obj.name.startswith(prefix):
                for previous in list(obj.users_collection):
                    previous.objects.unlink(obj)
                collection.objects.link(obj)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_perspective = 'CAMERA'
                area.spaces.active.shading.type = 'MATERIAL'
    scene['Design reference'] = 'output/character-design/panda-moflow-concept-v3.png'
    bpy.ops.wm.save_as_mainfile(filepath=str(output / 'companions-plush-v3.blend'))
    bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    main()
