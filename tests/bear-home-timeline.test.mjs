import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BearTimeline, routineActivity, routineAction } from '../src/components/bear-study/timeline.ts';
import { PetInteraction } from '../src/components/bear-study/pet-interaction.ts';

const clips = JSON.parse(readFileSync(new URL('../src/assets/bear-study/daily.json', import.meta.url)));
function until(timeline, condition) {
  for (let i = 0; i < 1000; i++) {
    if (condition()) return;
    timeline.advance(1000 / 12 + .001);
  }
  assert.fail('The requested motion never reached its destination');
}

test('reading stays inside its held activity until another request arrives', () => {
  const bear = new BearTimeline(clips);
  bear.request('reading');
  until(bear, () => bear.phase === 'hold');
  bear.advance(60000);
  assert.equal(bear.clip, 'reading');
  assert.ok(bear.frame >= clips.reading.holdStart && bear.frame <= clips.reading.holdEnd);
});

test('a sip waits for the book to be put away and then returns to reading', () => {
  const bear = new BearTimeline(clips);
  bear.request('reading');
  until(bear, () => bear.phase === 'hold');
  bear.request('drink');
  assert.equal(bear.clip, 'reading');
  assert.equal(bear.phase, 'exit');
  until(bear, () => bear.clip === 'drink');
  until(bear, () => bear.clip === 'reading');
  assert.equal(bear.phase, 'enter');
});

test('waking plays the sleep exit before returning to typing', () => {
  const bear = new BearTimeline(clips);
  bear.request('sleep');
  until(bear, () => bear.phase === 'hold');
  bear.request('typing');
  assert.equal(bear.clip, 'sleep');
  assert.equal(bear.phase, 'exit');
  until(bear, () => bear.clip === 'typing');
  assert.equal(bear.activity, 'typing');
});

test('rapid activity choices replace the pending request instead of forming a queue', () => {
  const bear = new BearTimeline(clips);
  bear.request('pet');
  until(bear, () => bear.clip === 'pet');
  bear.request('reading');
  bear.request('sleep');
  until(bear, () => bear.clip !== 'pet');
  assert.equal(bear.clip, 'sleep');
});

test('paused or reduced-motion choices show the authored still immediately', () => {
  const bear = new BearTimeline(clips);
  bear.request('reading', true);
  assert.equal(bear.frame, clips.reading.still);
  assert.equal(bear.phase, 'hold');
  bear.request('pet', true);
  assert.equal(bear.frame, clips.pet.still);
  assert.equal(bear.activity, 'reading');
  bear.settle();
  assert.equal(bear.clip, 'reading');
});

test('a request during entry waits until the prop has been brought into the scene', () => {
  const bear = new BearTimeline(clips);
  bear.request('reading');
  until(bear, () => bear.clip === 'reading');
  bear.request('sleep');
  assert.equal(bear.phase, 'enter');
  until(bear, () => bear.phase === 'exit');
  assert.equal(bear.clip, 'reading');
  until(bear, () => bear.clip === 'sleep');
});

test('the Singapore routine changes at its stated night boundaries', () => {
  assert.equal(routineActivity(23, .5), 'sleep');
  assert.equal(routineActivity(6, .5), 'sleep');
  assert.equal(routineActivity(7, .5), 'music');
  assert.equal(routineActivity(22, .5), 'music');
});

for (const reaction of ['water', 'stretch', 'shy']) {
  test(`${reaction} waits for headphones to be removed and then returns to listening`, () => {
    const bear = new BearTimeline(clips);
    bear.request('music');
    until(bear, () => bear.clip === 'music' && bear.phase === 'hold');
    bear.advance(60000);
    assert.ok(bear.frame >= clips.music.holdStart && bear.frame <= clips.music.holdEnd);
    bear.request(reaction);
    assert.equal(bear.clip, 'music');
    assert.equal(bear.phase, 'exit');
    until(bear, () => bear.clip === reaction);
    until(bear, () => bear.clip === 'music');
    assert.equal(bear.phase, 'enter');
  });
}

test('second-batch poses retain the selected activity under reduced motion', () => {
  const bear = new BearTimeline(clips);
  bear.request('music', true);
  for (const reaction of ['water', 'stretch', 'shy']) {
    bear.request(reaction, true);
    assert.equal(bear.frame, clips[reaction].still);
    assert.equal(bear.activity, 'music');
  }
  bear.settle();
  assert.equal(bear.clip, 'music');
  assert.equal(bear.frame, clips.music.still);
});

test('stretching is a daytime reaction while music participates in the routine', () => {
  assert.equal(routineAction(12, .1), 'stretch');
  assert.equal(routineAction(12, .2), 'reading');
  assert.equal(routineAction(12, .4), 'music');
  assert.equal(routineAction(12, .9), 'typing');
  assert.equal(routineAction(23, .1), 'sleep');
  assert.equal(routineAction(6, .1), 'sleep');
});

test('three head activations within five seconds trigger one shy reaction and a cooldown', () => {
  const petting = new PetInteraction();
  assert.equal(petting.next(100), 'pet');
  assert.equal(petting.next(2100), 'pet');
  assert.equal(petting.next(5100), 'shy');
  assert.equal(petting.next(5101), null);
  assert.equal(petting.next(13099), null);
  assert.equal(petting.next(13100), 'pet');
});

test('spaced petting and waking reset the head-activation streak', () => {
  const petting = new PetInteraction();
  assert.equal(petting.next(0), 'pet');
  assert.equal(petting.next(1000), 'pet');
  assert.equal(petting.next(5001), 'pet');
  assert.equal(petting.next(6000), 'pet');
  petting.reset();
  assert.equal(petting.next(6100), 'pet');
  assert.equal(petting.next(6200), 'pet');
  assert.equal(petting.next(6300), 'shy');
});

test('typing finishes its current gesture before changing activities', () => {
  const bear = new BearTimeline(clips);
  bear.advance(87 * 1000 / 12 + .001);
  bear.request('reading');
  assert.equal(bear.clip, 'typing');
  assert.equal(bear.frame, 87);
  assert.equal(bear.phase, 'exit');
  bear.advance(1000);
  assert.equal(bear.clip, 'typing');
  until(bear, () => bear.clip === 'reading');
  assert.equal(bear.phase, 'enter');
});

for (const activity of ['coffee', 'rain']) {
  test(activity + ' completes its prop exit before a camera reaction and resumes', () => {
    const bear = new BearTimeline(clips);
    bear.request(activity);
    until(bear, () => bear.clip === activity && bear.phase === 'hold');
    bear.request('camera');
    assert.equal(bear.phase, 'exit');
    until(bear, () => bear.clip === 'camera');
    until(bear, () => bear.clip === activity);
    assert.equal(bear.phase, 'enter');
  });
}
