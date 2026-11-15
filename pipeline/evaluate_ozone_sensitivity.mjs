// AI-assisted: OpenAI Codex
// Compare musical sensitivity on unchanged published ozone data; no data writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mapOzone,OZONE_NOTES} from '../public/src/engine/mapping.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argument=process.argv.indexOf('--output');
if(argument<0||!process.argv[argument+1])throw Error('Usage: node pipeline/evaluate_ozone_sensitivity.mjs --output /tmp/ozone-sensitivity.json');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,`public/data/clima-ozonio/${name}.json`),'utf8'));
const data=read('features'),regional=read('regions');
const oldNotes=['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5','C6'];
const oldMap=norm=>typeof norm==='number'&&Number.isFinite(norm)&&norm>=0&&norm<=1?oldNotes[Math.round(norm*10)]:null;
function inspect(name,frames){
 const summarize=map=>{
  const notes=frames.map(f=>f.coverage===0?null:map(f.norm));
  let changes=0,pairs=0,reversed=0;
  for(let i=1;i<notes.length;i++){
   if(notes[i-1]===null||notes[i]===null)continue;
   pairs++;
   if(notes[i]!==notes[i-1]){
    changes++;
    const scale=map===oldMap?oldNotes:OZONE_NOTES;
    if((scale.indexOf(notes[i])-scale.indexOf(notes[i-1]))*(frames[i].mean-frames[i-1].mean)<0)reversed++;
   }
  }
  return {distinctNotes:[...new Set(notes.filter(Boolean))],changes,comparableTransitions:pairs,reversedChanges:reversed,missing:notes.filter(n=>n===null).length};
 };
 const present=frames.map(f=>f.mean).filter(Number.isFinite);
 return {region:name,minMean:present.length?Math.min(...present):null,maxMean:present.length?Math.max(...present):null,before:summarize(oldMap),after:summarize(mapOzone)};
}
const result={scope:'Musical parameter sensitivity only; no increased physical measurement accuracy or listener study',
  anchors:[[5,0],[30,4],[50,24],[60,28]],notes:OZONE_NOTES,
  rows:[inspect('global',data.frames),...Object.entries(regional.regions).map(([name,r])=>inspect(name,r.values.map(v=>({mean:v[0],norm:v[2],coverage:v[3]}))))]};
const destination=path.resolve(process.argv[argument+1]);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n');
for(const row of result.rows.filter(r=>r.region==='global'||r.region.startsWith('continent:')))console.log(JSON.stringify(row));
