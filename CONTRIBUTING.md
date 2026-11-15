# How to work together without getting in each other's way

## 1. Each role owns its folders

The main rule: **each person edits only the files owned by their role**. Shared files have one owner who handles the merge.

| Role | Label | Folders / files you edit |
|---|---|---|
| **Data** (pipeline) | `area:dados` | `pipeline/**`, `public/data/**` |
| **Front end** (UI and audio) | `area:front` | `public/index.html`, `public/src/ui/**`, `public/src/engine/audio.js`, `public/src/engine/speech.js`, `public/styles.css`, `.github/workflows/**` |
| **Sound** (music) | `area:som` | `public/src/engine/mapping.js`, `public/src/engine/mood.js`, `public/src/engine/presets.js`, `public/sounds/**`, `docs/MAPPINGS.md` |
| **Narrative** (accessibility, copy, pitch) | `area:narr` | `README.md`, `CREDITS.md`, `docs/TESTS.md`, `docs/PITCH.md`, `public/how-it-works.html`, `public/src/i18n/**` |
| **Everyone** | `area:todos` | `DECISIONS.md` (append new rows only) |

Track configuration: **one file per track** in `public/tracks/<id>.json`. The person creating a track owns its file. Add only one line per track to `public/tracks/index.json` to minimize conflicts.

i18n keys are prefixed by role (`ui.*`, `sound.*`, `track.<id>.*`). Each person edits only their own prefix.

## 2. Branch workflow

- `main` should always work and be deployed to GitHub Pages. **Never push directly to `main`.**
- Use one branch per issue: `<area>/<number>-short-description`
  - Examples: `dados/12-svs-download`, `front/18-player`, `som/21-scales-timbres`, `narr/25-credits`
- Keep commits small and use `type(area): description (#issue)`
  - Example: `feat(dados): download SVS 5147 frames (#12)`
  - Types: `feat`, `fix`, `docs`, `chore`, `data`, `test`

```bash
git checkout main
git pull
git checkout -b dados/12-svs-download
# ... work ...
git add pipeline/download.py
git commit -m "feat(dados): download SVS 5147 frames (#12)"
git push -u origin dados/12-svs-download
gh pr create --fill
```

## 3. Pull requests

- Open a PR as soon as something works (it can be a draft: `gh pr create --draft`).
- Add `Closes #<number>` to the description to close the issue.
- Another team member reviews and merges it (**squash merge**).
- Before opening the PR, run `git pull origin main` on your branch to bring in the latest changes.

## 4. Issues are tasks

- The plan's tasks are tracked as **Issues**, labeled by role and phase milestone.
- Assign an issue to yourself (`gh issue edit <n> --add-assignee @me`) before starting, so no one else picks up the same task.
- Each person should work on one issue at a time when possible.
- Checkpoints (12:30, 18:00, Sunday 13:00 and 21:00) are `area:todos` issues.

## 5. Large files

- Store frames in `public/data/<track>/frames/` as **WebP, 1024 px**, with at most about 150 frames per track.
- Keep large originals (PNG/MP4) in **Drive**, never in Git (`.gitignore` already excludes `raw/`).

## 6. Challenge rules that apply to code

- Add a comment identifying the tool (`// AI-assisted: <tool>`) to AI-generated code or audio (or audio metadata), and list it in `CREDITS.md`.
- Add every library, sound, or dataset used to `CREDITS.md` in the same PR.
- Record team decisions (tracks, mappings) in `DECISIONS.md`, including who decided and why.
