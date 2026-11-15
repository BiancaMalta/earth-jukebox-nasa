# Decisions log

Append-only. One line per decision. Add new rows at the **end** of the table to avoid merge conflicts.

| Date/time | Decision | Who decided | Why |
|---|---|---|---|
| 2026-11-14 | Repository structure with one folder per role and one preset file per track | Team | Allow parallel work without merge conflicts |
| 2026-11-14 | Estimate SVS 5148 wind features from confidently color-matched video pixels and report coverage | Team | GEOS-FP comparison remains pending, while transparent low-speed colors and high-end overlap with the basemap make a full-frame pixel mean unreliable |
| 2026-11-15 | Prioritize PM2.5 more/less contrasts and increase/decrease directions over absolute concentration agreement; use the explicit area-weighted log-color intensity × detected-extent index for sound, with one fixed scale across regions and times | User; implementation assisted by OpenAI Codex | The 29-instant comparison improves strong country contrasts and three-hour trend directions over the previous concentration mean. Preserve physical diagnostics separately and document remaining inversions, source-recipe uncertainty and lack of independent observational validation; see docs/estudo-cientifico/pm25-qualitativo.md |
