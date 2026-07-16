-- records.car_id / records.user_id / wishlists.car_id を NOT NULL 化
-- 孤児レコードの発生を構造的に排除

ALTER TABLE "public"."records" ALTER COLUMN "car_id" SET NOT NULL;
ALTER TABLE "public"."records" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "public"."wishlists" ALTER COLUMN "car_id" SET NOT NULL;
