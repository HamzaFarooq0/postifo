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

// GET /api/creators/search?q=xxx — search all creators in the DB by name/headline
// Uses LOWER() for case-insensitive search that works on both SQLite and PostgreSQL
router.get('/search', authenticate, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    const pattern = `%${q.toLowerCase()}%`;

    // $queryRaw with LOWER() is universally case-insensitive (SQLite + PostgreSQL)
    const rows = await prisma.$queryRaw`
      SELECT id FROM creators
      WHERE EXISTS (SELECT 1 FROM posts WHERE "creatorId" = creators.id)
        AND (
          LOWER(name)                    LIKE ${pattern}
          OR LOWER(COALESCE(headline,'')) LIKE ${pattern}
        )
      ORDER BY "totalPostsCollected" DESC
      LIMIT 12
    `;

    const matchingIds = rows.map(r => r.id);
    if (matchingIds.length === 0) return res.json([]);

    // Fetch full details for matched creators via ORM
    const creators = await prisma.creator.findMany({
      where: { id: { in: matchingIds } },
      include: {
        _count: { select: { posts: true, trackedBy: true } },
        posts:  { orderBy: { scrapedAt: 'desc' }, take: 1, select: { scrapedAt: true } },
      },
    });

    // Check which ones the requesting user already tracks
    const trackedSet = new Set(
      (await prisma.userTrackedCreator.findMany({
        where: { userId: req.userId, creatorId: { in: matchingIds } },
        select: { creatorId: true },
      })).map(t => t.creatorId)
    );

    // Preserve the ORDER BY totalPostsCollected ordering from the raw query
    const byId = new Map(creators.map(c => [c.id, c]));
    res.json(
      matchingIds
        .map(id => {
          const c = byId.get(id);
          if (!c) return null;
          return {
            id:            c.id,
            name:          c.name,
            headline:      c.headline,
            avatarUrl:     c.avatarUrl,
            linkedinUrl:   c.linkedinUrl,
            followerCount: c.followerCount,
            postCount:     c._count.posts,
            trackerCount:  c._count.trackedBy,
            lastScrapedAt: c.posts[0]?.scrapedAt || c.lastScrapedAt,
            isTracked:     trackedSet.has(c.id),
          };
        })
        .filter(Boolean)
    );
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

// GET /api/creators/:id - get single creator with posts (open to all logged-in users)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { sortBy = 'scrapedAt', order = 'desc', limit = '50', offset = '0' } = req.query;

    const validSorts = ['scrapedAt', 'reactions', 'comments', 'reposts', 'postedAt'];
    const sortField = validSorts.includes(sortBy) ? sortBy : 'scrapedAt';

    const [creator, tracking] = await Promise.all([
      prisma.creator.findUnique({
        where: { id: req.params.id },
        include: {
          posts: {
            orderBy: { [sortField]: order === 'asc' ? 'asc' : 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
          },
          _count: { select: { posts: true } },
        },
      }),
      prisma.userTrackedCreator.findUnique({
        where: { userId_creatorId: { userId: req.userId, creatorId: req.params.id } },
      }),
    ]);

    if (!creator) return res.status(404).json({ error: 'Creator not found' });

    res.json({ ...creator, postCount: creator._count.posts, isTracked: !!tracking });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
