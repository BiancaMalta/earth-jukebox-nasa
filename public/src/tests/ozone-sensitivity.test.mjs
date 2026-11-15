// AI-assisted: OpenAI Codex
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {OZONE_NOTES,mapOzone,mapFrameSound,mapValue} from '../engine/mapping.js';
const position=ppbv=>(ppbv-5)/55;

test('ozone spans natural C major from C3 to C7 with fixed curve anchors',()=>{
 assert.equal(OZONE_NOTES.length,29);
 assert.ok(OZONE_NOTES.every(note=>/^[CDEFGAB][3-7]$/.test(note)));
 for(const [ppbv,index] of [[5,0],[30,4],[50,24],[60,28]])assert.equal(mapOzone(position(ppbv)),OZONE_NOTES[index]);
 assert.equal(mapOzone(position(40)),'C5');assert.equal(mapOzone(position(41)),'D5');
});

test('each integer ppbv in the central band advances exactly one diatonic step',()=>{
 for(let ppbv=30;ppbv<50;ppbv++){
  const first=OZONE_NOTES.indexOf(mapOzone(position(ppbv)));
  assert.equal(OZONE_NOTES.indexOf(mapOzone(position(ppbv+1))),first+1);
 }
 assert.equal(mapOzone(position(40.49)),'C5');
 assert.equal(mapOzone(position(40.51)),'D5');
});

test('the shared ozone curve cannot reverse ordering or manufacture missing values',()=>{
 let previous=-1;
 for(let i=0;i<=10000;i++){
  const value=i/10000,note=mapOzone(value),index=OZONE_NOTES.indexOf(note);
  assert.ok(index>=previous);assert.equal(note,mapOzone(value));previous=index;
 }
 for(const value of [null,undefined,NaN,Infinity,-.01,1.01,'0.5'])assert.equal(mapOzone(value),null);
 const frame={mean:41,norm:position(41),coverage:.8},track={id:'clima-ozonio',svsId:5152,unit:'ppbv'};
 assert.equal(mapFrameSound(frame,track).note,'D5');
 assert.equal(mapFrameSound({...frame,mean:59},track).note,'D5');
 assert.equal(mapFrameSound({...frame,norm:null},track),null);
 assert.equal(mapFrameSound({...frame,coverage:0},track),null);
 // Temperature retains its original pentatonic transfer.
 assert.equal(mapValue(.5),'C4');
});

test('published North America ozone now changes notes on the fixed scale',async()=>{
 const raw=JSON.parse(await readFile(new URL('../../data/clima-ozonio/regions.json',import.meta.url),'utf8'));
 const values=raw.regions['continent:North America'].values;
 const notes=values.map(v=>mapOzone(v[2]));
 assert.ok(notes.every(note=>OZONE_NOTES.includes(note)));
 assert.ok(new Set(notes).size>=4);
 assert.ok(notes.slice(1).some((note,i)=>note!==notes[i]));
});
