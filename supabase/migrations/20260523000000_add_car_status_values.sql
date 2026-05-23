-- 車両ステータスに新しい値（pending / archived / archived_excluded）を追加し、CHECK制約で取りうる値を明示する
--
-- ステータスの意味:
--   pending           : 納車待ち
--   active            : 所有中
--   archived          : 元愛車（統計に含める）
--   archived_excluded : 元愛車（統計から除外）
--   deleted           : 完全削除（ガレージから非表示）

ALTER TABLE "public"."cars"
  ADD CONSTRAINT "cars_status_check"
  CHECK ("status" IN ('pending', 'active', 'archived', 'archived_excluded', 'deleted'));

COMMENT ON COLUMN "public"."cars"."status" IS '車両ステータス: pending=納車待ち, active=所有中, archived=元愛車(統計含む), archived_excluded=元愛車(統計除外), deleted=完全削除';