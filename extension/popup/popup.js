// Postifo Popup v2 — Dark Brand Theme
'use strict';

const API = 'https://postifo-backend-production.up.railway.app';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function show(id) { $(id).style.display = ''; }
function hide(id) { $(id).style.display = 'none'; }

function fmtNum(n) {
  if (!n || n === 0) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

async function apiRequest(path, options = {}) {
  return new Promise(resolve => {
    chrome.storage.local.get(['ll_auth'], async data => {
      const token = data.ll_auth?.token;
      const res = await fetch(`${API}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...options,
      }).catch(() => null);
      if (!res) return resolve({ error: 'Network error' });
      const body = await res.json().catch(() => ({}));
      resolve(body);
    });
  });
}

// ─── Login ───────────────────────────────────────────────────────────────────
$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('login-btn');
  btn.disabled = true; btn.textContent = 'Signing in…';
  hide('login-error');

  const body = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email:    $('email').value.trim(),
      password: $('password').value,
    }),
  });

  if (body.error) {
    const err = $('login-error');
    err.textContent = body.error;
    show('login-error');
    btn.disabled = false; btn.textContent = 'Sign In';
    return;
  }

  chrome.storage.local.set({ ll_auth: { token: body.token, user: body.user } }, () => {
    renderDashboard();
  });
});

// ─── Logout ──────────────────────────────────────────────────────────────────
$('logout-btn').addEventListener('click', () => {
  chrome.storage.local.remove(['ll_auth', 'll_scrape_status', 'll_post_queue'], () => {
    show('view-login');
    hide('view-dashboard');
    $('email').value = ''; $('password').value = '';
  });
});

// ─── Open dashboard ───────────────────────────────────────────────────────────
$('open-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://postifo-2u3cmvjm1-hamzafarooqs-projects-863e242d.vercel.app' });
});

// ─── Sync now ────────────────────────────────────────────────────────────────
$('sync-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
  setSyncStatus('active', '⬆ Syncing…');
  setTimeout(() => loadSyncStatus(), 2500);
});

// ─── Sync status ─────────────────────────────────────────────────────────────
function setSyncStatus(state, text) {
  const dot  = $('sync-dot');
  const syncText = $('sync-text');
  dot.className = `sync-dot sync-${state}`;
  syncText.textContent = text;
}

function loadSyncStatus() {
  chrome.storage.local.get(['ll_post_queue', 'll_scrape_status'], data => {
    const queue   = data.ll_post_queue || [];
    const scrape  = data.ll_scrape_status;
    const pending = queue.filter(b => !b.synced).reduce((s, b) => s + b.posts.length, 0);

    $('stat-pending').textContent = fmtNum(pending);

    if (scrape && !scrape.done) {
      // Currently scraping
      setSyncStatus('active', `⬆ Scraping: ${scrape.profile}`);
      show('scrape-card');
      $('scrape-creator').textContent = scrape.profile || 'Scraping…';
      $('scrape-detail').textContent  = `${scrape.count || 0} posts collected`;
      const pct = Math.min(((scrape.scrolls || 0) / 30) * 100, 95);
      $('scrape-progress').style.width = pct + '%';
    } else {
      hide('scrape-card');
      if (pending > 0) {
        setSyncStatus('active', `● ${pending} posts pending sync`);
      } else if (scrape?.done) {
        setSyncStatus('ok', `✓ Synced ${scrape.count} posts from ${scrape.profile}`);
      } else {
        setSyncStatus('idle', '● Idle — visit a LinkedIn profile');
      }
    }
  });
}

// ─── Load creators ───────────────────────────────────────────────────────────
async function loadCreators() {
  const data = await apiRequest('/api/creators');
  if (data.error || !Array.isArray(data)) return;

  const list = $('creator-list');
  list.innerHTML = '';
  $('stat-creators').textContent = fmtNum(data.length);

  const totalPosts = data.reduce((s, c) => s + (c.postCount || 0), 0);
  $('stat-posts').textContent = fmtNum(totalPosts);

  if (data.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:12px;color:var(--muted);font-size:12px">
      Navigate to a LinkedIn creator profile and click <strong style="color:var(--coral)">Track Creator</strong>
    </div>`;
    return;
  }

  data.slice(0, 6).forEach(creator => {
    const el = document.createElement('div');
    el.className = 'creator-item';

    const initials = (creator.name || '?').slice(0, 2).toUpperCase();
    const avatarHtml = creator.avatarUrl
      ? `<img src="${creator.avatarUrl}" class="creator-av" alt="${creator.name}" />`
      : `<div class="creator-av">${initials}</div>`;

    const hours = creator.lastScraped
      ? (Date.now() - new Date(creator.lastScraped).getTime()) / 3600000
      : Infinity;
    const badge = hours < 24 ? 'Today' : hours < 168 ? 'This week' : 'Stale';

    el.innerHTML = `
      ${avatarHtml}
      <div class="creator-info">
        <div class="creator-name">${creator.name}</div>
        <div class="creator-meta">${fmtNum(creator.postCount || 0)} posts</div>
      </div>
      <div class="creator-badge">${badge}</div>
    `;
    list.appendChild(el);
  });
}

// ─── Render dashboard ─────────────────────────────────────────────────────────
async function renderDashboard() {
  hide('view-login');
  show('view-dashboard');

  chrome.storage.local.get(['ll_auth'], data => {
    const user = data.ll_auth?.user;
    if (user) {
      const name = user.name || user.email || 'User';
      $('user-name').textContent  = name;
      $('user-avatar').textContent = name.slice(0, 2).toUpperCase();
      $('user-plan').textContent   = (user.plan || 'free') + ' plan';
    }
  });

  loadCreators();
  loadSyncStatus();

  // Poll scrape status every 5s
  setInterval(loadSyncStatus, 5000);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
chrome.storage.local.get(['ll_auth'], data => {
  if (data.ll_auth?.token) {
    renderDashboard();
  } else {
    show('view-login');
  }
});
