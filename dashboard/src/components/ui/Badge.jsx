const typeColors = {
  coral:   'badge-coral',
  gold:    'badge-gold',
  mint:    'badge-mint',
  teal:    'badge-teal',
  crimson: 'badge-crimson',
  muted:   'badge-muted',

  // Post types
  text:       'post-type-text',
  image:      'post-type-image',
  carousel:   'post-type-carousel',
  video:      'post-type-video',
  poll:       'post-type-poll',
  article:    'post-type-article',
  newsletter: 'badge-teal',
  repost:     'badge-muted',
  other:      'post-type-other',
}

export default function Badge({ children, type = 'muted', className = '', dot = false }) {
  const cls = typeColors[type] || typeColors.muted
  return (
    <span className={`badge ${cls} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  )
}

export function ComingSoonBadge() {
  return (
    <span className="badge" style={{
      background: 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,190,11,0.15))',
      color: 'var(--color-coral)',
      fontSize: '0.6rem',
      padding: '0.15rem 0.5rem',
    }}>
      SOON
    </span>
  )
}
