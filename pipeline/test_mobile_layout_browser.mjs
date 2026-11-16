// Browser regression check. Requires a local static server and Firefox BiDi.
// node pipeline/test_mobile_layout_browser.mjs --webdriver ws://127.0.0.1:9339/session --site http://127.0.0.1:8000/
import assert from 'node:assert/strict';
import fs from 'node:fs';
const option = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const ws = new WebSocket(option('--webdriver', 'ws://127.0.0.1:9339/session'));
const site = option('--site', 'http://127.0.0.1:8000/');
const output = option('--output', '/tmp/earth-jukebox-mobile-checks.json');
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let serial = 0, context;
const pending = new Map(), checks = [];
ws.onmessage = event => {
  const message = JSON.parse(event.data), request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  message.type === 'error' ? request.reject(Error(JSON.stringify(message))) : request.resolve(message.result);
};
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++serial; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await call('script.evaluate', { expression, target: { context }, awaitPromise: true });
  if (result.type === 'exception') throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const waitFor = async expression => {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error(`Timed out: ${expression}`);
};
const check = async (label, expression) => { assert.equal(await evaluate(expression), true, label); checks.push(label); };
try {
  await call('session.new', { capabilities: { alwaysMatch: {} } });
  await call('network.setCacheBehavior', { cacheBehavior: 'bypass' });
  ({ context } = await call('browsingContext.create', { type: 'tab' }));
  for (const width of [320, 390, 430, 768, 800, 1440]) {
    await call('browsingContext.setViewport', { context, viewport: { width, height: 844 }, devicePixelRatio: 1 });
    await call('browsingContext.navigate', { context, url: site, wait: 'complete' });
    await waitFor('Boolean(document.querySelector("#play-pause:not(:disabled)")) && !document.getElementById("region-options").hidden');
    if (width > 800) {
      await check('Desktop does not activate mobile styles', `!matchMedia(document.querySelector('link[href*="mobile.css"]').media).matches`);
      continue;
    }
    await evaluate(`document.querySelector('.jukebox-tuning').open=true; document.querySelector('input[name="region-scope"][value="country"]').click(); document.querySelector('.calculation-panel').open=true; document.getElementById('time-series-panel').open=true;`);
    await check(`${width}: single view reflows without page overflow`, 'document.documentElement.scrollWidth <= innerWidth + 1');
    await check(`${width}: visible buttons, summaries and selectors have touch height`, `[...document.querySelectorAll('button, summary, select')].filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=43.9)`);
    await check(`${width}: selectors have readable 16px type`, `[...document.querySelectorAll('select')].filter(e=>e.getClientRects().length).every(e=>parseFloat(getComputedStyle(e).fontSize)>=16)`);
    await check(`${width}: all seven records remain in the scrollable collection`, `document.querySelectorAll('.record-sleeve input').length===7 && document.querySelector('.record-sleeves').scrollWidth > document.querySelector('.record-sleeves').clientWidth`);
    await evaluate('document.querySelectorAll(".record-sleeve input")[6].focus()');
    await waitFor(`(()=>{const r=document.activeElement.getBoundingClientRect(),s=document.querySelector('.record-sleeves').getBoundingClientRect();return r.left>=s.left-1&&r.right<=s.right+1;})()`);
    await check(`${width}: last record can be reached by focus without page overflow`, `(()=>{const r=document.activeElement.getBoundingClientRect(),s=document.querySelector('.record-sleeves').getBoundingClientRect();return r.left>=s.left-1&&r.right<=s.right+1&&document.documentElement.scrollWidth<=innerWidth+1;})()`);
    await call('input.performActions', { context, actions: [{ type: 'key', id: 'record-keyboard', actions: [{ type: 'keyDown', value: '\uE012' }, { type: 'keyUp', value: '\uE012' }] }] });
    await waitFor('document.querySelector("input[name=earth-record][value=ar-co]").checked');
    checks.push(`${width}: native arrow navigation still selects another record`);
    await evaluate('document.getElementById("combined-preview-tab").click()');
    await waitFor('document.querySelectorAll(".combined-frame").length===7');
    await check(`${width}: combined maps reflow without page overflow`, 'document.documentElement.scrollWidth <= innerWidth + 1');
    await evaluate('document.getElementById("layer-ozone").click()');
    await check(`${width}: muted map remains with its own switch`, `document.getElementById('layer-ozone').closest('.combined-frame').classList.contains('combined-frame--off')`);
    if (width === 320) {
      await evaluate('document.documentElement.style.fontSize="200%"');
      await check('320px: enlarged text reflows without page overflow', 'document.documentElement.scrollWidth <= innerWidth + 1');
      await evaluate('document.documentElement.style.fontSize=""');
    }
  }
  await call('browsingContext.setViewport', { context, viewport: { width: 740, height: 390 }, devicePixelRatio: 1 });
  await check('Landscape leaves sticky playback off to preserve map space', 'getComputedStyle(document.getElementById("transport-controls")).position!=="sticky"');
  await evaluate('document.getElementById("spoken-navigation-close").click()');
  await check('Closing spoken navigation hides the panel and keeps the voice off', 'document.getElementById("spoken-navigation").hidden && document.getElementById("spoken-navigation-toggle").getAttribute("aria-pressed")==="false"');
  await check('Closing spoken navigation moves focus to the introduction', 'document.activeElement.id==="intro-start"');
  fs.writeFileSync(output, JSON.stringify({ checks, note: 'Firefox resized viewports, not physical iOS/Android device testing.' }, null, 2) + '\n');
  console.log(`Passed ${checks.length} mobile browser checks. Evidence: ${output}`);
} finally {
  await call('session.end').catch(() => {});
  ws.close();
}
