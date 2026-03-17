const express = require('express');
const prisma  = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/stats — global platform counts (visible to any logged-in user)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const [creators, posts, users] = await Promise.all([
      prisma.creator.count({ where: { posts: { some: {} } } }), // only creators with posts
      prisma.post.count(),
      prisma.user.count(),
    ]);
    res.json({ creators, posts, users });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
