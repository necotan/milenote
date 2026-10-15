-- 画面の選択肢にない値を API から直接書き込めないようにする
-- 選択肢はコード側（CATEGORIES / SUB_CATEGORIES / WISHLIST_GENRES / WISH_STATUS_KEYS）と一致させており、増やすときはこの制約も migration で更新する

-- records と recurring_costs で同じ組み合わせを使うため関数にまとめる
CREATE OR REPLACE FUNCTION "public"."is_valid_sub_category"("p_category" text, "p_sub_category" text) RETURNS boolean
    LANGUAGE sql
    IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select p_sub_category is null
      or (p_category = 'maintenance' and p_sub_category in ('oil_change', 'oil_filter_change', 'transmission_oil_change', 'tire_change', 'tire_rotation', 'battery_change', 'brake_pad_change', 'coolant_change', 'key_battery_change', 'wiper_blade_change', 'wash_coating', 'other'))
      or (p_category = 'inspection' and p_sub_category in ('vehicle_inspection', 'inspection_12m', 'inspection_24m', 'periodic_inspection'))
      or (p_category = 'repair' and p_sub_category in ('breakdown_repair', 'bodywork_paint', 'accident_towing', 'recall', 'other'))
      or (p_category = 'custom' and p_sub_category in ('exterior_aero', 'interior', 'exhaust_intake', 'suspension_wheels', 'electronics', 'other'))
      or (p_category = 'carwash' and p_sub_category in ('wash_machine', 'hand_wash', 'coating', 'interior_cleaning', 'wash_supplies', 'other'))
      or (p_category = 'insurance' and p_sub_category in ('compulsory_insurance', 'voluntary_insurance', 'other'))
      or (p_category = 'tax' and p_sub_category in ('automobile_tax', 'kei_automobile_tax', 'weight_tax', 'other'))
      or (p_category = 'other' and p_sub_category in ('parking', 'loan_lease', 'car_goods', 'road_service', 'other'))
$$;

ALTER TABLE "public"."records"
  ADD CONSTRAINT "records_category_check"
    CHECK ("category" IN ('fuel', 'maintenance', 'inspection', 'repair', 'custom', 'carwash', 'highway', 'tax', 'insurance', 'other')),
  ADD CONSTRAINT "records_sub_category_check"
    CHECK ("public"."is_valid_sub_category"("category", "sub_category"));

ALTER TABLE "public"."recurring_costs"
  ADD CONSTRAINT "recurring_costs_category_check"
    CHECK ("category" IN ('fuel', 'maintenance', 'inspection', 'repair', 'custom', 'carwash', 'highway', 'tax', 'insurance', 'other')),
  ADD CONSTRAINT "recurring_costs_sub_category_check"
    CHECK ("public"."is_valid_sub_category"("category", "sub_category"));

ALTER TABLE "public"."wishlists"
  ALTER COLUMN "status" SET NOT NULL,
  ADD CONSTRAINT "wishlists_genre_check"
    CHECK ("genre" IN ('wheels', 'exhaust_intake', 'aero_exterior', 'suspension', 'interior', 'other')),
  ADD CONSTRAINT "wishlists_status_check"
    CHECK ("status" IN ('considering', 'purchased', 'installed', 'given_up'));
