import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'

// Eager — entry points, small and needed immediately
import Landing    from './pages/Landing'
import Login      from './pages/Login'
import { Privacy, Terms } from './pages/Legal'

// Lazy — the authenticated app is only loaded after sign-in, keeping the
// initial (landing) bundle small.
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout'))
const Home            = lazy(() => import('./pages/dashboard/Home'))
const PriorityMatrix  = lazy(() => import('./pages/dashboard/PriorityMatrix'))
const FocusTimer      = lazy(() => import('./pages/dashboard/FocusTimer'))
const Reminders       = lazy(() => import('./pages/dashboard/Reminders'))
const Productivity    = lazy(() => import('./pages/dashboard/Productivity'))
const Calendar        = lazy(() => import('./pages/dashboard/Calendar'))
const Tasks           = lazy(() => import('./pages/dashboard/Tasks'))
const Settings        = lazy(() => import('./pages/dashboard/Settings'))
const Guide           = lazy(() => import('./pages/dashboard/Guide'))
const Goals           = lazy(() => import('./pages/dashboard/Goals'))

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 2 * 60_000 } } })

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
        <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<Spinner />}>
              <Routes>
                {/* Landing is always viewable — even when logged in (no redirect) */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                {/* Legal pages — public, required for Google OAuth verification */}
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route index    element={<Home />} />
                  <Route path="matrix"      element={<PriorityMatrix />} />
                  <Route path="timer"       element={<FocusTimer />} />
                  <Route path="reminders"   element={<Reminders />} />
                  <Route path="productivity" element={<Productivity />} />
                  <Route path="calendar"    element={<Calendar />} />
                  <Route path="tasks"       element={<Tasks />} />
                  <Route path="goals"       element={<Goals />} />
                  <Route path="settings"    element={<Settings />} />
                  <Route path="guide"       element={<Guide />} />
                </Route>
                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
