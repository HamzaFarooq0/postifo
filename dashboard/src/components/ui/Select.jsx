import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * CustomSelect — styled dropdown replacement for native <select>
 * Props:
 *   value      — currently selected value
 *   onChange   — (value) => void
 *   options    — [{ value, label }]
 *   className  — extra classes for the wrapper
 */
export default function Select({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function close(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const selected = options.find(o => o.value === value) ?? options[0]

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input w-full flex items-center justify-between gap-2"
        style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'left' }}
      >
        <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
          {selected?.label}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ fontSize: '0.5rem', color: 'var(--text-muted)', flexShrink: 0, lineHeight: 1 }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              minWidth: '100%', zIndex: 300,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', width: '100%', gap: 8,
                  padding: '10px 14px', cursor: 'pointer', fontSize: '0.875rem',
                  background: value === opt.value ? 'rgba(255,107,53,0.1)' : 'transparent',
                  color: value === opt.value ? 'var(--color-coral)' : 'var(--text-secondary)',
                  border: 'none', textAlign: 'left', transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (value !== opt.value) e.currentTarget.style.background = 'var(--bg-elevated)'
                }}
                onMouseLeave={e => {
                  if (value !== opt.value) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{ width: 14, fontSize: 10, color: 'var(--color-coral)', flexShrink: 0, textAlign: 'center' }}>
                  {value === opt.value ? '✓' : ''}
                </span>
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
