import type { Locale } from "@/lib/i18n"

export interface MonthCell {
  date: Date
  outside: boolean
}

/** "YYYY-MM-DD" をローカル午前0時のDateへ変換する（new Date(iso)はUTC解釈になり、タイムゾーンによって日がずれるため使用しない） */
export function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

/** DateをローカルTZ基準の "YYYY-MM-DD" へ変換する */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

/** 指定した年月を含む6行7列（日曜始まり）のカレンダーマトリクスを返す */
export function getMonthMatrix(year: number, month: number): MonthCell[][] {
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - startOffset)

  const weeks: MonthCell[][] = []
  let cursor = gridStart
  for (let week = 0; week < 6; week++) {
    const row: MonthCell[] = []
    for (let day = 0; day < 7; day++) {
      row.push({ date: cursor, outside: cursor.getMonth() !== month })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    }
    weeks.push(row)
  }
  return weeks
}

/** ロケールに応じた曜日の短縮ラベル（日曜始まり） */
export function getWeekdayLabels(locale: Locale): string[] {
  const formatter = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", { weekday: "narrow" })
  // 2023-01-01(日曜)を起点に7日分の曜日ラベルを生成する
  return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2023, 0, 1 + i)))
}

export function getDefaultWheelYearRange(): { minYear: number; maxYear: number } {
  const currentYear = new Date().getFullYear()
  return { minYear: currentYear - 100, maxYear: currentYear + 10 }
}
