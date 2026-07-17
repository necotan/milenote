-- 金額、走行距離などの数値カラムにゼロ以上を強制するCHECK制約を追加
--
-- 無償対応(amount = 0)はあり得るため、> 0 ではなく >= 0 とする

ALTER TABLE "public"."records"
  ADD CONSTRAINT "records_amount_nonnegative" CHECK ("amount" >= 0),
  ADD CONSTRAINT "records_odo_at_record_nonnegative" CHECK ("odo_at_record" >= 0),
  ADD CONSTRAINT "records_fuel_amount_nonnegative" CHECK ("fuel_amount" >= 0);

ALTER TABLE "public"."cars"
  ADD CONSTRAINT "cars_current_odo_nonnegative" CHECK ("current_odo" >= 0),
  ADD CONSTRAINT "cars_purchase_odo_nonnegative" CHECK ("purchase_odo" >= 0),
  ADD CONSTRAINT "cars_purchase_price_nonnegative" CHECK ("purchase_price" >= 0);

ALTER TABLE "public"."recurring_costs"
  ADD CONSTRAINT "recurring_costs_amount_nonnegative" CHECK ("amount" >= 0);

ALTER TABLE "public"."wishlists"
  ADD CONSTRAINT "wishlists_price_estimate_nonnegative" CHECK ("price_estimate" >= 0);
