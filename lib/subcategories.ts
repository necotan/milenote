// sub_category / maint_settings の識別子スラッグ定義

export type SubCategorySlug =
  | "oil_change"
  | "oil_filter_change"
  | "transmission_oil_change"
  | "tire_change"
  | "tire_rotation"
  | "battery_change"
  | "brake_pad_change"
  | "coolant_change"
  | "key_battery_change"
  | "wiper_blade_change"
  | "vehicle_inspection"
  | "wash_coating"
  | "inspection_12m"
  | "inspection_24m"
  | "periodic_inspection"
  | "breakdown_repair"
  | "bodywork_paint"
  | "accident_towing"
  | "recall"
  | "exterior_aero"
  | "interior"
  | "exhaust_intake"
  | "suspension_wheels"
  | "electronics"
  | "wash_machine"
  | "hand_wash"
  | "coating"
  | "interior_cleaning"
  | "wash_supplies"
  | "compulsory_insurance"
  | "voluntary_insurance"
  | "automobile_tax"
  | "kei_automobile_tax"
  | "weight_tax"
  | "parking"
  | "loan_lease"
  | "car_goods"
  | "road_service"
  | "other"

// category（"fuel" 等、SUB_CATEGORIES を持たないカテゴリを含む）をキーに任意文字列でルックアップできるようにする
export const SUB_CATEGORIES: Record<string, SubCategorySlug[]> = {
  maintenance: [
    "oil_change", "oil_filter_change", "transmission_oil_change", "tire_change", "tire_rotation",
    "battery_change", "brake_pad_change", "coolant_change",
    "key_battery_change", "wiper_blade_change", "vehicle_inspection", "wash_coating", "other"
  ],
  inspection: [
    "inspection_12m", "inspection_24m", "periodic_inspection", "other"
  ],
  repair: [
    "breakdown_repair", "bodywork_paint", "accident_towing", "recall", "other"
  ],
  custom: [
    "exterior_aero", "interior", "exhaust_intake",
    "suspension_wheels", "electronics", "other"
  ],
  carwash: [
    "wash_machine", "hand_wash", "coating", "interior_cleaning", "wash_supplies", "other"
  ],
  insurance: [
    "compulsory_insurance", "voluntary_insurance", "other"
  ],
  tax: [
    "automobile_tax", "kei_automobile_tax", "weight_tax", "other"
  ],
  other: [
    "parking", "loan_lease", "car_goods", "road_service", "other"
  ]
}

// ホームのメンテナンスアラート項目から遷移する際の記録カテゴリ
export const MAINT_TYPE_CATEGORY: Record<string, "maintenance" | "inspection"> = {
  oil_change: "maintenance",
  oil_filter_change: "maintenance",
  transmission_oil_change: "maintenance",
  coolant_change: "maintenance",
  tire_rotation: "maintenance",
  battery_change: "maintenance",
  brake_pad_change: "maintenance",
  inspection_12m: "inspection",
  inspection_24m: "inspection",
  periodic_inspection: "inspection",
}

// メンテナンス基準設定、ホームの表示で共通利用するカテゴリ分け
export const MAINT_CATEGORIES: { key: string; items: string[] }[] = [
  { key: "fluid", items: ["oil_change", "oil_filter_change", "transmission_oil_change", "coolant_change"] },
  { key: "chassis", items: ["tire_rotation", "battery_change", "brake_pad_change"] },
  { key: "inspection", items: ["inspection_12m", "inspection_24m", "periodic_inspection"] },
]
