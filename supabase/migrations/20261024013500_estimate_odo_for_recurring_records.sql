-- 定期費用の自動記録で、さかのぼって作る記録に最新ODOがそのまま入らないよう、日付の前後の記録から按分したODOを入れる
-- lib/odoEstimate.ts の estimateOdoAtDate と同じ規則で計算する
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

  -- 基準点は記録、購入時（入力されている場合のみ）、今日時点の現在ODO
  -- 直前は同日なら最大、直後は同日なら最小を採用し、日付順にODOが減らないようにする
  select a.d, a.odo into v_prev_date, v_prev_odo
  from (
    select r.date as d, r.odo_at_record as odo from public.records r where r.car_id = p_car_id
    union all
    select v_purchase_date, v_purchase_odo where v_purchase_odo > 0 and v_purchase_date is not null
    union all
    select p_today, v_current_odo
  ) a
  where a.d <= p_date
  order by a.d desc, a.odo desc
  limit 1;

  select a.d, a.odo into v_next_date, v_next_odo
  from (
    select r.date as d, r.odo_at_record as odo from public.records r where r.car_id = p_car_id
    union all
    select v_purchase_date, v_purchase_odo where v_purchase_odo > 0 and v_purchase_date is not null
    union all
    select p_today, v_current_odo
  ) a
  where a.d > p_date
  order by a.d asc, a.odo asc
  limit 1;

  if v_next_date is null then
    return v_current_odo;
  end if;
  if v_prev_date is null then
    return case when v_purchase_odo > 0 then least(v_purchase_odo, v_next_odo) else v_next_odo end;
  end if;
  -- 既存データでODOが日付順に逆転している場合は、直前の値を下限とする
  if v_next_odo <= v_prev_odo then
    return v_prev_odo;
  end if;

  return round(v_prev_odo + (v_next_odo - v_prev_odo) * (p_date - v_prev_date)::numeric / (v_next_date - v_prev_date))::integer;
end;
$$;

REVOKE ALL ON FUNCTION "public"."estimate_odo_at_date"(uuid, date, date) FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."estimate_odo_at_date"(uuid, date, date) TO "authenticated";

-- 複数端末から同時に呼ばれても二重に記録しないよう、行ロックをかけてサーバー側で処理する
CREATE OR REPLACE FUNCTION "public"."process_due_recurring_costs"(
  "p_today" date,
  "p_memo_prefix" text,
  "p_recurring_cost_id" uuid DEFAULT NULL
) RETURNS integer
    LANGUAGE plpgsql
    SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  -- 今日は利用者のタイムゾーンで決めるが、未来日は UTC+14 までに制限する
  v_today date := least(p_today, ((now() at time zone 'UTC') + interval '14 hours')::date);
  v_cost record;
  v_step interval;
  v_next date;
  v_cycles integer;
  v_total integer := 0;
begin
  if v_uid is null then
    return 0;
  end if;

  for v_cost in
    select rc.id, rc.car_id, rc.category, rc.sub_category, rc.amount, rc.frequency, rc.next_billing_date, rc.memo
    from public.recurring_costs rc
    join public.cars c on c.id = rc.car_id
    where rc.user_id = v_uid
      and rc.is_active
      and rc.next_billing_date <= v_today
      and c.status in ('active', 'archived')
      and (p_recurring_cost_id is null or rc.id = p_recurring_cost_id)
    for update of rc
  loop
    v_step := case v_cost.frequency
      when 'weekly' then interval '7 days'
      when 'monthly' then interval '1 month'
      when 'bimonthly' then interval '2 months'
      when 'quarterly' then interval '3 months'
      when 'semiannually' then interval '6 months'
      when 'yearly' then interval '1 year'
    end;
    v_next := v_cost.next_billing_date;
    v_cycles := 0;

    -- 起点からの倍数で求め、月末の繰り下がり（1/31 → 2/28）を以降の月に連鎖させない
    while v_next <= v_today and v_cycles < 120 loop
      -- 接頭辞の分で memo の長さ制約に違反しないよう切り詰める
      insert into public.records (user_id, car_id, category, sub_category, amount, odo_at_record, date, memo)
      values (
        v_uid, v_cost.car_id, v_cost.category, v_cost.sub_category, v_cost.amount,
        public.estimate_odo_at_date(v_cost.car_id, v_next, v_today), v_next,
        left(p_memo_prefix || coalesce(v_cost.memo, ''), 2000)
      );
      v_cycles := v_cycles + 1;
      v_next := (v_cost.next_billing_date + v_step * v_cycles)::date;
    end loop;

    update public.recurring_costs set next_billing_date = v_next where id = v_cost.id;
    v_total := v_total + v_cycles;
  end loop;

  return v_total;
end;
$$;

REVOKE ALL ON FUNCTION "public"."process_due_recurring_costs"(date, text, uuid) FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."process_due_recurring_costs"(date, text, uuid) TO "authenticated";
