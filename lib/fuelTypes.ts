// cars.fuel_type の識別子スラッグ定義

export type FuelTypeSlug =
  | "regular"
  | "premium"
  | "diesel"
  | "ev"
  | "other"

export const FUEL_TYPES: FuelTypeSlug[] = ["regular", "premium", "diesel", "ev", "other"]
