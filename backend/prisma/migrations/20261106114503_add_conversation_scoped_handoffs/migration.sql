/*
  Warnings:

  - Added the required column `conversationId` to the `HandoffRequest` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HandoffRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_staff',
    "details" TEXT NOT NULL,
    "messageIds" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_HandoffRequest" ("createdAt", "details", "id", "messageIds", "patientId", "status", "type", "updatedAt") SELECT "createdAt", "details", "id", "messageIds", "patientId", "status", "type", "updatedAt" FROM "HandoffRequest";
DROP TABLE "HandoffRequest";
ALTER TABLE "new_HandoffRequest" RENAME TO "HandoffRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
