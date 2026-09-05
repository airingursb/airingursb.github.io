# Character studio

Extends diorama/DESIGN.md for an independent model-review page. The user approved output/character-design/panda-moflow-concept-v1.png as the character art direction. The images define silhouette and personality, not a pixel-identical webpage or a promise of path-traced hair in WebGL.

Warm paper #f1efe8, ivory #fbfaf5, ink #343e39, muted #69736b, line #d9ddd2, accent #536951, soft #e5e9df. Inherit Songti SC display, system sans body, monospace metadata; 4px spacing scale. Display 40/32px, body 14/16px, metadata 11px. Main content maximum 1280px with 40/24px page gutters. Warm studio canvas fills main area, with a compact header and unboxed captions. No UI overlay over faces.

Showcase primitive: one real GLB viewer, with mutually exclusive duo/panda/Moflow selection; reusable 44px-minimum buttons with hover, focus, pressed, disabled states; front/side/back camera presets; zoom in/out and reset. Mouse/touch orbit and keyboard arrows/+/-/0. Download links point to the actual standalone GLBs.

Desktop: stage about 60vh, minimum 440px. Phone: stage 420px, header and captions wrap, buttons remain 44px, model framing scales to viewport. The title is a short standalone clause. Canvas loading/error is readable text. No spinning or decorative animation; render on interaction and resize, with all geometry/material/texture/environment resources cleaned up on page exit. Download links remain available without WebGL.

The .blend is an editable authored source. GLBs contain surfaces, material textures and actual small fur-strand triangles, never the concept image as a scene background. Validate silhouettes front/side/back, face attachment, fingers-free mitten forms, reset and zoom, desktop/tablet/mobile. Background and lighting are an interpretive studio setup. Fine fibers may be less distinct at small screen scales.

## Revision 2 acceptance
The original character concept is the shape contract: low broad Panda, full cheeks, protruding two-lobed muzzle, eyes nestled in inclined organic patches, visible open mouth and tongue, compressed seated belly and limbs; Moflow holds a thick heart with a readable two-lobed silhouette. Their bodies touch in the duo pose. Bare geometry must capture these features before grooming. Compare the same studio camera in the concept, prior render and revised render; technical mesh validity cannot substitute for matching this character design. Preserve the existing viewer UI and controls.

## Panda revision 3
Refine only Panda against the original concept. Use rounded cheek volume, organic eye-patch edges and small deeply colored eyes instead of reflective floating disks. Shorten the tongue and soften the mouth contour; retain a cheerful restrained expression. Moflow continues to use its existing V2 asset. No viewer layout change.
