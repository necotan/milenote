-- 初期スキーマから残っていたが、アプリとサーバー側関数のどちらからも読み書きされていない列
-- 請求日は next_billing_date だけで管理している

ALTER TABLE "public"."recurring_costs"
  DROP COLUMN "billing_day",
  DROP COLUMN "billing_month";

-- 列を削除すれば CHECK 制約も消えるが、どの制約が消えるかを明示する
ALTER TABLE "public"."users"
  DROP CONSTRAINT "users_avatar_url_length",
  DROP COLUMN "avatar_url";
