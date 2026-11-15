// AI-assisted: OpenAI Codex
import test from 'node:test';
import assert from 'node:assert/strict';
import {describePixelCoverage, describePixelFilters, describeReading} from '../ui/readings.js';
import {regionDisplayName} from '../ui/regions.js';
import {readFile} from 'node:fs/promises';

test('pixel inclusion distinguishes missing, zero, small positive ratios and near-total inclusion',()=>{
 assert.equal(describePixelCoverage(.866),'86.6% of analyzed image pixels used');
 assert.match(describePixelCoverage(.0001),/^<0.1%/);
 assert.match(describePixelCoverage(.99999),/^>99.9%/);
 assert.match(describePixelCoverage(0),/^0.0%/);assert.match(describePixelCoverage(1),/^100.0%/);
 for(const value of [null,undefined,NaN,-1,2,'0'])assert.equal(describePixelCoverage(value),'Pixel inclusion unavailable');
});

test('filter explanation distinguishes unfiltered temperature from configured color thresholds',()=>{
 assert.match(describePixelFilters({unit:'°C'}),/No color acceptance filter/);
 const text=describePixelFilters({unit:'m/s',pixelFilter:{minSaturation:40,maxColorDistance:30,maxValue:34.5}});
 assert.match(text,/RGB distance is at most 30/);assert.match(text,/at least 40/);assert.match(text,/34.5 m\/s/);assert.match(text,/not confidence probabilities/);
 assert.match(describePixelFilters(null),/unavailable/);
});

test('temperature regional inclusion is visible and mean, norm and coverage retain separate meanings',()=>{
 const frame={mean:12.345,norm:.654,coverage:.866,date:'2026-10-30T06:00'};
 const reading=describeReading(frame,{id:'clima-temperatura',unit:'°C'});
 assert.equal(reading.coverageDetail,'86.6% of analyzed image pixels used');
 assert.equal(reading.normalized,'0.654 / 1.000');assert.equal(reading.mean,'12.3 °C');
 assert.equal(describeReading({...frame,coverage:0},{id:'clima-temperatura',unit:'°C'}).mean,'Unavailable');
});

test('oceanic territory labels do not imply an ocean average and leave other region names intact',()=>{
 assert.equal(regionDisplayName('continent:Seven seas (open ocean)'),'Oceanic island territories');
 assert.equal(regionDisplayName('continent:South America'),'South America');
 assert.equal(regionDisplayName('country:Brazil'),'Brazil');
});


test('short place names retain boundary explanations beside the selector',async()=>{
 assert.equal(regionDisplayName('continent:Europe'),'Europe');
 assert.equal(regionDisplayName('continent:Asia'),'Asia');
 assert.equal(regionDisplayName('continent:North America'),'North America');
 const source=await readFile(new URL('../ui/player.js',import.meta.url),'utf8');
 assert.match(source,/Europe includes all of Russia; Asia excludes Russia/);
 assert.match(source,/Oceanic island territories cover land only/);
});
