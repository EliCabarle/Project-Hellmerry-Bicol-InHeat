import { useState } from 'react'
import BicolMap from '@features/map-controls'
import RankingScreen from '@features/gamified-dashboard'
import AuthButton from './components/AuthButton'
import useBicolData from './useBicolData'
import useSession from './useSession'

const SCREENS = [
  { id: 'map', label: 'Map' },
  { id: 'ranking', label: 'Ranking' },
]

export default function App() {
  const [screen, setScreen] = useState('map')
  const data = useBicolData()
  // Auth lives here so screens can scope their own rows (saved places,
  // leaderboard) to the signed-in user.
  const { user, supabase, configured } = useSession()

  // Height chain: html/body/#root = 100% (index.css) -> this h-full column ->
  // main.min-h-0.flex-1 -> MapContainer.h-full. Never insert a height:auto
  // wrapper between #root and the leaflet container (collapses the map to 0px).
  return (
    <div className="flex h-full flex-col bg-heat-bg text-heat-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[900] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to content
      </a>

      <header className="relative z-[800] flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-heat-deep/90 px-3 backdrop-blur-md sm:h-16 sm:gap-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-300 via-orange-500 to-red-700 text-[10px] font-black tracking-tighter text-slate-950 shadow-lg shadow-orange-950/40"
          >
            BIH
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold tracking-tight sm:text-[15px]">
              <span className="text-heat-amber">Bicol</span> In-Heat
            </div>
            <div className="hidden text-[9px] uppercase tracking-[0.2em] text-slate-500 sm:block">
              Earth System Trend Detective
            </div>
          </div>
        </div>

        <nav
          aria-label="Screens"
          className="flex shrink-0 items-center rounded-lg border border-white/10 bg-black/25 p-0.5"
        >
          {SCREENS.map((s) => {
            const active = screen === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScreen(s.id)}
                aria-current={active ? 'page' : undefined}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber focus-visible:ring-offset-2 focus-visible:ring-offset-heat-deep sm:text-sm ${
                  active
                    ? 'bg-heat-amber text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex min-w-0 items-center justify-end">
          <AuthButton user={user} supabase={supabase} configured={configured} />
        </div>
      </header>

      <main id="main" className="relative min-h-0 flex-1">
        {screen === 'map' ? (
          <BicolMap {...data} />
        ) : (
          <RankingScreen {...data} supabase={supabase} user={user} />
        )}
      </main>
    </div>
  )
}
