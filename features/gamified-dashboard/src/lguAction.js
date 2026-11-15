// LGU Action Engine — turns a municipality's measured conditions into concrete
// things a local government can do. Rules are deterministic and state their
// threshold; nothing here invents a number.
//
// Thresholds are set against the real regional distributions (all 114 LGUs):
//   NDVI (vegetation) 0.548 – 0.764   LST (ground temp) 24.2 – 31.3 °C
//   population 7.3k – 196.6k            distance to coast 0.2 – 17.7 km

// Plain-English names for the RF/SHAP driver labels. The model's top driver
// is always wind and the coordinates; the raw condition fields (NDVI, LST) are
// what an LGU can actually change, so they carry the recommendation.
const DRIVER_ALIAS = {
  'Wind (north-south, V10M)': 'Stagnant north–south wind',
  'Wind (east-west, U10M)': 'Stagnant east–west wind',
  Longitude: 'Location within the region',
  Latitude: 'Location within the region',
}

export const plainDriverLabel = (label) => DRIVER_ALIAS[label] ?? label

// Thresholds — each one fires for a meaningful share of the region.
export const THRESHOLDS = {
  ndviLow: 0.65, // 13 of 114 LGUs
  ndviSevere: 0.6, // 4 of 114 LGUs
  lstHot: 30, // 11 of 114 LGUs
  populationLarge: 100000, // 8 of 114 LGUs
  coastKm: 3, // 24 of 114 LGUs
  elevationLow: 50, // lowland LGUs
}

/**
 * The recommendation list for one municipality.
 * @param {object} muni a narratives.json municipality row
 * @param {{ndviMedian?: number|null, lstMedian?: number|null}} [context]
 * @returns {{id: string, label: string, detail: string}[]}
 */
export function lguActions(muni, context = {}) {
  const actions = []
  if (!muni) return actions

  const ndvi = muni.ndvi_mean
  const lst = muni.lst_mean_c
  const pop = muni.population_2020
  const coast = muni.distance_to_coast_km
  const elev = muni.elevation_m
  const name = muni.name ?? 'this LGU'

  if (Number.isFinite(ndvi) && ndvi < THRESHOLDS.ndviLow) {
    const severe = ndvi < THRESHOLDS.ndviSevere
    actions.push({
      id: 'canopy',
      label: severe ? 'Urban forestry priority' : 'Plant urban trees',
      detail:
        `Vegetation cover is ${ndvi.toFixed(2)} (regional median ${(context.ndviMedian ?? 0).toFixed(2)}). ` +
        'More street trees and protected canopy lower surface temperature.',
    })
  }

  if (Number.isFinite(lst) && lst >= THRESHOLDS.lstHot) {
    actions.push({
      id: 'heat',
      label: 'Open cooling centres and issue heat advisories',
      detail:
        `Ground temperature reaches ${lst.toFixed(1)} °C in the hottest months — ` +
        'among the hottest in Bicol. Plan cooling centres and drinking-water points ahead of summer.',
    })
  }

  if (Number.isFinite(pop) && pop >= THRESHOLDS.populationLarge) {
    actions.push({
      id: 'population',
      label: 'Prioritise cooling centres and water points',
      detail:
        `${Math.round(pop).toLocaleString()} residents live here, so heat protection ` +
        'reaches more people per peso spent than anywhere else in the region.',
    })
  }

  if (Number.isFinite(coast) && coast < THRESHOLDS.coastKm) {
    actions.push({
      id: 'coast',
      label: 'Protect open-space corridors',
      detail:
        `Only ${coast.toFixed(1)} km from the coast. Coastal breeze corridors cut heat — ` +
        'keep them clear of construction and heavy canopy loss.',
    })
  }

  if (Number.isFinite(elev) && elev < THRESHOLDS.elevationLow) {
    actions.push({
      id: 'lowland',
      label: 'Plan for compound flood-and-heat events',
      detail:
        `Low elevation (${Math.round(elev)} m). Heat and flooding can coincide — ` +
        'treat them as one risk, not two.',
    })
  }

  // Never an empty box: fall back to the exposure guidance.
  if (actions.length === 0) {
    const pd = Number.isFinite(muni.person_days_danger) ? muni.person_days_danger : 0
    const days = Number.isFinite(muni.total_danger_days_45y) ? muni.total_danger_days_45y : 0
    actions.push({
      id: 'monitor',
      label: 'Monitor heat exposure and keep a heat plan ready',
      detail:
        pd > 0
          ? `${pd.toLocaleString()} person-days of exposure so far. Keep an advisory and a cooling plan ready for the next extreme summer.`
          : `${name} has not crossed the 42 °C Danger threshold. Keep monitoring and keep the tree canopy.`,
    })
  }

  return actions
}

/**
 * The regional headline an LGU can put in a memo.
 * @param {{exposedPopulation: number, exposedCount: number, totalPopulation: number, exposedSharePct: number|null}} exposure
 */
export function regionalHeadline(exposure) {
  if (!exposure || exposure.totalPopulation <= 0) return null
  const pct = exposure.exposedSharePct
  return (
    `${(exposure.exposedPopulation / 1e6).toFixed(2)}M people across ${exposure.exposedCount} ` +
    `municipalities have lived through at least one extreme-heat day — ` +
    `${pct}% of Bicol's ${(exposure.totalPopulation / 1e6).toFixed(2)}M people.`
  )
}
