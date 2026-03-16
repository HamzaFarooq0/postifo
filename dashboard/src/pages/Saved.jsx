import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api, downloadBlob } from '../api/client.js'
import { staggerContainer, staggerItem } from '../lib/animations.js'
import { SkeletonCard } from '../components/ui/Skeleton.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import Input from '../components/ui/Input.jsx'
import { useToast } from '../components/ui/Toast.jsx'

function PostCard({ post, onUnsave }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = post.content && post.content.length > 240

  return (
    <motion.div variants={staggerItem} layout className="card space-y-3">
      {/* Creator */}
      {post.creator && (
        <div className="flex items-center gap-2">
          {post.creator.avatarUrl
            ? <img src={post.creator.avatarUrl} alt={post.creator.name} className="w-5 h-5 rounded-full object-cover" />
            : <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FFBE0B)', color: '#fff' }}>
                {post.creator.name?.slice(0,1)}
              </div>}
          <Link to={`/creator/${post.creator.id}`}
            className="text-xs hover:underline" style={{ color: 'var(--color-coral)' }}>
            {post.creator.name}
          </Link>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {post.postType && <Badge type={post.postType}>{post.postType}</Badge>}
          {post.savedAt && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Saved {new Date(post.savedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <a href={post.postUrl} target="_blank" rel="noreferrer"
            className="text-xs hover:underline" style={{ color: 'var(--color-coral)' }}>View ↗</a>
          <button onClick={() => onUnsave(post.id)}
            className="text-xs hover:underline transition-colors"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Unsave
          </button>
        </div>
      </div>
      {post.content ? (
        <div>
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}
            style={{ color: 'var(--text-secondary)' }}>{post.content}</p>
          {isLong && (
            <button onClick={() => setExpanded(e => !e)}
              className="text-xs mt-1 hover:underline"
              style={{ color: 'var(--color-coral)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {expanded ? 'Show less ↑' : 'Show more ↓'}
            </button>
          )}
        </div>
      ) : null}
      <div className="flex gap-4 text-xs pt-2 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
        <span>❤️ <strong style={{ color: 'var(--text-primary)' }}>{(post.reactions||0).toLocaleString()}</strong></span>
        <span>💬 <strong style={{ color: 'var(--text-primary)' }}>{(post.comments||0).toLocaleString()}</strong></span>
      </div>
    </motion.div>
  )
}

export default function Saved() {
  const toast = useToast()
  const [posts,       setPosts]       = useState([])
  const [collections, setCollections] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [newName,     setNewName]     = useState('')
  const [newEmoji,    setNewEmoji]    = useState('📁')
  const [exporting,   setExporting]   = useState(false)
  const [creating,    setCreating]    = useState(false)

  useEffect(() => {
    Promise.all([api.saved.list(), api.saved.collections()])
      .then(([p, c]) => { setPosts(p); setCollections(c) })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function handleUnsave(postId) {
    try {
      await api.saved.unsave(postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
      toast('Removed from saved', 'info')
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleCreateCollection() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const col = await api.saved.createCollection({ name: newName, emoji: newEmoji })
      setCollections(prev => [...prev, { ...col, postCount: 0 }])
      setShowModal(false); setNewName(''); setNewEmoji('📁')
      toast(`Collection "${col.name}" created!`, 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setCreating(false) }
  }

  async function handleDeleteCollection(id, name) {
    if (!confirm(`Delete collection "${name}"?`)) return
    try {
      await api.saved.deleteCollection(id)
      setCollections(prev => prev.filter(c => c.id !== id))
      toast('Collection deleted', 'info')
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await api.export.saved()
      downloadBlob(blob, 'postifo-saved-posts.csv')
      toast('CSV downloaded!', 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setExporting(false) }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Saved Posts</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Your bookmarked posts — {posts.length} saved
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" loading={exporting} onClick={handleExport}>↓ Export CSV</Button>
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>+ Collection</Button>
        </div>
      </div>

      {/* Collections */}
      {collections.length > 0 && (
        <div>
          <div className="section-title mb-3">Collections</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {collections.map(col => (
              <div key={col.id} className="card flex flex-col gap-1 relative group">
                <div className="text-2xl">{col.emoji}</div>
                <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{col.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{col.postCount || 0} posts</div>
                <button onClick={() => handleDeleteCollection(col.id, col.name)}
                  className="absolute top-2 right-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

      {/* Saved posts */}
      <div>
        <div className="section-title mb-3">All Saved</div>
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : posts.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">🔖</div>
            <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No saved posts yet</div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Click ☆ Save on any post in the Library or Creator Detail page.
            </p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
            <AnimatePresence>
              {posts.map(p => <PostCard key={p.id} post={p} onUnsave={handleUnsave} />)}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Create collection modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Collection">
        <div className="space-y-4">
          <Input label="Collection name" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Best Hooks, SaaS Posts…" />
          <div>
            <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Emoji</div>
            <div className="flex gap-2 flex-wrap">
              {['📁','🔥','⭐','💡','🪝','📌','🎯','💎'].map(e => (
                <button key={e} onClick={() => setNewEmoji(e)}
                  className="w-9 h-9 rounded-lg text-lg transition-all"
                  style={{
                    background: newEmoji === e ? 'rgba(255,107,53,0.2)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${newEmoji === e ? 'var(--color-coral)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" loading={creating} onClick={handleCreateCollection}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
