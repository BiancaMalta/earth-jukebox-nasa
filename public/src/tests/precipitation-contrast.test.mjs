import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mapPrecipitation, precipitationNote, mapFrameSound } from '../engine/mapping.js';

test('common small amounts produce distinguishable rates and pitched strokes on a shared scale', () => {
  assert.equal(mapPrecipitation(.5), 1.5);
  assert.equal(mapPrecipitation(.75), 3);
  assert.equal(mapPrecipitation(1), 4);
  assert.ok(mapPrecipitation(.885) - mapPrecipitation(.53) > 1.8);
  assert.notEqual(precipitationNote(mapPrecipitation(.6)), precipitationNote(mapPrecipitation(.8)));
  const track = { id: 'clima-chuva', unit: 'mm' };
  const common = { mean: .75, coverage: .1 };
  assert.deepEqual(mapFrameSound(common, track), mapFrameSound({ ...common, coverage: .9, norm: .9 }, track));
  assert.equal(mapFrameSound({ ...common, coverage: 0 }, track), null);
  assert.equal(mapFrameSound({ ...common, mean: null }, track), null);
  assert.equal(mapPrecipitation(0), 0);
});

test('regional rain contrasts improve using the actual supplied frame values', async () => {
  const data = JSON.parse(await readFile(new URL('../../data/clima-chuva/regions.json', import.meta.url)));
  const values = Object.values(data.regions).flatMap(region => region.values.filter(row => row[0] !== null).map(row => row[0])).sort((a,b) => a-b);
  const low = values[Math.floor(values.length * .1)], high = values[Math.floor(values.length * .9)];
  const old = a => .5 + 4.5 * (1 - Math.exp(-a / 5));
  assert.ok(mapPrecipitation(high) - mapPrecipitation(low) > 5 * (old(high) - old(low)));
  assert.notEqual(precipitationNote(mapPrecipitation(low)), precipitationNote(mapPrecipitation(high)));
  // Fixed mapping remains monotonic across the full legend, not just this sample.
  let previous = 0;
  for (let i = 0; i <= 2000; i++) {
    const rate = mapPrecipitation(i / 100);
    assert.ok(rate >= previous && rate <= 5);
    previous = rate;
  }
});
