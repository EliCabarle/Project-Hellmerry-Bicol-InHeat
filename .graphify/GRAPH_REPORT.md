# Graph Report - .  (2026-11-13)

## Corpus Check
- Large corpus: 366 files · ~554,544 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1477 nodes · 2222 edges · 135 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 87 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output
- Edge kinds: contains: 701 · calls: 526 · rationale_for: 319 · method: 310 · imports: 232 · uses: 87 · re_exports: 28 · reads_from: 6 · references: 6 · imports_from: 4 · inherits: 3


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 366 · Candidates: 517
- Excluded: 156 untracked · 12010 ignored · 13 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `d66b13b`
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

### Community 103 - "Community 103"
Cohesion: 1.00
Nodes (1): metadata

### Community 70 - "Community 70"
Cohesion: 0.38
Nodes (4): conf, log(), runTsc(), runGuard()

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (17): resolve_token_reference(), load_brand_colors(), load_backgrounds_config(), get_overlay_css(), get_curated_images(), get_pexels_search_url(), get_background_image(), generate_css_for_background() (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (19): _e(), _safe_url(), generate_title_slide(), generate_problem_slide(), generate_solution_slide(), generate_metrics_slide(), generate_chart_slide(), generate_testimonial_slide() (+11 more)

### Community 77 - "Community 77"
Cohesion: 0.47
Nodes (5): format_result(), format_context(), main(), Format a single search result for display, Format contextual recommendations for display.

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (31): BM25, _load_csv(), _search_csv(), detect_domain(), search(), search_all(), _load_decision_csv(), get_layout_for_goal() (+23 more)

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (12): _load_csv(), _search_csv(), detect_domain(), search(), search_all(), get_cip_brief(), Load CSV and return list of dicts, Core search function using BM25 (+4 more)

### Community 56 - "Community 56"
Cohesion: 0.28
Nodes (5): BM25, BM25 ranking algorithm for text search, Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query

### Community 34 - "Community 34"
Cohesion: 0.23
Nodes (13): load_logo_image(), load_env(), build_cip_prompt(), generate_with_nano_banana(), generate_cip_set(), check_logo_required(), main(), Load logo image using PIL for Gemini image editing (+5 more)

### Community 62 - "Community 62"
Cohesion: 0.36
Nodes (7): get_image_base64(), get_deliverable_info(), generate_html(), main(), Convert image to base64 for embedding in HTML, Extract deliverable type from filename and get info, Generate HTML presentation from CIP images

### Community 75 - "Community 75"
Cohesion: 0.47
Nodes (5): format_results(), format_brief(), main(), Format search results for display, Format CIP brief for display

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (15): load_env(), extract_svgs(), apply_color(), apply_viewbox_size(), generate_icon(), generate_batch(), generate_sizes(), main() (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (15): BM25, _load_csv(), _search_csv(), detect_domain(), search(), search_all(), BM25 ranking algorithm for text search, Lowercase, split, remove punctuation, filter short words (+7 more)

### Community 50 - "Community 50"
Cohesion: 0.29
Nodes (9): load_env(), enhance_prompt(), generate_logo(), generate_batch(), main(), Load .env files in priority order, Enhance the logo prompt with style and industry modifiers, Generate a logo using Gemini models with image generation      Args: (+1 more)

### Community 83 - "Community 83"
Cohesion: 0.40
Nodes (4): format_output(), generate_design_brief(), Format results for Claude consumption (token-optimized), Generate a comprehensive logo design brief based on query

### Community 95 - "Community 95"
Cohesion: 0.67
Nodes (2): extract_pptx(), Extract all content from a PowerPoint file.     Returns a list of slide data di

### Community 27 - "Community 27"
Cohesion: 0.23
Nodes (9): ShadcnInstaller, main(), Handle shadcn/ui component installation., Check if shadcn is initialized in project.          Returns:             True, Get list of already installed components.          Returns:             List, Read shadcn version from project package.json; fall back to a pinned default., Add shadcn/ui components.          Args:             components: List of comp, Add all available shadcn/ui components.          Args:             overwrite: (+1 more)

### Community 106 - "Community 106"
Cohesion: 1.00
Nodes (1): Initialize installer.          Args:             project_root: Project root d

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (11): TailwindConfigGenerator, main(), Generate Tailwind CSS configuration files., Add custom colors to theme.          Args:             colors: Dict of color_, Add full color palette (50-950 shades) for a base color.          Args:, Add custom font families.          Args:             fonts: Dict of font_type, Add custom spacing values.          Args:             spacing: Dict of name:, Add custom breakpoints.          Args:             breakpoints: Dict of name: (+3 more)

### Community 64 - "Community 64"
Cohesion: 0.25
Nodes (4): Initialize generator.          Args:             typescript: If True, generat, Determine default output path., Create base configuration structure., Get default content paths for framework.

### Community 43 - "Community 43"
Cohesion: 0.20
Nodes (6): Generate configuration file content.          Returns:             Configurat, Generate TypeScript configuration., Generate JavaScript configuration., Format plugins array for config.          Validates each plugin name against a, Add indentation to JSON string., Write configuration to file.          Returns:             Tuple of (success,

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (9): TestShadcnInstaller, Tests for shadcn_add.py, Test ShadcnInstaller class., Test adding components without shadcn config., Test adding components that are already installed., Test adding components with overwrite flag., Test adding components in dry run mode., Test successful component addition. (+1 more)

### Community 111 - "Community 111"
Cohesion: 1.00
Nodes (1): Create temporary project structure.

### Community 115 - "Community 115"
Cohesion: 1.00
Nodes (1): Test initialization with default project root.

### Community 116 - "Community 116"
Cohesion: 1.00
Nodes (1): Test initialization with custom project root.

### Community 117 - "Community 117"
Cohesion: 1.00
Nodes (1): Test initialization with dry run mode.

### Community 118 - "Community 118"
Cohesion: 1.00
Nodes (1): Test checking for existing shadcn config.

### Community 119 - "Community 119"
Cohesion: 1.00
Nodes (1): Test checking for non-existent shadcn config.

### Community 120 - "Community 120"
Cohesion: 1.00
Nodes (1): Test getting installed components when none exist.

### Community 121 - "Community 121"
Cohesion: 1.00
Nodes (1): Test getting installed components when files exist.

### Community 122 - "Community 122"
Cohesion: 1.00
Nodes (1): Test getting installed components without config.

### Community 123 - "Community 123"
Cohesion: 1.00
Nodes (1): Test adding components with empty list.

### Community 107 - "Community 107"
Cohesion: 1.00
Nodes (1): Test component addition when npx is not found.

### Community 108 - "Community 108"
Cohesion: 1.00
Nodes (1): Test adding all components without config.

### Community 109 - "Community 109"
Cohesion: 1.00
Nodes (1): Test adding all components in dry run mode.

### Community 110 - "Community 110"
Cohesion: 1.00
Nodes (1): Test successful addition of all components.

### Community 112 - "Community 112"
Cohesion: 1.00
Nodes (1): Test listing installed components without config.

### Community 113 - "Community 113"
Cohesion: 1.00
Nodes (1): Test listing installed components when none exist.

### Community 114 - "Community 114"
Cohesion: 1.00
Nodes (1): Test listing installed components when they exist.

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (7): _strip_to_object(), TestGeneratedConfigIsValidJs, Tests for tailwind_config_gen.py, Reduce a generated TS/JS config to a bare assignable object so it can be     ha, Regression guard for the missing-comma bug between the ``theme`` block and, The property preceding ``plugins`` must end with a comma (pure-Python         c, The emitted config parses as valid JS via ``node --check``.

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (15): TestTailwindConfigGenerator, Test TailwindConfigGenerator class., Test initialization with default settings., Test adding colors multiple times., Test adding full color palette., Test adding custom fonts., Test adding custom spacing., Test adding custom breakpoints. (+7 more)

### Community 128 - "Community 128"
Cohesion: 1.00
Nodes (1): Test initialization for JavaScript config.

### Community 132 - "Community 132"
Cohesion: 1.00
Nodes (1): Test initialization with different frameworks.

### Community 134 - "Community 134"
Cohesion: 1.00
Nodes (1): Test default output path for TypeScript.

### Community 135 - "Community 135"
Cohesion: 1.00
Nodes (1): Test default output path for JavaScript.

### Community 136 - "Community 136"
Cohesion: 1.00
Nodes (1): Test custom output path.

### Community 137 - "Community 137"
Cohesion: 1.00
Nodes (1): Test base configuration structure.

### Community 138 - "Community 138"
Cohesion: 1.00
Nodes (1): Test default content paths for React.

### Community 139 - "Community 139"
Cohesion: 1.00
Nodes (1): Test default content paths for Next.js.

### Community 140 - "Community 140"
Cohesion: 1.00
Nodes (1): Test default content paths for Vue.

### Community 141 - "Community 141"
Cohesion: 1.00
Nodes (1): Test adding custom colors.

### Community 124 - "Community 124"
Cohesion: 1.00
Nodes (1): Test validating valid configuration.

### Community 125 - "Community 125"
Cohesion: 1.00
Nodes (1): Test validating config with no content paths.

### Community 126 - "Community 126"
Cohesion: 1.00
Nodes (1): Test validating config with empty theme extensions.

### Community 127 - "Community 127"
Cohesion: 1.00
Nodes (1): Test writing configuration to file.

### Community 129 - "Community 129"
Cohesion: 1.00
Nodes (1): Test that written config contains expected content.

### Community 130 - "Community 130"
Cohesion: 1.00
Nodes (1): Test writing config to invalid path.

### Community 131 - "Community 131"
Cohesion: 1.00
Nodes (1): Test generating complete TypeScript configuration.

### Community 133 - "Community 133"
Cohesion: 1.00
Nodes (1): Test generating complete JavaScript configuration.

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (58): _normalize(), BM25, _file_signature(), _load_csv_snapshot(), _load_csv(), _get_bm25(), _query_coverage(), _search_csv_detailed() (+50 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (26): hex_to_ansi(), ansi_ljust(), section_header(), format_ascii_box(), format_markdown(), generate_design_system(), safe_slug(), _write_persisted_file() (+18 more)

### Community 52 - "Community 52"
Cohesion: 0.20
Nodes (7): _resolve_dial(), _filter_anti_patterns_for_mode(), Bucket a 1-10 dial value into its tier config. Returns None if value is None., Drop "avoid dark mode" advice once dark mode is the resolved answer., Execute searches across multiple domains., Extract results list from search result dict., Generate complete design system recommendation.          variance/motion/densi

### Community 51 - "Community 51"
Cohesion: 0.22
Nodes (10): _relative_luminance(), _palette_is_dark(), _contrast_ratio(), _derive_dark_palette(), _select_palette_for_mode(), WCAG relative luminance of a #RRGGBB string, or None if unparseable., True when a colors.csv row's Background is a dark surface., WCAG contrast ratio for two hex colors, or None if either is invalid. (+2 more)

### Community 76 - "Community 76"
Cohesion: 0.33
Nodes (6): _style_is_dark_primary(), _query_wants_dark(), _resolve_color_mode(), True when a styles.csv row describes itself as dark-first., True when the query explicitly asks for a dark theme., Resolve the mode the rest of the output has to agree with.

### Community 32 - "Community 32"
Cohesion: 0.20
Nodes (6): DesignSystemGenerator, Generates design system recommendations from aggregated searches., Load reasoning rules from CSV., Find matching reasoning rule for a category., Apply reasoning rules to search results., Select best matching result based on priority keywords.

### Community 71 - "Community 71"
Cohesion: 0.33
Nodes (5): parse_decision_rules(), _validate_action(), apply_decision_rules(), Parse the canonical condition -> action-array representation., Return deterministic mutations and an audit trail; never execute data.

### Community 96 - "Community 96"
Cohesion: 0.67
Nodes (2): format_output(), Format results for Claude consumption (token-optimized)

### Community 28 - "Community 28"
Cohesion: 0.31
Nodes (1): CatalogRefreshTest

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (3): TestBm25CoreBehavior, TestReasoningMatch, TestDiagnosticsContracts

### Community 78 - "Community 78"
Cohesion: 0.33
Nodes (1): TestTokenizer

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (1): TestSearchDomains

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (1): TestDomainDetection

### Community 88 - "Community 88"
Cohesion: 0.50
Nodes (1): TestPersistence

### Community 22 - "Community 22"
Cohesion: 0.19
Nodes (5): read_rows(), TestSemanticColors, TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (7): read_rows(), split_values(), style_identities(), TestStyleIdentityContract, TestReasoningContract, TestLandingAndStackContract, TestGeneratedCatalogContract

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (3): TestLuminance, TestModeResolution, TestAntiPatternGating

### Community 79 - "Community 79"
Cohesion: 0.33
Nodes (1): TestPaletteSelection

### Community 72 - "Community 72"
Cohesion: 0.29
Nodes (2): TestEndToEndCoherence, The exact reproduction from issue #428.

### Community 44 - "Community 44"
Cohesion: 0.21
Nodes (2): _rows(), TestNativeDesktopStackFreshness

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (3): TestMetricMath, TestFixtureValidation, TestThresholdGate

### Community 45 - "Community 45"
Cohesion: 0.18
Nodes (2): read_rows(), TestStyleTaxonomy

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (3): read_rows(), TestTextLayoutRetrieval, TestTextLayoutDataContracts

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (2): _rows(), TestWebStackFreshness

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (41): _relative_luminance(), contrast_ratio(), _read_rows(), _check_file(), _split(), _valid_date(), _valid_confidence(), _check_style_contract() (+33 more)

### Community 58 - "Community 58"
Cohesion: 0.36
Nodes (7): load_annual(), trend_sign(), run_split(), main(), Backtest the Random Forest heat-index model across two train/test splits.  Loa, Daily CSV -> annual mean heat index + features per municipality-year., Sign of the linear-regression slope (1 up, -1 down, 0 flat/insufficient).

### Community 59 - "Community 59"
Cohesion: 0.39
Nodes (7): theil_sen_slope(), block_bootstrap_ci(), benjamini_hochberg(), main(), Block-bootstrap confidence intervals + FDR for heat-index trends.  Recomputes,, Moving-block bootstrap 95% CI for the Theil-Sen slope.      Resamples contiguo, FDR-adjusted q-values (Benjamini-Hochberg), same length/order as input.

### Community 85 - "Community 85"
Cohesion: 0.67
Nodes (3): build(), main(), Random-Forest + SHAP driver ranking per municipality (CONCEPT §6c-3).  Reads t

### Community 55 - "Community 55"
Cohesion: 0.31
Nodes (8): load_trends(), load_geo(), mean_wind_speed(), main(), Spatial driver analysis: explain 45-year warming-trend variance with geography., Load per-municipality slopes from trends.json -> DataFrame(name, province, slope, Load geographic features -> DataFrame(name, province, elevation_m, distance_to_c, 45-year mean wind speed per municipality from power_daily_full.csv.      Compu

### Community 60 - "Community 60"
Cohesion: 0.36
Nodes (7): annual_means(), pettitt_change_point(), trend_for(), main(), Annual peak heat-index trends per municipality: Theil-Sen + Modified Mann-Kendal, Daily rows -> per municipality-year: mean peak HI, sample size, danger days., Pettitt (1979) single change-point test -> (first year of new regime, p).

### Community 89 - "Community 89"
Cohesion: 0.67
Nodes (1): CMIP6 climate projection for 2050 (NASA NEX-GDDP-CMIP6).  Attempts to load NAS

### Community 90 - "Community 90"
Cohesion: 0.67
Nodes (1): Apply Benjamini-Hochberg FDR correction to Mann-Kendall trend p-values.  Loads

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (23): die(), cdo_get(), find_stations(), fetch_daily(), rh_from_dewpoint(), heat_index_c(), station_heat_index(), _norm() (+15 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (12): _municipalities(), _build_coastline(), _distance_to_coast_km(), _elevation_m(), _ndvi_mean(), main(), Geographic driver features for the Random Forest / SHAP model (CONCEPT §6c-3)., Load features -> list of {name, province, geometry} dicts. (+4 more)

### Community 73 - "Community 73"
Cohesion: 0.53
Nodes (5): mean_lst_image(), load_centroids(), reduce_chunk(), main(), Mean MODIS LST (2020-2024) for every Bicol municipality centroid.  GEE may rat

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (9): _session(), fetch_power_precip(), load_municipalities(), load_power_heat_2024(), main(), Task 3: Fetch GPM IMERG precipitation (new Earth-system variable) for 114 munici, Fetch daily precipitation from NASA POWER (open, no credentials).      Returns, Municipality list with lat/lon from lst_means.csv (114 municipalities). (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.38
Nodes (6): load_municipalities(), area_km2(), main(), Population exposure via Google Earth Engine (SEDAC GPWv4.11).  Loads CIESIN/GP, Load GeoJSON features -> list of {name, province, geometry}., Polygon area in km² using UTM zone 51N (Philippines).

### Community 46 - "Community 46"
Cohesion: 0.24
Nodes (10): _polygon_centroid(), rh_from_dewpoint(), heat_index_c(), fetch_municipality(), main(), Pull NASA POWER daily drivers for Bicol Region V municipalities -> daily CSV., Compute centroid by averaging all coordinate points in a Polygon/MultiPolygon., Relative humidity (%) at temperature t given dew point td (Magnus formula). (+2 more)

### Community 74 - "Community 74"
Cohesion: 0.53
Nodes (5): load_trends(), load_narratives(), main(), np_polyfit(), Forecast peak heat index to 2030, 2040, 2050 per municipality.  Loads output/t

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (17): slugify(), danger_band(), _slope(), _p_value(), render_narration(), _danger_summary(), build(), _missing_municipalities() (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (14): MunicipalityLocation, BaseModel, ClimateAnomaly, VerdantFeature, get_locations(), get_anomalies(), get_verdant(), _load_power() (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (12): load_trends(), load_geometries(), queen_weights(), morans_i_global(), lisa_local(), main(), Global and Local Moran's I spatial autocorrelation on heat-index trends.  Load, (name, province) -> slope_c_per_year. (+4 more)

### Community 66 - "Community 66"
Cohesion: 0.38
Nodes (6): load_trends(), load_geometries(), main(), Opposite-trends neighbor analysis.  Tests the challenge's explicit claim: "a m, (name, province) -> slope_c_per_year., (name, province) -> shapely geometry.

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (20): load_output(), driver_index(), spatial_index(), trends_index(), backtest_index(), forecast_index(), population_index(), spatial_metadata() (+12 more)

### Community 91 - "Community 91"
Cohesion: 0.67
Nodes (1): Residual diagnostics for the Random Forest heat-index driver model.  Trains a

### Community 80 - "Community 80"
Cohesion: 0.50
Nodes (4): extract_text(), scrape(), Task 1: Scrape core text from NASA-related climate/statistical resources.  Use, Return the main visible text of the page, stripped of excess whitespace.

### Community 81 - "Community 81"
Cohesion: 0.70
Nodes (4): extract_visible_text(), scrape_page(), main(), Task 1: Scrape official NASA Space Apps 2026 resources page + key dataset pages.

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (8): _daily(), HeatIndexTest, TrendTest, NarrationTest, DriverRankingTest, PagasaValidationTest, SupabaseRecordTest, Self-checks for the POWER -> trend -> static-JSON pipeline. No network.  pytho

### Community 61 - "Community 61"
Cohesion: 0.25
Nodes (7): metrics(), _normalise_station(), compare(), PAGASA hold-out validation: POWER-derived heat index vs station readings.  Rep, bias / rmse / n over a series of POWER-minus-station errors., City of Naga' and 'Naga' must match the same PAGASA station., Inner-join readings onto POWER rows by (station, date).      Returns (matched

### Community 94 - "Community 94"
Cohesion: 0.67
Nodes (1): SHELL

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (6): SCREENS, validateHandle(), loadMyProfile(), saveHandle(), supabaseConfigured, URLS

### Community 97 - "Community 97"
Cohesion: 0.67
Nodes (1): here

### Community 57 - "Community 57"
Cohesion: 0.22
Nodes (4): rankMunicipalities(), nar, ranked, maxSlope

### Community 38 - "Community 38"
Cohesion: 0.21
Nodes (6): TABS, withRank(), filterSaved(), listSaved(), addSaved(), removeSaved()

### Community 18 - "Community 18"
Cohesion: 0.16
Nodes (15): DANGER_BAND_COLORS, YEAR_BREAKS, YEAR_COLORS, TREND_BREAKS, TREND_COLORS, DAY_BANDS, clamp(), binIndex() (+7 more)

### Community 47 - "Community 47"
Cohesion: 0.35
Nodes (9): yearsOf(), provinceYearlyMean(), yearOverYearDelta(), binize(), heatIndexHistogram(), trendHistogram(), dangerBandCounts(), topDriverShares() (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.23
Nodes (7): ReadoutContext, useReadout(), ChartCard(), YearlyTrendChart(), BinBarChart(), DriverBarChart(), lgusWidth()

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (7): fmtInt(), fmtP(), arrow(), fmtSlope(), SigPill(), TrendValue(), LABELS

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (21): questLabel(), eventLabel(), LADDER, progressKey(), TITLES, QUESTS, streakHp(), titleForLevel() (+13 more)

### Community 82 - "Community 82"
Cohesion: 0.40
Nodes (1): fetchTop10()

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (34): OFFSET_STYLES, OPACITIES, clampIndex(), MunicipalityFinder(), provincesOf(), countByProvince(), outlineStroke(), joinCards() (+26 more)

### Community 86 - "Community 86"
Cohesion: 0.50
Nodes (1): provinceList()

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (4): savedKey(), nar, ranked, shown

### Community 69 - "Community 69"
Cohesion: 0.33
Nodes (2): readScore(), syncScore()

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (19): isBicol(), getRegionStyle(), normalizeName(), joinKey(), buildNarrativeIndex(), joinNarratives(), getRegionOutlineStyle(), formatTimestamp() (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (8): Municipality3DLayer, geojson, COUNTRY_CENTER, defaultBaseUrl(), valuesForDay(), createDailyStore(), dailyStore, timelineStore

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (24): STYLE, EMPTY, boundsOf(), centroidOf(), esc(), fmtInt(), fmtP(), fmtC() (+16 more)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (52): base, IconChevronLeft(), IconChevronRight(), IconPlus(), IconMinus(), IconReset(), IconLayers(), IconX() (+44 more)

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (5): IconChevronDown(), IconList(), swatch(), LegendRow(), dayLegend()

### Community 31 - "Community 31"
Cohesion: 0.20
Nodes (14): HIGHLIGHT, DARK, findBicol(), loadRegions(), featureKey(), isCity(), REGION_OUTLINE, MUN_PENDING (+6 more)

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (7): dayColor(), IDS, SYNTH_INDEX, mun, nar, joined, feature

### Community 87 - "Community 87"
Cohesion: 0.83
Nodes (3): public.profiles, auth.users, public.progress

### Community 92 - "Community 92"
Cohesion: 1.00
Nodes (2): public.user_saved_municipalities, auth.users

### Community 93 - "Community 93"
Cohesion: 1.00
Nodes (2): public.user_profiles, auth.users

### Community 63 - "Community 63"
Cohesion: 0.46
Nodes (7): public.set_my_score(), the, someone, v_days, public.user_profiles, and, public

### Community 84 - "Community 84"
Cohesion: 0.60
Nodes (3): public.municipalities, public.climate_anomalies, public.driver_features

## Knowledge Gaps
- **337 isolated node(s):** `metadata`, `conf`, `Resolve token reference like {primitive.color.ocean-blue.500} to hex value.`, `Load colors from assets/design-tokens.json for overlay gradients.      Resolve`, `Load background configuration from CSV.` (+332 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 103`** (1 nodes): `metadata`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (2 nodes): `extract_pptx()`, `Extract all content from a PowerPoint file.     Returns a list of slide data di`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (1 nodes): `Initialize installer.          Args:             project_root: Project root d`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (1 nodes): `Create temporary project structure.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (1 nodes): `Test initialization with default project root.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 116`** (1 nodes): `Test initialization with custom project root.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 117`** (1 nodes): `Test initialization with dry run mode.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 118`** (1 nodes): `Test checking for existing shadcn config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 119`** (1 nodes): `Test checking for non-existent shadcn config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (1 nodes): `Test getting installed components when none exist.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 121`** (1 nodes): `Test getting installed components when files exist.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 122`** (1 nodes): `Test getting installed components without config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 123`** (1 nodes): `Test adding components with empty list.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (1 nodes): `Test component addition when npx is not found.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (1 nodes): `Test adding all components without config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (1 nodes): `Test adding all components in dry run mode.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (1 nodes): `Test successful addition of all components.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (1 nodes): `Test listing installed components without config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (1 nodes): `Test listing installed components when none exist.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (1 nodes): `Test listing installed components when they exist.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 128`** (1 nodes): `Test initialization for JavaScript config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 132`** (1 nodes): `Test initialization with different frameworks.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 134`** (1 nodes): `Test default output path for TypeScript.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (1 nodes): `Test default output path for JavaScript.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (1 nodes): `Test custom output path.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 137`** (1 nodes): `Test base configuration structure.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 138`** (1 nodes): `Test default content paths for React.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (1 nodes): `Test default content paths for Next.js.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 140`** (1 nodes): `Test default content paths for Vue.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 141`** (1 nodes): `Test adding custom colors.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 124`** (1 nodes): `Test validating valid configuration.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 125`** (1 nodes): `Test validating config with no content paths.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 126`** (1 nodes): `Test validating config with empty theme extensions.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 127`** (1 nodes): `Test writing configuration to file.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 129`** (1 nodes): `Test that written config contains expected content.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 130`** (1 nodes): `Test writing config to invalid path.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (1 nodes): `Test generating complete TypeScript configuration.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (1 nodes): `Test generating complete JavaScript configuration.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (2 nodes): `format_output()`, `Format results for Claude consumption (token-optimized)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `CatalogRefreshTest`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `TestTokenizer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `TestSearchDomains`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `TestDomainDetection`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `TestPersistence`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `TestPaletteSelection`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (2 nodes): `TestEndToEndCoherence`, `The exact reproduction from issue #428.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `_rows()`, `TestNativeDesktopStackFreshness`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `read_rows()`, `TestStyleTaxonomy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `_rows()`, `TestWebStackFreshness`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `CMIP6 climate projection for 2050 (NASA NEX-GDDP-CMIP6).  Attempts to load NAS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `Apply Benjamini-Hochberg FDR correction to Mann-Kendall trend p-values.  Loads`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `Residual diagnostics for the Random Forest heat-index driver model.  Trains a`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `SHELL`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `here`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `fetchTop10()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `provinceList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (2 nodes): `readScore()`, `syncScore()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (2 nodes): `public.user_saved_municipalities`, `auth.users`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (2 nodes): `public.user_profiles`, `auth.users`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `joinKey()` connect `Community 12` to `Community 20`, `Community 31`, `Community 38`, `Community 3`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `DesignSystemGenerator` connect `Community 32` to `Community 10`, `Community 52`, `Community 48`, `Community 39`, `Community 88`, `Community 40`, `Community 78`, `Community 7`, `Community 72`, `Community 29`, `Community 79`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `featureKey()` connect `Community 31` to `Community 0`, `Community 12`, `Community 25`, `Community 3`, `Community 8`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 38 inferred relationships involving `TailwindConfigGenerator` (e.g. with `Test adding colors multiple times.` and `Test adding full color palette.`) actually correct?**
  _`TailwindConfigGenerator` has 38 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `ShadcnInstaller` (e.g. with `Test adding components without shadcn config.` and `Test adding components that are already installed.`) actually correct?**
  _`ShadcnInstaller` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `DesignSystemGenerator` (e.g. with `TestBm25CoreBehavior` and `TestDiagnosticsContracts`) actually correct?**
  _`DesignSystemGenerator` has 17 INFERRED edges - model-reasoned connections that need verification._
- **What connects `metadata`, `conf`, `Resolve token reference like {primitive.color.ocean-blue.500} to hex value.` to the rest of the system?**
  _337 weakly-connected nodes found - possible documentation gaps or missing edges._