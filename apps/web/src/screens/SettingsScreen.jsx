// Settings placeholder screen — a stub destination until the lead scopes real
// settings. No new behavior, no network.
// The shared MainHeader (nav bar) is rendered once by app.jsx for every
// non-map screen, so screens must not render it again (avoids doubled nav bar).

export default function SettingsScreen({ navigate }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-clay-bg">
      <main id="main" className="min-h-0 flex-1 overflow-y-auto bih-scroll">
        <div className="mx-auto max-w-7xl px-3 py-8 sm:px-5 sm:py-10 lg:px-8">
          <p className="text-xs font-clay font-semibold uppercase tracking-[0.18em] text-clay-coral-shadow mb-1">Preferences</p>
          <h1 className="mt-0.5 text-3xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-4xl">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-clay-text-muted font-clay">
            No settings are available yet. This page is a placeholder — the lead will scope real settings after the challenge weekend.
          </p>
        </div>
      </main>
    </div>
  )
}
