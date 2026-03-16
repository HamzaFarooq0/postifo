import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toastVariants } from '../../lib/animations'

const ToastCtx = createContext(null)

const typeStyle = {
  success: { bg: 'var(--color-mint)',    icon: '✓' },
  error:   { bg: 'var(--color-crimson)', icon: '✕' },
  warning: { bg: 'var(--color-amber)',   icon: '⚠' },
  info:    { bg: 'var(--color-teal)',    icon: 'ℹ' },
}

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => {
            const s = typeStyle[t.type] || typeStyle.info
            return (
              <motion.div
                key={t.id}
                variants={toastVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl max-w-xs"
                style={{ background: s.bg, minWidth: 240 }}
              >
                <span className="text-base font-bold shrink-0">{s.icon}</span>
                <span className="flex-1">{t.message}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
