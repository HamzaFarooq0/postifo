export default function Input({ label, error, icon, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none"
            style={{ color: 'var(--text-muted)' }}>
            {icon}
          </span>
        )}
        <input
          className={`input ${icon ? 'pl-9' : ''} ${error ? 'border-brand-crimson' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-brand-crimson">{error}</p>}
    </div>
  )
}

export function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <select
        className={`input ${error ? 'border-brand-crimson' : ''} ${className}`}
        style={{ appearance: 'auto', cursor: 'pointer' }}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-brand-crimson">{error}</p>}
    </div>
  )
}
