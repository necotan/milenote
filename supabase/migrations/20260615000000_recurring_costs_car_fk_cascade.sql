-- 車の物理削除に合わせて recurring_costs の外部キーを ON DELETE CASCADE に統一する
--
-- 背景: recurring_costs_car_id_fkey は ON DELETE 句が無く NO ACTION/RESTRICT だったため、
-- 定期費用が残っている車を物理削除しようとすると削除がブロックされていた。
-- records / wishlists は既に ON DELETE CASCADE のため、recurring_costs も揃えて
-- 車の物理削除1回で関連データがまとめて消えるようにする。

ALTER TABLE ONLY "public"."recurring_costs"
  DROP CONSTRAINT "recurring_costs_car_id_fkey";

ALTER TABLE ONLY "public"."recurring_costs"
  ADD CONSTRAINT "recurring_costs_car_id_fkey"
  FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE CASCADE;