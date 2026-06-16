"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/utils/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, Wrench, AlertCircle, Droplets, Banknote, CarFront, RefreshCw, CalendarDays, BarChart3, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Fuel, Gauge } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useTranslation, formatDateLocale, formatMonthsPassedLocale } from "@/lib/i18n"
import { getCarImageStyle } from "@/utils/carImage"

const CATEGORY_MAP: Record<string, { color: string }> = {
  fuel: { color: "#3b82f6" },
  maintenance: { color: "#f97316" },
  custom: { color: "#a855f7" },
  highway: { color: "#6366f1" },
  tax: { color: "#ef4444" },
  insurance: { color: "#22c55e" },
  other: { color: "#64748b" },
}

const MAINT_STYLE_CONFIG: Record<string, { icon: any; color: string }> = {
  "オイル交換": { icon: Droplets, color: "text-orange-500" },
  "オイルフィルター交換": { icon: RefreshCw, color: "text-blue-500" },
  "タイヤローテーション": { icon: RefreshCw, color: "text-green-500" },
  "バッテリー交換": { icon: RefreshCw, color: "text-red-500" },
}

const DEFAULT_MAINT_SETTINGS = {
  "オイル交換": { km: 5000, months: 6 },
  "オイルフィルター交換": { km: 10000, months: 12 },
  "タイヤローテーション": { km: 5000, months: 6 },
  "バッテリー交換": { km: 30000, months: 24 },
  "法定12ヶ月点検": { km: 0, months: 12, months_only: true },
  "法定24ヶ月点検": { km: 0, months: 24, months_only: true },
  "定期点検": { km: 0, months: 6, months_only: true },
}

const getGreeting = (t: (key: string) => string) => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return t("home.greeting_morning")
  if (hour >= 12 && hour < 18) return t("home.greeting_afternoon")
  return t("home.greeting_evening")
}

export default function Home() {
  const [cars, setCars] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState("")
  const [homeOrder, setHomeOrder] = useState<string[]>(["summary", "alerts", "cars"])
  const [odoModalOpen, setOdoModalOpen] = useState(false)
  const [odoCarId, setOdoCarId] = useState("")
  const [odoValue, setOdoValue] = useState("")
  const [odoSaving, setOdoSaving] = useState(false)
  const supabase = createClient()
  const { t, locale } = useTranslation()

  const fetchData = useCallback(async (showLoading = true) => {
      if (showLoading) setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: userData } = await supabase.from("users").select("maint_settings, display_name").eq("id", user.id).single()
        const maintSettings = userData?.maint_settings || DEFAULT_MAINT_SETTINGS
        if (userData?.display_name) setDisplayName(userData.display_name)

        const { data: carsData } = await supabase.from("cars").select("*").eq("user_id", user.id).eq("status", "active").eq("is_display_home", true)
        const { data: recordsData } = await supabase.from("records").select("*, cars(fuel_type)").eq("user_id", user.id)

        if (carsData) setCars(carsData)
        if (recordsData) setRecords(recordsData)

        if (carsData && recordsData) {
          const generatedAlerts: any[] = []
          const now = new Date()

          carsData.forEach(car => {
            Object.keys(maintSettings).forEach(maintName => {
              const setting = maintSettings[maintName]
              // 通知がオフの項目はアラートを生成しない（enabled未設定は後方互換でオン扱い）
              if (setting.enabled === false) return
              const isMonthsOnly = !!setting.months_only
              const style = MAINT_STYLE_CONFIG[maintName] || { icon: Wrench, color: "text-slate-500" }
              const maintRecords = recordsData.filter(r => r.car_id === car.id && r.sub_category === maintName).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

              if (maintRecords.length === 0) return

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
                carName: car.name,
                maintName: maintName,
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
          generatedAlerts.sort((a, b) => a.remaining - b.remaining)
          setAlerts(generatedAlerts)
        }
      }
      if (showLoading) setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()

    // localStorageから並び順を取得
    const savedOrder = localStorage.getItem("home_layout")
    if (savedOrder) {
      try {
        setHomeOrder(JSON.parse(savedOrder))
      } catch (e) {}
    }
  }, [fetchData])

  // ODO更新モーダルを開く
  const openOdoModal = () => {
    const first = cars[0]
    if (!first) return
    setOdoCarId(first.id)
    setOdoValue(first.current_odo != null ? String(first.current_odo) : "")
    setOdoModalOpen(true)
  }

  // モーダル内で対象車を変更したら、その車の現在ODOを入力欄へ反映
  const handleOdoCarChange = (id: string) => {
    setOdoCarId(id)
    const c = cars.find(car => car.id === id)
    setOdoValue(c && c.current_odo != null ? String(c.current_odo) : "")
  }

  const handleSaveOdo = async () => {
    if (!odoCarId) return
    const newOdo = parseInt(odoValue)
    if (isNaN(newOdo) || newOdo < 0) {
      toast.error(t("home.update_odo_invalid"))
      return
    }
    setOdoSaving(true)
    const { error } = await supabase.from("cars").update({ current_odo: newOdo }).eq("id", odoCarId)
    if (error) {
      toast.error(t("common.error_occurred") + ": " + error.message)
    } else {
      toast.success(t("home.update_odo_saved"))
      setOdoModalOpen(false)
      await fetchData(false)
    }
    setOdoSaving(false)
  }

  const today = new Date()

  
  // 今月の費用
  const thisMonthRecords = records.filter(r => {
    const d = new Date(r.date)
    return d.getFullYear() === today.getFullYear() && (d.getMonth() + 1) === (today.getMonth() + 1)
  })
  const thisMonthCost = thisMonthRecords.reduce((sum, r) => sum + r.amount, 0)

  // 先月の費用
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthRecords = records.filter(r => {
    const d = new Date(r.date)
    return d.getFullYear() === lastMonth.getFullYear() && (d.getMonth() + 1) === (lastMonth.getMonth() + 1)
  })
  const lastMonthCost = lastMonthRecords.reduce((sum, r) => sum + r.amount, 0)
  
  // 差額の計算
  const diffCost = thisMonthCost - lastMonthCost

  if (loading) return (
    <main className="p-4 space-y-6">
      <header className="pt-4 pb-2">
        <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
      </header>
      <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start gap-6">
        <div className="lg:col-span-2 space-y-6" style={{ order: homeOrder.indexOf("summary") }}>
          {/* サマリーカードスケルトン */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
              <div className="h-7 w-28 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6" style={{ order: homeOrder.indexOf("alerts") }}>
          {/* アラートカードスケルトン */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                  <div className="h-6 w-28 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* 愛車カードスケルトン */}
        <div className="lg:col-span-1" style={{ order: homeOrder.indexOf("cars") }}>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="h-48 bg-slate-100 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-7 w-36 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <div className="h-2.5 w-16 bg-slate-100 rounded animate-pulse" />
                  <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )

  return (
    <main className="p-4 space-y-6">
      <header className="pt-4 pb-2">
        <h1 className="text-2xl font-extrabold tracking-widest text-slate-900">{t("home.title")}</h1>
        <p className="text-xs font-bold text-slate-400 tracking-wider mt-1">{getGreeting(t)}{displayName ? t("home.greeting_suffix", { name: displayName }) : ""}</p>
      </header>

      <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start gap-6">
        
        <section className="lg:col-span-2" style={{ order: homeOrder.indexOf("summary") }}>
          {/* 一体型カード：今月の費用 + 給油ボタン + 直近の記録 */}
          <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-0">

                {/* トップ：今月の費用 + 給油ボタン */}
                <div className="p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest mb-1">
                      <Banknote size={10} /> {t("home.this_month_cost")}
                    </p>
                    <p className="text-2xl font-black text-slate-800 tracking-wider">¥{thisMonthCost.toLocaleString()}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-[9px] text-slate-400 font-bold tracking-widest">{t("home.vs_last_month")}</p>
                      {diffCost > 0 ? (
                        <span className="flex items-baseline text-red-500 font-bold text-[10px] tracking-wide">
                          <TrendingUp size={10} className="mr-0.5 self-center" /> +¥{diffCost.toLocaleString()}
                        </span>
                      ) : diffCost < 0 ? (
                        <span className="flex items-baseline text-blue-500 font-bold text-[10px] tracking-wide">
                          <TrendingDown size={10} className="mr-0.5 self-center" /> -¥{Math.abs(diffCost).toLocaleString()}
                        </span>
                      ) : (
                        <span className="flex items-baseline text-slate-400 font-bold text-[10px] tracking-wide">
                          <Minus size={10} className="mr-0.5 self-center" /> ±¥0
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 給油を記録・ODO更新ボタン */}
                  {cars.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1 shrink-0">
                      <Link href="/records?action=add&category=fuel">
                        <button className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors group">
                          <Fuel size={12} className="text-slate-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold tracking-wider">{t("home.record_fuel")}</span>
                        </button>
                      </Link>
                      <button onClick={openOdoModal} className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors group">
                        <Gauge size={12} className="text-slate-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold tracking-wider">{t("home.update_odo")}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 区切り線 */}
                <div className="mx-4 border-t border-slate-100" />

                {/* 直近の記録 */}
                <div className="p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t("home.recent_records")}</p>
                  {records.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-2">{t("home.no_records")}</p>
                  ) : (
                    <div className="space-y-2">
                      {[...records]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 3)
                        .map((r) => {
                          return (
                            <div key={r.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-500">{r.category === "fuel" && r.cars?.fuel_type === "EV" ? t("home.record_charge_label") : t(`categories.${r.category}`)}</span>
                                <span className="text-[10px] text-slate-400">{r.date.replace(/-/g, '/')}</span>
                              </div>
                              <span className="text-[12px] font-black text-slate-700">¥{r.amount.toLocaleString()}</span>
                            </div>
                          )
                        })
                      }
                    </div>
                  )}

                </div>

              </CardContent>
            </Card>
        </section>

        <section className="lg:col-span-2" style={{ order: homeOrder.indexOf("alerts") }}>
          {alerts.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
                {/* 常に表示される1件目（右上に展開トグルボタン配置） */}
                {alerts.slice(0, 1).map((alert) => (
                  <div key={alert.id} className="relative">
                    <Card className="border-none shadow-sm bg-white">
                      <CardContent className="p-4 flex items-start gap-4">
                        <div className={`p-3 rounded-2xl shrink-0 ${alert.isUrgent ? 'bg-red-50' : 'bg-slate-50'} ${alert.color}`}>
                          <alert.icon size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate pr-16">{alert.carName}</p>
                          <div className={`mt-0.5 leading-tight ${alert.isUrgent ? 'text-red-600' : 'text-slate-800'}`}>
                            <p className="text-[11px] font-bold tracking-wider">{t(`maintenance_items.${alert.maintName}`)}{alert.isOver ? t("home.alert_overdue") : t("home.alert_remaining")}</p>
                            <p className="text-lg font-black tracking-widest">{alert.displayValue}<span className="text-[10px] ml-0.5">{alert.isOver ? (alert.isMonthsOnly ? t("common.months_unit") : "") + t("home.exceeded") : (alert.isMonthsOnly ? t("common.months_unit") : t("common.km_unit"))}</span></p>
                          </div>
                          <div className="flex flex-col gap-2 mt-1.5">
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold tracking-wide">
                              <CalendarDays size={10} /> {t("home.months_since_last", { months: alert.monthsPassed })}
                            </div>
                            <div className="w-[80%] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ease-out ${alert.isUrgent ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : alert.progressPercent > 80 ? 'bg-orange-400' : 'bg-blue-400'}`} 
                                style={{ width: `${alert.progressPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {/* 右上の展開ボタン */}
                    {alerts.length > 1 && (
                      <button
                        onClick={() => setShowAllAlerts(v => !v)}
                        className={`absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                          showAllAlerts
                            ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            : 'bg-white text-slate-400 border-slate-100 shadow-sm hover:shadow hover:text-slate-600'
                        } ${alerts.length <= 4 ? 'lg:hidden' : ''}`}
                      >
                        {showAllAlerts ? (
                          <><ChevronUp size={11} /> {t("common.close")}</>
                        ) : (
                          <>
                            <ChevronDown size={11} />
                            <span className="lg:hidden">{t("home.more_items", { count: alerts.length - 1 })}</span>
                            <span className="hidden lg:inline">{t("home.more_items", { count: alerts.length - 4 })}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}

                {/* PC版初期表示用（2〜4件目）。モバイルでは非表示、アニメーション対象外 */}
                {alerts.slice(1, 4).map((alert) => (
                  <Card key={`pc-view-${alert.id}`} className="hidden lg:block border-none shadow-sm bg-white">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className={`p-3 rounded-2xl shrink-0 ${alert.isUrgent ? 'bg-red-50' : 'bg-slate-50'} ${alert.color}`}>
                        <alert.icon size={24} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{alert.carName}</p>
                        <div className={`mt-0.5 leading-tight ${alert.isUrgent ? 'text-red-600' : 'text-slate-800'}`}>
                          <p className="text-[11px] font-bold tracking-wider">{t(`maintenance_items.${alert.maintName}`)}{alert.isOver ? t("home.alert_overdue") : t("home.alert_remaining")}</p>
                          <p className="text-lg font-black tracking-widest">{alert.kmValue}<span className="text-[10px] ml-0.5">{alert.isOver ? t("home.exceeded") : t("common.km_unit")}</span></p>
                        </div>
                        <div className="flex flex-col gap-2 mt-1.5">
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold tracking-wide">
                            <CalendarDays size={10} /> {t("home.months_since_last", { months: alert.monthsPassed })}
                          </div>
                          <div className="w-[80%] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ease-out ${alert.isUrgent ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : alert.progressPercent > 80 ? 'bg-orange-400' : 'bg-blue-400'}`} 
                              style={{ width: `${alert.progressPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* モバイル版展開アニメーション対象エリア */}
                {(alerts.length > 1 || alerts.length > 4) && (
                  <div className="col-span-full">
                    <div
                      className="overflow-hidden transition-[max-height] duration-500 ease-in-out p-1 -m-1"
                      style={{ 
                        maxHeight: showAllAlerts ? `${alerts.length * 200}px` : '0px'
                      }}
                    >
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 pt-2">
                        {alerts.slice(1).map((alert, i) => {
                          const originalIndex = i + 1;
                          const isPcAlwaysVisible = originalIndex < 4;
                          const displayClass = isPcAlwaysVisible ? 'lg:hidden' : '';

                          return (
                            <Card
                              key={`anim-${alert.id}`}
                              className={`${displayClass} border-none shadow-sm bg-white transition-all duration-400 ease-out ${showAllAlerts ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                              style={{ transitionDelay: showAllAlerts ? `${i * 70 + 100}ms` : '0ms' }}
                            >
                              <CardContent className="p-4 flex items-start gap-4">
                                <div className={`p-3 rounded-2xl shrink-0 ${alert.isUrgent ? 'bg-red-50' : 'bg-slate-50'} ${alert.color}`}>
                                  <alert.icon size={24} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{alert.carName}</p>
                                  <div className={`mt-0.5 leading-tight ${alert.isUrgent ? 'text-red-600' : 'text-slate-800'}`}>
                                    <p className="text-[11px] font-bold tracking-wider">{t(`maintenance_items.${alert.maintName}`)}{alert.isOver ? t("home.alert_overdue") : t("home.alert_remaining")}</p>
                                    <p className="text-lg font-black tracking-widest">{alert.displayValue}<span className="text-[10px] ml-0.5">{alert.isOver ? (alert.isMonthsOnly ? t("common.months_unit") : "") + t("home.exceeded") : (alert.isMonthsOnly ? t("common.months_unit") : t("common.km_unit"))}</span></p>
                                  </div>
                                  <div className="flex flex-col gap-2 mt-1.5">
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold tracking-wide">
                                      <CalendarDays size={10} /> {t("home.months_since_last", { months: alert.monthsPassed })}
                                    </div>
                                    <div className="w-[80%] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all duration-1000 ease-out ${alert.isUrgent ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : alert.progressPercent > 80 ? 'bg-orange-400' : 'bg-blue-400'}`} 
                                        style={{ width: `${alert.progressPercent}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>


                  </div>
                )}
              </div>
            ) : (
              <Card className="border-none shadow-sm bg-white p-6 text-center">
                <p className="text-xs font-bold text-slate-400 italic tracking-widest">{t("home.no_alerts")}</p>
              </Card>
            )}
        </section>

        <section className="lg:col-span-1" style={{ order: homeOrder.indexOf("cars") }}>
          {cars.length === 0 ? (
            <Card className="border-none shadow-sm bg-white p-10 text-center">
              <CarFront className="mx-auto h-12 w-12 text-slate-200 mb-3" />
              <p className="text-xs font-bold text-slate-400 mb-4 tracking-tighter">{t("home.no_cars_registered")}</p>
              <Link href="/garage"><Button className="font-bold text-xs px-6 tracking-widest">{t("home.register")}</Button></Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {cars.map((car) => (
                <Card key={car.id} className="border-none shadow-sm overflow-hidden bg-white p-0">
                  <div className="relative aspect-[11/6] bg-slate-800 w-full m-0 border-b border-slate-100 overflow-hidden">
                    {car.image_url && <img src={car.image_url} alt={car.name} className="absolute inset-0 w-full h-full object-cover" style={getCarImageStyle(car)} />}
                  </div>
                  <CardContent className="p-0 m-0">
                    <div className="px-4 pb-4 bg-white relative z-20">
                      <h3 className="text-2xl font-black text-slate-800 tracking-wider mt-1">{car.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 tracking-widest">{car.maker} {car.model_code} {car.year ? `/ ${t("common.year_format", { year: car.year })}` : ""}</p>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-b border-slate-100">
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{t("common.odometer")}</p>
                        <p className="text-lg font-black text-slate-800 tracking-wider">{car.current_odo.toLocaleString()} <span className="text-[10px]">{t("common.km_unit")}</span></p>
                      </div>
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{t("common.total_cost")}</p>
                        <p className="text-lg font-black text-slate-800 tracking-wider">¥{
                          (records.filter(r => r.car_id === car.id).reduce((sum, r) => sum + r.amount, 0)
                            + (car.include_price_in_cost ? (car.purchase_price || 0) : 0)).toLocaleString()
                        }</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/30">
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{t("common.distance_since_delivery")}</p>
                        <p className="text-lg font-black text-slate-800 tracking-wider">+{Math.max(0, car.current_odo - (car.purchase_odo || 0)).toLocaleString()} <span className="text-[10px]">{t("common.km_unit")}</span></p>
                      </div>
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{t("common.ownership_period")}</p>
                        <p className="text-lg font-black text-slate-800 tracking-wider">{formatMonthsPassedLocale(car.purchase_date, locale)}</p>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col gap-2.5 text-xs bg-slate-50/50">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">{t("common.delivery_date")}</span>
                        <span className="font-bold text-slate-700 tracking-wider text-[10px]">{formatDateLocale(car.purchase_date, locale)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">{t("common.car_age")}</span>
                        <span className="font-bold text-slate-700 tracking-wider text-[10px]">{formatMonthsPassedLocale(car.first_registration_date, locale)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">{t("common.grade")}</span>
                        <span className="font-bold text-slate-700 tracking-wider text-[10px]">{car.grade || "-"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ODO更新モーダル */}
      {odoModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOdoModalOpen(false)}>
          <Card className="border-none shadow-2xl bg-white max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Gauge size={22} className="text-slate-500" />
                <h2 className="text-lg font-extrabold text-slate-800">{t("home.update_odo_title")}</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{t("home.update_odo_desc")}</p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">{t("home.target_car")}</label>
                {cars.length > 1 ? (
                  <Select value={odoCarId} onValueChange={handleOdoCarChange}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cars.map((car) => (
                        <SelectItem key={car.id} value={car.id}>{car.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
                    {cars.find((car) => car.id === odoCarId)?.name || cars[0]?.name}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">{t("common.odometer")}</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={odoValue}
                    onChange={(e) => setOdoValue(e.target.value)}
                    className="h-10 pr-10 bg-white border-slate-200"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">{t("common.km_unit")}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1 font-bold" onClick={() => setOdoModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button className="flex-1 font-bold" disabled={odoSaving} onClick={handleSaveOdo}>
                  {odoSaving ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}