# Original task plan and final status

The tables below preserve attack plan v4; they were not maintained as an execution board, and their rows do not mean every task was completed. The audit below compares the plan with the scope in the repository. Steps that depended on external systems are not considered complete without local evidence. See [CONTRIBUTING.md](../CONTRIBUTING.md) for the contribution workflow.

## Scope audit in the repository (2026-11-15)

| Status | What the repository shows |
|---|---|
| Implemented | Seven tracks, SVS 5147–5153, in the player index; playback and synchronized mixing; regional selection; keyboard controls; accessibility features; and browser-based sound synthesis. See the [data inventory](DATA_INVENTORY.md), [mappings](MAPPINGS.md), and [test record](TESTS.md). |
| Implemented | Pixel-processing pipeline and image-derived summaries, scientific comparisons of variables, and the qualitative PM2.5 follow-up. Methods, evidence, and limitations are in [PROJECT_ARTICLE.md](PROJECT_ARTICLE.md) and the scientific studies linked there. |
| Implemented, with a traceability task remaining | Project documentation, pitch, data sources, libraries, and AI use are described. The repository still needs a review to ensure every AI-generated code file has the comments required by `CONTRIBUTING.md`; the README now links to the credits without claiming every file is marked. |
| Planned but not integrated | Lightning (5011), fires (5113), ice (5046), and night lights (5313): only extracted frames remain, with no playable track. `quando-voce-nasceu` and `terra-respirando` are empty folders. |
| Not completed according to the available record | Tests with blind or low-vision participants and eyes-closed comprehension tests. No results are recorded; do not claim user validation. |
| Not completed in the repository | Demo video, confirmation that the challenge form was submitted, confirmation of submission for judging, anonymous-window and alternate-network link checks, and signed final checklist. The repository cannot verify these external steps. |
| Replaced by a different solution | The plan specified GitHub Pages; the README links to the site deployed on Netlify. It also specified CC0 sound files/samples and three recorded audio guides; the current version synthesizes sounds with Tone.js and contains no audio files. |
| Outside the final scope | “Earth Today” via GIBS, the “When you were born” track, the “Earth breathing” track, and the original four-voice/sound-family concepts are not listed as implemented features. |

Therefore, do not read the original plan as “all tasks completed.” Use the status documents above for a current technical review. Keep submission tasks pending until the team confirms that they were completed outside GitHub.

## Role ownership

| Role | Folders |
|---|---|
| Data | `pipeline/`, `public/data/` |
| Front end | `public/index.html`, `public/src/ui/`, `public/src/engine/`, `public/src/main.js` |
| Sound | `public/src/engine/`, `public/src/ui/experience.js`, `docs/MAPPINGS.md` |
| Narrative | `README.md`, `CREDITS.md`, `docs/TESTS.md`, `docs/PITCH.md`, `docs/PROJECT_ARTICLE.md` |

> For a two-person team: Person A = Data + Front end; Person B = Sound + Narrative. Scope: tracks 1, 3, and 5.

## Phase 0 — Preparation (Sat 08:30–09:00)

| # | Time | Task | Role | Done when… | Files |
|---|---|---|---|---|---|
| 0.1 | Sat 08:30 | Confirm everyone is registered for the same event and team | Everyone | Everyone appears on the team page | |
| 0.2 | Sat 08:30 | Read the Project Submission Guide and Judging & Awards Guide | Narrative | Rules noted in the team chat | |
| 0.4 | Sat 08:35 | Create a shared Drive folder for frames, audio, and video | Data | Link shared with the team | |
| 0.5 | Sat 08:40 | Install Python 3.11+, FFmpeg, Node 20, Git, and a screen reader | Everyone | Python, FFmpeg, and Node respond | |
| 0.6 | Sat 08:45 | Claim Global Offers (Miro; GoDaddy optional) | Narrative | Miro board created | |
| 0.7 | Sat 08:50 | Recruit 1–2 blind/low-vision testers and 8–10 eyes-closed volunteers | Narrative | Invitations sent | |

## Phase 1 — Kickoff and decisions (Sat 09:00–09:45)

| # | Time | Task | Role | Done when… | Files |
|---|---|---|---|---|---|
| 1.1 | Sat 09:00 | Read the summary and sound principles together (sections 1, 6.1, 6.2) | Everyone | Everyone understands the thesis | |
| 1.2 | Sat 09:10 | Complete the Data Sonification Canvas in Miro | Everyone | Canvas completed | |
| 1.3 | Sat 09:20 | Choose the final tracks (at least 3) | Everyone | Track list finalized | `DECISIONS.md` |
| 1.4 | Sat 09:30 | Finalize the variable → sound → rationale table | Sound | Team approves the table | `docs/MAPPINGS.md` |
| 1.5 | Sat 09:35 | Record decisions in `DECISIONS.md` and create initial presets in `public/tracks/` | Front end | Files committed | `DECISIONS.md`, `public/tracks/*.json` |
| 1.6 | Sat 09:40 | Confirm roles, channels, and checkpoints in the schedule | Everyone | Schedule created | |

## Phase 2 — Data and scaffold (Sat 09:45–12:30)

| # | Time | Task | Role | Done when… | Files |
|---|---|---|---|---|---|
| 2.1 | Sat 09:45 | Use `download.py` to get frames/MP4s for 5147, 5148, 5149, 5150, 5011, 5313, 5046, and 5113; copy them to Drive | Data | Files backed up in Drive | `pipeline/download.py` |
| 2.2 | Sat 10:15 | Use `extract_frames.py` to resize to 1024 px and convert to WebP, 2–4 frames/s | Data | Frames ready in `public/data/<track>/frames` | `pipeline/extract_frames.py`, `public/data/**` |
| 2.3 | Sat 10:45 | `calibrate_colorbar.py`: calibrate temperature (5147) → `colorbar.json` | Data | Error within 3 test pixels | `pipeline/calibrate_colorbar.py` |
| 2.4 | Sat 11:15 | Create masks to exclude text, logos, and dates | Data | `mask.png` for each track | `public/data/*/mask.png` |
| 2.5 | Sat 11:30 | `features.py`: mean, p90, area above threshold, frame difference, 64×32 grid | Data | Temperature `features.json` created | `pipeline/features.py` |
| 2.6 | Sat 09:45 | App scaffold: load frames; player with play, pause, and timeline | Front end | Frames display | `public/index.html`, `public/src/ui/player.js` |
| 2.7 | Sat 10:30 | Sound activation button with `Tone.start()`; master volume limiter | Front end | Sound starts after a click; volume is limited | `public/src/engine/audio.js` |
| 2.8 | Sat 11:00 | Separate `mapping.js` (data → sound) from `mood.js` (emotion) | Front end + Sound | Two independent modules | `public/src/engine/mapping.js`, `mood.js` |
| 2.9 | Sat 09:45 | Choose scales and timbres by family (geophony, biophony, anthropophony); prepare natural sounds | Sound | Sound library ready | `public/sounds/**`, `presets.js` |
| 2.10 | Sat 11:00 | Create one sound-guide recording for each family (~10 s each) | Sound | Three short guide recordings | `public/sounds/**` |
| 2.11 | Sat 09:45 | Start `CREDITS.md` with an ID, title, and link for every visualization | Narrative | Initial list | `CREDITS.md` |
| 2.12 | Sat 10:30 | Draft the High-Level Summary in English | Narrative | One paragraph | `docs/PITCH.md` |
| 2.13 | Sat 11:30 | Confirm dates and times with testers | Narrative | Times scheduled | |
| 2.14 | Sat 12:30 | CHECKPOINT 1: temperature track plays end-to-end (frame → value → note) | Everyone | Internal demo works | |

## Phase 3 — MVP (Sat 13:30–18:00)

| # | Time | Task | Role | Done when… | Files |
|---|---|---|---|---|---|
| 3.1 | Sat 13:30 | Complete track 1: four distinct voices, ~300 ms staggered entrances, mute/isolate controls | Front end + Sound | Audible, separable quartet | `public/src/engine/*`, `public/tracks/clima-*.json` |
| 3.2 | Sat 14:30 | Spoken time markers (pt-BR and en-US) and sound guide before playback | Front end | Dates announced during playback | `public/src/engine/speech.js`, `ui/legend.js` |
| 3.3 | Sat 15:00 | Tactile explorer: grid → value; speak region and value; arrow keys | Front end | Works with mouse, touch, and keyboard | `public/src/ui/explorer.js` |
| 3.4 | Sat 16:00 | Basic accessibility: ARIA labels/live regions, visible focus, 44 px targets | Front end + Narrative | Navigable with a screen reader | `public/src/ui/a11y.js`, `styles.css` |
| 3.5 | Sat 13:30 | Track 5: detect patches in 5011 (lightning) and 5113 (fire) → events | Data | Event `features.json` | `pipeline/features.py`, `public/data/fogo-raios/` |
| 3.6 | Sat 15:30 | Track 3: measure white ice area in 5046 per frame | Data | Ice `features.json` | `public/data/gelo/` |
| 3.7 | Sat 11:00+ | If using a live mode, ask the forum about GIBS usage | Narrative | Question posted | |
| 3.8 | Sat 17:00 | Publish to GitHub Pages; test on Android and iPhone | Front end | Public link opens and plays | `.github/workflows/pages.yml` |
| 3.9 | Sat 18:00 | CHECKPOINT 2: end-to-end MVP published | Everyone | Link works for everyone | |

## Phase 4 — Saturday evening (19:00–23:00)

| # | Time | Task | Role | Done when… | Files |
|---|---|---|---|---|---|
| 4.1 | Sat 19:00 | Quick test with 2–3 eyes-closed participants | Narrative | Adjustment list | `docs/TESTS.md` |
| 4.2 | Sat 19:30 | Add track 5 to the app: each event → beat synchronized to its frame | Front end + Sound | Lightning and fire play at the correct frame | `public/tracks/fogo-raios.json` |
| 4.3 | Sat 20:30 | Add track 3 to the app: ice area → chimes and pad volume | Front end + Sound | Ice loss is audible | `public/tracks/gelo.json` |
| 4.4 | Sat 21:30 | Apply changes from test 4.1 | Front end + Sound | Changes applied | |
| 4.5 | Sat 22:00 | Optional: night-lights track (5313) with two timbres | Front end + Sound | Track plays | `public/tracks/luzes-noturnas.json` |
| 4.6 | Sat 22:00 | Optional: “Earth Today” mode using GIBS | Front end | Image of the day plays | |
| 4.7 | Sat 22:45 | Commit, push, back up to Drive, and republish | Front end | Stable version published | |

## Phase 5 — Sunday morning (09:00–13:00)

| # | Time | Task | Role | Done when… | Files |
|---|---|---|---|---|---|
| 5.1 | Sun 09:00 | Track 2 (“When you were born”): frames, validation against GISTEMP, year input | Data + Front end | Validation error documented | `public/data/quando-voce-nasceu/` |
| 5.2 | Sun 09:00 | Test with a blind participant (20–30 min); record 3 issues and 3 changes; obtain consent | Narrative | Notes and consent recorded | `docs/TESTS.md` |
| 5.3 | Sun 10:00 | Eyes-closed test with 8–10 people; calculate correct answers | Narrative | X of Y participants calculated | `docs/TESTS.md` |
| 5.4 | Sun 10:30 | Optional: track 4 (NDVI + CO₂, Shepard tone); optional POWER and EONET | Front end + Sound | Track plays | `public/tracks/terra-respirando.json` |
| 5.5 | Sun 11:30 | Apply changes from tests 5.2 and 5.3 | Everyone | Changes applied | |
| 5.6 | Sun 12:30 | Run the complete accessibility checklist | Narrative | Every item checked | |
| 5.7 | Sun 13:00 | CHECKPOINT 3: freeze features | Everyone | No new features added | |

## Phase 6 — Sunday afternoon (14:00–18:00)

| # | Time | Task | Role | Done when… | Files |
|---|---|---|---|---|---|
| 6.1 | Sun 14:00 | Fix bugs and polish the mix | Front end + Sound | Bug list cleared | |
| 6.2 | Sun 14:00 | English interface and copy (i18n) | Front end | Site works in English | `public/src/i18n/*` |
| 6.3 | Sun 14:30 | Publish a How it works page with mappings, rationales, and test results | Narrative | Page published | `public/how-it-works.html` |
| 6.4 | Sun 15:00 | Complete README and CREDITS.md | Narrative + Front end | Files reviewed | `README.md`, `CREDITS.md` |
| 6.5 | Sun 15:00 | Record and edit a 30-second video with English captions; unlisted on YouTube | Narrative | Video ≤ 30 s published | |
| 6.6 | Sun 17:00 | Disclose AI use: comments, README, and audio metadata | Everyone | All uses marked | |
| 6.7 | Sun 17:30 | Publish final version on Pages | Front end | Stable final link | |

## Phase 7 — Submission (Sun 18:00–21:00)

| # | Time | Task | Role | Done when… | Files |
|---|---|---|---|---|---|
| 7.1 | Sun 18:00 | Complete every field of the form in English and save progress | Narrative | All fields saved | `docs/PITCH.md` |
| 7.2 | Sun 18:45 | NASA Data field: list 5011, 5313, and other sources with IDs and links | Narrative | Complete source list | |
| 7.3 | Sun 19:00 | References field: all sources, libraries, sounds, and articles with licenses | Narrative | Matches `CREDITS.md` | |
| 7.4 | Sun 19:30 | Test every link in a private window and on another network | Everyone | All links open without signing in | |
| 7.5 | Sun 20:00 | Cross-review the final submission | Everyone | Checklist signed | |
| 7.6 | Sun 20:30 | Submit for Judging and save a screenshot | Narrative | Confirmation banner shown | |

## Minimum version originally proposed by the plan (historical reference)

This contingency does not describe the final product: it included a lightning
track and participant-test results, neither of which was integrated or
documented. The implemented scope is summarized in the audit above.

- Track 1 (temperature, even with only 1–2 voices) plus track 5 with ISS lightning (5011)
- Sound guide, spoken time markers, and keyboard navigation
- At least one eyes-closed test result
- README, CREDITS, and How it works page
- 30-second video and form submitted by 21:00
