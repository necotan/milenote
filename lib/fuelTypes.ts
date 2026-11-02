// cars.fuel_type の識別子スラッグ定義

export type FuelTypeSlug =
  | "regular"
  | "premium"
  | "diesel"
  | "ev"
  | "hydrogen"
  | "other"

export const FUEL_TYPES: FuelTypeSlug[] = ["regular", "premium", "diesel", "ev", "hydrogen", "other"]

// 給油記録の入力・集計単位（レギュラー/ハイオク/軽油/その他はL、EVはkWh、FCV(水素)はkg）
export type FuelUnit = "l" | "kwh" | "kg"

// records.fill_type の識別子スラッグ定義（CHECK 制約 records_fill_type_check と一致させる）
// EV・FCV も同じ値を使い、表示ラベルだけ単位に応じて変える
export type FillType = "full" | "fixed_volume" | "fixed_amount"

export const FILL_TYPES: FillType[] = ["full", "fixed_volume", "fixed_amount"]

export const getFillTypeLabelKey = (fillType: FillType, unit: FuelUnit): string =>
  fillType === "full" && unit === "kwh" ? "fill_types.full_charge" : `fill_types.${fillType}`

export const getFuelUnit = (fuelType: string | null | undefined): FuelUnit => {
  if (fuelType === "ev") return "kwh"
  if (fuelType === "hydrogen") return "kg"
  return "l"
}
