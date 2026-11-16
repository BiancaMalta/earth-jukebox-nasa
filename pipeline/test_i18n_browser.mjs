// Browser regression check. Requires a local static server and Firefox BiDi.
// node pipeline/test_i18n_browser.mjs --webdriver ws://127.0.0.1:9339/session --site http://127.0.0.1:8000/
import assert from 'node:assert/strict';
import fs from 'node:fs';
const option = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const ws = new WebSocket(option('--webdriver', 'ws://127.0.0.1:9339/session'));
const site = option('--site', 'http://127.0.0.1:8000/');
const output = option('--output', '/tmp/earth-jukebox-i18n-checks.json');
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
  ({context}=await call('browsingContext.create', {type:'tab'}));
  // Deterministic speech doubles verify language selection, not audible OS output.
  await call('script.addPreloadScript',{contexts:[context],functionDeclaration:`()=>{
    const originalFetch=window.fetch.bind(window);
    window.fetch=(resource,options)=>sessionStorage.getItem('test-missing-catalogue')==='yes' && String(resource).includes('/i18n/pt.json')
      ? Promise.resolve(new Response('',{status:503})):originalFetch(resource,options);
    window.__spoken=[];window.__voices=[{name:'English',lang:'en-US'},{name:'Brasil',lang:'pt-BR'}];
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:class{constructor(text){this.text=text;}}});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      getVoices:()=>window.__voices,resume(){},cancel(){},addEventListener(){},removeEventListener(){},speaking:false,pending:false,
      speak(u){window.__spoken.push(u);queueMicrotask(()=>{u.onstart?.();u.onend?.();});}
    }});
  }`});
  await call('browsingContext.navigate',{context,url:site,wait:'complete'});
  await waitFor('Boolean(document.querySelector("#play-pause:not(:disabled)"))');
  await evaluate(`document.querySelector('[data-language=en]').click()`);
  await waitFor(`document.documentElement.lang==='en' && document.getElementById('play-pause').textContent==='Play'`);
  await evaluate(`document.querySelector('input[name=region-scope][value=country]').click()`);
  await waitFor(`!document.getElementById('region-country').disabled`);
  await evaluate(`(()=>{const c=document.getElementById('region-country');c.value=[...c.options].find(o=>o.textContent==='Brazil').value;c.dispatchEvent(new Event('change'));})()`);
  await waitFor(`document.getElementById('region-status').textContent.startsWith('Brazil: Python-calculated regional values are ready.')`);
  await evaluate(`document.getElementById('next-frame').click();document.getElementById('playback-speed').value='0.5';document.getElementById('playback-speed').dispatchEvent(new Event('change'));document.getElementById('time-pulse-enabled').click();`);
  await waitFor(`document.getElementById('frame-position').value==='1'`);
  await evaluate(`window.state=()=>JSON.stringify({record:document.getElementById('track-select').value,country:document.getElementById('region-country').value,region:document.getElementById('region-continent').value,frame:document.getElementById('frame-position').value,date:document.getElementById('frame-date').getAttribute('datetime'),speed:document.getElementById('playback-speed').value,pulse:document.getElementById('time-pulse-enabled').checked,image:document.getElementById('frame-image').src});window.before=state();document.querySelector('[data-language="pt-BR"]').click()`);
  await waitFor(`document.getElementById('play-pause').textContent==='Tocar'`);
  await check('Switching language preserves record, country, frame, date, playback speed, metronome and image', 'before===state()');
  await check('Portuguese toggle is exposed as active and page language is pt-BR', `document.documentElement.lang==='pt-BR' && document.querySelector('[data-language="pt-BR"]').getAttribute('aria-pressed')==='true' && document.querySelector('[data-language=en]').getAttribute('aria-pressed')==='false'`);
  await check('Country and regional status are translated while their data stay available', `document.getElementById('region-selection-name').textContent==='Brasil' && document.getElementById('region-status').textContent.includes('valores regionais calculados em Python estão prontos') && !document.getElementById('frame-mean').textContent.includes('Indisponível')`);
  await check('Localized table caption and accessible timeline include the selected place', `document.getElementById('time-series-caption').textContent==='Valores de Brasil por quadro' && document.getElementById('frame-position').getAttribute('aria-valuetext').startsWith('Brasil; quadro 2 de ')`);
  await check('Portuguese record labels include the correct instruments', `document.querySelector('input[name=earth-record][value="clima-temperatura"]').getAttribute('aria-label')==='Temperatura, Órgão'`);
  await evaluate(`document.getElementById('spoken-navigation-toggle').click()`);
  await waitFor(`document.getElementById('spoken-navigation-toggle').getAttribute('aria-pressed')==='true'`);
  await check('Spoken navigation starts with Portuguese content and a Portuguese voice', `__spoken.at(-1).lang==='pt-BR' && __spoken.at(-1).text.startsWith('A navegação falada está ativada')`);
  await evaluate(`document.getElementById('play-pause').focus()`);
  await waitFor(`__spoken.at(-1).text.startsWith('Tocar')`);
  await check('Focused controls are narrated in Portuguese', `__spoken.at(-1).lang==='pt-BR' && !__spoken.at(-1).text.includes('Play')`);
  await evaluate(`document.getElementById('intro-start').click();window.focusedTitle=document.activeElement.textContent;`);
  await check('Introduction heading is translated before focus is moved', `focusedTitle==='1. Guia de teclado' && document.activeElement.id==='intro-step-heading'`);
  await evaluate(`document.querySelector('[data-language=en]').click()`);
  await waitFor(`document.getElementById('play-pause').textContent==='Play'`);
  await check('Changing language also changes the active narration voice', `__spoken.at(-1).lang==='en-US' && __spoken.at(-1).text.startsWith('Page language changed')`);
  await check('English switch restores dynamic country names, table and focused introduction', `before===state() && document.getElementById('region-selection-name').textContent==='Brazil' && document.getElementById('intro-step-heading').textContent==='1. Keyboard guide' && document.getElementById('time-series-caption').textContent==='Brazil values by frame'`);
  await evaluate(`document.getElementById('spoken-navigation-toggle').click()`);
  await evaluate(`document.getElementById('intro-stop').click();document.querySelector('[data-language="pt-BR"]').click();document.getElementById('region-reset').click()`);
  await waitFor(`document.getElementById('region-selection-name').textContent==='Mapa inteiro' && document.querySelectorAll('#region-suggestions button').length===4`);
  await check('World suggestions retain two regions and two countries in Portuguese', `[...document.querySelectorAll('#region-suggestions button small')].filter(e=>e.textContent==='País').length===2 && [...document.querySelectorAll('#region-suggestions button small')].filter(e=>e.textContent==='Região').length===2`);
  await evaluate(`document.querySelector('#region-suggestions button[data-suggestion-key^="country:"]').click()`);
  await waitFor(`document.getElementById('region-status').textContent.includes('valores regionais calculados em Python estão prontos')`);
  await check('Country suggestion still loads original regional data after translating its label', `document.querySelector('input[name=region-scope][value=country]').checked && document.getElementById('region-country').value!=='' && !document.getElementById('frame-mean').textContent.includes('Indisponível')`);
  // Pause if autoplay succeeded; a headless host may not provide audio output.
  await evaluate(`if(document.getElementById('play-pause').getAttribute('aria-pressed')==='true')document.getElementById('play-pause').click();`);
  await evaluate(`document.getElementById('region-reset').click();document.getElementById('combined-preview-tab').click()`);
  await waitFor(`document.querySelectorAll('.combined-frame').length===7 && document.getElementById('reading-ozone').textContent.includes('pixels analisados usados')`);
  await evaluate(`document.getElementById('layer-ozone').click();document.querySelector('[data-language=en]').click();document.querySelector('[data-language="pt-BR"]').click()`);
  await waitFor(`document.getElementById('layer-state-ozone').textContent==='Desativado · silenciado'`);
  await check('Combined mode and muted layers survive language changes', `document.getElementById('combine-sounds').checked && !document.getElementById('layer-ozone').checked && document.getElementById('layer-ozone').closest('.combined-frame').classList.contains('combined-frame--off')`);
  await check('Combined switch has a Portuguese instruction without changing its numeric reading', `document.getElementById('layer-ozone').dataset.spokenDescription.includes('Ative ou desative para incluir ou silenciar este disco')`);
  await evaluate(`document.getElementById('individual-preview-tab').click()`);
  const records=[['clima-temperatura','Temperatura'],['clima-vento','Vento'],['clima-chuva','Precipitação'],['clima-umidade','Umidade'],['ar-pm25','Material particulado'],['ar-co','Monóxido de carbono'],['clima-ozonio','Ozônio']];
  for(const [id,name] of records){
    await evaluate(`document.querySelector('input[name=earth-record][value="${id}"]').click()`);
    await waitFor(`document.getElementById('track-title').textContent.startsWith('${name}') && document.querySelector('#play-pause:not(:disabled)') && !document.getElementById('player-status').textContent.includes('Carregando')`);
    await check(`${id}: dynamically loaded descriptions, readings, dates and maps use Portuguese`, `document.getElementById('coverage-detail').textContent.includes('pixels analisados usados') && / de .+ de 2026/.test(document.getElementById('frame-date').textContent) && document.getElementById('frame-image').alt.startsWith('Visualização de ') && !document.getElementById('mapping-help').textContent.includes('The supplied')`);
  }
  for(const width of [320,390,800,1440]){
    await call('browsingContext.setViewport',{context,viewport:{width,height:844},devicePixelRatio:1});
    await evaluate(`document.getElementById('regional-explorer').open=true;document.querySelector('.jukebox-tuning').open=true`);
    await check(`${width}px: Portuguese controls reflow without horizontal overflow`, `document.documentElement.scrollWidth<=innerWidth+1`);
    await check(`${width}px: language buttons have 44px touch targets`, `[...document.querySelectorAll('[data-language]')].every(e=>e.getBoundingClientRect().height>=44 && e.getBoundingClientRect().width>=44)`);
  }
  await call('browsingContext.reload',{context,wait:'complete'});
  await waitFor(`document.getElementById('play-pause')?.textContent==='Tocar'`);
  await check('Portuguese preference survives a page reload', `document.documentElement.lang==='pt-BR' && localStorage.getItem('earth-jukebox-language')==='pt-BR'`);
  await evaluate(`document.getElementById('playback-speed').value='0.25';document.getElementById('playback-speed').dispatchEvent(new Event('change'));document.getElementById('play-pause').click();window.playingFrame=document.getElementById('frame-position').value;document.querySelector('[data-language=en]').click();window.keptPlaying=document.getElementById('play-pause').getAttribute('aria-pressed')==='true'&&document.getElementById('frame-position').value===playingFrame;`);
  await check('Language change during playback does not pause or restart the sequence', 'keptPlaying');
  await evaluate(`document.getElementById('play-pause').click();document.getElementById('spoken-navigation-toggle').click()`);
  await waitFor(`document.getElementById('spoken-navigation-toggle').getAttribute('aria-pressed')==='true'`);
  await evaluate(`window.__voices=__voices.filter(v=>v.lang==='en-US');document.querySelector('[data-language="pt-BR"]').click()`);
  await waitFor(`document.getElementById('spoken-navigation-status').textContent.startsWith('Não há uma voz disponível para o idioma da página')`);
  await check('Missing Portuguese voice turns narration off with a localized message, keeping playback available', `document.getElementById('spoken-navigation-toggle').getAttribute('aria-pressed')==='false' && !document.getElementById('play-pause').disabled`);
  await evaluate(`sessionStorage.setItem('test-missing-catalogue','yes')`);
  await call('browsingContext.reload',{context,wait:'complete'});
  await waitFor(`document.getElementById('play-pause')?.textContent==='Play' && !document.getElementById('play-pause').disabled`);
  await check('Failed translation download leaves the English player usable and disables the unavailable language', `document.documentElement.lang==='en' && document.querySelector('[data-language="pt-BR"]').disabled && document.querySelector('[data-language="pt-BR"]').title.includes('Recarregue')`);
  await evaluate(`sessionStorage.removeItem('test-missing-catalogue')`);
  await call('browsingContext.reload',{context,wait:'complete'});
  await waitFor(`Boolean(document.querySelector('#play-pause:not(:disabled)'))`);
  await check('Language selection recovers after the catalogue loads again', `!document.querySelector('[data-language="pt-BR"]').disabled`);
  // Leave other browser tests and the developer's default in English.
  await evaluate(`document.querySelector('[data-language=en]').click()`);
  fs.writeFileSync(output,JSON.stringify({checks},null,2)+'\n');
  console.log(`Passed ${checks.length} language browser checks. Evidence: ${output}`);
}finally{await call('session.end').catch(()=>{});ws.close();}
