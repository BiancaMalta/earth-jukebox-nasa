// AI-assisted: OpenAI Codex
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTranslator, getLocale, t as currentText} from '../i18n/index.js';
import {describeDate} from '../data/features.js';
import {describeReading, describePixelFilters} from '../ui/readings.js';
import {describeExperience} from '../ui/experience.js';
import {createSpeechEngine} from '../engine/speech.js';
const pt = JSON.parse(await readFile(new URL('../i18n/pt.json', import.meta.url)));
const en = JSON.parse(await readFile(new URL('../i18n/en.json', import.meta.url)));
const t = createTranslator(pt);

test('English remains the default; translation preserves units, IDs and unrecognised text', () => {
  assert.equal(getLocale(), 'en');
  assert.equal(currentText('Play'), 'Play');
  assert.equal(t('  Play\n'), '  Tocar\n');
  for (const value of ['2026-10-30T06:00', 'clima-chuva', 'µg/m³', 'C5', '0.1276 / 1', 'NASA GEOS-CF']) assert.equal(t(value), value);
  assert.equal(t('Temperature, Organ'), 'Temperatura, Órgão');
  assert.equal(t('Selected: South America'), 'Selecionado: América do Sul');
});

test('date presentation uses Portuguese order without changing the timestamp or its time zone', () => {
  assert.equal(t(describeDate('2026-10-30T06:00')), '30 de outubro de 2026 às 06:00 (fuso horário não informado)');
  assert.equal(t(describeDate('2026-10-30T02:00:00-05:00')), '30 de outubro de 2026 às 02:00:00 (UTC-05:00)');
  assert.equal(t(describeDate('2026-02-04T23:30Z')), '4 de fevereiro de 2026 às 23:30 (UTC)');
  assert.equal(t('October 30, 2026'), '30 de outubro de 2026');
  assert.equal(t('06:00 (time zone not specified)'), '06:00 (fuso horário não informado)');
});

test('composed regional timeline labels translate each part without swallowing date or coverage', () => {
  assert.equal(t('Brazil; frame 2 of 40; October 30, 2026 at 06:00 (time zone not specified); mean 12.5 °C; 95.0% valid pixel coverage'),
    'Brasil; quadro 2 de 40; 30 de outubro de 2026 às 06:00 (fuso horário não informado); média 12.5 °C; 95.0% de cobertura de pixels válidos');
  assert.equal(t('Brazil: this record has no regional value for this frame. Its instrument is silent; other combined layers or the time pulse may still sound.'),
    'Brasil: este disco não tem valor regional neste quadro. Seu instrumento está silencioso; outras camadas combinadas ou o metrônomo ainda podem tocar.');
  assert.equal(t('Loading Python-calculated values for North America…'), 'Carregando valores calculados em Python para América do Norte…');
});

test('all sound descriptions, including visual indices and legacy mappings, have complete translations', () => {
  const tracks = [
    {id:'clima-temperatura',unit:'°C'}, {id:'clima-vento',unit:'m/s'}, {id:'clima-chuva',unit:'mm'}, {id:'clima-umidade',unit:'g/kg'},
    {id:'ar-pm25',unit:'µg/m³'}, {id:'ar-co',unit:'ppbv'}, {id:'clima-ozonio',unit:'ppbv'}, {id:'unknown',title:{en:'Visual-only experience'}},
    {id:'clima-vento',unit:'m/s',sonification:{input:'visualSignal'}}, {id:'ar-pm25',unit:'µg/m³',sonification:{input:'visualSignal'}},
  ];
  for (const track of tracks) for (const [key, value] of Object.entries(describeExperience(track))) {
    if (key === 'kind' || typeof value !== 'string') continue;
    assert.ok(Object.hasOwn(pt.messages, value), `${track.id}: ${key}: ${value}`);
  }
});

test('narrated readings and strict pixel filters retain their scientific meaning in Portuguese', () => {
  const reading = describeReading({date:'2026-10-30T06:00', mean:12.3, norm:.5, coverage:.866}, {id:'clima-temperatura',unit:'°C'});
  const translated = t(reading.summary);
  assert.match(translated, /30 de outubro de 2026 às 06:00/);
  assert.match(translated, /Temperatura média: 12.3 graus Celsius/);
  assert.match(translated, /86.6% dos pixels analisados usados/);
  assert.match(translated, /Nota correspondente:/);
  const filter = t(describePixelFilters({unit:'m/s',pixelFilter:{minSaturation:40,maxColorDistance:30,maxValue:34.5}}));
  assert.match(filter, /distância RGB é de no máximo 30/);
  assert.match(filter, /saturação é de no mínimo 40/);
  assert.match(filter, /valores decodificados também devem ser de no máximo 34.5 m\/s/);
  assert.match(filter, /não probabilidades de confiança/);
});

test('catalogues have the same keys and placeholders, with no missing interpolation values', () => {
  for (const kind of ['messages','templates']) {
    assert.deepEqual(Object.keys(en[kind]).sort(), Object.keys(pt[kind]).sort());
    for (const [source,target] of Object.entries(pt[kind])) {
      assert.ok(target.trim(), source);
      assert.deepEqual((target.match(/\{\w+\}/g)??[]).sort(), (source.match(/\{\w+\}/g)??[]).sort(), source);
    }
  }
  const custom = createTranslator({templates:{'Value (estimated): {value}.':'Valor (estimado): {value}.'}});
  assert.equal(custom('Value (estimated): <tag>$1</tag>.'), 'Valor (estimado): <tag>$1</tag>.');
});

test('sound example voice follows the page language and never substitutes an English voice for Portuguese', () => {
  const spoken = [];
  const english = {name:'English',lang:'en-US'}, portuguese = {name:'Brasil',lang:'pt-BR'};
  let voices = [english];
  const scope = {
    document:{documentElement:{lang:'pt-BR'}},
    SpeechSynthesisUtterance:class {constructor(text){this.text=text;}},
    speechSynthesis:{getVoices:()=>voices,resume(){},cancel(){},speak(u){spoken.push(u);u.onstart();}},
  };
  const speech = createSpeechEngine(scope);
  assert.equal(speech.speak('Example',true),false);
  voices = [{name:'Portugal',lang:'pt-PT'}, english, portuguese];
  assert.equal(speech.speak('Exemplo',true),true);
  assert.equal(spoken[0].lang,'pt-BR');
  speech.cancel();
  scope.document.documentElement.lang = 'en';
  assert.equal(speech.speak('Example',true),true);
  assert.equal(spoken[1].voice,english);
  speech.dispose();
});

test('every geographic name has a display translation without changing raw lookup keys', async () => {
  const geo = JSON.parse(await readFile(new URL('../../data/world-countries.geojson', import.meta.url)));
  const names = geo.features.map(feature => feature.properties.NAME_EN || feature.properties.ADMIN || feature.properties.NAME);
  for (const name of names) assert.ok(Object.hasOwn(pt.messages, name), name);
  assert.equal(t('Brazil'), 'Brasil');
  assert.equal(t('North America'), 'América do Norte');
});
