const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function toCSV(rows, headers) {
  const escape = v => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
  };
  const header = headers.map(h => escape(h.label)).join(',');
  const body   = rows.map(r => headers.map(h => escape(r[h.key])).join(',')).join('\n');
  return header + '\n' + body;
}

// GET /api/export/:creatorId/csv
router.get('/:creatorId/csv', authenticate, async (req, res, next) => {
  try {
    // Verify tracking
    const tracked = await prisma.userTrackedCreator.findUnique({
      where: { userId_creatorId: { userId: req.userId, creatorId: req.params.creatorId } },
    });
    if (!tracked) return res.status(403).json({ error: 'Not tracking this creator' });

    const creator = await prisma.creator.findUnique({ where: { id: req.params.creatorId } });
    const posts   = await prisma.post.findMany({
      where:   { creatorId: req.params.creatorId },
      orderBy: { reactions: 'desc' },
    });

    const headers = [
      { key: 'postUrl',   label: 'Post URL'    },
      { key: 'postType',  label: 'Type'        },
      { key: 'reactions', label: 'Reactions'   },
      { key: 'comments',  label: 'Comments'    },
      { key: 'reposts',   label: 'Reposts'     },
      { key: 'postedAt',  label: 'Posted At'   },
      { key: 'content',   label: 'Content'     },
    ];

    const csv = toCSV(posts, headers);
    const filename = `postifo-${creator?.name?.replace(/\s+/g, '-') || req.params.creatorId}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /api/export/saved/csv
router.get('/saved/csv', authenticate, async (req, res, next) => {
  try {
    const saved = await prisma.savedPost.findMany({
      where: { userId: req.userId },
      include: {
        post: { include: { creator: { select: { name: true } } } },
      },
      orderBy: { savedAt: 'desc' },
    });

    const rows = saved.map(s => ({
      creatorName: s.post.creator?.name || '',
      postType:    s.post.postType,
      reactions:   s.post.reactions,
      comments:    s.post.comments,
      postUrl:     s.post.postUrl,
      postedAt:    s.post.postedAt,
      savedAt:     s.savedAt,
      notes:       s.notes,
      content:     s.post.content,
    }));

    const headers = [
      { key: 'creatorName', label: 'Creator'    },
      { key: 'postType',    label: 'Type'       },
      { key: 'reactions',   label: 'Reactions'  },
      { key: 'comments',    label: 'Comments'   },
      { key: 'postUrl',     label: 'Post URL'   },
      { key: 'postedAt',    label: 'Posted At'  },
      { key: 'savedAt',     label: 'Saved At'   },
      { key: 'notes',       label: 'Notes'      },
      { key: 'content',     label: 'Content'    },
    ];

    const csv = toCSV(rows, headers);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="postifo-saved-posts.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
