const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getToken() {
  return localStorage.getItem('ll_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (res.status === 401) {
    localStorage.removeItem('ll_token')
    localStorage.removeItem('ll_user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  // Support CSV (blob) responses
  const ct = res.headers.get('Content-Type') || ''
  if (ct.includes('text/csv')) return res.blob()
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  // ─── Auth ───────────────────────────────────────────────────────────
  auth: {
    register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login:    (body) => request('/api/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
    me:       ()     => request('/api/auth/me'),
  },

  // ─── Creators ───────────────────────────────────────────────────────
  creators: {
    list:    ()           => request('/api/creators'),
    get:     (id, params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/api/creators/${id}${q ? '?' + q : ''}`)
    },
    search:      (q)    => request(`/api/creators/search?q=${encodeURIComponent(q)}`),
    track:       (body) => request('/api/creators/track', { method: 'POST', body: JSON.stringify(body) }),
    untrack:     (id)   => request(`/api/creators/${id}/untrack`, { method: 'DELETE' }),
    syncTracked: ()     => request('/api/creators/sync-tracked', { method: 'POST' }),
  },

  // ─── Posts ──────────────────────────────────────────────────────────
  posts: {
    list:    (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/api/posts${q ? '?' + q : ''}`)
    },
    bulk:    (body)       => request('/api/posts/bulk', { method: 'POST', body: JSON.stringify(body) }),
    top:     (creatorId)  => request(`/api/posts/${creatorId}/top`),
  },

  // ─── Analytics ──────────────────────────────────────────────────────
  analytics: {
    get: (creatorId) => request(`/api/analytics/${creatorId}`),
  },

  // ─── Library ────────────────────────────────────────────────────────
  library: {
    list:  (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/api/library${q ? '?' + q : ''}`)
    },
    stats: ()            => request('/api/library/stats'),
    hooks: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/api/library/hooks${q ? '?' + q : ''}`)
    },
  },

  // ─── Saved posts ─────────────────────────────────────────────────────
  saved: {
    list:             (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/api/saved-posts${q ? '?' + q : ''}`)
    },
    ids:              ()     => request('/api/saved-posts/ids'),
    save:             (postId, notes) => request('/api/saved-posts', {
      method: 'POST', body: JSON.stringify({ postId, notes }),
    }),
    unsave:           (postId) => request(`/api/saved-posts/${postId}`, { method: 'DELETE' }),
    collections:      ()       => request('/api/saved-posts/collections'),
    createCollection: (body)   => request('/api/saved-posts/collections', {
      method: 'POST', body: JSON.stringify(body),
    }),
    addToCollection:  (colId, postId) => request(`/api/saved-posts/collections/${colId}/posts`, {
      method: 'POST', body: JSON.stringify({ postId }),
    }),
    deleteCollection: (id)     => request(`/api/saved-posts/collections/${id}`, { method: 'DELETE' }),
  },

  // ─── Export ─────────────────────────────────────────────────────────
  export: {
    creator: (id) => request(`/api/export/${id}/csv`),
    saved:   ()   => request('/api/export/saved/csv'),
  },

  // ─── Sync ───────────────────────────────────────────────────────────
  sync: {
    creators: () => request('/api/sync/creators'),
    waitlist: (email, feature) => request('/api/sync/waitlist', {
      method: 'POST', body: JSON.stringify({ email, feature }),
    }),
  },

  // ─── Sessions ───────────────────────────────────────────────────────
  sessions: {
    list: () => request('/api/sessions'),
  },

  // ─── Stats ──────────────────────────────────────────────────────────
  stats: {
    global: () => request('/api/stats'),
  },
}

// Helper: download a CSV blob
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
