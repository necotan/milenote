-- RecurringTab の FREQUENCY_OPTIONS と一致させ、monthly / yearly 以外で保存に失敗する不具合を直す

ALTER TABLE "public"."recurring_costs" DROP CONSTRAINT "recurring_costs_frequency_check";

ALTER TABLE "public"."recurring_costs"
  ADD CONSTRAINT "recurring_costs_frequency_check"
  CHECK ("frequency" IN ('weekly', 'monthly', 'bimonthly', 'quarterly', 'semiannually', 'yearly'));
