/*
  Warnings:

  - You are about to drop the column `newStockReceived` on the `DailyReport` table. All the data in the column will be lost.
  - You are about to drop the column `stockOnHand` on the `DailyReport` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "StockEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyReportId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVariant" TEXT,
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "newStockReceived" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "StockEntry_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "DailyReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerFatherName" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVariant" TEXT,
    "totalAmount" REAL NOT NULL,
    "downPayment" REAL NOT NULL,
    "financeAmount" REAL NOT NULL,
    "financer" TEXT NOT NULL,
    "aadhaarImagePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaleReport_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "branchId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "vehiclesSold" INTEGER NOT NULL DEFAULT 0,
    "salesValue" REAL NOT NULL DEFAULT 0,
    "bookings" INTEGER NOT NULL DEFAULT 0,
    "pendingDeliveries" INTEGER NOT NULL DEFAULT 0,
    "testDrives" INTEGER NOT NULL DEFAULT 0,
    "serviceJobs" INTEGER NOT NULL DEFAULT 0,
    "serviceRevenue" REAL NOT NULL DEFAULT 0,
    "cashCollected" REAL NOT NULL DEFAULT 0,
    "pendingPayments" REAL NOT NULL DEFAULT 0,
    "staffPresent" INTEGER NOT NULL DEFAULT 0,
    "customerComplaints" INTEGER NOT NULL DEFAULT 0,
    "highlights" TEXT,
    "issues" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewedAt" DATETIME,
    "adminComment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyReport_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DailyReport" ("adminComment", "bookings", "branchId", "cashCollected", "createdAt", "customerComplaints", "date", "highlights", "id", "issues", "notes", "pendingDeliveries", "pendingPayments", "reviewedAt", "salesValue", "serviceJobs", "serviceRevenue", "staffPresent", "status", "submittedById", "testDrives", "updatedAt", "vehiclesSold") SELECT "adminComment", "bookings", "branchId", "cashCollected", "createdAt", "customerComplaints", "date", "highlights", "id", "issues", "notes", "pendingDeliveries", "pendingPayments", "reviewedAt", "salesValue", "serviceJobs", "serviceRevenue", "staffPresent", "status", "submittedById", "testDrives", "updatedAt", "vehiclesSold" FROM "DailyReport";
DROP TABLE "DailyReport";
ALTER TABLE "new_DailyReport" RENAME TO "DailyReport";
CREATE UNIQUE INDEX "DailyReport_branchId_date_key" ON "DailyReport"("branchId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "StockEntry_dailyReportId_modelName_modelVariant_key" ON "StockEntry"("dailyReportId", "modelName", "modelVariant");
