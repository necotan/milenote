"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/utils/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CarFront, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n"
import { usePageLoadingGate } from "@/lib/loadingGate"
import { MAINT_CATEGORIES } from "@/lib/subcategories"
import { generateMaintAlerts, DEFAULT_MAINT_SETTINGS, type MaintSettings, type MaintAlertItem, type MaintAlertCar, type MaintAlertRecord } from "@/lib/maintenanceAlerts"
import { MaintAlertCard } from "@/components/MaintenanceAlertViews"

export default function MaintenancePage() {
  const [cars, setCars] = useState<MaintAlertCar[]>([])
  const [alerts, setAlerts] = useState<MaintAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { t } = useTranslation()

  // カテゴリ、車の絞り込み用ステート
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const [carFilters, setCarFilters] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // カテゴリ絞り込みの選択切り替え
  const toggleCategoryFilter = (key: string) => {
    setCategoryFilters((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
  }

  // 車絞り込みの選択切り替え
  const toggleCarFilter = (key: string) => {
    setCarFilters((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
  }

  // タッチ/ペンは pointerup（実際に触れた要素で発火する）で即時処理し、その直後に届くclickは無視する
  const lastChipTouchAt = useRef(0)
  const chipTapHandlers = (toggle: () => void) => ({
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === "mouse") return
      lastChipTouchAt.current = Date.now()
      toggle()
    },
    onClick: () => {
      if (Date.now() - lastChipTouchAt.current < 700) return
      toggle()
    },
  })

  // メンテナンス項目名からカテゴリキーを引くための対応表
  const maintNameToCategory: Record<string, string> = {}
  MAINT_CATEGORIES.forEach((category) => {
    category.items.forEach((maintName) => { maintNameToCategory[maintName] = category.key })
  })

  // カテゴリ、車の絞り込みを適用したアラート
  const filteredAlerts = alerts.filter((a) =>
    (categoryFilters.length === 0 || categoryFilters.includes(maintNameToCategory[a.maintName])) &&
    (carFilters.length === 0 || carFilters.includes(a.carId))
  )

  // 絞り込み中の選択数（バッジ表示用）
  const activeFilterCount = categoryFilters.length + carFilters.length

  // 初回ローディング画面とデータ取得を連動させる
  usePageLoadingGate(!loading)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: userData } = await supabase.from("users").select("maint_settings").eq("id", user.id).single()
      const maintSettings: MaintSettings =
        userData?.maint_settings && Object.keys(userData.maint_settings).length > 0 ? userData.maint_settings : DEFAULT_MAINT_SETTINGS

      const { data: carsData } = await supabase.from("cars").select("id, name, current_odo").eq("user_id", user.id).eq("status", "active").eq("is_display_home", true)
      const { data: recordsData } = await supabase.from("records").select("car_id, sub_category, date, odo_at_record, cars!inner(status)").eq("user_id", user.id).in("cars.status", ["active", "archived"])

      if (carsData) setCars(carsData)
      if (carsData && recordsData) {
        setAlerts(generateMaintAlerts(carsData, recordsData as MaintAlertRecord[], maintSettings))
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return (
    <main className="p-4 space-y-6 max-w-4xl">
      <header className="pt-4 pb-2">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors">
          <span className="font-bold text-xs">{t("home.back_to_home")}</span>
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground mt-2">{t("home.maintenance_all_title")}</h1>
        <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground tracking-wider mt-1">{t("home.maintenance_all_subtitle")}</p>
      </header>
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-24 ml-1 mb-2" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="rounded-xl bg-white dark:bg-card shadow-[0_2px_12px_rgba(0,0,0,0.02)] ring-1 ring-slate-200/50 dark:ring-border overflow-hidden py-4">
                  <div className="p-3.5 flex items-start gap-3">
                    <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-2.5 w-16" />
                      <div className="mt-0.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="mt-0.5 h-7 w-24" />
                      </div>
                      <div className="flex flex-col gap-1.5 mt-1">
                        <Skeleton className="h-2.5 w-24" />
                        <Skeleton className="h-1.5 w-[80%] rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )

  return (
    <main className="p-4 space-y-6 max-w-4xl">
      <header className="pt-4 pb-2">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors">
          <span className="font-bold text-xs">{t("home.back_to_home")}</span>
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground mt-2">{t("home.maintenance_all_title")}</h1>
        <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground tracking-wider mt-1">{t("home.maintenance_all_subtitle")}</p>
      </header>

      {/* 絞り込みボタン */}
      {alerts.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            title={t("records.filter_title")}
            className="relative h-7 flex items-center px-2.5 rounded-lg border bg-white text-slate-500 border-slate-300 hover:text-slate-700 hover:border-slate-400 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground transition-colors"
          >
            <SlidersHorizontal size={15} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-slate-400 text-white dark:bg-surface-2 dark:text-foreground/80 text-[9px] font-semibold tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* カテゴリ、車の絞り込みモーダル */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4" onClick={() => setIsFilterOpen(false)}>
          <Card className="border-none shadow-2xl bg-white dark:bg-card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-800 dark:text-foreground">
                <SlidersHorizontal size={20} />
                <h2 className="text-lg font-extrabold">{t("records.filter_title")}</h2>
              </div>

              {/* カテゴリ絞り込み */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground">{t("records.category")}</p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    {...chipTapHandlers(() => setCategoryFilters([]))}
                    aria-pressed={categoryFilters.length === 0}
                    className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-colors touch-manipulation ${
                      categoryFilters.length === 0
                        ? "bg-slate-800 text-white border-slate-800 dark:bg-foreground dark:text-background dark:border-foreground"
                        : "bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
                    }`}
                  >
                    {t("records.filter_all")}
                    <span className="ml-1.5 tabular-nums opacity-60">{alerts.length}</span>
                  </button>
                  {MAINT_CATEGORIES.map((category) => {
                    const active = categoryFilters.includes(category.key)
                    const count = alerts.filter((a) => maintNameToCategory[a.maintName] === category.key).length
                    if (count === 0) return null
                    return (
                      <button
                        key={category.key}
                        type="button"
                        {...chipTapHandlers(() => toggleCategoryFilter(category.key))}
                        aria-pressed={active}
                        className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-colors touch-manipulation ${
                          active
                            ? "bg-slate-800 text-white border-slate-800 dark:bg-foreground dark:text-background dark:border-foreground"
                            : "bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
                        }`}
                      >
                        {t(`mypage.maint_category_${category.key}`)}
                        <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 車絞り込み */}
              {cars.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground">{t("records.filter_car")}</p>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      {...chipTapHandlers(() => setCarFilters([]))}
                      aria-pressed={carFilters.length === 0}
                      className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-colors touch-manipulation ${
                        carFilters.length === 0
                          ? "bg-slate-800 text-white border-slate-800 dark:bg-foreground dark:text-background dark:border-foreground"
                          : "bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
                      }`}
                    >
                      {t("records.filter_all")}
                      <span className="ml-1.5 tabular-nums opacity-60">{alerts.length}</span>
                    </button>
                    {cars.map((car) => {
                      const active = carFilters.includes(car.id)
                      const count = alerts.filter((a) => a.carId === car.id).length
                      return (
                        <button
                          key={car.id}
                          type="button"
                          {...chipTapHandlers(() => toggleCarFilter(car.id))}
                          aria-pressed={active}
                          className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-colors touch-manipulation ${
                            active
                              ? "bg-slate-800 text-white border-slate-800 dark:bg-foreground dark:text-background dark:border-foreground"
                              : "bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
                          }`}
                        >
                          {car.name}
                          <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <Button variant="outline" className="w-full font-bold" onClick={() => setIsFilterOpen(false)}>
                {t("common.close")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {cars.length === 0 ? (
        <Card className="border-none shadow-sm bg-white dark:bg-card p-10 text-center">
          <CarFront className="mx-auto h-12 w-12 text-slate-200 dark:text-muted-foreground mb-3" />
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground mb-4 tracking-tighter">{t("home.no_cars_registered")}</p>
          <Link href="/garage"><Button className="font-bold text-xs px-6 tracking-widest">{t("home.register")}</Button></Link>
        </Card>
      ) : alerts.length === 0 ? (
        <Card className="border-none shadow-sm bg-white dark:bg-card p-6 text-center">
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground tracking-widest">{t("home.no_alerts")}</p>
        </Card>
      ) : filteredAlerts.length === 0 ? (
        <Card className="border-none shadow-sm bg-white dark:bg-card p-6 text-center">
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground tracking-widest">{t("home.no_filtered_alerts")}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {MAINT_CATEGORIES.map((category) => {
            const items = category.items.flatMap((maintName) => filteredAlerts.filter((a) => a.maintName === maintName))
            if (items.length === 0) return null
            return (
              <div key={category.key}>
                <p className="text-sm font-bold text-slate-400 dark:text-muted-foreground tracking-wide mb-2 px-1">
                  {t(`mypage.maint_category_${category.key}`)}
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                  {items.map((alert) => (
                    <MaintAlertCard key={alert.id} alert={alert} className="h-full" />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
