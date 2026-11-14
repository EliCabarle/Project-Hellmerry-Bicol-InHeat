# Feature Briefs — Bicol In-Heat

> Ten prompts in the same grammar as the interaction packs: **ROLE / GOAL / WHY / FIND FIRST /
> CHANGE / CONSTRAINTS / CUSTOMIZE / DONE WHEN**.
> Companion to `CONCEPT.md` and the `AGENTS.md` sub-contracts — this file is the *brief* layer,
> not a replacement for them. Jurisdiction and the workboard still live in each slice's `AGENTS.md`.
>
> Nothing here is claimed on the project page or video unless it is a CORE item in `CONCEPT.md` §8.

---

## How to use

1. **One brief per session.** They are narrow on purpose; two briefs to one agent gets you half of each.
2. **Paste the context block below first**, then the brief.
3. **Respect the write boundary.** A brief is executed by the slice that owns the path. `map-controls`
   briefs write in `features/map-controls/**` only; a brief that seems to need another slice is a
   request to the lead, not a direct write.
4. **Do not pre-explain the code.** `FIND FIRST` is the agent's test, not your instruction.
5. **Verify `DONE WHEN` yourself.** Especially the numbers — a wrong number and a right number are
   indistinguishable on a map.
6. **Status is not a target.** A `BUILT` brief is a *harden and verify* job. Never re-plan it from
   scratch; read what exists first.

## Status legend

| Tag | Means |
|---|---|
| `BUILT` | Code exists and runs. The brief is a verification and finish job. |
| `PARTIAL` | Some of it exists; the brief names what is missing. |
| `NOT STARTED` | Only the contract exists. Build it. |
| `STRETCH` | Do not start before h42. Never claimed as CORE. |

---

## Shared context block

Paste above every brief.

```
CONTEXT
This is Bicol In-Heat, a static PWA: Vite + React + Tailwind shell in apps/web,
feature slices in features/<name>/, statistical work in core/, ETL and secrets
in apps/api/, Supabase for accounts and leaderboard only.

Before starting, confirm these exist and note where:

  1. Municipality geometry sourced from an official boundary dataset, each
     feature identified by a code, not a name.
  2. A per-municipality record: id, name, province, centroid and the joined
     narrative/trend numbers.
  3. One source of colour per view mode, so nothing is invented locally.
  4. The layer-registry seam for turning optional layers on and off.
  5. The timeline store that owns year, playback and zoom.
  6. A render path that updates styles in place instead of remounting.

If any is missing in the slice you are working in, stop and report which one
rather than building a second copy of it.

RULES FOR THIS SESSION
- Read the files you are about to change. Do not infer their contents.
- Make the smallest change that satisfies DONE WHEN.
- No new dependencies.
- Municipality is the smallest unit. There are no barangay-level values.
- Significance is a flag, never a filter. Non-significant results stay visible.
- Land-surface temperature is not air temperature. Never display one where the
  other is meant, and never share an axis or a ramp.
- Every displayed number carries its sample size where a sample count exists.
- The client bundle contains zero secrets: anon key only, never service-role,
  never an LLM key.
- A leaderboard shows a user-chosen handle, never a real name or email.
- Respect prefers-reduced-motion in every animation you touch.
- Report at the end: files changed, what you verified by hand, what you did not.
```

---

## The customisation contract

Same split as the interaction packs.

```
Everything under CUSTOMIZE may be changed freely. If a requested value would
break something under CONSTRAINTS, say so and propose the nearest safe value —
never apply it silently.
```

**Yours to change:** colour ramps and their breaks, stroke weights and dash patterns, fill opacity,
type sizes, panel and legend placement, easing and durations, label thresholds, the ordering of
fields inside a panel.

**Not yours to change:** the metric definitions, the significance rule, the municipality floor, the
surface-vs-air distinction, the handle-only rule, the h30 cut line, the write boundaries.

**Guardrails:** substituted colour holds **≥ 4.5:1** for label text and **≥ 3:1** for boundaries and
adjacent fills; every state that carries meaning survives greyscale; `prefers-reduced-motion` settles
each animation to its final state rather than skipping the state change.

---

## Index

| # | Brief | Slice | Status |
|---|---|---|---|
| M1 | Municipality layer and significance as a border pattern | map-controls | `BUILT` |
| M2 | Time scrubber state contract | map-controls | `PARTIAL` |
| M3 | Municipality detail surface | map-controls | `BUILT` |
| L1 | Layer registry contract | layer-uhi-terrain | `NOT STARTED` |
| L2 | Land-surface temperature layer | layer-uhi-terrain | `NOT STARTED` |
| L3 | Canopy and land-cover overlays | layer-uhi-terrain | `NOT STARTED` |
| G1 | Ranking screen | gamified-dashboard | `BUILT` |
| G2 | Progress and handle-only leaderboard | gamified-dashboard | `PARTIAL` |
| N1 | Narrative-bank renderer | chatbot-llm | `NOT STARTED` |
| N2 | Variable glossary | chatbot-llm | `NOT STARTED` |

**Order:** M1 → M3 → M2 → L1 → L2 → L3 → G1 → G2 → N1 → N2.

`L1` before `L2`/`L3` is the only hard dependency — the overlays need the seam. `N2` before `N1` is a
soft preference: the glossary fixes the vocabulary the narration then reuses.

---

## M1 · Municipality layer and significance as a border pattern

`features/map-controls` · **BUILT** — verify and finish

```
ROLE
You are working in features/map-controls of Bicol In-Heat. The map screen
already renders Region V as municipality shapes at 114 features. Read the
existing style path before you change anything.

GOAL
Every municipality's fill encodes one thing — the trend rate, or the mean heat
index for the selected year — and significance is carried by the border
pattern, not by the fill. Selection is a tint that survives both view modes.

WHY
A significance filter would hide the municipalities that are not changing,
which are half the story. Encoding significance in fill hue alone loses it in
greyscale, for colour-blind users, and in every screenshot that gets
recompressed. A dash pattern survives all three.

FIND FIRST
- The single style function per municipality and where it is called from
- How the GeoJSON layer is mounted, and whether style updates happen in place
- The colour ramp module and its breaks for both view modes
- Where the "no narrative yet" pending state is chosen

CHANGE
1. Keep exactly one style function for a municipality; both view modes go
   through it, chosen by a mode value.
2. Give significant and non-significant municipalities different border
   patterns — solid for significant, dashed for not — with the same fill
   logic. Never derive significance from hue.
3. Give cities a heavier border than municipalities, and keep that weight
   independent of the significance pattern.
4. Show a distinct fill for municipalities with no joined narrative yet, and
   make that state visually distinguishable from "flat trend" and from
   "decreasing".
5. Selection adds a tint and a heavier border; it must not change the fill
   hue that encodes the value.
6. Restore the exact previous style on deselect, including the dash pattern.
7. Update styles in place. Do not remount the layer when selection, mode or
   year changes.

CONSTRAINTS
- No new dependencies.
- Municipality is the smallest unit. No barangay geometry.
- Significance is rendered, never filtered: no municipality may disappear
  from the map because its trend is not significant.
- Do not smooth, average or interpolate neighbouring municipalities.
  Opposite trends next to each other are the point, not an error.
- The dashed border must read at the smallest drawn municipality size; if it
  does not, adjust the dash pattern, not the geometry.
- Greyscale must still separate significant from not.

CUSTOMIZE
- DASH_PATTERN      the non-significant dash, e.g. 4 3
- SIG_WEIGHT        significant border weight, municipality and city
- UNSIG_WEIGHT      non-significant border weight
- CITY_WEIGHT       extra weight for a city
- PENDING_FILL      the no-narrative-yet fill opacity and hue
- SELECT_TINT       the selection border colour
- RAMP_BREAKS       per view mode, as long as the ramp stays monotonic in
                    lightness

DONE WHEN
- A non-significant municipality is visible, dashed, and legible in greyscale.
- A greyscale screenshot still separates increasing, decreasing and flat.
- Selection and deselection leave the style pixel-identical to before.
- Changing year or view mode remounts zero layers — counted, not eyeballed.
- The pending state appears only for a municipality with no joined narrative.
- Verified at fit zoom and at 2x zoom, on a city and on the smallest island
  municipality.
```

**What usually goes wrong:** the dash is applied to every border including significant ones because
the style object is merged in the wrong order, and the whole map reads as provisional.

---

## M2 · Time scrubber state contract

`features/map-controls` · **PARTIAL** — playback and clamping exist; the cross-layer notify is unverified

```
ROLE
You are working in features/map-controls of Bicol In-Heat. A timeline store and
an overlay component already exist. Read both before you change anything.

GOAL
One store owns the selected year, the playback state and the zoom clamp.
Everything else subscribes to it. Changing the year notifies the layers through
the agreed seam, never by reaching into another slice.

WHY
Two owners of "which year is selected" is the classic silent bug: the scrubber
says 2019, the fills say 2018, and both look plausible. One store, one write
path.

FIND FIRST
- The store's shape: what it holds, how it is created, how it is replaced
- Every selector and every dispatcher, and whether the selectors return
  primitives or stable references
- Where the map instance is passed in, and what the overlay does with it
- The layer-toggle seam and who is expected to implement it

CHANGE
1. Keep one store for index, playback and zoom; components read it through
   selectors and write through actions only.
2. Playback advances on its own clock, and the transition on the map is the
   only thing it animates.
3. Decide and document what playback does at the last year: wrap or stop.
   Then make the button label agree with the decision.
4. Scrubbing while playing pauses playback; releasing does not silently resume.
5. Changing the year notifies layers through the existing seam. No caller
   receives another slice's internals.
6. Under prefers-reduced-motion, a year change jumps to the new fill without
   an eased colour transition, and playback does not animate.
7. A layer toggle goes through the registry seam; when the registry is not
   mounted, the toggle is disabled with a reason rather than doing nothing.

CONSTRAINTS
- No new dependencies.
- Selectors return a primitive or a reference that only changes when their
  slice changes; no new object per frame.
- The store must remain swappable for a core store later — no component may
  import the store instance directly if an action hook exists.
- No component may import from another feature slice.
- Playback must not block the map from being panned or zoomed.

CUSTOMIZE
- PLAYBACK_MS     per step, e.g. 900
- EASE_MS         the fill transition duration
- WRAP_AT_END     wrap or stop, whichever you documented
- ZOOM_MIN/MAX    the clamp, relative to the fitted region
- DEFAULT_YEAR    the year the screen opens on

DONE WHEN
- The scrubber label, the fills and any panel all report the same year after
  every action, including a mid-playback scrub.
- Crossing the end of the range does what the button label promises.
- Reduced-motion mode changes no intermediate frames — verified by recording
  or by a frame-by-frame assertion.
- A layer toggle with no registry mounted is disabled and explains why.
- Unrelated state changes re-render no timeline subscriber.
- One store instance: counting instances across a remount returns one.
```

**What usually goes wrong:** the overlay keeps its own `useState` copy of the year "for smoothness",
and the store and the UI drift apart only under fast scrubbing.

---

## M3 · Municipality detail surface

`features/map-controls` · **BUILT** — verify and finish

```
ROLE
You are working in features/map-controls of Bicol In-Heat. A hover tooltip, a
selection card, a municipality index and a legend already exist. Read all four
before you change anything.

GOAL
Hover, selection card and index show the same numbers for the same
municipality, every number carries its unit, and the sample size is visible
without any extra interaction. All of it is operable by keyboard.

WHY
The map shows a colour; the detail surfaces are where the number earns or loses
trust. A trend value without its sample size is a claim, not a measurement.

FIND FIRST
- Every place a number is formatted, and whether two of them disagree
- Whether the tooltip is built as markup or as a component, and whether the
  injected text is escaped
- How sample days and years are read from the joined narrative
- The keyboard path: focus order, arrow-key movement, and how a card is closed

CHANGE
1. Extract the formatters for value, unit, p-value and sample into one place
   and use it from all four surfaces.
2. Hover: display name, province, the value for the current view mode with its
   unit, the significance state with its p-value, and the sample line.
3. Selection card: the same fields plus the method line, with the value first
   and the method last but always present on first open.
4. Index rows: name, province, value, direction marker and significance — and
   the index must state which mode its values come from, because it changes
   with the mode.
5. Keep the sample line visible when the count is zero rather than dropping
   the row.
6. Escape every interpolated string in the tooltip path; no municipality name
   may reach markup unescaped.
7. Keyboard: one tab stop reaches the map, arrow keys move between
   municipalities, Escape closes the card and returns focus to the map.

CONSTRAINTS
- No new dependencies.
- No bare numerals: every value shows its unit and its year or period.
- Significance is never conveyed by colour alone — the state is written out.
- Hover and card may differ in length, never in value.
- Do not claim a cause in any copy; describe the measurement.
- Do not add a new data load for a surface; read the joined narrative.

CUSTOMIZE
- FIELD_ORDER      the order inside the card
- SAMPLE_FORMAT    "N days · M years", or the project's convention
- P_VALUE_FORMAT   three decimals, with a small-p collapse
- TOOLTIP_OFFSET   distance from the pointer
- CARD_PLACEMENT   docked or floating
- INDEX_COLUMNS    which columns stay at narrow widths

DONE WHEN
- Three municipalities from three different provinces show identical numbers
  across tooltip, card and index.
- Every value in every surface carries a unit and a period.
- The sample line is present for a municipality with a zero count.
- A municipality name containing an apostrophe or an angle bracket renders
  literally and injects nothing.
- The whole surface is reachable and dismissible by keyboard alone.
- Greyscale: significance is still readable without hue.
```

**What usually goes wrong:** the tooltip and the card each keep their own `toFixed`, so the same
municipality reads `+0.051 °C/yr` in one and `+0.05` in the other, and every reader assumes the map
is wrong.

---

## L1 · Layer registry contract

`features/layer-uhi-terrain` · **NOT STARTED**

```
ROLE
You are working in features/layer-uhi-terrain of Bicol In-Heat. The map slice
already exposes a layer-toggle seam and expects this slice to own the registry.
Read the seam's callers before you change anything.

GOAL
One registry describes every optional layer: its id, label, availability,
default state and the component that renders it. Toggles are applied through
the registry, and adding a layer is one registry entry.

WHY
Without a registry, each new overlay adds a boolean, a button and a branch in
the map slice. Three overlays later, nobody can say which layers are on, and
the map slice has become the owner of another slice's behaviour.

FIND FIRST
- The seam as the map slice calls it: what shape it expects, and what it does
  when the registry is absent
- The existing zoom, year and mode state — the registry must not duplicate any
  of it
- Where an unavailable layer is currently offered anyway

CHANGE
1. Define the registry as plain data: id, label, group, available, defaultOn,
   and a renderer reference. No behaviour in the data.
2. Provide the registry to the map slice through the existing seam only.
3. Provide a single toggle action that flips one layer's state; the map slice
   calls it and nothing else.
4. An unavailable layer stays listed, disabled, with a visible reason.
5. Default state is declared in the registry, so a fresh load is deterministic
   and does not depend on mount order.
6. Keep base layers and overlays distinguishable, so the UI can group them
   without parsing ids.
7. Do not mount a renderer for a layer that is off.

CONSTRAINTS
- No new dependencies.
- The registry is the only seam. No component from this slice reaches into the
  map slice, and no map slice internals are imported here.
- Toggling a layer must not remount the map, move the camera or clear the
  selection.
- Do not duplicate zoom or year state in the registry.
- A layer that is not available must never be silently toggled on.

CUSTOMIZE
- LAYER_GROUPS      the grouping labels
- DEFAULT_ON        per layer
- DISABLED_REASON   per unavailable layer
- TOGGLE_STYLE      switch, checkbox or chip

DONE WHEN
- Adding a layer requires one registry entry and no change in the map slice.
- Toggling three layers leaves the camera, the year and the selection exactly
  where they were.
- An unavailable layer is listed, disabled, and states why.
- A fresh load produces the same layer state twice in a row.
- A layer that is off mounts no renderer; counted, not eyeballed.
```

**What usually goes wrong:** the registry is built as a component with `useState` per layer, so the
map slice ends up owning the state again through the seam.

---

## L2 · Land-surface temperature layer

`features/layer-uhi-terrain` · **NOT STARTED**

```
ROLE
You are working in features/layer-uhi-terrain of Bicol In-Heat. Layer registry
may or may not exist yet; if it does not, do the registry work first or stop.
Read the data documentation before you write anything.

GOAL
A municipality-level land-surface temperature overlay over a fixed period,
labelled as surface temperature everywhere it appears, with the sample size and
the quality state disclosed per municipality.

WHY
Surface temperature is not the heat index, and it is much hotter than air. The
moment it is labelled "heat" or shares the heat-index ramp, the project makes a
claim about felt temperature it cannot support.

FIND FIRST
- What the pipeline already produces per municipality, at what resolution, and
  over which years
- The existing heat-index ramp and its breaks, so the new one is visibly
  different
- Where per-municipality sample counts and quality fields are stored
- Whether a pre-2013 slice is even offered, given the Landsat 7 gap

CHANGE
1. Render one layer that fills each municipality with its surface-temperature
   value for the selected period.
2. Use a ramp that is visually distinct from the heat-index ramp — different
   hue family or different lightness structure — and name it in the legend.
3. Label the layer "Land-surface temperature" in the toggle, the legend and
   the tooltip. Never "heat", never "temperature" alone.
4. Show the sample count per municipality on the same interaction as the
   value, and mark municipalities below the pixel floor as insufficient
   sample.
5. If the source reports a quality or uncertainty band, disclose it rather
   than hiding it behind the value.
6. Restrict the years to those the source can support; do not expose a year
   the layer has no data for.
7. Treat any irregular-revisit product as pattern-only: no trend claim, and
   say so where it is displayed.

CONSTRAINTS
- No new dependencies and no new data source.
- Never compute, imply or display an air temperature from this layer.
- Never place surface temperature on a shared axis, ramp or legend with the
  heat index.
- No value below the pixel floor; show the state instead.
- Municipality is the finest unit. No barangay overlay.
- Non-significant or low-confidence results stay visible and flagged.
- Do not interpolate a municipality's missing pixels from its neighbours.

CUSTOMIZE
- LST_RAMP         the ramp, distinct from the heat ramp
- PERIOD_WINDOW    the season and year span shown
- MIN_PIXELS       the floor, matching the pipeline
- MISSING_TINT     the insufficient-sample treatment
- QA_DISPLAY       badge, hatch or outline for a weak quality band
- LEGEND_WORDING   one sentence, surface and period named

DONE WHEN
- The legend, the toggle and the tooltip all say surface temperature.
- The ramp is distinguishable from the heat-index ramp in a screenshot and in
  greyscale.
- A municipality below the pixel floor shows insufficient sample, not a colour
  value.
- A municipality with a pre-2013 gap is either absent from the year range or
  flagged, never shown as clean.
- Three municipalities recomputed by hand match the layer.
- No axis or legend in the UI mixes this value with a heat index.
```

**What usually goes wrong:** the layer reuses the heat ramp because it "looked similar", and every
reader now compares a skin temperature with a felt temperature.

---

## L3 · Canopy and land-cover overlays

`features/layer-uhi-terrain` · **NOT STARTED**

```
ROLE
You are working in features/layer-uhi-terrain of Bicol In-Heat. Read the
registry and the existing ramp module before you change anything.

GOAL
Two optional overlays — tree cover as a fraction, land cover as classes — that
describe the land surface without inventing any temperature.

WHY
These layers are the explanation a reader reaches for after seeing a hot
municipality. If they are colour-coded like heat, the reader concludes cause.
They must look like what they are: a fraction and a set of classes.

FIND FIRST
- The registry entry shape, and how a layer declares itself unavailable
- The class names the land-cover product actually uses
- Whether the overlay is per municipality, per pixel, or both

CHANGE
1. Tree cover renders as a sequential fraction ramp with a stated percentage
   range, and its legend says "tree cover, percent".
2. Land cover renders as discrete classes with a bounded palette, and its
   legend lists every class that appears in the region with its own name.
3. Neither overlay changes the municipality fill while the other view mode is
   active; an overlay either replaces the fill deliberately or draws above it.
4. Each overlay carries its source product and year in the legend.
5. Class colours stay distinguishable in greyscale and are never reused for a
   heat value.
6. Both overlays are off by default, and turning one on leaves the other's
   state untouched.
7. Copy in the tooltip describes the measurement, never a consequence.

CONSTRAINTS
- No new dependencies.
- No derived temperature of any kind from these layers.
- No causation wording: "association", never "because of" or "caused by".
- No barangay-level rendering.
- The class palette may not exceed the number of classes the source defines;
  do not invent a class to fill a gap.
- Do not recolour the municipality fill to help a class read better; adjust
  the class itself.

CUSTOMIZE
- CANOPY_RAMP        the fraction ramp breaks
- CANOPY_UNITS       percent, with the range stated
- CLASS_PALETTE      one colour per class, bounded
- CLASS_LABELS       the English names shown in the legend
- OVERLAY_OPACITY    so boundaries stay visible under the overlay
- DRAW_ORDER         replace fill, or draw above it

DONE WHEN
- Turning an overlay on and off restores the previous fill exactly.
- The land-cover legend lists every class present in the region and no others.
- Both overlays are readable in greyscale.
- Each legend names its source product and year.
- No tooltip on an overlay asserts a cause.
- With both overlays off, the map is identical to before the change.
```

**What usually goes wrong:** land cover is rendered with a red-to-green ramp, which reads as
"bad to good" and turns a land-cover class into a verdict.

---

## G1 · Ranking screen

`features/gamified-dashboard` · **BUILT** — verify and finish

```
ROLE
You are working in features/gamified-dashboard of Bicol In-Heat. A ranking
screen, a table component and a pure ranking module already exist. Read all
three before you change anything.

GOAL
A municipality ranking ordered by trend magnitude or by danger-band days, where
the rank is stable under every filter, the slope magnitude and the sample size
are always visible, and non-significant municipalities still appear.

WHY
A ranking that hides non-significant entries turns "we could not detect a
trend" into "no problem here". A ranking that renumbers after filtering makes
"37th" mean two different things in two screenshots.

FIND FIRST
- The pure ranking function, its modes and its tie-breaks
- Where the rank number is assigned relative to filtering
- Whether every row shows the slope, the significance state and the sample
- What the screen shows when the list is empty or the data has not loaded

CHANGE
1. Rank first, filter second. A filtered list keeps its original rank numbers.
2. Keep at least two orderings — trend magnitude and danger-band days — and
   make the active ordering visible in the table header and the method line.
3. Every row shows the slope with its unit, the significance state with its
   p-value, and the sample size.
4. Non-significant municipalities are included and flagged, never removed.
5. Tie-breaks are deterministic and documented, so two runs of the same data
   produce the same order.
6. Sort by magnitude where magnitude is the question, and say so — an unsigned
   sort hides cooling.
7. Empty and loading states say which of the two they are.

CONSTRAINTS
- No new dependencies.
- No hidden default filter that a reader cannot see or switch off.
- Do not drop rows with a missing value; show the gap.
- No claim of cause anywhere in the copy.
- Rank ordering may not hide the magnitude or the sample size.
- Municipality is the smallest unit.

CUSTOMIZE
- MODES            which orderings ship
- TIE_BREAK        the documented secondary and tertiary keys
- TABLE_COLUMNS    which columns survive a narrow viewport
- SIG_DISPLAY      pill, badge or text, never colour alone
- METHOD_LINE      one line naming the statistic and the alpha
- ROW_LIMIT        none, or a stated cap with a "show all" control

DONE WHEN
- A filtered view keeps the original rank numbers — the 37th row stays 37th.
- Every row shows slope with unit, significance and sample size.
- Flipping the ordering is deterministic across two runs of the same data.
- A non-significant municipality is present and flagged.
- The empty state and the loading state are visually distinct.
- Greyscale still separates significant from not.
```

**What usually goes wrong:** the filter runs before the rank assignment, so the saved-only view starts
at 1 and a judge comparing two screenshots concludes the data changed.

---

## G2 · Progress and handle-only leaderboard

`features/gamified-dashboard` · **PARTIAL** — saved places and a leaderboard read exist; progress and the h30 fallback do not

```
ROLE
You are working in features/gamified-dashboard of Bicol In-Heat. A saved-store,
a leaderboard read and a session hook already exist. Read all three before you
change anything.

GOAL
Progress tracking and a public leaderboard that shows a user-chosen handle and
a score, working logged-out, with a local-only fallback that needs no auth.

WHY
The leaderboard is the one screen a judge will open in a private window, and it
is also the only place personal data could leak. Both facts point at the same
design: a public read of non-identifying fields, and a path that works with no
session at all.

FIND FIRST
- What the leaderboard view actually exposes, field by field
- Whether the saved write is idempotent and what reverts on failure
- Where the auth feature flag is read, and what happens with it off
- What sign-out does to in-memory saved state

CHANGE
1. Progress is derived from stored actions, not from a counter that only the
   UI increments. One source per user, one write path.
2. The leaderboard reads a public view exposing handle, score and saved count
   only. It loads with no session.
3. A failed save reverts the optimistic state and says so; a failed load leaves
   the previous view rather than an empty one.
4. Sign-out clears every in-memory trace of the previous account, so a second
   account on the same tab cannot inherit saved rows or a name.
5. With the auth flag off, progress is local-only and the leaderboard is
   hidden, not broken — the screen explains that it needs an account.
6. An empty leaderboard states that nothing has been recorded yet, and does not
   render a column of zeros as if it were data.
7. The handle is the only identity shown anywhere, including in any export or
   screenshot-facing surface.

CONSTRAINTS
- No new dependencies.
- No real name, email, avatar or user id in any rendered surface or payload.
  The public view must not need one.
- The service-role key never reaches the client. Anon key only, guarded by
  row-level security.
- h30 cut line: if the leaderboard is not working, drop to local-only progress
  with no auth. Do not renegotiate this.
- Offline means last-viewed progress only. No whole-province offline cache.
- A failed write must never leave the UI claiming success.

CUSTOMIZE
- HANDLE_RULES     length and character set, validated on the server side too
- SCORE_FIELDS     which counters the view exposes
- LEADERBOARD_SIZE the public read limit
- EMPTY_COPY       one sentence, no dashes of zeros
- LOCAL_STORE      the local-only key namespace when the flag is off
- FLAG_NAME        the auth feature flag

DONE WHEN
- The leaderboard renders in a logged-out private window.
- No field outside handle, score and saved count is fetched or displayed.
- A failed save reverts visibly and the row stops claiming to be saved.
- Sign-out then sign-in as a second account shows none of the first account's
  rows.
- With the flag off, progress works with no network and the leaderboard
  explains itself instead of erroring.
- An empty leaderboard reads as empty, not as zeros.
```

**What usually goes wrong:** the handle rule exists only in the client, so a crafted request writes a
real name into the public view and it appears next to a rank.

---

## N1 · Narrative-bank renderer

`features/chatbot-llm` · **NOT STARTED**

```
ROLE
You are working in features/chatbot-llm of Bicol In-Heat. The pipeline produces
a static narrative bank; the map and ranking slices already join it per
municipality. Read the joined shape before you change anything.

GOAL
A narration screen that renders the precomputed numbers and the precomputed
wording from the static bank, in English and Filipino, with a template fallback
when a municipality has no narrative.

WHY
The prohibition is not stylistic: the LLM never generates numbers, and this screen
renders the static bank rather than calling a model. (The QA chatbot's server-side
`/api/qa` endpoint is the separate, deliberately scoped exception — CONCEPT 6d.) If
the screen can fetch a model, the whole claim collapses; if it can compute a number,
the numbers stop matching the map.

FIND FIRST
- The narrative bank's shape, per municipality and per language
- How the map slice already joins it, so this screen reads the same values
- What the driver ranking field contains and in what order
- Where the shell mounts screens, since narration is not mounted yet

CHANGE
1. Render the narration screen from the static bank only.
2. Print stored numbers verbatim. The screen never computes, rounds to a
   different precision than the map, or derives a value.
3. Offer a language switch, and keep the numbers identical across languages —
   only the wording changes.
4. Show the driver ranking as an ordered list with the association wording
   attached once, visibly, rather than per row.
5. When a municipality has no narrative, fall back to a template built from
   the stored numbers. Never render a blank screen and never invent prose.
6. Show the municipality's sample size and period alongside the narration, as
   the map does.
7. Do not mount the screen yourself: report the mount request to the lead.

CONSTRAINTS
- No new dependencies. No runtime model call, no API key, no proxy.
- The renderer never generates a number. Grep for arithmetic on the values it
  displays should return nothing.
- Bicolano is STRETCH only, and needs a native speaker. Do not machine-translate
  it.
- Drivers are associations, never causes.
- Opposite trends in neighbouring municipalities are rendered as pattern, not
  as an error.
- The screen must work offline from the last-loaded bank.
- Municipality is the smallest unit.

CUSTOMIZE
- LANGUAGES         English and Filipino, ordered
- FALLBACK_TEMPLATE the sentence skeleton with slots for stored numbers
- DRIVER_ORDER      as stored, or by stored importance
- ASSOCIATION_NOTE  one sentence, shown once
- SECTION_ORDER     value, trend, drivers, mitigation, source
- NUM_PRECISION     matching the map exactly

DONE WHEN
- The screen renders with the network disabled after one load.
- Every number shown equals the map's number for the same municipality, to the
  same precision.
- Switching language changes no number.
- Three municipalities with no narrative render the template, not a blank.
- No code path calls a model, and no key exists in the bundle.
- Every driver statement is association wording.
- The mount request is reported rather than applied.
```

**What usually goes wrong:** the screen "improves" a stored sentence by recomputing a percentage, and
the narration now disagrees with the number printed next to it.

---

## N2 · Variable glossary

`features/chatbot-llm` · **NOT STARTED**

```
ROLE
You are working in features/chatbot-llm of Bicol In-Heat. Read the narrative
bank's field names and the legend wording before you change anything.

GOAL
A glossary entry for every variable the interface names: what it measures, its
unit, why it signals change, and the limit of what it can tell you.

WHY
The two terms a reader will confuse are land-surface temperature and heat
index. One glossary, written once and reused by every surface, is cheaper than
fixing that confusion in five places.

FIND FIRST
- Every variable name that appears in the UI: toggles, legends, tooltips,
  table headers, narration
- Which of them share a unit and which do not
- Where a definition already exists in copy, so it is moved rather than
  duplicated

CHANGE
1. One entry per variable: name, what it measures, unit, how it signals
   change, and what it cannot tell you.
2. State the surface-versus-air distinction once, explicitly, in the two
   entries that need it — and link between them.
3. Reuse the same wording wherever the variable is named; do not write a
   second definition in a tooltip.
4. Keep the reading level at high-school to college, and define a term with
   words rather than with a formula.
5. Reachable from wherever the variable appears, without leaving the screen.
6. Any number in a definition is either stable (a unit, a range) or omitted —
   never a value that will drift when the data is rerun.
7. Every variable that appears in the UI has an entry; the check is a grep of
   the labels, not memory.

CONSTRAINTS
- No new dependencies.
- No cause language: association, sensitivity, or "tends to" — never "because".
- No claim that a satellite measurement is a felt temperature.
- Do not restate the method as a definition; link to it.
- Municipality is the finest unit named in any definition.
- No numbers that could drift out of date.

CUSTOMIZE
- GLOSSARY_ORDER   alphabetical, or by screen order
- ENTRY_FIELDS     the four headings above
- READING_LEVEL    the target, stated
- SHOW_AS          drawer, dialog or inline expansion
- LINK_STYLE       how the surface/air pair points at each other

DONE WHEN
- Every variable named in a toggle, legend, tooltip, table header or narration
  has an entry; the list came from a grep.
- No variable has two different definitions in two places.
- The surface-versus-air distinction appears and is linked both ways.
- No entry asserts a cause.
- The glossary is reachable and dismissible by keyboard.
- No entry contains a number that depends on the current dataset.
```

**What usually goes wrong:** the glossary is written from memory of the method rather than from the
labels on screen, so the one term a reader actually clicked — a legend sub-label — is missing.

---

## Re-integrating into the `AGENTS.md` files

This file deliberately duplicates none of the four sub-contracts. If you want the slices to point at
it, that is a lead-owned edit to each `features/<name>/AGENTS.md`:

```md
## Briefs

Engineering briefs for this slice live in [`../FEATURE-PROMPTS.md`](../FEATURE-PROMPTS.md)
(`M1`–`M3` here). Jurisdiction and the workboard in this file still win on scope;
the briefs win on how.
```

Status stays owned by the workboard. When a brief ships, update the workboard row — not this file's
status tag, which describes the state at the time of writing.
