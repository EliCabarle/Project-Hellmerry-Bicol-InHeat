import { isCity } from '../gis/engine.js'

const swatch = (extra = '') => `inline-block h-3 w-4 rounded-sm align-middle ${extra}`

export default function MunicipalityLegend({ coverage = { withData: 0, total: 0 } }) {
  return (
    <div className="pointer-events-none absolute top-14 left-3 z-[600] rounded border border-slate-700 bg-heat-bg/80 px-3 py-2 text-[11px] leading-5 text-slate-300">
      <div className="mb-1 font-semibold text-slate-200">Legend</div>
      <div className="flex items-center gap-2">
        <span className={swatch('bg-heat-hot')} /> Warming — increasing
      </div>
      <div className="flex items-center gap-2">
        <span className={swatch('bg-[#3b82f6]')} /> Decreasing
      </div>
      <div className="flex items-center gap-2">
        <span className={swatch('bg-heat-dark/25')} /> Data pending
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className={swatch('border-2 border-heat-hotline')} /> Significant (α = 0.05)
      </div>
      <div className="flex items-center gap-2">
        <span className={swatch('border-2 border-dashed border-heat-hotline')} /> Not significant — still shown and ranked
      </div>
      <div className="mt-1 border-t border-slate-700 pt-1 text-slate-400">
        Data: {coverage.withData} of {coverage.total} municipalities
      </div>
    </div>
  )
}
