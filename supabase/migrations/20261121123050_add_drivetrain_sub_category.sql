-- custom カテゴリに drivetrain を追加する。許可値を増やすだけなので既存行の再検証は不要
CREATE OR REPLACE FUNCTION "public"."is_valid_sub_category"("p_category" text, "p_sub_category" text) RETURNS boolean
    LANGUAGE sql
    IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select p_sub_category is null
      or (p_category = 'maintenance' and p_sub_category in ('oil_change', 'oil_filter_change', 'transmission_oil_change', 'tire_change', 'tire_rotation', 'battery_change', 'brake_pad_change', 'coolant_change', 'key_battery_change', 'wiper_blade_change', 'wash_coating', 'other'))
      or (p_category = 'inspection' and p_sub_category in ('vehicle_inspection', 'inspection_12m', 'inspection_24m', 'periodic_inspection'))
      or (p_category = 'repair' and p_sub_category in ('breakdown_repair', 'bodywork_paint', 'accident_towing', 'recall', 'other'))
      or (p_category = 'custom' and p_sub_category in ('exterior_aero', 'interior', 'exhaust_intake', 'suspension_wheels', 'drivetrain', 'electronics', 'other'))
      or (p_category = 'carwash' and p_sub_category in ('wash_machine', 'hand_wash', 'coating', 'interior_cleaning', 'wash_supplies', 'other'))
      or (p_category = 'insurance' and p_sub_category in ('compulsory_insurance', 'voluntary_insurance', 'other'))
      or (p_category = 'tax' and p_sub_category in ('automobile_tax', 'kei_automobile_tax', 'weight_tax', 'other'))
      or (p_category = 'other' and p_sub_category in ('parking', 'loan_lease', 'car_goods', 'road_service', 'other'))
$$;
