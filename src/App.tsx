import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'

const HomePage = lazy(() => import('@/pages/HomePage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ElderlyDashboardPage = lazy(() => import('@/pages/ElderlyDashboardPage'))
const MedicationsPage = lazy(() => import('@/pages/MedicationsPage'))
const AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage'))
const CareCirclePage = lazy(() => import('@/pages/CareCirclePage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const AcceptInvitationPage = lazy(() => import('@/pages/AcceptInvitationPage'))

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" role="status" aria-label="Loading" />
        <p className="text-sm text-muted-foreground">Loading CareCircle…</p>
      </div>
    </div>
  )
}

function RequireAuth() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingSpinner />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function DashboardRouter() {
  const { profile, isLoading } = useAuth()
  if (isLoading) return <LoadingSpinner />
  if (!profile) return <Navigate to="/login" replace />
  return profile.role === 'elderly' ? <ElderlyDashboardPage /> : <DashboardPage />
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardRouter />} />
              <Route path="/medications" element={<MedicationsPage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/care-circle" element={<CareCirclePage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
