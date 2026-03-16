const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/:creatorId
router.get('/:creatorId', authenticate, async (req, res, next) => {
  try {
    const { creatorId } = req.params;

    // Verify user tracks this creator
    const tracked = await prisma.userTrackedCreator.findUnique({
      where: { userId_creatorId: { userId: req.userId, creatorId } },
    });
    if (!tracked) return res.status(403).json({ error: 'Not tracking this creator' });

    const posts = await prisma.post.findMany({
      where: { creatorId },
      orderBy: { postedAt: 'asc' },
    });

    if (posts.length === 0) {
      return res.json({
        totalPosts: 0, avgReactions: 0, avgComments: 0,
        topPostType: null, postingFrequency: 0,
        bestPostingDay: null, engagementOverTime: [],
        hookAnalysis: [],
      });
    }

    const totalPosts    = posts.length;
    const totalReactions = posts.reduce((s, p) => s + p.reactions, 0);
    const totalComments  = posts.reduce((s, p) => s + p.comments,  0);
    const avgReactions   = Math.round(totalReactions / totalPosts);
    const avgComments    = Math.round(totalComments  / totalPosts);

    // Top post type by avg engagement
    const byType = {};
    for (const p of posts) {
      const t = p.postType || 'other';
      if (!byType[t]) byType[t] = { sum: 0, count: 0 };
      byType[t].sum   += p.reactions;
      byType[t].count += 1;
    }
    const topPostType = Object.entries(byType)
      .map(([type, { sum, count }]) => ({ type, avg: Math.round(sum / count) }))
      .sort((a, b) => b.avg - a.avg)[0]?.type || null;

    // Posting frequency (posts per week)
    const postsWithDate = posts.filter(p => p.postedAt);
    let postingFrequency = 0;
    if (postsWithDate.length >= 2) {
      const oldest = new Date(postsWithDate[0].postedAt).getTime();
      const newest = new Date(postsWithDate[postsWithDate.length - 1].postedAt).getTime();
      const weeks  = (newest - oldest) / (1000 * 60 * 60 * 24 * 7);
      postingFrequency = weeks > 0 ? +(postsWithDate.length / weeks).toFixed(1) : 0;
    }

    // Best posting day
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayMap = {};
    for (const p of postsWithDate) {
      const day = new Date(p.postedAt).getDay();
      if (!dayMap[day]) dayMap[day] = { sum: 0, count: 0 };
      dayMap[day].sum   += p.reactions;
      dayMap[day].count += 1;
    }
    const bestDay = Object.entries(dayMap)
      .map(([d, { sum, count }]) => ({ day: days[+d], avg: Math.round(sum / count) }))
      .sort((a, b) => b.avg - a.avg)[0]?.day || null;

    // Engagement over time — weekly averages
    const weekMap = {};
    for (const p of postsWithDate) {
      const d = new Date(p.postedAt);
      // ISO week key
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const week = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
      const key  = `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
      if (!weekMap[key]) weekMap[key] = { reactions: 0, comments: 0, count: 0, week: key };
      weekMap[key].reactions += p.reactions;
      weekMap[key].comments  += p.comments;
      weekMap[key].count     += 1;
    }
    const engagementOverTime = Object.values(weekMap)
      .sort((a, b) => a.week.localeCompare(b.week))
      .map(w => ({
        week:      w.week,
        reactions: Math.round(w.reactions / w.count),
        comments:  Math.round(w.comments  / w.count),
        posts:     w.count,
      }));

    // Hook analysis — first sentence from top-performing posts
    const topPosts = [...posts]
      .filter(p => p.content && p.content.trim().length > 20)
      .sort((a, b) => b.reactions - a.reactions)
      .slice(0, 10);

    const hookAnalysis = topPosts.map(p => ({
      hook:      p.content.split(/\n|\.{1}(?!\d)/)[0].trim().slice(0, 200),
      reactions: p.reactions,
      postType:  p.postType,
      postUrl:   p.postUrl,
    }));

    res.json({
      totalPosts,
      avgReactions,
      avgComments,
      topPostType,
      postingFrequency,
      bestPostingDay: bestDay,
      engagementOverTime,
      hookAnalysis,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
