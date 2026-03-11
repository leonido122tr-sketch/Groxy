'use client'

import { useRequireAuth } from '@/lib/auth/useRequireAuth'
import { AuthProvider } from '@/lib/auth/AuthContext'
import { PageLoader } from '@/app/components/PageLoader'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useRequireAuth()

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <PageLoader message="Перенаправление..." />
  }

  return <AuthProvider user={user}>{children}</AuthProvider>
}
