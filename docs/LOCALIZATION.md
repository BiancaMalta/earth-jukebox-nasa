# English and Brazilian Portuguese

The **EN / PT-BR** buttons in the bottom-right corner change the interface language immediately. English is the initial default. The visitor's choice is saved locally under `earth-jukebox-language` and restored on the next visit. No account, new dependency or translation service is required.

The switch covers record names and instruments, geographic display names, suggestions, playback and metronome controls, frame readings, tables, instructions, sound examples, methods, errors and accessibility labels. It does not reload the player, reset the selected place or frame, change playback speed, or change instrument mappings or volumes. Active spoken labels and sound examples are cancelled when switching languages to avoid leaving an example labelled in the previous language.

## Accessibility and speech

The page's `lang` changes between `en` and `pt-BR`. Both buttons retain their native language names, expose their selection with `aria-pressed`, work from the keyboard and have 44px touch targets. Skip links remain first in the keyboard order.

Spoken navigation and narrated sound examples select an exact language match first, then a voice from the same language family. Portuguese never falls back to an English voice. If a compatible voice is unavailable, the interface explains this in the selected language; music, controls and text remain usable. Voice installation and actual audible output still depend on the browser and operating system. Examples keep the existing rule: optional labels finish before demonstration audio starts.

Live announcements and introduction headings use `setLocalizedText()` so they are translated before an immediate announcement or focus change. Ordinary rendered text and accessible descriptions are translated by the presentation observer before the next paint.

## Implementation and maintenance

- `public/src/i18n/index.js` handles selection, persistence, presentation updates and translated speech strings.
- `public/src/i18n/en.json` lists the English source phrases; `pt.json` supplies the corresponding translations. Both include `messages` and `templates`.
- Complete phrases are matched after normalizing whitespace. Templates match entire phrases and retain named placeholders. More specific templates take priority; date placeholders restrict days, years and clock times so one date component cannot consume the rest of a reading.
- The observer retains the original English text and attributes, including updates made after initialization. This makes switching back reversible without changing application state. Scripts, styles, original NASA images and elements marked `data-i18n-ignore` are excluded.
- Unknown phrases remain readable in their source language. Add new UI copy to both catalogues, including temporary states and error messages. Keep the same placeholder names in both languages. Sentence fragments joined by the existing renderer need their punctuation-free entries as well.
- Dataset IDs, country lookup keys, option values, timestamps, numerical values, precision and sound mappings remain unchanged. Country lookup uses geographic feature properties rather than translated option text. Dates are presented in Portuguese order while preserving the supplied clock time and time zone, including the warning when no zone is supplied. Text embedded in NASA raster images and attribution names remains original.
- If the Portuguese catalogue cannot load, the player starts in English and disables the unavailable PT-BR button with a retry description. Reloading after recovery enables it again.

## Validation

Run the unit regressions without adding dependencies:

```bash
for test_file in public/src/tests/*.test.mjs; do node "$test_file" || exit; done
```

With the static server running and a Firefox WebDriver BiDi endpoint available:

```bash
node pipeline/test_i18n_browser.mjs --webdriver ws://127.0.0.1:9339/session --site http://127.0.0.1:8000/
node pipeline/test_mobile_layout_browser.mjs --webdriver ws://127.0.0.1:9339/session --site http://127.0.0.1:8000/
```

The language browser checks cover reversible dynamic labels, geographic data loading, suggestions, combined layers, introduction focus, playback continuity, saved preference, catalogue recovery and responsive layouts. Speech doubles verify language and content selection; they do not establish audible output or replace testing with a native screen reader and installed system voices.
