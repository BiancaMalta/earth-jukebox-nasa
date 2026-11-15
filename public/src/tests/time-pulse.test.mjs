import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarBucket, createTimePulseTracker } from '../engine/timePulse.js';

test('daily markers follow calendar boundaries, not frame counts', () => {
  const pulse = createTimePulseTracker();
  assert.equal(pulse.advance('2026-11-01T21:00', 'day', true), false);
  assert.equal(pulse.advance('2026-11-01T23:00', 'day', true), false);
  assert.equal(pulse.advance('2026-11-02T02:00', 'day', true), true);
  assert.equal(pulse.advance('2026-11-02T05:00', 'day', true), false);
  assert.equal(pulse.advance('2026-11-05T05:00', 'day', true), true);
});
test('weeks change on Monday and manual seeks establish a silent baseline', () => {
  const pulse = createTimePulseTracker();
  pulse.advance('2026-11-01T21:00', 'week', false);
  assert.equal(pulse.advance('2026-11-02T02:00', 'week', true), true);
  assert.equal(pulse.advance('2026-11-08T23:00', 'week', true), false);
  assert.equal(pulse.advance('2026-11-09T02:00', 'week', false), false);
  assert.equal(pulse.advance('2026-11-09T05:00', 'week', true), false);
  pulse.reset();
  assert.equal(pulse.advance('2026-11-16T05:00', 'week', true), false);
});
test('missing and impossible dates do not create markers', () => {
  assert.equal(calendarBucket(null), null);
  assert.equal(calendarBucket('2026-02-30T02:00'), null);
  const pulse = createTimePulseTracker();
  pulse.advance('2026-11-01T21:00', 'day', true);
  assert.equal(pulse.advance(undefined, 'day', true), false);
  assert.equal(pulse.advance('2026-11-03T21:00', 'day', true), false);
});
