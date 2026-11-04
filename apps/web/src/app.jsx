import { useState } from 'react'
import BicolMap from '@features/map-controls'
import RankingScreen from '@features/gamified-dashboard'
import AuthButton from './components/AuthButton'
import useBicolData from './useBicolData'

const SCREENS = [
  { id: 'map', label: 'Map' },
  { id: 'ranking', label: 'Ranking' },
]

export default function App() {
  const [screen, setScreen] = useState('map')
  const data = useBicolData()
  // Height chain: html/body/#root = 100% (index.css) -> this h-full column ->
  // main.min-h-0.flex-1 -> MapContainer.h-full. Never insert a height:auto
  // wrapper between #root and the leaflet container (collapses the map to 0px).
  return (
    <div className="flex h-full flex-col bg-heat-bg text-slate-100">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-700 bg-heat-dark/70 px-3 py-2">
        <span className="text-sm font-semibold tracking-tight">
          <span className="text-heat-hot">Bicol</span> In-Heat
        </span>
        <nav aria-label="Screens" className="flex gap-1">
          {SCREENS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScreen(s.id)}
              aria-current={screen === s.id ? 'page' : undefined}
              className={`cursor-pointer rounded px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                screen === s.id ? 'bg-heat-hot font-semibold text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto">
          <AuthButton />
        </div>
      </header>
      <main className="min-h-0 flex-1">
        {screen === 'map' ? <BicolMap {...data} /> : <RankingScreen {...data} />}
      </main>
    </div>
  )
}
