# 日常箱庭 / Little Keepsakes

## 1. Direction and provenance
A small personal museum, with a tactile scale model sitting in a warm, spacious editorial canvas. Reference gaga.hexly.ai supplies soft light, an isometric miniature and quiet controls, not exact layout or pixel matching. Comic 16 supplies panda, blue Moflow with pink heart, two bicycles, rain, shelter and Marina Bay skyline. The third panel is the chosen instant. Spatial proportions and architecture are interpretive.
Audience: author reviewing a saved memory; visitor exploring on desktop or phone; keyboard and reduced-motion users reading the same story.

## 2. Tokens
CSS prefix `--dw-`. Canvas #f1efe8, paper #fbfaf5, ink #343e39, secondary #69736b, line #d9ddd2, accent #536951, soft #e5e9df; atmosphere pale blue #dde5e4. Shadows use ink at 8%/14%. Model palette is exported once in palette.ts: warm limestone, muted jade water, weathered dark olive shelter, warm timber, off-white panda, charcoal limbs, porcelain blue Moflow and dusty pink heart. Every model primitive takes a semantic material.

## 3. Typography
Display: Songti SC / STSong / Georgia serif, 48–64px desktop / 38px mobile, 1.28 line height. Body: system sans, 14–16px, 1.8. Mono English labels and issue metadata: SFMono-Regular / Consolas, 10–12px, .14em tracking. CJK labels at least 12px; interactive text 14px. No forced one-character title wrapping.

## 4. Layout
4px spacing scale: 4,8,12,16,20,24,32,40,48,64. Desktop: 48px gutters, compact header, 30% authored narrative / 70% live diorama, scene at least 580px high. Below 900px: stacked narrative and scene with responsive orthographic frustum, scene 440px; below 540px: 24px gutter, 360px scene. No forced full-screen scroll trap. Footer memory selector and source disclosure use standard document flow.

## 5. Primitives
IconButton: consistent inline SVG, 44px hit target, neutral/hover/pressed/focus-visible/disabled states, aria-label and aria-pressed for toggles.
MemoryDetail: numbered 01–03 selectable rows; same content reachable from projected 3D anchor buttons; selected row has olive tint and visible text. Live polite detail text.
SceneViewport: real Three.js canvas, loading/error text, 3 semantic hotspot buttons, typed scene API, drag / zoom / keyboard arrows + +/- + 0. Pointer dragging must not trigger hotspot activation.
StoryDisclosure: native details/summary, full source quote and comic with alt text, original issue link. No dialog or focus trap.
SourceTag: issue/date/location metadata, no invented publication status.

## 6. Motion
Action feedback follows beui action-swap reduced-motion principle; use immediate icon/text state updates and 160ms color/opacity transitions. OrbitControls damping is .07, disabled under reduced motion; camera reset is immediate and interruptible. Rain and puddle rings express the source's weather, can be paused, and are frozen by default under reduced motion. Sound is an explicit opt-in procedural rain texture, not a field recording. Stop rendering while document hidden; cleanup scene/audio on page exit.

## 7. Depth and surface
Matte sculptural models, beveled platform, physical soft shadows, restrained translucent water, detailed spoke wheels and canopy seams. Canvas background is transparent over a subtle cool atmospheric radial gradient. Chrome is mostly unboxed, with one raised control dock and small framed numbered captions. No raster stand-in for the 3D world.

## 8. Accessibility and scope
Semantic header/main/footer; contrast and visible focus; buttons 44px; redundant text controls for 3D hotspots. Canvas has descriptive label and keyboard instructions. Comic/story readable without WebGL; rendering errors visibly fall back to source content. Native text is never embedded in 3D textures except decorative miniature signage. Local demo only, one curated scene, no generation service or database changes.

## Character sculpt refinement
Panda: broad rounded head and cheeks, shorter pear-shaped seated body, continuous white belly coloring over charcoal fur, bent arms resting on thighs, rounded paws, dark oval eye patches fitted to the head surface. Eyes have deep warm irises, corneal highlights and a tiny secondary catchlight. A shaped nose, muzzle, mouth line and small pink tongue retain the comic's expression. Fine directional bump texture provides short plush-fur grain without individual hair meshes.
Moflow: one continuous lathed water-drop body ending in a gently bent tip. Porcelain-blue gradient, subtle pearl sheen, inlaid cheek blush, black glossy eyes and curved smile. A rounded dimensional dusty-pink heart held by two curved arms; tiny fingers sit on the edges. Overall height is closer to the comic companion's substantial silhouette.
New character-only semantic materials: furIvory #f3ecdc, furCharcoal #252b2b, innerEar #414443, eye #151c1e, iris #493b31, nose #20282b, paw #555453, porcelain #a7d2dc, porcelainLight #d8edf0, heart #e6a6a2, heartEdge #b77778, blush #e1aaa6. Environment materials remain unchanged. Character gloss differs by substance: fur roughness .94, satin porcelain .35 with restrained sheen, eyes roughness .11 and clearcoat 1. Curved appendages and conformed facial patches are real mesh geometry, not billboards.

## Marina Bay storm refinement
Architecture reference: Safdie Architects, https://www.safdiearchitects.com/projects/marina-bay-sands-hotel-and-skypark . Photograph saved in `.omo/evidence/diorama-storm/marina-reference.jpg` for inspection only. Model preserves three separated towers with curved lower bays, pale side walls framing dark curtain glazing, close horizontal floor bands, and a long asymmetric rounded SkyPark cantilever. Roof includes pool, planted garden and railings. Miniature proportions remain interpretive; no photograph is used as geometry or texture.
Storm: dense windblown streaks at varied length/speed, roof-edge runoff, expanding impact rings and short splashes. Shared storm clock freezes all effects when paused or reduced motion is requested. Rain below the canopy is excluded using the canopy footprint. Cooler, softer key light and reflective puddles support wet weather without hiding the characters. Weather uses batched line/instance geometry; no additional animation loop. Ambient motion follows beui shader-background's reduced-motion freeze mechanism (source inspected); existing controls retain immediate state updates.

Reduced motion is authoritative while enabled: weather is frozen, the play/pause control is disabled, and orbit damping is off. Disabling the preference re-enables manual playback without automatically restarting rain. Rain fades near its upper boundary instead of forming a hard rectangular curtain.

## Plush companions in the shelter / softer rain
Load the reviewed Panda V3 and Moflow V2 GLBs into the bench scene, at a shared .53 scale. Place their lowest geometry on the seat surface and face them toward the promenade. Use their real groom ribbons with outward normals and no per-strand shadow casting. Do not change the character assets or studio. Model loading has visible pending/error copy; late responses after disposal release resources. Rain becomes shorter, softer and less dense: 620 drops, 22 runoff strands, 32 impact sites, opacity .34, short .10–.23 streaks. Keep the existing canopy mask, shared pause clock and authoritative reduced-motion behavior.

The shelter memory marker sits left/below the new Panda face, retaining its44px target without covering the expression on phones. Static shadows refresh on scene/model readiness; cached pages preserve the mounted scene on BFCache navigation.

## Collection and discovery
The collection lives at `/diorama/`; individual memories use permanent descriptive URLs (`/diorama/rainy-marina-bay/`). A typed manifest owns title, story date, place, original comic, cover, short memory and URL. Entries represent completed scenes only; no fictional future memories or disabled placeholders. Add scenes to the manifest only once their page is ready.

CollectionHeader and Footer keep the existing quiet museum identity. Listing introduction: “把日子，收藏成小世界。” followed by real collection count, date range and a chronological collection. With one entry, a generous two-column feature pairs the actual miniature screenshot with its story; additional entries use a two-column card grid. Below 760px all cards stack. A closing ruled note explains the four-panel-to-memory relationship and links to the comics archive. No search/filter for a one-item collection.

DioramaCard is a reusable semantic article with one image/title/CTA link, real title/date/place/issue, and a separate original-comic link. Use real scene photography (browser capture of the current 3D world) as a static cover, never as the detail experience. No WebGL, GLB fetch, or animated canvas on listing/home. Image ratio 16:9; card typography 32px featured (28px mobile) / 24px compact serif, 14px body, 11px metadata. Card focus outlines and CTA underline reveal navigation; color-only transitions respect reduced motion.

DioramaShelf shows up to the latest three manifest entries beneath the personal homepage comics module. Shared cards reflow from three columns to one; the one-entry state is a horizontal image/story feature. The shelf adopts the host site's surface/text/border tokens (including dark mode), with the warm screenshot as a window into the separate museum. The collection uses existing `--dw-*` tokens. Shelf header links to “查看全部”; comic detail shows a contextual link only when its issue has a scene. Detail header links back to the collection and retains its original-comic link. English homepage language toggle may leave the collection title/content in Chinese because these are authored Chinese-only scenes; no fake translated route.

## Busan birthday night / collection revision
User preference: discovery shelf belongs on the personal homepage only; remove it from `/blog/`. Collection header returns to personal homepage. Keep contextual comic links. For two or more memories, the collection renders all entries as equal two-column cards, newest story date first; one-entry featured treatment remains. Homepage recent shelf uses up to three equal cards and fills available columns even with two.

Source: actual approved comic15 “生日这天去了釜山”, storydate2026-06-30, fourth panel; local source image `.omo/evidence/busan-diorama/comic-15.png`. The fourth panel depicts a deepblue night sea, distant red lighthouse, warm waterfront food stalls, striped awnings and the two companions. It supplies scene content, not a pixel-exact UI reference. The coastal geometry is an authored miniature, not an assertion of a particular real lighthouse or street.

Night scene composition: beveled rectangular collector base, blue sea covering left two-thirds, stone promenade and market to right/front, short rock breakwater reaching the red lighthouse at rearleft. The promenade bends around the right/front corner, leaving open water at the front-left edge. Three small storefronts with recessed glowing windows, roof seams, awnings, simple authored Hangul shop labels and warm string bulbs; a seafood cart with trays/fish/crab/shells and stacked crates. Existing PandaV3/MoflowV2 sit together on a low quay bench, faces visible from default view. Rope railing, mooring bollards, bobbing fishing boat and small ripples give scale. Keep recognizable shapes legible at phone scale. Do not duplicate the rainy shelter or MarinaBay hotel.

Night-only scene tokens: seaDeep#234653, seaSurface#356e79, foam#9dc7cc, quayside#c8baa3, rock#687c80, brick#8e6e60, roof#536a6a, awningCoral#be7763, awningCream#e4cd9c, lighthouseRed#a7463f, lightGold#ffd49b. Warm lamps/emissive shop windows contrast with cool moon fill; plush faces still readable. CSS maintains warm museum chrome with a local blue radial stage atmosphere. No full-page flashing light or decorative particle rain.

Use common scene runtime and DioramaExperience view for both stories, with typed story data supplying labels, original text, 3memory notes and audio/motion semantics. Busan memories: companions/海边坐坐, lighthouse/远处的一点红, market/生日的烟火气. Shared camera/keyboard/zoom/reset and load/error behavior retained. Pause and reduced motion freeze wave vertices, boat bob, foam and lighthouse glow on one clock. Sea audio is explicit opt-in synthesized surf, labelled honestly. Static local cover is captured from actual final3Dscene, noWebGL mounted on homepage/list. Dispose scene-specific materials/textures/audio and late-loaded models.

### Visible rolling waves
User requested more obvious dynamic 🌊 after seeing the subtle first ocean. Three curved pale foam crests now travel from left to shore on the shared clock. Real water vertices rise about0.085units with smaller secondary ripples; crest ribbons follow that same surface, fading near entry/shore and clipping to the L-shaped quay. Fishing boat heave follows the local wave height. Keep foam narrow and softly colored, with readable progression on phones; no giant storm wave or flashing spray. Pause/reduced motion freeze all added crest geometry.

### Compact homepage strip (supersedes previous homepage shelf layout)
User rejected the tall homepage cards. Reuse the adjacent comics strip primitives from global.css: section-title-row, section-title, photos-strip-more, comics-strip/item/thumb/cap/title/issue. Homepage shelf now displays up to eight compact cover links in one native horizontal scrolling row at every breakpoint. Width200px, mobile160px at480px; gap14px; image16:9 to preserve the whole miniature; caption13px/title and11px/date. Standard host card padding replaces custom32/24px inset. No eyebrow, intro, description, tags or duplicate CTA on homepage. List/detail retain complete narratives. Native scroll snapping, touch/trackpad scrolling and keyboard focus reveal offscreen entries; focus outline inset to prevent scrollbox clipping. No autoplay, JavaScript carousel or additional dependency. Reference is the existing comics layout grammar, not pixel cloning the rejected screenshot.

### Blog sidebar keepsake preview
Replace the BonsaiWidget slot below the author/subscribe block on Chinese and English blog indexes. Choose the recently built Busan scene002 (not the newest story date). This supersedes earlier no-blog-entry direction for this small sidebar replacement only. No collection grid is added to blog.

DioramaPreview: an unframed real miniature on a transparent canvas, full sidebar width, viewport aspect1.3; totalheight about305px rather than the bonsai360px. Top muted11px “最近收藏 ·002”; beneath model one16px serif title and12px action, with a small inline arrow. Use host --c-text/--c-text-muted/--c-border tokens; no opaque card backdrop. Model palette and geometry exactly reuse detail runtime. Keep original desktop-only breakpoint1200px so mobile/tablet article flow is unchanged. Whole preview is one native anchor with visible2px focus ring; canvas decorative, no nested orbitcontrols or keyboardtrap, scroll passes through normally.

Default scene is still; pointer hover or keyboardfocus animates existing sea/boat on the shared clock, reducedmotion remains authoritative. Lazy initialize Three/model resources only when desktop preview enters viewport; pause offscreen, dispose when hidden at responsive breakpoint or leavingpage. Poster+explicit loadinglabel while models load, static cover and workinglink if WebGL/model load fails. Lower preview DPR1.3 and1024shadowmap; detail rendering unchanged. No autoplay sound or additional toolbar. User approved this sidebar design for deployment after reviewing the local trial.
