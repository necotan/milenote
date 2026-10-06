import type { Car, CarRecord } from "@/lib/types"

// muted は比較として意味を持たない値（所有前の年、初年の前年比）を薄く表示するための目印
export type YearRowState = {
  amount: number
  diff: number
  amountMuted: boolean
  diffMuted: boolean
}

const yearOf = (isoDate: string) => parseInt(isoDate.substring(0, 4), 10)

// 納車日より前の日付の記録（納車前に払った保険料など）もあり得るため、納車日と最古の記録の早いほうを所有開始年とし、費用のある年を所有前扱いにしないようにする
export function getOwnershipStartYear(
  cars: Pick<Car, "purchase_date">[],
  records: Pick<CarRecord, "date">[],
): number | null {
  const years = [
    ...cars.flatMap(c => (c.purchase_date ? [yearOf(c.purchase_date)] : [])),
    ...records.map(r => yearOf(r.date)),
  ]
  return years.length > 0 ? Math.min(...years) : null
}

export function getYearRowState(
  year: number,
  ownershipStartYear: number | null,
  totals: ReadonlyMap<number, number>,
): YearRowState {
  const amount = totals.get(year) ?? 0
  const isOwned = ownershipStartYear !== null && year >= ownershipStartYear
  return {
    amount,
    diff: amount - (totals.get(year - 1) ?? 0),
    amountMuted: !isOwned,
    diffMuted: !isOwned || year === ownershipStartYear,
  }
}
