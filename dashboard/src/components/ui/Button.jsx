import { motion } from 'framer-motion'

const variants = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  ghost:   'btn-ghost',
  gold:    'btn-gold',
  danger:  'inline-flex items-center justify-center gap-2 font-semibold rounded-full px-5 py-2 text-sm transition-all duration-200 bg-transparent border-[1.5px] border-brand-crimson text-brand-crimson hover:bg-brand-crimson/10',
}

const sizes = {
  sm:  'text-xs px-3 py-1.5',
  md:  '',
  lg:  'text-base px-6 py-3',
  xl:  'text-lg px-8 py-4',
  icon:'p-2 !rounded-lg',
}

export default function Button({
  children,
  variant = 'primary',
  size    = 'md',
  className = '',
  loading = false,
  disabled = false,
  as: Tag = 'button',
  ...props
}) {
  const cls = [variants[variant] || variants.primary, sizes[size], className].join(' ')

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      className={cls}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </motion.button>
  )
}
