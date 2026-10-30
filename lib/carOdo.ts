import { getSupabaseBrowserClient } from "@/utils/supabase"
import type { Car, OdoLog } from "@/lib/types"

type OdoCar = Pick<Car, "id" | "purchase_odo">

export type OdoSaveResult =
  | { ok: true }
  | { ok: false; reason: "lower_than_existing"; maxOdo: number }
  | { ok: false; reason: "duplicate_date" | "failed"; message: string }

const UNIQUE_VIOLATION = "23505"

// 取得に失敗したまま計算すると current_odo を小さすぎる値で上書きしてしまうため、エラーを返して更新させない
async function fetchMaxOdo(car: OdoCar, excludeLogDate?: string): Promise<{ maxOdo: number } | { error: string }> {
  const supabase = getSupabaseBrowserClient()
  let logsQuery = supabase.from("odo_logs").select("odo").eq("car_id", car.id)
  if (excludeLogDate) logsQuery = logsQuery.neq("date", excludeLogDate)
  const [{ data: records, error: recordsError }, { data: logs, error: logsError }] = await Promise.all([
    supabase.from("records").select("odo_at_record").eq("car_id", car.id),
    logsQuery,
  ])
  const error = recordsError ?? logsError
  if (error) return { error: error.message }
  return {
    maxOdo: Math.max(
      car.purchase_odo || 0,
      ...(records ?? []).map((r: { odo_at_record: number | null }) => r.odo_at_record ?? 0),
      ...(logs ?? []).map((l: { odo: number }) => l.odo),
    ),
  }
}

// current_odo は記録・ODO更新の履歴・購入時ODOの最大値に揃える
// 記録や履歴の削除・編集で過大なODO値（桁間違いなど）が残らないようにするため、毎回全件から計算し直す
export async function recalcCarOdo(car: OdoCar): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const result = await fetchMaxOdo(car)
  if ("error" in result) return
  await supabase.from("cars").update({ current_odo: result.maxOdo }).eq("id", car.id)
}

// current_odo は最大値で決まるので、既存の値より小さい更新は保存しても反映されない
// 誤った値の修正は履歴の編集で行ってもらうため、ここでは保存しない（同じ日の履歴は上書き対象なので比較から外す）
export async function saveOdoUpdate({ userId, car, odo, date }: { userId: string; car: OdoCar; odo: number; date: string }): Promise<OdoSaveResult> {
  const supabase = getSupabaseBrowserClient()
  const current = await fetchMaxOdo(car, date)
  if ("error" in current) return { ok: false, reason: "failed", message: current.error }
  if (odo < current.maxOdo) return { ok: false, reason: "lower_than_existing", maxOdo: current.maxOdo }

  const { error } = await supabase
    .from("odo_logs")
    .upsert({ user_id: userId, car_id: car.id, date, odo }, { onConflict: "car_id,date" })
  if (error) return { ok: false, reason: "failed", message: error.message }

  const { error: carError } = await supabase.from("cars").update({ current_odo: odo }).eq("id", car.id)
  if (carError) return { ok: false, reason: "failed", message: carError.message }
  return { ok: true }
}

export async function updateOdoLog(car: OdoCar, log: OdoLog, { date, odo }: { date: string; odo: number }): Promise<OdoSaveResult> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from("odo_logs").update({ date, odo }).eq("id", log.id)
  if (error) {
    return { ok: false, reason: error.code === UNIQUE_VIOLATION ? "duplicate_date" : "failed", message: error.message }
  }
  await recalcCarOdo(car)
  return { ok: true }
}

export async function deleteOdoLog(car: OdoCar, log: OdoLog): Promise<OdoSaveResult> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from("odo_logs").delete().eq("id", log.id)
  if (error) return { ok: false, reason: "failed", message: error.message }
  await recalcCarOdo(car)
  return { ok: true }
}
