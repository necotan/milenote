// ホーム、メンテナンス一覧画面で共通利用するアラート生成ロジック

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
  remaining: number
  // 距離順、期限順の並び替え用（距離の概念がない項目はkmRemainingがInfinityになる）
  kmRemaining: number
  monthsRemaining: number
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

// 日付文字列(YYYY-MM-DD)を時差の影響を受けないローカル日付のミリ秒に変換する
function toLocalDateMs(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).getTime()
}

export function generateMaintAlerts(
  cars: MaintAlertCar[],
  records: MaintAlertRecord[],
  maintSettings: MaintSettings,
  options: { now?: Date; includeDisabled?: boolean } = {}
): MaintAlertItem[] {
  const { now = new Date(), includeDisabled = false } = options
  const generatedAlerts: MaintAlertItem[] = []

  cars.forEach(car => {
    Object.keys(maintSettings).forEach(maintName => {
      const setting = maintSettings[maintName]
      // 通知オフの項目は既定では生成しない（enabled未設定は後方互換でオン扱い）
      const isDisabled = setting.enabled === false
      if (isDisabled && !includeDisabled) return
      const isMonthsOnly = !!setting.months_only
      const style = MAINT_STYLE_CONFIG[maintName] || { icon: Wrench, color: "text-slate-500 dark:text-muted-foreground" }
      const maintRecords = records.filter(r => r.car_id === car.id && r.sub_category === maintName).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // 車検は前回からの周期ではなく、記録に入力された車検満了日までの残り日数で判定する
      if (maintName === "vehicle_inspection") {
        const expiryRecord = maintRecords.find(r => !!r.inspection_expiry_date)
        // 満了日が未入力だと残り日数を出せないため、未記録として扱う
        if (!expiryRecord || !expiryRecord.inspection_expiry_date) {
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

        const expiryMs = toLocalDateMs(expiryRecord.inspection_expiry_date)
        const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const lastDateMs = toLocalDateMs(expiryRecord.date)
        const daysRemaining = Math.round((expiryMs - todayMs) / 86400000)
        const isOver = daysRemaining < 0
        const isUrgent = daysRemaining <= VEHICLE_INSPECTION_URGENT_DAYS

        const expiryDate = new Date(expiryMs)
        const lastDate = new Date(lastDateMs)
        const monthsPassed = (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth())
        const monthsRemaining = (expiryDate.getFullYear() - now.getFullYear()) * 12 + (expiryDate.getMonth() - now.getMonth())

        // 車検を受けた日から満了日までを100%として進捗を出す
        const totalMs = expiryMs - lastDateMs
        const progressPercent = totalMs > 0
          ? Math.min(100, Math.max(0, ((todayMs - lastDateMs) / totalMs) * 100))
          : 100

        generatedAlerts.push({
          id: `${car.id}-${maintName}`,
          carId: car.id,
          carName: car.name,
          maintName,
          isDisabled,
          hasRecord: true,
          displayValue: Math.abs(daysRemaining).toLocaleString(),
          isMonthsOnly: true,
          unit: "days",
          isOver,
          monthsPassed,
          isUrgent,
          remaining: -monthsRemaining,
          kmRemaining: Infinity,
          monthsRemaining,
          progressPercent,
          icon: style.icon,
          color: isUrgent ? "text-red-600" : style.color,
        })
        return
      }

      if (maintRecords.length === 0) {
        generatedAlerts.push({
          id: `${car.id}-${maintName}`,
          carId: car.id,
          carName: car.name,
          maintName: maintName,
          icon: style.icon,
          color: style.color,
          isDisabled,
          hasRecord: false,
        })
        return
      }

      const lastRecord = maintRecords[0]
      const lastDate = new Date(lastRecord.date)
      const monthsPassed = (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth())

      // その記録自体に周期指定があれば、マイページの全車共通設定より優先
      const effectiveMonths = (lastRecord.interval_months && lastRecord.interval_months > 0)
        ? lastRecord.interval_months
        : setting.months

      let kmRemaining = Infinity
      let kmProgress = 0
      if (!isMonthsOnly && setting.km > 0) {
        kmRemaining = (lastRecord.odo_at_record + setting.km) - car.current_odo
        kmProgress = Math.min(100, Math.max(0, ((setting.km - kmRemaining) / setting.km) * 100))
      }
      const monthsRemaining = effectiveMonths - monthsPassed
      const timeProgress = Math.min(100, Math.max(0, (monthsPassed / effectiveMonths) * 100))
      const progressPercent = isMonthsOnly ? timeProgress : Math.max(kmProgress, timeProgress)
      const isOver = isMonthsOnly ? monthsPassed >= effectiveMonths : kmRemaining <= 0
      const isUrgent = isOver || (!isMonthsOnly && kmRemaining <= 0) || monthsPassed >= effectiveMonths
      const displayValue = isMonthsOnly
        ? Math.abs(monthsRemaining).toLocaleString()
        : Math.abs(kmRemaining).toLocaleString()

      generatedAlerts.push({
        id: `${car.id}-${maintName}`,
        carId: car.id,
        carName: car.name,
        maintName: maintName,
        isDisabled,
        hasRecord: true,
        displayValue,
        isMonthsOnly,
        unit: isMonthsOnly ? "months" : "km",
        isOver,
        monthsPassed: monthsPassed,
        isUrgent: isUrgent,
        remaining: isMonthsOnly ? -monthsRemaining : kmRemaining,
        kmRemaining,
        monthsRemaining,
        progressPercent: progressPercent,
        icon: style.icon,
        color: isUrgent ? "text-red-600" : style.color,
      })
    })
  })

  // 通知オフの項目は末尾に、それ以外は記録済み（期限が近い順）を優先し未記録は末尾にまとめる
  generatedAlerts.sort((a, b) => {
    if (a.isDisabled !== b.isDisabled) return a.isDisabled ? 1 : -1
    if (a.hasRecord && !b.hasRecord) return -1
    if (!a.hasRecord && b.hasRecord) return 1
    if (a.hasRecord && b.hasRecord) return a.remaining - b.remaining
    return 0
  })

  return generatedAlerts
}
