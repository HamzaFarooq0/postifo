#!/bin/bash
set -e

echo "========================================="
echo "  LinkedLens Setup Script"
echo "========================================="

# ── Backend ──────────────────────────────────
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install

echo ""
echo "🗄️  Setting up database..."
echo "Make sure PostgreSQL is running and the DATABASE_URL in backend/.env is correct."
echo ""
read -p "Press Enter to run Prisma migrations (or Ctrl+C to skip)..."
npx prisma migrate dev --name init
npx prisma generate

cd ..

# ── Dashboard ────────────────────────────────
echo ""
echo "📦 Installing dashboard dependencies..."
cd dashboard
npm install
cd ..

echo ""
echo "========================================="
echo "  ✅ Setup complete!"
echo "========================================="
echo ""
echo "To start the app:"
echo ""
echo "  Terminal 1 – Backend:"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 – Dashboard:"
echo "    cd dashboard && npm run dev"
echo ""
echo "  Chrome Extension:"
echo "    1. Open chrome://extensions"
echo "    2. Enable 'Developer mode'"
echo "    3. Click 'Load unpacked'"
echo "    4. Select the 'extension' folder"
echo ""
echo "  Dashboard: http://localhost:5173"
echo "  API:       http://localhost:3001"
echo ""
