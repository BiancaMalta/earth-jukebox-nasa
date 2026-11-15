// AI-assisted: OpenAI Codex
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CO_NOTES,PM25_PITCH_RANGE,mapCarbonMonoxide,mapPm25,mapFrameSound,mapValue} from '../engine/mapping.js';
const coPosition=ppbv=>(ppbv-40)/460;

test('CO uses fixed C-major anchors and closer concentration steps',()=>{
 assert.equal(CO_NOTES.length,29);assert.ok(CO_NOTES.every(n=>/^[CDEFGAB][2-6]$/.test(n)));
 for(const [value,index] of [[40,0],[60,3],[200,24],[500,28]])assert.equal(mapCarbonMonoxide(coPosition(value)),CO_NOTES[index]);
 assert.equal(mapCarbonMonoxide(coPosition(100)),'E3');
 assert.equal(mapCarbonMonoxide(coPosition(107)),'F3');
 for(let i=0;i<24;i++){
  const a=40+160*i/24,b=40+160*(i+1)/24;
  assert.equal(CO_NOTES.indexOf(mapCarbonMonoxide(coPosition(b)))-CO_NOTES.indexOf(mapCarbonMonoxide(coPosition(a))),1);
 }
 let previous=-1;
 for(let i=0;i<=10000;i++){const index=CO_NOTES.indexOf(mapCarbonMonoxide(i/10000));assert.ok(index>=previous);previous=index;}
 for(const v of [null,undefined,NaN,Infinity,-.01,1.01,'0.5'])assert.equal(mapCarbonMonoxide(v),null);
 assert.equal(mapValue(.5),'C4');
});

test('PM2.5 pitch intervals double in cents while brightness remains unchanged',()=>{
 assert.equal(mapPm25(0).frequency,PM25_PITCH_RANGE.min);
 assert.equal(mapPm25(1).frequency,PM25_PITCH_RANGE.max);
 for(const [a,b] of [[0,.01],[.12,.13],[.1,.3],[.3,.8],[.8,1]]){
  const first=mapPm25(a),second=mapPm25(b);
  const oldInterval=2400*((b+.3*Math.sin(Math.PI*b))-(a+.3*Math.sin(Math.PI*a)));
  assert.ok(Math.abs(1200*Math.log2(second.frequency/first.frequency)-2*oldInterval)<1e-9);
  assert.ok(Math.abs(first.brightness-(a+.3*Math.sin(Math.PI*a)))<1e-12);
 }
});

test('published CO and PM2.5 inputs still map safely and missing regions remain silent',async()=>{
 for(const id of ['ar-co','ar-pm25']){
  const read=async name=>JSON.parse(await readFile(new URL(`../../data/${id}/${name}.json`,import.meta.url),'utf8'));
  const source=await read('features'),regional=await read('regions');
  const track={id,svsId:source.svsId,unit:source.unit,sonification:source.sonification};
  for(const row of Object.values(regional.regions)) for(const v of row.values){
   const sound=mapFrameSound({mean:v[0],norm:v[2],coverage:v[3],visualSignal:v[4]},track);
   if(v[0]===null)assert.equal(sound,null);
   else if(id==='ar-co')assert.ok(CO_NOTES.includes(sound.note));
   else assert.ok(sound.frequency>=PM25_PITCH_RANGE.min&&sound.frequency<=PM25_PITCH_RANGE.max);
  }
 }
});
