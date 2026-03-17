import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client.js'
import { staggerContainer, staggerItem } from '../lib/animations.js'
import AnimatedNumber from '../components/ui/AnimatedNumber.jsx'
import { SkeletonCreatorCard } from '../components/ui/Skeleton.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/ui/Toast.jsx'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function freshnessBadge(lastScraped) {
  if (!lastScraped) return { label: 'No data', type: 'muted' }
  const hours = (Date.now() - new Date(lastScraped).getTime()) / 3600000
  if (hours < 24)  return { label: 'Today',     type: 'mint'    }
  if (hours < 168) return { label: 'This week', type: 'gold'    }
  const days = Math.floor(hours / 24)
  return { label: `${days}d ago`, type: 'crimson' }
}

function CreatorCard({ creator, onUntrack }) {
  const fresh = freshnessBadge(creator.lastScraped)

  return (
    <motion.div variants={staggerItem} layout>
      <Link to={`/creator/${creator.id}`} className="block group h-full">
        <div
          className="card h-full flex flex-col transition-all duration-200 relative overflow-hidden"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="absolute top-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ height: 2, background: 'linear-gradient(90deg, #FF6B35, #FFBE0B)' }}
          />
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.04), rgba(255,190,11,0.02))' }}
          />

          <div className="flex items-start gap-3 mb-4 relative">
            {creator.avatarUrl
              ? <img src={creator.avatarUrl} alt={creator.name}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-transparent group-hover:ring-orange-500/30 transition-all duration-200" />
              : <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}>
                  {creator.name?.slice(0, 2).toUpperCase() || '?'}
                </div>
            }
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {creator.name}
              </div>
              {creator.headline && (
                <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {creator.headline}
                </div>
              )}
            </div>
            <Badge type={fresh.type} dot>{fresh.label}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
            {[
              { label: 'Posts',     value: creator.postCount       || 0 },
              { label: 'Reactions', value: creator.latestReactions || 0 },
              { label: 'Comments',  value: creator.latestComments  || 0 },
            ].map(s => (
              <div key={s.label} className="text-center">
                <AnimatedNumber value={s.value} className="text-base font-bold font-mono block"
                  style={{ color: 'var(--text-primary)' }} />
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 mb-4 flex-1">
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Posts collected</span>
              <span className="font-mono">{creator.postCount || 0}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
              <motion.div className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #FF6B35, #FFBE0B)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((creator.postCount || 0) / 100) * 100, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Since {new Date(creator.trackedSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-1">
              {creator.linkedinUrl && (
                <button
                  title="Refresh posts (opens LinkedIn activity page)"
                  onClick={e => {
                    e.preventDefault()
                    window.open(`${creator.linkedinUrl.replace(/\/$/, '')}/recent-activity/all/`, '_blank')
                  }}
                  className="text-xs px-2 py-1 rounded-lg transition-all"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,190,11,0.1)'; e.currentTarget.style.color = '#FFBE0B' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  ↻
                </button>
              )}
              <button
                onClick={e => { e.preventDefault(); onUntrack(creator.id) }}
                className="text-xs px-2 py-1 rounded-lg transition-all"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,71,111,0.1)'; e.currentTarget.style.color = '#EF476F' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                Untrack
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ── Search result card ────────────────────────────────────────────────────────
function SearchResultCard({ creator, onTrack }) {
  const [tracking, setTracking] = useState(false)
  const [tracked,  setTracked]  = useState(creator.isTracked)
  const navigate = useNavigate()

  async function handleTrack(e) {
    e.stopPropagation()
    if (tracked) return
    setTracking(true)
    try {
      await onTrack(creator)
      setTracked(true)
    } finally {
      setTracking(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150"
      style={{ background: 'var(--bg-elevated)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onClick={() => navigate(`/creator/${creator.id}`)}
    >
      {creator.avatarUrl
        ? <img src={creator.avatarUrl} alt={creator.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        : <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}>
            {creator.name?.slice(0, 2).toUpperCase() || '?'}
          </div>
      }

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {creator.name}
        </div>
        {creator.headline && (
          <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {creator.headline}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
            {creator.postCount}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>posts</div>
        </div>
        <button
          onClick={handleTrack}
          disabled={tracking || tracked}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex-shrink-0"
          style={{
            background: tracked ? 'rgba(6,214,160,0.12)' : 'rgba(255,107,53,0.12)',
            color:       tracked ? 'var(--color-mint)'   : 'var(--color-coral)',
            border: 'none', cursor: tracked ? 'default' : 'pointer',
            opacity: tracking ? 0.6 : 1,
          }}
        >
          {tracking ? '…' : tracked ? '✓ Tracked' : '+ Track'}
        </button>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }  = useAuth()
  const toast     = useToast()

  // Per-user data
  const [creators, setCreators] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  // Global platform stats
  const [globalStats, setGlobalStats] = useState(null)

  // Explore: global creator DB discovery
  const [exploreCreators, setExploreCreators] = useState([])

  // Search
  const [query,         setQuery]         = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching]     = useState(false)
  const [searched,      setSearched]      = useState(false) // has a real search been attempted
  const debounceRef = useRef(null)

  useEffect(() => {
    api.stats.global().then(setGlobalStats).catch(() => {})
    api.creators.explore(12).then(setExploreCreators).catch(() => {})
    api.creators.syncTracked()
      .catch(() => {})
      .then(() => api.creators.list())
      .then(setCreators)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = useCallback((q) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([])
      setSearched(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearched(true)
      try {
        const results = await api.creators.search(q)
        setSearchResults(results)
      } catch (e) {
        toast(e.message, 'error')
      } finally {
        setSearching(false)
      }
    }, 350)
  }, [toast])

  async function handleTrack(creator) {
    await api.creators.track({
      linkedinUrl:  creator.linkedinUrl,
      name:         creator.name,
      headline:     creator.headline,
      avatarUrl:    creator.avatarUrl,
      followerCount: creator.followerCount,
    })
    // Refresh tracked list + mark as tracked in explore list
    const updated = await api.creators.list()
    setCreators(updated)
    setExploreCreators(prev => prev.map(c => c.id === creator.id ? { ...c, isTracked: true } : c))
    toast(`Now tracking ${creator.name}`, 'success')
  }

  async function handleUntrack(id) {
    if (!confirm('Stop tracking this creator?')) return
    try {
      await api.creators.untrack(id)
      setCreators(prev => prev.filter(c => c.id !== id))
    } catch (e) { toast(e.message, 'error') }
  }

  const totalPosts    = creators.reduce((s, c) => s + (c.postCount || 0), 0)
  const totalCreators = creators.length
  const avgPosts      = totalCreators ? Math.round(totalPosts / totalCreators) : 0

  const showSearch    = query.trim().length >= 2
  const noResults     = searched && !searching && searchResults.length === 0

  if (error) return (
    <div className="card text-center py-12" style={{ color: 'var(--color-crimson)' }}>{error}</div>
  )

  const firstName = user?.name?.split(' ')[0] || null

  return (
    <div className="space-y-10 w-full">

      {/* ── Welcome ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ''} 👋
          </p>
          <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            Your Creator Intelligence
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            Track, analyze, and learn from the best LinkedIn creators.
          </p>
        </div>
        <Link to="/library" className="flex-shrink-0">
          <Button variant="outline" size="sm">Viral Library →</Button>
        </Link>
      </div>

      {/* ── Platform stats (global) ── */}
      {globalStats && (
        <div>
          <p className="section-title mb-3">Platform Database</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Creators in DB',  value: globalStats.creators, icon: '👥', color: '#FF6B35', sub: 'profiles with data'   },
              { label: 'Posts Collected', value: globalStats.posts,    icon: '📝', color: '#FFBE0B', sub: 'across all creators'  },
              { label: 'Active Users',    value: globalStats.users,    icon: '🔍', color: '#06D6A0', sub: 'people using Postifo' },
            ].map(m => (
              <div key={m.label}
                className="card p-5 flex flex-col gap-2 relative overflow-hidden"
                style={{ borderTop: `2px solid ${m.color}` }}
              >
                <div
                  className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${m.color}, transparent)`, opacity: 0.1 }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xl">{m.icon}</span>
                  <div className="w-2 h-2 rounded-full" style={{ background: m.color, opacity: 0.6 }} />
                </div>
                <AnimatedNumber value={m.value} className="text-3xl font-bold font-mono"
                  style={{ color: 'var(--text-primary)' }} />
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{m.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Creator search ── */}
      <div>
        <p className="section-title mb-3">Find a Creator</p>
        <div className="relative">
          <div className="relative">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            >
              🔍
            </span>
            {searching && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 rounded-full border-2 animate-spin"
                  style={{ borderColor: 'var(--color-coral)', borderTopColor: 'transparent' }} />
              </span>
            )}
            <input
              type="text"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name or headline…"
              className="input w-full"
              style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem', fontSize: '0.9rem', height: 48 }}
            />
          </div>

          {/* Results panel */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="mt-2 rounded-xl overflow-hidden border"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                {noResults ? (
                  /* Not found → install extension CTA */
                  <div className="p-6 text-center">
                    <div className="text-3xl mb-3">🔎</div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      No creators found for "{query}"
                    </p>
                    <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
                      This creator isn't in our database yet. Analyse them with the extension.
                    </p>
                    <div className="flex flex-col gap-2.5 items-start max-w-xs mx-auto text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {[
                        'Install the Postifo Chrome Extension',
                        'Visit their LinkedIn profile',
                        'Click "Track Creator" in the popup',
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: 'rgba(255,107,53,0.15)', color: 'var(--color-coral)' }}
                          >
                            {i + 1}
                          </span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    <AnimatePresence>
                      {searchResults.map(c => (
                        <SearchResultCard key={c.id} creator={c} onTrack={handleTrack} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Your tracked creators ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <p className="section-title">Your Tracked Creators</p>
            {creators.length > 0 && (
              <span className="badge badge-muted text-xs">{creators.length}</span>
            )}
          </div>
          {creators.length > 0 && !loading && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {totalPosts.toLocaleString()}
              </span> posts · avg{' '}
              <span className="font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {avgPosts}
              </span>/creator
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <SkeletonCreatorCard key={i} />)}
          </div>
        ) : creators.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="card text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              No creators tracked yet
            </h2>
            <p className="text-sm max-w-sm mx-auto mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Search for a creator above to see if they're already in our database,
              or install the extension to analyse someone new.
            </p>
            <div className="flex flex-col gap-3 items-center">
              {[
                'Install the Chrome extension',
                'Go to any LinkedIn creator profile',
                'Click "Track Creator" in the popup',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(255,107,53,0.15)', color: 'var(--color-coral)' }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {creators.map(c => <CreatorCard key={c.id} creator={c} onUntrack={handleUntrack} />)}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Explore Creators (global DB discovery) ── */}
      {exploreCreators.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">Explore Creators</p>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Popular in the database — click <strong style={{ color: 'var(--color-coral)' }}>+ Track</strong> to add
            </span>
          </div>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <div className="p-2 space-y-1">
              <AnimatePresence>
                {exploreCreators.map(c => (
                  <SearchResultCard key={c.id} creator={c} onTrack={handleTrack} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ── Library CTA ── */}
      {creators.length > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-6 flex items-center justify-between gap-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(255,190,11,0.06))',
            border: '1px solid rgba(255,107,53,0.18)',
          }}
        >
          <div
            className="absolute -right-10 -top-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.12), transparent)' }}
          />
          <div className="relative">
            <div className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              Explore the Viral Library
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {totalPosts.toLocaleString()} posts across {totalCreators} creator{totalCreators !== 1 ? 's' : ''} — sortable, filterable, searchable.
            </div>
          </div>
          <Link to="/library" className="flex-shrink-0 relative">
            <Button variant="primary" size="sm">Open Library →</Button>
          </Link>
        </motion.div>
      )}
    </div>
  )
}
