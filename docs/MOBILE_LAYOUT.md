# Mobile jukebox layout

Implemented on `feat/mobile-jukebox`. `mobile.css` is loaded only at viewport
widths up to 800 CSS pixels; its rules are also enclosed in matching media
queries. Desktop uses the existing styles.

## Layout

- A compact cabinet frame gives the map more of the available width.
- All seven native record radios remain in one horizontally scrollable shelf.
  Swipe guidance is visible on mobile. Focus scrolls the shelf horizontally
  when necessary without explicitly scrolling the document vertically.
- Whole map, Region and Country stay in a compact three-choice row; the full
  place menus and contextual suggestions remain available below it.
- Visible buttons, selectors and disclosure summaries have at least 44px
  height. Selectors use at least 16px type to avoid small form text.
- Play is sticky within the player on screens at least 600px high. It remains
  in normal flow in short landscape viewports. The DOM and Tab order are
  unchanged. Scroll padding reserves space for the sticky controls.
- Combined maps use a single column below 600px and two columns on small
  tablets. A muted map and its native switch remain together.
- Frame readings stack, while the detailed values table scrolls within its
  own region. Headings wrap when text is enlarged. No page-wide overflow
  hiding is used to conceal layout defects.
- Safe-area insets are respected. Existing reduced-motion and forced-color
  behavior is retained. Audio mappings and dataset handling are unchanged.

## Verification

Run with a local static server and a dedicated Firefox WebDriver BiDi session:

```sh
python3 -m http.server 8000 --directory public
# Separate terminal; create the profile directory first.
mkdir -p /tmp/jukebox-mobile-profile
firefox --headless --no-remote --profile /tmp/jukebox-mobile-profile --remote-debugging-port 9339
node pipeline/test_mobile_layout_browser.mjs
```

43 browser checks passed at widths 320, 390, 430, 768, 800 and 1440, with an
additional 740×390 landscape check. They cover page overflow, touch target
height, selector font size, all seven records, keyboard focus and native arrow
selection, combined-map switches, 200% root text at 320px, and the desktop
stylesheet media condition. Expanded tuning, place and methods controls were
included. Separate before/after measurements at 1440px matched the geometry
of the header, cabinet, player, record collection, transport, map and sidebar
in single and combined modes.

The checks use resized Firefox viewports; they do not constitute a physical
iOS/Android device test, a screen-reader session or an auditory evaluation.
No deployment to the previous Sites host was performed.
