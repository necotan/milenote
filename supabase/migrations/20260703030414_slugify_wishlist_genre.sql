-- wishlists.genre の識別子を日本語からスラッグへ移行
-- WHERE で日本語リストに一致する行のみに絞り込むため、既にスラッグ化済みの行は対象外になり冪等性を担保

UPDATE public.wishlists SET genre = CASE genre
  WHEN 'ホイール' THEN 'wheels'
  WHEN 'マフラー・吸排気' THEN 'exhaust_intake'
  WHEN 'エアロ・外装' THEN 'aero_exterior'
  WHEN '足回り・車高調' THEN 'suspension'
  WHEN 'インテリア・内装' THEN 'interior'
  WHEN 'その他' THEN 'other'
END
WHERE genre IN ('ホイール', 'マフラー・吸排気', 'エアロ・外装', '足回り・車高調', 'インテリア・内装', 'その他');
