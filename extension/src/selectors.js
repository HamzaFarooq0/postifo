// Postifo DOM Selectors - with extensive fallbacks for LinkedIn's changing DOM
const SELECTORS = {
  profile: {
    name: [
      // Current LinkedIn (2024-2026)
      'h1.text-heading-xlarge',
      '.pv-text-details__left-panel h1',
      '.ph5 h1',
      '.pv-top-card h1',
      '.scaffold-layout__main h1',
      'main h1',
      // Class fragment matches
      'h1[class*="inline"]',
      'h1[class*="heading"]',
      'h1[class*="break-words"]',
      'h1[class*="text-heading"]',
      // Older LinkedIn
      'h1[class*="name"]',
      '.profile-header h1',
      '.pv-top-card--list h1',
      '.artdeco-card h1',
      // Absolute last resort
      'h1'
    ],
    headline: [
      '.text-body-medium.break-words',
      '.pv-text-details__left-panel .text-body-medium',
      '.ph5 .text-body-medium',
      'div[class*="text-body-medium"]',
      '[data-field="headline"]',
      '.pv-top-card--list .text-body-medium',
      '[class*="headline"]',
      '.pv-top-card-section__headline'
    ],
    avatar: [
      '.pv-top-card-profile-picture__image--show',
      '.pv-top-card-profile-picture__image',
      '.profile-photo-edit__preview',
      'img.evi-image[alt*="photo" i]',
      'img.evi-image[alt*="Photo" i]',
      '.presence-entity__image',
      '.pv-top-card__photo img',
      'button[aria-label*="profile photo" i] img',
      '.profile-picture img',
      'img[alt*="profile" i]'
    ],
    followers: [
      'span[class*="follower"]',
      '[class*="follower"] span',
      '.pv-recent-activity-section__follower-count',
      'span[class*="follower-count"]',
      'a[href*="followers"] span',
      'p[class*="follower"]'
    ]
  },

  posts: {
    containers: [
      '.feed-shared-update-v2',
      '[data-urn*="activity"]',
      '[data-urn*="ugcPost"]',
      '.occludable-update',
      '.feed-shared-article',
      'article[class*="feed"]',
      '.update-components-actor',
      'div[data-id*="urn:li:activity"]',
      '.profile-creator-shared-feed-update__container',
      // profile activity tab
      '.artdeco-list__item .feed-shared-update-v2',
      'li.profile-creator-shared-feed-update__container'
    ],
    content: [
      '.feed-shared-update-v2__description .break-words',
      '.feed-shared-text .break-words',
      '.update-components-text',
      '.update-components-text__text-view',
      '[class*="commentary"] span[dir]',
      '.feed-shared-inline-show-more-text',
      '.feed-shared-update-v2__description span[dir]',
      '.attributed-text-segment-list__content',
      'span[dir="ltr"]'
    ],
    reactions: [
      '.social-details-social-counts__reactions-count',
      '[class*="reactions-count"]',
      '.social-counts-reactions__count-value',
      'button[aria-label*="reaction" i] span',
      '.reactions-icon__count',
      'span[class*="social-counts"]',
      '[data-test-id="social-actions__reaction-count"]',
      'button[aria-label*="Like" i] span',
      '.social-details-social-counts__item span',
      // Activity page: "You and 71 others" link
      'button[aria-label*="others"] span',
      'a[aria-label*="reaction" i]',
      '.social-details-social-counts button span',
      'span.social-details-social-counts__reactions-count'
    ],
    comments: [
      '.social-details-social-counts__comments',
      'button[aria-label*="comment" i]',
      'button[class*="comments-count"]',
      '.comments-count',
      '[data-test-id="social-actions__comments"]',
      'button[aria-label*="Comment" i] span',
      'li.social-details-social-counts__item--right button'
    ],
    reposts: [
      'button[aria-label*="repost" i]',
      'button[aria-label*="Repost" i]',
      '.social-details-social-counts__item--with-social-proof',
      'button[class*="reshares"]',
      '[aria-label*="reposts" i] span'
    ],
    postUrl: [
      'a[href*="/posts/"]',
      'a[href*="/activity-"]',
      'a.app-aware-link[href*="/feed/update/"]',
      'a[href*="linkedin.com/feed/update"]',
      '.feed-shared-update-v2__update-content-list a[href*="linkedin.com"]',
      'a[href*="urn:li:activity"]'
    ],
    timestamp: [
      'time[datetime]',
      '.update-components-actor__sub-description time',
      '.feed-shared-actor__sub-description time',
      'span[class*="posted-date"]',
      '.update-components-actor__meta time',
      'a[href*="activity"] time'
    ],
    mediaImage: [
      '.feed-shared-image img',
      '.update-components-image img',
      '.feed-shared-mini-update-v2__image img',
      'img[class*="feed-shared"]',
      '.update-components-image__image-link img'
    ]
  }
};

function queryFirst(element, selectorList) {
  for (const sel of selectorList) {
    try {
      const el = element.querySelector(sel);
      if (el) return el;
    } catch (_) {}
  }
  return null;
}

function queryAll(element, selectorList) {
  for (const sel of selectorList) {
    try {
      const els = element.querySelectorAll(sel);
      if (els.length > 0) return Array.from(els);
    } catch (_) {}
  }
  return [];
}

function parseCount(text) {
  if (!text) return 0;
  // Handle LinkedIn's "You and 71 others" reaction format
  const othersMatch = text.match(/[Yy]ou and ([\d,]+(?:\.\d+)?[KkMm]?)\s+others/);
  if (othersMatch) return parseCount(othersMatch[1]) + 1;
  // Handle "X reactions", "X comments", etc.
  const cleaned = text.replace(/,/g, '').trim();
  const match = cleaned.match(/[\d.]+[KkMm]?/);
  if (!match) return 0;
  const val = match[0];
  if (/[Kk]$/.test(val)) return Math.round(parseFloat(val) * 1000);
  if (/[Mm]$/.test(val)) return Math.round(parseFloat(val) * 1000000);
  return parseInt(val) || 0;
}

function extractPostUrl(container) {
  for (const sel of SELECTORS.posts.postUrl) {
    try {
      const a = container.querySelector(sel);
      if (a?.href && a.href.includes('linkedin.com')) {
        const clean = a.href.split('?')[0];
        if (clean.length > 30) return clean;
      }
    } catch (_) {}
  }
  // Try data-urn attribute
  const urn = container.getAttribute('data-urn')
    || container.querySelector('[data-urn]')?.getAttribute('data-urn')
    || container.getAttribute('data-id');
  if (urn && urn.includes('activity')) {
    const id = urn.split(':').pop();
    return `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`;
  }
  return null;
}

// Parse name from document.title — LinkedIn titles: "Tommy Clark | LinkedIn"
// or "(2) Tommy Clark | LinkedIn" or "Activity | Tommy Clark | LinkedIn"
function getNameFromTitle() {
  const title = document.title || '';
  // Strip leading notification count like "(2) "
  const clean = title.replace(/^\(\d+\)\s*/, '');
  const parts = clean.split(' | ').map(p => p.trim());

  // Generic terms that are never a person's name
  const skip = new Set([
    'linkedin', 'activity', 'all activity', 'recent activity',
    'posts', 'videos', 'images', 'documents', 'feed', 'home',
    'notifications', 'jobs', 'messaging', 'search', 'premium',
    'my network', 'profile'
  ]);

  // Return the first segment that isn't a generic LinkedIn page term
  const namePart = parts.find(p => p.length > 1 && !skip.has(p.toLowerCase()));
  if (namePart) return namePart;

  // Fallback: before first " - "
  const dashParts = clean.split(' - ');
  if (dashParts.length >= 2) return dashParts[0].trim();
  return null;
}

window.PostifoSelectors = SELECTORS;
window.PostifoHelpers = { queryFirst, queryAll, parseCount, extractPostUrl, getNameFromTitle };
