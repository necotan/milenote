type TFunc = (key: string, params?: Record<string, string | number>) => string

export type ExportRecord = {
  date: string
  category: string
  sub_category: string | null
  amount: number
  odo_at_record: number | null
  fuel_amount: number | null
  memo: string | null
  cars: { name: string; fuel_type: string | null } | null
}

// CSVの1セルをエスケープする
// カンマ・ダブルクォート・改行を含む場合はダブルクォートで囲み、内部の " は "" にする
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// 記録配列をCSV文字列へ変換する（先頭にUTF-8 BOMを付与しExcelの文字化けを防ぐ）
export function recordsToCsv(records: ExportRecord[], t: TFunc): string {
  const header = [
    t("mypage.export_col_date"),
    t("mypage.export_col_car"),
    t("mypage.export_col_category"),
    t("mypage.export_col_subcategory"),
    t("mypage.export_col_amount"),
    t("mypage.export_col_odometer"),
    t("mypage.export_col_fuel"),
    t("mypage.export_col_memo"),
  ]

  const rows = records.map((r) => {
    const isEv = r.cars?.fuel_type === "EV"
    const fuel = r.fuel_amount != null
      ? `${r.fuel_amount}${isEv ? t("records.unit_kwh") : t("records.unit_l")}`
      : ""
    return [
      r.date.replace(/-/g, "/"),
      r.cars?.name ?? "",
      t(`categories.${r.category}`),
      r.sub_category ? t(`subcategories.${r.sub_category}`) : "",
      r.amount,
      r.odo_at_record ?? "",
      fuel,
      r.memo ?? "",
    ]
  })

  const lines = [header, ...rows].map((cols) => cols.map(escapeCell).join(","))
  const body = lines.join("\r\n")
  return "﻿" + body
}

// CSV文字列をファイルとしてダウンロードさせる
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// milenote_records_YYYYMMDD.csv 形式のファイル名を生成する
export function buildExportFilename(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `milenote_records_${y}${m}${d}.csv`
}