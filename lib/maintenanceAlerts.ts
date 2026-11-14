import { Wrench, Droplet, Filter, Cog, Snowflake, RefreshCw, BatteryFull, Disc, ClipboardCheck, CarFront, type LucideIcon } from "lucide-react"

export type MaintSetting = { km: number; months: number; months_only?: boolean; enabled?: boolean }
export type MaintSettings = Record<string, MaintSetting>

export type MaintAlertCar = { id: string; name: string; current_odo: number }
export type MaintAlertRecord = { car_id: string; sub_category: string | null; date: string; odo_at_record: number; interval_months?: number | null; inspection_expiry_date?: string | null }

type MaintAlertBase = {
  id: string
  carId: string
  carName: string
  maintName: string
  icon: LucideIcon
  color: string
  isDisabled: boolean
}
export type RecordedMaintAlert = MaintAlertBase & {
  hasRecord: true
  isMonthsOnly: boolean
  // 残り値の単位
  unit: "km" | "months" | "days"
  displayValue: string
  isOver: boolean
  monthsPassed: number
  isUrgent: boolean
  // 周期の消化率（単位の異なる項目同士を並べるために使用）
  dueRatio: number
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
  "vehicle_inspection": { icon: CarFront, color: "text-amber-500" },
}

export const DEFAULT_MAINT_SETTINGS: MaintSettings = {
  "oil_change": { km: 5000, months: 6 },
  "oil_filter_change": { km: 10000, months: 12 },
  "tire_rotation": { km: 5000, months: 6 },
  "battery_change": { km: 30000, months: 24 },
  "inspection_12m": { km: 0, months: 12, months_only: true },
  "inspection_24m": { km: 0, months: 24, months_only: true },
  "periodic_inspection": { km: 0, months: 6, months_only: true },
  // 車検は周期ではなく記録に入力された満了日を基準に判定するため、km/monthsは使わない
  "vehicle_inspection": { km: 0, months: 0, months_only: true },
}

// 車検の満了日が何日後に迫ったら警告表示にするか
export const VEHICLE_INSPECTION_URGENT_DAYS = 30

// 期日が近いほど細かく知りたいため、残りがこの月数を下回ったら日数で表示する
const MONTHS_DISPLAY_MIN = 2

const DAY_MS = 86400000

// 日付文字列(YYYY-MM-DD)を時差の影響を受けないローカル日付に変換する
function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function addMonths(date: Date, months: number): Date {
  const y = date.getFullYear()
  const m = date.getMonth() + months
  // 1/31 + 1ヶ月が 3/3 に繰り越さないよう、移動先の月末日で止める
  const lastDay = new Date(y, m + 1, 0).getDate()
  return new Date(y, m, Math.min(date.getDate(), lastDay))
}

function wholeMonthsBetween(from: Date, to: Date): number {
  if (to <= from) return 0
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  return addMonths(from, months) > to ? months - 1 : months
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS)
}

function formatTimeRemaining(today: Date, dueDate: Date): { unit: "months" | "days"; displayValue: string } {
  const [from, to] = today <= dueDate ? [today, dueDate] : [dueDate, today]
  const months = wholeMonthsBetween(from, to)
  if (months >= MONTHS_DISPLAY_MIN) return { unit: "months", displayValue: months.toLocaleString() }
  return { unit: "days", displayValue: daysBetween(from, to).toLocaleString() }
}

export function generateMaintAlerts(
  cars: MaintAlertCar[],
  records: MaintAlertRecord[],
  maintSettings: MaintSettings,
  options: { now?: Date; includeDisabled?: boolean } = {}
): MaintAlertItem[] {
  const { now = new Date(), includeDisabled = false } = options
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const generatedAlerts: MaintAlertItem[] = []

  cars.forEach(car => {
    Object.keys(maintSettings).forEach(maintName => {
      const setting = maintSettings[maintName]
      // 通知オフの項目は既定では生成しない（enabled未設定は後方互換でオン扱い）
      const isDisabled = setting.enabled === false
      if (isDisabled && !includeDisabled) return
      const isVehicleInspection = maintName === "vehicle_inspection"
      const isMonthsOnly = !!setting.months_only
      const style = MAINT_STYLE_CONFIG[maintName] || { icon: Wrench, color: "text-slate-500 dark:text-muted-foreground" }
      const maintRecords = records.filter(r => r.car_id === car.id && r.sub_category === maintName).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      // 車検は前回からの周期ではなく、記録に入力された車検満了日を期日とする
      // 満了日が未入力だと期日を出せないため、未記録として扱う
      const lastRecord = isVehicleInspection
        ? maintRecords.find(r => !!r.inspection_expiry_date)
        : maintRecords[0]

      if (!lastRecord) {
        generatedAlerts.push({
          id: `${car.id}-${maintName}`,
          carId: car.id,
          carName: car.name,
          maintName,
          icon: style.icon,
          color: style.color,
          isDisabled,
          hasRecord: false,
        })
        return
      }

      const lastDate = toLocalDate(lastRecord.date)
      // その記録自体に周期指定があれば、マイページの全車共通設定より優先
      const effectiveMonths = (lastRecord.interval_months && lastRecord.interval_months > 0)
        ? lastRecord.interval_months
        : setting.months
      const dueDate = isVehicleInspection && lastRecord.inspection_expiry_date
        ? toLocalDate(lastRecord.inspection_expiry_date)
        : addMonths(lastDate, effectiveMonths)
      const daysRemaining = daysBetween(today, dueDate)
      const monthsPassed = wholeMonthsBetween(lastDate, today)

      // 前回の日を0%、期日を100%とする
      const totalMs = dueDate.getTime() - lastDate.getTime()
      const timeRatio = totalMs > 0 ? Math.max(0, (today.getTime() - lastDate.getTime()) / totalMs) : Infinity

      let kmRemaining = Infinity
      let kmRatio = 0
      if (!isMonthsOnly && setting.km > 0) {
        kmRemaining = (lastRecord.odo_at_record + setting.km) - car.current_odo
        kmRatio = Math.max(0, (setting.km - kmRemaining) / setting.km)
      }
      const dueRatio = Math.max(kmRatio, timeRatio)
      const progressPercent = Math.min(100, dueRatio * 100)

      const isOver = isMonthsOnly ? daysRemaining < 0 : kmRemaining <= 0
      const urgentDays = isVehicleInspection ? VEHICLE_INSPECTION_URGENT_DAYS : 0
      const isUrgent = isOver || daysRemaining <= urgentDays
      const remaining = isMonthsOnly
        ? formatTimeRemaining(today, dueDate)
        : { unit: "km" as const, displayValue: Math.abs(kmRemaining).toLocaleString() }

      generatedAlerts.push({
        id: `${car.id}-${maintName}`,
        carId: car.id,
        carName: car.name,
        maintName,
        isDisabled,
        hasRecord: true,
        isMonthsOnly,
        ...remaining,
        isOver,
        monthsPassed,
        isUrgent,
        dueRatio,
        progressPercent,
        icon: style.icon,
        color: isUrgent ? "text-red-600" : style.color,
      })
    })
  })

  // 通知オフの項目は末尾に、それ以外は記録済みを優先し未記録は末尾にまとめる
  // 記録済み同士は警告中を先にし、その中で周期の消化率が高い順に並べる
  generatedAlerts.sort((a, b) => {
    if (a.isDisabled !== b.isDisabled) return a.isDisabled ? 1 : -1
    if (a.hasRecord && !b.hasRecord) return -1
    if (!a.hasRecord && b.hasRecord) return 1
    if (a.hasRecord && b.hasRecord) {
      if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1
      if (a.dueRatio !== b.dueRatio) return b.dueRatio - a.dueRatio
    }
    return 0
  })

  return generatedAlerts
}
