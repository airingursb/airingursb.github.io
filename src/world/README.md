# src/world — Airing's Forest Cabin Diorama

A small floating-island 3D scene rendered with React Three Fiber.
Lives at `/world/`. Built entirely from procedural geometry (no GLB
assets) so it works offline / on gh-pages with no external loads.

## Architecture

```
WorldGame.astro              ← Astro shell: mounts <App/>, <ZonePanel/>,
                                <WorldUI/>, <WorldLoader/>, panel CSS.
                                Imports articles/music/highlights JSON
                                at build time and passes as initialData.

src/world/
├── App.tsx                  ← R3F Canvas + theme state + CameraControls.
│                              Wraps the scene in <Suspense>. Mounts every
│                              other component below.
├── zones.ts                 ← Pure data: ZONES (5 work-zone positions),
│                              PATH_POINTS, ISLAND_RIM, TERRAIN_BUMPS,
│                              LANTERN_POSITIONS, TREE_POSITIONS, etc.
│                              Edit positions here; everything else reads.
├── noiseTexture.ts          ← sharedNoiseMap() — proc value-noise normal
│                              map for grass micro-detail. Built once.
│
│  === Geometry ===
├── Island.tsx               ← Organic 22-unit-radius extruded shape +
│                              terrain bump displacement + stone cliffs.
├── ForestPath.tsx + PathEdges.tsx
├── Water.tsx                ← MeshTransmissionMaterial pond + river +
│                              animated waterfall + foam rings.
├── Forest.tsx               ← 5 tree species + 6 filler types. Canopies
│                              use jittered icosahedron, not stacked spheres.
├── GroundCover.tsx          ← InstancedMesh grass blades + wildflowers.
├── Cabin.tsx                ← The hero. Stacked logs + chinking + porch
│                              + animated smoke + recessed window + door.
├── Gazebo.tsx + Deck.tsx + HammockSpot.tsx + EaselClearing.tsx
├── Storytelling.tsx         ← Fallen logs, stumps, cairns, signposts.
├── Domestic.tsx             ← Garden, clothesline, mailbox, etc.
├── Lanterns.tsx
├── Weathervane.tsx
├── DistantIslands.tsx       ← 2 tiny floating islands in cloud sea.
│
│  === Atmosphere ===
├── Sky.tsx                  ← drei <Sky/> Hosek-Wilkie + cirrus + low
│                              cloud belt. Takes `theme` prop (day/dusk).
├── Void.tsx                 ← Ocean plane + cloud sea below island.
├── CloudShadows.tsx         ← Drifting dark patches on ground.
├── AmbientFX.tsx            ← InstancedMesh pollen + wind streaks.
├── Atmospherics.tsx         ← Falling leaves + V-formation birds +
│                              dust motes near gazebo.
├── ContactShadowsLayer.tsx  ← drei contact shadows under zones.
├── SoilHalos.tsx            ← Dark soil rings under props.
│
│  === Living things ===
├── Avatar.tsx               ← Panda billboard sprite at cabin porch.
├── MochiNPC.tsx             ← Procedural bear next to cabin door.
├── Critters.tsx             ← Cat / ducks / deer / sparkle birds /
│                              butterflies / fireflies / bees.
├── Campfire.tsx             ← Animated 3-cone flame + point light.
│
│  === Interaction ===
├── ZoneHitboxes.tsx         ← Invisible cylinders over each zone.
│                              Fires 'world-zone-click' on click.
├── ZoneHints.tsx            ← Pulsing arrows above zones (12s, then
│                              localStorage-suppressed).
├── ZonePanel.tsx            ← HTML panel listening for 'world-zone-click'.
│                              Renders blog/comics/music/reading/chat.
├── ChatBox.tsx              ← SSE-streaming chat to /api/ai-companion/chat.
│                              AbortController on unmount. 401/empty stream
│                              gracefully surfaced as in-character message.
├── WorldUI.tsx              ← 3 HTML overlay buttons: 📷 snap / 🌙 day-dusk
│                              / 🎯 reset camera. Dispatches custom events.
├── WindSway.tsx             ← Reusable wrapper that applies subtle sine
│                              rotation to children (used on trees, chime).
└── WorldLoader.astro        ← Splash screen until first canvas paint.
```

## Custom events the scene listens for

| Event | Source | Effect |
|---|---|---|
| `world-zone-click` | ZoneHitboxes | Opens ZonePanel for that zone |
| `world-reset-camera` | WorldUI 🎯 button | Snaps OrbitControls.reset() |
| `world-theme` | WorldUI 🌙/☀️ button | Day↔dusk lighting + Sky swap |
| `world-interact` | (legacy) | Old toast handler in WorldGame.ts |

## Adaptive quality

`App.tsx` calls `detectQuality()` once at module load and gates
postprocessing:
- **high**: DepthOfField + SSAO@20 samples + Bloom + Vignette + ACES
- **medium**: SSAO@12 + Bloom + Vignette + ACES (no DoF)
- **low**: Bloom + Vignette + ACES only (no SSAO, no DoF)

Detection: `prefers-reduced-motion` / mobile UA / CPU cores ≤ 4 / RAM ≤ 4
→ low. CPU < 8 → medium. Else high.

## Editing the scene

- **Move a zone** → edit `zones.ts` ZONES array; all geometry + hitbox
  + panel pick up the new position.
- **Add a tree** → push `[x, z, scale, species]` into `TREE_POSITIONS`.
- **Change time of day** → adjust `ThemeAwareLights` in App.tsx + the
  `Sky` props in Sky.tsx.
- **Change a building** → edit the corresponding component file. Each is
  self-contained; no cross-imports.

## Building / running

```
npm run build           # Astro static build
npx astro preview       # Serve dist/ on :4321; world at /world/
```

GLBs are intentionally absent — every visible object is built from
primitives at runtime.
