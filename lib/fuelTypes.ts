// cars.fuel_type の識別子スラッグ定義

export type FuelTypeSlug =
  | "regular"
  | "premium"
  | "diesel"
  | "ev"
  | "other"

export const FUEL_TYPES: FuelTypeSlug[] = ["regular", "premium", "diesel", "ev", "other"]

// 旧日本語識別子からスラッグの互換マップ
export const LEGACY_JP_TO_SLUG: Record<string, FuelTypeSlug> = {
  "レギュラー": "regular",
  "ハイオク": "premium",
  "軽油": "diesel",
  "EV": "ev",
  "その他": "other",
}

const ALL_SLUGS: ReadonlySet<string> = new Set(Object.values(LEGACY_JP_TO_SLUG))

export function toFuelTypeSlug(value: string): string
export function toFuelTypeSlug(value: string | null | undefined): string | null | undefined
export function toFuelTypeSlug(value: string | null | undefined): string | null | undefined {
  if (!value) return value
  if (ALL_SLUGS.has(value)) return value
  return LEGACY_JP_TO_SLUG[value] ?? value
}
