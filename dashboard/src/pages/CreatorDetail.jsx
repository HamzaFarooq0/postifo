import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api, downloadBlob } from '../api/client.js'
import { staggerContainer, staggerItem } from '../lib/animations.js'
import AnimatedNumber from '../components/ui/AnimatedNumber.jsx'
import { SkeletonRow } from '../components/ui/Skeleton.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Select from '../components/ui/Select.jsx'
import { useToast } from '../components/ui/Toast.jsx'

// ── Options ───────────────────────────────────────────────────────────────────
const POST_TYPE_OPTIONS = [
  { value: 'all',      label: 'All types'    },
  { value: 'text',     label: 'Text'         },
  { value: 'image',    label: 'Image'        },
  { value: 'carousel', label: 'Carousel'     },
  { value: 'video',    label: 'Video'        },
  { value: 'poll',     label: 'Poll'         },
]

const SORT_OPTIONS = [
  { value: 'reactions', label: 'By Reactions'  },
  { value: 'comments',  label: 'By Comments'   },
  { value: 'scrapedAt', label: 'By Analysed'   },
  { value: 'postedAt',  label: 'By Post Date'  },
]

// ── Chart tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-elevated px-3 py-2 text-xs space-y-1" style={{ minWidth: 120 }}>
      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }}>●</span>
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

// ── PostCard with animated show-more ─────────────────────────────────────────
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
      <div className="flex items-center justify-between gap-3">
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
            className="text-xs hover:underline" style={{ color: 'var(--color-coral)' }}>
            View ↗
          </a>
        </div>
      </div>

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
      ) : <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No text content</p>}

      <div className="flex items-center gap-5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Reactions */}
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-coral)', flexShrink: 0 }}>
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3v11z"/>
          </svg>
          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
            {(post.reactions || 0).toLocaleString()}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>reactions</span>
        </div>
        {/* Comments */}
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
            {(post.comments || 0).toLocaleString()}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>comments</span>
        </div>
        {/* Reposts — only show if we have data */}
        {post.reposts > 0 && (
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
              {(post.reposts || 0).toLocaleString()}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>reposts</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CreatorDetail() {
  const { id }  = useParams()
  const toast   = useToast()
  const [creator,     setCreator]     = useState(null)
  const [analytics,   setAnalytics]   = useState(null)
  const [posts,       setPosts]       = useState([])
  const [savedIds,    setSavedIds]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [sortBy,      setSortBy]      = useState('reactions')
  const [order,       setOrder]       = useState('desc')
  const [postType,    setPostType]    = useState('all')
  const [search,      setSearch]      = useState('')
  const [chartView,   setChartView]   = useState('reactions')
  const [exporting,   setExporting]   = useState(false)
  const [isTracked,   setIsTracked]   = useState(false)
  const [trackingNow, setTrackingNow] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.creators.get(id, { sortBy, order, limit: 100 }),
      api.analytics.get(id).catch(() => null),
      api.saved.ids(),
    ]).then(([c, a, ids]) => {
      setCreator(c); setPosts(c.posts || [])
      setIsTracked(c.isTracked ?? false)
      setAnalytics(a); setSavedIds(ids)
    }).catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [id, sortBy, order])

  // ── Actions ────────────────────────────────────────────────────────────
  async function handleTrack() {
    setTrackingNow(true)
    try {
      await api.creators.track({
        linkedinUrl:   creator.linkedinUrl,
        name:          creator.name,
        headline:      creator.headline,
        avatarUrl:     creator.avatarUrl,
        followerCount: creator.followerCount,
      })
      setIsTracked(true)
      toast(`Now tracking ${creator.name}`, 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setTrackingNow(false) }
  }

  async function handleSave(postId, isSaved) {
    try {
      if (isSaved) {
        await api.saved.unsave(postId)
        setSavedIds(prev => prev.filter(i => i !== postId))
        toast('Removed from saved', 'info')
      } else {
        await api.saved.save(postId)
        setSavedIds(prev => [...prev, postId])
        toast('Post saved! ★', 'success')
      }
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await api.export.creator(id)
      downloadBlob(blob, `${creator?.name?.replace(/\s+/g, '-')}-posts.csv`)
      toast('CSV downloaded!', 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setExporting(false) }
  }

  const filtered = posts.filter(p => {
    if (postType !== 'all' && p.postType !== postType) return false
    if (search && !p.content?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6 max-w-4xl">
      <div className="card h-28 skeleton" />
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="card h-20 skeleton" />)}</div>
      <SkeletonRow count={3} />
    </div>
  )

  if (!creator) return <div className="card text-center py-12" style={{ color: 'var(--color-crimson)' }}>Creator not found</div>

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link to="/" className="hover:underline" style={{ color: 'var(--color-coral)' }}>Dashboard</Link>
        <span>/</span><span style={{ color: 'var(--text-primary)' }}>{creator.name}</span>
      </div>

      {/* Not-tracking banner */}
      {!isTracked && (
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
          style={{ background: 'rgba(255,190,11,0.08)', border: '1px solid rgba(255,190,11,0.2)' }}
        >
          <div className="text-sm" style={{ color: 'var(--color-gold)' }}>
            👀 You're browsing this creator's data. Track them to save posts and export to CSV.
          </div>
          <Button variant="gold" size="sm" loading={trackingNow} onClick={handleTrack}>+ Track</Button>
        </div>
      )}

      {/* Creator header */}
      <div className="card">
        <div className="flex items-start gap-4 flex-wrap">
          {creator.avatarUrl
            ? <img src={creator.avatarUrl} alt={creator.name} className="w-16 h-16 rounded-full object-cover" />
            : <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}>
                {creator.name?.slice(0, 2).toUpperCase()}
              </div>}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{creator.name}</h1>
            {creator.headline && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{creator.headline}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {creator.followerCount > 0 && <Badge type="teal">{creator.followerCount.toLocaleString()} followers</Badge>}
              <Badge type="muted">{creator.postCount} posts</Badge>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {creator.linkedinUrl && (
              <a href={creator.linkedinUrl} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm">View Profile ↗</Button>
              </a>
            )}
            {isTracked
              ? <Button variant="outline" size="sm" loading={exporting} onClick={handleExport}>↓ CSV</Button>
              : <Button variant="primary" size="sm" loading={trackingNow} onClick={handleTrack}>+ Track Creator</Button>
            }
          </div>
        </div>
      </div>

      {/* Analytics grid */}
      {analytics && (
        <motion.div variants={staggerContainer} initial="initial" animate="animate"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Posts',   value: analytics.totalPosts,         isText: false },
            { label: 'Avg Reactions', value: analytics.avgReactions,        isText: false },
            { label: 'Avg Comments',  value: analytics.avgComments,         isText: false },
            { label: 'Posts/Week',    value: analytics.postingFrequency,    isText: false },
            { label: 'Best Type',     value: analytics.topPostType  || '—', isText: true  },
            { label: 'Best Day',      value: analytics.bestPostingDay || '—', isText: true },
          ].map(s => (
            <motion.div key={s.label} variants={staggerItem} className="card text-center py-3">
              {s.isText
                ? <div className="text-lg font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                : <AnimatedNumber value={s.value} className="text-2xl" />}
              <div className="text-xs mt-1 section-title">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Engagement chart */}
      {analytics?.engagementOverTime?.length > 1 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Engagement Over Time</h3>
            <div className="flex gap-1">
              {['reactions','comments'].map(v => (
                <button key={v} onClick={() => setChartView(v)}
                  className="px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors"
                  style={{
                    background: chartView === v ? 'rgba(255,107,53,0.15)' : 'transparent',
                    color: chartView === v ? 'var(--color-coral)' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer',
                  }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analytics.engagementOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(64,64,64,0.4)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#737373' }} />
              <YAxis tick={{ fontSize: 10, fill: '#737373' }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey={chartView}
                stroke={chartView === 'reactions' ? '#FF6B35' : '#118AB2'}
                strokeWidth={2} dot={false}
                name={chartView.charAt(0).toUpperCase() + chartView.slice(1)} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Content Intelligence teaser → Full Analysis page ──────────── */}
      {analytics && posts.length >= 3 && (
        <div
          className="card flex items-center justify-between gap-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.06), rgba(255,190,11,0.04))' }}
        >
          <div
            className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.15), transparent)' }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">📊</span>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Postifo Analysis
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,107,53,0.12)', color: 'var(--color-coral)' }}>
                {posts.length} posts
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Charts, hooks, topic breakdown, posting patterns, strategy analysis &amp; more.
            </p>
          </div>
          <Link to={`/creator/${id}/analysis`} className="flex-shrink-0 relative">
            <Button variant="primary" size="sm">Full Analysis →</Button>
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Search posts…" value={search}
          onChange={e => setSearch(e.target.value)} className="input flex-1 min-w-[160px]" />
        <Select
          value={postType}
          onChange={setPostType}
          options={POST_TYPE_OPTIONS}
          className="w-36"
        />
        <Select
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS}
          className="w-40"
        />
        <button
          onClick={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')}
          className="btn-ghost px-3 text-sm"
        >
          {order === 'desc' ? '↓ Desc' : '↑ Asc'}
        </button>
      </div>

      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> posts
      </div>

      {filtered.length === 0
        ? <div className="card text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No posts match filters.</div>
        : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(post => <PostCard key={post.id} post={post} savedIds={savedIds} onSave={handleSave} />)}
          </motion.div>
        )
      }
    </div>
  )
}
