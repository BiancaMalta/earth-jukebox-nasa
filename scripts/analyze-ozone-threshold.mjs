import { readFile, writeFile } from 'node:fs/promises';
const data = JSON.parse(await readFile(new URL('../public/data/clima-ozonio/regions.json', import.meta.url)));
const evaluate = (rows, enter, exit) => {
  let active = false, valid = 0, missing = 0, highlighted = 0, transitions = 0;
  for (const [value] of rows) {
    if (value === null) { missing++; active = false; continue; }
    const was = active;
    active = active ? value > exit : value >= enter;
    valid++; highlighted += Number(active); transitions += Number(was !== active);
  }
  return { valid, missing, highlighted, highlightedFraction: valid ? highlighted / valid : null, transitions };
};
const values = Object.values(data.regions).flatMap(region => region.values.filter(row => row[0] !== null).map(row => row[0])).sort((a,b) => a-b);
const candidates = [[40,38],[42,40],[44,42],[45,43],[46,44],[48,46]].map(([enter, exit]) => {
  const regions = Object.values(data.regions).map(region => evaluate(region.values, enter, exit));
  const valid = regions.reduce((sum,r) => sum + r.valid, 0);
  return { enter, exit, valid, highlightedFraction: regions.reduce((sum,r) => sum + r.highlighted, 0) / valid, regionsWithBothStates: regions.filter(r => r.highlighted > 0 && r.highlighted < r.valid).length };
});
const report = {
  source: 'public/data/clima-ozonio/regions.json',
  interpretation: 'Each valid region-frame has equal weight. Countries and regions overlap. Fractions are not geographic area, time coverage of Earth, health limits, or proof of daily cycles.',
  regionalValueCount: values.length,
  quantiles: Object.fromEntries([.1,.25,.5,.75,.9].map(q => [q, values[Math.floor((values.length - 1) * q)]])),
  candidates, selected: { enter: 42, exit: 40 },
  regions: Object.fromEntries(Object.entries(data.regions).map(([key,region]) => [key, evaluate(region.values,42,40)])),
  world: evaluate(data.frames.map(frame => [frame.mean]),42,40),
};
await writeFile(new URL('../docs/ozone-threshold-analysis.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({quantiles:report.quantiles,candidates,world:report.world},null,2));
