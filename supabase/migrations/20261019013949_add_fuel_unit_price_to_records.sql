-- 総額(amount)を正とし、単価は入力された表示価格の記録として持つ

ALTER TABLE "public"."records"
  ADD COLUMN "fuel_unit_price" numeric,
  ADD CONSTRAINT "records_fuel_unit_price_nonnegative" CHECK ("fuel_unit_price" >= 0);

-- 既存の給油記録は lib/fuelUnitPrice.ts の deriveFuelUnitPrice と同じ手順で逆算して埋める
UPDATE "public"."records"
SET "fuel_unit_price" = COALESCE(
  CASE WHEN round(round("amount" / "fuel_amount", 0) * "fuel_amount") = "amount" THEN round("amount" / "fuel_amount", 0) END,
  CASE WHEN round(round("amount" / "fuel_amount", 1) * "fuel_amount") = "amount" THEN round("amount" / "fuel_amount", 1) END,
  CASE WHEN round(round("amount" / "fuel_amount", 2) * "fuel_amount") = "amount" THEN round("amount" / "fuel_amount", 2) END,
  round("amount" / "fuel_amount", 2)
)
WHERE "category" = 'fuel' AND "fuel_amount" > 0 AND "amount" > 0;
