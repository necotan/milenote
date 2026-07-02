// sub_category / maint_settings の識別子スラッグ定義
// 日本語文字列を内部キー兼DB保存値として使っていた旧設計からの移行用

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

// 旧日本語識別子からスラッグの互換マップ（DBに残る既存データ読み取り用）
export const LEGACY_JP_TO_SLUG: Record<string, SubCategorySlug> = {
  "オイル交換": "oil_change",
  "オイルフィルター交換": "oil_filter_change",
  "ミッションオイル交換": "transmission_oil_change",
  "タイヤ交換": "tire_change",
  "タイヤローテーション": "tire_rotation",
  "バッテリー交換": "battery_change",
  "ブレーキパッド交換": "brake_pad_change",
  "クーラント（冷却水）交換": "coolant_change",
  "スマートキー電池交換": "key_battery_change",
  "ワイパーゴム交換": "wiper_blade_change",
  "車検・法定点検": "vehicle_inspection",
  "洗車・コーティング": "wash_coating",
  "法定12ヶ月点検": "inspection_12m",
  "法定24ヶ月点検": "inspection_24m",
  "定期点検": "periodic_inspection",
  "故障修理": "breakdown_repair",
  "板金・塗装": "bodywork_paint",
  "事故対応・レッカー": "accident_towing",
  "リコール対応": "recall",
  "外装・エアロ": "exterior_aero",
  "内装・インテリア": "interior",
  "吸排気系（マフラー等）": "exhaust_intake",
  "足回り（ホイール・車高調等）": "suspension_wheels",
  "電装系（オーディオ等）": "electronics",
  "洗車機": "wash_machine",
  "手洗い洗車": "hand_wash",
  "コーティング": "coating",
  "室内クリーニング": "interior_cleaning",
  "洗車用品": "wash_supplies",
  "自賠責保険": "compulsory_insurance",
  "任意保険": "voluntary_insurance",
  "自動車税": "automobile_tax",
  "軽自動車税": "kei_automobile_tax",
  "重量税": "weight_tax",
  "駐車場・コインパーキング": "parking",
  "ローン・リース代": "loan_lease",
  "カー用品・小物": "car_goods",
  "ロードサービス": "road_service",
  "その他": "other",
}

const ALL_SLUGS: ReadonlySet<string> = new Set(Object.values(LEGACY_JP_TO_SLUG))

export function toSubCategorySlug(value: string): string
export function toSubCategorySlug(value: string | null | undefined): string | null | undefined
export function toSubCategorySlug(value: string | null | undefined): string | null | undefined {
  if (!value) return value
  if (ALL_SLUGS.has(value)) return value
  return LEGACY_JP_TO_SLUG[value] ?? value
}

// maint_settings（jsonb）のキーを日本語からスラッグへ正規化する。未知のキーはそのまま残す
export function normalizeMaintSettingsKeys<T>(settings: Record<string, T> | null | undefined): Record<string, T> {
  if (!settings) return {}
  const result: Record<string, T> = {}
  for (const [key, value] of Object.entries(settings)) {
    result[toSubCategorySlug(key)] = value
  }
  return result
}
