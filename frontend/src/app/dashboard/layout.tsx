import { redirect } from 'next/navigation'
import { auth } from '@/../auth'
import { ThemeProvider } from '@/context/ThemeContext'
import AppShell from '@/components/app/AppShell'
import { fetchUserPreferences } from '@/lib/auth/userPreferencesApi'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Fetch preferences server-side so the sidebar shows the user's saved displayName
  // immediately on load - no client-side waterfall or flash of the Keycloak name.
  // Failure is swallowed so a DB/network issue never blocks the dashboard.
  let displayName: string | undefined = session.user?.name ?? undefined
  let userEmail: string | undefined = session.user?.email ?? undefined

  if (session.accessToken && session.userId) {
    try {
      const prefs = await fetchUserPreferences(session.userId, session.accessToken)
      if (prefs.displayName) displayName = prefs.displayName
      if (prefs.email) userEmail = prefs.email
    } catch {
      // Fallback to session values - non-fatal
    }
  }

  return (
    <ThemeProvider>
      <AppShell
        userName={displayName}
        userEmail={userEmail}
        userImage={session.user?.image ?? undefined}
      >
        {children}
      </AppShell>
    </ThemeProvider>
  )
}
