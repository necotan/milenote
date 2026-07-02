-- sub_category / maint_settings の識別子を日本語からスラッグへ移行
-- 各UPDATEは category ごとに WHERE で絞り込み、日本語リストに一致する行のみを対象にする
-- （「その他」の category 間取り違え防止、既にスラッグ化済みの行は対象外になり冪等）

-- 1. records.sub_category

UPDATE public.records SET sub_category = CASE sub_category
  WHEN 'オイル交換' THEN 'oil_change'
  WHEN 'オイルフィルター交換' THEN 'oil_filter_change'
  WHEN 'ミッションオイル交換' THEN 'transmission_oil_change'
  WHEN 'タイヤ交換' THEN 'tire_change'
  WHEN 'タイヤローテーション' THEN 'tire_rotation'
  WHEN 'バッテリー交換' THEN 'battery_change'
  WHEN 'ブレーキパッド交換' THEN 'brake_pad_change'
  WHEN 'クーラント（冷却水）交換' THEN 'coolant_change'
  WHEN 'スマートキー電池交換' THEN 'key_battery_change'
  WHEN 'ワイパーゴム交換' THEN 'wiper_blade_change'
  WHEN '車検・法定点検' THEN 'vehicle_inspection'
  WHEN '洗車・コーティング' THEN 'wash_coating'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'maintenance' AND sub_category IN (
  'オイル交換', 'オイルフィルター交換', 'ミッションオイル交換', 'タイヤ交換', 'タイヤローテーション',
  'バッテリー交換', 'ブレーキパッド交換', 'クーラント（冷却水）交換',
  'スマートキー電池交換', 'ワイパーゴム交換', '車検・法定点検', '洗車・コーティング', 'その他'
);

UPDATE public.records SET sub_category = CASE sub_category
  WHEN '法定12ヶ月点検' THEN 'inspection_12m'
  WHEN '法定24ヶ月点検' THEN 'inspection_24m'
  WHEN '定期点検' THEN 'periodic_inspection'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'inspection' AND sub_category IN ('法定12ヶ月点検', '法定24ヶ月点検', '定期点検', 'その他');

UPDATE public.records SET sub_category = CASE sub_category
  WHEN '故障修理' THEN 'breakdown_repair'
  WHEN '板金・塗装' THEN 'bodywork_paint'
  WHEN '事故対応・レッカー' THEN 'accident_towing'
  WHEN 'リコール対応' THEN 'recall'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'repair' AND sub_category IN ('故障修理', '板金・塗装', '事故対応・レッカー', 'リコール対応', 'その他');

UPDATE public.records SET sub_category = CASE sub_category
  WHEN '外装・エアロ' THEN 'exterior_aero'
  WHEN '内装・インテリア' THEN 'interior'
  WHEN '吸排気系（マフラー等）' THEN 'exhaust_intake'
  WHEN '足回り（ホイール・車高調等）' THEN 'suspension_wheels'
  WHEN '電装系（オーディオ等）' THEN 'electronics'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'custom' AND sub_category IN (
  '外装・エアロ', '内装・インテリア', '吸排気系（マフラー等）', '足回り（ホイール・車高調等）', '電装系（オーディオ等）', 'その他'
);

UPDATE public.records SET sub_category = CASE sub_category
  WHEN '洗車機' THEN 'wash_machine'
  WHEN '手洗い洗車' THEN 'hand_wash'
  WHEN 'コーティング' THEN 'coating'
  WHEN '室内クリーニング' THEN 'interior_cleaning'
  WHEN '洗車用品' THEN 'wash_supplies'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'carwash' AND sub_category IN ('洗車機', '手洗い洗車', 'コーティング', '室内クリーニング', '洗車用品', 'その他');

UPDATE public.records SET sub_category = CASE sub_category
  WHEN '自賠責保険' THEN 'compulsory_insurance'
  WHEN '任意保険' THEN 'voluntary_insurance'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'insurance' AND sub_category IN ('自賠責保険', '任意保険', 'その他');

UPDATE public.records SET sub_category = CASE sub_category
  WHEN '自動車税' THEN 'automobile_tax'
  WHEN '軽自動車税' THEN 'kei_automobile_tax'
  WHEN '重量税' THEN 'weight_tax'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'tax' AND sub_category IN ('自動車税', '軽自動車税', '重量税', 'その他');

UPDATE public.records SET sub_category = CASE sub_category
  WHEN '駐車場・コインパーキング' THEN 'parking'
  WHEN 'ローン・リース代' THEN 'loan_lease'
  WHEN 'カー用品・小物' THEN 'car_goods'
  WHEN 'ロードサービス' THEN 'road_service'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'other' AND sub_category IN ('駐車場・コインパーキング', 'ローン・リース代', 'カー用品・小物', 'ロードサービス', 'その他');

-- 2. recurring_costs.sub_category（records と同一の対応表・同一パターン）

UPDATE public.recurring_costs SET sub_category = CASE sub_category
  WHEN 'オイル交換' THEN 'oil_change'
  WHEN 'オイルフィルター交換' THEN 'oil_filter_change'
  WHEN 'ミッションオイル交換' THEN 'transmission_oil_change'
  WHEN 'タイヤ交換' THEN 'tire_change'
  WHEN 'タイヤローテーション' THEN 'tire_rotation'
  WHEN 'バッテリー交換' THEN 'battery_change'
  WHEN 'ブレーキパッド交換' THEN 'brake_pad_change'
  WHEN 'クーラント（冷却水）交換' THEN 'coolant_change'
  WHEN 'スマートキー電池交換' THEN 'key_battery_change'
  WHEN 'ワイパーゴム交換' THEN 'wiper_blade_change'
  WHEN '車検・法定点検' THEN 'vehicle_inspection'
  WHEN '洗車・コーティング' THEN 'wash_coating'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'maintenance' AND sub_category IN (
  'オイル交換', 'オイルフィルター交換', 'ミッションオイル交換', 'タイヤ交換', 'タイヤローテーション',
  'バッテリー交換', 'ブレーキパッド交換', 'クーラント（冷却水）交換',
  'スマートキー電池交換', 'ワイパーゴム交換', '車検・法定点検', '洗車・コーティング', 'その他'
);

UPDATE public.recurring_costs SET sub_category = CASE sub_category
  WHEN '法定12ヶ月点検' THEN 'inspection_12m'
  WHEN '法定24ヶ月点検' THEN 'inspection_24m'
  WHEN '定期点検' THEN 'periodic_inspection'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'inspection' AND sub_category IN ('法定12ヶ月点検', '法定24ヶ月点検', '定期点検', 'その他');

UPDATE public.recurring_costs SET sub_category = CASE sub_category
  WHEN '故障修理' THEN 'breakdown_repair'
  WHEN '板金・塗装' THEN 'bodywork_paint'
  WHEN '事故対応・レッカー' THEN 'accident_towing'
  WHEN 'リコール対応' THEN 'recall'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'repair' AND sub_category IN ('故障修理', '板金・塗装', '事故対応・レッカー', 'リコール対応', 'その他');

UPDATE public.recurring_costs SET sub_category = CASE sub_category
  WHEN '外装・エアロ' THEN 'exterior_aero'
  WHEN '内装・インテリア' THEN 'interior'
  WHEN '吸排気系（マフラー等）' THEN 'exhaust_intake'
  WHEN '足回り（ホイール・車高調等）' THEN 'suspension_wheels'
  WHEN '電装系（オーディオ等）' THEN 'electronics'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'custom' AND sub_category IN (
  '外装・エアロ', '内装・インテリア', '吸排気系（マフラー等）', '足回り（ホイール・車高調等）', '電装系（オーディオ等）', 'その他'
);

UPDATE public.recurring_costs SET sub_category = CASE sub_category
  WHEN '洗車機' THEN 'wash_machine'
  WHEN '手洗い洗車' THEN 'hand_wash'
  WHEN 'コーティング' THEN 'coating'
  WHEN '室内クリーニング' THEN 'interior_cleaning'
  WHEN '洗車用品' THEN 'wash_supplies'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'carwash' AND sub_category IN ('洗車機', '手洗い洗車', 'コーティング', '室内クリーニング', '洗車用品', 'その他');

UPDATE public.recurring_costs SET sub_category = CASE sub_category
  WHEN '自賠責保険' THEN 'compulsory_insurance'
  WHEN '任意保険' THEN 'voluntary_insurance'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'insurance' AND sub_category IN ('自賠責保険', '任意保険', 'その他');

UPDATE public.recurring_costs SET sub_category = CASE sub_category
  WHEN '自動車税' THEN 'automobile_tax'
  WHEN '軽自動車税' THEN 'kei_automobile_tax'
  WHEN '重量税' THEN 'weight_tax'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'tax' AND sub_category IN ('自動車税', '軽自動車税', '重量税', 'その他');

UPDATE public.recurring_costs SET sub_category = CASE sub_category
  WHEN '駐車場・コインパーキング' THEN 'parking'
  WHEN 'ローン・リース代' THEN 'loan_lease'
  WHEN 'カー用品・小物' THEN 'car_goods'
  WHEN 'ロードサービス' THEN 'road_service'
  WHEN 'その他' THEN 'other'
END
WHERE category = 'other' AND sub_category IN ('駐車場・コインパーキング', 'ローン・リース代', 'カー用品・小物', 'ロードサービス', 'その他');

-- 3. users.maint_settings（jsonb キーを日本語からスラッグへ付け替え）
-- maint_settings は mypage の入力UIが対象とする固定キーのみ想定（app/mypage/page.tsx の DEFAULT_MAINT_SETTINGS と一致）
-- キーが存在しない場合は - 演算子・|| ともに no-op なので安全

UPDATE public.users SET maint_settings =
  (maint_settings - 'オイル交換') || CASE WHEN maint_settings ? 'オイル交換' THEN jsonb_build_object('oil_change', maint_settings->'オイル交換') ELSE '{}'::jsonb END
WHERE maint_settings ? 'オイル交換';

UPDATE public.users SET maint_settings =
  (maint_settings - 'オイルフィルター交換') || CASE WHEN maint_settings ? 'オイルフィルター交換' THEN jsonb_build_object('oil_filter_change', maint_settings->'オイルフィルター交換') ELSE '{}'::jsonb END
WHERE maint_settings ? 'オイルフィルター交換';

UPDATE public.users SET maint_settings =
  (maint_settings - 'ミッションオイル交換') || CASE WHEN maint_settings ? 'ミッションオイル交換' THEN jsonb_build_object('transmission_oil_change', maint_settings->'ミッションオイル交換') ELSE '{}'::jsonb END
WHERE maint_settings ? 'ミッションオイル交換';

UPDATE public.users SET maint_settings =
  (maint_settings - 'タイヤローテーション') || CASE WHEN maint_settings ? 'タイヤローテーション' THEN jsonb_build_object('tire_rotation', maint_settings->'タイヤローテーション') ELSE '{}'::jsonb END
WHERE maint_settings ? 'タイヤローテーション';

UPDATE public.users SET maint_settings =
  (maint_settings - 'バッテリー交換') || CASE WHEN maint_settings ? 'バッテリー交換' THEN jsonb_build_object('battery_change', maint_settings->'バッテリー交換') ELSE '{}'::jsonb END
WHERE maint_settings ? 'バッテリー交換';

UPDATE public.users SET maint_settings =
  (maint_settings - 'ブレーキパッド交換') || CASE WHEN maint_settings ? 'ブレーキパッド交換' THEN jsonb_build_object('brake_pad_change', maint_settings->'ブレーキパッド交換') ELSE '{}'::jsonb END
WHERE maint_settings ? 'ブレーキパッド交換';

UPDATE public.users SET maint_settings =
  (maint_settings - 'クーラント（冷却水）交換') || CASE WHEN maint_settings ? 'クーラント（冷却水）交換' THEN jsonb_build_object('coolant_change', maint_settings->'クーラント（冷却水）交換') ELSE '{}'::jsonb END
WHERE maint_settings ? 'クーラント（冷却水）交換';

UPDATE public.users SET maint_settings =
  (maint_settings - '法定12ヶ月点検') || CASE WHEN maint_settings ? '法定12ヶ月点検' THEN jsonb_build_object('inspection_12m', maint_settings->'法定12ヶ月点検') ELSE '{}'::jsonb END
WHERE maint_settings ? '法定12ヶ月点検';

UPDATE public.users SET maint_settings =
  (maint_settings - '法定24ヶ月点検') || CASE WHEN maint_settings ? '法定24ヶ月点検' THEN jsonb_build_object('inspection_24m', maint_settings->'法定24ヶ月点検') ELSE '{}'::jsonb END
WHERE maint_settings ? '法定24ヶ月点検';

UPDATE public.users SET maint_settings =
  (maint_settings - '定期点検') || CASE WHEN maint_settings ? '定期点検' THEN jsonb_build_object('periodic_inspection', maint_settings->'定期点検') ELSE '{}'::jsonb END
WHERE maint_settings ? '定期点検';

-- 4. users.maint_settings カラムの DEFAULT をスラッグ版へ変更（新規登録ユーザー向け）

ALTER TABLE public.users ALTER COLUMN maint_settings SET DEFAULT
  '{"oil_change": {"km": 5000, "months": 6}, "battery_change": {"km": 30000, "months": 24}, "oil_filter_change": {"km": 10000, "months": 12}, "tire_rotation": {"km": 5000, "months": 6}}'::jsonb;
