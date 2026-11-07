# Graph Report - NASA  (2026-11-05)

## Corpus Check
- 47 files · ~366,887 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 62 file(s) not represented in the graph (top: .csv 53, (none) 4, .css 3)

## Summary
- 324 nodes · 615 edges · 15 communities (11 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Project Concept and Rules
- Web Package Dependencies
- Trend Calculation Pipeline
- Map Screen Slice
- Timeline Map Controls
- Narration Rendering
- Ranking Table UI
- FastAPI Mock Endpoints
- POWER Fetch and Heat Index
- Render Deploy Config
- Root Package Metadata
- Award Targeting Notes

## God Nodes (most connected - your core abstractions)
1. `render_narration()` - 14 edges
2. `NarrationTest` - 13 edges
3. `Bicol In-Heat Project Concept` - 13 edges
4. `annual_means()` - 12 edges
5. `MapControlsOverlay()` - 12 edges
6. `layer-uhi-terrain Layer Slice Contract` - 12 edges
7. `map-controls Map Slice Contract` - 11 edges
8. `apps/api ETL + Secrets Jurisdiction` - 10 edges
9. `heat_index_c()` - 9 edges
10. `_daily()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `pymannkendall (Mann-Kendall Implementation)` --semantically_similar_to--> `Core Trend Engine (Theil-Sen / Mann-Kendall / Rothfusz / RF-SHAP)`  [INFERRED] [semantically similar]
  apps/api/requirements.txt → core/AGENTS.md
- `Variable Glossary (EN)` --conceptually_related_to--> `Landsat 8/9 Collection 2 L2 (LANDSAT_OT_C2_L2, LST)`  [INFERRED]
  features/chatbot-llm/AGENTS.md → CONCEPT.md
- `Core Trend Engine (Theil-Sen / Mann-Kendall / Rothfusz / RF-SHAP)` --implements--> `Theil-Sen Slope`  [EXTRACTED]
  core/AGENTS.md → CONCEPT.md
- `pymannkendall (Mann-Kendall Implementation)` --implements--> `Mann-Kendall Test (alpha=0.05)`  [INFERRED]
  apps/api/requirements.txt → CONCEPT.md
- `layer-uhi-terrain Layer Slice Contract` --rationale_for--> `Landsat 7 Post-2003 SLC-off Gaps`  [EXTRACTED]
  features/layer-uhi-terrain/AGENTS.md → CONCEPT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Trend & Attribution Method Pipeline (POWER HI -> Theil-Sen/MK -> RF/SHAP -> narrative bank)** — concept_heat_index, concept_power_api, concept_theil_sen_slope, concept_mann_kendall_test, concept_rf_shap_driver_ranking, agents_static_json_narrative_bank, concept_build_time_llm, concept_pagasa_stations, concept_holdout_validation [EXTRACTED 1.00]
- **Write-Boundary Sliced Architecture (web shell mounts feature slices, core imported read-only)** — agents_write_boundary_contract, apps_web_agents_pwa_shell_contract, features_map_controls_agents_map_slice, features_layer_uhi_terrain_agents_layer_slice, features_gamified_dashboard_agents_ranking_slice, features_chatbot_llm_agents_narration_slice, apps_api_agents_etl_pipeline_scope, core_agents_trend_engine [EXTRACTED 1.00]
- **Satellite Driver Data Sources (LST + canopy + land cover + exposure feed RF/SHAP ranking)** — concept_landsat_c2_l2, concept_mod44b_tree_cover, concept_mcd12q1_land_cover, concept_sedac_gpw_exposure, concept_rf_shap_driver_ranking, concept_earthdata_login [EXTRACTED 1.00]

## Communities (15 total, 4 thin omitted)

### Community 0 - "Project Concept and Rules"
Cohesion: 0.07
Nodes (51): Bicol In-Heat, Challenge-Weekend Cut Lines (h30/h42/h44), Region V (Bicol, Philippines), Static-JSON Narrative Bank, Supabase Leaderboard (Handle-Only), Verified Status Table, apps/api ETL + Secrets Jurisdiction, pymannkendall (Mann-Kendall Implementation) (+43 more)

### Community 1 - "Web Package Dependencies"
Cohesion: 0.06
Nodes (39): dependencies, leaflet@^1.9.4, react@^18.3.1, react-dom@^18.3.1, react-leaflet@^4.2.1, @supabase/supabase-js@^2.118.0, devDependencies, autoprefixer@^10.4.19 (+31 more)

### Community 2 - "Trend Calculation Pipeline"
Cohesion: 0.09
Nodes (10): annual_means(), main(), trend_for(), main(), _polygon_centroid(), build(), danger_band(), main() (+2 more)

### Community 3 - "Map Screen Slice"
Cohesion: 0.09
Nodes (36): BicolMap(), FitBicol(), geojson, keyOf(), MunicipalityLayer(), MunicipalityLegend(), swatch(), arrow() (+28 more)

### Community 4 - "Timeline Map Controls"
Cohesion: 0.22
Nodes (22): KIND_LABELS, LayerPanel(), MapControlsOverlay(), selectIndex(), selectPlaying(), selectTimestamps(), TimeScrubber(), usePrefersReducedMotion() (+14 more)

### Community 5 - "Narration Rendering"
Cohesion: 0.17
Nodes (5): _danger_summary(), _p_value(), render_narration(), _slope(), NarrationTest

### Community 6 - "Ranking Table UI"
Cohesion: 0.16
Nodes (9): arrow(), fmtInt(), fmtP(), RankingTable(), rankMunicipalities(), RankingScreen(), maxSlope, nar (+1 more)

### Community 7 - "FastAPI Mock Endpoints"
Cohesion: 0.15
Nodes (7): ClimateAnomaly, get_anomalies(), get_locations(), get_verdant(), MunicipalityLocation, read_root(), VerdantFeature

### Community 8 - "POWER Fetch and Heat Index"
Cohesion: 0.17
Nodes (4): fetch_municipality(), heat_index_c(), rh_from_dewpoint(), HeatIndexTest

### Community 9 - "Render Deploy Config"
Cohesion: 0.15
Nodes (12): key, sync, value, services, buildCommand, env, envVars, name (+4 more)

### Community 11 - "Root Package Metadata"
Cohesion: 0.40
Nodes (4): name, private, type, version

## Knowledge Gaps
- **9 isolated node(s):** `Verified Status Table`, `DOST-PAGASA iHeatMap (Prior Art)`, `Internal Award Shaping (Local Impact primary)`, `SEDAC GPW Population Exposure`, `PSA/PSGC LGU Boundaries (Official Source)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 96 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Web Package Dependencies` to `Map Screen Slice`, `Timeline Map Controls`, `Ranking Table UI`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `MapControlsOverlay()` (e.g. with `selectIndex()` and `selectPlaying()`) actually correct?**
  _`MapControlsOverlay()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Verified Status Table`, `DOST-PAGASA iHeatMap (Prior Art)`, `Internal Award Shaping (Local Impact primary)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Concept and Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.0655367231638418 - nodes in this community are weakly interconnected._
- **Why does `react-leaflet` connect `Web Package Dependencies` to `Map Screen Slice`, `Timeline Map Controls`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `Web Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Why does `leaflet` connect `Web Package Dependencies` to `Map Screen Slice`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._