import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api, downloadBlob } from '../api/client.js'
import { staggerContainer, staggerItem } from '../lib/animations.js'
import AnimatedNumber from '../components/ui/AnimatedNumber.jsx'
import { SkeletonRow } from '../components/ui/Skeleton.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { useToast } from '../components/ui/Toast.jsx'

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

function PostCard({ post, savedIds, onSave }) {
  const [expanded, setExpanded] = useState(false)
  const isLong  = post.content && post.content.length > 280
  const isSaved = savedIds.includes(post.id)

  return (
    <motion.div variants={staggerItem} layout className="card space-y-3">
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
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-4' : ''}`}
            style={{ color: 'var(--text-secondary)' }}>
            {post.content}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(e => !e)}
              className="text-xs mt-1.5 hover:underline"
              style={{ color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {expanded ? 'Show less ↑' : 'Show more ↓'}
            </button>
          )}
        </div>
      ) : <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No text content</p>}
      {post.mediaUrl && <img src={post.mediaUrl} alt="Post media" className="rounded-lg max-h-48 object-cover w-full" />}
      <div className="flex items-center gap-5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        {[
          { icon: '❤️', label: 'Reactions', value: post.reactions },
          { icon: '💬', label: 'Comments',  value: post.comments  },
          { icon: '🔁', label: 'Reposts',   value: post.reposts   },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="text-sm">{s.icon}</span>
            <div>
              <div className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                {(s.value || 0).toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function CreatorDetail() {
  const { id }  = useParams()
  const toast   = useToast()
  const [creator,   setCreator]   = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [posts,     setPosts]     = useState([])
  const [savedIds,  setSavedIds]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [sortBy,    setSortBy]    = useState('reactions')
  const [order,     setOrder]     = useState('desc')
  const [postType,  setPostType]  = useState('all')
  const [search,    setSearch]    = useState('')
  const [chartView, setChartView] = useState('reactions')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.creators.get(id, { sortBy, order, limit: 100 }),
      api.analytics.get(id),
      api.saved.ids(),
    ]).then(([c, a, ids]) => {
      setCreator(c); setPosts(c.posts || [])
      setAnalytics(a); setSavedIds(ids)
    }).catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [id, sortBy, order])

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
            <Button variant="outline" size="sm" loading={exporting} onClick={handleExport}>↓ CSV</Button>
          </div>
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <motion.div variants={staggerContainer} initial="initial" animate="animate"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Posts',  value: analytics.totalPosts,       isText: false },
            { label: 'Avg Reactions',value: analytics.avgReactions,     isText: false },
            { label: 'Avg Comments', value: analytics.avgComments,      isText: false },
            { label: 'Posts/Week',   value: analytics.postingFrequency, isText: false },
            { label: 'Best Type',    value: analytics.topPostType || '—', isText: true },
            { label: 'Best Day',     value: analytics.bestPostingDay   || '—', isText: true },
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

      {/* Chart */}
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

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Search posts…" value={search}
          onChange={e => setSearch(e.target.value)} className="input flex-1 min-w-[160px]" />
        <select value={postType} onChange={e => setPostType(e.target.value)} className="input w-36">
          <option value="all">All types</option>
          {['text','image','carousel','video','poll'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input w-40">
          <option value="reactions">By Reactions</option>
          <option value="comments">By Comments</option>
          <option value="scrapedAt">By Scraped</option>
          <option value="postedAt">By Post Date</option>
        </select>
        <button onClick={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')}
          className="btn-ghost px-3 text-sm">{order === 'desc' ? '↓ Desc' : '↑ Asc'}</button>
      </div>

      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> posts
      </div>

      {filtered.length === 0
        ? <div className="card text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No posts match filters.</div>
        : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
            {filtered.map(post => <PostCard key={post.id} post={post} savedIds={savedIds} onSave={handleSave} />)}
          </motion.div>
        )
      }
    </div>
  )
}
