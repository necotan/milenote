-- 車両に本体価格（購入時価格）と、それを維持費に含めるかのフラグを追加する
--
--   purchase_price        : 車両本体価格（購入時価格、円）
--   include_price_in_cost : 本体価格を累計維持費に含めるか（デフォルトはfalse）

ALTER TABLE "public"."cars"
  ADD COLUMN IF NOT EXISTS "purchase_price" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "include_price_in_cost" boolean DEFAULT false;

COMMENT ON COLUMN "public"."cars"."purchase_price" IS '車両本体価格（購入時価格、円）';
COMMENT ON COLUMN "public"."cars"."include_price_in_cost" IS '本体価格を累計維持費に含めるか（デフォルトfalse）';