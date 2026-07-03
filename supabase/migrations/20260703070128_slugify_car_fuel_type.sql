-- cars.fuel_type の識別子を日本語からスラッグへ移行
-- WHERE で日本語と旧"EV"のリストに一致する行のみに絞り込むため、既にスラッグ化済みの行は対象外になり冪等性を担保

UPDATE public.cars SET fuel_type = CASE fuel_type
  WHEN 'レギュラー' THEN 'regular'
  WHEN 'ハイオク' THEN 'premium'
  WHEN '軽油' THEN 'diesel'
  WHEN 'EV' THEN 'ev'
  WHEN 'その他' THEN 'other'
END
WHERE fuel_type IN ('レギュラー', 'ハイオク', '軽油', 'EV', 'その他');
