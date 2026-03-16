import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client.js'
import { staggerContainer, staggerItem } from '../lib/animations.js'
import AnimatedNumber from '../components/ui/AnimatedNumber.jsx'
import { SkeletonCard } from '../components/ui/Skeleton.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { useToast } from '../components/ui/Toast.jsx'

function PostCard({ post, savedIds, onSave }) {
  const [expanded, setExpanded] = useState(false)
  const isLong  = post.content && post.content.length > 240
  const isSaved = savedIds.includes(post.id)

  return (
    <motion.div variants={staggerItem} layout className="card space-y-3">
      {/* Creator row */}
      {post.creator && (
        <div className="flex items-center gap-2">
          {post.creator.avatarUrl
            ? <img src={post.creator.avatarUrl} alt={post.creator.name} className="w-6 h-6 rounded-full object-cover" />
            : <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}>
                {post.creator.name?.slice(0,1)}
              </div>}
          <Link to={`/creator/${post.creator.id}`}
            className="text-xs font-medium hover:underline" style={{ color: 'var(--color-coral)' }}>
            {post.creator.name}
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {post.postType && <Badge type={post.postType}>{post.postType}</Badge>}
          {post.postedAt && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {new Date(post.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => onSave(post.id, isSaved)}
            className="text-xs px-2 py-1 rounded-lg transition-colors"
            style={{
              color: isSaved ? 'var(--color-gold)' : 'var(--text-muted)',
              background: isSaved ? 'rgba(255,190,11,0.1)' : 'transparent',
              border: 'none', cursor: 'pointer',
            }}>
            {isSaved ? '★ Saved' : '☆ Save'}
          </button>
          <a href={post.postUrl} target="_blank" rel="noreferrer"
            className="text-xs hover:underline" style={{ color: 'var(--color-coral)' }}>View ↗</a>
        </div>
      </div>

      {/* Content */}
      {post.content ? (
        <div>
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}
            style={{ color: 'var(--text-secondary)' }}>
            {post.content}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(e => !e)}
              className="text-xs mt-1 hover:underline"
              style={{ color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {expanded ? 'Show less ↑' : 'Show more ↓'}
            </button>
          )}
        </div>
      ) : <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No content</p>}

      {/* Stats */}
      <div className="flex items-center gap-4 pt-2 border-t text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
        <span style={{ color: 'var(--text-muted)' }}>❤️ <strong style={{ color: 'var(--text-primary)' }}>{(post.reactions||0).toLocaleString()}</strong></span>
        <span style={{ color: 'var(--text-muted)' }}>💬 <strong style={{ color: 'var(--text-primary)' }}>{(post.comments||0).toLocaleString()}</strong></span>
      </div>
    </motion.div>
  )
}

export default function Library() {
  const toast = useToast()
  const [posts,     setPosts]     = useState([])
  const [total,     setTotal]     = useState(0)
  const [stats,     setStats]     = useState(null)
  const [savedIds,  setSavedIds]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [sortBy,    setSortBy]    = useState('reactions')
  const [order,     setOrder]     = useState('desc')
  const [postType,  setPostType]  = useState('all')
  const [minReact,  setMinReact]  = useState('')
  const [search,    setSearch]    = useState('')
  const [offset,    setOffset]    = useState(0)
  const LIMIT = 20

  const load = useCallback(() => {
    setLoading(true)
    const params = { sortBy, order, limit: LIMIT, offset }
    if (postType !== 'all') params.postType = postType
    if (minReact) params.minReactions = minReact
    if (search)   params.search = search

    Promise.all([
      api.library.list(params),
      stats ? Promise.resolve(null) : api.library.stats(),
      savedIds.length === 0 ? api.saved.ids() : Promise.resolve(null),
    ]).then(([res, s, ids]) => {
      setPosts(res.posts || [])
      setTotal(res.total || 0)
      if (s) setStats(s)
      if (ids) setSavedIds(ids)
    }).catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [sortBy, order, postType, minReact, search, offset])

  useEffect(() => { load() }, [load])

  async function handleSave(postId, isSaved) {
    try {
      if (isSaved) {
        await api.saved.unsave(postId); setSavedIds(p => p.filter(i => i !== postId))
        toast('Removed from saved', 'info')
      } else {
        await api.saved.save(postId); setSavedIds(p => [...p, postId])
        toast('Saved! ★', 'success')
      }
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Viral Library</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          All posts from all tracked creators across the network
        </p>
      </div>

      {/* Global stats */}
      {stats && (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Posts',   value: stats.totalPosts,     icon: '📄' },
            { label: 'Creators',      value: stats.totalCreators,  icon: '👤' },
            { label: 'Added This Week',value: stats.postsThisWeek, icon: '🔥' },
          ].map(m => (
            <motion.div key={m.label} variants={staggerItem} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="section-title">{m.label}</span>
                <span className="text-lg">{m.icon}</span>
              </div>
              <AnimatedNumber value={m.value} className="text-2xl" />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Trending */}
      {stats?.trending?.length > 0 && (
        <div className="card">
          <div className="section-title mb-3">🔥 Trending This Week</div>
          <div className="space-y-2">
            {stats.trending.map((p, i) => (
              <div key={p.id} className="flex items-start gap-3 py-2 border-b last:border-b-0"
                style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-lg font-bold font-mono w-6 text-center"
                  style={{ color: i === 0 ? 'var(--color-gold)' : 'var(--text-muted)' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {p.content || 'No content'}
                  </p>
                  {p.creator && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.creator.name}</span>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-semibold font-mono" style={{ color: 'var(--color-coral)' }}>
                    {(p.reactions||0).toLocaleString()}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>reactions</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Search posts…" value={search}
          onChange={e => { setSearch(e.target.value); setOffset(0) }}
          className="input flex-1 min-w-[160px]" />
        <select value={postType} onChange={e => { setPostType(e.target.value); setOffset(0) }} className="input w-36">
          <option value="all">All types</option>
          {['text','image','carousel','video','poll'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="number" placeholder="Min reactions" value={minReact}
          onChange={e => { setMinReact(e.target.value); setOffset(0) }}
          className="input w-36" />
        <select value={sortBy} onChange={e => { setSortBy(e.target.value); setOffset(0) }} className="input w-36">
          <option value="reactions">Reactions</option>
          <option value="comments">Comments</option>
          <option value="scrapedAt">Date Scraped</option>
        </select>
        <button onClick={() => { setOrder(o => o === 'desc' ? 'asc' : 'desc'); setOffset(0) }}
          className="btn-ghost px-3 text-sm">{order === 'desc' ? '↓' : '↑'}</button>
      </div>

      <div className="text-sm flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
        <span>Showing <strong style={{ color: 'var(--text-primary)' }}>{offset + 1}–{Math.min(offset + LIMIT, total)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> posts</span>
        {(search || postType !== 'all' || minReact) && (
          <button onClick={() => { setSearch(''); setPostType('all'); setMinReact(''); setOffset(0) }}
            className="text-xs hover:underline" style={{ color: 'var(--color-crimson)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
          No posts found. Try adjusting your filters.
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} savedIds={savedIds} onSave={handleSave} />
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {!loading && total > LIMIT && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))}>
            ← Prev
          </Button>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Page {Math.floor(offset / LIMIT) + 1} of {Math.ceil(total / LIMIT)}
          </span>
          <Button variant="ghost" size="sm" disabled={offset + LIMIT >= total} onClick={() => setOffset(o => o + LIMIT)}>
            Next →
          </Button>
        </div>
      )}
    </div>
  )
}
