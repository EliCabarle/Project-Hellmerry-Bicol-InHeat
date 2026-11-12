# Bicol In-Heat - Project Concept

> **Status:** TENTATIVE / FLUID - all decisions carry a status and a lock hour (see Sect. 13).
>
> **EXTRACTION RULE:** Only **CORE** items (Sect. 8) may appear as claims on the Space Apps
> project page or in the video. A STRETCH item that is not shipped must never be
> presented as a feature. Writing an ambitious concept doc is free; submitting a claim
> we did not build is a Validity failure.
>
> **Compliance note:** This repository hosts the **working prototype** (near-final-
> product target); code work is expected here. The former no-code-before-Nov-14 rule
> was rescinded by the lead on **2026-11-02** (see Sect. 13 decision log). The
> challenge-weekend cut lines h30 / h42 / h44 (Sect. 11) remain the hard constraints.

---

## 1. Header

| Field | Value |
|---|---|
| Working title | **Bicol In-Heat** |
| Challenge (exactly one) | Be An Earth System Trend Detective! - 2026 NASA Space Apps Challenge |
| Challenge URL | https://www.spaceappschallenge.org/2026/challenges/be-an-earth-system-trend-detective/ *(verify live - page is JS-rendered)* |
| Event | In-person Local Event - **OPEN: event name + local close time** |
| Team | 6 members, all registered for the same event |
| Language of submission | English |
| Deliverable | Public web app (PWA) + methodology page + demo video |

## 2. Problem & the named decision

Every dry season, Bicol breaks its own heat record. Weather stations report ambient
temperature, but the **heat index** - what the body actually experiences - climbs into
PAGASA's **Danger** range (42-51 C) and, in some readings, past it into **Extreme
Danger** (>= 52 C). That gap between what the thermometer says and what people feel is
the whole problem.

Nobody answers the *why*. LDRRMO advisories track the heat index **after** it spikes
rather than the geographic and oceanic conditions that produce the spike; farmers plan
around numbers that don't say why one barangay swelters while a neighboring one doesn't;
regional planners can point to micro-climates that keep breaking records without knowing
what is driving them.

**The named decision:** which municipalities get prioritised for heat-health measures
in the next LDRRM Plan cycle, and which crop calendars to shift. *(Verify the exact
official plan name and cycle before shipping.)*

## 3. Who it's for

| Actor | Role | Cadence |
|---|---|---|
| Municipal/City DRRMO (LDRRMO) | Primary user - uses rankings to prioritise heat measures | Each dry season (Mar-May), before advisories |
| Provincial Agriculture Office | Uses drivers to adjust crop calendars and advisories | Same |
| Regional planners (Region V) | Uses trend significance for budget allocation | Annual plan cycle |
| Residents & farmers | Beneficiaries - safer planning, earlier warning context | Ongoing read-only |

Not "for everyone" as a marketing line - the tool is built for the actor above;
residents benefit from what that actor changes.

## 4. What we're building (CORE)

Three screens, map-first:

1. **Map screen** (first thing a stranger sees): Region V heat layer with time
   scrubber, municipality tooltips, significance flags.
2. **Ranking screen**: municipalities sorted by warming trend and danger-band
   exceedance, each with its trend slope and significance.
3. **Narration screen**: plain-language (EN + Filipino) explanation of *why* a
   municipality is heating - drivers ranked, with the mitigation list.

Every variable in the selector carries a plain-language definition (what it measures,
units, why it signals change) - pitched at high-school/college users and the
scientifically-curious public.

**PWA behavior:** installable; offline shows the last-viewed map tiles + series +
task progress. UI English; LLM narration English + Filipino.

## 5. The frame & prior art

**The creative frame:** heat index is *felt*; land surface temperature is *measured*;
and the heat index has only ever been used to **track outcomes, not explain them**.
Bicol In-Heat is the tool that explains them - driver attribution at municipality
scale over decades, with statistical significance.

**Prior art we must name (and why we're different):**
DOST-PAGASA's **iHeatMap** (https://bagong.pagasa.dost.gov.ph/weather/heat-index)
maps and *predicts* heat index nationally. It answers **what**. Bicol In-Heat answers
**why**: which process drives each municipality's trend, whether the trend is
statistically significant, and what to do about it. *(Verify URL resolves logged-out.)*

**Why now:** the challenge statement itself notes that *"a measured Earth science data
variable can trend one way in one region and the opposite way in another, even when the
same process drives both."* That is exactly the situation in Bicol - and it is exactly
the question this project answers.

## 6. Data & method

### 6a. Variables (tiered)

| Tier | Variable | Source / product ID | Access | Role |
|---|---|---|---|---|
| CORE | Heat index | NASA POWER daily T2M + RH2M -> Rothfusz | power.larc.nasa.gov API, no auth | The *felt* outcome metric |
| CORE | Ground truth | PAGASA station heat index (Region V) | PAGASA open data *(verify access route)* | Validation baseline |
| CORE | LST | Landsat 8/9 Collection 2 L2 - LANDSAT_OT_C2_L2, band ST_B10 (+ ST_QA uncertainty) | Earthdata Search / STAC, Earthdata Login | 30 m spatial pattern, 2013-present |
| CORE | Tree cover % | MODIS/Terra VCF - MOD44B.061 | LP DAAC / LAADS | 250 m annual canopy driver, 2000-2024; **also a deforestation trend for free** |
| CORE | Land-cover class | MODIS MCD12Q1.061 IGBP (urban vs forest) | LP DAAC | Urban<->forest transition (UHI) |
| CORE | Population exposure | SEDAC GPW | sedac.ciesin.columbia.edu | Who is exposed |
| STRETCH | Diurnal LST & plant stress | ECOSTRESS ECO_L2G_LSTE (gridded, ISS) | LP DAAC, Earthdata Login | Diurnal variation, 2018-present |
| STRETCH | Active fire | FIRMS - key-free CSV directory or free MAP_KEY | firms.modaps.eosdis.nasa.gov | Second challenge trend (forest fires), ~1 h |
| STRETCH | Drought proxy | ECOSTRESS L3/L4 Evaporative Stress Index | LP DAAC | Drought angle on data already in the pipeline |
| STRETCH | Precipitation | GPM IMERG Early Run GPM_3IMERGDE | GES DISC | Dry-season context |
| OUT | Soil moisture (SMAP L4) | - | - | Too heavy for the window |

**Non-NASA data (must be attributed - compliance box 8):**

- PAGASA station observations (Philippine national agency)
- LGU boundaries: PSA/PSGC (official) - fallback: geoBoundaries or OSM (attribute licence)
- *(Any fonts/icons - attribute per licence)*

### 6b. Time depth

| Tier | Choice |
|---|---|
| CORE | **POWER heat index 1981-2025** per municipality (one API pull) -> Theil-Sen slope + Mann-Kendall on ~45 years. Long baseline is what makes "significant" credible. *(Verify POWER daily start year.)* |
| CORE | Satellite drivers: Landsat 2013-2025, MOD44B 2000-2024, ECOSTRESS 2018-2025 |
| STRETCH | Extend LST to 1984 with Landsat 5 (LANDSAT_TM_C2_L2) / 7 (LANDSAT_ETM_C2_L2), handling Landsat 7's post-2003 SLC-off gaps |

### 6c. Method (CORE)

1. **Outcome:** heat index from POWER T2M + RH2M (Rothfusz regression), validated
   against PAGASA station heat index.
2. **Trend:** Theil-Sen slope + Mann-Kendall test at alpha = 0.05, per municipality -
   *this is the challenge's "significant".*
3. **Driver ranking:** Random Forest feature importance / SHAP across terrain
   (SRTM elevation, distance to coast), wind (U10M / V10M), canopy (MOD44B),
   land cover (MCD12Q1), LST. Reported as **association, not causation**.
4. **Baseline:** PAGASA heat index bands - Caution 27-32 C / Extreme Caution 33-41 C /
   Danger 42-51 C / Extreme Danger >= 52 C *(verified against PAGASA/DOST notices)*.
5. **Validation:** hold out one station + last 3 years; report bias and RMSE.
6. **Uncertainty:** report Landsat ST_QA band-derived uncertainty per municipality.
7. **Non-significant trends are still reported:** every municipality gets its slope +
   p-value; significance is a flag, not a filter - per the challenge, a finding is
   interesting even when it does not reach the level of significance.

### 6d. LLM role (CORE, with fallback)

An **open-weights LLM runs at build time** to write a narrative bank per
municipality x result bucket into static JSON. The LLM **only renders computed
numbers into plain language - it never generates numbers**. No API key ships in the
client.

- STRETCH: source-cited narration (RAG over NASA/PAGASA docs) - "why this, with a link".
- FALLBACK: templates with an LLM used only offline to polish wording.

## 7. Objective mapping (Relevance)

Official objective *(captured 2026-11-02 from the published challenge statement;
re-confirm against the live page at h0 - page is JS-rendered)*:

> *"Your challenge is to create a tool that can select variables measured by Earth
> science missions or produced by Earth science models, visualize how they change over
> time, and determine what is changing, where it is changing, how much it is changing,
> and if these changes are what scientists call 'significant.'"*

| Objective clause | Our answer | Evidence |
|---|---|---|
| "select variables measured by Earth science missions or produced by Earth science models" | Variable selector across 5-8 NASA variables (LST, HI, tree cover, land cover, exposure; +fire/ESI/precip) - mission products (Landsat, MODIS) + model products (POWER, MERRA-2-derived) | 6a selector |
| "visualize how they change over time" | Time scrubber + per-municipality time series | 4, screen 1 |
| "what is changing, where it is changing, how much it is changing" | Per-municipality trend table: what (variable), where (Region V map), how much (Theil-Sen slope) | 6c-2 |
| "if these changes are what scientists call 'significant'" | Mann-Kendall p-value flag per municipality, alpha = 0.05, on ~45-year series | 6c-2 |
| "a measured variable can trend one way in one region and the opposite way in another, even when the same process drives both" | Driver attribution: which process (canopy loss, terrain, wind, urbanization) drives each municipality's trend | 6c-3 |

**Scoping statement:** drought, wildfire and precipitation appear only as STRETCH
variables where data is already available; carbon-footprint behavioural actions are
**out of scope** - they belong to a different problem than trend detective work.

## 8. Scope tiers

**CORE** (committed, ~34h of 63 available team-hours): Heat index (POWER + PAGASA) /
LST (Landsat C2 L2) / tree cover (MOD44B) / land cover (MCD12Q1) / population exposure
(SEDAC) / 45-yr POWER trend + Mann-Kendall significance / RF driver ranking
(association) / build-time LLM narration (EN + Filipino) / map-first 3-screen PWA /
offline last-view + progress / Supabase accounts + leaderboard / ranked mitigation
list / validated hold-out / variable glossary (EN) / 2 seeded demo examples ("Try
this": one warming municipality, one opposite/flat trend - demonstrates the
challenge's same-process-opposite-direction quote) / static host.

**STRETCH** (viable, costed; each has a lock hour in Sect. 13): Bicolano narration /
canopy mitigation simulator (dCanopy -> dHeat-risk, held-out R2) / FIRMS fire layer /
ECOSTRESS ESI / IMERG precip / barangay-level LST + canopy overlay / exportable progress
award / LDRRMO infographic export / leave-one-station-out CV / whole-province offline
cache / seeded before-after toggle.

**OUT** (named so nobody argues about it at hour 40): Training or fine-tuning an LLM
at runtime / runtime LLM API in the client / LSTM decade forecasting / SMAP soil
moisture / full-offline province / 100 m downscaled heat index / daily tasks /
carbon-footprint actions / global megacity comparison / more variables than Sect. 6a.

## 9. Compliance checklist

- [ ] Submitted before local event's stated close - draft early, revise
- [ ] English
- [ ] Exactly one challenge, named - Be An Earth System Trend Detective!
- [ ] Team of six or fewer, all registered for the same event - OPEN (event name)
- [ ] NASA data used and named specifically - Sect. 6a product IDs
- [ ] Every link resolves in a logged-out private window - test at hour 44
- [ ] No minor's name, voice or likeness in video or materials
- [ ] Third-party assets attributed and licensed - PAGASA, PSA/PSGC boundaries, fonts/icons, FIRMS attribution notice
- [ ] Repo hosts the working prototype - challenge-weekend cut lines **h30 / h42 / h44 are the hard constraints**

**Privacy guard:** accounts store saved history; the leaderboard displays a
user-chosen **handle, never a real name**; no personal data appears in screenshots
or video frames.

## 10. Limitations (all seven, stated in the submission)

1. **LST != heat index.** Satellites measure surface ("skin") temperature - much
   hotter than air. Heat index comes from POWER T2M + RH2M; LST / ECOSTRESS provide
   the spatial pattern. The bridge is quantified (6c-5), not assumed.
2. **Landsat 7 SLC-off.** Post-2003 scan gaps prevent clean pre-2013 LST from L7;
   pre-2013 LST relies on Landsat 5 TM or is excluded (STRETCH).
3. **ECOSTRESS revisit is irregular.** ISS orbit gives uneven, diurnally shifting
   sampling; used for pattern, not trend.
4. **Resolution blind spot.** 30-250 m data cannot resolve individual street trees or
   small green patches; canopy is a macro driver, not a micro one.
5. **POWER's 0.5-degree grid (~55 km).** Adjacent municipalities may share a grid
   cell; PAGASA stations disambiguate. This is why the smallest unit is
   municipality, not barangay.
6. **Cloud contamination.** Optical thermal retrievals over Bicol's cloudy tropics
   give uneven per-municipality sample sizes; results are reported with per-unit
   sample counts.
7. **Association, not causation.** Observational data plus RF/SHAP ranks *drivers*;
   it cannot prove causation. The mitigation list is a prioritisation aid, not a
   proof.

## 11. 48-hour timeline (hard cut lines)

| Hour | Work |
|---|---|
| 0-6 | Data pipeline: POWER pull (~1h) -> PAGASA stations -> GIBS basemap. Lock CORE variable set. |
| 6-14 | Trend engine: Theil-Sen + Mann-Kendall per municipality; map + scrubber. |
| 14-22 | Charts, variable selector, ranking screen; Supabase auth starts behind feature flag. |
| 22-30 | LLM narrative bank build; leaderboard UI. |
| **30 - CUT LINE** | Leaderboard not done -> **drop to local-only progress, no auth.** Do not renegotiate. |
| 30-36 | Validation (hold-out, bias/RMSE); mitigation list; "Try this" seed. |
| 36-42 | PWA manifest / service worker; STRETCH items only if CORE is green. |
| **42 - STRETCH FREEZE** | All STRETCH work stops, shipped or dead. |
| 42-46 | Project page, validation paragraph, video. |
| **44 - VIDEO FALLBACK** | No usable video -> **slides + screen recording + screenshots.** |
| 46-48 | Logged-out link check, submit complete draft, revise until close. |

## 12. Internal award shaping - NOT in the submission

| Tier | Award | Cost to earn |
|---|---|---|
| PRIMARY | **Local Impact** - specificity of place: named LGU, named decision | Already earned; protect it |
| SECOND | **Best Use of Science** - hypothesis, test, control, uncertainty | Requires 6c-5/6 shipped |
| THIRD | **Best Use of Storytelling** - thermometer-vs-body gap is the story | Designed page + video |
| Eligible | Best Use of Data (NASA + PAGASA + multi-mission combo) / Most Inspirational (farmers, LDRRMO) | Low marginal cost |
| Not primary | Best Use of Technology | Crowded; the LLM is not our edge |

Judges assign categories; we shape the throughline, not the claim.

## 13. Decision log (TENTATIVE - lock by the stated hour)

| Axis | Status | Pick | Lock hr |
|---|---|---|---|
| Overall scope | TENTATIVE | Bicol only (Region V municipalities) | h0 |
| LLM role | TENTATIVE | Build-time narrator, static JSON | h0 |
| Variables | TENTATIVE | CORE tier in 6a; STRETCH added only as time allows | h0 |
| Time depth | TENTATIVE | POWER 1981-2025 for trend; satellites 2000-2025 for drivers | h6 |
| Geography | TENTATIVE | Municipality + province roll-up | h6 |
| Prediction | TENTATIVE | RF/SHAP driver ranking; simulator = STRETCH | h14 |
| Backend | TENTATIVE | Static PWA + Supabase Auth/Postgres | h22 |
| Narration language | TENTATIVE | EN + Filipino; Bicolano = STRETCH (needs a native speaker) | h14 |
| Validation | TENTATIVE | Hold-out station + last 3 yrs; CV = STRETCH | h30 |
| Boundaries source | TENTATIVE | PSA/PSGC (official) -> fallback geoBoundaries/OSM | h6 |
| Award throughline | TENTATIVE | Local Impact + Best Use of Science | h30 |
| Pre-event work rule | **CHANGED 2026-11-02** | No-code-before-Nov-14 rescinded - repo is the working prototype (lead decision) | h0 |
| Event name + close time | **OPEN** | - | h0 |
| Challenge statement verbatim | **CAPTURED** | Full text captured 2026-11-02; re-fetch live page at h0 to confirm | h0 |
| POWER daily start year | **OPEN** | Verify (assumed 1981) | h6 |
| Region V PAGASA station list | **OPEN** | Which stations, access route | h6 |
| Exact Region V LGU count | **OPEN** | Count from official source - never estimate | h6 |

---

*Created 2026-10-27 as a pre-event planning document. Updated 2026-11-02: this
repository is the home of the working prototype - the no-code-before-Nov-14 rule
was rescinded by the lead (see Sect. 13 decision log).*
