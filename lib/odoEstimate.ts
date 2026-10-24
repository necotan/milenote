import { parseISODate } from "@/lib/date/calendar"

export type OdoAnchorRecord = { id: string; car_id: string; date: string; odo_at_record: number | null }
export type OdoAnchorCar = { id: string; current_odo: number; purchase_odo: number; purchase_date: string | null }

type OdoAnchor = { time: number; odo: number }

const DAY_MS = 24 * 60 * 60 * 1000

// ODO未入力の記録に入れる値を、その日付の前後の記録から日付の比率で按分して求める
// 定期費用の自動記録で使う SQL 関数 public.estimate_odo_at_date と同じ規則なので、片方を変えたらもう片方も合わせて変える
export function estimateOdoAtDate({
  car,
  records,
  date,
  today,
  excludeRecordId,
}: {
  car: OdoAnchorCar
  records: OdoAnchorRecord[]
  date: string
  today: string
  excludeRecordId?: string | null
}): number {
  const target = parseISODate(date)
  if (!target) return car.current_odo
  const targetTime = target.getTime()

  const anchors: OdoAnchor[] = []
  const addAnchor = (iso: string | null, odo: number | null) => {
    const d = parseISODate(iso)
    if (d && odo != null) anchors.push({ time: d.getTime(), odo })
  }
  records.forEach((r) => {
    if (r.car_id === car.id && r.id !== excludeRecordId) addAnchor(r.date, r.odo_at_record)
  })
  // 購入時ODOは未設定だと0になるため、入力されている場合だけ基準点にする
  if (car.purchase_odo > 0) addAnchor(car.purchase_date, car.purchase_odo)
  // ホームのODO更新は記録を伴わないので、現在のODOを今日時点の基準点として扱う
  addAnchor(today, car.current_odo)

  // 過去の不具合で古い日付の記録に最新ODOが入っていることがあるため、それより後の日付にもっと小さいODOがある基準点は外す
  const validAnchors = anchors.filter((a) => anchors.every((b) => b.time <= a.time || b.odo >= a.odo))

  // 直前は同日なら最大、直後は同日なら最小を採用する
  let prev: OdoAnchor | null = null
  let next: OdoAnchor | null = null
  for (const a of validAnchors) {
    if (a.time <= targetTime) {
      if (!prev || a.time > prev.time || (a.time === prev.time && a.odo > prev.odo)) prev = a
    } else {
      if (!next || a.time < next.time || (a.time === next.time && a.odo < next.odo)) next = a
    }
  }

  if (!next) return car.current_odo
  if (!prev) return car.purchase_odo > 0 ? Math.min(car.purchase_odo, next.odo) : next.odo

  const spanDays = Math.round((next.time - prev.time) / DAY_MS)
  const elapsedDays = Math.round((targetTime - prev.time) / DAY_MS)
  if (spanDays <= 0) return prev.odo
  return Math.round(prev.odo + (next.odo - prev.odo) * (elapsedDays / spanDays))
}
