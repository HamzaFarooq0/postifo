import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client.js'
import { staggerContainer, staggerItem } from '../lib/animations.js'
import AnimatedNumber from '../components/ui/AnimatedNumber.jsx'
import { SkeletonCreatorCard } from '../components/ui/Skeleton.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'

function freshnessBadge(lastScraped) {
  if (!lastScraped) return { label: 'No data', type: 'muted' }
  const hours = (Date.now() - new Date(lastScraped).getTime()) / 3600000
  if (hours < 24)  return { label: 'Today',     type: 'mint'    }
  if (hours < 168) return { label: 'This week', type: 'gold'    }
  return                  { label: 'Stale',      type: 'crimson' }
}

function CreatorCard({ creator, onUntrack }) {
  const fresh = freshnessBadge(creator.lastScraped)
  return (
    <motion.div variants={staggerItem} layout>
      <Link to={`/creator/${creator.id}`} className="block group">
        <div className="card hover:border-orange-500/40 transition-all duration-200 relative overflow-hidden"
          style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-card"
            style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.03), rgba(255,190,11,0.03))' }} />

          {/* Header */}
          <div className="flex items-start gap-3 mb-4 relative">
            {creator.avatarUrl
              ? <img src={creator.avatarUrl} alt={creator.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              : <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}>
                  {creator.name?.slice(0, 2).toUpperCase() || '?'}
                </div>
            }
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{creator.name}</div>
              {creator.headline && (
                <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{creator.headline}</div>
              )}
            </div>
            <Badge type={fresh.type} dot>{fresh.label}</Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Posts',     value: creator.postCount       || 0 },
              { label: 'Reactions', value: creator.latestReactions || 0 },
              { label: 'Comments',  value: creator.latestComments  || 0 },
            ].map(s => (
              <div key={s.label}>
                <AnimatedNumber value={s.value} className="text-lg" style={{ color: 'var(--text-primary)' }} />
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Posts collected</span>
              <span>{creator.postCount || 0}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
              <motion.div className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #FF6B35, #FFBE0B)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((creator.postCount || 0) / 100) * 100, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Since {new Date(creator.trackedSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <button onClick={e => { e.preventDefault(); onUntrack(creator.id) }}
              className="text-xs transition-colors hover:text-red-400"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Untrack
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function Dashboard() {
  const [creators, setCreators] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    // Sync tracking links first (fixes creators whose link was never written),
    // then load the full list. Sync failure is non-fatal.
    api.creators.syncTracked()
      .catch(() => {})
      .then(() => api.creators.list())
      .then(setCreators)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleUntrack(id) {
    if (!confirm('Stop tracking this creator?')) return
    try {
      await api.creators.untrack(id)
      setCreators(prev => prev.filter(c => c.id !== id))
    } catch (e) { alert(e.message) }
  }

  const totalPosts    = creators.reduce((s, c) => s + (c.postCount || 0), 0)
  const totalCreators = creators.length

  if (error) return <div className="card text-center py-12" style={{ color: 'var(--color-crimson)' }}>{error}</div>

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Your tracked creators at a glance</p>
        </div>
        <Link to="/library"><Button variant="outline" size="sm">Viral Library →</Button></Link>
      </div>

      {/* Stats bar */}
      {!loading && (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-3 gap-4">
          {[
            { label: 'Creators Tracked', value: totalCreators,
              sub: totalCreators === 1 ? '1 creator' : `${totalCreators} creators` },
            { label: 'Posts Collected',  value: totalPosts,
              sub: 'across all creators' },
            { label: 'Avg Posts/Creator', value: totalCreators ? Math.round(totalPosts / totalCreators) : 0,
              sub: 'posts per creator' },
          ].map(m => (
            <motion.div key={m.label} variants={staggerItem}
              className="card p-5 flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}>{m.label}</span>
              <AnimatedNumber value={m.value} className="text-4xl font-bold font-mono"
                style={{ color: 'var(--text-primary)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.sub}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Creator grid */}
      <div>
        <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Tracked Creators
          {creators.length > 0 && <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>({creators.length})</span>}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <SkeletonCreatorCard key={i} />)}
          </div>
        ) : creators.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="card text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No creators tracked yet</h2>
            <p className="text-sm max-w-sm mx-auto mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Install the <strong>Postifo Chrome Extension</strong>, navigate to a LinkedIn creator profile, and click <strong>Track Creator</strong>.
            </p>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: 'rgba(255,107,53,0.1)', color: 'var(--color-coral)', border: '1px solid rgba(255,107,53,0.2)' }}>
              📦 Get started with the extension
            </span>
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

      {/* Library CTA */}
      {creators.length > 0 && !loading && (
        <div className="card flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>
              Explore the Viral Library
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              All posts across all creators — sortable, filterable, searchable.
            </div>
          </div>
          <Link to="/library"><Button variant="primary" size="sm">Open Library</Button></Link>
        </div>
      )}
    </div>
  )
}
