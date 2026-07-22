// ホーム、メンテナンス一覧画面で共通利用するアラート生成ロジック

import { Wrench, Droplet, Filter, Cog, Snowflake, RefreshCw, BatteryFull, Disc, ClipboardCheck, type LucideIcon } from "lucide-react"

export type MaintSetting = { km: number; months: number; months_only?: boolean; enabled?: boolean }
export type MaintSettings = Record<string, MaintSetting>

export type MaintAlertCar = { id: string; name: string; current_odo: number }
export type MaintAlertRecord = { car_id: string; sub_category: string | null; date: string; odo_at_record: number }

type MaintAlertBase = {
  id: string
  carId: string
  carName: string
  maintName: string
  icon: LucideIcon
  color: string
}
export type RecordedMaintAlert = MaintAlertBase & {
  hasRecord: true
  isMonthsOnly: boolean
  displayValue: string
  isOver: boolean
  monthsPassed: number
  isUrgent: boolean
  remaining: number
  progressPercent: number
}
export type UnrecordedMaintAlert = MaintAlertBase & { hasRecord: false }
export type MaintAlertItem = RecordedMaintAlert | UnrecordedMaintAlert

export const MAINT_STYLE_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  "oil_change": { icon: Droplet, color: "text-orange-500" },
  "oil_filter_change": { icon: Filter, color: "text-blue-500" },
  "transmission_oil_change": { icon: Cog, color: "text-purple-500" },
  "coolant_change": { icon: Snowflake, color: "text-cyan-500" },
  "tire_rotation": { icon: RefreshCw, color: "text-green-500" },
  "battery_change": { icon: BatteryFull, color: "text-red-500" },
  "brake_pad_change": { icon: Disc, color: "text-rose-500" },
  "inspection_12m": { icon: ClipboardCheck, color: "text-indigo-500" },
  "inspection_24m": { icon: ClipboardCheck, color: "text-teal-500" },
  "periodic_inspection": { icon: ClipboardCheck, color: "text-violet-500" },
}

export const DEFAULT_MAINT_SETTINGS: MaintSettings = {
  "oil_change": { km: 5000, months: 6 },
  "oil_filter_change": { km: 10000, months: 12 },
  "tire_rotation": { km: 5000, months: 6 },
  "battery_change": { km: 30000, months: 24 },
  "inspection_12m": { km: 0, months: 12, months_only: true },
  "inspection_24m": { km: 0, months: 24, months_only: true },
  "periodic_inspection": { km: 0, months: 6, months_only: true },
}

export function generateMaintAlerts(cars: MaintAlertCar[], records: MaintAlertRecord[], maintSettings: MaintSettings, now: Date = new Date()): MaintAlertItem[] {
  const generatedAlerts: MaintAlertItem[] = []

  cars.forEach(car => {
    Object.keys(maintSettings).forEach(maintName => {
      const setting = maintSettings[maintName]
      // 通知がオフの項目はアラートを生成しない（enabled未設定は後方互換でオン扱い）
      if (setting.enabled === false) return
      const isMonthsOnly = !!setting.months_only
      const style = MAINT_STYLE_CONFIG[maintName] || { icon: Wrench, color: "text-slate-500 dark:text-muted-foreground" }
      const maintRecords = records.filter(r => r.car_id === car.id && r.sub_category === maintName).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      if (maintRecords.length === 0) {
        generatedAlerts.push({
          id: `${car.id}-${maintName}`,
          carId: car.id,
          carName: car.name,
          maintName: maintName,
          icon: style.icon,
          color: style.color,
          hasRecord: false,
        })
        return
      }

      const lastRecord = maintRecords[0]
      const lastDate = new Date(lastRecord.date)
      const monthsPassed = (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth())

      let kmRemaining = Infinity
      let kmProgress = 0
      if (!isMonthsOnly && setting.km > 0) {
        kmRemaining = (lastRecord.odo_at_record + setting.km) - car.current_odo
        kmProgress = Math.min(100, Math.max(0, ((setting.km - kmRemaining) / setting.km) * 100))
      }
      const monthsRemaining = setting.months - monthsPassed
      const timeProgress = Math.min(100, Math.max(0, (monthsPassed / setting.months) * 100))
      const progressPercent = isMonthsOnly ? timeProgress : Math.max(kmProgress, timeProgress)
      const isOver = isMonthsOnly ? monthsPassed >= setting.months : kmRemaining <= 0
      const isUrgent = isOver || (!isMonthsOnly && kmRemaining <= 0) || monthsPassed >= setting.months
      const displayValue = isMonthsOnly
        ? Math.abs(monthsRemaining).toLocaleString()
        : Math.abs(kmRemaining).toLocaleString()

      generatedAlerts.push({
        id: `${car.id}-${maintName}`,
        carId: car.id,
        carName: car.name,
        maintName: maintName,
        hasRecord: true,
        displayValue,
        isMonthsOnly,
        isOver,
        monthsPassed: monthsPassed,
        isUrgent: isUrgent,
        remaining: isMonthsOnly ? -monthsRemaining : kmRemaining,
        progressPercent: progressPercent,
        icon: style.icon,
        color: isUrgent ? "text-red-600" : style.color,
      })
    })
  })

  // 記録済み（期限が近い順）を優先し、未記録は末尾にまとめる
  generatedAlerts.sort((a, b) => {
    if (a.hasRecord && !b.hasRecord) return -1
    if (!a.hasRecord && b.hasRecord) return 1
    if (a.hasRecord && b.hasRecord) return a.remaining - b.remaining
    return 0
  })

  return generatedAlerts
}
