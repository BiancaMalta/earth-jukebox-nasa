// AI-assisted: OpenAI Codex
import test from 'node:test';
import assert from 'node:assert/strict';
import {describeReading} from '../ui/readings.js';
import {mapFrameSound} from '../engine/mapping.js';
const track={id:'clima-chuva',svsId:5149,unit:'mm'};

test('loading and failed regional requests are distinct from scientific no-pixel gaps',()=>{
 for(const [state,label] of [['loading','Loading…'],['error','Load failed'],['missing','No regional data']]){
  const frame={mean:5,norm:.25,coverage:.5,availability:{state}};
  const reading=describeReading(frame,track);
  assert.equal(reading.mean,label);assert.equal(reading.soundValue,label);
  assert.equal(reading.sound,null);assert.equal(mapFrameSound(frame,track),null);
  assert.doesNotMatch(reading.summary,/no valid pixels|no regional value is available/);
 }
});

test('unknown precipitation is never silently converted to zero precipitation',()=>{
 const unknown=describeReading({mean:null,norm:null,coverage:0},track);
 assert.equal(unknown.mean,'No recognized pixels');assert.equal(unknown.sound,null);
 assert.match(unknown.availability.detail,/unknown, not zero/);
 const zero=describeReading({mean:0,norm:0,coverage:.5},track);
 assert.equal(zero.mean,'0.00 mm');assert.equal(zero.sound.rate,0);
 const positive=describeReading({mean:1,norm:.05,coverage:.5},track);
 assert.ok(positive.sound.rate>0);
});
