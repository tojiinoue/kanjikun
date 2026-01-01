-- Replace area fields and add municipalities table
ALTER TABLE "Event"
  DROP COLUMN IF EXISTS "areaPrefecture",
  DROP COLUMN IF EXISTS "areaCity",
  ADD COLUMN "areaPrefCode" TEXT,
  ADD COLUMN "areaMunicipalityName" TEXT;

CREATE TABLE "Municipality" (
  "id" TEXT NOT NULL,
  "prefCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "nameKana" TEXT,
  "sortOrder" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Municipality_prefCode_name_idx" ON "Municipality"("prefCode", "name");
CREATE INDEX "Municipality_prefCode_idx" ON "Municipality"("prefCode");
