import { redirect } from 'next/navigation'
import { auth } from '@/../auth'
import { ThemeProvider } from '@/context/ThemeContext'
import AppShell from '@/components/app/AppShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <ThemeProvider>
      <AppShell
        userName={session.user?.name ?? undefined}
        userEmail={session.user?.email ?? undefined}
        userImage={session.user?.image ?? undefined}
      >
        {children}
      </AppShell>
    </ThemeProvider>
  )
}
