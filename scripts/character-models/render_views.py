# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# Run with Blender --background <source.blend> --python render_views.py
from pathlib import Path
from mathutils import Vector
import bpy


def main() -> None:
    output = Path(__file__).resolve().parents[2] / 'output/character-models/v3'
    scene = bpy.context.scene
    camera = scene.camera
    scene.cycles.samples = 48
    for name, position in [('three-quarter', (3.2, -8, 2.9)), ('back', (-0.1, 9, 2.9))]:
        camera.location = position
        camera.rotation_euler = (Vector((0, 0, 1.23)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(output / f'{name}.png')
        bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    main()
