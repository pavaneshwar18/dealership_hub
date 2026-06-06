-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "branchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyReport" (
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
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "newStockReceived" INTEGER NOT NULL DEFAULT 0,
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

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_branchId_date_key" ON "DailyReport"("branchId", "date");
