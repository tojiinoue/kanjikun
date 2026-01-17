-- Add shop info fields to event
ALTER TABLE "Event"
  ADD COLUMN "shopSchedule" TEXT,
  ADD COLUMN "shopName" TEXT,
  ADD COLUMN "shopUrl" TEXT,
  ADD COLUMN "courseName" TEXT,
  ADD COLUMN "courseUrl" TEXT,
  ADD COLUMN "shopAddress" TEXT,
  ADD COLUMN "shopPrice" TEXT;
