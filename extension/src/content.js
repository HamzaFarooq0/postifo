// Postifo Content Script - injected on linkedin.com pages
(function () {
  'use strict';

  const { queryFirst, queryAll, parseCount, extractPostUrl, getNameFromTitle } = window.PostifoHelpers;
  const SELECTORS = window.PostifoSelectors;
  const API_BASE = 'http://localhost:3001';

  let isTracking = false;
  let trackButton = null;
  let observer = null;
  let scrollIntervalRef = null;
  let stopRequested = false;

  // Guard: if the extension context is invalidated (e.g. after reload),
  // stop gracefully instead of throwing uncaught errors.
  function isExtensionAlive() {
    try { return !!chrome.runtime?.id; } catch { return false; }
  }

  function safeStorageGet(keys, cb) {
    if (!isExtensionAlive()) {
      showStaleToast();
      return;
    }
    try { chrome.storage.local.get(keys, cb); } catch (e) {
      console.warn('[Postifo] context invalidated', e);
      showStaleToast();
    }
  }

  function safeStorageSet(data, cb) {
    if (!isExtensionAlive()) return;
    try { chrome.storage.local.set(data, cb); } catch (e) { console.warn('[Postifo] context invalidated', e); }
  }

  function safeSendMessage(msg) {
    if (!isExtensionAlive()) return;
    try { chrome.runtime.sendMessage(msg); } catch (e) { console.warn('[Postifo] context invalidated', e); }
  }

  function showStaleToast() {
    // Avoid spamming — only show once per page load
    if (document.getElementById('ll-stale-toast')) return;
    const t = document.createElement('div');
    t.id = 'll-stale-toast';
    t.style.cssText = [
      'position:fixed','bottom:32px','left:50%','transform:translateX(-50%)',
      'z-index:100003','background:#1a1a1a','border:1px solid #FF6B35',
      'color:#F5F5F5','font-size:13px','font-weight:500','padding:12px 20px',
      'border-radius:10px','box-shadow:0 4px 20px rgba(0,0,0,0.5)',
      'font-family:-apple-system,sans-serif','text-align:center','max-width:340px',
    ].join(';');
    t.innerHTML = '⚠️ Postifo was updated — <strong>refresh this page</strong> (⌘R) to use it.';
    document.body.appendChild(t);
  }

  // ─── Page type detection ─────────────────────────────────────────────
  function isProfilePage() {
    // Matches /in/username but NOT /in/username/recent-activity/...
    return /linkedin\.com\/in\/[^/]+\/?$/.test(window.location.href.split('?')[0]);
  }

  function isActivityPage() {
    return /linkedin\.com\/in\/[^/]+\/recent-activity\/(shares|all|posts|videos|images)/.test(window.location.href);
  }

  function getProfileUrlFromCurrent() {
    const match = window.location.href.match(/(https:\/\/www\.linkedin\.com\/in\/[^/?]+)/);
    return match ? match[1] : null;
  }

  function getActivityUrl(profileUrl) {
    const clean = profileUrl.replace(/\/$/, '');
    return `${clean}/recent-activity/all/`;
  }

  // ─── Profile data extraction ─────────────────────────────────────────
  function getProfileData() {
    let name = queryFirst(document, SELECTORS.profile.name)?.innerText?.trim();
    if (!name) name = getNameFromTitle();

    const headline = queryFirst(document, SELECTORS.profile.headline)?.innerText?.trim() || null;
    const avatarEl = queryFirst(document, SELECTORS.profile.avatar);
    const avatarUrl = avatarEl?.src || null;
    const followersEl = queryFirst(document, SELECTORS.profile.followers);
    const followerCount = parseCount(followersEl?.innerText?.trim() || '');

    const profileUrl = getProfileUrlFromCurrent();
    const match = profileUrl?.match(/\/in\/([^/?]+)/);
    const linkedinId = match ? match[1] : null;
    const displayName = name || linkedinId || null;

    return { name: displayName, headline, avatarUrl, followerCount, linkedinUrl: profileUrl, linkedinId };
  }

  // ─── Post Extraction ─────────────────────────────────────────────────
  function extractPosts() {
    const postContainers = queryAll(document, SELECTORS.posts.containers);
    const posts = [];

    for (const container of postContainers) {
      const postUrl = extractPostUrl(container);
      if (!postUrl) continue;

      const contentEl = queryFirst(container, SELECTORS.posts.content);
      const content = contentEl?.innerText?.trim() || '';

      const reactionsEl = queryFirst(container, SELECTORS.posts.reactions);
      const reactions = parseCount(reactionsEl?.innerText || reactionsEl?.getAttribute('aria-label') || '0');

      const commentsEl = queryFirst(container, SELECTORS.posts.comments);
      const comments = parseCount(commentsEl?.innerText || commentsEl?.getAttribute('aria-label') || '0');

      const repostsEl = queryFirst(container, SELECTORS.posts.reposts);
      const reposts = parseCount(repostsEl?.innerText || repostsEl?.getAttribute('aria-label') || '0');

      const timeEl = queryFirst(container, SELECTORS.posts.timestamp);
      const postedAt = timeEl?.getAttribute('datetime') || null;

      const mediaEl = queryFirst(container, SELECTORS.posts.mediaImage);
      const mediaUrl = mediaEl?.src || null;
      const postType = mediaEl ? 'image' : (content.length > 0 ? 'text' : 'other');

      posts.push({ postUrl, content: content.substring(0, 3000), reactions, comments, reposts, postedAt, mediaUrl, postType });
    }
    return posts;
  }

  // ─── Track Button ─────────────────────────────────────────────────────
  function injectTrackButton() {
    if (trackButton) return;
    if (!isProfilePage() && !isActivityPage()) return;

    trackButton = document.createElement('div');
    trackButton.id = 'postifo-track-btn';

    const isActivity = isActivityPage();
    trackButton.innerHTML = `
      <button id="ll-btn" title="Track this creator with Postifo">
        <span class="ll-icon">🔍</span>
        <span class="ll-label">${isActivity ? 'Scrape All Posts' : 'Track Creator'}</span>
      </button>
      <button id="ll-stop-btn" title="Stop scraping" style="display:none">
        <span class="ll-icon">⏹</span>
        <span class="ll-label">Stop</span>
      </button>
    `;
    document.body.appendChild(trackButton);
    document.getElementById('ll-btn').addEventListener('click', handleTrackClick);
    document.getElementById('ll-stop-btn').addEventListener('click', handleStopClick);
  }

  function removeTrackButton() {
    if (trackButton) { trackButton.remove(); trackButton = null; }
  }

  async function handleTrackClick() {
    const btn = document.getElementById('ll-btn');
    if (!btn || isTracking) return;

    safeStorageGet(['ll_auth'], (data) => {
      if (!data.ll_auth?.token) {
        showToast('Please log in to Postifo first (click the extension icon).', 'warning');
        return;
      }

      if (isProfilePage()) {
        const profileData = getProfileData();
        if (!profileData.name) {
          showToast('Could not read profile name.', 'error');
          return;
        }
        // Show config then navigate on confirm (no scrapeInfo on profile page — activity page handles incremental)
        showScrapeConfig(profileData, null, (config) => {
          isTracking = true;
          btn.disabled = true;
          btn.querySelector('.ll-label').textContent = 'Starting…';
          safeStorageGet(['ll_pending_creators'], (d) => {
            const pending = d.ll_pending_creators || [];
            if (!pending.find(c => c.linkedinUrl === profileData.linkedinUrl)) {
              pending.push({ ...profileData, queuedAt: Date.now() });
            }
            safeStorageSet({
              ll_pending_creators: pending,
              ll_pending_scrape: { profileData, config, startedAt: Date.now() }
            }, () => {
              showToast(`Navigating to ${profileData.name}'s posts page…`, 'info');
              window.location.href = getActivityUrl(profileData.linkedinUrl);
            });
          });
        });

      } else if (isActivityPage()) {
        const profileData = getProfileData();
        if (!profileData.name) {
          showToast('Could not read profile name.', 'error');
          return;
        }

        function startWithConfig(scrapeInfo) {
          showScrapeConfig(profileData, scrapeInfo, (config) => {
            isTracking = true;
            btn.disabled = true;
            btn.querySelector('.ll-label').textContent = 'Scraping…';
            const stopBtn = document.getElementById('ll-stop-btn');
            if (stopBtn) stopBtn.style.display = 'flex';
            // Ensure creator is queued for /api/creators/track before posts sync
            safeStorageGet(['ll_pending_creators'], (d) => {
              const pending = d.ll_pending_creators || [];
              if (!pending.find(c => c.linkedinUrl === profileData.linkedinUrl)) {
                pending.push({ ...profileData, queuedAt: Date.now() });
                safeStorageSet({ ll_pending_creators: pending });
              }
              startScrollScraping(profileData, config);
            });
          });
        }

        // Fetch last scrape info to offer "New posts only" incremental option
        const token = data.ll_auth?.token;
        fetch(`${API_BASE}/api/creators/scrape-info?linkedinUrl=${encodeURIComponent(profileData.linkedinUrl)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
          .then(scrapeInfo => startWithConfig(scrapeInfo));
      }
    });
  }

  // ─── Scrape config modal ─────────────────────────────────────────────
  // scrapeInfo = { lastScrapedAt: Date|null, postCount: number } | null
  function showScrapeConfig(profileData, scrapeInfo, onStart) {
    const existing = document.getElementById('ll-config-overlay');
    if (existing) existing.remove();

    const lastScraped = scrapeInfo?.lastScrapedAt ? new Date(scrapeInfo.lastScrapedAt) : null;

    const TIME_OPTIONS = [
      { label: '1 month',  months: 1  },
      { label: '3 months', months: 3  },
      { label: '6 months', months: 6  },
      { label: '1 year',   months: 12 },
      { label: 'All time', months: 0  },
    ];
    const COUNT_OPTIONS = [
      { label: '25',       count: 25  },
      { label: '50',       count: 50  },
      { label: '100',      count: 100 },
      { label: '200',      count: 200 },
    ];

    // If previously scraped, default to incremental mode
    let mode           = lastScraped ? 'new' : 'time'; // 'new' | 'time' | 'count'
    let selectedMonths = 3;
    let selectedCount  = 50;

    const newPostsLabel = lastScraped
      ? `Since ${lastScraped.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : '';

    const overlay = document.createElement('div');
    overlay.id = 'll-config-overlay';
    overlay.innerHTML = `
      <div id="ll-config-modal">
        <div class="ll-config-header">
          <img class="ll-config-logo" src="${chrome.runtime.getURL('icons/icon48.png')}" alt="Postifo" />
          <span class="ll-config-title">Configure Scrape</span>
          <span class="ll-config-creator">${profileData.name}</span>
        </div>

        <div class="ll-tab-row">
          ${lastScraped ? `<button class="ll-tab ll-tab--active" data-mode="new">New posts only</button>` : ''}
          <button class="ll-tab${!lastScraped ? ' ll-tab--active' : ''}" data-mode="time">By Time</button>
          <button class="ll-tab" data-mode="count">By Count</button>
        </div>

        ${lastScraped ? `
        <div id="ll-panel-new" class="ll-config-section">
          <div class="ll-config-hint" style="color:#A3A3A3;font-size:12px;line-height:1.6">
            ✅ Already have <strong style="color:#F5F5F5">${scrapeInfo.postCount} posts</strong> from this creator.<br>
            Will only scrape posts published after <strong style="color:#FF6B35">${newPostsLabel}</strong>.
          </div>
        </div>` : ''}

        <div id="ll-panel-time" class="ll-config-section" style="${lastScraped ? 'display:none' : ''}">
          <div class="ll-chip-row">
            ${TIME_OPTIONS.map(o => `
              <button class="ll-chip${o.months === selectedMonths ? ' ll-chip--active' : ''}"
                data-months="${o.months}">${o.label}</button>
            `).join('')}
          </div>
          <div class="ll-config-hint">Stops when posts older than this are reached.</div>
        </div>

        <div id="ll-panel-count" class="ll-config-section" style="display:none">
          <div class="ll-chip-row">
            ${COUNT_OPTIONS.map(o => `
              <button class="ll-chip${o.count === selectedCount ? ' ll-chip--active' : ''}"
                data-count="${o.count}">${o.label} posts</button>
            `).join('')}
          </div>
          <div class="ll-config-hint">Stops once this many posts are collected.</div>
        </div>

        <div class="ll-config-actions">
          <button class="ll-config-cancel" id="ll-config-cancel">Cancel</button>
          <button class="ll-config-start" id="ll-config-start">Start Scraping →</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Tab switching
    overlay.querySelectorAll('.ll-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        mode = tab.dataset.mode;
        overlay.querySelectorAll('.ll-tab').forEach(t => t.classList.remove('ll-tab--active'));
        tab.classList.add('ll-tab--active');
        const panelNew   = document.getElementById('ll-panel-new');
        const panelTime  = document.getElementById('ll-panel-time');
        const panelCount = document.getElementById('ll-panel-count');
        if (panelNew)   panelNew.style.display   = mode === 'new'   ? '' : 'none';
        if (panelTime)  panelTime.style.display  = mode === 'time'  ? '' : 'none';
        if (panelCount) panelCount.style.display = mode === 'count' ? '' : 'none';
      });
    });

    // Time chips
    overlay.querySelectorAll('#ll-panel-time .ll-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('#ll-panel-time .ll-chip').forEach(b => b.classList.remove('ll-chip--active'));
        btn.classList.add('ll-chip--active');
        selectedMonths = parseInt(btn.dataset.months);
      });
    });

    // Count chips
    overlay.querySelectorAll('#ll-panel-count .ll-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('#ll-panel-count .ll-chip').forEach(b => b.classList.remove('ll-chip--active'));
        btn.classList.add('ll-chip--active');
        selectedCount = parseInt(btn.dataset.count);
      });
    });

    document.getElementById('ll-config-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    document.getElementById('ll-config-start').addEventListener('click', () => {
      overlay.remove();
      if (mode === 'new') {
        // Incremental: only fetch posts newer than the last scrape
        onStart({ cutoffDate: lastScraped, maxPosts: 0 });
      } else if (mode === 'time') {
        const cutoffDate = selectedMonths > 0
          ? new Date(Date.now() - selectedMonths * 30 * 24 * 3600 * 1000)
          : null;
        onStart({ cutoffDate, maxPosts: 0 });
      } else {
        onStart({ cutoffDate: null, maxPosts: selectedCount });
      }
    });
  }

  function handleStopClick() {
    stopRequested = true;
    showToast('Stopping scrape — saving collected posts…', 'warning');
    const stopBtn = document.getElementById('ll-stop-btn');
    if (stopBtn) stopBtn.style.display = 'none';
  }

  // ─── Auto-start on activity page if pending job exists ───────────────
  function checkAutoPendingScrape() {
    if (!isActivityPage()) return;
    safeStorageGet(['ll_pending_scrape', 'll_auth'], (data) => {
      if (!data.ll_pending_scrape || !data.ll_auth?.token) return;

      const { profileData, config, startedAt } = data.ll_pending_scrape;
      if (Date.now() - startedAt > 120000) {
        try { chrome.storage.local.remove('ll_pending_scrape'); } catch {}
        return;
      }

      const currentMatch = window.location.href.match(/\/in\/([^/?]+)/);
      const pendingMatch = profileData.linkedinUrl?.match(/\/in\/([^/?]+)/);
      if (!currentMatch || !pendingMatch || currentMatch[1] !== pendingMatch[1]) return;

      try {
        chrome.storage.local.remove('ll_pending_scrape', () => {
          const resolvedConfig = config || { cutoffDate: null, maxPosts: 0 };
          showToast(`Auto-scraping posts from ${profileData.name}…`, 'success');
          isTracking = true;
          const btn = document.getElementById('ll-btn');
          if (btn) { btn.disabled = true; btn.querySelector('.ll-label').textContent = 'Scraping…'; }
          const stopBtn = document.getElementById('ll-stop-btn');
          if (stopBtn) stopBtn.style.display = 'flex';
          startScrollScraping(profileData, resolvedConfig);
        });
      } catch {}
    });
  }

  // ─── Scroll-based scraping (on activity page) ─────────────────────────
  function startScrollScraping(profileData, config) {
    const { cutoffDate, maxPosts } = config || {};
    // cutoffDate: Date|null — skip/stop on older posts
    // maxPosts: number — 0 means no limit

    let collectedPosts = [];
    let scrollCount = 0;
    const MAX_SCROLLS = 60; // generous ceiling; early-stop handles the real limit

    showScrapeBanner(profileData.name, cutoffDate, maxPosts);

    // Collect all currently visible posts and dedup into collectedPosts.
    // Returns true if we should stop early (hit cutoff or post limit).
    function collectNow() {
      const newPosts = extractPosts();
      let hitCutoff = false;

      for (const post of newPosts) {
        if (collectedPosts.find(p => p.postUrl === post.postUrl)) continue;

        // Content-based dedup: LinkedIn sometimes surfaces the same post under two
        // different activity IDs (e.g. reshares, feed re-surfacing). If we already
        // have a post with the same first 150 chars from this session, skip it.
        if (post.content && post.content.length > 80) {
          const snippet = post.content.substring(0, 150);
          if (collectedPosts.some(p => p.content && p.content.substring(0, 150) === snippet)) continue;
        }

        // Time-range cutoff: posts are in reverse-chron order; first old post = done
        if (cutoffDate && post.postedAt && new Date(post.postedAt) < cutoffDate) {
          hitCutoff = true;
          continue; // still collect newer posts in same batch
        }

        collectedPosts.push(post);
      }

      const limitHit = maxPosts > 0 && collectedPosts.length >= maxPosts;

      safeStorageSet({
        ll_scrape_status: { count: collectedPosts.length, scrolls: scrollCount, profile: profileData.name }
      });
      updateScrapeBanner(collectedPosts.length, scrollCount, MAX_SCROLLS);
      const btn = document.getElementById('ll-btn');
      if (btn) btn.querySelector('.ll-label').textContent = `Scraping… (${collectedPosts.length} posts)`;

      return hitCutoff || limitHit;
    }

    // Collect initial posts already on screen
    collectNow();

    // MutationObserver catches posts loaded by infinite scroll.
    // MUST be debounced — without this, updating the banner DOM triggers
    // the observer again, causing an infinite loop that freezes the tab.
    let observerDebounce = null;
    observer = new MutationObserver(() => {
      if (observerDebounce) clearTimeout(observerDebounce);
      observerDebounce = setTimeout(() => {
        observerDebounce = null;
        const done = collectNow();
        if (done) stopRequested = true;
      }, 600);
    });
    // Observe only the feed container — not all of body — to reduce noise
    const feedRoot =
      document.querySelector('.scaffold-layout__main') ||
      document.querySelector('[class*="scaffold-layout__main"]') ||
      document.querySelector('main') ||
      document.body;
    console.log('[LL] observing:', feedRoot.tagName, feedRoot.className.slice(0, 60));
    observer.observe(feedRoot, { childList: true, subtree: true });

    stopRequested = false;

    // LinkedIn uses IntersectionObserver internally to trigger infinite scroll.
    // The trick: scroll the LAST visible post into view so the feed's sentinel
    // element enters the viewport and fires the load. Also fire scroll events
    // on multiple containers as a fallback for older LinkedIn builds.
    function doScroll() {
      // Step 1: scroll the last visible post into view (most reliable trigger)
      const POST_SELS = [
        '.feed-shared-update-v2',
        '[data-urn*="activity"]',
        '.occludable-update',
        'li.profile-creator-shared-feed-update__container',
        '.profile-creator-shared-feed-update__container',
      ];
      let lastPost = null;
      for (const sel of POST_SELS) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          console.log(`[LL] doScroll: found ${els.length} containers via "${sel}"`);
          lastPost = els[els.length - 1]; break;
        }
      }
      if (!lastPost) console.warn('[LL] doScroll: no post containers found!');
      if (lastPost) {
        lastPost.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }

      // Step 2: also push window + any inner container to the bottom
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      const mainEl =
        document.querySelector('.scaffold-layout__main') ||
        document.querySelector('[class*="scaffold-layout__main"]') ||
        document.querySelector('.scaffold-layout__content-container');
      if (mainEl && mainEl.scrollHeight > mainEl.clientHeight + 50) {
        mainEl.scrollTo({ top: mainEl.scrollHeight, behavior: 'smooth' });
      }

      // Step 3: fire a single window scroll event for listener-based loaders
      setTimeout(() => window.dispatchEvent(new Event('scroll')), 400);
    }

    // Schedule next scroll with a human-like random delay.
    // NOTE: No isExtensionAlive() guard here — the scroll is pure DOM work and
    // doesn't need Chrome APIs. The guard was killing the loop silently.
    function scheduleNextScroll(isFirst) {
      const base  = isFirst ? 1500 + Math.random() * 1500   // 1.5–3s for first
                            : 5000 + Math.random() * 4000;  // 5–9s after that
      const extra = !isFirst && Math.random() < 0.15 ? 2000 + Math.random() * 2000 : 0;
      const delay = base + extra;

      console.log(`[LL] next scroll in ${Math.round(delay/1000)}s (scroll #${scrollCount+1}, posts: ${collectedPosts.length})`);

      scrollIntervalRef = setTimeout(() => {
        if (scrollCount >= MAX_SCROLLS || stopRequested) {
          scrollIntervalRef = null;
          console.log('[LL] finalizing —', collectedPosts.length, 'posts, scrolls:', scrollCount);
          finalizeScrape(collectedPosts, profileData);
          return;
        }

        doScroll();
        scrollCount++;
        console.log(`[LL] scroll #${scrollCount} done, body height: ${document.body.scrollHeight}`);
        updateScrapeBanner(collectedPosts.length, scrollCount, MAX_SCROLLS);

        // Scan at 1.5s, 3s, 5s after scroll — catches both fast and slow loaders
        setTimeout(() => { const done = collectNow(); if (done) stopRequested = true; }, 1500);
        setTimeout(() => { const done = collectNow(); if (done) stopRequested = true; }, 3000);
        setTimeout(() => { const done = collectNow(); if (done) stopRequested = true; }, 5000);

        scheduleNextScroll(false);
      }, delay);
    }

    console.log('[LL] startScrollScraping started, initial posts:', collectedPosts.length);
    scheduleNextScroll(true);
  }

  function finalizeScrape(posts, profileData) {
    if (observer) { observer.disconnect(); observer = null; }

    safeStorageGet(['ll_post_queue'], (data) => {
      const queue = data.ll_post_queue || [];
      const existingIdx = queue.findIndex(b => b.profileData?.linkedinUrl === profileData.linkedinUrl && !b.synced);
      if (existingIdx >= 0) {
        const existing = queue[existingIdx];
        const merged = [...existing.posts];
        for (const p of posts) {
          if (!merged.find(m => m.postUrl === p.postUrl)) merged.push(p);
        }
        queue[existingIdx].posts = merged;
      } else {
        queue.push({ profileData, posts, queuedAt: Date.now(), synced: false });
      }

      safeStorageSet({
        ll_post_queue: queue,
        ll_scrape_status: { count: posts.length, scrolls: 30, profile: profileData.name, done: true }
      }, () => {
        removeScrapeBanner();
        showToast(`Collected ${posts.length} posts from ${profileData.name}! Syncing to dashboard…`, 'success');
        safeSendMessage({ type: 'SYNC_NOW' });
        safeSendMessage({ type: 'SCRAPE_DONE', name: profileData.name, count: posts.length });
        isTracking = false;
        stopRequested = false;
        const btn = document.getElementById('ll-btn');
        if (btn) { btn.disabled = false; btn.querySelector('.ll-label').textContent = `Done ✓ (${posts.length} posts)`; }
        const stopBtn = document.getElementById('ll-stop-btn');
        if (stopBtn) stopBtn.style.display = 'none';
      });
    });
  }

  // ─── Persistent scrape banner ─────────────────────────────────────────
  function showScrapeBanner(name, cutoffDate, maxPosts) {
    removeScrapeBanner();
    const rangeLabel = cutoffDate
      ? `last ${Math.round((Date.now() - cutoffDate.getTime()) / (30 * 24 * 3600 * 1000))} months`
      : 'all time';
    const limitLabel = maxPosts > 0 ? ` · up to ${maxPosts} posts` : '';
    const banner = document.createElement('div');
    banner.id = 'll-scrape-banner';
    banner.innerHTML = `
      <div class="ll-banner-icon">🔍</div>
      <div class="ll-banner-body">
        <div class="ll-banner-title">Postifo is scraping <strong>${name}</strong> &nbsp;·&nbsp; <span style="color:#FFBE0B;font-weight:400">${rangeLabel}${limitLabel}</span></div>
        <div class="ll-banner-sub" id="ll-banner-sub">Starting… you can switch tabs freely</div>
      </div>
      <div class="ll-banner-pulse"></div>
    `;
    document.body.appendChild(banner);
  }

  function updateScrapeBanner(count, scrolls, maxScrolls) {
    const sub = document.getElementById('ll-banner-sub');
    if (!sub) return;
    const pct = Math.min(Math.round((scrolls / maxScrolls) * 100), 95);
    sub.innerHTML = `<strong>${count}</strong> posts collected &nbsp;·&nbsp; ${pct}% done &nbsp;·&nbsp; <span style="color:#FFBE0B">Don't close this tab</span>`;
  }

  function removeScrapeBanner() {
    const b = document.getElementById('ll-scrape-banner');
    if (b) b.remove();
  }

  // ─── Toast ────────────────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const existing = document.getElementById('ll-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'll-toast';
    toast.className = `ll-toast ll-toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('ll-toast--visible'), 100);
    setTimeout(() => { toast.classList.remove('ll-toast--visible'); setTimeout(() => toast.remove(), 400); }, 5000);
  }

  // ─── URL change watcher (LinkedIn is a SPA) ───────────────────────────
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (!isExtensionAlive()) return; // stop if extension was reloaded
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      removeTrackButton();
      setTimeout(() => {
        if (!isExtensionAlive()) return;
        if (isProfilePage() || isActivityPage()) {
          injectTrackButton();
          checkAutoPendingScrape();
        }
      }, 2000);
    }
  }).observe(document, { subtree: true, childList: true });

  // ─── Initial load ─────────────────────────────────────────────────────
  if (isProfilePage() || isActivityPage()) {
    setTimeout(() => {
      if (!isExtensionAlive()) return;
      injectTrackButton();
      checkAutoPendingScrape();
    }, 3000); // 3s gives LinkedIn's SPA time to finish rendering
  }

})();
