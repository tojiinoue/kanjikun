-- CreateTable
CREATE TABLE "EventRound" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "accountingStatus" "AccountingStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" INTEGER,
    "perPersonAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRound_pkey" PRIMARY KEY ("id")
);

-- Add column
ALTER TABLE "Attendance" ADD COLUMN "roundId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "roundId" TEXT;

-- Seed initial round for existing events
INSERT INTO "EventRound" ("id", "eventId", "order", "name", "accountingStatus", "totalAmount", "perPersonAmount", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  e."id",
  1,
  '1次会',
  e."accountingStatus",
  e."totalAmount",
  e."perPersonAmount",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Event" e;

-- Backfill roundId for existing data
UPDATE "Attendance" a
SET "roundId" = r."id"
FROM "EventRound" r
WHERE r."eventId" = a."eventId" AND r."order" = 1;

UPDATE "Payment" p
SET "roundId" = r."id"
FROM "EventRound" r
WHERE r."eventId" = p."eventId" AND r."order" = 1;

-- Set NOT NULL constraints
ALTER TABLE "Attendance" ALTER COLUMN "roundId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "roundId" SET NOT NULL;

-- Indexes
CREATE UNIQUE INDEX "EventRound_eventId_order_key" ON "EventRound"("eventId", "order");
CREATE INDEX "EventRound_eventId_idx" ON "EventRound"("eventId");
CREATE INDEX "Attendance_roundId_idx" ON "Attendance"("roundId");
CREATE INDEX "Payment_roundId_idx" ON "Payment"("roundId");

-- Foreign keys
ALTER TABLE "EventRound" ADD CONSTRAINT "EventRound_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "EventRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "EventRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
