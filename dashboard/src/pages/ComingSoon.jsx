import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { slideUpVariants } from '../lib/animations.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../api/client.js'

const FEATURES = {
  'write-like-this': {
    icon:        '✍️',
    title:       'Write Like This',
    subtitle:    'Steal Like an Artist — AI Edition',
    description: 'Click "Write Like This" on any top-performing post and get an AI-generated post draft inspired by that creator\'s tone, structure, and hook style. Never stare at a blank page again.',
    benefits: [
      'AI analyzes the top 20 posts from any creator',
      'Generates 3 draft variations in their style',
      'Adapts tone to your own voice and niche',
      'One-click copy to your LinkedIn draft',
    ],
  },
  'content-ideas': {
    icon:        '💡',
    title:       'Content Ideas',
    subtitle:    'Never run out of post ideas',
    description: 'AI analyzes your tracked creators to find the topics and angles that consistently perform well. Get a weekly brief of winning content ideas tailored to your niche.',
    benefits: [
      'Weekly AI-generated content calendar',
      'Topic clustering from top performers',
      'Trending angles in your niche',
      'Optimal posting schedule suggestions',
    ],
  },
  'comparison': {
    icon:        '⚖️',
    title:       'Creator Comparison',
    subtitle:    'Side-by-side performance analysis',
    description: 'Select two LinkedIn creators and compare their content strategies, engagement rates, post types, and hook styles in a visual head-to-head breakdown.',
    benefits: [
      'Side-by-side metric comparison',
      'Posting frequency and consistency',
      'Best-performing content categories',
      'Audience engagement patterns',
    ],
  },
  'alerts': {
    icon:        '🔔',
    title:       'Smart Alerts',
    subtitle:    'Never miss a viral post',
    description: 'Get notified instantly when a tracked creator publishes a post that\'s going viral — so you can engage early, analyze the hook, and ride the wave.',
    benefits: [
      'Real-time viral post detection',
      'Email + Slack notifications',
      'Custom engagement thresholds',
      'Weekly performance digests',
    ],
  },
  'team': {
    icon:        '🤝',
    title:       'Team Workspace',
    subtitle:    'Collaborate with your team',
    description: 'Share your tracked creator library, saved posts, and content collections with your entire agency team. Role-based access keeps everything organized.',
    benefits: [
      'Invite unlimited team members',
      'Shared creator libraries',
      'Team collections and notes',
      'Admin controls and permissions',
    ],
  },
}

export default function ComingSoon() {
  const { feature } = useParams()
  const toast = useToast()
  const { user } = useAuth()
  const [email, setEmail]       = useState(user?.email || '')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]   = useState(false)

  const info = FEATURES[feature] || {
    icon:        '🚧',
    title:       'Coming Soon',
    subtitle:    'This feature is under development',
    description: 'We\'re working on something exciting. Join the waitlist to be the first to know when it\'s ready.',
    benefits:    [],
  }

  async function handleWaitlist(e) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await api.sync.waitlist(email, feature)
      setSubmitted(true)
      toast('You\'re on the waitlist! We\'ll notify you when this launches.', 'success')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div variants={slideUpVariants} initial="initial" animate="animate" className="space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link to="/" className="hover:underline" style={{ color: 'var(--color-coral)' }}>Dashboard</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)' }}>{info.title}</span>
        </div>

        {/* Hero */}
        <div className="card text-center py-12 space-y-4" style={{
          background: 'linear-gradient(135deg, rgba(255,107,53,0.05), rgba(255,190,11,0.05))',
          border: '1px solid rgba(255,107,53,0.15)'
        }}>
          <div className="text-6xl">{info.icon}</div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ background: 'rgba(255,107,53,0.1)', color: 'var(--color-coral)', border: '1px solid rgba(255,107,53,0.2)' }}>
              🚀 COMING SOON
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{info.title}</h1>
            <p className="text-base font-medium" style={{ color: 'var(--color-coral)' }}>{info.subtitle}</p>
          </div>
          <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {info.description}
          </p>
        </div>

        {/* Benefits */}
        {info.benefits.length > 0 && (
          <div className="card space-y-3">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>What you'll get</h3>
            {info.benefits.map((b, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}>
                  ✓
                </div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{b}</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Waitlist form */}
        <div className="card">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-3"
            >
              <div className="text-5xl">🎉</div>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>You're on the list!</div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                We'll email you at <strong>{email}</strong> when {info.title} launches.
              </p>
              <Link to="/"><Button variant="outline" size="sm">← Back to Dashboard</Button></Link>
            </motion.div>
          ) : (
            <form onSubmit={handleWaitlist} className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Join the waitlist
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Be the first to access {info.title} when it launches. No spam, ever.
                </p>
              </div>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                icon="✉"
              />
              <Button type="submit" variant="primary" loading={loading} className="w-full">
                Join Waitlist
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
