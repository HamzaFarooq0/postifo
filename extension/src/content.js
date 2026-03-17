// Postifo Content Script - injected on linkedin.com pages
(function () {
  'use strict';

  const { queryFirst, queryAll, parseCount, extractPostUrl, getNameFromTitle } = window.PostifoHelpers;
  const SELECTORS = window.PostifoSelectors;
  const API_BASE = 'https://postifo-backend-production.up.railway.app';
  const DASHBOARD_URL = 'https://postifo.vercel.app';

  let isTracking = false;
  let sidePanel = null;
  let observer = null;
  let scrollIntervalRef = null;
  let stopRequested = false;

  // Guard: if the extension context is invalidated (e.g. after reload),
  // stop gracefully instead of throwing uncaught errors.
  function isExtensionAlive() {
    try { return !!chrome.runtime?.id; } catch { return false; }
  }

  function safeStorageGet(keys, cb) {
    if (!isExtensionAlive()) { showStaleToast(); return; }
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
    return `${profileUrl.replace(/\/$/, '')}/recent-activity/all/`;
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

  // ─── Side Panel ───────────────────────────────────────────────────────

  function injectSidePanel() {
    if (sidePanel) return;
    if (!isProfilePage() && !isActivityPage()) return;

    // Restore saved vertical position
    let savedTop = 40;
    try {
      const v = localStorage.getItem('postifo_panel_top');
      if (v) savedTop = Math.max(5, Math.min(85, parseFloat(v)));
    } catch {}

    sidePanel = document.createElement('div');
    sidePanel.id = 'postifo-panel';
    sidePanel.style.top = savedTop + '%';

    const isActivity = isActivityPage();
    const btnLabel = isActivity ? 'Scrape Posts' : 'Track Creator';

    sidePanel.innerHTML = `
      <div id="postifo-panel-body-wrap">
        <div id="postifo-panel-body">
          <div class="ll-panel-header">
            <img class="ll-panel-logo" src="${chrome.runtime.getURL('icons/icon48.png')}" alt="Postifo" />
            <span class="ll-panel-title">Postifo</span>
            <button id="ll-panel-close-btn" title="Close panel">✕</button>
          </div>
          <div id="ll-panel-content">
            <div class="ll-panel-creator" id="ll-panel-creator-card" style="display:none"></div>
            <button id="ll-btn">
              <span class="ll-icon">🔍</span>
              <span class="ll-label">${btnLabel}</span>
            </button>
            <button id="ll-stop-btn" style="display:none">
              <span class="ll-icon">⏹</span>
              <span class="ll-label">Stop Scraping</span>
            </button>
            <div id="ll-panel-config-section" style="display:none"></div>
            <div id="ll-panel-progress-section" style="display:none"></div>
          </div>
          <div class="ll-panel-footer">
            <a class="ll-panel-dashboard-link" href="${DASHBOARD_URL}" target="_blank" rel="noopener">
              Open Dashboard ↗
            </a>
          </div>
        </div>
      </div>
      <div id="postifo-panel-tab" title="Postifo — click to open/close">
        <img id="postifo-tab-logo" src="${chrome.runtime.getURL('icons/icon48.png')}" alt="P" />
        <div id="postifo-tab-pulse"></div>
        <span id="postifo-tab-arrow">‹</span>
      </div>
    `;

    document.body.appendChild(sidePanel);

    // Populate creator card
    populateCreatorCard();

    // Wire up events
    document.getElementById('ll-btn').addEventListener('click', handleTrackClick);
    document.getElementById('ll-stop-btn').addEventListener('click', handleStopClick);
    document.getElementById('ll-panel-close-btn').addEventListener('click', closePanel);

    // Tab: click to toggle, drag to reposition
    setupPanelDrag();
  }

  function removeSidePanel() {
    if (sidePanel) { sidePanel.remove(); sidePanel = null; }
  }

  function openPanel() {
    if (!sidePanel) return;
    sidePanel.classList.add('ll-panel--open');
    const arrow = document.getElementById('postifo-tab-arrow');
    if (arrow) arrow.textContent = '›';
  }

  function closePanel() {
    if (!sidePanel) return;
    sidePanel.classList.remove('ll-panel--open');
    const arrow = document.getElementById('postifo-tab-arrow');
    if (arrow) arrow.textContent = '‹';
  }

  function isPanelOpen() {
    return sidePanel && sidePanel.classList.contains('ll-panel--open');
  }

  // ─── Vertical drag for the tab ─────────────────────────────────────

  function setupPanelDrag() {
    const tab = document.getElementById('postifo-panel-tab');
    if (!tab) return;

    let startY = 0, startTopPx = 0, isDragging = false, didMove = false;

    tab.addEventListener('mousedown', e => {
      isDragging = true;
      didMove = false;
      startY = e.clientY;
      startTopPx = sidePanel.getBoundingClientRect().top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const deltaY = e.clientY - startY;
      if (Math.abs(deltaY) > 4) didMove = true;
      if (!didMove) return;

      let newTop = startTopPx + deltaY;
      // Clamp: keep tab visible on screen
      newTop = Math.max(10, Math.min(window.innerHeight - 90, newTop));
      sidePanel.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;

      if (!didMove) {
        // It was a click, not a drag → toggle panel
        isPanelOpen() ? closePanel() : openPanel();
      } else {
        // Save position as percentage so it works across window resizes
        const topPx = sidePanel.getBoundingClientRect().top;
        const topPct = (topPx / window.innerHeight) * 100;
        sidePanel.style.top = topPct + '%';
        try { localStorage.setItem('postifo_panel_top', topPct.toFixed(1)); } catch {}
      }
      didMove = false;
    });
  }

  // ─── Populate creator card ──────────────────────────────────────────

  function populateCreatorCard() {
    const card = document.getElementById('ll-panel-creator-card');
    if (!card) return;

    const profileData = getProfileData();
    if (!profileData.name && !profileData.linkedinId) return;

    const avatarHtml = profileData.avatarUrl
      ? `<img class="ll-panel-avatar" src="${profileData.avatarUrl}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="ll-panel-avatar-placeholder" style="display:none">👤</div>`
      : `<div class="ll-panel-avatar-placeholder">👤</div>`;

    const followersHtml = profileData.followerCount
      ? `<div class="ll-panel-creator-followers">
           <span style="color:#A3A3A3;font-weight:400">Followers</span>
           ${profileData.followerCount.toLocaleString()}
         </div>`
      : '';

    const profileLink = profileData.linkedinUrl
      ? `<a class="ll-panel-view-profile" href="${profileData.linkedinUrl}" target="_blank" rel="noopener">View profile ↗</a>`
      : '';

    card.innerHTML = `
      ${avatarHtml}
      <div class="ll-panel-creator-info">
        <div class="ll-panel-creator-name">${profileData.name || profileData.linkedinId}</div>
        ${profileData.headline ? `<div class="ll-panel-creator-headline">${profileData.headline}</div>` : ''}
        <div class="ll-panel-creator-meta">
          ${followersHtml}
          ${profileLink}
        </div>
      </div>
    `;
    card.style.display = 'flex';
  }

  // ─── Inline Scrape Config (replaces the modal) ─────────────────────

  function showPanelConfig(profileData, scrapeInfo, onStart) {
    const configSection = document.getElementById('ll-panel-config-section');
    if (!configSection) return;

    const lastScraped = scrapeInfo?.lastScrapedAt ? new Date(scrapeInfo.lastScrapedAt) : null;

    const TIME_OPTIONS = [
      { label: '1 mo',  months: 1  },
      { label: '3 mo',  months: 3  },
      { label: '6 mo',  months: 6  },
      { label: '1 yr',  months: 12 },
      { label: 'All',   months: 0  },
    ];
    const COUNT_OPTIONS = [
      { label: '25',   count: 25  },
      { label: '50',   count: 50  },
      { label: '100',  count: 100 },
      { label: '200',  count: 200 },
    ];

    let mode           = lastScraped ? 'new' : 'time';
    let selectedMonths = 3;
    let selectedCount  = 50;

    const newPostsLabel = lastScraped
      ? lastScraped.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';

    configSection.innerHTML = `
      <div class="ll-panel-config">
        <div class="ll-panel-config-title">Scrape Options</div>

        ${lastScraped ? `
          <div class="ll-scrape-info-box">
            Already have <strong>${scrapeInfo.postCount} posts</strong>.<br>
            Last scraped <span class="ll-scrape-info-date">${newPostsLabel}</span>.
          </div>
        ` : ''}

        <div class="ll-tab-row">
          ${lastScraped ? `<button class="ll-tab ll-tab--active" data-mode="new">New only</button>` : ''}
          <button class="ll-tab${!lastScraped ? ' ll-tab--active' : ''}" data-mode="time">By time</button>
          <button class="ll-tab" data-mode="count">By count</button>
        </div>

        ${lastScraped ? `
        <div id="ll-cfg-new" class="ll-config-section">
          <div class="ll-config-hint">Only posts after <strong style="color:#FF6B35">${newPostsLabel}</strong> will be scraped.</div>
        </div>` : ''}

        <div id="ll-cfg-time" ${lastScraped ? 'style="display:none"' : ''}>
          <div class="ll-chip-row">
            ${TIME_OPTIONS.map(o => `
              <button class="ll-chip${o.months === selectedMonths ? ' ll-chip--active' : ''}" data-months="${o.months}">${o.label}</button>
            `).join('')}
          </div>
          <div class="ll-config-hint">Stops when posts older than this range are reached.</div>
        </div>

        <div id="ll-cfg-count" style="display:none">
          <div class="ll-chip-row">
            ${COUNT_OPTIONS.map(o => `
              <button class="ll-chip${o.count === selectedCount ? ' ll-chip--active' : ''}" data-count="${o.count}">${o.label}</button>
            `).join('')}
          </div>
          <div class="ll-config-hint">Stops once this many posts are collected.</div>
        </div>

        <button class="ll-config-start" id="ll-config-start">Start Scraping →</button>
        <span class="ll-config-cancel-link" id="ll-config-cancel">Cancel</span>
      </div>
    `;

    configSection.style.display = 'block';

    // Tab switching
    configSection.querySelectorAll('.ll-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        mode = tab.dataset.mode;
        configSection.querySelectorAll('.ll-tab').forEach(t => t.classList.remove('ll-tab--active'));
        tab.classList.add('ll-tab--active');
        const pNew   = document.getElementById('ll-cfg-new');
        const pTime  = document.getElementById('ll-cfg-time');
        const pCount = document.getElementById('ll-cfg-count');
        if (pNew)   pNew.style.display   = mode === 'new'   ? '' : 'none';
        if (pTime)  pTime.style.display  = mode === 'time'  ? '' : 'none';
        if (pCount) pCount.style.display = mode === 'count' ? '' : 'none';
      });
    });

    // Time chips
    configSection.querySelectorAll('#ll-cfg-time .ll-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        configSection.querySelectorAll('#ll-cfg-time .ll-chip').forEach(b => b.classList.remove('ll-chip--active'));
        btn.classList.add('ll-chip--active');
        selectedMonths = parseInt(btn.dataset.months);
      });
    });

    // Count chips
    configSection.querySelectorAll('#ll-cfg-count .ll-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        configSection.querySelectorAll('#ll-cfg-count .ll-chip').forEach(b => b.classList.remove('ll-chip--active'));
        btn.classList.add('ll-chip--active');
        selectedCount = parseInt(btn.dataset.count);
      });
    });

    document.getElementById('ll-config-cancel').addEventListener('click', () => {
      configSection.style.display = 'none';
      const btn = document.getElementById('ll-btn');
      if (btn) { btn.disabled = false; btn.querySelector('.ll-label').textContent = isActivityPage() ? 'Scrape Posts' : 'Track Creator'; }
    });

    document.getElementById('ll-config-start').addEventListener('click', () => {
      configSection.style.display = 'none';
      if (mode === 'new') {
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

    openPanel();
  }

  // Keep showScrapeConfig as alias so any future callers still work
  function showScrapeConfig(profileData, scrapeInfo, onStart) {
    showPanelConfig(profileData, scrapeInfo, onStart);
  }

  // ─── Panel Progress (replaces top scrape banner) ────────────────────

  function showPanelProgress(name, cutoffDate, maxPosts) {
    const section = document.getElementById('ll-panel-progress-section');
    if (!section) return;

    const rangeLabel = cutoffDate
      ? `last ${Math.round((Date.now() - cutoffDate.getTime()) / (30 * 24 * 3600 * 1000))} months`
      : 'all time';
    const limitLabel = maxPosts > 0 ? ` · up to ${maxPosts}` : '';

    section.innerHTML = `
      <div class="ll-panel-progress">
        <div class="ll-panel-progress-header">
          <div class="ll-panel-progress-dot"></div>
          <span class="ll-panel-progress-label">Scraping ${rangeLabel}${limitLabel}</span>
        </div>
        <div class="ll-panel-progress-bar-track">
          <div class="ll-panel-progress-bar-fill" id="ll-progress-fill" style="width:1%"></div>
        </div>
        <div id="ll-progress-sub">Starting… you can switch tabs freely</div>
      </div>
    `;
    section.style.display = 'block';

    if (sidePanel) sidePanel.classList.add('ll-panel--scraping');
    openPanel();
  }

  function updatePanelProgress(count, scrolls, maxScrolls) {
    const fill = document.getElementById('ll-progress-fill');
    const sub  = document.getElementById('ll-progress-sub');
    const pct  = Math.min(Math.round((scrolls / maxScrolls) * 100), 95);
    if (fill) fill.style.width = pct + '%';
    if (sub)  sub.innerHTML = `<strong style="color:#F5F5F5">${count}</strong> posts collected &nbsp;·&nbsp; ${pct}% done`;
  }

  function hidePanelProgress() {
    const section = document.getElementById('ll-panel-progress-section');
    if (section) section.style.display = 'none';
    if (sidePanel) sidePanel.classList.remove('ll-panel--scraping');
  }

  // Backward-compat aliases used by startScrollScraping
  function showScrapeBanner(name, cutoffDate, maxPosts) { showPanelProgress(name, cutoffDate, maxPosts); }
  function updateScrapeBanner(count, scrolls, maxScrolls) { updatePanelProgress(count, scrolls, maxScrolls); }
  function removeScrapeBanner() { hidePanelProgress(); }

  // ─── Track button click ───────────────────────────────────────────
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
        btn.disabled = true;
        btn.querySelector('.ll-label').textContent = 'Loading…';
        showScrapeConfig(profileData, null, (config) => {
          isTracking = true;
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
  function startScrollScraping(profileData, config, silent = false) {
    const { cutoffDate, maxPosts } = config || {};

    let collectedPosts = [];
    let scrollCount = 0;
    const MAX_SCROLLS = 200;

    if (!silent) showScrapeBanner(profileData.name, cutoffDate, maxPosts);
    else showSilentRefreshBar(profileData.name);

    function collectNow() {
      const newPosts = extractPosts();
      let hitCutoff = false;

      for (const post of newPosts) {
        if (collectedPosts.find(p => p.postUrl === post.postUrl)) continue;

        if (post.content && post.content.length > 80) {
          const snippet = post.content.substring(0, 150);
          if (collectedPosts.some(p => p.content && p.content.substring(0, 150) === snippet)) continue;
        }

        if (cutoffDate && post.postedAt && new Date(post.postedAt) < cutoffDate) {
          hitCutoff = true;
          continue;
        }

        collectedPosts.push(post);
      }

      const limitHit = maxPosts > 0 && collectedPosts.length >= maxPosts;

      safeStorageSet({
        ll_scrape_status: { count: collectedPosts.length, scrolls: scrollCount, profile: profileData.name }
      });
      if (!silent) updateScrapeBanner(collectedPosts.length, scrollCount, MAX_SCROLLS);
      else updateSilentRefreshBar(collectedPosts.length);
      const btn = document.getElementById('ll-btn');
      if (btn) btn.querySelector('.ll-label').textContent = `Scraping… (${collectedPosts.length})`;

      return hitCutoff || limitHit;
    }

    collectNow();

    let observerDebounce = null;
    observer = new MutationObserver(() => {
      if (observerDebounce) clearTimeout(observerDebounce);
      observerDebounce = setTimeout(() => {
        observerDebounce = null;
        const done = collectNow();
        if (done) stopRequested = true;
      }, 600);
    });
    const feedRoot =
      document.querySelector('.scaffold-layout__main') ||
      document.querySelector('[class*="scaffold-layout__main"]') ||
      document.querySelector('main') ||
      document.body;
    console.log('[LL] observing:', feedRoot.tagName, feedRoot.className.slice(0, 60));
    observer.observe(feedRoot, { childList: true, subtree: true });

    stopRequested = false;

    function doScroll() {
      const scrollAmt = Math.round(window.innerHeight * (0.7 + Math.random() * 0.4));
      window.scrollBy({ top: scrollAmt, behavior: 'smooth' });
      const mainEl =
        document.querySelector('.scaffold-layout__main') ||
        document.querySelector('[class*="scaffold-layout__main"]') ||
        document.querySelector('.scaffold-layout__content-container');
      if (mainEl && mainEl.scrollHeight > mainEl.clientHeight + 50) {
        mainEl.scrollBy({ top: scrollAmt, behavior: 'smooth' });
      }
      setTimeout(() => window.dispatchEvent(new Event('scroll')), 350 + Math.random() * 250);
    }

    function scheduleNextScroll(isFirst) {
      let base;
      if (isFirst) {
        base = 1500 + Math.random() * 1500;
      } else {
        const r = Math.random();
        if (r < 0.12) {
          base = 15000 + Math.random() * 10000;
        } else if (r < 0.25) {
          base = 2500 + Math.random() * 1500;
        } else {
          base = 5000 + Math.random() * 5000;
        }
      }

      console.log(`[LL] next scroll in ${Math.round(base/1000)}s (scroll #${scrollCount+1}, posts: ${collectedPosts.length})`);

      scrollIntervalRef = setTimeout(() => {
        if (scrollCount >= MAX_SCROLLS || stopRequested) {
          scrollIntervalRef = null;
          console.log('[LL] finalizing —', collectedPosts.length, 'posts, scrolls:', scrollCount);
          finalizeScrape(collectedPosts, profileData, silent);
          return;
        }

        doScroll();
        scrollCount++;
        console.log(`[LL] scroll #${scrollCount} done, body height: ${document.body.scrollHeight}`);
        if (!silent) updateScrapeBanner(collectedPosts.length, scrollCount, MAX_SCROLLS);

        setTimeout(() => { const done = collectNow(); if (done) stopRequested = true; }, 1500);
        setTimeout(() => { const done = collectNow(); if (done) stopRequested = true; }, 3000);
        setTimeout(() => { const done = collectNow(); if (done) stopRequested = true; }, 5000);

        scheduleNextScroll(false);
      }, base);
    }

    console.log('[LL] startScrollScraping started, initial posts:', collectedPosts.length);
    scheduleNextScroll(true);
  }

  function finalizeScrape(posts, profileData, isSilent = false) {
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
        if (isSilent) removeSilentRefreshBar(); else removeScrapeBanner();
        if (isSilent) {
          if (posts.length > 0) showToast(`Refreshed: +${posts.length} new posts from ${profileData.name}!`, 'success');
        } else {
          showToast(`Collected ${posts.length} posts from ${profileData.name}! Syncing…`, 'success');
        }
        safeSendMessage({ type: 'SYNC_NOW' });
        if (!isSilent || posts.length > 0) {
          safeSendMessage({ type: 'SCRAPE_DONE', name: profileData.name, count: posts.length });
        }
        isTracking = false;
        stopRequested = false;
        const btn = document.getElementById('ll-btn');
        if (btn) {
          btn.disabled = false;
          btn.querySelector('.ll-label').textContent = isSilent
            ? (posts.length > 0 ? `Done ✓ (+${posts.length})` : 'Scrape Posts')
            : `Done ✓ (${posts.length} posts)`;
        }
        const stopBtn = document.getElementById('ll-stop-btn');
        if (stopBtn) stopBtn.style.display = 'none';
      });
    });
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

  // ─── Silent refresh bar (auto-refresh indicator) ───────────────────
  function showSilentRefreshBar(name) {
    if (document.getElementById('ll-refresh-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'll-refresh-bar';
    bar.style.cssText = [
      'position:fixed','bottom:24px','left:50%','transform:translateX(-50%)',
      'z-index:100002','background:#1a1a1a','border:1px solid rgba(255,107,53,0.3)',
      'color:#A3A3A3','font-size:12px','font-weight:500','padding:10px 14px',
      'border-radius:10px','box-shadow:0 4px 20px rgba(0,0,0,0.4)',
      'font-family:-apple-system,sans-serif','display:flex','align-items:center','gap:8px',
      'max-width:300px',
    ].join(';');
    bar.innerHTML = `
      <div style="width:7px;height:7px;border-radius:50%;background:#FF6B35;flex-shrink:0"></div>
      <span id="ll-refresh-bar-text">Postifo refreshing <strong style="color:#F5F5F5">${name}</strong>…</span>
      <button id="ll-refresh-bar-close" style="margin-left:auto;background:none;border:none;color:#555;cursor:pointer;font-size:13px;padding:0 0 0 6px;line-height:1">✕</button>
    `;
    document.body.appendChild(bar);
    document.getElementById('ll-refresh-bar-close').addEventListener('click', () => bar.remove());
  }

  function updateSilentRefreshBar(count) {
    const el = document.getElementById('ll-refresh-bar-text');
    if (el) el.innerHTML = `Postifo refreshing… <strong style="color:#F5F5F5">${count} new</strong>`;
  }

  function removeSilentRefreshBar() {
    const el = document.getElementById('ll-refresh-bar');
    if (el) el.remove();
  }

  // ─── Silent auto-refresh ───────────────────────────────────────────
  function checkAutoRefresh() {
    if (!isActivityPage() || isTracking) return;
    const profileUrl = getProfileUrlFromCurrent();
    if (!profileUrl) return;

    safeStorageGet(['ll_auth'], (data) => {
      const token = data.ll_auth?.token;
      if (!token) return;

      fetch(`${API_BASE}/api/creators/scrape-info?linkedinUrl=${encodeURIComponent(profileUrl)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
        .then(info => {
          if (!info?.lastScrapedAt) return;
          const staleDays = (Date.now() - new Date(info.lastScrapedAt).getTime()) / 86400000;
          if (staleDays < 7) return;
          if (isTracking) return;

          const profileData = getProfileData();
          if (!profileData.linkedinUrl) return;
          if (!profileData.name) profileData.name = profileData.linkedinId || 'creator';

          safeStorageGet(['ll_pending_creators'], (d) => {
            const pending = d.ll_pending_creators || [];
            if (!pending.find(c => c.linkedinUrl === profileData.linkedinUrl)) {
              pending.push({ ...profileData, queuedAt: Date.now() });
              safeStorageSet({ ll_pending_creators: pending });
            }

            isTracking = true;
            const btn = document.getElementById('ll-btn');
            if (btn) { btn.disabled = true; btn.querySelector('.ll-label').textContent = 'Refreshing…'; }
            const stopBtn = document.getElementById('ll-stop-btn');
            if (stopBtn) stopBtn.style.display = 'flex';

            startScrollScraping(profileData, { cutoffDate: new Date(info.lastScrapedAt), maxPosts: 0 }, true);
          });
        });
    });
  }

  // ─── URL change watcher (LinkedIn is a SPA) ───────────────────────────
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (!isExtensionAlive()) return;
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      removeSidePanel();
      setTimeout(() => {
        if (!isExtensionAlive()) return;
        if (isProfilePage() || isActivityPage()) {
          injectSidePanel();
          checkAutoPendingScrape();
          setTimeout(() => { if (!isExtensionAlive()) return; checkAutoRefresh(); }, 1000);
        }
      }, 2000);
    }
  }).observe(document, { subtree: true, childList: true });

  // ─── Initial load ─────────────────────────────────────────────────────
  if (isProfilePage() || isActivityPage()) {
    setTimeout(() => {
      if (!isExtensionAlive()) return;
      injectSidePanel();
      checkAutoPendingScrape();
      setTimeout(() => { if (!isExtensionAlive()) return; checkAutoRefresh(); }, 1000);
    }, 3000);
  }

})();
