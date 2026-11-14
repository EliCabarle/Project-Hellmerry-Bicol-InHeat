// Manage Account placeholder screen — reuses the AuthButton flows (sign in,
// sign out) so no new auth UI is invented.
// The shared MainHeader (nav bar) is rendered once by app.jsx for every
// non-map screen, so screens must not render it again (avoids doubled nav bar).
import AuthButton from '../components/AuthButton.jsx'

// Human-readable account age from the Supabase auth user's created_at.
function accountAge(createdAt) {
  if (!createdAt) return null
  const ms = Date.now() - new Date(createdAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const days = Math.floor(ms / 86_400_000)
  if (days < 1) return 'Today'
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'}`
}

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
  const age = accountAge(user?.created_at)
  return (
    <div className="flex h-full min-h-0 flex-col bg-clay-bg">
      <main id="main" className="min-h-0 flex-1 overflow-y-auto bih-scroll">
        <div className="mx-auto max-w-7xl px-3 py-8 sm:px-5 sm:py-10 lg:px-8">
          <p className="text-xs font-clay font-semibold uppercase tracking-[0.18em] text-clay-coral-shadow mb-1">Manage Account</p>
          <h1 className="mt-0.5 text-3xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-4xl">Your explorer profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-clay-text-muted font-clay">
            Your chosen handle is the only identity any screen shows — never your Google name or email.
          </p>
          <div className="relative mt-8 clay-card--white">
            <AuthButton
              user={user}
              profile={profile}
              loadingProfile={loadingProfile}
              profileLoadFailed={profileLoadFailed}
              supabase={supabase}
              configured={configured}
              onOpenProfile={onOpenProfile}
            />
            {user && profile && (
              <dl className="mt-5 flex flex-col gap-3 font-clay">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-clay-text-muted">Heat points</dt>
                  <dd className="mt-0.5 text-lg font-bold text-clay-text-heading">{Number(profile.score ?? 0).toLocaleString()}</dd>
                </div>
                {age && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-clay-text-muted">Account age</dt>
                    <dd className="mt-0.5 text-lg font-bold text-clay-text-heading">{age}</dd>
                  </div>
                )}
              </dl>
            )}
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="absolute bottom-3 right-4 rounded text-xs font-clay text-clay-text-muted underline underline-offset-2 hover:text-clay-text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-blue"
            >
              Privacy
            </button>
          </div>
          <p className="mt-4 text-xs text-clay-text-muted font-clay">
            Sign out clears the session and returns you to the guest view; your local progress stays on this device.
          </p>
        </div>
      </main>
    </div>
  )
}
