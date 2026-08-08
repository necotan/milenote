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

export const getFuelUnit = (fuelType: string | null | undefined): FuelUnit => {
  if (fuelType === "ev") return "kwh"
  if (fuelType === "hydrogen") return "kg"
  return "l"
}
