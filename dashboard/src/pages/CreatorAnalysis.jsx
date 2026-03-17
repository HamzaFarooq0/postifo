import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { api } from '../api/client.js'
import { staggerContainer, staggerItem } from '../lib/animations.js'
import AnimatedNumber from '../components/ui/AnimatedNumber.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { useToast } from '../components/ui/Toast.jsx'

// ── Colours ───────────────────────────────────────────────────────────────────
const C = { coral: '#FF6B35', gold: '#FFBE0B', mint: '#06D6A0', teal: '#118AB2', purple: '#9B5DE5', muted: '#737373' }
const TYPE_COLORS = { text: C.coral, image: C.teal, carousel: C.gold, video: C.mint, poll: C.purple, other: C.muted }
const DAY_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const PERIODS = [
  { value: '30d', label: '30 days'  },
  { value: '90d', label: '3 months' },
  { value: '6mo', label: '6 months' },
  { value: 'all', label: 'All time' },
]

const HOOK_META = {
  question:     { label: 'Question',    icon: '❓', color: C.teal,   desc: 'Opens with a question to spark curiosity'   },
  number:       { label: 'Number List', icon: '🔢', color: C.gold,   desc: 'Promises specific, scannable value upfront'  },
  story:        { label: 'Personal',    icon: '📖', color: C.mint,   desc: 'Builds trust through vulnerability & story'  },
  controversial:{ label: 'Controversy', icon: '🔥', color: C.coral,  desc: 'Pattern interrupt — stops the scroll cold'   },
  framework:    { label: 'Framework',   icon: '📋', color: C.purple, desc: 'Positions creator as authority with a system' },
  statement:    { label: 'Statement',   icon: '💪', color: C.muted,  desc: 'Confident, direct — relies on authority'     },
}

// ── Topic patterns ────────────────────────────────────────────────────────────
const TOPIC_PATTERNS = [
  { topic: 'AI & Tech',      re: /\bai\b|chatgpt|gpt|llm|machine.?learning|artificial intelligence|automation|saas/i },
  { topic: 'Sales',          re: /\bsales?\b|revenue|arr|b2b|customer|pipeline|deal|crm|quota/i },
  { topic: 'Marketing',      re: /\bmarketing\b|seo|content strategy|brand|growth hack|demand gen|campaign/i },
  { topic: 'Leadership',     re: /\bleader(ship)?\b|founder|ceo|c-suite|team culture|management|hiring/i },
  { topic: 'Startups',       re: /\bstartup\b|venture|vc|funding|raise|investor|seed round/i },
  { topic: 'Career',         re: /\bcareer\b|job|interview|promotion|salary|linkedin tips|networking/i },
  { topic: 'Personal Story', re: /\bi (was|had|lost|found|learned|realized)|my (journey|story|experience)|years ago/i },
  { topic: 'Mindset',        re: /\bfail(ed|ure)?\b|lesson|mistake|mindset|believe|success|motivation/i },
]

function categorize(content) {
  for (const { topic, re } of TOPIC_PATTERNS) if (re.test(content || '')) return topic
  return 'General'
}

function detectHookType(content) {
  if (!content) return 'statement'
  const first = content.trim().split('\n')[0].trim()
  if (/^(unpopular opinion|hot take|controversial|most people|nobody talks|stop |don't |never |always )/i.test(first)) return 'controversial'
  if (/^\d+[\s\-]|^(top|the)\s*\d+|^in \d+ |\d+ (ways|tips|reasons|mistakes|things|steps|rules)/i.test(first)) return 'number'
  if (/^(i |we |my |when i |last (year|month|week)|yesterday|\d+ (years?|months?) ago)/i.test(first)) return 'story'
  if (/\?$/.test(first) || /^(do you|did you|have you|what if|why|how do|can you|should you|would you|is it|are you)/i.test(first)) return 'question'
  if (/^(the\s+(secret|formula|framework|playbook|truth|key|reason|problem|reality)|here'?s|this is how|psa:|reminder:)/i.test(first)) return 'framework'
  return 'statement'
}

function extractHook(content) {
  const c = (content || '').trim()
  const dbl = c.indexOf('\n\n')
  let end = dbl > 0 && dbl <= 260 ? dbl : Math.min(c.length, 210)
  if (end < c.length && c[end] !== ' ' && c[end] !== '\n') {
    const ls = c.lastIndexOf(' ', end)
    if (ls > end - 40) end = ls
  }
  return c.substring(0, end).trim()
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs space-y-1 shadow-xl" style={{ minWidth: 130 }}>
      <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color || p.fill }}>●</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {p.name}: <strong style={{ color: 'var(--text-primary)' }}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Strategy playbook builder ─────────────────────────────────────────────────
function buildPlaybook(analytics, posts, postTypeDist, topicsDist, hookTypeDist) {
  const insights = []
  if (!analytics || !posts.length) return insights

  const f = analytics.postingFrequency || 0
  if (f > 0) {
    const cadence = f >= 5 ? 'Daily or more' : f >= 3 ? '3–5× per week' : f >= 1 ? '1–2× per week' : 'Less than weekly'
    insights.push({
      icon: '📅', label: 'Posting Cadence',
      value: cadence,
      detail: `${f} posts/week avg${analytics.bestPostingDay ? ` · ${analytics.bestPostingDay}s drive the most engagement` : ''}.`,
    })
  }

  if (postTypeDist.length > 0) {
    const best = [...postTypeDist].sort((a, b) => b.avgReactions - a.avgReactions)[0]
    const dominant = [...postTypeDist].sort((a, b) => b.count - a.count)[0]
    insights.push({
      icon: '🎯', label: 'Best Format',
      value: best.type.charAt(0).toUpperCase() + best.type.slice(1),
      detail: best.type === dominant.type
        ? `${best.type} posts dominate AND get the most reactions (${best.avgReactions.toLocaleString()} avg).`
        : `Mostly ${dominant.type} (${dominant.pct}%) but ${best.type} outperforms at ${best.avgReactions.toLocaleString()} avg ❤️.`,
    })
  }

  if (hookTypeDist?.length > 0) {
    const best = [...hookTypeDist].sort((a, b) => b.avgReactions - a.avgReactions)[0]
    const meta = HOOK_META[best.type]
    insights.push({
      icon: meta?.icon || '🪝', label: 'Hook Strategy',
      value: `${meta?.label || best.type} hooks`,
      detail: `${meta?.desc}. Gets ${best.avgReactions.toLocaleString()} avg reactions — their best-performing opening style.`,
    })
  }

  const ratio = analytics.avgComments / Math.max(analytics.avgReactions, 1)
  insights.push({
    icon: ratio > 0.15 ? '💬' : '📢', label: 'Engagement Style',
    value: ratio > 0.2 ? 'Conversation-driven' : ratio > 0.1 ? 'Balanced' : 'Broadcast-style',
    detail: ratio > 0.2
      ? `${Math.round(ratio * 100)}% comment-to-reaction rate — content sparks real discussions.`
      : ratio > 0.1
        ? `Healthy mix of reach + discussion: ${analytics.avgComments} avg comments.`
        : `High reach (${analytics.avgReactions} avg ❤️) with lower comment rates — educational content style.`,
  })

  if (topicsDist.length > 0) {
    insights.push({
      icon: '🏷️', label: 'Content Niche',
      value: topicsDist[0].topic,
      detail: `${topicsDist[0].pct}% on ${topicsDist[0].topic}${topicsDist.length > 1 ? `. Also covers: ${topicsDist.slice(1, 3).map(t => t.topic).join(', ')}.` : '.'}`,
    })
  }

  if (posts.length >= 10) {
    const recent = [...posts].filter(p => p.postedAt).sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)).slice(0, 5)
    if (recent.length >= 3) {
      const recentAvg = recent.reduce((s, p) => s + (p.reactions || 0), 0) / recent.length
      const trend = Math.round((recentAvg / Math.max(analytics.avgReactions, 1) - 1) * 100)
      if (Math.abs(trend) >= 15) {
        insights.push({
          icon: trend > 0 ? '📈' : '📉', label: 'Momentum',
          value: trend > 0 ? `+${trend}% trending up` : `${trend}% below avg`,
          detail: trend > 0
            ? `Last 5 posts avg ${Math.round(recentAvg).toLocaleString()} reactions — beating the ${analytics.avgReactions} overall average.`
            : `Recent posts dipping — possible format experiment or topic shift.`,
        })
      }
    }
  }

  return insights
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CreatorAnalysis() {
  const { id }  = useParams()
  const toast   = useToast()
  const [creator,   setCreator]   = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [posts,     setPosts]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [period,    setPeriod]    = useState('all')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.creators.get(id, { sortBy: 'postedAt', order: 'desc', limit: 500 }),
      api.analytics.get(id).catch(() => null),
    ]).then(([c, a]) => {
      setCreator(c)
      setPosts(c.posts || [])
      setAnalytics(a)
    }).catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [id])

  // ── Period filter ──────────────────────────────────────────────────────────
  const filteredPosts = useMemo(() => {
    if (period === 'all') return posts
    const cutoff = new Date()
    if (period === '30d') cutoff.setDate(cutoff.getDate() - 30)
    else if (period === '90d') cutoff.setDate(cutoff.getDate() - 90)
    else if (period === '6mo') cutoff.setMonth(cutoff.getMonth() - 6)
    // fall back to scrapedAt if postedAt is missing
    return posts.filter(p => {
      const date = p.postedAt || p.scrapedAt
      return date && new Date(date) >= cutoff
    })
  }, [posts, period])

  // ── Format / type distribution ────────────────────────────────────────────
  const postTypeDist = useMemo(() => {
    if (!filteredPosts.length) return []
    const map = {}
    for (const p of filteredPosts) {
      const t = p.postType || 'other'
      if (!map[t]) map[t] = { type: t, count: 0, totalReactions: 0 }
      map[t].count++
      map[t].totalReactions += (p.reactions || 0)
    }
    return Object.values(map)
      .map(t => ({
        type: t.type,
        count: t.count,
        avgReactions: t.count > 0 ? Math.round(t.totalReactions / t.count) : 0,
        pct: Math.round((t.count / filteredPosts.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [filteredPosts])

  // ── Day of week ───────────────────────────────────────────────────────────
  const dayOfWeekData = useMemo(() => {
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const map = {}
    for (const p of filteredPosts) {
      if (!p.postedAt) continue
      const d = dayNames[new Date(p.postedAt).getDay()]
      if (!map[d]) map[d] = { totalReactions: 0, count: 0 }
      map[d].totalReactions += (p.reactions || 0)
      map[d].count++
    }
    return DAY_ORDER.map(d => ({
      day: d,
      avgReactions: map[d] ? Math.round(map[d].totalReactions / map[d].count) : 0,
      posts: map[d]?.count || 0,
    }))
  }, [filteredPosts])

  // ── Topics ────────────────────────────────────────────────────────────────
  const topicsDist = useMemo(() => {
    if (!filteredPosts.length) return []
    const counts = {}
    for (const p of filteredPosts) {
      const t = categorize(p.content)
      counts[t] = (counts[t] || 0) + 1
    }
    return Object.entries(counts)
      .map(([topic, count]) => ({ topic, count, pct: Math.round((count / filteredPosts.length) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [filteredPosts])

  // ── Hook analysis ─────────────────────────────────────────────────────────
  const { hookTypeDist, topHooks } = useMemo(() => {
    const withContent = filteredPosts.filter(p => p.content)
    if (!withContent.length) return { hookTypeDist: [], topHooks: [] }

    const typeMap = {}
    for (const p of withContent) {
      const type = detectHookType(p.content)
      if (!typeMap[type]) typeMap[type] = { type, count: 0, totalReactions: 0 }
      typeMap[type].count++
      typeMap[type].totalReactions += (p.reactions || 0)
    }
    const hookTypeDist = Object.values(typeMap)
      .map(t => ({
        ...t,
        avgReactions: t.count > 0 ? Math.round(t.totalReactions / t.count) : 0,
        pct: Math.round((t.count / withContent.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)

    const topHooks = [...withContent]
      .filter(p => p.reactions > 0)
      .sort((a, b) => b.reactions - a.reactions)
      .slice(0, 5)
      .map(p => ({
        hook: extractHook(p.content),
        type: detectHookType(p.content),
        reactions: p.reactions || 0,
        comments: p.comments || 0,
        postUrl: p.postUrl,
        postedAt: p.postedAt,
      }))

    return { hookTypeDist, topHooks }
  }, [filteredPosts])

  // ── Copy patterns ─────────────────────────────────────────────────────────
  const copyPatterns = useMemo(() => {
    const ps = filteredPosts.filter(p => p.content)
    if (!ps.length) return []
    const n = ps.length
    const patterns = [
      { label: 'Uses Questions',  icon: '❓', test: p => /\?/.test(p.content) },
      { label: 'Data & Numbers',  icon: '📊', test: p => /\b\d{2,}|\d+%/.test(p.content) },
      { label: 'Personal Story',  icon: '📖', test: p => /\bi\b.{0,60}\b(learned|realized|failed|built|quit|lost|started|left|got|found)\b/i.test(p.content) },
      { label: 'Has a CTA',       icon: '📢', test: p => /\b(comment|dm me|follow|share|repost|tag|what do you think|let me know|drop a)\b/i.test(p.content) },
      { label: 'List / Bullets',  icon: '📋', test: p => /^[\•\-\*]|^\d+\./m.test(p.content) },
      { label: 'Mentions People', icon: '👥', test: p => /@\w+/.test(p.content) },
    ]
    return patterns.map(({ label, icon, test }) => {
      const matching    = ps.filter(test)
      const notMatching = ps.filter(p => !test(p))
      const pct         = Math.round((matching.length / n) * 100)
      const avgWith     = matching.length    ? Math.round(matching.reduce((s, p)    => s + (p.reactions || 0), 0) / matching.length)    : 0
      const avgWithout  = notMatching.length ? Math.round(notMatching.reduce((s, p) => s + (p.reactions || 0), 0) / notMatching.length) : 0
      const lift        = avgWithout > 0 ? Math.round((avgWith / avgWithout - 1) * 100) : 0
      return { label, icon, pct, count: matching.length, avgWith, lift }
    }).sort((a, b) => b.pct - a.pct)
  }, [filteredPosts])

  // ── Content length buckets ────────────────────────────────────────────────
  const lengthBuckets = useMemo(() => {
    const ps = filteredPosts.filter(p => p.content)
    if (!ps.length) return []
    const buckets = [
      { label: 'Short',    range: '< 300 chars', min: 0,    max: 300,      posts: [] },
      { label: 'Medium',   range: '300–800',      min: 300,  max: 800,      posts: [] },
      { label: 'Long',     range: '800–2000',     min: 800,  max: 2000,     posts: [] },
      { label: 'Deep dive',range: '2000+',        min: 2000, max: Infinity, posts: [] },
    ]
    for (const p of ps) {
      const len = p.content.length
      for (const b of buckets) if (len >= b.min && len < b.max) { b.posts.push(p); break }
    }
    return buckets
      .filter(b => b.posts.length > 0)
      .map(b => ({
        label: b.label, range: b.range, count: b.posts.length,
        pct: Math.round((b.posts.length / ps.length) * 100),
        avgReactions: Math.round(b.posts.reduce((s, p) => s + (p.reactions || 0), 0) / b.posts.length),
      }))
  }, [filteredPosts])

  // ── Top 3 posts ───────────────────────────────────────────────────────────
  const topPosts = useMemo(() =>
    [...filteredPosts].filter(p => p.content).sort((a, b) => b.reactions - a.reactions).slice(0, 3),
  [filteredPosts])

  // ── Strategy playbook ─────────────────────────────────────────────────────
  const playbook = useMemo(() =>
    buildPlaybook(analytics, filteredPosts, postTypeDist, topicsDist, hookTypeDist),
  [analytics, filteredPosts, postTypeDist, topicsDist, hookTypeDist])

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6 max-w-5xl">
      <div className="card h-24 skeleton" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1,2,3,4,5,6].map(i => <div key={i} className="card h-20 skeleton" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card h-64 skeleton" />
        <div className="card h-64 skeleton" />
      </div>
    </div>
  )

  if (!creator) return (
    <div className="card text-center py-12" style={{ color: 'var(--color-crimson)' }}>Creator not found</div>
  )

  const maxLengthR  = Math.max(...lengthBuckets.map(b => b.avgReactions), 1)
  const maxDayR     = Math.max(...dayOfWeekData.map(d => d.avgReactions), 1)
  const bestHookType = [...hookTypeDist].sort((a, b) => b.avgReactions - a.avgReactions)[0]?.type

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link to="/" className="hover:underline" style={{ color: 'var(--color-coral)' }}>Dashboard</Link>
        <span>/</span>
        <Link to={`/creator/${id}`} className="hover:underline" style={{ color: 'var(--color-coral)' }}>{creator.name}</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-primary)' }}>Analysis</span>
      </div>

      {/* ── Creator header ── */}
      <div className="card flex items-center gap-4 flex-wrap">
        {creator.avatarUrl
          ? <img src={creator.avatarUrl} alt={creator.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
          : <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}>
              {creator.name?.slice(0, 2).toUpperCase()}
            </div>}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{creator.name}</h1>
          {creator.headline && (
            <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{creator.headline}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-1.5">
            {creator.followerCount > 0 && <Badge type="teal">{creator.followerCount.toLocaleString()} followers</Badge>}
            <Badge type="muted">{posts.length} posts</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link to={`/creator/${id}`}>
            <Button variant="ghost" size="sm">← Back</Button>
          </Link>
          {creator.linkedinUrl && (
            <a href={creator.linkedinUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">LinkedIn ↗</Button>
            </a>
          )}
        </div>
      </div>

      {/* ── Data quality warning ── */}
      {posts.length < 20 && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
          style={{ background: 'rgba(255,190,11,0.08)', border: '1px solid rgba(255,190,11,0.25)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-gold)' }}>
              ⚡ Limited data — only {posts.length} posts analyzed
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              For accurate insights, load 50+ posts. Open their LinkedIn activity page to analyse more.
            </p>
          </div>
          {creator.linkedinUrl && (
            <a href={`${creator.linkedinUrl.replace(/\/$/, '')}/recent-activity/all/`} target="_blank" rel="noreferrer">
              <Button variant="gold" size="sm">↻ Load More</Button>
            </a>
          )}
        </div>
      )}

      {/* ── Key Stats ── */}
      {analytics && (
        <motion.div variants={staggerContainer} initial="initial" animate="animate"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Posts',  value: analytics.totalPosts,          color: C.coral  },
            { label: 'Avg Reactions',value: analytics.avgReactions,         color: C.coral  },
            { label: 'Avg Comments', value: analytics.avgComments,          color: C.teal   },
            { label: 'Posts/Week',   value: analytics.postingFrequency,     color: C.gold   },
            { label: 'Best Format',  value: analytics.topPostType   || '—', color: C.mint,   isText: true },
            { label: 'Best Day',     value: analytics.bestPostingDay || '—',color: C.purple, isText: true },
          ].map(s => (
            <motion.div key={s.label} variants={staggerItem}
              className="card text-center py-4 relative overflow-hidden"
              style={{ borderTop: `2px solid ${s.color}` }}>
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${s.color}, transparent)`, opacity: 0.15 }} />
              {s.isText
                ? <div className="text-xl font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                : <AnimatedNumber value={s.value} className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }} />}
              <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Period Filter ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Analyzing:</span>
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
            style={{
              background: period === p.value ? 'var(--color-coral)' : 'var(--bg-elevated)',
              color:      period === p.value ? '#fff' : 'var(--text-secondary)',
              border:     period === p.value ? 'none' : '1px solid var(--border-subtle)',
            }}>
            {p.label}
          </button>
        ))}
        {period !== 'all' && filteredPosts.length !== posts.length && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            — {filteredPosts.length} posts in range
          </span>
        )}
      </div>

      {/* ── Engagement Timeline | Content Mix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Timeline */}
        {analytics?.engagementOverTime?.length > 1 && (
          <div className="card">
            <h2 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Engagement Over Time</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Weekly avg reactions &amp; comments</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.engagementOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(64,64,64,0.35)" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#737373' }} />
                <YAxis tick={{ fontSize: 10, fill: '#737373' }} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="reactions" stroke={C.coral} strokeWidth={2.5} dot={false} name="Reactions" />
                <Line type="monotone" dataKey="comments"  stroke={C.teal}  strokeWidth={1.5} dot={false} name="Comments"  />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Content Mix */}
        {postTypeDist.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Content Mix</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>What types of posts this creator publishes</p>

            {/* Stacked composition bar */}
            <div className="flex w-full h-5 rounded-full overflow-hidden gap-px mb-5">
              {postTypeDist.map(t => (
                <div key={t.type} title={`${t.type}: ${t.pct}%`}
                  style={{ width: `${t.pct}%`, minWidth: t.pct > 0 ? 4 : 0, background: TYPE_COLORS[t.type] || C.muted }} />
              ))}
            </div>

            {/* Legend + performance rows */}
            <div className="space-y-2.5">
              {postTypeDist.map(t => {
                const isBest = t.avgReactions === Math.max(...postTypeDist.map(x => x.avgReactions)) && t.count >= 2
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: TYPE_COLORS[t.type] || C.muted }} />
                    <span className="w-16 text-xs capitalize font-medium" style={{ color: 'var(--text-secondary)' }}>{t.type}</span>
                    <div className="flex-1">
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${t.pct}%`, background: TYPE_COLORS[t.type] || C.muted }} />
                      </div>
                    </div>
                    <span className="w-8 text-xs text-right font-mono" style={{ color: 'var(--text-muted)' }}>{t.pct}%</span>
                    <span className="text-xs font-mono w-24 text-right" style={{ color: isBest ? C.coral : 'var(--text-primary)' }}>
                      {t.avgReactions.toLocaleString()} avg ❤️
                    </span>
                    {isBest && <span className="text-xs" title="Best performing format" style={{ color: C.coral }}>★</span>}
                  </div>
                )
              })}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>★ = best performing format · avg = avg reactions per post</p>
          </div>
        )}
      </div>

      {/* ── Top 3 Performing Posts ── */}
      {topPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Top Performing Posts</h2>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,190,11,0.1)', color: C.gold }}>
              {PERIODS.find(p => p.value === period)?.label}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topPosts.map((post, i) => {
              const hook   = extractHook(post.content)
              const medals = ['🥇', '🥈', '🥉']
              const accent = [C.gold, '#A0A0A0', '#CD7F32'][i]
              return (
                <div key={post.id} className="card flex flex-col relative overflow-hidden"
                  style={{ borderTop: `2px solid ${accent}` }}>
                  <div className="absolute top-3 right-3 text-xl leading-none">{medals[i]}</div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap pr-8">
                    {post.postType && <Badge type={post.postType}>{post.postType}</Badge>}
                    {post.postedAt && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(post.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
                    "{hook.length > 160 ? hook.substring(0, 160) + '…' : hook}"
                  </p>
                  <div className="flex items-center gap-4 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div>
                      <div className="text-base font-bold font-mono" style={{ color: C.coral }}>
                        {(post.reactions || 0).toLocaleString()}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>reactions</div>
                    </div>
                    <div>
                      <div className="text-base font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                        {(post.comments || 0).toLocaleString()}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>comments</div>
                    </div>
                    {post.postUrl && (
                      <a href={post.postUrl} target="_blank" rel="noreferrer"
                        className="ml-auto text-xs hover:underline font-medium" style={{ color: C.coral }}>
                        View ↗
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Hook Science ── */}
      {hookTypeDist.length > 0 && (
        <div className="card">
          <div className="mb-5">
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Hook Analysis</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              The hook is everything visible before "see more" — the first impression that decides if someone reads on.
            </p>
          </div>

          {/* Hook type grid — all 6 always shown, greyed if unused */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
            {Object.entries(HOOK_META).map(([type, meta]) => {
              const data   = hookTypeDist.find(h => h.type === type)
              const isBest = type === bestHookType && data
              return (
                <div key={type}
                  className="rounded-xl p-3 text-center relative"
                  style={{
                    background: data ? 'var(--bg-elevated)' : 'transparent',
                    border: `1px solid ${isBest ? meta.color : 'var(--border-subtle)'}`,
                    opacity: data ? 1 : 0.3,
                  }}>
                  {isBest && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: meta.color, color: '#fff', whiteSpace: 'nowrap', fontSize: 10 }}>
                      Best ★
                    </div>
                  )}
                  <div className="text-xl mb-1">{meta.icon}</div>
                  <div className="text-xs font-semibold mb-1 leading-tight" style={{ color: 'var(--text-primary)' }}>{meta.label}</div>
                  {data ? (
                    <>
                      <div className="text-sm font-bold font-mono" style={{ color: meta.color }}>{data.pct}%</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{data.avgReactions.toLocaleString()} avg</div>
                    </>
                  ) : (
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>—</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Hook type descriptions (top 3 used types) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
            {hookTypeDist.slice(0, 3).map(h => {
              const meta = HOOK_META[h.type]
              return (
                <div key={h.type} className="flex items-start gap-2 p-3 rounded-lg"
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                  <span className="text-base flex-shrink-0">{meta?.icon}</span>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{meta?.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{meta?.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Top performing hooks */}
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Top performing hooks
          </div>
          <div className="space-y-2.5">
            {topHooks.map((h, i) => {
              const meta = HOOK_META[h.type]
              return (
                <div key={i} className="flex gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div className="text-sm font-bold w-5 text-center flex-shrink-0 mt-0.5"
                    style={{ color: i === 0 ? C.gold : 'var(--text-muted)' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {h.hook.length > 200 ? h.hook.substring(0, 200) + '…' : h.hook}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${meta?.color}22`, color: meta?.color }}>
                        {meta?.icon} {meta?.label}
                      </span>
                      {h.postedAt && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(h.postedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {h.postUrl && (
                        <a href={h.postUrl} target="_blank" rel="noreferrer"
                          className="text-xs hover:underline" style={{ color: C.coral }}>View ↗</a>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold font-mono" style={{ color: C.coral }}>{h.reactions.toLocaleString()}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>reactions</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Copy Patterns | Content Length ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Copy Patterns */}
        {copyPatterns.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Copy Patterns</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              Writing techniques used — and whether they drive more reactions.
            </p>
            <div className="space-y-3.5">
              {copyPatterns.map(cp => (
                <div key={cp.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cp.icon}</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{cp.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {cp.lift >= 15 && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: 'rgba(6,214,160,0.12)', color: C.mint }}>+{cp.lift}% lift</span>
                      )}
                      {cp.lift <= -15 && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: 'rgba(255,107,53,0.12)', color: C.coral }}>{cp.lift}% lift</span>
                      )}
                      <span className="text-xs font-bold font-mono w-8 text-right" style={{ color: 'var(--text-primary)' }}>
                        {cp.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="h-1.5 rounded-full"
                      style={{
                        width: `${cp.pct}%`,
                        background: cp.lift >= 15 ? C.mint : C.coral,
                        opacity: 0.7,
                      }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              Lift = avg reactions with this pattern vs without it
            </p>
          </div>
        )}

        {/* Content Length Sweet Spot */}
        {lengthBuckets.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Content Length Sweet Spot</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              Which post length drives the most engagement?
            </p>
            <div className="space-y-4">
              {lengthBuckets.map(b => {
                const isBest = b.avgReactions === maxLengthR
                const barW   = Math.round((b.avgReactions / maxLengthR) * 100)
                return (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-xs font-semibold" style={{ color: isBest ? C.coral : 'var(--text-primary)' }}>
                          {b.label}{isBest ? ' ★' : ''}
                        </span>
                        <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{b.range}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono" style={{ color: isBest ? C.coral : 'var(--text-primary)' }}>
                          {b.avgReactions.toLocaleString()} avg ❤️
                        </span>
                        <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>({b.count})</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="h-2 rounded-full"
                        style={{ width: `${barW}%`, background: C.coral, opacity: isBest ? 1 : 0.4 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Topics | Best Day ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Topics */}
        {topicsDist.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Content Topics</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>What subjects this creator focuses on</p>
            <div className="space-y-2.5">
              {topicsDist.map((t, i) => {
                const color = [C.mint, C.teal, C.coral, C.gold, C.purple, C.muted][i % 6]
                return (
                  <div key={t.topic}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t.topic}</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{t.count} posts · {t.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${t.pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Best Day */}
        {dayOfWeekData.some(d => d.avgReactions > 0) && (
          <div className="card">
            <h2 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Best Day to Post</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Average reactions by day of week</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dayOfWeekData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(64,64,64,0.35)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#A3A3A3' }} />
                <YAxis tick={{ fontSize: 10, fill: '#737373' }} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="avgReactions" name="Avg ❤️" radius={[4,4,0,0]}>
                  {dayOfWeekData.map(d => (
                    <Cell key={d.day} fill={C.coral}
                      fillOpacity={maxDayR > 0 ? 0.35 + (d.avgReactions / maxDayR) * 0.65 : 0.4} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Posting Volume ── */}
      {analytics?.engagementOverTime?.length > 2 && (
        <div className="card">
          <h2 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Posting Volume</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Posts per week — consistency over time</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={analytics.engagementOverTime} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(64,64,64,0.35)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#737373' }} />
              <YAxis tick={{ fontSize: 10, fill: '#737373' }} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="posts" name="Posts" fill={C.gold} fillOpacity={0.7} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Strategy Playbook ── */}
      {playbook.length > 0 && (
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.04), rgba(255,190,11,0.02))' }}>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Strategy Playbook</h2>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,107,53,0.12)', color: C.coral }}>
              {filteredPosts.length} posts analyzed
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {playbook.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {item.label}
                  </span>
                </div>
                <div className="text-sm font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{item.value}</div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
