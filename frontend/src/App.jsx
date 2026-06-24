import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

import Landing    from './pages/Landing'
import Login      from './pages/Login'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import Home       from './pages/dashboard/Home'
import PriorityMatrix from './pages/dashboard/PriorityMatrix'
import FocusTimer from './pages/dashboard/FocusTimer'
import Reminders  from './pages/dashboard/Reminders'
import Productivity from './pages/dashboard/Productivity'
import Calendar   from './pages/dashboard/Calendar'
import Tasks      from './pages/dashboard/Tasks'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 2 * 60_000 } } })

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
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
    <QueryClientProvider client={qc}>
      <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index    element={<Home />} />
              <Route path="matrix"      element={<PriorityMatrix />} />
              <Route path="timer"       element={<FocusTimer />} />
              <Route path="reminders"   element={<Reminders />} />
              <Route path="productivity" element={<Productivity />} />
              <Route path="calendar"    element={<Calendar />} />
              <Route path="tasks"       element={<Tasks />} />
            </Route>
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
