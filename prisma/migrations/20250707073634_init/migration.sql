-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "requiresRoad" BOOLEAN NOT NULL,
    "revenue" INTEGER,
    "timeToRevenue" INTEGER,
    "bonusType" TEXT,
    "bonusPercentage" INTEGER,
    "bonusRadius" INTEGER,
    "neighborhoodType" TEXT
);

-- CreateIndex
CREATE INDEX "Building_type_idx" ON "Building"("type");
