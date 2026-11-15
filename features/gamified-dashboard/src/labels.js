// Single source of truth for dashboard analytics copy.
// Every analytics label carries a plain-language headline plus a small
// technical line: visible simultaneously, never gated behind hover or a tap.
// Computed values and units never change here — only the words around them.
// UI English; serves LGU planners and general users alike.
// Shape: { plain: 'headline', tech: 'secondary technical line' }
export const LABELS = {
  // Page meta
  title: { plain: 'Analytics', tech: '' },
  eyebrow: { plain: 'Bicol Region · Climate Trend Monitor', tech: '' },

  // Method line — DashboardScreen meta text
  methodPlain: { plain: 'Annual mean peak heat index', tech: 'Theil-Sen + Mann-Kendall · α = 0.05 · Danger > 42 °C' },

  // KPI cards — DashboardScreen
  kpiWarming: { plain: 'LGUs warming significantly', tech: 'Mann-Kendall α = 0.05 — a flag, never a filter' },
  kpiMeanHi: { plain: 'Average peak heat', tech: 'Mean heat index · °C' },
  kpiChange: { plain: 'Change vs prior year', tech: 'Year-over-year mean' },
  kpiDanger: { plain: 'LGUs with extreme heat days', tech: '≥ 1 day above 42 °C' },

  // Chart cards — DashboardCards / DashboardCharts
  chartYearly: { plain: 'Yearly trend', tech: 'Province-wide means, then LGU counts' },
  chartHeatDist: { plain: 'Heat index distribution', tech: 'Same bins as the map legend' },
  chartWarming: { plain: 'How fast each place is warming', tech: 'Warming rate · Theil-Sen slope (°C/yr)' },
  chartDangerDays: { plain: 'LGUs by danger days', tech: '45-year total above 42 °C' },
  chartDrivers: { plain: 'What drives the heat', tech: 'Top drivers · RF · SHAP mean share — association, not causation' },

  // Ranking table headers — DashboardTable two-line <th>
  thTrend: { plain: 'Warming rate', tech: 'Theil-Sen °C/yr' },
  thSignificance: { plain: 'Significance', tech: 'Mann-Kendall α = 0.05' },
  thSample: { plain: 'Sample size', tech: 'days · years of data' },
  thDangerDays: { plain: 'Danger days', tech: '45-year total above 42 °C' },
  thMunicipality: { plain: 'Municipality', tech: '' },
  thProvince: { plain: 'Province', tech: '' },
  thRank: { plain: 'Rank', tech: '' },
  thSave: { plain: 'Save', tech: '' },

  // Top hotspots — TopHotspots two-line headers
  hotspotsTitle: { plain: 'Top hotspots', tech: '' },
  hotspotsNoteSlope: { plain: 'Fastest warming rate · jump to the map', tech: '' },
  hotspotsNoteDanger: { plain: 'Highest 45-year danger days · jump to the map', tech: '' },
  hotspotsHeaderWarming: { plain: 'Warming rate', tech: 'Theil-Sen °C/yr' },
  hotspotsHeaderDanger: { plain: 'Danger days', tech: '45-year total above 42 °C' },
  hotspotsHeaderSignificance: { plain: 'Significance', tech: 'Mann-Kendall α = 0.05' },
  hotspotsHeaderShowMap: { plain: 'Show on map', tech: '' },

  // Finder card back — FinderCard
  finderBackHi: { plain: 'Mean HI', tech: '' },
  finderBackP: { plain: 'p-value', tech: 'Mann-Kendall' },
  finderBackSample: { plain: 'Sample size', tech: 'days · years of data' },
  finderBackDrivers: { plain: 'Top drivers', tech: 'RF · SHAP share' },
  finderBackCausation: { plain: 'Association, not causation', tech: 'A ranking, not proof of cause.' },

  // Chart axes — DashboardCharts
  axisMeanHi: { plain: 'Mean heat index', tech: '°C' },
  axisDangerDays: { plain: 'LGUs with danger days', tech: '' },
  axisShare: { plain: 'Mean SHAP share', tech: '' },
}

// Return { plain, tech } for a key, gracefully degrading to the key itself.
export const label = (key) => {
  const entry = LABELS[key]
  if (!entry) return { plain: key, tech: '' }
  return entry
}

// Public view speaks "Municipalities"; the analyst view keeps the exact
// term "LGU". Only the words around the numbers change — computed values and
// units are never touched.
import { termSwap } from './viewMode.js'

// A term-aware copy of LABELS. Returns the original object for the analyst
// view so the common path allocates nothing.
export function labelsFor(term = 'LGUs') {
  if (term === 'LGUs') return LABELS
  const out = {}
  for (const [key, entry] of Object.entries(LABELS)) {
    out[key] = { plain: termSwap(entry.plain, term), tech: termSwap(entry.tech, term) }
  }
  return out
}
