// AI-assisted: OpenAI Codex
import assert from 'node:assert/strict';
import {mapOzone} from '../public/src/engine/mapping.js';
import fs from 'node:fs';
const option=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const ws=new WebSocket(option('--webdriver','ws://127.0.0.1:9338/session'));await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail;});
let n=0;const pending=new Map();const errors=[];ws.onmessage=e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.type==='error'?p.reject(Error(JSON.stringify(r))):p.resolve(r.result);}else if(r.method==='log.entryAdded'&&r.params.level==='error')errors.push(r.params.text);};
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++n;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
await call('session.new',{capabilities:{alwaysMatch:{acceptInsecureCerts:false}}});
try {
const {context}=await call('browsingContext.create',{type:'tab'});await call('session.subscribe',{events:['log.entryAdded']});
const ev=async expression=>{const r=await call('script.evaluate',{expression,target:{context},awaitPromise:true});if(r.type==='exception')throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
await call('browsingContext.navigate',{context,url:option('--site','http://127.0.0.1:8000/'),wait:'complete'});await delay(2500);

const snapshots=[];
const state=async label=>{const data=JSON.parse(await ev('JSON.stringify({mean:document.querySelector("#frame-mean").textContent,note:document.querySelector("#current-note").textContent,status:document.querySelector("#region-status").textContent,retry:[...document.querySelectorAll("button")].some(b=>b.textContent==="Retry regional data"&&!b.hidden)})'));snapshots.push({label,...data});console.log(label,JSON.stringify(data),JSON.stringify(errors));return data;};
await ev("(()=>{const s=document.querySelector('#track-select');s.value='clima-chuva';s.dispatchEvent(new Event('change',{bubbles:true}));})()");await delay(1200);
await ev(`(()=>{const original=window.fetch.bind(window);let fail=true;window.fetch=async (...args)=>{if(String(args[0]).includes('/clima-chuva/regions.json')&&fail){fail=false;await new Promise(r=>setTimeout(r,500));return new Response('test failure',{status:503});}return original(...args);};const l=document.querySelector('#region-level');l.value='continent';l.dispatchEvent(new Event('change',{bubbles:true}));const c=document.querySelector('#region-continent');c.value='North America';c.dispatchEvent(new Event('change',{bubbles:true}));})()`);
assert.equal((await state('loading')).mean,'Loading…');await delay(700);
const failed=await state('failed');assert.equal(failed.mean,'Load failed');assert.equal(failed.retry,true);
await ev("[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry regional data').click()");await delay(1200);
const recovered=await state('retry-recovered');assert.notEqual(recovered.mean,'Load failed');assert.notEqual(recovered.note,'Unavailable');assert.equal(recovered.retry,false);assert.match(recovered.status,/ready/);
await ev("(()=>{const l=document.querySelector('#region-level');l.value='country';l.dispatchEvent(new Event('change',{bubbles:true}));const c=document.querySelector('#region-continent');c.value='Africa';c.dispatchEvent(new Event('change',{bubbles:true}));const s=document.querySelector('#region-country');s.value=[...s.options].find(o=>o.text==='Chad').value;s.dispatchEvent(new Event('change',{bubbles:true}));})()");await delay(500);
const unknown=await state('chad-no-pixels');assert.equal(unknown.mean,'No recognized pixels');assert.equal(unknown.retry,false);

// A delayed response for rain must not overwrite a newer ozone selection.
await ev(`(()=>{const original=window.fetch.bind(window);window.fetch=async (...args)=>{if(String(args[0]).includes('/clima-chuva/regions.json'))await new Promise(r=>setTimeout(r,900));return original(...args);};const s=document.querySelector('#track-select');s.value='clima-chuva';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(700);
await ev("(()=>{const l=document.querySelector('#region-level');l.value='continent';l.dispatchEvent(new Event('change',{bubbles:true}));const c=document.querySelector('#region-continent');c.value='North America';c.dispatchEvent(new Event('change',{bubbles:true}));const s=document.querySelector('#track-select');s.value='clima-ozonio';s.dispatchEvent(new Event('change',{bubbles:true}));})()");await delay(700);
await ev("(()=>{const l=document.querySelector('#region-level');l.value='continent';l.dispatchEvent(new Event('change',{bubbles:true}));const c=document.querySelector('#region-continent');c.value='North America';c.dispatchEvent(new Event('change',{bubbles:true}));})()");await delay(1300);
const fresh=await state('stale-rain-response-ignored');assert.equal(fresh.note,mapOzone(JSON.parse(fs.readFileSync(new URL('../public/data/clima-ozonio/regions.json',import.meta.url),'utf8')).regions['continent:North America'].values[0][2]));assert.match(fresh.mean,/ppbv/);assert.match(fresh.status,/North America.*ready/);
// A hung fetch becomes a retryable error rather than perpetual loading.
await ev(`(()=>{const original=window.fetch.bind(window);window.__hangRain=true;window.fetch=(...args)=>{if(window.__hangRain&&String(args[0]).includes('/clima-chuva/regions.json'))return new Promise((resolve,reject)=>args[1].signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));return original(...args);};const s=document.querySelector('#track-select');s.value='clima-chuva';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(700);
await ev("(()=>{const l=document.querySelector('#region-level');l.value='continent';l.dispatchEvent(new Event('change',{bubbles:true}));const c=document.querySelector('#region-continent');c.value='North America';c.dispatchEvent(new Event('change',{bubbles:true}));})()");await delay(15500);
const timeout=await state('timeout');assert.equal(timeout.mean,'Load failed');assert.equal(timeout.retry,true);assert.match(timeout.status,/timed out/);
await ev("window.__hangRain=false;[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry regional data').click()");await delay(1800);
const retryTimeout=await state('timeout-retry-recovered');assert.match(retryTimeout.mean,/mm/);assert.equal(retryTimeout.retry,false);
assert.equal(errors.length,0);console.log(JSON.stringify({snapshots,consoleErrors:errors},null,2));fs.writeFileSync(option('--output','/tmp/rain-ui-validation.json'),JSON.stringify({snapshots,consoleErrors:errors},null,2));} finally { await call('session.end');ws.close(); }
