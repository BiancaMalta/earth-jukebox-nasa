// AI-assisted: OpenAI Codex
import test from 'node:test';
import assert from 'node:assert/strict';
import { describeNavigationTarget, describeCurrentTableRow } from '../ui/pageNarration.js';
import { initKeyboard } from '../ui/a11y.js';

function element(tag, attributes = {}, extra = {}) {
  return {
    tagName: tag.toUpperCase(), textContent: '',
    getAttribute: key => attributes[key] ?? null,
    hasAttribute: key => key in attributes,
    matches: selector => selector.split(', ').includes(tag) || selector.includes(`[role='${attributes.role}']`),
    ...extra,
  };
}

test('expanded disclosures never collect their table or methods body', () => {
  const summary = element('summary', {}, {
    textContent: 'Values over time',
    parentElement: { open: true, textContent: 'All 124 rows and a long methods explanation' },
  });
  const spoken = describeNavigationTarget(summary);
  assert.match(spoken, /Values over time\. Expanded/);
  assert.doesNotMatch(spoken, /124|methods|rows/);
  summary.parentElement.open = false;
  assert.match(describeNavigationTarget(summary), /Collapsed/);
});

test('unlabelled menus announce only the selected option and named groups stay concise', () => {
  const menu = element('select', {}, { textContent: 'Brazil France Japan', selectedOptions: [{ textContent: 'France' }] });
  assert.equal(describeNavigationTarget(menu), 'Menu. Selected: France');
  const group = element('div', { role: 'group', 'aria-label': 'Records in your mix' }, { textContent: 'Seven long readings' });
  assert.equal(describeNavigationTarget(group), 'Records in your mix');
});

test('slider descriptions use the accessible frame value rather than a zero-based counter', () => {
  const slider = element('input', { 'aria-label': 'Timeline', 'aria-valuetext': 'Frame 7 of 124' }, { type: 'range', value: '6', max: '123' });
  assert.equal(describeNavigationTarget(slider), 'Timeline. Frame 7 of 124');
});

test('explicit table speech reads only the current row with its column names', () => {
  const doc = {
    querySelector: () => ({ cells: [{ textContent: 'Time 2' }, { textContent: '20 °C' }] }),
    querySelectorAll: () => [{ textContent: 'Date and time' }, { textContent: 'Mean' }],
  };
  assert.equal(describeCurrentTableRow(doc), 'Date and time: Time 2. Mean: 20 °C');
  assert.match(describeCurrentTableRow({ querySelector: () => null }), /No current frame row/);
});

test('table scrolling keeps arrow keys and Space instead of controlling playback', () => {
  let handler, toggles = 0, steps = 0, prevented = 0;
  initKeyboard({ toggle: () => toggles++, step: () => steps++ }, { addEventListener: (_, fn) => { handler = fn; } });
  for (const key of ['ArrowLeft', 'ArrowRight', ' ']) handler({
    key, target: { closest: selector => selector.includes('.time-series-scroll') }, preventDefault: () => prevented++,
  });
  assert.equal(toggles + steps + prevented, 0);
});

test('concise narrator descriptions replace long auto speech while preserving accessible descriptions', () => {
  const control = element('input', { 'aria-label': 'Precipitation', 'aria-describedby': 'full-reading', 'data-spoken-description': '0.75 millimeters. Three strokes per second. Toggle to mute.' }, { type: 'checkbox', checked: true });
  const doc = { getElementById: () => ({ textContent: 'Very long diagnostic reading with coverage and technical detail' }) };
  const spoken = describeNavigationTarget(control, doc);
  assert.match(spoken, /Precipitation\. Selected\. 0.75 millimeters/);
  assert.doesNotMatch(spoken, /diagnostic|coverage/);
  assert.equal(control.getAttribute('aria-describedby'), 'full-reading');
});
test('guided explanations keep the important described content when explicitly focused', () => {
  const heading = element('h2', { 'aria-describedby': 'mapping' }, { textContent: 'From data to music' });
  assert.match(describeNavigationTarget(heading, { getElementById: () => ({ textContent: 'More precipitation means faster, higher drum strokes.' }) }), /faster, higher drum strokes/);
});
test('tuning disclosure uses a short label while retaining its state and purpose', () => {
 const summary = element('summary', { 'data-spoken-label': 'Rhythm and time control', 'data-spoken-description': 'Playback speed and optional metronome.' }, { textContent: 'EARTH JUKEBOX Rhythm and time control decorative symbol', parentElement: { open: false } });
 assert.equal(describeNavigationTarget(summary), 'Rhythm and time control. Collapsed. Press Enter or Space to toggle. Playback speed and optional metronome.');
});
