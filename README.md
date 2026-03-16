# LinkedLens – LinkedIn Creator Analytics

Track and analyze LinkedIn creator posts from a Chrome Extension, synced to a central dashboard.

## Architecture

```
App/
├── backend/          # Node.js + Express + Prisma + PostgreSQL
├── dashboard/        # React + Vite + Tailwind CSS
└── extension/        # Chrome Extension (Manifest V3)
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Google Chrome

### 1. Configure the database

Edit `backend/.env`:
```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/linkedlens"
JWT_SECRET="your-secret-key"
```

### 2. Run setup

```bash
chmod +x setup.sh && ./setup.sh
```

Or manually:

```bash
# Backend
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate

# Dashboard
cd dashboard
npm install
```

### 3. Start servers

**Terminal 1 – Backend API:**
```bash
cd backend && npm run dev
# → http://localhost:3001
```

**Terminal 2 – Dashboard:**
```bash
cd dashboard && npm run dev
# → http://localhost:5173
```

### 4. Install Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder

## Usage

1. Open the dashboard at `http://localhost:5173`
2. Register an account
3. Click the LinkedLens extension icon and sign in with the same credentials
4. Navigate to any LinkedIn creator's profile (`linkedin.com/in/username`)
5. Click the floating **Track Creator** button
6. The extension scrolls & scrapes posts, then syncs to the backend
7. View analytics in the dashboard

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/creators` | List tracked creators |
| POST | `/api/creators/track` | Track a creator |
| DELETE | `/api/creators/:id/untrack` | Untrack creator |
| GET | `/api/creators/:id` | Creator + posts (sortable) |
| POST | `/api/posts/bulk` | Bulk upsert posts |
| GET | `/api/posts` | List posts across creators |
| POST | `/api/sessions` | Create scrape session |
| GET | `/api/sessions` | List sessions |

## Database Schema

- **users** – Auth accounts
- **creators** – LinkedIn creator profiles
- **posts** – Individual posts with engagement metrics (deduplicated on `post_url`)
- **user_tracked_creators** – Many-to-many: which user tracks which creator
- **scrape_sessions** – Audit log of scrape jobs

## Extension Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome extension config (Manifest V3) |
| `src/content.js` | Injected into LinkedIn pages; adds Track button |
| `src/selectors.js` | DOM selectors with fallbacks for LinkedIn's changing HTML |
| `src/content.css` | Styles for injected UI |
| `src/background.js` | Service worker; syncs queue to backend every 5 min |
| `popup/popup.html` | Extension popup UI |
| `popup/popup.js` | Popup logic (login, status, manual sync) |
