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
    textContent: 'View values by time',
    parentElement: { open: true, textContent: 'All 124 rows and a long methods explanation' },
  });
  const spoken = describeNavigationTarget(summary);
  assert.match(spoken, /View values by time\. Expanded/);
  assert.doesNotMatch(spoken, /124|methods|rows/);
  summary.parentElement.open = false;
  assert.match(describeNavigationTarget(summary), /Collapsed/);
});

test('unlabelled menus announce only the selected option and named groups stay concise', () => {
  const menu = element('select', {}, { textContent: 'Brazil France Japan', selectedOptions: [{ textContent: 'France' }] });
  assert.equal(describeNavigationTarget(menu), 'Menu. Selected: France');
  const group = element('div', { role: 'group', 'aria-label': 'Combined map and sound layers' }, { textContent: 'Seven long readings' });
  assert.equal(describeNavigationTarget(group), 'Combined map and sound layers');
});

test('slider descriptions use the accessible frame value rather than a zero-based counter', () => {
  const slider = element('input', { 'aria-label': 'Frame position', 'aria-valuetext': 'Frame 7 of 124' }, { type: 'range', value: '6', max: '123' });
  assert.equal(describeNavigationTarget(slider), 'Frame position. Frame 7 of 124');
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
