import { mapFrameSound } from '../engine/mapping.js';
import { regionalFrame } from '../data/regions.js';

function soundPosition(sound) {
  if (!sound) return null;
  if (sound.note) {
    const match = /^([A-G])(#?)(\d)$/.exec(sound.note);
    if (!match) return null;
    return ((Number(match[3]) + 1) * 12 + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1]] + (match[2] ? 1 : 0)) / 48;
  }
  if (sound.rate !== undefined) return sound.rate / 5;
  if (sound.bandwidth !== undefined) return sound.bandwidth / 1600;
  if (sound.frequency !== undefined) return Math.log2(sound.frequency) / 4;
  return null;
}

// Rank audible variation, requiring 80% available frames and multiple changes.
// Missing frames break adjacent comparisons; gaps never count as sound changes.
export function rankRegionSuggestions(data, track) {
  return Object.entries(data.regions).flatMap(([key, region]) => {
    let previous = null, valid = 0, changes = 0, movement = 0;
    const positions = [];
    region.values.forEach((row, index) => {
      const position = soundPosition(mapFrameSound(regionalFrame(data.frames[index], row), track));
      if (position !== null) {
        valid++; positions.push(position);
        if (previous !== null && Math.abs(position - previous) > 0.0001) {
          changes++; movement += Math.abs(position - previous);
        }
      }
      previous = position;
    });
    if (valid < Math.max(3, data.frames.length * .8) || changes < 2) return [];
    const sorted = positions.sort((a, b) => a - b);
    const range = sorted[Math.floor((sorted.length - 1) * .9)] - sorted[Math.floor((sorted.length - 1) * .1)];
    const score = range + movement / Math.max(1, data.frames.length - 1);
    return [{ key, name: region.name, kind: region.kind, score, availability: valid / data.frames.length }];
  }).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

export function filterRegionSuggestions(ranked, scope, continent, countryContinents) {
  if (scope === 'world') {
    return [
      ...ranked.filter(item => item.kind === 'country').slice(0, 2),
      ...ranked.filter(item => item.kind === 'continent').slice(0, 2),
    ];
  }
  return ranked.filter(item => scope === 'world' || (scope === 'continent' ? item.kind === 'continent' : item.kind === 'country' && (!continent || countryContinents.get(item.name) === continent))).slice(0, 4);
}
