import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CreatorDetail from './pages/CreatorDetail.jsx'
import Library from './pages/Library.jsx'
import Hooks from './pages/Hooks.jsx'
import Saved from './pages/Saved.jsx'
import Settings from './pages/Settings.jsx'
import ComingSoon from './pages/ComingSoon.jsx'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-coral border-t-transparent animate-spin" />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</span>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index                              element={<Dashboard />} />
            <Route path="creator/:id"                element={<CreatorDetail />} />
            <Route path="library"                    element={<Library />} />
            <Route path="hooks"                      element={<Hooks />} />
            <Route path="saved"                      element={<Saved />} />
            <Route path="settings"                   element={<Settings />} />
            <Route path="coming-soon/:feature"       element={<ComingSoon />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
