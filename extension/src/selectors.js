// Postifo DOM Selectors
// Strategy: prefer data-*, aria-*, href patterns, and structural HTML attributes
// that LinkedIn CANNOT change (they're functional, not styling).
// CSS class names are hashed and change constantly — avoid them as primary selectors.
const SELECTORS = {
  profile: {
    name: [
      // h1 on profile pages — relatively stable tag usage
      'h1.text-heading-xlarge',
      'h1[class*="text-heading"]',
      'h1[class*="break-words"]',
      'h1[class*="inline"]',
      '.scaffold-layout__main h1',
      'main h1',
      'h1'
    ],
    headline: [
      // data-field is the most stable
      '[data-field="headline"]',
      // dir="ltr" on the headline container
      '.pv-text-details__left-panel [dir="ltr"]',
      '.ph5 [dir="ltr"]',
      // class fragment fallbacks
      '[class*="text-body-medium"]',
      '[class*="headline"]',
    ],
    avatar: [
      // aria-label is required for accessibility — stable
      'button[aria-label*="profile photo" i] img',
      'button[aria-label*="your photo" i] img',
      'img[alt*="profile photo" i]',
      'img[alt*="Photo of" i]',
      // class fallbacks
      '.pv-top-card-profile-picture__image--show',
      '.pv-top-card-profile-picture__image',
      'img.evi-image[alt*="photo" i]',
      'img[class*="profile-picture"]',
    ],
    followers: [
      // href pattern is stable
      'a[href*="followers"] span',
      // aria / text patterns
      'span[aria-label*="follower" i]',
      '[class*="follower"] span',
      'span[class*="follower"]',
      'p[class*="follower"]'
    ]
  },

  // NOTE: posts selectors are only used as fallback.
  // The primary extraction in extractPosts() uses URN data attributes
  // and aria-labels directly — see content.js extractPosts().
  posts: {
    containers: [
      // data-urn / data-id are LinkedIn's own content IDs — very stable
      '[data-urn*="urn:li:activity"]',
      '[data-id*="urn:li:activity"]',
      '[data-urn*="ugcPost"]',
      '[data-id*="ugcPost"]',
      // class fallbacks (will break when LinkedIn updates, but harmless as backup)
      '.feed-shared-update-v2',
      '.occludable-update',
      'li.profile-creator-shared-feed-update__container',
    ],
    // content/reactions/etc. selectors below are ONLY used as fallbacks inside
    // the smarter extractPosts() logic — prefer aria-label / dir / time attrs.
    content:   ['span[dir="ltr"]'],
    reactions: ['button[aria-label*="reaction" i]', 'button[aria-label*="like" i]'],
    comments:  ['button[aria-label*="comment" i]'],
    reposts:   ['button[aria-label*="repost" i]'],
    postUrl:   [
      'a[href*="/feed/update/"]',
      'a[href*="/posts/"]',
      'a[href*="urn:li:activity"]',
      'a[href*="/activity-"]',
    ],
    timestamp:  ['time[datetime]'],
    mediaImage: [
      '.update-components-image img',
      '.feed-shared-image img',
      'img[src*="media.licdn"]',
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
  // 1. Prefer data-urn / data-id — LinkedIn's own content identifier, very stable
  const urnAttr = container.getAttribute('data-urn')
    || container.getAttribute('data-id')
    || container.querySelector('[data-urn]')?.getAttribute('data-urn')
    || container.querySelector('[data-id]')?.getAttribute('data-id');

  if (urnAttr) {
    if (urnAttr.includes('urn:li:activity:')) {
      const id = urnAttr.match(/urn:li:activity:(\d+)/)?.[1];
      if (id) return `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`;
    }
    if (urnAttr.includes('ugcPost')) {
      const id = urnAttr.match(/ugcPost:(\d+)/)?.[1];
      if (id) return `https://www.linkedin.com/feed/update/urn:li:ugcPost:${id}/`;
    }
  }

  // 2. Find a link whose href matches LinkedIn post URL patterns
  for (const sel of SELECTORS.posts.postUrl) {
    try {
      const a = container.querySelector(sel);
      if (a?.href && a.href.includes('linkedin.com')) {
        const clean = a.href.split('?')[0];
        if (clean.length > 30) return clean;
      }
    } catch (_) {}
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
