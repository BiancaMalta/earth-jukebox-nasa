import test from 'node:test';
import assert from 'node:assert/strict';
import { rankRegionSuggestions, filterRegionSuggestions } from '../ui/regionSuggestions.js';
const track = { id: 'clima-temperatura', svsId: 5147, unit: '°C' };
const row = norm => norm === null ? [null, null, null, 0] : [10, 10, norm, 1];
test('rank audible changes rather than missing frames or tiny changes within one note', () => {
  const data = { frames: Array.from({ length: 10 }, () => ({})), regions: {
    'country:Varied': { name: 'Varied', kind: 'country', values: [0,.2,.4,.6,.8,1,.8,.6,.4,.2].map(row) },
    'country:Flat': { name: 'Flat', kind: 'country', values: Array.from({ length: 10 }, () => row(.5)) },
    'country:Missing': { name: 'Missing', kind: 'country', values: [0,1,0,1,null,null,null,null,null,null].map(row) },
  }};
  assert.deepEqual(rankRegionSuggestions(data, track).map(item => item.name), ['Varied']);
});
test('suggestions follow scope and selected region', () => {
  const items = [
    { name: 'Europe', kind: 'continent' }, { name: 'Brazil', kind: 'country' },
    { name: 'France', kind: 'country' }, { name: 'Asia', kind: 'continent' },
  ];
  const countries = new Map([['Brazil', 'South America'], ['France', 'Europe']]);
  assert.equal(filterRegionSuggestions(items, 'world', '', countries).length, 4);
  assert.deepEqual(filterRegionSuggestions(items, 'continent', '', countries).map(i => i.name), ['Europe', 'Asia']);
  assert.deepEqual(filterRegionSuggestions(items, 'country', '', countries).map(i => i.name), ['Brazil', 'France']);
  assert.deepEqual(filterRegionSuggestions(items, 'country', 'Europe', countries).map(i => i.name), ['France']);
});

test('whole map reserves two recommendations for countries and two for regions', () => {
  const ranked = [
    ...['A', 'B', 'C', 'D'].map(name => ({ name, kind: 'country' })),
    ...['Europe', 'Asia', 'Africa'].map(name => ({ name, kind: 'continent' })),
  ];
  assert.deepEqual(filterRegionSuggestions(ranked, 'world', '', new Map()).map(item => item.name), ['A', 'B', 'Europe', 'Asia']);
});
