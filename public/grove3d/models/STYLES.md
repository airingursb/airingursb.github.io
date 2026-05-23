# Grove 3D · Style Options

Meshy 6 (latest) has basically **two mesh knobs** + **prompt-driven style**.
This doc lays out the real choices.

---

## Mesh Type — the biggest decision

### `model_type: "standard"` ← what mochi.glb just used
- Default Meshy output
- Smooth subdivision surface, ~15k tris
- Looks 3D-modeled / Pixar / Sketchfab-asset-y
- File size **~15–20 MB** with refine + PBR
- Credits: **20 preview + 10 refine = 30 per char**

### `model_type: "lowpoly"`
- Faceted / faceted-flat polygons, ~3-5k tris
- Looks **Heap Plaza / Animal Crossing / Quaternius**
- File size **~2–5 MB**
- Credits: **roughly the same** (Meshy doesn't discount lowpoly)
- Better at "cute stylized" because no smooth shading kills the cartoon feel

---

## Style — driven entirely by the prompt

Meshy 6 dropped `art_style` param. All visual aesthetics now come from
**prompt keywords**. Here are 7 well-known looks that Meshy can hit.
Each shows the **prompt suffix** to paste at the end of every species
prompt + the **reference vibe** + my notes.

### 1. **Heap Plaza / Hyacinth.im** ← matches your moodboard
> *low-poly stylized character, faceted flat shading, soft pastel palette, no specular highlights, no metalness, painterly hand-crafted feel, like a Studio Ghibli short-film prop, Animal Crossing × Hyacinth.im aesthetic*

- **Mesh type:** `lowpoly`
- **PBR:** off (`enable_pbr: false`) — flat color reads cleaner
- **remove_lighting:** true
- Best for: cohesive 3D pocket world with hand-painted feel
- ⚠️ Risk: lowpoly + flat can look "Roblox-y" if prompt is weak

### 2. **Pixar / Modern 3D animation**
> *Pixar-style stylized character, soft subsurface skin, big expressive eyes, painted PBR textures, polished studio quality, like Toy Story or Up*

- **Mesh type:** `standard`
- **PBR:** on, `hd_texture: true`
- ⚠️ Large files (15-20 MB), realistic shading clashes with pixel-art 2D nook

### 3. **Studio Ghibli / Watercolor**
> *Studio Ghibli watercolor character, soft hand-painted textures, gentle muted earth palette, slight imperfection like a children's book illustration, like My Neighbor Totoro*

- **Mesh type:** `standard`
- **PBR:** on, `remove_lighting: true`
- Less "3D" feel because no specular — closer to 2D illustration in 3D

### 4. **Clay / Plasticine stop-motion**
> *clay sculpted stop-motion character, visible fingerprints and tool marks, slightly imperfect rounded edges, dusty matte clay surface, Aardman Studios feel, like Wallace and Gromit*

- **Mesh type:** `standard`
- **PBR:** on, low roughness
- Cute tactile feel, slightly off-style for nature setting

### 5. **Cel-shaded anime**
> *cel-shaded anime character, hard ink-like outlines, flat color blocks with sharp shadow boundaries, like Genshin Impact or Honkai Star Rail character art*

- **Mesh type:** `standard`
- **PBR:** off (toon needs flat colors)
- ⚠️ Outlines don't actually export — Meshy fakes them in texture. Looks
  weird from some angles in real-time rendering.

### 6. **Voxel / Minecraft**
> *blocky voxel character made of small cubes, Minecraft Crossy Road aesthetic, no smooth curves, pixelated*

- **Mesh type:** `lowpoly`
- Cohesive with pixel-art 2D nook
- ⚠️ Loses the "this is a real animal" reading

### 7. **Toon-shaded chubby**
> *chubby toon-shaded character with thick black outlines via inflated shell, glossy plastic-toy texture, Funko Pop figurine aesthetic, exaggerated big head and small body*

- **Mesh type:** `standard`
- **PBR:** on, high glossiness
- Toy-collectible feel; less "alive" than Pixar

---

## My recommendations, ranked

| # | Style | Mesh | File/char | Why |
|---|---|---|---|---|
| 1 | **Heap Plaza / Hyacinth.im** | lowpoly | ~3 MB | Matches your moodboard exactly. Loads fast. |
| 2 | **Studio Ghibli watercolor** | standard, no light | ~10 MB | Painterly, soft, very "ursb.me" |
| 3 | **Clay stop-motion** | standard | ~12 MB | Cute tactile, but slightly off-theme |

The standard high-poly Pixar look (#2 in the original list) is what
mochi.glb just used — and it shows: smooth PBR shading reads as
"generic 3D asset," not as "Mochi the bear who lives in my grove."

---

## Workflow once you choose

Tell me a number (1–7). I'll:

1. **Burn ~5–10 credits** doing a **preview-only** mochi in that style
2. Send you the GLB
3. If satisfied → green-light, I run the other 11 same way
4. If not → tweak prompt, re-preview, repeat

Preview-only is cheap and gives you the silhouette + shape — you skip
the 10-credit refine until silhouette is right.

---

## Other knobs (smaller impact)

- **`pose_mode`**: `a-pose` is what we want for rigging — leave as-is
- **`target_polycount`**: 8000 for lowpoly, 15000 for standard
- **`hd_texture`**: only matters for #2 if you want skin pores
- **`texture_image_url`**: can feed a reference image to anchor color
  palette (e.g., a screenshot of Heap Plaza). I can wire this up if you
  want exact palette match.
