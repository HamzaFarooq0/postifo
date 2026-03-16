import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.jsx'
import { ComingSoonBadge } from './ui/Badge.jsx'
import { pageVariants } from '../lib/animations.js'

const NAV_ITEMS = [
  { to: '/',        label: 'Dashboard', icon: '⬡' },
  { to: '/library', label: 'Library',   icon: '🌐' },
  { to: '/hooks',   label: 'Hooks',     icon: '🪝' },
  { to: '/saved',   label: 'Saved',     icon: '🔖' },
]

const COMING_SOON = [
  { to: '/coming-soon/content-ideas',  label: 'Content Ideas'    },
  { to: '/coming-soon/comparison',     label: 'Compare'          },
  { to: '/coming-soon/alerts',         label: 'Smart Alerts'     },
  { to: '/coming-soon/team',           label: 'Team Workspace'   },
]

function Avatar({ name, size = 7 }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}
      style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}
    >
      {initials}
    </div>
  )
}

export { Avatar }

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col sticky top-0 h-screen border-r"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>

        {/* Logo */}
        <div className="px-5 h-16 flex items-center border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <img src="/logo.svg" alt="Postifo" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Postifo
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active ? 'text-brand-coral' : 'hover:text-ink-primary'
                }`}
                style={{
                  color: active ? 'var(--color-coral)' : 'var(--text-secondary)',
                  background: active ? 'rgba(255,107,53,0.1)' : 'transparent',
                }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
                {active && (
                  <motion.div layoutId="nav-dot"
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--color-coral)' }}
                  />
                )}
              </Link>
            )
          })}

          {/* Divider + coming soon */}
          <div className="pt-4 pb-1">
            <div className="section-title px-3 mb-2">Coming Soon</div>
            {COMING_SOON.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.label}
                <ComingSoonBadge />
              </Link>
            ))}
          </div>
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <Link to="/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors mb-1">
            <Avatar name={user?.name || user?.email} size={7} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.name || 'Account'}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {user?.email}
              </div>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span>→</span> Log out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar (mobile / breadcrumb) */}
        <header className="h-16 flex items-center px-6 border-b gap-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="badge badge-gold text-xs">
              {user?.plan || 'free'} plan
            </span>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-auto">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
