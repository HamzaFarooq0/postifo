import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

// Formats a number with K/M suffix or commas
function fmt(n, format = 'compact') {
  if (format === 'compact') {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
    return n.toLocaleString()
  }
  return n.toLocaleString()
}

// Custom count-up hook (no external dep needed)
function useCountUp(target, duration = 1200, enabled = true) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!enabled || target === 0) { setValue(target); return }
    const start = performance.now()
    let raf

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, enabled])

  return value
}

// Animated number that triggers when it enters the viewport
export default function AnimatedNumber({
  value = 0,
  format = 'compact',
  duration = 1200,
  className = '',
  prefix = '',
  suffix = '',
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const current = useCountUp(value, duration, isInView)

  return (
    <span ref={ref} className={`font-mono font-semibold tabular-nums ${className}`}>
      {prefix}{fmt(current, format)}{suffix}
    </span>
  )
}

// Compact stat display (number + label)
export function StatBlock({ label, value, icon, format, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-base">{icon}</span>}
        <AnimatedNumber value={value} format={format} className="text-xl text-ink-primary" />
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}
