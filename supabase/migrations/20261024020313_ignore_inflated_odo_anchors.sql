-- 過去の不具合で古い日付の記録に最新ODOが入っていると、その値に引きずられて推定値が大きくなるため、それより後の日付にもっと小さいODOがある基準点は外して按分する
-- lib/odoEstimate.ts の estimateOdoAtDate と同じ規則で計算する。片方を変えたらもう片方も合わせて変える
CREATE OR REPLACE FUNCTION "public"."estimate_odo_at_date"(
  "p_car_id" uuid,
  "p_date" date,
  "p_today" date
) RETURNS integer
    LANGUAGE plpgsql
    STABLE
    SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
declare
  v_current_odo integer;
  v_purchase_odo integer;
  v_purchase_date date;
  v_prev_date date;
  v_prev_odo integer;
  v_next_date date;
  v_next_odo integer;
begin
  select coalesce(c.current_odo, 0), coalesce(c.purchase_odo, 0), c.purchase_date
    into v_current_odo, v_purchase_odo, v_purchase_date
  from public.cars c
  where c.id = p_car_id;
  if not found then
    return 0;
  end if;

  -- 基準点は記録・購入時（入力されている場合のみ）・今日時点の現在ODO
  -- 直前は同日なら最大、直後は同日なら最小を採用する
  with anchors(d, odo) as (
    select r.date, r.odo_at_record from public.records r where r.car_id = p_car_id
    union all
    select v_purchase_date, v_purchase_odo where v_purchase_odo > 0 and v_purchase_date is not null
    union all
    select p_today, v_current_odo
  ),
  valid as (
    select a.d, a.odo from anchors a
    where not exists (select 1 from anchors b where b.d > a.d and b.odo < a.odo)
  ),
  prev as (
    select v.d, v.odo from valid v where v.d <= p_date order by v.d desc, v.odo desc limit 1
  ),
  nxt as (
    select v.d, v.odo from valid v where v.d > p_date order by v.d asc, v.odo asc limit 1
  )
  select prev.d, prev.odo, nxt.d, nxt.odo
    into v_prev_date, v_prev_odo, v_next_date, v_next_odo
  from (select 1) one
  left join prev on true
  left join nxt on true;

  if v_next_date is null then
    return v_current_odo;
  end if;
  if v_prev_date is null then
    return case when v_purchase_odo > 0 then least(v_purchase_odo, v_next_odo) else v_next_odo end;
  end if;

  return round(v_prev_odo + (v_next_odo - v_prev_odo) * (p_date - v_prev_date)::numeric / (v_next_date - v_prev_date))::integer;
end;
$$;

REVOKE ALL ON FUNCTION "public"."estimate_odo_at_date"(uuid, date, date) FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."estimate_odo_at_date"(uuid, date, date) TO "authenticated";
