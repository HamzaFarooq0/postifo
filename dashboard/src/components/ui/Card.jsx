import { motion } from 'framer-motion'
import { cardHover } from '../../lib/animations'

export default function Card({ children, className = '', hover = false, gradient = false, ...props }) {
  const base = `card ${gradient ? 'relative overflow-hidden' : ''} ${className}`

  if (hover) {
    return (
      <motion.div
        className={base}
        variants={cardHover}
        initial="rest"
        whileHover="hover"
        {...props}
      >
        {gradient && (
          <div
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.04), rgba(255,190,11,0.04))' }}
          />
        )}
        {children}
      </motion.div>
    )
  }

  return (
    <div className={base} {...props}>
      {gradient && (
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-card"
          style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.04), rgba(255,190,11,0.04))' }}
        />
      )}
      {children}
    </div>
  )
}

// Metric card with a title + big number
export function MetricCard({ label, value, icon, trend, className = '' }) {
  return (
    <Card hover gradient className={`flex flex-col gap-2 min-w-0 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      {trend && (
        <div className={`text-xs font-medium ${trend > 0 ? 'text-brand-mint' : 'text-brand-crimson'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% this week
        </div>
      )}
    </Card>
  )
}
