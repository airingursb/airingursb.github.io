import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAtlasFrame,
  createFrameAnimator,
} from '../src/lib/blog-pet-animator.ts';

test('applyAtlasFrame maps left/front/right to sprite positions', () => {
  const el = { style: {} };
  applyAtlasFrame(el, 0, 3);
  assert.equal(el.style.backgroundSize, '300% 100%');
  assert.equal(el.style.backgroundPosition, '0% 0%');

  applyAtlasFrame(el, 1, 3);
  assert.equal(el.style.backgroundPosition, '50% 0%');

  applyAtlasFrame(el, 2, 3);
  assert.equal(el.style.backgroundPosition, '100% 0%');
});

test('setDirection maps left/right pointer to atlas ends', async () => {
  const frames = [];
  const anim = createFrameAnimator({
    frameCount: 3,
    initialFrame: 1,
    reducedMotion: true,
    render(frame) {
      frames.push(frame);
    },
  });

  anim.setDirection(-1, 0);
  assert.equal(Math.round(anim.getCurrentFrame()), 0);

  anim.setDirection(1, 0);
  assert.equal(Math.round(anim.getCurrentFrame()), 2);

  anim.setDirection(0, -1);
  assert.equal(Math.round(anim.getCurrentFrame()), 1);

  anim.destroy();
  assert.ok(frames.length >= 1);
});
