const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/saved-posts
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { collectionId, limit = '50', offset = '0' } = req.query;
    const where = { userId: req.userId };
    if (collectionId) {
      // Get posts in a specific collection
      const collPosts = await prisma.collectionPost.findMany({
        where: { collectionId },
        include: {
          post: { include: { creator: { select: { id: true, name: true, avatarUrl: true } } } },
        },
        take: parseInt(limit),
        skip: parseInt(offset),
      });
      return res.json(collPosts.map(cp => ({ ...cp.post, savedAt: cp.addedAt })));
    }
    const saved = await prisma.savedPost.findMany({
      where,
      orderBy: { savedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        post: { include: { creator: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });
    res.json(saved.map(s => ({ ...s.post, savedAt: s.savedAt, notes: s.notes })));
  } catch (err) {
    next(err);
  }
});

// POST /api/saved-posts
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { postId, notes } = req.body;
    if (!postId) return res.status(400).json({ error: 'postId is required' });
    const saved = await prisma.savedPost.upsert({
      where: { userId_postId: { userId: req.userId, postId } },
      update: { notes: notes || null },
      create: { userId: req.userId, postId, notes: notes || null },
    });
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/saved-posts/:postId
router.delete('/:postId', authenticate, async (req, res, next) => {
  try {
    await prisma.savedPost.deleteMany({
      where: { userId: req.userId, postId: req.params.postId },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/saved-posts/ids — just the post IDs saved by user (for "is saved" UI state)
router.get('/ids', authenticate, async (req, res, next) => {
  try {
    const saved = await prisma.savedPost.findMany({
      where: { userId: req.userId },
      select: { postId: true },
    });
    res.json(saved.map(s => s.postId));
  } catch (err) {
    next(err);
  }
});

// ─── Collections ─────────────────────────────────────────────────────────────

// GET /api/saved-posts/collections
router.get('/collections', authenticate, async (req, res, next) => {
  try {
    const cols = await prisma.collection.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    res.json(cols.map(c => ({ ...c, postCount: c._count.posts })));
  } catch (err) {
    next(err);
  }
});

// POST /api/saved-posts/collections
router.post('/collections', authenticate, async (req, res, next) => {
  try {
    const { name, description, emoji } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const col = await prisma.collection.create({
      data: { userId: req.userId, name, description, emoji: emoji || '📁' },
    });
    res.status(201).json(col);
  } catch (err) {
    next(err);
  }
});

// POST /api/saved-posts/collections/:id/posts — add post to collection
router.post('/collections/:id/posts', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ error: 'postId is required' });
    const cp = await prisma.collectionPost.upsert({
      where: { collectionId_postId: { collectionId: req.params.id, postId } },
      update: {},
      create: { collectionId: req.params.id, postId },
    });
    res.status(201).json(cp);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/saved-posts/collections/:id
router.delete('/collections/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.collection.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
