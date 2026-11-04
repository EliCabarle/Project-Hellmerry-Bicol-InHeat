import { useState } from 'react'
import BicolMap from '@features/map-controls'
import RankingScreen from '@features/gamified-dashboard'
import useBicolData from './useBicolData'

const SCREENS = [
  { id: 'map', label: 'Map' },
  { id: 'ranking', label: 'Ranking' },
]

export default function App() {
  const [screen, setScreen] = useState('map')
  const data = useBicolData()
  return (
    <div className="flex h-full flex-col bg-heat-bg text-slate-100">
      <nav aria-label="Screens" className="flex gap-1 border-b border-slate-700 px-3 py-2">
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
      <main className="min-h-0 flex-1">
        {screen === 'map' ? <BicolMap {...data} /> : <RankingScreen {...data} />}
      </main>
    </div>
  )
}
