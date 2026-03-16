require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const authRoutes      = require('./routes/auth');
const creatorRoutes   = require('./routes/creators');
const postRoutes      = require('./routes/posts');
const sessionRoutes   = require('./routes/sessions');
const analyticsRoutes = require('./routes/analytics');
const libraryRoutes   = require('./routes/library');
const savedPostRoutes = require('./routes/savedPosts');
const exportRoutes    = require('./routes/export');
const syncRoutes      = require('./routes/sync');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];
    if (allowed.includes(origin) || origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  name: 'Postifo API',
  status: 'running',
  version: '2.0.0',
  endpoints: [
    '/api/auth', '/api/creators', '/api/posts',
    '/api/analytics', '/api/library', '/api/saved-posts',
    '/api/export', '/api/sync', '/api/sessions',
  ],
}));

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/creators',    creatorRoutes);
app.use('/api/posts',       postRoutes);
app.use('/api/sessions',    sessionRoutes);
app.use('/api/analytics',   analyticsRoutes);
app.use('/api/library',     libraryRoutes);
app.use('/api/saved-posts', savedPostRoutes);
app.use('/api/export',      exportRoutes);
app.use('/api/sync',        syncRoutes);

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`Postifo API v2 → http://localhost:${PORT}`);
});
