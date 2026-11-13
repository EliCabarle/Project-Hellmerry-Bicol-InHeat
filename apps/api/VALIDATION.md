# Validation — Bicol In-Heat

Validation approach for the Bicol In-Heat heat-index trend pipeline (NASA Space Apps 2026, "Be An Earth System Trend Detective!").

## 1. What we validate

- **Heat-index trend** per municipality: annual mean daily peak heat index (Rothfusz on NASA POWER T2M_MAX + dew-point-derived RH) over 1981–2025.
- **Trend statistics:** Theil-Sen slope with 95% CI, Hamed-Rao Modified Mann-Kendall test (autocorrelation-corrected), Pettitt change-point test.
- **Driver ranking:** Random Forest + SHAP feature importance (association, not causation).
- **Ground-truth agreement:** POWER-derived heat index vs. independent station/satellite observations (bias + RMSE).

## 2. Statistical rigour

- Significance (α = 0.05) is a **flag, not a filter**: non-significant trends are still reported with their p-value and CI.
- **Multiple-testing correction:** Benjamini-Hochberg FDR q-values computed across all 114 municipalities (province-qualified) to control the false-discovery rate from running 114 trend tests.
- **Honest confidence intervals:** moving-block bootstrap (5-year blocks) 95% CI for the Theil-Sen slope, which is wider than the iid analytical CI because annual climate series are autocorrelated. Verified in `output/bootstrap_ci_results.json`.
- Results always carry sample size (n years, n days) and per-municipality cloud/sample counts.
- Drivers are reported as **association, not causation** (RF/SHAP).

## 2b. Ground-truth validation (NOAA CDO)

Validated against NOAA CDO station GHCND:RP000098444 (LEGASPI, RP, Albay). RMSE = 4.0127°C, Bias = -3.3184°C (2024, n=197).
Validated against NOAA CDO station GHCND:RP000098444 (LEGASPI, RP, Camarines Sur). RMSE = 3.8676°C, Bias = -3.0351°C (2024, n=197).
Validated against NOAA CDO station GHCND:RPM00098446 (VIRAC, RP, Catanduanes). RMSE = 3.7383°C, Bias = -3.2445°C (2024, n=260).

## 3. Hold-out validation (PAGASA)

Per the pipeline guardrails: hold out one PAGASA station plus the last 3 years; report **bias** (POWER − station) and **RMSE**. Match on station name, date, and province using the province-qualified join key (`joinKey(name, province)`) so that homonyms ("Bato" appears in two Region V provinces; "San Fernando" in two) are never silently pooled — an ambiguous station name is refused outright rather than merged.

Logic lives in `apps/api/validate_pagasa.py` (`compare`, `metrics`). Wiring it to a live PAGASA station file is tracked as CORE work (PAGASA access route / Region V station list to be confirmed).

## 4. Alignment with NASA Space Apps 2026 Resources

Our methodology was checked against the official NASA-aligned resources scraped for this challenge (see `output/nasa_resources_text.json`):

- **NASA POWER** — primary driver of the heat index (daily T2M_MAX, T2M_MIN, T2MDEW, 1981–2025). Confirmed start year 1981-01-01. Heat index is derived (Rothfusz), not a native POWER product. Cited in `narratives.json` sources.
- **Giovanni** (https://giovanni.gsfc.nasa.gov/giovanni/) — NASA's "Bridge Between Data and Science" (v4.40) for visualising selected geophysical parameters by date range and region (bounding box or shape). Offers precipitation and temperature products relevant to Region V; full access via Earthdata Login. Identified as a source for additional Earth-system variables (precipitation, temperature) to extend the driver model beyond wind + geography.
- **AppEEARS** (https://appeears.earthdatacloud.nasa.gov/) — Application for Extracting and Exploring Analysis-Ready Samples. Point (coordinates) and area (polygon) subsetting of geospatial datasets across NASA archives, returning data values + quality values with summary statistics. Offers LST (MODIS/Landsat), soil moisture, precipitation, vegetation/land cover. Requires Earthdata Login (server-side only). Identified as the path to cross-reference GEE-derived LST and to add soil moisture / actual precipitation to the driver feature set.
- **Climate Data Online — CDO** (https://www.ncei.noaa.gov/cdo-web/) — NCEI archive of global historical weather/climate data: quality-controlled daily/monthly/seasonal/yearly temperature, precipitation, wind, degree days, radar, 30-year Climate Normals, discoverable by station/city/ZIP. Programmatic API at ncei.noaa.gov/cdo-web/api/v2/ (requires an access token). Identified as independent ground truth for station temperature to validate the POWER-derived heat index (bias/RMSE).
- **GPM IMERG precipitation** (NASA) — targeted Earth-system variable for precipitation (water cycle). Attempted via NASA GES DISC; requires Earthdata Login credentials which are not configured, so fell back to NASA POWER PRECTOTCORR (open, no credentials). Added annual 2024 precipitation for 113/114 municipalities; regionally correlates with heat index at r = -0.3790 (drier → hotter).

## 4b. Alignment with Official NASA Space Apps 2026 Resources

The following official NASA Space Apps 2026 challenge resources were scraped (see `output/official_resources_scraped.json`) and cross-referenced against our pipeline:

- **NASA POWER** — air temperature (T2M, T2M_MAX, T2M_MIN), dew point (T2MDEW), humidity (RH2M), wind (U10M, V10M). Primary driver of the Rothfusz-derived heat index, 1981–2025.
- **Giovanni** — NASA's "Bridge Between Data and Science" web portal for numerous geophysical variables (temperature, precipitation, aerosols, etc.) by date range and region. Source for precipitation discovery; full access via Earthdata Login.
- **AppEEARS** — Application for Extracting and Exploring Analysis-Ready Samples. Point/area subsetting of geospatial datasets (LST, soil moisture, precipitation, land cover, vegetation). Requires Earthdata Login. Identified path to cross-reference GEE-derived LST and add soil moisture/precipitation.
- **Climate Data Online (CDO)** — NOAA NCEI archive of station temperature/precipitation. Used for independent ground-truth validation (bias/RMSE) against POWER-derived heat index.
- **KNMI Climate Explorer** — WMO Regional Climate Centre tool with surface temperature, precipitation, reanalysis, CMIP data; statistical-method reference.
- **NIST Statistical Significance Guide** — p-values, confidence intervals, multiple-testing corrections. Basis for our FDR correction and block-bootstrap CI rigour.
- **Nature trend-detection article (s41598-021-97581-7)** — best-practice recommendations for trend detection in climate time series.

## 5. Data sources cited

- NASA POWER: https://power.larc.nasa.gov/ (T2M_MAX, T2M_MIN, T2MDEW; daily means; ~0.5° grid)
- PAGASA: station observations (hold-out validation; access route to be confirmed)
- geoBoundaries adm3 (CC BY 4.0): 114 municipality boundaries (interim boundary source pending official PSA/PSGC confirmation)
- KNMI Climate Explorer and NIST Engineering Statistics Handbook: statistical-method reference

## 6. Known limitations

- Municipality is the smallest unit: POWER's ~0.5° grid (~55 km) cannot resolve barangays.
- Heat index is derived, not measured; bridge to satellite LST quantified by hold-out validation, not assumed.
- Landsat 7 post-2003 SLC-off gaps mean no clean pre-2013 LST from L7.
- CDO validation ran against GHCND stations for Legazpi, Naga, and Virac (2024); see `output/cdo_validation.json`. AppEEARS / Giovanni pulls still require Earthdata Login credentials.
- Exact Region V LGU count and PAGASA station list remain open facts (verify against official source; 114 is the current geoBoundaries fallback, not the published number).
