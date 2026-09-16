# Photo motion assets

Published September 2026 on /photos/, /blog/ and /en/blog/. Model: minimax-h3-max-turbo via the installed skill.
- palace-clouds.mp4: source monthly-36 cover, https://r2.airingdeng.com/blog/wj36/cover-c0b38e12b394/full.webp . Task task_01M2JSGP2BG1FPBRC8XMH1GKY6. Original image is locked below the sky mask; only the sky uses H3 motion. 800×600 / 24fps / 15s, audio removed.
- photographer.webp / photographer-poster.png: new photographer pose of existing brown bear; task task_01M2JSN9NTXTTJHE5RWPH1DR49. Fixed framing, edge-connected pale/neutral matte removed with contaminated boundary colors corrected, cropped to 86×96, 141 frames at 83ms, one cycle. No audio.
- The darkroom photograph is loaded directly from the Photos catalog, not generated into the video. Camera bear and photo developing/flip are independent layers.

Matte repair: scripts/photo-motion/bake-photographer.mjs processes all141 frames, keeping interior cream details and the complete silhouette. Reproducible prompts, source images and raw videos are retained locally under output/photo-motion-preview; repaired frames and evidence are under output/photo-motion-matte-fix. No API credential is embedded in client assets or scripts.
