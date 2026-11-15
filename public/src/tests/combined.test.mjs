// AI-assisted: OpenAI Codex
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { combinedFrames, indexTimeline } from '../data/combined.js';

const a={file:'a.webp',date:'2026-10-30T06:00',mean:1,norm:.1};
const b={file:'b.webp',date:'2026-10-30T09:00',mean:2,norm:.2};
function dataset(frames){return {track:{id:'test'},timeline:indexTimeline(frames),regional:{regions:{'country:Test':{values:[[10,11,.9,.5],[20,21,.8,.6]]}}}};}

test('combined alignment uses timestamp labels even when frame indices differ',()=>{
 const result=combinedFrames([dataset([a,b]),dataset([b,a])],a.date);
 assert.equal(result[0].frame.file,'a.webp');assert.equal(result[1].frame.file,'a.webp');
 assert.deepEqual(combinedFrames([dataset([b])],a.date)[0].frame,null);
});

test('combined region rows use each matched frame index and preserve Python normalization',()=>{
 const result=combinedFrames([dataset([a,b]),dataset([b,a])],a.date,'country:Test');
 assert.equal(result[0].frame.mean,10);assert.equal(result[1].frame.mean,20);
 assert.equal(result[0].frame.norm,.9);assert.equal(result[1].frame.norm,.8);
 assert.equal(result[0].frame.date,a.date);
 const missing=combinedFrames([dataset([a])],a.date,'country:Missing')[0].frame;
 assert.equal(missing.mean,null);assert.equal(missing.norm,null);
});

test('combined timeline rejects invalid or duplicate dates without guessing a timezone',()=>{
 assert.throws(()=>indexTimeline([a,a]));assert.throws(()=>indexTimeline([{...a,date:'invalid'}]));
 assert.equal(combinedFrames([dataset([{...a,date:a.date+'Z'}])],a.date)[0].frame,null);
});

test('the four climate datasets share the same 124 supplied timestamp labels',async()=>{
 const ids=['clima-temperatura','clima-vento','clima-chuva','clima-umidade'];
 const datasets=await Promise.all(ids.map(async id=>{
  const data=JSON.parse(await readFile(new URL(`../../data/${id}/features.json`,import.meta.url),'utf8'));
  return {...dataset(data.frames),track:{id}};
 }));
 const reference=[...datasets[0].timeline.keys()];assert.equal(reference.length,124);
 for(const date of reference) assert.ok(combinedFrames(datasets,date).every(entry=>entry.frame?.date===date));
});
