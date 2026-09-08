-- サブカテゴリ vehicle_inspection（車検）を category = 'maintenance' から 'inspection' へ移設する
-- 移設前の記録は category = 'maintenance' のままなので、編集時にサブカテゴリの選択肢へ復元できない
-- 対象行を絞り込んでいるため再実行しても no-op（冪等）

UPDATE public.records
SET category = 'inspection'
WHERE category = 'maintenance' AND sub_category = 'vehicle_inspection';

UPDATE public.recurring_costs
SET category = 'inspection'
WHERE category = 'maintenance' AND sub_category = 'vehicle_inspection';
