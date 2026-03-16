import { useState } from 'react'
import Badge from './ui/Badge.jsx'

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n || 0)
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{icon}</span>
      <div>
        <div className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
          {formatNumber(value)}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function PostCard({ post, showCreator = false, savedIds = [], onSave }) {
  const [expanded, setExpanded] = useState(false)
  const isLong  = post.content && post.content.length > 300
  const isSaved = savedIds.includes(post.id)

  return (
    <div className="card space-y-3">
      {/* Creator row */}
      {showCreator && post.creator && (
        <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          {post.creator.avatarUrl
            ? <img src={post.creator.avatarUrl} className="w-6 h-6 rounded-full object-cover" alt={post.creator.name} />
            : <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}>
                {post.creator.name?.slice(0, 1)}
              </div>
          }
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{post.creator.name}</span>
        </div>
      )}

      {/* Header */}
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
          {onSave && (
            <button onClick={() => onSave(post.id, isSaved)}
              className="text-xs px-2 py-1 rounded-lg transition-colors"
              style={{
                color: isSaved ? 'var(--color-gold)' : 'var(--text-muted)',
                background: isSaved ? 'rgba(255,190,11,0.1)' : 'transparent',
                border: 'none', cursor: 'pointer',
              }}>
              {isSaved ? '★' : '☆'}
            </button>
          )}
          <a href={post.postUrl} target="_blank" rel="noreferrer"
            className="text-xs hover:underline" style={{ color: 'var(--color-coral)' }}>
            View ↗
          </a>
        </div>
      </div>

      {/* Content */}
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
      ) : (
        <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No text content</p>
      )}

      {post.mediaUrl && (
        <img src={post.mediaUrl} alt="Post media" className="rounded-lg max-h-40 object-cover w-full" />
      )}

      {/* Stats */}
      <div className="flex items-center gap-6 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <Stat icon="❤️" label="Reactions" value={post.reactions} />
        <Stat icon="💬" label="Comments"  value={post.comments}  />
        <Stat icon="🔁" label="Reposts"   value={post.reposts}   />
        {post.impressions > 0 && <Stat icon="👁️" label="Impressions" value={post.impressions} />}
      </div>
    </div>
  )
}
