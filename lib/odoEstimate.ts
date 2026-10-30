import { parseISODate } from "@/lib/date/calendar"

export type OdoAnchorRecord = { id: string; car_id: string; date: string; odo_at_record: number | null }
export type OdoAnchorCar = { id: string; current_odo: number; purchase_odo: number; purchase_date: string | null }
export type OdoAnchorLog = { car_id: string; date: string; odo: number }

type OdoAnchor = { time: number; odo: number }

// ODO未入力の記録に入れる値として、その日付以前で一番新しい基準点のODOをそのまま使う
// 定期費用の自動記録で使う SQL 関数 public.estimate_odo_at_date と同じ規則なので、片方を変えたらもう片方も合わせて変える
export function estimateOdoAtDate({
  car,
  records,
  odoLogs,
  date,
  today,
  excludeRecordId,
}: {
  car: OdoAnchorCar
  records: OdoAnchorRecord[]
  odoLogs: OdoAnchorLog[]
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
  odoLogs.forEach((l) => {
    if (l.car_id === car.id) addAnchor(l.date, l.odo)
  })
  // 購入時ODOは未設定だと0になるため、入力されている場合だけ基準点にする
  if (car.purchase_odo > 0) addAnchor(car.purchase_date, car.purchase_odo)
  // odo_logs を経ずに current_odo だけが変わった場合に備えて、現在のODOも今日時点の基準点として扱う
  addAnchor(today, car.current_odo)

  // 過去の不具合で古い日付の記録に最新ODOが入っていることがあるため、それより後の日付にもっと小さいODOがある基準点は外す
  const validAnchors = anchors.filter((a) => anchors.every((b) => b.time <= a.time || b.odo >= a.odo))

  // 直前は同日なら最大、直後は同日なら最小を採用する（直後は、その日付以前に基準点がないときだけ使う）
  let prev: OdoAnchor | null = null
  let next: OdoAnchor | null = null
  for (const a of validAnchors) {
    if (a.time <= targetTime) {
      if (!prev || a.time > prev.time || (a.time === prev.time && a.odo > prev.odo)) prev = a
    } else {
      if (!next || a.time < next.time || (a.time === next.time && a.odo < next.odo)) next = a
    }
  }

  if (prev) return prev.odo
  if (!next) return car.current_odo
  return car.purchase_odo > 0 ? Math.min(car.purchase_odo, next.odo) : next.odo
}
