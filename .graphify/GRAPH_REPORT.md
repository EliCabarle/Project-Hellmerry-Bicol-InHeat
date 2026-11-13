# Graph Report - .  (2026-11-13)

## Corpus Check
- Large corpus: 374 files · ~563,688 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1523 nodes · 2272 edges · 140 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 87 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output
- Edge kinds: contains: 717 · calls: 537 · rationale_for: 342 · method: 310 · imports: 232 · uses: 87 · re_exports: 28 · reads_from: 6 · references: 6 · imports_from: 4 · inherits: 3


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 374 · Candidates: 685
- Excluded: 0 untracked · 12010 ignored · 13 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `7753fcc`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 59 edges
2. `ShadcnInstaller` - 35 edges
3. `TestTailwindConfigGenerator` - 35 edges
4. `DesignSystemGenerator` - 32 edges
5. `TestShadcnInstaller` - 26 edges
6. `search()` - 18 edges
7. `NarrationTest` - 16 edges
8. `CatalogRefreshTest` - 15 edges
9. `TestSearchDomains` - 15 edges
10. `TestDomainDetection` - 15 edges

## Surprising Connections (you probably didn't know these)
- `The exact reproduction from issue #428.` --uses--> `DesignSystemGenerator`  [INFERRED]
  .opencode/skills/ui-ux-pro-max/scripts/tests/test_design_system_mode.py → .opencode/skills/ui-ux-pro-max/scripts/design_system.py
- `Test adding components without shadcn config.` --uses--> `ShadcnInstaller`  [INFERRED]
  .opencode/skills/ui-styling/scripts/tests/test_shadcn_add.py → .opencode/skills/ui-styling/scripts/shadcn_add.py
- `Test adding components that are already installed.` --uses--> `ShadcnInstaller`  [INFERRED]
  .opencode/skills/ui-styling/scripts/tests/test_shadcn_add.py → .opencode/skills/ui-styling/scripts/shadcn_add.py
- `Test adding components with overwrite flag.` --uses--> `ShadcnInstaller`  [INFERRED]
  .opencode/skills/ui-styling/scripts/tests/test_shadcn_add.py → .opencode/skills/ui-styling/scripts/shadcn_add.py
- `Test adding components in dry run mode.` --uses--> `ShadcnInstaller`  [INFERRED]
  .opencode/skills/ui-styling/scripts/tests/test_shadcn_add.py → .opencode/skills/ui-styling/scripts/shadcn_add.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (52): base, IconChevronLeft(), IconChevronRight(), IconLayers(), IconMinus(), IconPause(), IconPlay(), IconPlus() (+44 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (58): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+50 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (8): _daily(), DriverRankingTest, HeatIndexTest, NarrationTest, PagasaValidationTest, Self-checks for the POWER -> trend -> static-JSON pipeline. No network.  pytho, SupabaseRecordTest, TrendTest

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (34): clampIndex(), MunicipalityFinder(), OFFSET_STYLES, OPACITIES, albay, all, [card], counts (+26 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (41): _catalog_date(), _check_app_interface_contract(), _check_catalog_contract(), _check_catalog_summary(), _check_chart_contract(), _check_color_contract(), _check_core_data_contract(), _check_file() (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (21): eventLabel(), questLabel(), LADDER, DAY0, activeStacks(), addDays(), clockFmt, createProgress() (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (31): BM25, calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion(), get_layout_for_goal(), get_typography_for_slide(), _load_csv() (+23 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (7): read_rows(), split_values(), style_identities(), TestGeneratedCatalogContract, TestLandingAndStackContract, TestReasoningContract, TestStyleIdentityContract

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (32): backtest_index(), build_record(), driver_index(), enso_index(), forecast_index(), load_output(), main(), morans_i_index() (+24 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (24): arrow(), esc(), fmtC(), fmtInt(), fmtP(), tooltipHtml(), COUNTRY_BOUNDS, RAW_BOUNDS (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (15): Test adding colors multiple times., Test adding full color palette., Test adding custom fonts., Test adding custom spacing., Test adding custom breakpoints., Test TailwindConfigGenerator class., Test that adding same plugin twice doesn't duplicate., Test plugin recommendations. (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (26): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+18 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (23): cdo_get(), die(), fetch_daily(), find_stations(), heat_index_c(), load_power(), main(), metrics() (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (19): buildNarrativeIndex(), getRegionOutlineStyle(), getRegionStyle(), isBicol(), joinKey(), joinNarratives(), normalizeName(), bicol (+11 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (6): loadMyProfile(), saveHandle(), validateHandle(), supabaseConfigured, SCREENS, URLS

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (15): BM25, detect_domain(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection, Search across all domains and combine results (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (19): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (11): main(), Add custom font families.          Args:             fonts: Dict of font_type, Add custom spacing values.          Args:             spacing: Dict of name:, Add custom breakpoints.          Args:             breakpoints: Dict of name:, Add plugin requirements.          Args:             plugins: List of plugin n, Get plugin recommendations based on configuration.          Returns:, Generate Tailwind CSS configuration files., Validate configuration.          Returns:             Tuple of (valid, messag (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.16
Nodes (15): binIndex(), clamp(), clampYearValue(), DAY_BANDS, TREND_BREAKS, TREND_COLORS, trendColor(), trendLegend() (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (17): build(), danger_band(), _danger_summary(), load_driver_index(), main(), _missing_municipalities(), _p_value(), Trend results -> static `narratives.json` read by the PWA.  Numbers are inject (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (7): arrow(), fmtInt(), fmtP(), fmtSlope(), SigPill(), TrendValue(), LABELS

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (17): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.19
Nodes (5): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (3): TestFixtureValidation, TestMetricMath, TestThresholdGate

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (14): ClimateAnomaly, get_anomalies(), get_heat_for_date(), get_locations(), get_verdant(), _load_power(), MunicipalityLocation, Lazy-load the POWER daily CSV and build per-municipality history arrays. (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (8): createDailyStore(), dailyStore, defaultBaseUrl(), valuesForDay(), COUNTRY_CENTER, geojson, Municipality3DLayer, timelineStore

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (15): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.23
Nodes (9): main(), Add all available shadcn/ui components.          Args:             overwrite:, Handle shadcn/ui component installation., List installed components.          Returns:             Tuple of (success, m, Check if shadcn is initialized in project.          Returns:             True, Get list of already installed components.          Returns:             List, Read shadcn version from project package.json; fall back to a pinned default., Add shadcn/ui components.          Args:             components: List of comp (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.31
Nodes (1): CatalogRefreshTest

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (3): TestAntiPatternGating, TestLuminance, TestModeResolution

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (9): Tests for shadcn_add.py, Test adding components without shadcn config., Test adding components that are already installed., Test adding components with overwrite flag., Test adding components in dry run mode., Test successful component addition., Test ShadcnInstaller class., Test component addition with subprocess error. (+1 more)

### Community 31 - "Community 31"
Cohesion: 0.20
Nodes (14): DARK, dayBase(), featureKey(), findBicol(), getMunicipalityStyle(), HIGHLIGHT, isCity(), loadRegions() (+6 more)

### Community 32 - "Community 32"
Cohesion: 0.20
Nodes (6): DesignSystemGenerator, Generates design system recommendations from aggregated searches., Load reasoning rules from CSV., Find matching reasoning rule for a category., Apply reasoning rules to search results., Select best matching result based on priority keywords.

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (2): _rows(), TestWebStackFreshness

### Community 34 - "Community 34"
Cohesion: 0.23
Nodes (13): build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main(), Generate image using Gemini Nano Banana (native image generation)      Support (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (12): _build_coastline(), _distance_to_coast_km(), _elevation_m(), main(), _municipalities(), _ndvi_mean(), Geographic driver features for the Random Forest / SHAP model (CONCEPT §6c-3)., Mean NDVI (MODIS MOD13Q1, 2020-2024) over the municipality via GEE. (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (12): lisa_local(), load_geometries(), load_trends(), main(), morans_i_global(), queen_weights(), Global and Local Moran's I spatial autocorrelation on heat-index trends.  Load, Local Moran's I (LISA) per location with cluster classification. (+4 more)

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (12): detect_domain(), get_cip_brief(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection, Search across all domains and combine results (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.21
Nodes (6): TABS, addSaved(), filterSaved(), listSaved(), removeSaved(), withRank()

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (1): TestDomainDetection

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (1): TestSearchDomains

### Community 41 - "Community 41"
Cohesion: 0.23
Nodes (7): BinBarChart(), ChartCard(), DriverBarChart(), lgusWidth(), ReadoutContext, useReadout(), YearlyTrendChart()

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (7): dayColor(), feature, IDS, joined, mun, nar, SYNTH_INDEX

### Community 43 - "Community 43"
Cohesion: 0.20
Nodes (6): Generate configuration file content.          Returns:             Configurat, Generate TypeScript configuration., Generate JavaScript configuration., Format plugins array for config.          Validates each plugin name against a, Add indentation to JSON string., Write configuration to file.          Returns:             Tuple of (success,

### Community 44 - "Community 44"
Cohesion: 0.21
Nodes (2): _rows(), TestNativeDesktopStackFreshness

### Community 45 - "Community 45"
Cohesion: 0.18
Nodes (2): read_rows(), TestStyleTaxonomy

### Community 46 - "Community 46"
Cohesion: 0.24
Nodes (10): fetch_municipality(), heat_index_c(), main(), _polygon_centroid(), Pull NASA POWER daily drivers for Bicol Region V municipalities -> daily CSV., Rothfusz heat index (NOAA/NWS) from a T and RH pair, returned in °C.      Roth, One POWER daily request -> one row per day. Raises on bad payload., Compute centroid by averaging all coordinate points in a Polygon/MultiPolygon. (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.35
Nodes (9): MUNIS, binize(), dangerBandCounts(), heatIndexHistogram(), provinceYearlyMean(), topDriverShares(), trendHistogram(), yearOverYearDelta() (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (3): TestBm25CoreBehavior, TestDiagnosticsContracts, TestReasoningMatch

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (9): fetch_power_precip(), load_municipalities(), load_power_heat_2024(), main(), Task 3: Fetch GPM IMERG precipitation (new Earth-system variable) for 114 munici, Mean daily peak heat index per municipality for 2024 from POWER CSV., Fetch daily precipitation from NASA POWER (open, no credentials).      Returns, Municipality list with lat/lon from lst_means.csv (114 municipalities). (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.29
Nodes (9): enhance_prompt(), generate_batch(), generate_logo(), load_env(), main(), Enhance the logo prompt with style and industry modifiers, Generate a logo using Gemini models with image generation      Args:, Generate multiple logo variants with different styles (+1 more)

### Community 51 - "Community 51"
Cohesion: 0.22
Nodes (10): _contrast_ratio(), _derive_dark_palette(), _palette_is_dark(), WCAG relative luminance of a #RRGGBB string, or None if unparseable., True when a colors.csv row's Background is a dark surface., WCAG contrast ratio for two hex colors, or None if either is invalid., Keep product brand tokens while deriving accessible dark surfaces., Pick the highest-ranked palette matching the resolved mode.      Only the dark (+2 more)

### Community 52 - "Community 52"
Cohesion: 0.20
Nodes (7): _filter_anti_patterns_for_mode(), Drop "avoid dark mode" advice once dark mode is the resolved answer., Execute searches across multiple domains., Extract results list from search result dict., Generate complete design system recommendation.          variance/motion/densi, Bucket a 1-10 dial value into its tier config. Returns None if value is None., _resolve_dial()

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (7): Tests for tailwind_config_gen.py, Reduce a generated TS/JS config to a bare assignable object so it can be     ha, Regression guard for the missing-comma bug between the ``theme`` block and, The property preceding ``plugins`` must end with a comma (pure-Python         c, The emitted config parses as valid JS via ``node --check``., _strip_to_object(), TestGeneratedConfigIsValidJs

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (3): read_rows(), TestTextLayoutDataContracts, TestTextLayoutRetrieval

### Community 55 - "Community 55"
Cohesion: 0.31
Nodes (8): load_geo(), load_trends(), main(), mean_wind_speed(), Spatial driver analysis: explain 45-year warming-trend variance with geography., Load per-municipality slopes from trends.json -> DataFrame(name, province, slope, Load geographic features -> DataFrame(name, province, elevation_m, distance_to_c, 45-year mean wind speed per municipality from power_daily_full.csv.      Compu

### Community 56 - "Community 56"
Cohesion: 0.31
Nodes (8): annual_mean(), fetch_oni_text(), main(), parse_oni(), Download and parse NOAA Oceanic Niño Index (ONI) data.  Fetches the official N, Download the ONI ASCII file from NOAA CPC., Parse ONI ASCII text -> list of {year, season, sst, anom}.      Lines look lik, Group ONI anomalies by year and compute annual mean.

### Community 57 - "Community 57"
Cohesion: 0.28
Nodes (5): BM25, BM25 ranking algorithm for text search, Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (4): maxSlope, nar, ranked, rankMunicipalities()

### Community 59 - "Community 59"
Cohesion: 0.36
Nodes (7): load_annual(), main(), Backtest the Random Forest heat-index model across two train/test splits.  Loa, Daily CSV -> annual mean heat index + features per municipality-year., Sign of the linear-regression slope (1 up, -1 down, 0 flat/insufficient)., run_split(), trend_sign()

### Community 60 - "Community 60"
Cohesion: 0.39
Nodes (7): benjamini_hochberg(), block_bootstrap_ci(), main(), Block-bootstrap confidence intervals + FDR for heat-index trends.  Recomputes,, Moving-block bootstrap 95% CI for the Theil-Sen slope.      Resamples contiguo, FDR-adjusted q-values (Benjamini-Hochberg), same length/order as input., theil_sen_slope()

### Community 61 - "Community 61"
Cohesion: 0.36
Nodes (7): annual_means(), main(), pettitt_change_point(), Annual peak heat-index trends per municipality: Theil-Sen + Modified Mann-Kendal, Daily rows -> per municipality-year: mean peak HI, sample size, danger days., Pettitt (1979) single change-point test -> (first year of new regime, p)., trend_for()

### Community 62 - "Community 62"
Cohesion: 0.25
Nodes (7): compare(), metrics(), _normalise_station(), PAGASA hold-out validation: POWER-derived heat index vs station readings.  Rep, bias / rmse / n over a series of POWER-minus-station errors., City of Naga' and 'Naga' must match the same PAGASA station., Inner-join readings onto POWER rows by (station, date).      Returns (matched

### Community 63 - "Community 63"
Cohesion: 0.36
Nodes (7): generate_html(), get_deliverable_info(), get_image_base64(), main(), Convert image to base64 for embedding in HTML, Extract deliverable type from filename and get info, Generate HTML presentation from CIP images

### Community 64 - "Community 64"
Cohesion: 0.46
Nodes (7): and, public, public.set_my_score(), public.user_profiles, someone, the, v_days

### Community 65 - "Community 65"
Cohesion: 0.25
Nodes (4): Initialize generator.          Args:             typescript: If True, generat, Determine default output path., Create base configuration structure., Get default content paths for framework.

### Community 66 - "Community 66"
Cohesion: 0.38
Nodes (6): build_features(), evaluate_model(), main(), Advanced ML Benchmark: daily heat-index prediction with lag/rolling features., Add lag, rolling, and seasonality features per municipality., Run TimeSeriesSplit CV; return mean R², mean RMSE, per-fold lists.

### Community 67 - "Community 67"
Cohesion: 0.38
Nodes (6): area_km2(), load_municipalities(), main(), Population exposure via Google Earth Engine (SEDAC GPWv4.11).  Loads CIESIN/GP, Load GeoJSON features -> list of {name, province, geometry}., Polygon area in km² using UTM zone 51N (Philippines).

### Community 68 - "Community 68"
Cohesion: 0.38
Nodes (6): load_geometries(), load_trends(), main(), Opposite-trends neighbor analysis.  Tests the challenge's explicit claim: "a m, (name, province) -> slope_c_per_year., (name, province) -> shapely geometry.

### Community 69 - "Community 69"
Cohesion: 0.38
Nodes (6): compute_mean_wind_speed(), main(), Volatility Attribution: does NDVI drive volatility more than it drives mean warm, Mean wind speed per municipality from u10m/v10m components., Mean |SHAP| per feature using TreeExplainer on a sample., shap_importances()

### Community 70 - "Community 70"
Cohesion: 0.33
Nodes (5): IconChevronDown(), IconList(), LegendRow(), swatch(), dayLegend()

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (4): nar, ranked, shown, savedKey()

### Community 72 - "Community 72"
Cohesion: 0.33
Nodes (2): readScore(), syncScore()

### Community 73 - "Community 73"
Cohesion: 0.38
Nodes (4): conf, log(), runGuard(), runTsc()

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (5): apply_decision_rules(), parse_decision_rules(), Return deterministic mutations and an audit trail; never execute data., Parse the canonical condition -> action-array representation., _validate_action()

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (2): The exact reproduction from issue #428., TestEndToEndCoherence

### Community 76 - "Community 76"
Cohesion: 0.47
Nodes (5): load_annual_heat(), load_oni(), main(), Correlate NOAA ONI with Bicol heat volatility and mean temperature.  Analysis, Annual mean heat index and annual volatility per year (all municipalities).

### Community 77 - "Community 77"
Cohesion: 0.53
Nodes (5): load_centroids(), main(), mean_lst_image(), Mean MODIS LST (2020-2024) for every Bicol municipality centroid.  GEE may rat, reduce_chunk()

### Community 78 - "Community 78"
Cohesion: 0.53
Nodes (5): load_narratives(), load_trends(), main(), np_polyfit(), Forecast peak heat index to 2030, 2040, 2050 per municipality.  Loads output/t

### Community 79 - "Community 79"
Cohesion: 0.47
Nodes (5): format_brief(), format_results(), main(), Format search results for display, Format CIP brief for display

### Community 80 - "Community 80"
Cohesion: 0.33
Nodes (6): _query_wants_dark(), True when a styles.csv row describes itself as dark-first., True when the query explicitly asks for a dark theme., Resolve the mode the rest of the output has to agree with., _resolve_color_mode(), _style_is_dark_primary()

### Community 81 - "Community 81"
Cohesion: 0.47
Nodes (5): format_context(), format_result(), main(), Format a single search result for display, Format contextual recommendations for display.

### Community 82 - "Community 82"
Cohesion: 0.33
Nodes (1): TestTokenizer

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (1): TestPaletteSelection

### Community 84 - "Community 84"
Cohesion: 0.50
Nodes (4): extract_text(), Task 1: Scrape core text from NASA-related climate/statistical resources.  Use, Return the main visible text of the page, stripped of excess whitespace., scrape()

### Community 85 - "Community 85"
Cohesion: 0.70
Nodes (4): extract_visible_text(), main(), Task 1: Scrape official NASA Space Apps 2026 resources page + key dataset pages., scrape_page()

### Community 86 - "Community 86"
Cohesion: 0.40
Nodes (1): fetchTop10()

### Community 87 - "Community 87"
Cohesion: 0.40
Nodes (4): format_output(), generate_design_brief(), Format results for Claude consumption (token-optimized), Generate a comprehensive logo design brief based on query

### Community 88 - "Community 88"
Cohesion: 0.60
Nodes (3): public.climate_anomalies, public.driver_features, public.municipalities

### Community 89 - "Community 89"
Cohesion: 0.67
Nodes (3): build(), main(), Random-Forest + SHAP driver ranking per municipality (CONCEPT §6c-3).  Reads t

### Community 90 - "Community 90"
Cohesion: 0.50
Nodes (1): provinceList()

### Community 91 - "Community 91"
Cohesion: 0.83
Nodes (3): auth.users, public.profiles, public.progress

### Community 92 - "Community 92"
Cohesion: 0.50
Nodes (1): TestPersistence

### Community 93 - "Community 93"
Cohesion: 0.67
Nodes (1): CMIP6 climate projection for 2050 (NASA NEX-GDDP-CMIP6).  Attempts to load NAS

### Community 94 - "Community 94"
Cohesion: 0.67
Nodes (1): Apply Benjamini-Hochberg FDR correction to Mann-Kendall trend p-values.  Loads

### Community 95 - "Community 95"
Cohesion: 0.67
Nodes (1): Residual diagnostics for the Random Forest heat-index driver model.  Trains a

### Community 96 - "Community 96"
Cohesion: 0.67
Nodes (1): Volatility Engine: prove climate instability is growing faster than average warm

### Community 97 - "Community 97"
Cohesion: 1.00
Nodes (2): auth.users, public.user_saved_municipalities

### Community 98 - "Community 98"
Cohesion: 1.00
Nodes (2): auth.users, public.user_profiles

### Community 99 - "Community 99"
Cohesion: 0.67
Nodes (1): SHELL

### Community 100 - "Community 100"
Cohesion: 0.67
Nodes (2): extract_pptx(), Extract all content from a PowerPoint file.     Returns a list of slide data di

### Community 101 - "Community 101"
Cohesion: 0.67
Nodes (2): format_output(), Format results for Claude consumption (token-optimized)

### Community 102 - "Community 102"
Cohesion: 0.67
Nodes (1): here

### Community 108 - "Community 108"
Cohesion: 1.00
Nodes (1): metadata

### Community 111 - "Community 111"
Cohesion: 1.00
Nodes (1): Initialize installer.          Args:             project_root: Project root d

### Community 112 - "Community 112"
Cohesion: 1.00
Nodes (1): Test component addition when npx is not found.

### Community 113 - "Community 113"
Cohesion: 1.00
Nodes (1): Test adding all components without config.

### Community 114 - "Community 114"
Cohesion: 1.00
Nodes (1): Test adding all components in dry run mode.

### Community 115 - "Community 115"
Cohesion: 1.00
Nodes (1): Test successful addition of all components.

### Community 116 - "Community 116"
Cohesion: 1.00
Nodes (1): Create temporary project structure.

### Community 117 - "Community 117"
Cohesion: 1.00
Nodes (1): Test listing installed components without config.

### Community 118 - "Community 118"
Cohesion: 1.00
Nodes (1): Test listing installed components when none exist.

### Community 119 - "Community 119"
Cohesion: 1.00
Nodes (1): Test listing installed components when they exist.

### Community 120 - "Community 120"
Cohesion: 1.00
Nodes (1): Test initialization with default project root.

### Community 121 - "Community 121"
Cohesion: 1.00
Nodes (1): Test initialization with custom project root.

### Community 122 - "Community 122"
Cohesion: 1.00
Nodes (1): Test initialization with dry run mode.

### Community 123 - "Community 123"
Cohesion: 1.00
Nodes (1): Test checking for existing shadcn config.

### Community 124 - "Community 124"
Cohesion: 1.00
Nodes (1): Test checking for non-existent shadcn config.

### Community 125 - "Community 125"
Cohesion: 1.00
Nodes (1): Test getting installed components when none exist.

### Community 126 - "Community 126"
Cohesion: 1.00
Nodes (1): Test getting installed components when files exist.

### Community 127 - "Community 127"
Cohesion: 1.00
Nodes (1): Test getting installed components without config.

### Community 128 - "Community 128"
Cohesion: 1.00
Nodes (1): Test adding components with empty list.

### Community 129 - "Community 129"
Cohesion: 1.00
Nodes (1): Test validating valid configuration.

### Community 130 - "Community 130"
Cohesion: 1.00
Nodes (1): Test validating config with no content paths.

### Community 131 - "Community 131"
Cohesion: 1.00
Nodes (1): Test validating config with empty theme extensions.

### Community 132 - "Community 132"
Cohesion: 1.00
Nodes (1): Test writing configuration to file.

### Community 133 - "Community 133"
Cohesion: 1.00
Nodes (1): Test initialization for JavaScript config.

### Community 134 - "Community 134"
Cohesion: 1.00
Nodes (1): Test that written config contains expected content.

### Community 135 - "Community 135"
Cohesion: 1.00
Nodes (1): Test writing config to invalid path.

### Community 136 - "Community 136"
Cohesion: 1.00
Nodes (1): Test generating complete TypeScript configuration.

### Community 137 - "Community 137"
Cohesion: 1.00
Nodes (1): Test initialization with different frameworks.

### Community 138 - "Community 138"
Cohesion: 1.00
Nodes (1): Test generating complete JavaScript configuration.

### Community 139 - "Community 139"
Cohesion: 1.00
Nodes (1): Test default output path for TypeScript.

### Community 140 - "Community 140"
Cohesion: 1.00
Nodes (1): Test default output path for JavaScript.

### Community 141 - "Community 141"
Cohesion: 1.00
Nodes (1): Test custom output path.

### Community 142 - "Community 142"
Cohesion: 1.00
Nodes (1): Test base configuration structure.

### Community 143 - "Community 143"
Cohesion: 1.00
Nodes (1): Test default content paths for React.

### Community 144 - "Community 144"
Cohesion: 1.00
Nodes (1): Test default content paths for Next.js.

### Community 145 - "Community 145"
Cohesion: 1.00
Nodes (1): Test default content paths for Vue.

### Community 146 - "Community 146"
Cohesion: 1.00
Nodes (1): Test adding custom colors.

## Knowledge Gaps
- **360 isolated node(s):** `metadata`, `conf`, `Resolve token reference like {primitive.color.ocean-blue.500} to hex value.`, `Load colors from assets/design-tokens.json for overlay gradients.      Resolve`, `Load background configuration from CSV.` (+355 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 28`** (1 nodes): `CatalogRefreshTest`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `_rows()`, `TestWebStackFreshness`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `TestDomainDetection`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `TestSearchDomains`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `_rows()`, `TestNativeDesktopStackFreshness`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `read_rows()`, `TestStyleTaxonomy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (2 nodes): `readScore()`, `syncScore()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (2 nodes): `The exact reproduction from issue #428.`, `TestEndToEndCoherence`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `TestTokenizer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `TestPaletteSelection`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `fetchTop10()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `provinceList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `TestPersistence`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `CMIP6 climate projection for 2050 (NASA NEX-GDDP-CMIP6).  Attempts to load NAS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `Apply Benjamini-Hochberg FDR correction to Mann-Kendall trend p-values.  Loads`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (1 nodes): `Residual diagnostics for the Random Forest heat-index driver model.  Trains a`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `Volatility Engine: prove climate instability is growing faster than average warm`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (2 nodes): `auth.users`, `public.user_saved_municipalities`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (2 nodes): `auth.users`, `public.user_profiles`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (1 nodes): `SHELL`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (2 nodes): `extract_pptx()`, `Extract all content from a PowerPoint file.     Returns a list of slide data di`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (2 nodes): `format_output()`, `Format results for Claude consumption (token-optimized)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (1 nodes): `here`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (1 nodes): `metadata`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (1 nodes): `Initialize installer.          Args:             project_root: Project root d`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (1 nodes): `Test component addition when npx is not found.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (1 nodes): `Test adding all components without config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (1 nodes): `Test adding all components in dry run mode.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (1 nodes): `Test successful addition of all components.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 116`** (1 nodes): `Create temporary project structure.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 117`** (1 nodes): `Test listing installed components without config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 118`** (1 nodes): `Test listing installed components when none exist.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 119`** (1 nodes): `Test listing installed components when they exist.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (1 nodes): `Test initialization with default project root.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 121`** (1 nodes): `Test initialization with custom project root.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 122`** (1 nodes): `Test initialization with dry run mode.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 123`** (1 nodes): `Test checking for existing shadcn config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 124`** (1 nodes): `Test checking for non-existent shadcn config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 125`** (1 nodes): `Test getting installed components when none exist.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 126`** (1 nodes): `Test getting installed components when files exist.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 127`** (1 nodes): `Test getting installed components without config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 128`** (1 nodes): `Test adding components with empty list.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 129`** (1 nodes): `Test validating valid configuration.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 130`** (1 nodes): `Test validating config with no content paths.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (1 nodes): `Test validating config with empty theme extensions.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 132`** (1 nodes): `Test writing configuration to file.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (1 nodes): `Test initialization for JavaScript config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 134`** (1 nodes): `Test that written config contains expected content.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (1 nodes): `Test writing config to invalid path.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (1 nodes): `Test generating complete TypeScript configuration.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 137`** (1 nodes): `Test initialization with different frameworks.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 138`** (1 nodes): `Test generating complete JavaScript configuration.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (1 nodes): `Test default output path for TypeScript.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 140`** (1 nodes): `Test default output path for JavaScript.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 141`** (1 nodes): `Test custom output path.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 142`** (1 nodes): `Test base configuration structure.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 143`** (1 nodes): `Test default content paths for React.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 144`** (1 nodes): `Test default content paths for Next.js.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 145`** (1 nodes): `Test default content paths for Vue.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 146`** (1 nodes): `Test adding custom colors.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `joinKey()` connect `Community 13` to `Community 20`, `Community 31`, `Community 38`, `Community 3`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `DesignSystemGenerator` connect `Community 32` to `Community 11`, `Community 52`, `Community 48`, `Community 39`, `Community 92`, `Community 40`, `Community 82`, `Community 7`, `Community 75`, `Community 29`, `Community 83`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `featureKey()` connect `Community 31` to `Community 0`, `Community 13`, `Community 25`, `Community 3`, `Community 9`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 38 inferred relationships involving `TailwindConfigGenerator` (e.g. with `Test adding colors multiple times.` and `Test adding full color palette.`) actually correct?**
  _`TailwindConfigGenerator` has 38 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `ShadcnInstaller` (e.g. with `Test adding components without shadcn config.` and `Test adding components that are already installed.`) actually correct?**
  _`ShadcnInstaller` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `DesignSystemGenerator` (e.g. with `TestBm25CoreBehavior` and `TestDiagnosticsContracts`) actually correct?**
  _`DesignSystemGenerator` has 17 INFERRED edges - model-reasoned connections that need verification._
- **What connects `metadata`, `conf`, `Resolve token reference like {primitive.color.ocean-blue.500} to hex value.` to the rest of the system?**
  _360 weakly-connected nodes found - possible documentation gaps or missing edges._