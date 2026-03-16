import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.jsx'
import { slideUpVariants } from '../lib/animations.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import { useToast } from '../components/ui/Toast.jsx'

const PLAN_COLORS = {
  free:     'badge-muted',
  starter:  'badge-teal',
  pro:      'badge-coral',
  agency:   'badge-gold',
}

function Section({ title, children }) {
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-sm border-b pb-3" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast    = useToast()
  const [name, setName] = useState(user?.name || '')

  const handleLogout = () => { logout(); navigate('/login') }

  const handleDeleteAccount = () => {
    if (confirm('Are you sure? This will permanently delete your account and all data.')) {
      toast('Account deletion is not yet implemented. Contact support.', 'warning')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage your account preferences</p>
      </div>

      {/* Account */}
      <motion.div variants={slideUpVariants} initial="initial" animate="animate">
        <Section title="Account">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}>
              {(user?.name || user?.email || '?').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name || 'No name set'}</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
              <span className={`badge mt-1 ${PLAN_COLORS[user?.plan || 'free']}`}>
                {user?.plan || 'free'} plan
              </span>
            </div>
          </div>
          <Input
            label="Display name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
          />
          <Button variant="primary" size="sm" onClick={() => toast('Profile update coming soon.', 'info')}>
            Save changes
          </Button>
        </Section>
      </motion.div>

      {/* Subscription */}
      <Section title="Subscription">
        <div className="flex items-center justify-between p-4 rounded-xl"
          style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(255,190,11,0.08))', border: '1px solid rgba(255,107,53,0.2)' }}>
          <div>
            <div className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
              {user?.plan || 'free'} Plan
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {user?.plan === 'free' ? 'Limited to 3 creators, 200 posts/month' : 'Unlimited creators and posts'}
            </div>
          </div>
          <Button variant="gold" size="sm" onClick={() => toast('Upgrade flow coming soon!', 'info')}>
            Upgrade ↗
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { plan: 'Starter', price: '$29/mo', features: '10 creators, 2K posts' },
            { plan: 'Pro',     price: '$59/mo', features: '50 creators, unlimited' },
            { plan: 'Agency',  price: '$79/mo', features: 'Unlimited + team access' },
          ].map(p => (
            <div key={p.plan} className="card text-center py-3">
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{p.plan}</div>
              <div className="text-lg font-bold mt-1" style={{ color: 'var(--color-coral)' }}>{p.price}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{p.features}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Extension */}
      <Section title="Chrome Extension">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>LinkedLens Extension</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Scrapes LinkedIn creator posts and syncs them to your dashboard.
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-mint)' }} />
            <span className="text-xs" style={{ color: 'var(--color-mint)' }}>Connected</span>
          </div>
        </div>
        <div className="text-xs p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          💡 Tip: After clicking "Track Creator", let the extension scroll through all posts before navigating away.
        </div>
      </Section>

      {/* Data */}
      <Section title="Data & Export">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Export your collected data at any time. Data is yours — always.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/saved')}>Export Saved Posts</Button>
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <div className="flex items-center justify-between p-4 rounded-xl"
          style={{ border: '1px solid rgba(239,71,111,0.3)', background: 'rgba(239,71,111,0.05)' }}>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--color-crimson)' }}>Delete Account</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Permanently removes all data. This cannot be undone.
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={handleDeleteAccount}>Delete Account</Button>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleLogout}>← Log out</Button>
        </div>
      </Section>
    </div>
  )
}
