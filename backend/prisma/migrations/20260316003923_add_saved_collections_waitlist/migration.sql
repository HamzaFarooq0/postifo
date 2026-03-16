/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `scrape_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_tracked_creators` table. All the data in the column will be lost.
  - Added the required column `lastUpdatedAt` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "saved_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "notes" TEXT,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "saved_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '📁',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "collections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collection_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "collection_posts_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collection_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waitlist_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_creators" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "linkedinUrl" TEXT NOT NULL,
    "linkedinId" TEXT,
    "name" TEXT NOT NULL,
    "headline" TEXT,
    "avatarUrl" TEXT,
    "followerCount" INTEGER,
    "connectionCount" INTEGER,
    "lastScrapedAt" DATETIME,
    "totalPostsCollected" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_creators" ("avatarUrl", "connectionCount", "createdAt", "followerCount", "headline", "id", "linkedinId", "linkedinUrl", "name", "updatedAt") SELECT "avatarUrl", "connectionCount", "createdAt", "followerCount", "headline", "id", "linkedinId", "linkedinUrl", "name", "updatedAt" FROM "creators";
DROP TABLE "creators";
ALTER TABLE "new_creators" RENAME TO "creators";
CREATE UNIQUE INDEX "creators_linkedinUrl_key" ON "creators"("linkedinUrl");
CREATE UNIQUE INDEX "creators_linkedinId_key" ON "creators"("linkedinId");
CREATE TABLE "new_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postUrl" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "content" TEXT,
    "reactions" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER,
    "postType" TEXT,
    "mediaUrl" TEXT,
    "rawDateString" TEXT,
    "postedAt" DATETIME,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL,
    "sessionId" TEXT,
    CONSTRAINT "posts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "posts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "scrape_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_posts" ("comments", "content", "creatorId", "id", "impressions", "mediaUrl", "postType", "postUrl", "postedAt", "reactions", "reposts", "scrapedAt", "sessionId") SELECT "comments", "content", "creatorId", "id", "impressions", "mediaUrl", "postType", "postUrl", "postedAt", "reactions", "reposts", "scrapedAt", "sessionId" FROM "posts";
DROP TABLE "posts";
ALTER TABLE "new_posts" RENAME TO "posts";
CREATE UNIQUE INDEX "posts_postUrl_key" ON "posts"("postUrl");
CREATE TABLE "new_scrape_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "postsFound" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "scrape_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_scrape_sessions" ("creatorId", "error", "id", "postsFound", "startedAt", "status", "userId") SELECT "creatorId", "error", "id", "postsFound", "startedAt", "status", "userId" FROM "scrape_sessions";
DROP TABLE "scrape_sessions";
ALTER TABLE "new_scrape_sessions" RENAME TO "scrape_sessions";
CREATE TABLE "new_user_tracked_creators" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "startedTrackingAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_tracked_creators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_tracked_creators_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_tracked_creators" ("creatorId", "id", "userId") SELECT "creatorId", "id", "userId" FROM "user_tracked_creators";
DROP TABLE "user_tracked_creators";
ALTER TABLE "new_user_tracked_creators" RENAME TO "user_tracked_creators";
CREATE UNIQUE INDEX "user_tracked_creators_userId_creatorId_key" ON "user_tracked_creators"("userId", "creatorId");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("createdAt", "email", "id", "name", "password", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "saved_posts_userId_postId_key" ON "saved_posts"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_posts_collectionId_postId_key" ON "collection_posts"("collectionId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_email_feature_key" ON "waitlist_entries"("email", "feature");
