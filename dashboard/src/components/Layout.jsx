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
  { to: '/coming-soon/content-ideas',  label: 'Content Ideas'  },
  { to: '/coming-soon/comparison',     label: 'Compare'        },
  { to: '/coming-soon/alerts',         label: 'Smart Alerts'   },
  { to: '/coming-soon/team',           label: 'Team Workspace' },
]

const PAGE_TITLES = {
  '/':         'Dashboard',
  '/library':  'Viral Library',
  '/hooks':    'Hooks',
  '/saved':    'Saved Posts',
  '/settings': 'Settings',
}

function Avatar({ name, size = 7 }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  const px = size * 4
  return (
    <div
      style={{
        width: px, height: px,
        background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)',
        color: '#fff',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

export { Avatar }

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  // Determine page title — handles dynamic routes like /creator/:id
  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/creator') ? 'Creator Profile' : 'Postifo')

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex-shrink-0 flex flex-col sticky top-0 h-screen border-r"
        style={{ width: 232, background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Logo */}
        <div className="px-5 h-16 flex items-center border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <Link to="/" className="flex items-center gap-3 select-none">
            <div
              className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)' }}
            >
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem' }}>P</span>
            </div>
            <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Postifo</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto no-scrollbar flex flex-col gap-6">

          {/* Main nav */}
          <div>
            <div className="section-title px-3 mb-2">Menu</div>
            <div className="space-y-0.5">
              {NAV_ITEMS.map(item => {
                const active = isActive(item.to)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group"
                    style={{
                      color: active ? 'var(--color-coral)' : 'var(--text-secondary)',
                      background: active ? 'rgba(255,107,53,0.1)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span
                      className="flex items-center justify-center rounded-lg text-base flex-shrink-0 transition-all duration-150"
                      style={{
                        width: 28, height: 28,
                        background: active ? 'rgba(255,107,53,0.15)' : 'var(--bg-elevated)',
                      }}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {active && (
                      <motion.div
                        layoutId="nav-dot"
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: 'var(--color-coral)' }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Coming soon */}
          <div>
            <div className="section-title px-3 mb-2">Coming Soon</div>
            <div className="space-y-0.5">
              {COMING_SOON.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {item.label}
                  <ComingSoonBadge />
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <Link
            to="/settings"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150 mb-1"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
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
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: 'var(--bg-elevated)' }}>⇥</span>
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Top bar */}
        <header
          className="flex items-center px-8 gap-4 flex-shrink-0 border-b"
          style={{ height: 64, background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h1 className="font-semibold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
              {pageTitle}
            </h1>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="badge badge-gold text-xs capitalize">{user?.plan || 'free'} plan</span>
            <Avatar name={user?.name || user?.email} size={7} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="px-8 py-8 max-w-7xl mx-auto w-full">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}
