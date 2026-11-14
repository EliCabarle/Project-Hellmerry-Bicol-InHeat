// Manage Account placeholder screen — reuses the AuthButton flows (sign in,
// handle picker, sign out) so no new auth UI is invented.
// The shared MainHeader (nav bar) is rendered once by app.jsx for every
// non-map screen, so screens must not render it again (avoids doubled nav bar).
import AuthButton from '../components/AuthButton.jsx'

export default function AccountScreen({
  user,
  profile,
  loadingProfile,
  profileLoadFailed,
  supabase,
  configured,
  navigate,
  onOpenPrivacy,
  onOpenProfile,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-heat-bg">
      <main id="main" className="min-h-0 flex-1 overflow-y-auto bih-scroll">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-5 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-heat-amber mb-1">Manage Account</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Your explorer profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Your chosen handle is the only identity any screen shows — never your Google name or email.
          </p>
          <div className="mt-6">
            <AuthButton
              user={user}
              profile={profile}
              loadingProfile={loadingProfile}
              profileLoadFailed={profileLoadFailed}
              supabase={supabase}
              configured={configured}
              onOpenPrivacy={onOpenPrivacy}
              onOpenProfile={onOpenProfile}
            />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Sign out clears the session and returns you to the guest view; your local progress stays on this device.
          </p>
        </div>
      </main>
    </div>
  )
}
