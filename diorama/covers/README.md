# Collection covers

`rainy-marina-bay.webp` is a crop of the actual browser-rendered Three.js scene, with Panda V3 and Moflow V2. It is a static navigation preview; the detail route retains the live 3D scene.

To add a keepsake:
1. Create its working scene page under `src/pages/diorama/` with a unique slug.
2. Capture its real scene cover and save a WebP here.
3. Add title, story date, place, original comic issue, cover and description to `src/data/dioramas.ts`, newest first.
4. The personal homepage shelf shows the first eight scenes as a compact horizontal strip; `/diorama/` shows all entries. Chinese comic detail links back when its issue matches.
5. Build and check the new detail route, cover and source-comic navigation at desktop and phone widths.

`busan-birthday-sea.webp` is a crop of the real second scene: Busan comic15 night sea/market, the same PandaV3/MoflowV2, newly modeled red lighthouse, quay, shops, seafood cart and fishing boat. Blog-page discovery was removed per user preference.

- `southern-ridges-sky.webp` and `hidden-sauna.webp`: captured 2026-09-06 from the actual Three.js scenes with approved plush assets, through CUA at 1280×720 using a temporary scene-only page. Resized to 1000×563 WebP. Capture harness and original screenshots retained in `.omo/evidence/two-keepsakes/`. No generated-image substitute.

The two new covers were refreshed after the pose/forest refinement from a real headless Chrome render of the shared Three.js runtime. Final 1280×720 PNG captures are in `.omo/evidence/keepsake-refinement/`; WebP output remains 1000×563. The forest uses dedicated supine character assets, the sauna uses relaxed/raised-mitten assets.

Pokopia-inspired local trial: southern-ridges-sky.webp and hidden-sauna.webp were recaptured from the actual shared Three.js runtime with the smooth `*-game.glb` poses, bright material palette and revised environment geometry. Browser PNG originals and capture scripts are in `.omo/evidence/pokopia-trial/`; 1280×720 capture resized to1000×563 WebP quality88. Nintendo reference images are evidence only and are not included in the website.
