// LinkedLens Background Service Worker (Manifest V3)
const API_BASE = 'http://localhost:3001/api';

// ─── Alarm for periodic sync ──────────────────────────────────────────
chrome.alarms.create('ll_sync', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'll_sync') {
    syncQueueToAPI();
  }
});

// ─── Message from content script ──────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_NOW') {
    syncQueueToAPI().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === 'GET_STATUS') {
    getStatus().then(sendResponse);
    return true;
  }
  if (message.type === 'LOGIN') {
    handleLogin(message.email, message.password).then(sendResponse);
    return true;
  }
  if (message.type === 'LOGOUT') {
    chrome.storage.local.remove(['ll_auth']);
    sendResponse({ ok: true });
  }
  if (message.type === 'SCRAPE_DONE') {
    // Set badge to checkmark briefly, then clear
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#06D6A0' });
    setTimeout(() => updateBadge(), 5000);

    // OS notification
    chrome.notifications.create('ll_scrape_done_' + Date.now(), {
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: 'LinkedLens — Scrape Complete',
      message: `Collected ${message.count} posts from ${message.name}. Syncing to your dashboard now.`,
      priority: 1
    });
    sendResponse({ ok: true });
  }
});

// ─── Authentication ───────────────────────────────────────────────────
async function handleLogin(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      await chrome.storage.local.set({ ll_auth: { token: data.token, user: data.user } });
      return { ok: true, user: data.user };
    }
    return { ok: false, error: data.error || 'Login failed' };
  } catch (e) {
    return { ok: false, error: 'Cannot reach LinkedLens server. Is it running?' };
  }
}

// ─── Sync queue to backend ────────────────────────────────────────────
async function syncQueueToAPI() {
  const data = await chrome.storage.local.get(['ll_auth', 'll_post_queue', 'll_pending_creators']);
  const token = data.ll_auth?.token;
  if (!token) return;

  // 1. Sync pending creators (track them first)
  const pendingCreators = data.ll_pending_creators || [];
  const syncedCreators = [];
  for (const creator of pendingCreators) {
    try {
      const res = await fetch(`${API_BASE}/creators/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(creator)
      });
      if (res.ok) syncedCreators.push(creator.linkedinUrl);
      // Human-mimicking delay
      await sleep(1000 + Math.random() * 2000);
    } catch (_) {}
  }

  if (syncedCreators.length > 0) {
    const remaining = pendingCreators.filter(c => !syncedCreators.includes(c.linkedinUrl));
    await chrome.storage.local.set({ ll_pending_creators: remaining });
  }

  // 2. Sync post batches
  const postQueue = data.ll_post_queue || [];
  const syncedIndexes = [];

  for (let i = 0; i < postQueue.length; i++) {
    const batch = postQueue[i];
    if (batch.synced) { syncedIndexes.push(i); continue; }

    try {
      // Create session
      const sessRes = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ creatorLinkedinUrl: batch.profileData.linkedinUrl })
      });
      const session = sessRes.ok ? await sessRes.json() : null;

      // Sync posts in smaller chunks to avoid rate limiting
      const chunks = chunkArray(batch.posts, 10);
      let totalSynced = 0;
      let anyChunkFailed = false;

      for (const chunk of chunks) {
        const res = await fetch(`${API_BASE}/posts/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            posts: chunk,
            creatorLinkedinUrl: batch.profileData.linkedinUrl,
            profileData: batch.profileData,
            sessionId: session?.id
          })
        });
        if (res.ok) {
          const result = await res.json();
          totalSynced += result.upserted || 0;
        } else {
          anyChunkFailed = true;
        }
        // Slow down between chunks
        await sleep(2000 + Math.random() * 3000);
      }

      // Only mark synced if at least one post was actually saved
      if (totalSynced > 0 || !anyChunkFailed) {
        batch.synced = true;
        batch.syncedAt = Date.now();
        syncedIndexes.push(i);
      }
    } catch (err) {
      console.error('[LinkedLens] Sync error:', err);
    }
  }

  // Remove synced batches
  const remaining = postQueue.filter((_, i) => !syncedIndexes.includes(i));
  await chrome.storage.local.set({ ll_post_queue: remaining });

  await updateBadge();
}

async function updateBadge() {
  const data = await chrome.storage.local.get(['ll_post_queue', 'll_pending_creators']);
  const queue = data.ll_post_queue || [];
  const unsynced = queue.filter(b => !b.synced).length;
  const pending = (data.ll_pending_creators || []).length;
  const total = unsynced + pending;
  chrome.action.setBadgeText({ text: total > 0 ? String(total) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#0a66c2' });
}

async function getStatus() {
  const data = await chrome.storage.local.get(['ll_auth', 'll_post_queue', 'll_pending_creators', 'll_scrape_status']);
  const queue = data.ll_post_queue || [];
  return {
    loggedIn: !!data.ll_auth?.token,
    user: data.ll_auth?.user || null,
    unsyncedBatches: queue.filter(b => !b.synced).length,
    pendingCreators: (data.ll_pending_creators || []).length,
    scrapeStatus: data.ll_scrape_status || null
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// Initial badge update
updateBadge();
