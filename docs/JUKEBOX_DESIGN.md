# Earth Jukebox: retro cabinet

The accessibility and UX checkpoint is `99ee962` on branch
`feat/accessible-player-navigation`. The retro appearance starts after that
commit on branch `feat/earth-retro-jukebox`.

The visual direction proposed by the user turns the seven variables into a
record collection. The cabinet uses dark wood, green and gold trim, a serif
marquee, and a central display for NASA images. The record illustrations,
finish, and speaker grille are CSS; no new font, library, or external service
was added. `public/jukebox.css` contains the new appearance.

## Preserved interaction

- **One variable** and **Combine variables** remain reachable with Tab.
- The collection uses native radio buttons: Tab enters the selection and the
  arrow keys change the record. Each option has an accessible name containing
  the variable and instrument. The previous selector remains internal to
  integrate with the existing flow without duplicating visible controls. The
  guide points to the selected record.
- Play, progress, region selection, and the table keep their order. Records do
  not start playback automatically.
- The guide keeps speech and musical examples separate. Data rules, notes,
  missing values, and regional selection were not changed in this visual
  update.
- Focus remains visible; selection is indicated by more than color; the layout
  adapts to mobile; forced colors are handled; and `prefers-reduced-motion` is
  respected.

## Verification

All seven JavaScript suites passed. A Firefox inspection at 1360×1100 and
390×844 found no horizontal overflow. Arrow-key selection changed Temperature
to Wind and kept the internal selector and heading synchronized. Desktop and
mobile screenshots were inspected. This does not count as a new test with
blind users, screen-reader users, or a full WCAG evaluation.

Design and implementation were assisted by OpenAI Codex, based on the user's
proposal.

## Interface labels

Controls use the same terms in labels, states, and the spoken guide:

| Before | Now | Reason |
|---|---|---|
| Single visualization | One variable | Makes clear that the user explores one variable, its map, and its sound. |
| Combination preview | Combine variables | Makes clear that variables are combined to compare maps and hear sounds together. |
| Country group | Region | Shortens the selector without repeating the term in every option. |
| Europe country group (includes all Russia) | Europe | Keeps the boundary explanation in About these boundaries. |
| Oceanic island territories (land only) | Oceanic island territories | Keeps the island meaning; the boundary note explains that only land is included. |
| Play sound legend | Hear sound examples | Describes the action without relying on the technical term “legend.” |
| Frame position | Timeline | Identifies time navigation. |
| View values by time | Values over time | Short name for the collapsed table. |
| Read current frame row | Read this frame | Explicit reading action without table terminology. |

Region and variable keys, scientific names in readings, and group definitions
remain unchanged. The site remains in English; this visual update does not add
a partial translation. Scientific caveats stay in method and limitation text
instead of being repeated in every option name.

**One record / Mix records** were reconsidered because those labels relied on
the visual metaphor to explain a function. The tabs now use functional terms
and short descriptions that are visible and associated with each tab for
spoken navigation.

## Methods and speed

**About the values and methods** is open by default below the sound guide in
the sidebar. The detailed calculations remain collapsible. Playback speed
beside the timeline offers 0.25×, 0.5×, 1×, 1.5×, and 2×. It changes the
player clock interval, including during playback, without changing
timestamps, values, or sound mappings. Sound-guide timings remain independent
of playback speed.
