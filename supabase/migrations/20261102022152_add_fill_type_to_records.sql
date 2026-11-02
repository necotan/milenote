-- 将来の満タン法の燃費計算で、満タン同士の区間を判定するために持つ
-- process_due_recurring_costs は定期費用から fill_type なしで給油記録を作るため null を許可する
-- 許可する値は FILL_TYPES（lib/fuelTypes.ts）と一致させる

ALTER TABLE "public"."records"
  ADD COLUMN "fill_type" text,
  ADD CONSTRAINT "records_fill_type_check"
    CHECK ("fill_type" IS NULL OR ("category" = 'fuel' AND "fill_type" IN ('full', 'fixed_volume', 'fixed_amount')));

-- 既存の給油記録はほぼ満タンで入力されているため full で埋める
UPDATE "public"."records"
SET "fill_type" = 'full'
WHERE "category" = 'fuel' AND "fill_type" IS NULL;
