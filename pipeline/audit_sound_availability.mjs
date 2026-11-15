// AI-assisted: OpenAI Codex
// Audit published data with the actual frontend validators and sound mapping.
// No production writes, reference downloads or simulated browser audio.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {validateFeatures} from '../public/src/data/features.js';
import {regionalFrame,validateRegionalFeatures} from '../public/src/data/regions.js';
import {mapFrameSound,soundKind} from '../public/src/engine/mapping.js';
import {combinedFrames,indexTimeline} from '../public/src/data/combined.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argument=process.argv.indexOf('--output-dir');
if(argument<0||!process.argv[argument+1])throw Error('Usage: node pipeline/audit_sound_availability.mjs --output-dir /tmp/sound-audit');
const output=path.resolve(process.argv[argument+1]);fs.mkdirSync(output,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const result={head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'All published frames/regions; actual JS data mapping. Runtime failures and auditory perception require separate browser checks.',tracks:[],combined:null,input_sha256:{}};
const ids=read('public/tracks/index.json').tracks,datasets=[],csv=[];
function runs(indices){
 const out=[];for(const i of indices){if(out.length&&out.at(-1)[1]===i-1)out.at(-1)[1]=i;else out.push([i,i]);}return out;
}
function inspect(frames,track,key,values){
 const reasons={},missing=[],coverages=[],low=[],notes={};let zeroSilence=0;
 frames.forEach((full,i)=>{
  const frame=values?regionalFrame(full,values[i]):full,sound=mapFrameSound(frame,track);
  if(Number.isFinite(frame.coverage))coverages.push(frame.coverage);
  if(!sound){
   missing.push(i+1);
   const reason=frame.coverage===0?'no_accepted_pixels':track.sonification?.input==='visualSignal'&&frame.visualSignal===null?'missing_visual_index':!soundKind(track)?'unsupported_identity_or_unit':frame.norm===null&&['ozone','carbonMonoxide','temperature'].includes(soundKind(track))?'missing_normalized_mean':'missing_or_invalid_mapping_input';
   reasons[reason]=(reasons[reason]??0)+1;
  }else{
   if(frame.coverage>0&&frame.coverage<.01)low.push(i+1);
   if(sound.kind==='precipitation'&&sound.rate===0)zeroSilence++;
   if(sound.note)notes[sound.note]=(notes[sound.note]??0)+1;
  }
 });
 const ranges=runs(missing);
 const row={region:key,frames:frames.length,unavailable:missing.length,available:frames.length-missing.length,
  reason_counts:reasons,missing_frame_ranges_1based:ranges,longest_unavailable_run:ranges.length?Math.max(...ranges.map(([a,b])=>b-a+1)):0,
  coverage_min:coverages.length?Math.min(...coverages):null,coverage_max:coverages.length?Math.max(...coverages):null,
  coverage_mean:coverages.length?coverages.reduce((a,b)=>a+b,0)/coverages.length:null,
  available_but_pixel_coverage_below_1pct:low.length,zero_precipitation_silent:zeroSilence,note_counts:notes};
 csv.push({track:track.id,region:key,frames:row.frames,unavailable:row.unavailable,available:row.available,
  longest_unavailable_run:row.longest_unavailable_run,coverage_min:row.coverage_min,coverage_max:row.coverage_max,
  coverage_mean:row.coverage_mean,available_but_pixel_coverage_below_1pct:low.length,
  missing_frame_ranges_1based:ranges.map(([a,b])=>a===b?String(a):`${a}-${b}`).join(';')});
 return row;
}
for(const id of ids){
 const dir=`public/data/${id}`,track=read(`public/tracks/${id}.json`),source=validateFeatures(read(`${dir}/features.json`),id,track.unit);
 const active={...track,unit:source.unit,sonification:source.sonification,statistics:source.statistics};
 const regional=validateRegionalFeatures(read(`${dir}/regions.json`),active,source);
 const report={track:id,unit:source.unit,schemaVersion:regional.schemaVersion,statistics:source.statistics,
  pixelFilter:read(`${dir}/colorbar.json`).pixelFilter??null,global:inspect(source.frames,active,'global'),regions:[],missing_image_files:[]};
 for(const [key,region] of Object.entries(regional.regions))report.regions.push(inspect(source.frames,active,key,region.values));
 for(const frame of source.frames)if(!fs.existsSync(path.join(root,dir,'frames',frame.file)))report.missing_image_files.push(frame.file);
 for(const name of ['features.json','regions.json','colorbar.json'])result.input_sha256[`${dir}/${name}`]=sha(`${dir}/${name}`);
 report.totals={};for(const kind of ['country','continent']){
  const rows=report.regions.filter(r=>r.region.startsWith(`${kind}:`));
  report.totals[kind]={regions:rows.length,region_frames:rows.reduce((a,r)=>a+r.frames,0),unavailable:rows.reduce((a,r)=>a+r.unavailable,0),
   affected_regions:rows.filter(r=>r.unavailable>0).length,always_unavailable:rows.filter(r=>r.unavailable===r.frames).map(r=>r.region),
   available_but_pixel_coverage_below_1pct:rows.reduce((a,r)=>a+r.available_but_pixel_coverage_below_1pct,0)};
 }
 result.tracks.push(report);datasets.push({track:active,timeline:indexTimeline(source.frames),regional});
 console.log(id,JSON.stringify(report.totals));
}
let missingDates=0,missingRegions=0,unavailable=0;const dates=[...datasets[0].timeline.keys()];
for(const date of dates)for(const key of Object.keys(datasets[0].regional.regions)){
 for(const entry of combinedFrames(datasets,date,key)){
  if(!datasets.find(d=>d.track.id===entry.track.id).timeline.has(date))missingDates++;
  if(!datasets.find(d=>d.track.id===entry.track.id).regional.regions[key])missingRegions++;
  if(!mapFrameSound(entry.frame,entry.track))unavailable++;
 }
}
result.combined={reference_timestamps:dates.length,missing_timestamp_matches:missingDates,missing_region_keys:missingRegions,unavailable_aligned_region_layer_frames:unavailable};
for(const p of ['public/src/engine/mapping.js','public/src/data/features.js','public/src/data/regions.js','public/src/data/combined.js'])result.input_sha256[p]=sha(p);
fs.writeFileSync(path.join(output,'disponibilidade-sons.json'),JSON.stringify(result,null,2)+'\n');
const headers=Object.keys(csv[0]);const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(output,'disponibilidade-sons.csv'),[headers.map(quote).join(','),...csv.map(row=>headers.map(k=>quote(row[k])).join(','))].join('\n')+'\n');
