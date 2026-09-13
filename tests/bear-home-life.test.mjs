import test from 'node:test';
import assert from 'node:assert/strict';
import * as life from '../src/components/bear-study/life.ts';

const minute = 60_000;
const day = 24 * 60 * minute;
const now = Date.parse('2026-09-13T08:00:00+08:00');

for (const [clock, hour, dayPeriod, lampOn] of [
  ['06:59:59', 6, 'night', true], ['07:00:00', 7, 'morning', false],
  ['10:59:59', 10, 'morning', false], ['11:00:00', 11, 'work', false],
  ['13:59:59', 13, 'work', false], ['14:00:00', 14, 'afternoon', false],
  ['17:59:59', 17, 'afternoon', false], ['18:00:00', 18, 'evening', false],
  ['19:00:00', 19, 'evening', true], ['22:59:59', 22, 'evening', true],
  ['23:00:00', 23, 'night', true], ['00:00:00', 0, 'night', true],
]) {
  test(`Singapore ${clock} has its declared period and lamp default`, () => {
    // Given a timestamp whose local calendar is Singapore.
    const timestamp = Date.parse(`2026-09-13T${clock}+08:00`);
    // When the room clock is resolved.
    const result = life.singaporeTime(timestamp);
    // Then the room follows Singapore, independently of the host timezone.
    assert.deepEqual(result, { hour, dayPeriod, lampOn });
  });
}

for (const kind of ['sunny', 'cloudy', 'rainy', 'thunder']) {
  test(`weather parsing accepts the known ${kind} observation`, () => {
    const input = { kind, observedAt: now, extra: 'discard' };
    const result = life.parseWeather(input);
    assert.deepEqual(result, { kind, observedAt: now });
  });
}

for (const input of [null, [], 'rainy', {}, { kind: 'snow', observedAt: now },
  { kind: 'rainy', observedAt: '2026-09-13' }, { kind: 'rainy', observedAt: NaN },
  { kind: 'rainy', observedAt: Infinity }, { kind: 'rainy', observedAt: -1 }]) {
  test(`malformed weather ${JSON.stringify(input)} is unavailable`, () => {
    const result = life.parseWeather(input);
    assert.equal(result, null);
  });
}

for (const [age, accepted] of [[45 * minute, true], [45 * minute + 1, false],
  [-5 * minute, true], [-5 * minute - 1, false]]) {
  test(`weather age ${age}ms obeys the observation freshness window`, () => {
    const weather = { kind: 'rainy', observedAt: now - age };
    const result = life.freshWeather(weather, now);
    assert.deepEqual(result, accepted ? weather : null);
  });
}

for (const [hour, expected] of [[8, 'coffee'], [12, 'typing'], [16, 'reading'],
  [20, 'reading'], [2, 'sleep']]) {
  test(`the initial ${hour}:00 routine starts with ${expected}`, () => {
    const context = { now: Date.parse(`2026-09-13T${String(hour).padStart(2, '0')}:00:00+08:00`), weather: null };
    const result = life.lifeActivity(context);
    assert.equal(result, expected);
  });
}

for (const kind of ['rainy', 'thunder']) {
  test(`${kind} takes priority over even the sleeping routine and random reactions`, () => {
    const timestamp = Date.parse('2026-09-13T02:00:00+08:00');
    const context = { now: timestamp, weather: { kind, observedAt: timestamp } };
    const result = life.lifeAction(context, 0.01);
    assert.equal(result, 'rain');
  });
}

test('expired rain falls back to the current ordinary routine', () => {
  const context = { now, weather: { kind: 'rainy', observedAt: now - 46 * minute } };
  const result = life.lifeActivity(context);
  assert.equal(result, 'coffee');
});

for (const hour of [8, 16]) {
  test(`the ${hour}:00 interval routine keeps its preferred activity most of the time`, () => {
    const context = { now: Date.parse(`2026-09-13T${String(hour).padStart(2, '0')}:00:00+08:00`), weather: null };
    const results = Array.from({ length: 100 }, (_, index) => life.lifeAction(context, index / 100));
    assert.ok(results.filter((action) => action === (hour === 8 ? 'coffee' : 'reading')).length >= 75);
  });
}

for (const [random, action] of [[0.01, 'stretch'], [0.07, 'drink'], [0.15, 'music'], [0.8, 'coffee']]) {
  test(`the daytime interval supports ${action}`, () => {
    const result = life.lifeAction({ now, weather: null }, random);
    assert.equal(result, action);
  });
}

test('a night interval stays asleep instead of taking a daytime break', () => {
  const context = { now: Date.parse('2026-09-13T02:00:00+08:00'), weather: null };
  const result = life.lifeAction(context, 0.01);
  assert.equal(result, 'sleep');
});

for (const [age, snapshotAge, accepted] of [[14 * day, 7 * day, true],
  [14 * day + 1, day, false], [-1, day, false], [day, 7 * day + 1, false], [day, -1, false]]) {
  test(`content age ${age} and snapshot age ${snapshotAge} obey freshness`, () => {
    const content = { href: '/posts/recent/', title: 'Recent post', publishedAt: now - age };
    const result = life.freshContent(content, now - snapshotAge, now);
    assert.deepEqual(result, accepted ? content : null);
  });
}

for (const [random, milliseconds] of [[0, 45_000], [0.5, 67_500], [1, 90_000]]) {
  test(`routine delay for random ${random} stays in the 45–90 second interval`, () => {
    const result = life.routineDelay(random);
    assert.equal(result, milliseconds);
  });
}
