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
    select rc.id, rc.car_id, rc.category, rc.sub_category, rc.amount, rc.frequency, rc.next_billing_date, rc.memo, c.current_odo
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
        coalesce(v_cost.current_odo, 0), v_next,
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

-- 片方だけ反映されないよう、元愛車への変更と定期費用の一時停止を同じトランザクションで行う
CREATE OR REPLACE FUNCTION "public"."pause_recurring_costs_on_car_archive"() RETURNS trigger
    LANGUAGE plpgsql
    SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
begin
  update public.recurring_costs set is_active = false where car_id = new.id and is_active;
  return null;
end;
$$;

REVOKE ALL ON FUNCTION "public"."pause_recurring_costs_on_car_archive"() FROM PUBLIC, "anon", "authenticated";

CREATE TRIGGER "pause_recurring_costs_on_car_archive"
  AFTER UPDATE OF "status" ON "public"."cars"
  FOR EACH ROW
  WHEN (coalesce(OLD.status, '') NOT IN ('archived', 'archived_excluded') AND NEW.status IN ('archived', 'archived_excluded'))
  EXECUTE FUNCTION "public"."pause_recurring_costs_on_car_archive"();
