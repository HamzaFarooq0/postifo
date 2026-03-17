#!/usr/bin/env node
/**
 * push-to-prod.js
 * ───────────────
 * Migrates all locally scraped creator & post data to the live Railway API.
 * Reads from local SQLite, pushes via HTTP — no direct DB connection needed.
 *
 * Usage:
 *   PROD_URL=https://your-app.railway.app \
 *   PROD_EMAIL=you@example.com \
 *   PROD_PASSWORD=yourpassword \
 *   node scripts/push-to-prod.js
 */

const { PrismaClient } = require('@prisma/client')

const PROD_URL  = (process.env.PROD_URL  || '').replace(/\/$/, '')
const EMAIL     = process.env.PROD_EMAIL
const PASSWORD  = process.env.PROD_PASSWORD
const BATCH     = 50   // posts per API call
const DELAY_MS  = 400  // ms between batches (avoid rate-limiting)

// ── Validate args ─────────────────────────────────────────────────────────────
if (!PROD_URL || !EMAIL || !PASSWORD) {
  console.error(`
Usage:
  PROD_URL=https://your-app.railway.app \\
  PROD_EMAIL=you@example.com \\
  PROD_PASSWORD=yourpassword \\
  node scripts/push-to-prod.js
  `)
  process.exit(1)
}

const prisma = new PrismaClient()
const sleep  = ms => new Promise(r => setTimeout(r, ms))

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════')
  console.log('  Postifo → Production Migration Script')
  console.log('══════════════════════════════════════════')
  console.log(`  Target: ${PROD_URL}\n`)

  // 1. Authenticate ────────────────────────────────────────────────────────────
  process.stdout.write('🔐 Authenticating... ')
  const loginRes = await fetch(`${PROD_URL}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })

  if (!loginRes.ok) {
    const err = await loginRes.json().catch(() => ({}))
    console.error(`\n❌ Auth failed: ${err.error || loginRes.statusText}`)
    console.error('   Make sure your account exists on the production server.')
    process.exit(1)
  }

  const { token } = await loginRes.json()
  console.log('✅')

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }

  // 2. Read local data ─────────────────────────────────────────────────────────
  process.stdout.write('📂 Reading local database... ')
  const creators = await prisma.creator.findMany({
    include: {
      posts: {
        select: {
          postUrl:       true,
          content:       true,
          reactions:     true,
          comments:      true,
          reposts:       true,
          impressions:   true,
          postType:      true,
          mediaUrl:      true,
          rawDateString: true,
          postedAt:      true,
        },
        orderBy: { scrapedAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  const totalPosts = creators.reduce((s, c) => s + c.posts.length, 0)
  console.log(`✅  ${creators.length} creators · ${totalPosts} posts\n`)

  // 3. Push each creator + their posts ─────────────────────────────────────────
  let okCreators = 0, okPosts = 0, errCount = 0

  for (let ci = 0; ci < creators.length; ci++) {
    const creator = creators[ci]
    const prefix  = `[${ci + 1}/${creators.length}]`

    if (!creator.linkedinUrl || !creator.name) {
      console.log(`${prefix} ⚠  Skipping (missing linkedinUrl or name): ${creator.id}`)
      continue
    }

    // Track / upsert creator on production
    process.stdout.write(`${prefix} 👤  ${creator.name} ... `)

    const trackRes = await fetch(`${PROD_URL}/api/creators/track`, {
      method:  'POST',
      headers,
      body: JSON.stringify({
        linkedinUrl:   creator.linkedinUrl,
        name:          creator.name,
        headline:      creator.headline      || null,
        avatarUrl:     creator.avatarUrl     || null,
        linkedinId:    creator.linkedinId    || null,
        followerCount: creator.followerCount || null,
      }),
    })

    if (!trackRes.ok) {
      const e = await trackRes.json().catch(() => ({}))
      console.log(`❌ track failed — ${e.error || trackRes.statusText}`)
      errCount++
      continue
    }

    okCreators++
    console.log(`tracked ✓  (${creator.posts.length} posts to push)`)

    if (creator.posts.length === 0) continue

    // Push posts in batches
    let pushed = 0
    for (let i = 0; i < creator.posts.length; i += BATCH) {
      const batch = creator.posts.slice(i, i + BATCH)

      const bulkRes = await fetch(`${PROD_URL}/api/posts/bulk`, {
        method:  'POST',
        headers,
        body: JSON.stringify({
          creatorLinkedinUrl: creator.linkedinUrl,
          posts: batch,
        }),
      })

      if (!bulkRes.ok) {
        const e = await bulkRes.json().catch(() => ({}))
        console.log(`   ❌ batch ${Math.floor(i / BATCH) + 1} failed — ${e.error || bulkRes.statusText}`)
        errCount++
      } else {
        const r = await bulkRes.json()
        pushed += r.upserted || batch.length
        process.stdout.write(`   ↑ batch ${Math.floor(i / BATCH) + 1}: ${pushed} posts pushed\r`)
      }

      await sleep(DELAY_MS)
    }

    okPosts += pushed
    console.log(`   ✅ ${pushed}/${creator.posts.length} posts pushed${' '.repeat(20)}`)
  }

  // 4. Summary ─────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════')
  console.log('  Migration complete!')
  console.log(`  Creators pushed : ${okCreators} / ${creators.length}`)
  console.log(`  Posts pushed    : ${okPosts} / ${totalPosts}`)
  if (errCount > 0) console.log(`  Errors          : ${errCount}`)
  console.log('══════════════════════════════════════════\n')
}

main()
  .catch(e => {
    console.error('\n💥 Fatal error:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
