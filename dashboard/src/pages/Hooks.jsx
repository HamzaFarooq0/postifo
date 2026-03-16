import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client.js'
import { staggerContainer, staggerItem } from '../lib/animations.js'
import { SkeletonCard } from '../components/ui/Skeleton.jsx'
import Button from '../components/ui/Button.jsx'
import { useToast } from '../components/ui/Toast.jsx'

function HookCard({ hook }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(hook.hook)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <motion.div variants={staggerItem} layout
      className="card space-y-3 hover:border-orange-500/30 transition-all duration-200"
      style={{ borderColor: 'var(--border-subtle)' }}>

      {/* Hook text */}
      <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text-primary)' }}>
        "{hook.hook}"
      </p>

      {/* Creator + meta */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {hook.creator && (
            <>
              {hook.creator.avatarUrl
                ? <img src={hook.creator.avatarUrl} alt={hook.creator.name} className="w-5 h-5 rounded-full object-cover" />
                : <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}>
                    {hook.creator.name?.slice(0,1)}
                  </div>}
              <Link to={`/creator/${hook.creator.id}`}
                className="text-xs hover:underline" style={{ color: 'var(--color-coral)' }}>
                {hook.creator.name}
              </Link>
            </>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            ❤️ {(hook.reactions||0).toLocaleString()} reactions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a href={hook.postUrl} target="_blank" rel="noreferrer"
            className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
            Original ↗
          </a>
          <motion.button
            onClick={copy}
            whileTap={{ scale: 0.95 }}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
            style={{
              background: copied ? 'rgba(6,214,160,0.15)' : 'rgba(255,107,53,0.1)',
              color: copied ? 'var(--color-mint)' : 'var(--color-coral)',
              border: 'none', cursor: 'pointer',
            }}>
            {copied ? '✓ Copied!' : 'Copy Hook'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default function Hooks() {
  const toast = useToast()
  const [hooks,      setHooks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [minReact,   setMinReact]   = useState('100')
  const [postType,   setPostType]   = useState('all')
  const [offset,     setOffset]     = useState(0)
  const LIMIT = 20

  useEffect(() => {
    setLoading(true)
    const params = { minReactions: minReact, limit: LIMIT, offset }
    if (postType !== 'all') params.postType = postType
    api.library.hooks(params)
      .then(setHooks)
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [minReact, postType, offset])

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Hook Library</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          First lines from top-performing posts. Copy what works.
        </p>
      </div>

      {/* Explainer card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.06), rgba(255,190,11,0.06))' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">🪝</span>
          <div>
            <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              The first line is everything
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              LinkedIn shows only the first 1–2 lines before "see more." These are the hooks from posts
              with the highest engagement — proven openers you can adapt for your own content.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Min reactions:</span>
          <div className="flex gap-1">
            {['50','100','500','1000'].map(v => (
              <button key={v} onClick={() => setMinReact(v)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: minReact === v ? 'rgba(255,107,53,0.15)' : 'transparent',
                  color: minReact === v ? 'var(--color-coral)' : 'var(--text-muted)',
                  border: `1px solid ${minReact === v ? 'rgba(255,107,53,0.3)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}>
                {v}+
              </button>
            ))}
          </div>
        </div>
        <select value={postType} onChange={e => setPostType(e.target.value)} className="input w-36">
          <option value="all">All types</option>
          {['text','image','carousel'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Hook count */}
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>{hooks.length}</strong> hooks
        {minReact && <span> with {minReact}+ reactions</span>}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="card h-24 skeleton" />)}</div>
      ) : hooks.length === 0 ? (
        <div className="card text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
          No hooks found. Try lowering the minimum reactions threshold.
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
          {hooks.map(h => <HookCard key={h.id} hook={h} />)}
        </motion.div>
      )}

      {/* Pagination */}
      {!loading && hooks.length === LIMIT && (
        <div className="flex justify-center gap-3">
          <Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))}>← Prev</Button>
          <Button variant="ghost" size="sm" onClick={() => setOffset(o => o + LIMIT)}>Next →</Button>
        </div>
      )}
    </div>
  )
}
