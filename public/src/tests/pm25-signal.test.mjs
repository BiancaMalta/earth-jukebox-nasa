// AI-assisted: OpenAI Codex
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateFeatures } from '../data/features.js';
import { regionalFrame, validateRegionalFeatures } from '../data/regions.js';
import { mapFrameSound, mapPm25 } from '../engine/mapping.js';
import { describeReading } from '../ui/readings.js';
import { describeExperience } from '../ui/experience.js';
import { createLegend } from '../ui/legend.js';

const track = {id:'ar-pm25',svsId:5151,unit:'µg/m³',sonification:{input:'visualSignal',unit:'1'}};

test('PM2.5 uses the declared index even when the concentration mean points the other way',()=>{
  const low={mean:100,norm:.9,visualSignal:.1,coverage:.8};
  const high={mean:1,norm:.1,visualSignal:.3,coverage:.8};
  assert.ok(mapFrameSound(high,track).frequency>mapFrameSound(low,track).frequency);
  assert.deepEqual(mapFrameSound(low,track),{kind:'pm25',...mapPm25(.1)});
  assert.equal(mapFrameSound({...low,visualSignal:null},track),null);
  assert.equal(mapFrameSound({...low,coverage:0},track),null);
  assert.match(describeReading(low,track).measure,/PM2.5.*index/);
  assert.match(describeReading(low,track).summary,/PM2.5 signal index/);
  assert.doesNotMatch(describeReading(low,track).summary,/wind/);
  assert.match(describeExperience(track).readings,/not a concentration/);
});

test('the fixed PM2.5 audio curve strictly preserves increases across all regions',()=>{
  let previous=mapPm25(0);
  for(let i=1;i<=10000;i++){
    const mapped=mapPm25(i/10000);
    assert.ok(mapped.frequency>previous.frequency);
    assert.ok(mapped.brightness>previous.brightness);
    assert.deepEqual(mapped,mapPm25(i/10000));
    previous=mapped;
  }
});

test('published PM2.5 full-frame and regional indices survive validation through audio mapping',async()=>{
  const read=async name=>JSON.parse(await readFile(new URL(`../../data/ar-pm25/${name}.json`,import.meta.url),'utf8'));
  const raw=await read('features'), data=await read('regions');
  const source=validateFeatures(raw,track.id,track.unit);
  validateRegionalFeatures(data,track,source);
  assert.equal(data.schemaVersion,3);
  assert.equal(source.sonification.input,'visualSignal');
  for(const region of Object.values(data.regions)) for(let i=0;i<data.frames.length;i++){
    const frame=regionalFrame(source.frames[i],region.values[i]);
    assert.equal(frame.mean,region.values[i][0]);
    assert.equal(frame.norm,region.values[i][2]);
    assert.equal(frame.visualSignal,region.values[i][4]);
    assert.deepEqual(mapFrameSound(frame,track),frame.visualSignal===null?null:{kind:'pm25',...mapPm25(frame.visualSignal)});
  }
});

test('PM2.5 visual legend uses index references instead of concentration claims',async()=>{
  const saved=globalThis.window,tasks=[],steps=[],values=[];
  globalThis.window={setTimeout(fn,delay){tasks.push({fn,delay});return tasks.length;},clearTimeout(){}};
  try{
    const legend=createLegend({audio:{stop(){},playPm25(v){values.push(v);return true;}},speech:{cancel(){},speak(){}},enableAudio:async()=>{},getKind:()=> 'pm25Visual',onBeforeStart(){},onState(){},onStep(s){steps.push(s)},onError(){assert.fail('Unexpected error')}});
    await legend.toggle();tasks.find(t=>t.delay===2500).fn();tasks.find(t=>t.delay===5000).fn();
    assert.deepEqual(values,[0,1]);assert.match(steps[0],/index 0/);assert.doesNotMatch(steps.join(' '),/µg/);
  }finally{globalThis.window=saved;}
});
