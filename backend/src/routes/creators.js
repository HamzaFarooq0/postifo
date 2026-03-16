const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/creators - list all creators tracked by user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const tracked = await prisma.userTrackedCreator.findMany({
      where: { userId: req.userId },
      include: {
        creator: {
          include: {
            _count: { select: { posts: true } },
            posts: {
              orderBy: { scrapedAt: 'desc' },
              take: 1,
              select: { scrapedAt: true, reactions: true, comments: true }
            }
          }
        }
      },
      orderBy: { startedTrackingAt: 'desc' }
    });

    const creators = tracked.map(t => ({
      ...t.creator,
      trackedSince: t.startedTrackingAt,
      postCount: t.creator._count.posts,
      lastScraped: t.creator.posts[0]?.scrapedAt || null,
      latestReactions: t.creator.posts[0]?.reactions || 0,
      latestComments: t.creator.posts[0]?.comments || 0
    }));

    res.json(creators);
  } catch (err) {
    next(err);
  }
});

// POST /api/creators/sync-tracked — create UserTrackedCreator for every creator
// that has posts in the DB (catches creators whose tracking link was never written)
router.post('/sync-tracked', authenticate, async (req, res, next) => {
  try {
    const creators = await prisma.creator.findMany({
      where: { posts: { some: {} } },
      select: { id: true }
    });

    for (const creator of creators) {
      await prisma.userTrackedCreator.upsert({
        where: { userId_creatorId: { userId: req.userId, creatorId: creator.id } },
        update: {},
        create: { userId: req.userId, creatorId: creator.id }
      });
    }

    res.json({ synced: creators.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/creators/track - track a creator
router.post('/track', authenticate, async (req, res, next) => {
  try {
    const { linkedinUrl, name, headline, avatarUrl, linkedinId, followerCount } = req.body;
    if (!linkedinUrl || !name) {
      return res.status(400).json({ error: 'linkedinUrl and name are required' });
    }

    const creator = await prisma.creator.upsert({
      where: { linkedinUrl },
      update: { name, headline, avatarUrl, linkedinId, followerCount },
      create: { linkedinUrl, name, headline, avatarUrl, linkedinId, followerCount }
    });

    const tracking = await prisma.userTrackedCreator.upsert({
      where: { userId_creatorId: { userId: req.userId, creatorId: creator.id } },
      update: {},
      create: { userId: req.userId, creatorId: creator.id }
    }).catch(() => null); // non-fatal: sync-tracked on dashboard mount covers this

    res.status(201).json({ creator, tracking });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/creators/:id/untrack - stop tracking a creator
router.delete('/:id/untrack', authenticate, async (req, res, next) => {
  try {
    await prisma.userTrackedCreator.deleteMany({
      where: { userId: req.userId, creatorId: req.params.id }
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/creators/scrape-info?linkedinUrl=xxx — returns lastScrapedAt for incremental scraping
router.get('/scrape-info', authenticate, async (req, res, next) => {
  try {
    const { linkedinUrl } = req.query;
    if (!linkedinUrl) return res.json({ lastScrapedAt: null, postCount: 0 });

    const creator = await prisma.creator.findUnique({
      where: { linkedinUrl },
      select: { lastScrapedAt: true, totalPostsCollected: true }
    });

    res.json({
      lastScrapedAt: creator?.lastScrapedAt || null,
      postCount:     creator?.totalPostsCollected || 0
    });
  } catch (err) { next(err); }
});

// GET /api/creators/:id - get single creator with posts
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { sortBy = 'scrapedAt', order = 'desc', limit = '50', offset = '0' } = req.query;

    const validSorts = ['scrapedAt', 'reactions', 'comments', 'reposts', 'postedAt'];
    const sortField = validSorts.includes(sortBy) ? sortBy : 'scrapedAt';

    const creator = await prisma.creator.findUnique({
      where: { id: req.params.id },
      include: {
        posts: {
          orderBy: { [sortField]: order === 'asc' ? 'asc' : 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        },
        _count: { select: { posts: true } }
      }
    });

    if (!creator) return res.status(404).json({ error: 'Creator not found' });

    const isTracked = await prisma.userTrackedCreator.findUnique({
      where: { userId_creatorId: { userId: req.userId, creatorId: creator.id } }
    });
    if (!isTracked) return res.status(403).json({ error: 'Not tracking this creator' });

    res.json({ ...creator, postCount: creator._count.posts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
