const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/posts/bulk — upsert scraped posts (dedup on postUrl)
router.post('/bulk', authenticate, async (req, res, next) => {
  try {
    const { posts, creatorLinkedinUrl, profileData, sessionId } = req.body;
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'posts array is required' });
    }

    let creator = null;
    if (creatorLinkedinUrl) {
      creator = await prisma.creator.findUnique({ where: { linkedinUrl: creatorLinkedinUrl } });
      // Auto-create creator from profileData if not found (handles direct activity-page scrapes)
      if (!creator && profileData?.name) {
        creator = await prisma.creator.create({
          data: {
            linkedinUrl:   creatorLinkedinUrl,
            linkedinId:    profileData.linkedinId    || null,
            name:          profileData.name,
            headline:      profileData.headline      || null,
            avatarUrl:     profileData.avatarUrl     || null,
            followerCount: profileData.followerCount ? parseInt(profileData.followerCount) : null,
          }
        });
      }
      if (!creator) return res.status(404).json({ error: 'Creator not found. Track creator first.' });
    }

    const results = { upserted: 0, errors: 0, details: [] };

    for (const post of posts) {
      if (!post.postUrl) { results.errors++; continue; }
      try {
        const data = {
          postUrl:    post.postUrl,
          creatorId:  post.creatorId || creator?.id,
          content:    post.content   || null,
          reactions:  parseInt(post.reactions)  || 0,
          comments:   parseInt(post.comments)   || 0,
          reposts:    parseInt(post.reposts)     || 0,
          impressions: post.impressions ? parseInt(post.impressions) : null,
          postType:   post.postType   || 'text',
          mediaUrl:   post.mediaUrl   || null,
          rawDateString: post.rawDateString || null,
          postedAt:   post.postedAt ? new Date(post.postedAt) : null,
          sessionId:  sessionId || null,
        };
        if (!data.creatorId) { results.errors++; continue; }

        // Content-based dedup: same creator + same first 150 chars = same post
        // under a different activity ID (LinkedIn re-surfaces posts this way)
        if (data.content && data.content.length > 80 && data.creatorId) {
          const snippet = data.content.substring(0, 150);
          const dupe = await prisma.post.findFirst({
            where: { creatorId: data.creatorId, content: { startsWith: snippet.substring(0, 100) } },
            select: { id: true, postUrl: true, reactions: true },
          });
          if (dupe && dupe.postUrl !== data.postUrl) {
            // Keep the one with higher reactions; just update stats if incoming is better
            if (data.reactions > dupe.reactions) {
              await prisma.post.update({
                where: { id: dupe.id },
                data: { reactions: data.reactions, comments: data.comments, reposts: data.reposts },
              });
            }
            results.upserted++;
            continue;
          }
        }

        await prisma.post.upsert({
          where:  { postUrl: post.postUrl },
          update: {
            reactions: data.reactions,
            comments:  data.comments,
            reposts:   data.reposts,
            impressions: data.impressions,
            content:   data.content,
          },
          create: data,
        });
        results.upserted++;
        results.details.push({ postUrl: post.postUrl, status: 'ok' });
      } catch (e) {
        results.errors++;
        results.details.push({ postUrl: post.postUrl, status: 'error', message: e.message });
      }
    }

    // Update session
    if (sessionId) {
      await prisma.scrapeSession.update({
        where: { id: sessionId },
        data: { postsFound: results.upserted, status: 'completed', endedAt: new Date() },
      }).catch(() => {});
    }

    // Update creator post count + lastScrapedAt + auto-track for this user
    if (creator) {
      const count = await prisma.post.count({ where: { creatorId: creator.id } });
      await prisma.creator.update({
        where: { id: creator.id },
        data: { totalPostsCollected: count, lastScrapedAt: new Date() },
      });
      await prisma.userTrackedCreator.upsert({
        where: { userId_creatorId: { userId: req.userId, creatorId: creator.id } },
        update: {},
        create: { userId: req.userId, creatorId: creator.id },
      }).catch(() => {}); // non-fatal: sync-tracked on dashboard mount covers this
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/posts — posts for user's tracked creators
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      sortBy = 'scrapedAt', order = 'desc',
      limit = '50', offset = '0',
      search, postType, minReactions,
    } = req.query;

    const validSorts = ['scrapedAt', 'reactions', 'comments', 'reposts', 'postedAt', 'lastUpdatedAt'];
    const sortField = validSorts.includes(sortBy) ? sortBy : 'scrapedAt';

    const tracked = await prisma.userTrackedCreator.findMany({
      where: { userId: req.userId },
      select: { creatorId: true },
    });
    const creatorIds = tracked.map(t => t.creatorId);

    const where = { creatorId: { in: creatorIds } };
    if (search)       where.content     = { contains: search };
    if (postType && postType !== 'all') where.postType = postType;
    if (minReactions) where.reactions   = { gte: parseInt(minReactions) };

    const posts = await prisma.post.findMany({
      where,
      orderBy: { [sortField]: order === 'asc' ? 'asc' : 'desc' },
      take:    parseInt(limit),
      skip:    parseInt(offset),
      include: { creator: { select: { id: true, name: true, avatarUrl: true, linkedinUrl: true } } },
    });

    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:creatorId/top — top 10 posts
router.get('/:creatorId/top', authenticate, async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where:   { creatorId: req.params.creatorId },
      orderBy: { reactions: 'desc' },
      take:    10,
    });
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
