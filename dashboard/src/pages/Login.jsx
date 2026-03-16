import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.jsx'
import { slideUpVariants } from '../lib/animations.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]           = useState('')
  const [noAccount, setNoAccount]   = useState(false)
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNoAccount(false)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const msg = err.message || 'Login failed'
      if (msg.toLowerCase().includes('no account')) {
        setNoAccount(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'var(--bg-surface)' }}>
        {/* Animated gradient blob */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 animate-pulse-soft"
          style={{ background: 'radial-gradient(circle, #FF6B35, transparent)' }} />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-15 animate-pulse-soft"
          style={{ background: 'radial-gradient(circle, #FFBE0B, transparent)', animationDelay: '1s' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 z-10">
          <img src="/logo.svg" alt="LinkedLens" className="w-10 h-10 rounded-xl" />
          <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>LinkedLens</span>
        </div>

        {/* Hero copy */}
        <div className="z-10 space-y-6">
          <h2 className="text-4xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            Steal the strategy<br />
            <span className="gradient-text">behind viral posts.</span>
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Track any LinkedIn creator. Analyze what works. Build content that converts.
          </p>

          {/* Social proof */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-2">
              {['AK','BL','CR','DM'].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff', borderColor: 'var(--bg-surface)' }}>
                  {i}
                </div>
              ))}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>500+ agencies</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>already using LinkedLens</div>
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 z-10">
          {['Track creators', 'Analyze top hooks', 'Viral post library', 'CSV export'].map(f => (
            <span key={f} className="badge badge-muted">{f}</span>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          variants={slideUpVariants}
          initial="initial"
          animate="animate"
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <img src="/logo.svg" alt="LinkedLens" className="w-9 h-9 rounded-xl" />
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>LinkedLens</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@agency.com"
              required
              icon="✉"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              icon="🔒"
            />

            {noAccount && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.25)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>No account found for <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. </span>
                <Link to="/register" className="font-semibold hover:underline" style={{ color: 'var(--color-coral)' }}>
                  Create one free →
                </Link>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(239,71,111,0.1)', color: 'var(--color-crimson)', border: '1px solid rgba(239,71,111,0.2)' }}
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            No account?{' '}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: 'var(--color-coral)' }}>
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
