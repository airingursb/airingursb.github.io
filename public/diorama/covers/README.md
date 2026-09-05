# Collection covers

`rainy-marina-bay.webp` is a crop of the actual browser-rendered Three.js scene, with Panda V3 and Moflow V2. It is a static navigation preview; the detail route retains the live 3D scene.

To add a keepsake:
1. Create its working scene page under `src/pages/diorama/` with a unique slug.
2. Capture its real scene cover and save a WebP here.
3. Add title, story date, place, original comic issue, cover and description to `src/data/dioramas.ts`, newest first.
4. The personal homepage shelf shows the first eight scenes as a compact horizontal strip; `/diorama/` shows all entries. Chinese comic detail links back when its issue matches.
5. Build and check the new detail route, cover and source-comic navigation at desktop and phone widths.

`busan-birthday-sea.webp` is a crop of the real second scene: Busan comic15 night sea/market, the same PandaV3/MoflowV2, newly modeled red lighthouse, quay, shops, seafood cart and fishing boat. Blog-page discovery was removed per user preference.
