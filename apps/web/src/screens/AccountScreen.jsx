// Manage Account placeholder screen — reuses the AuthButton flows (sign in,
// handle picker, sign out) so no new auth UI is invented.
// The shared MainHeader (nav bar) is rendered once by app.jsx for every
// non-map screen, so screens must not render it again (avoids doubled nav bar).
import AuthButton from '../components/AuthButton.jsx'

export default function AccountScreen({ user, supabase, configured, navigate }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-clay-bg">
      <main id="main" className="min-h-0 flex-1 overflow-y-auto bih-scroll">
        <div className="mx-auto max-w-7xl px-3 py-8 sm:px-5 sm:py-10 lg:px-8">
          <p className="text-xs font-clay font-semibold uppercase tracking-[0.18em] text-clay-coral-shadow mb-1">Manage Account</p>
          <h1 className="mt-0.5 text-3xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-4xl">Your explorer profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-clay-text-muted font-clay">
            Your chosen handle is the only identity any screen shows — never your Google name or email.
          </p>
          <div className="mt-8 clay-card--white">
            <AuthButton user={user} supabase={supabase} configured={configured} />
          </div>
          <p className="mt-4 text-xs text-clay-text-muted font-clay">
            Sign out clears the session and returns you to the guest view; your local progress stays on this device.
          </p>
        </div>
      </main>
    </div>
  )
}
