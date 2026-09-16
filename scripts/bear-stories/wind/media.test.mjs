import assert from 'node:assert/strict';
import test from 'node:test';
import { WindMedia } from '../../../src/components/bear-stories/wind/media.ts';

test('returns a recoverable result after eight seconds when image decoding hangs', async (context) => {
  // Given a stalled browser image and a controlled clock.
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const previousImage = globalThis.Image;
  const previousWindow = globalThis.window;
  globalThis.Image = class { src = ''; decode() { return new Promise(() => {}); } };
  globalThis.window = { setTimeout: (...args) => setTimeout(...args) };
  context.after(() => { globalThis.Image = previousImage; globalThis.window = previousWindow; });
  const canvas = { getContext: () => ({}) };
  const root = { querySelector: selector => selector === 'canvas' ? canvas : {} };
  const media = new WindMedia(root);
  // When the decode deadline elapses.
  const loading = media.load('gust');
  context.mock.timers.tick(8000);
  // Then the renderer can use its complete still fallback.
  assert.equal(await loading, false);
});
