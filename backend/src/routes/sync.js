const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/sync/creators — list creators already in DB (extension uses this to skip re-scraping)
router.get('/creators', authenticate, async (req, res, next) => {
  try {
    const tracked = await prisma.userTrackedCreator.findMany({
      where: { userId: req.userId },
      include: {
        creator: {
          select: { id: true, linkedinUrl: true, linkedinId: true, lastScrapedAt: true, totalPostsCollected: true },
        },
      },
    });
    res.json(tracked.map(t => t.creator));
  } catch (err) {
    next(err);
  }
});

// GET /api/sync/posts/:creatorId/latest — most recent post date for a creator
router.get('/posts/:creatorId/latest', authenticate, async (req, res, next) => {
  try {
    const latest = await prisma.post.findFirst({
      where:   { creatorId: req.params.creatorId },
      orderBy: { postedAt: 'desc' },
      select:  { postedAt: true, scrapedAt: true },
    });
    res.json({ latestPostedAt: latest?.postedAt || null, latestScrapedAt: latest?.scrapedAt || null });
  } catch (err) {
    next(err);
  }
});

// POST /api/sync/waitlist — join a coming-soon feature waitlist
router.post('/waitlist', authenticate, async (req, res, next) => {
  try {
    const { email, feature } = req.body;
    if (!email || !feature) return res.status(400).json({ error: 'email and feature required' });
    const entry = await prisma.waitlistEntry.upsert({
      where: { email_feature: { email, feature } },
      update: {},
      create: { email, feature, userId: req.userId },
    });
    res.status(201).json({ success: true, entry });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
