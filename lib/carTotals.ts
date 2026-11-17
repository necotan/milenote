import type { Car, CarRecord } from "@/lib/types"

// 車カードごとに全記録を filter すると台数 x 記録数になるため、1回の走査で車ごとに集計する
export function sumRecordAmountByCar(records: Pick<CarRecord, "car_id" | "amount">[]): Map<string, number> {
  const totals = new Map<string, number>()
  records.forEach((r) => totals.set(r.car_id, (totals.get(r.car_id) ?? 0) + r.amount))
  return totals
}

export function getCarTotalCost(
  car: Pick<Car, "id" | "include_price_in_cost" | "purchase_price">,
  recordTotals: Map<string, number>,
): number {
  return (recordTotals.get(car.id) ?? 0) + (car.include_price_in_cost ? (car.purchase_price || 0) : 0)
}
