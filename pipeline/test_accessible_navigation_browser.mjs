// AI-assisted: OpenAI Codex
// Requires Node with WebSocket, a dedicated Firefox BiDi endpoint and a local server.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const option = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const endpoint = option('--webdriver', 'ws://127.0.0.1:9339/session');
const site = option('--site', 'http://127.0.0.1:8000/');
const output = option('--output', '/tmp/accessible-navigation-browser.json');
const ws = new WebSocket(endpoint);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let serial = 0, context;
const pending = new Map();
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
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (expression, timeout = 10000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await evaluate(expression)) return; await delay(100); }
  throw Error(`Timed out: ${expression}`);
};
const key = async (value, shift = false) => {
  const actions = [];
  if (shift) actions.push({ type: 'keyDown', value: '\uE008' });
  actions.push({ type: 'keyDown', value }, { type: 'keyUp', value });
  if (shift) actions.push({ type: 'keyUp', value: '\uE008' });
  await call('input.performActions', { context, actions: [{ type: 'key', id: 'navigation-keyboard', actions }] });
  await delay(100);
};
const focus = id => evaluate(`document.getElementById(${JSON.stringify(id)}).focus()`);
const check = async (label, expression) => { assert.equal(await evaluate(expression), true, label); checks.push(label); };
const checks = [];
let nativeVoices;
try {
  await call('session.new', { capabilities: { alwaysMatch: {} } });
  ({ context } = await call('browsingContext.create', { type: 'tab' }));
  await evaluate('speechSynthesis.getVoices(); undefined');
  await delay(800);
  nativeVoices = JSON.parse(await evaluate('JSON.stringify(speechSynthesis.getVoices().map(v=>({name:v.name,lang:v.lang})))'));
  // Deterministic speech events verify UI behavior; native voice enumeration is
  // recorded separately and is not evidence of audible output or screen-reader support.
  await call('script.addPreloadScript', { contexts: [context], functionDeclaration: `() => {
    window.__spoken = []; window.__voiceMode = 'ready'; window.__speechStarts = true;
    window.__voiceListeners = []; window.__speechFailure = null; window.__resumes = 0;
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => window.__voiceMode === 'none' ? [] : [{name:'Test English',lang:'en-US'}],
      resume() { window.__resumes++; }, cancel() {}, speaking:false, pending:false,
      addEventListener(name, listener) { if(name==='voiceschanged')window.__voiceListeners.push(listener); },
      removeEventListener() {},
      speak(utterance) {
        window.__spoken.push(utterance.text); window.__lastUtterance = utterance;
        queueMicrotask(() => {
          if(window.__speechFailure)utterance.onerror?.({error:window.__speechFailure});
          else if(window.__speechStarts){utterance.onstart?.();utterance.onend?.();}
        });
      }
    }});
  }` });
  const reload = async () => {
    await call('browsingContext.navigate', { context, url: site, wait: 'complete' });
    await waitFor('Boolean(document.querySelector("#play-pause:not(:disabled)"))');
  };
  await reload();
  await check('Play and slider precede regional options and the closed table in DOM order', `(() => {
    const ids=['play-pause','frame-position','region-options','frame-readings','time-series-panel'];
    return ids.every((id,i)=>!i||Boolean(document.getElementById(ids[i-1]).compareDocumentPosition(document.getElementById(id))&Node.DOCUMENT_POSITION_FOLLOWING))&&!document.getElementById('time-series-panel').open;
  })()`);
  await evaluate('document.querySelector("a[href=\"#play-pause\"]").click()');
  await check('Skip to playback moves focus directly to Play', 'document.activeElement.id === "play-pause"');
  await key('\uE004');
  await check('Next frame follows Play', 'document.activeElement.id === "next-frame"');
  await key('\uE004');
  await check('Frame slider follows Next frame', 'document.activeElement.id === "frame-position"');
  await focus('spoken-navigation-toggle'); await key('\uE007');
  await waitFor('document.getElementById("spoken-navigation-toggle").getAttribute("aria-pressed")==="true"');
  await check('Voice activation resumes synthesis and reveals explicit row speech', '__resumes>0 && !document.getElementById("read-current-row").hidden');
  await evaluate('document.querySelector("#time-series-panel > summary").focus(); __spoken.length=0');
  await key('\uE007');
  await check('Opening the table announces its name and expanded state without reading rows', `document.getElementById('time-series-panel').open && __spoken.length===1 && /View values by time.*Expanded/.test(__spoken[0]) && __spoken[0].length<160`);
  await key('\uE004');
  await check('The first table action is explicit current-row speech', 'document.activeElement.id === "read-current-row"');
  await key('\uE007');
  await check('Explicit row speech includes headers and one frame, never the whole table', `/Date and time:/.test(__spoken.at(-1)) && /Mean:/.test(__spoken.at(-1)) && __spoken.at(-1).length<500`);
  await key('\uE004');
  await check('Table region does not announce any data row on focus', 'document.activeElement.classList.contains("time-series-scroll") && !/Mean:|First row:/.test(__spoken.at(-1))');
  await evaluate('window.__oldFrame = document.getElementById("frame-position").value');
  await key('\uE014');
  await check('ArrowRight within the table does not advance the frame', 'document.getElementById("frame-position").value === __oldFrame');
  await key('\uE004');
  await check('Tab crosses the table without visiting its 124 rows', 'document.activeElement.textContent === "Back to playback"');
  await key('\uE007');
  await check('Back to playback restores the Play focus', 'document.activeElement.id === "play-pause"');
  await evaluate('document.querySelector("input[name=region-scope][value=continent]").click()');
  await focus('region-continent');
  await check('Country-group menu reads its label and selection, not every option', '__spoken.at(-1).length<160 && !/Africa.*North America.*Asia/.test(__spoken.at(-1))');
  await evaluate(`document.getElementById('combine-sounds').checked=true; document.getElementById('combine-sounds').dispatchEvent(new Event('change',{bubbles:true}));`);
  await waitFor('!document.getElementById("combined-layers").hidden');
  await focus('combined-layers');
  await check('Combined group focus does not read all seven layers', '__spoken.at(-1) === "Combined map and sound layers"');
  await focus('layer-temperature');
  await check('Individual layer has its own current-reading description', 'document.activeElement.getAttribute("aria-describedby")==="reading-temperature" && /Temperature/.test(__spoken.at(-1))');
  await key('\uE00C');
  await check('Escape turns voice off', 'document.getElementById("spoken-navigation-toggle").getAttribute("aria-pressed")==="false"');

  await reload();
  await evaluate('document.getElementById("intro-start").click(); document.getElementById("intro-next").click(); document.getElementById("intro-next").click(); document.querySelector("[data-intro-action=playback]").click()');
  await check('Guided introduction playback action focuses Play itself', 'document.activeElement.id === "play-pause"');
  await evaluate('__voiceMode="none"; document.getElementById("spoken-navigation-toggle").click()');
  await check('Voice is not marked on while no voices are ready', 'document.getElementById("spoken-navigation-toggle").getAttribute("aria-pressed")==="false"');
  await waitFor('document.getElementById("spoken-navigation-status").textContent.includes("No voice")', 5000);
  await check('No-voice failure is visible and leaves navigation off', '!document.getElementById("spoken-navigation-status").classList.contains("sr-only") && document.getElementById("spoken-navigation-toggle").getAttribute("aria-pressed")==="false"');
  await evaluate('document.getElementById("spoken-navigation-toggle").click(); __voiceMode="ready"; __voiceListeners.forEach(listener=>listener())');
  await waitFor('document.getElementById("spoken-navigation-toggle").getAttribute("aria-pressed")==="true"');
  checks.push('Delayed voiceschanged recovers speech after an empty voice list');
  await evaluate('__speechFailure="synthesis-unavailable"; document.getElementById("play-pause").focus()');
  await waitFor('document.getElementById("spoken-navigation-status").textContent.includes("synthesis-unavailable")');
  await check('Synthesis errors switch navigation off with a visible explanation', 'document.getElementById("spoken-navigation-toggle").getAttribute("aria-pressed")==="false"');
  await evaluate('__speechFailure=null; __speechStarts=false; document.getElementById("spoken-navigation-toggle").click()');
  await waitFor('document.getElementById("spoken-navigation-status").textContent.includes("did not start")', 7000);
  checks.push('A voice that never starts times out instead of staying enabled');
  fs.writeFileSync(output, JSON.stringify({ checks, nativeVoiceCount: nativeVoices.length, nativeEnglishVoiceCount: nativeVoices.filter(v=>/^en[-_]/i.test(v.lang)).length, speech: 'Deterministic fake speech events; no perceptual or screen-reader validation.' }, null, 2)+'\n');
  console.log(`Passed ${checks.length} browser checks. Evidence: ${output}`);
} finally {
  await call('session.end').catch(()=>{});
  ws.close();
}
