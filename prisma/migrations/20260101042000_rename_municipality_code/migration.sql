DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Municipality' AND column_name = 'code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Municipality' AND column_name = 'municipalityCode'
  ) THEN
    ALTER TABLE "Municipality" RENAME COLUMN "code" TO "municipalityCode";
  END IF;
END $$;
