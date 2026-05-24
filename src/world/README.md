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

All routed through `events.ts` typed `emit/on` bus — no raw
`window.dispatchEvent` / `addEventListener` for world events.

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

## Iteration log

Built across 35+ sub-agent-reviewed iterations. Key beats:
1-5: blockout, geometry, materials, layout
6-12: Sub-A critiques applied — organic foliage, sun cohesion, scale anchors
13-17: composition discipline cut (rainbow / balloon / scarecrow removed)
18-21: avatar / Mochi NPC / zone interaction layer + real data
22-26: theme toggle, camera reset, photo snap, mobile media queries
27-30: typed event bus, ESC/backdrop close, panel toggle, perf gating
31-35: ErrorBoundary, theme persist, iOS focus fix, loader splash
36-37: Sub-A perf sweep (Water normals, ZoneHints early-return,
        GroundCover dispose, Critters cat position, orphan files → _archive/)

### Scene-polish waves (V2, 2026-05-25)
Goal: take the scene from "tour-ready" to "wandering-around-for-an-hour"
through atmospheric + lived-in detail. Multi-hour multi-Sub-A loop.

**Wave 1** — initial top-4 from Sub-A brainstorm
- B2 Lanterns ignite at dusk (Lanterns.tsx theme prop + flicker + halo)
- A2 Easel canvas paints THE SCENE (procedural CanvasTexture)
- D1 Cat 5-state FSM (curl/stretch/lick/look/sleep)
- C3 Arched stone bridge replacing flat plank (Water.tsx)

**Wave 2** — Sub-A category sweep (lived-in / atmosphere / new area / creatures)
- B1 DuskFog (new file — pond/waterfall band fog at dusk)
- A1 RockerTeaCup with rising steam (Cabin.tsx)
- A3 Book + bookmark + glasses on hammock (HammockSpot.tsx)
- D2 Duck wakes + lily-pad bobbing (Water.tsx)
- D3 Dusk fireflies + scripted cabin-bound firefly (Critters.tsx)
- B4 Periodic wind gusts (new src/world/wind.ts getGust)
- C1 Onsen hot spring (new Onsen.tsx — pool + steam + buckets + 脱衣場)
- C2 Inari fox shrine (new FoxShrine.tsx — 3 torii + statue + candle)
- B3 CanopyDapple (warm motes, softer than literal godrays)
- A4 Footprint trail with soft alpha mask

**Wave 3** — Sub-A audit fixes + further polish
- WindChime (new — furin bell + tanzaku, hangs near hammock pines)
- Koi fish in pond (Critters.tsx — 3 semi-transparent fish)
- Onsen visitor accessories (yukata + geta + soap tray + karesansui)
- FoxShrine shimenawa rope + shide paper streamers
- Day-lantern emissive boost + dusk halo cones
- MochiNPC 5-beat sine-eased head-sweep FSM
- DistantIslands drop shadows on cloud sea
- Clothesline gust whip + Pond ripple gust boost + Lily gust tilt
- Gazebo tatami + zabuton + tea bowl
- BlogKiosk lived-in pass (newspaper + mug + chalkboard + paper stack)
- PersimmonTree (new — leaning trunk + 8 hanging fruits + fallen 2)
- Cabin geta + bonsai + chimney smoke gust + fixed rocker axis
- Sakura petals floating on pond
- SunsetBirds V-formation flock at dusk (quality-gated)
- PathMushrooms scattered along PATH_POINTS
- Karesansui (枯山水) zen garden adjacent to onsen

All gated on `getGust` (B4 shared) or `theme` prop where appropriate.
DuskFog, CanopyDapple, SunsetBirds skipped on QUALITY=low.

Every commit has the wave/iter tag in git log.

## Production-readiness checklist

- [x] Build clean (no TS errors)
- [x] Mobile responsive (max-width 720 media query)
- [x] iPhone notch safe-area for buttons
- [x] Adaptive perf tier (low/medium/high)
- [x] ErrorBoundary fallback
- [x] Suspense + WorldLoader splash
- [x] Real data wired (articles + music + highlights)
- [x] Chat with graceful 401 + AbortController
- [x] Theme persistence
- [x] ZoneHints localStorage
- [x] ESC + backdrop click + same-zone toggle to close
- [x] A11y labels on chat input + send button

## Building / running

```
npm run build           # Astro static build
npx astro preview       # Serve dist/ on :4321; world at /world/
```

GLBs are intentionally absent — every visible object is built from
primitives at runtime.

## V2 scene-polish wave new files (2026-05-25)

```
src/world/
├── wind.ts                   ← Shared getGust(t) — 27s periodic gust
│                              spike, read by WindSway + Water + Smoke
│                              + Clothesline + Sakura petals + FoxShrine
│                              shide + WindChime tanzaku + LilyPads
├── DuskFog.tsx               ← 6 rotating ground-fog planes; dusk only
├── Onsen.tsx                 ← Pool + stones + buckets + yukata +
│                              geta + soap tray + karesansui + steam
├── FoxShrine.tsx             ← 3 mini torii + shimenawa rope + shide
│                              + stone fox statue + offering candle
├── CanopyDapple.tsx          ← 3 warm-mote Sparkles zones (day only)
├── Footprints.tsx            ← Soft-alpha CanvasTexture footprint trail
├── WindChime.tsx             ← Furin glass bell + tanzaku paper strip
├── PersimmonTree.tsx         ← Small leaning tree with hanging fruits
├── SunsetBirds.tsx           ← V-formation flock at altitude (dusk only)
└── PathMushrooms.tsx         ← 7 mushrooms scattered along PATH_POINTS
```

Plus heavy edits to: Lanterns (theme prop + halo + moss), EaselClearing
(CanvasTexture painting), Critters (cat FSM + duck wakes + koi + fireflies),
MochiNPC (head FSM), Cabin (RockerTeaCup + geta + bonsai + smoke + window
balance + rocker axis + firewood InstancedMesh), Water (LilyPads gust +
FloatingPetals + RiverLeaves + arch bridge + tube dispose), HammockSpot
(book + glasses), Gazebo (tatami + cushion + bowl + roof palette),
Domestic (clothesline gust), BlogKiosk (lived-in pass), SoilHalos
(z-fight fix), Storytelling (signpost spread), DistantIslands (drop
shadows), Atmospherics (leaf gust), AmbientFX (streak gust), Campfire
(flame lean gust), Weathervane (gust whip), displayParts (Parchment
dispose), App.tsx (cinematic intro pan + theme-toggle breath).
Total ~26 components changed across the wave.

### The wind/gust system (V2 B4)

`src/world/wind.ts::getGust(t)` returns a 0..1 bell curve that
spikes for ~3 seconds every 27 seconds, 0 otherwise. Shared across
**19 reactive systems** so the periodic "wind rises" moment plays
synchronized across the entire island:

- WindSway (trees, hammock, sakura, wreath, gazebo chime)
- Pond ripple amplitude
- Lily pad tilt
- Clothesline whip + outward billow
- Chimney smoke lateral drift + rise rate
- Sakura petals on pond (drift)
- River leaves (drift via curve sampling)
- Wind streaks (speed + opacity)
- Falling leaves (horizontal drift + spin)
- Wind chime tanzaku (whip rotation)
- Fox shrine shide paper streamers
- Persimmon fruits (swing angle)
- Weathervane (1.8 rad whip)
- Campfire flames (~17° lean + 60% brighter light)
- Fox shrine candle (lean + scale)
- Cloud shadows (drift speed boost)
- Hero sakura roots (sway depth)
- Hammock cradle (lateral swing)
- Paper lantern string (along-rope sway)

### Camera choreography (V2 wave 3 finale)

`App.tsx::CameraControls` now does two cinematic motions instead of
pure user-orbit:

1. **Intro pan** (4.5s on first mount). Camera starts close on cabin
   door area [5, 4.5, 8] looking at (-2, 1.5, 0.5), eases out to the
   establishing 3/4 angle [34, 26, 30] looking at (0, 5, 0). Sine
   in-out. OrbitControls disabled during pan, snaps enabled at the
   end. **Skippable**: first pointerdown on canvas jumps to final.
2. **Theme breath** (1.5s on 🌙/☀️ press). Camera momentarily eases
   6% closer to target on a sin(πt) bell curve — "leaning in to
   watch the lights come on" beat. Doesn't fire during intro.

### V2 perf addendum (Sub-A P1 sweep)

Three perf items from Sub-A's first audit, all closed before delivery:

1. **Frameloop visibilitychange gating** (`App.tsx`). Canvas now uses
   `frameloop={pageVisible ? 'always' : 'never'}` — when the tab is
   backgrounded, all ~25 useFrame loops pause to zero CPU/GPU cost
   until the user comes back. Biggest battery win on laptops/mobile.
2. **Forest canopy geometry pool** (`Forest.tsx`). Pre-built 5-variant
   pools per (species, canopy slot) → 60 cached geometries, picked
   deterministically by tree seed via `pickFromPool()`. Was 180+
   per-tree IcosahedronGeometry GPU uploads (one per tree × 3 slots).
3. **FallingLeaves InstancedMesh** (`Atmospherics.tsx`). 36 individual
   leaf meshes → 1 InstancedMesh with per-instance matrix + color.
   Fade-in/out via scale-to-zero (per-instance opacity in InstancedMesh
   needs custom shader, which isn't worth the complexity at leaf scale).

Combined with the existing `detectQuality()` SSAO/DoF gating, the
diorama now runs in green on a 2019 MBP at 'high' tier and stays
silent when the tab is hidden.

### V2 a11y sweep (final hour)

After the perf addendum, an a11y audit caught 8 files of missing
semantics. All addressed:

- `WorldLoader.astro` — `role="status" aria-live="polite"` on the
  splash, `role="alert"` on the WebGL-failed fallback, decorative
  emoji/bar marked `aria-hidden`. `@media (prefers-reduced-motion)`
  kills the flower-pulse + bar-sweep + shortens fade to 200ms.
  Loader DOM-remove gets a 50ms buffer past CSS transition end to
  avoid race-flash on slow CPUs.
- `WorldUI.tsx` — 4 icon buttons (camera / theme / reset / whispers)
  got `aria-label` mirroring their Chinese `title=` strings.
  Theme + whispers buttons got `aria-pressed`. Toolbar wrapped in
  `role="toolbar" aria-label="场景控制"`.
- `AmbientHUD.tsx` — same pattern on the bottom-right white-noise +
  pomodoro buttons. Time HUD `aria-live="polite" aria-atomic="true"`
  so '在岛上 X 分钟' is politely announced as it updates.
- `ZonePanel.tsx` — `role="dialog" aria-modal="true" aria-labelledby`
  pointing to the zone title. **Focus restore**: captures
  `document.activeElement` on open, refocuses it on close — keyboard
  users land back on the hitbox/button they came from instead of
  `<body>`. `tabIndex={-1}` + initial `panel.focus()` so the dialog
  receives focus once the slide-in animates in.
- `ChatBox.tsx` — chat-history container `role="log" aria-live="polite"
  aria-atomic="false"` so AT announces only new tokens as Airing
  streams a reply, not the whole transcript every update. Pending
  `…` `aria-hidden`. Errors `role="alert"`. Send button label
  dynamic on pending state.
- `AccountIndicator.tsx` — account pill `aria-expanded` + `aria-haspopup`
  + dynamic `aria-label`; popup menu `role="menu"` + `role="menuitem"`.
  Login modal `role="dialog" aria-modal aria-labelledby`. Magic-link
  sent confirmation `role="status"`, errors `role="alert"`.
- `ErrorBoundary.tsx` — fallback gets `role="alert"
  aria-live="assertive"` so a scene crash is announced immediately.
- `WorldGame.astro` shell — bottom help hint `role="note"` + the
  decorative keyword pills (drag/scroll/click/ESC) `aria-hidden`.
  Hint stays at full opacity instead of fading on
  `prefers-reduced-motion`.

Pattern across all of them: **icon-only buttons need an aria-label**
(title= alone is mouseover-only and not reliably announced).
Modals need `role=dialog aria-modal aria-labelledby` + focus
management. Time/streaming content needs `aria-live`. Decorative
spans/emoji need `aria-hidden`.
