const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/library — all posts across all creators (viral library)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      sortBy = 'reactions', order = 'desc',
      limit = '20', offset = '0',
      postType, minReactions, search,
      dateFrom, dateTo,
    } = req.query;

    const validSorts = ['reactions', 'comments', 'scrapedAt', 'postedAt'];
    const sortField = validSorts.includes(sortBy) ? sortBy : 'reactions';

    const where = {};
    if (postType && postType !== 'all') where.postType = postType;
    if (minReactions) where.reactions = { gte: parseInt(minReactions) };
    if (search)  where.content = { contains: search };
    if (dateFrom || dateTo) {
      where.postedAt = {};
      if (dateFrom) where.postedAt.gte = new Date(dateFrom);
      if (dateTo)   where.postedAt.lte = new Date(dateTo);
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { [sortField]: order === 'asc' ? 'asc' : 'desc' },
        take:    parseInt(limit),
        skip:    parseInt(offset),
        include: { creator: { select: { id: true, name: true, avatarUrl: true, linkedinUrl: true } } },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ posts, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/library/stats — global stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const [totalPosts, totalCreators, recentCount] = await Promise.all([
      prisma.post.count(),
      prisma.creator.count(),
      prisma.post.count({
        where: { scrapedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
    ]);

    // Trending: top posts from last 7 days
    const trending = await prisma.post.findMany({
      where: { scrapedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      orderBy: { reactions: 'desc' },
      take: 5,
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });

    res.json({ totalPosts, totalCreators, postsThisWeek: recentCount, trending });
  } catch (err) {
    next(err);
  }
});

// GET /api/library/hooks — hook library (first lines from top posts)
router.get('/hooks', authenticate, async (req, res, next) => {
  try {
    const { minReactions = '100', limit = '20', offset = '0', postType } = req.query;

    const where = {
      reactions: { gte: parseInt(minReactions) },
      content:   { not: null },
    };
    if (postType && postType !== 'all') where.postType = postType;

    const posts = await prisma.post.findMany({
      where,
      orderBy: { reactions: 'desc' },
      take:    parseInt(limit),
      skip:    parseInt(offset),
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    });

    const hooks = posts
      .filter(p => p.content && p.content.trim().length > 20)
      .map(p => ({
        id:        p.id,
        hook:      p.content.split(/\n/)[0].trim().slice(0, 280),
        reactions: p.reactions,
        comments:  p.comments,
        postType:  p.postType,
        postUrl:   p.postUrl,
        postedAt:  p.postedAt,
        creator:   p.creator,
      }));

    res.json(hooks);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
