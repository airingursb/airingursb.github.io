// Run: node scripts/bear-stories/workshop/build-assets.mjs
// Reuses the approved H3 master. No generation API call or secret is needed.
import { execFileSync } from 'node:child_process';
for (const script of ['register.py', 'pin-machine.py', 'bake-frames.py', 'verify-matte.py']) {
  execFileSync('uv', ['run', `scripts/bear-stories/workshop/${script}`], { stdio: 'inherit' });
}
execFileSync(process.execPath, ['scripts/bear-stories/workshop/pack-assets.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/bear-stories/workshop/measure-assets.mjs', 'public/bear-stories/workshop', 'output/bear-stories/revision-2/workshop/after/regression.json'], { stdio: 'inherit' });
