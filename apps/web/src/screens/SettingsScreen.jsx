// Settings placeholder screen — a stub destination until the lead scopes real
// settings. No new behavior, no network.
// The shared MainHeader (nav bar) is rendered once by app.jsx for every
// non-map screen, so screens must not render it again (avoids doubled nav bar).

export default function SettingsScreen({ navigate }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-heat-bg">
      <main id="main" className="min-h-0 flex-1 overflow-y-auto bih-scroll">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-5 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-heat-amber mb-1">Preferences</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            No settings are available yet. This page is a placeholder — the lead will scope real settings after the challenge weekend.
          </p>
        </div>
      </main>
    </div>
  )
}
