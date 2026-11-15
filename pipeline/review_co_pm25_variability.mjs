// AI-assisted: OpenAI Codex
// Reproduce the frozen pre-change review; optionally verify the adopted transfers.
// This script only writes the requested report, never production data or mappings.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {mapCarbonMonoxide,mapPm25} from '../public/src/engine/mapping.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outputArg=process.argv.indexOf('--output');
const verifyImplemented=process.argv.includes('--verify-implemented');
let verifiedFrames=0;
if(outputArg<0||!process.argv[outputArg+1])throw Error('Usage: node pipeline/review_co_pm25_variability.mjs --output /tmp/co-pm25-review.json');
const CO_NOTES=['C3','D3','E3','G3','A3','C4','D4','E4','G4','A4','C5'];
const baselineCO=norm=>typeof norm==='number'&&Number.isFinite(norm)&&norm>=0&&norm<=1?CO_NOTES[Math.round(norm*10)]:null;
const natural=['C','D','E','F','G','A','B'];
const coCandidateNotes=Array.from({length:29},(_,i)=>`${natural[i%7]}${2+Math.floor(i/7)}`);
function coCandidate(norm){
 if(typeof norm!=='number'||!Number.isFinite(norm)||norm<0||norm>1)return null;
 const ppbv=40+460*norm;
 const step=ppbv<60?3*(ppbv-40)/20:ppbv<=200?3+21*(ppbv-60)/140:24+4*(ppbv-200)/300;
 return coCandidateNotes[Math.round(step)];
}
function framesFor(track){
 const dir=path.join(root,`public/data/${track}`);
 const data=JSON.parse(fs.readFileSync(path.join(dir,'features.json'),'utf8'));
 const regional=JSON.parse(fs.readFileSync(path.join(dir,'regions.json'),'utf8'));
 return [['global',data.frames],...Object.entries(regional.regions).map(([k,r])=>[k,r.values.map(v=>({mean:v[0],norm:v[2],coverage:v[3],visualSignal:v[4]??null}))])];
}
function median(values){const a=[...values].sort((a,b)=>a-b);return !a.length?null:a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;}
const result={scope:'Candidate musical-parameter review; production mappings unchanged. Cents thresholds are descriptive, not listener-test results.',
 coCandidate:{scale:coCandidateNotes,anchors:[[40,0],[60,3],[200,24],[500,28]],centralPpbvPerStep:140/21},co:[],pm25:[]};
for(const [region,frames] of framesFor('ar-co')){
 if(verifyImplemented)for(const frame of frames){assert.equal(mapCarbonMonoxide(frame.norm),coCandidate(frame.norm),`CO ${region} norm=${frame.norm}`);verifiedFrames++;}
 const stats=(map,notes)=>{
  const values=frames.map(f=>f.coverage===0?null:map(f.norm));let changes=0,pairs=0,reversed=0;
  for(let i=1;i<values.length;i++)if(values[i]!==null&&values[i-1]!==null){pairs++;if(values[i]!==values[i-1]){changes++;if((notes.indexOf(values[i])-notes.indexOf(values[i-1]))*(frames[i].mean-frames[i-1].mean)<0)reversed++;}}
  return {notes:[...new Set(values.filter(Boolean))],changes,comparableTransitions:pairs,reversed,missing:values.filter(v=>v===null).length};
 };
 const means=frames.map(f=>f.mean).filter(Number.isFinite);
 result.co.push({region,minMean:means.length?Math.min(...means):null,maxMean:means.length?Math.max(...means):null,current:stats(baselineCO,CO_NOTES),candidate:stats(coCandidate,coCandidateNotes)});
}
for(const [region,frames] of framesFor('ar-pm25')){
 if(verifyImplemented)for(const frame of frames){
  const mapped=mapPm25(frame.visualSignal);
  if(frame.visualSignal===null)assert.equal(mapped,null);
  else {
   const brightness=Math.min(1,Math.max(0,frame.visualSignal+.3*Math.sin(Math.PI*frame.visualSignal)));
   assert.equal(mapped.brightness,brightness);
   assert.ok(Math.abs(1200*Math.log2(mapped.frequency/130.8127825)-4800*brightness)<1e-9,`PM2.5 ${region}`);
  }
  verifiedFrames++;
 }
 // Keep the historical operation order, including floating-point rounding.
 const cents=frames.map(f=>f.coverage===0||f.visualSignal===null?null:1200*Math.log2((261.625565*Math.pow(4,Math.min(1,Math.max(0,f.visualSignal+.3*Math.sin(Math.PI*f.visualSignal)))))/261.625565));
 const present=cents.filter(Number.isFinite),changes=[];
 for(let i=1;i<cents.length;i++)if(cents[i]!==null&&cents[i-1]!==null)changes.push(Math.abs(cents[i]-cents[i-1]));
 const stats=factor=>({rangeCents:present.length?(Math.max(...present)-Math.min(...present))*factor:null,
  medianTransitionCents:changes.length?median(changes)*factor:null,transitionsAtLeast25Cents:changes.filter(v=>v*factor>=25).length,
  transitionsAtLeast100Cents:changes.filter(v=>v*factor>=100).length,comparableTransitions:changes.length,missing:cents.filter(v=>v===null).length});
 result.pm25.push({region,currentC4C6:stats(1),candidateC3C6:stats(1.5),candidateC3C7:stats(2)});
}
const destination=path.resolve(process.argv[outputArg+1]);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n');
for(const key of ['co','pm25'])for(const row of result[key].filter(r=>r.region==='global'||r.region.startsWith('continent:')))console.log(key,JSON.stringify(row));
if(verifyImplemented)console.log(`Verified implemented curves on ${verifiedFrames} published global/regional frame values.`);
