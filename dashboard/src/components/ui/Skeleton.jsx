// Shimmer skeleton loader using the brand gradient
export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          style={{ height: '0.875rem', width: i === lines - 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton style={{ width: 40, height: 40, borderRadius: '50%' }} />
        <div className="flex-1 space-y-2">
          <Skeleton style={{ height: '0.875rem', width: '60%' }} />
          <Skeleton style={{ height: '0.75rem',  width: '40%' }} />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-4 pt-2">
        <Skeleton style={{ height: '1.5rem', width: 64 }} />
        <Skeleton style={{ height: '1.5rem', width: 64 }} />
        <Skeleton style={{ height: '1.5rem', width: 64 }} />
      </div>
    </div>
  )
}

export function SkeletonCreatorCard({ className = '' }) {
  return (
    <div className={`card space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton style={{ width: 48, height: 48, borderRadius: '50%' }} />
        <div className="flex-1 space-y-2">
          <Skeleton style={{ height: '1rem', width: '55%' }} />
          <Skeleton style={{ height: '0.75rem', width: '75%' }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => (
          <div key={i} className="space-y-1">
            <Skeleton style={{ height: '1.5rem', width: '80%' }} />
            <Skeleton style={{ height: '0.7rem', width: '60%' }} />
          </div>
        ))}
      </div>
      <Skeleton style={{ height: 6, borderRadius: 3 }} />
    </div>
  )
}

export function SkeletonRow({ count = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
