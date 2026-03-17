const SORT_OPTIONS = [
  { value: 'reactions', label: 'Reactions' },
  { value: 'comments',  label: 'Comments'  },
  { value: 'scrapedAt', label: 'Analysed'  },
  { value: 'postedAt',  label: 'Posted'    },
]

export default function SortControls({ sortBy, order, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value, order)}
            className="px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: sortBy === opt.value ? 'rgba(255,107,53,0.15)' : 'transparent',
              color:      sortBy === opt.value ? 'var(--color-coral)' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => onChange(sortBy, order === 'desc' ? 'asc' : 'desc')}
        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
        }}
      >
        {order === 'desc' ? '↓ Desc' : '↑ Asc'}
      </button>
    </div>
  )
}
