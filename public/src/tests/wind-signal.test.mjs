// AI-assisted: OpenAI Codex
import test from 'node:test';
import assert from 'node:assert/strict';
import {mapWindActivity, mapFrameSound} from '../engine/mapping.js';
import {validateFeatures} from '../data/features.js';
import {describeReading} from '../ui/readings.js';
import {describeExperience} from '../ui/experience.js';
import {createLegend} from '../ui/legend.js';
const track={id:'clima-vento',svsId:5148,unit:'m/s',sonification:{input:'visualSignal',unit:'1'}};

test('visible wind mapping is monotonic, fixed, deterministic and rejects missing values',()=>{
 let previous=-1;
 for(let i=0;i<=1000;i++){
  const x=i/1000,value=mapWindActivity(x);
  assert.ok(value>=previous&&value>=.3&&value<=4);assert.equal(value,mapWindActivity(x));previous=value;
 }
 for(const value of [null,undefined,'0',NaN,Infinity,-1,1.1])assert.equal(mapWindActivity(value),null);
});

test('wind uses the explicitly declared index, never inventing it from mean, norm or pixel inclusion',()=>{
 const frame={mean:30,norm:.75,coverage:.5,visualSignal:.01};
 assert.equal(mapFrameSound(frame,track).rate,mapWindActivity(.01));
 assert.equal(mapFrameSound({...frame,visualSignal:null},track),null);
 assert.equal(mapFrameSound({...frame,coverage:0},track),null);
 assert.equal(mapFrameSound({...frame,mean:1,norm:.025},track).rate,mapWindActivity(.01));
 const data=validateFeatures({track:'clima-vento',unit:'m/s',mock:false,sonification:track.sonification,frames:[{file:'frame_000001.webp',...frame}]},track.id,track.unit);
 assert.equal(data.frames[0].visualSignal,.01);assert.equal(data.frames[0].norm,.75);
 assert.match(describeReading(frame,track).measure,/index/);
 assert.match(describeReading(frame,track).measureDetail,/diagnostics/);
 assert.match(describeExperience(track).mapping,/not average wind speed/);
});

test('visual wind legend labels indices instead of pretending they are meters per second',async()=>{
 const saved=globalThis.window,tasks=[],values=[],steps=[];
 globalThis.window={setTimeout(fn,delay){tasks.push({fn,delay});return tasks.length;},clearTimeout(){}};
 try{
  const legend=createLegend({audio:{stop(){},playWindActivity(v){values.push(v);return true;}},speech:{cancel(){},speak(){}},enableAudio:async()=>{},getKind:()=> 'windVisual',onBeforeStart(){},onState(){},onStep(s){steps.push(s)},onError(){assert.fail('Unexpected error')}});
  await legend.toggle();tasks.find(t=>t.delay===2500).fn();tasks.at(-1).fn();
  assert.deepEqual(values,[.01,.1]);assert.match(steps[0],/index 0.01/);assert.match(steps.at(-1),/not a wind-speed measurement/);
 }finally{globalThis.window=saved;}
});
