// AI-assisted: OpenAI Codex
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateFeatures } from '../data/features.js';
import { regionalFrame, validateRegionalFeatures } from '../data/regions.js';
import { mapFrameSound } from '../engine/mapping.js';

const source = { mock: false, unit: '°C', vmin: -40, vmax: 40,
  frames: [{ file: 'frame_000001.webp', date: '2026-10-30T06:00-04:00', mean: 10, p90: 20, norm: .625 }] };
const track = { id: 'test', svsId: 5147, unit: '°C' };
const fixture = () => ({ schemaVersion: 1, track: 'test', svsId: 5147, ...structuredClone(source),
  columns: ['mean', 'p90', 'norm', 'coverage'], regions: {
    'country:Test': { kind: 'country', name: 'Test', values: [[0, 2, .5, .75]] },
  } });

test('regional values preserve supplied norm, zero and original timestamp without recomputation', () => {
  const data = validateRegionalFeatures(fixture(), track, source);
  const frame = regionalFrame(source.frames[0], data.regions['country:Test'].values[0]);
  assert.equal(frame.mean, 0); assert.equal(frame.norm, .5); assert.equal(frame.date, source.frames[0].date);
  const deliberate = regionalFrame(frame, [30, 35, 0, 1]);
  assert.equal(deliberate.norm, 0);
  assert.equal(mapFrameSound(deliberate, {id:'clima-temperatura',svsId:5147,unit:'°C'}).note, 'C3');
});

test('regional data rejects stale track, scale, timestamps, source values and frame order', () => {
  const changes = [d=>d.track='other', d=>d.unit='K', d=>d.vmax=50, d=>d.mock=true,
    d=>d.frames[0].date='2026-10-30T06:00', d=>d.frames[0].mean=11,
    d=>d.frames[0].file='frame_000002.webp', d=>d.frames.push(d.frames[0])];
  for(const change of changes){const data=fixture();change(data);assert.throws(()=>validateRegionalFeatures(data,track,source));}
});

test('regional missing values are silent and never inherit the full-frame mean or p90', () => {
  const frame=regionalFrame(source.frames[0], undefined);
  assert.equal(frame.mean,null);assert.equal(frame.norm,null);assert.equal(frame.p90,null);
  assert.equal(mapFrameSound(frame,{id:'clima-temperatura',svsId:5147,unit:'°C'}),null);
  const data=fixture();data.regions['country:Test'].values=[[null,null,null,0]];
  assert.doesNotThrow(()=>validateRegionalFeatures(data,track,source));
});

test('regional validation rejects invalid rows and ambiguous region identities', () => {
  for(const row of [[1,2,NaN,.5],[null,null,null,.5],[1,2,1.1,.5],[1,2,.5,-1],['0',2,.5,.5]]){
    const data=fixture();data.regions['country:Test'].values=[row];
    assert.throws(()=>validateRegionalFeatures(data,track,source));
  }
  const data=fixture();data.regions['country:Test'].name='Other';
  assert.throws(()=>validateRegionalFeatures(data,track,source));
});

test('published regional tables match their source datasets and provide every frame', async () => {
  for(const id of ['clima-temperatura','clima-vento','clima-chuva','clima-umidade','ar-co','ar-pm25','clima-ozonio']){
    const raw=JSON.parse(await readFile(new URL(`../../data/${id}/features.json`,import.meta.url),'utf8'));
    const data=JSON.parse(await readFile(new URL(`../../data/${id}/regions.json`,import.meta.url),'utf8'));
    const colorbar=JSON.parse(await readFile(new URL(`../../data/${id}/colorbar.json`,import.meta.url),'utf8'));
    const source=validateFeatures(raw,id,raw.unit);
    validateRegionalFeatures(data,{id,svsId:raw.svsId},source);
    assert.equal(Object.keys(data.regions).length,185);
    assert.equal(data.regions['country:Brazil'].values.length,source.frames.length);
    for(const region of Object.values(data.regions)) for(const [mean,,norm] of region.values){
      if(mean===null) assert.equal(norm,null);
      else {
        const normalized=colorbar.scale==='log'
          ? (Math.log(mean)-Math.log(raw.vmin))/(Math.log(raw.vmax)-Math.log(raw.vmin))
          : (mean-raw.vmin)/(raw.vmax-raw.vmin);
        assert.ok(Math.abs(norm-Math.max(0,Math.min(1,normalized)))<=.0005000001);
      }
    }
  }
});


test('regional tables cannot silently mix area-weighted and legacy pixel means',()=>{
 const statistics={mean:'area_weighted',weighting:'cos_latitude',p90:'unweighted_pixel_percentile',coverage:'accepted_pixel_fraction'};
 const weighted={...source,statistics};
 const data=fixture();data.statistics=statistics;
 assert.throws(()=>validateRegionalFeatures(data,track,weighted));
 data.schemaVersion=2;assert.doesNotThrow(()=>validateRegionalFeatures(data,track,weighted));
 assert.throws(()=>validateRegionalFeatures(data,track,source));
});
