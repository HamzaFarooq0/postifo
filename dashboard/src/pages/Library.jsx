import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client.js'
import { staggerContainer, staggerItem } from '../lib/animations.js'
import AnimatedNumber from '../components/ui/AnimatedNumber.jsx'
import { SkeletonCard } from '../components/ui/Skeleton.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Select from '../components/ui/Select.jsx'
import { useToast } from '../components/ui/Toast.jsx'

const POST_TYPE_OPTIONS = [
  { value: 'all',       label: 'All types'  },
  { value: 'text',      label: 'Text'       },
  { value: 'image',     label: 'Image'      },
  { value: 'carousel',  label: 'Carousel'   },
  { value: 'video',     label: 'Video'      },
  { value: 'poll',      label: 'Poll'       },
]

const SORT_OPTIONS = [
  { value: 'reactions', label: 'By Reactions'    },
  { value: 'comments',  label: 'By Comments'     },
  { value: 'scrapedAt', label: 'By Date Scraped' },
]

function PostCard({ post, savedIds, onSave }) {
  const [expanded, setExpanded] = useState(false)
  const [fullHeight, setFullHeight] = useState(null)
  const innerRef = useRef(null)
  const isLong  = post.content && post.content.length > 210
  const isSaved = savedIds.includes(post.id)

  useEffect(() => {
    if (innerRef.current) setFullHeight(innerRef.current.scrollHeight)
  }, [post.content])

  return (
    <motion.div variants={staggerItem} className="card h-full flex flex-col space-y-3">
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

      {/* Content with smooth expand */}
      {post.content ? (
        <div>
          <div style={{ position: 'relative' }}>
            <motion.div
              initial={false}
              animate={{ height: !isLong ? 'auto' : expanded ? (fullHeight ?? 'auto') : 72 }}
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div ref={innerRef}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {post.content}
                </p>
              </div>
            </motion.div>
            {isLong && !expanded && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
                background: 'linear-gradient(to bottom, transparent, var(--bg-surface))',
                pointerEvents: 'none',
              }} />
            )}
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs mt-1.5 font-medium"
              style={{ color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {expanded ? 'Show less ↑' : 'Show more ↓'}
            </button>
          )}
        </div>
      ) : <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No content</p>}

      {/* Stats */}
      <div className="flex items-center gap-5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-coral)', flexShrink: 0 }}>
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3v11z"/>
          </svg>
          <strong className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{(post.reactions||0).toLocaleString()}</strong>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>reactions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <strong className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{(post.comments||0).toLocaleString()}</strong>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>comments</span>
        </div>
        {post.reposts > 0 && (
          <div className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <strong className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{(post.reposts||0).toLocaleString()}</strong>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>reposts</span>
          </div>
        )}
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
            { label: 'Total Posts',    value: stats.totalPosts,     icon: '📄' },
            { label: 'Creators',       value: stats.totalCreators,  icon: '👤' },
            { label: 'Added This Week', value: stats.postsThisWeek, icon: '🔥' },
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
        <input
          type="text" placeholder="Search posts…" value={search}
          onChange={e => { setSearch(e.target.value); setOffset(0) }}
          className="input flex-1 min-w-[160px]"
        />
        <Select
          value={postType}
          onChange={v => { setPostType(v); setOffset(0) }}
          options={POST_TYPE_OPTIONS}
          className="w-36"
        />
        <input
          type="number" placeholder="Min reactions" value={minReact}
          onChange={e => { setMinReact(e.target.value); setOffset(0) }}
          className="input w-36"
        />
        <Select
          value={sortBy}
          onChange={v => { setSortBy(v); setOffset(0) }}
          options={SORT_OPTIONS}
          className="w-40"
        />
        <button
          onClick={() => { setOrder(o => o === 'desc' ? 'asc' : 'desc'); setOffset(0) }}
          className="btn-ghost px-3 text-sm"
        >
          {order === 'desc' ? '↓ Desc' : '↑ Asc'}
        </button>
      </div>

      <div className="text-sm flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
        <span>
          Showing{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{offset + 1}–{Math.min(offset + LIMIT, total)}</strong>
          {' '}of{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> posts
        </span>
        {(search || postType !== 'all' || minReact) && (
          <button
            onClick={() => { setSearch(''); setPostType('all'); setMinReact(''); setOffset(0) }}
            className="text-xs hover:underline"
            style={{ color: 'var(--color-crimson)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
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
        <motion.div variants={staggerContainer} initial="initial" animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
