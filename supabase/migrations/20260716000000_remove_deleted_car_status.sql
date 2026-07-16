-- 車両ステータスの CHECK 制約から 'deleted' を廃止
--
-- ステータスの意味:
--   pending           : 納車待ち
--   active            : 所有中
--   archived          : 元愛車（統計に含める）
--   archived_excluded : 元愛車（統計から除外）

ALTER TABLE "public"."cars" DROP CONSTRAINT "cars_status_check";

ALTER TABLE "public"."cars"
  ADD CONSTRAINT "cars_status_check"
  CHECK ("status" IN ('pending', 'active', 'archived', 'archived_excluded'));

COMMENT ON COLUMN "public"."cars"."status" IS '車両ステータス: pending=納車待ち, active=所有中, archived=元愛車(統計含む), archived_excluded=元愛車(統計除外)';
