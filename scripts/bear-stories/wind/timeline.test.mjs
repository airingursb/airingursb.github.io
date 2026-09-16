import assert from 'node:assert/strict';
import test from 'node:test';
import { WindTimeline } from '../../../src/components/bear-stories/wind/timeline.ts';

test('waits for the authored choice pose before taking the requested outcome', () => {
  // Given a new gust with an early paperweight request.
  const story = new WindTimeline();
  story.choose('paperweight');
  // When playback reaches the common choice frame.
  story.advance(6000);
  // Then the response begins from its matching first frame.
  assert.deepEqual(story.snapshot(), { clip: 'paperweight', frame: 0, resting: false });
});

test('resolves the gust itself when the visitor does nothing', () => {
  // Given the autonomous story.
  const story = new WindTimeline();
  // When the authored clip finishes.
  story.advance(15000);
  // Then idle begins at the final self-rescue pose.
  assert.deepEqual(story.snapshot(), { clip: 'gust', frame: 179, resting: true });
});

test('coalesces requests while an outcome is playing', () => {
  // Given a window response already underway.
  const story = new WindTimeline();
  story.choose('window');
  story.advance(6000);
  // When another control is pressed repeatedly.
  story.choose('paperweight');
  story.choose('paperweight');
  // Then the current authored gesture keeps ownership.
  assert.equal(story.snapshot().clip, 'window');
});

test('reopens a settled closed window to begin a new gust', () => {
  // Given a completed window-closing response.
  const story = new WindTimeline();
  story.choose('window');
  story.advance(6000);
  story.advance(15000);
  // When the same window is opened.
  story.choose('window');
  // Then the next gust begins without an old queued response.
  assert.deepEqual(story.snapshot(), { clip: 'gust', frame: 0, resting: false });
});

for (const outcome of ['gust', 'paperweight', 'window']) {
  test(`keeps ${outcome} alive after the event without restarting or losing its outcome`, () => {
    // Given a completed story with its authored final pose.
    const story = new WindTimeline();
    if (outcome !== 'gust') { story.choose(outcome); story.advance(6000); }
    story.advance(15000);
    const ending = story.snapshot();
    // When visible idle time passes.
    story.advance(500);
    const idle = story.snapshot();
    // Then the character moves within that same completed outcome.
    assert.equal(idle.clip, outcome);
    assert.equal(idle.resting, true);
    assert.notEqual(idle.frame, ending.frame);
    assert.ok(idle.frame >= 150, 'idle cannot replay the event or reverse a page turn');
  });
}

test('keeps idle motion continuous over several cycles', () => {
  // Given each completed story.
  for (const outcome of ['gust', 'paperweight', 'window']) {
    const story = new WindTimeline();
    if (outcome !== 'gust') { story.choose(outcome); story.advance(6000); }
    story.advance(15000);
    let previous = story.snapshot().frame;
    const frames = new Set([previous]);
    // When idle runs for forty seconds at its normal frame rate.
    for (let step = 0; step < 480; step++) {
      story.advance(1000 / 12);
      const current = story.snapshot();
      // Then loop seams stay adjacent and the completed outcome remains interactive.
      assert.ok(Math.abs(current.frame - previous) <= 2, 'idle must not jump to an unrelated pose');
      assert.equal(current.clip, outcome);
      assert.equal(current.resting, true);
      frames.add(current.frame);
      previous = current.frame;
    }
    assert.ok(frames.size >= 10, 'idle must not freeze at the ending');
  }
});
