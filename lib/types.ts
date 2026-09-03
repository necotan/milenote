// DBテーブルの行の型（SWRフックや各ページで共通利用）

import type { MaintSettings } from "@/lib/maintenanceAlerts"

export type CarStatus = "pending" | "active" | "archived" | "archived_excluded" | "deleted"

export type Car = {
  id: string
  user_id: string | null
  name: string
  maker: string | null
  model_code: string | null
  year: number | null
  fuel_type: string | null
  color: string | null
  grade: string | null
  current_odo: number
  status: CarStatus
  is_display_home: boolean
  image_url: string | null
  created_at: string
  purchase_date: string | null
  first_registration_date: string | null
  purchase_odo: number
  image_position_x: number
  image_position_y: number
  image_scale: number
  purchase_price: number
  include_price_in_cost: boolean
}

export type CarRecord = {
  id: string
  car_id: string
  user_id: string
  category: string
  sub_category: string | null
  amount: number
  odo_at_record: number
  fuel_amount: number | string | null
  date: string
  memo: string | null
  created_at: string
  entry_ic: string | null
  exit_ic: string | null
  interval_months: number | null
}

export type RecurringCost = {
  id: string
  user_id: string
  car_id: string
  category: string
  sub_category: string | null
  amount: number
  frequency: "monthly" | "yearly"
  billing_day: number | null
  billing_month: number | null
  next_billing_date: string
  memo: string | null
  is_active: boolean
  created_at: string
}

export type Wishlist = {
  id: string
  car_id: string
  item_name: string
  price_estimate: number | null
  url: string | null
  memo: string | null
  genre: string | null
  status: string
  created_at: string
}

export type UserProfile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  maint_settings: MaintSettings | null
}
