-- 定期点検(periodic_inspection)の記録時に、その車専用の点検周期(月数)を自由に指定できるようにする
-- 未指定(NULL)の場合はマイページの maint_settings（全車共通のデフォルト値）にフォールバック

ALTER TABLE "public"."records"
  ADD COLUMN "interval_months" integer;

ALTER TABLE "public"."records"
  ADD CONSTRAINT "records_interval_months_nonnegative" CHECK ("interval_months" IS NULL OR "interval_months" >= 0);
