# Mappings: variable → sound → why (Owner: Som)

Decided by the team at the opening (task 1.4). Every mapping must be deterministic.

| Variable | Data sound (faithful) | Sound character | Rationale / reference |
|---|---|---|---|
| Near-surface PM2.5 | Supplied visualSignal: area-weighted log-color intensity × detected extent (0–1) → pitch and filter brightness | Sustained metallic FM tone, continuous C3–C7 | More visible signal gives a higher, brighter tone on one fixed scale across regions/times. Pitch intervals double in cents versus the historical C4–C6 curve; brightness is unchanged. This qualitative index is not µg/m³ or health risk. |
| Near-surface ozone (ppbv) | Supplied 5–60 ppbv norm → fixed C-major curve, C3–C7, with one diatonic step per ppbv between 30 and 50 | Soft harp-like pluck | More sensitive regional/time comparisons on one shared curve. Coarser steps preserve the lower and upper legend extremes; missing data stays silent. See estudo-cientifico/ozonio-sensibilidade.md. |
| Near-surface carbon monoxide (ppbv) | Supplied 40–500 ppbv norm → 29 C-major notes C2–C6; about 6.67 ppbv/step through 200, then 75 ppbv/step | Sustained trumpet-like lead | Fixed scale-index anchors 40→0, 60→3, 200→24, 500→28 reveal smaller regional changes. Missing values stay silent. See estudo-cientifico/co-pm25-variabilidade.md. |
