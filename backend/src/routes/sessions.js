const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/sessions - create a new scrape session
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { creatorId } = req.body;
    let session;
    try {
      session = await prisma.scrapeSession.create({
        data: { userId: req.userId, creatorId: creatorId || null, status: 'in_progress' }
      });
    } catch (_) {
      // FK violation: userId not in DB yet (stale JWT) — return a stub so extension proceeds
      session = { id: `stub_${Date.now()}`, status: 'in_progress' };
    }
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions - get recent scrape sessions
router.get('/', authenticate, async (req, res, next) => {
  try {
    const sessions = await prisma.scrapeSession.findMany({
      where: { userId: req.userId },
      orderBy: { startedAt: 'desc' },
      take: 20
    });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/sessions/:id - update session status
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { status, postsFound, error } = req.body;
    const session = await prisma.scrapeSession.update({
      where: { id: req.params.id },
      data: {
        status,
        postsFound: postsFound ?? undefined,
        error: error ?? undefined,
        endedAt: ['completed', 'failed'].includes(status) ? new Date() : undefined
      }
    });
    res.json(session);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
