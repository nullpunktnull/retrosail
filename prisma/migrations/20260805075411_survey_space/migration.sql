-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Survey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goal" TEXT NOT NULL,
    "creatorToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "space" TEXT NOT NULL DEFAULT 'TEAM',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Survey" ("createdAt", "creatorToken", "goal", "id", "sortOrder", "status", "updatedAt") SELECT "createdAt", "creatorToken", "goal", "id", "sortOrder", "status", "updatedAt" FROM "Survey";
DROP TABLE "Survey";
ALTER TABLE "new_Survey" RENAME TO "Survey";
CREATE INDEX "Survey_space_status_sortOrder_idx" ON "Survey"("space", "status", "sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
