"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/utils/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import { SegmentedToggle } from "@/components/ui/SegmentedToggle"
import { CarFront, SlidersHorizontal, Settings2, EyeOff, LayoutList, FileX } from "lucide-react"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n"
import { usePageLoadingGate } from "@/lib/loadingGate"
import { MAINT_CATEGORIES } from "@/lib/subcategories"
import { generateMaintAlerts, DEFAULT_MAINT_SETTINGS, type MaintSettings, type MaintAlertItem, type MaintAlertCar, type MaintAlertRecord } from "@/lib/maintenanceAlerts"
import { MaintAlertCard } from "@/components/MaintenanceAlertViews"

// 表示設定モーダルの各項目はlocalStorageに個別キーで保存
const SHOW_DISABLED_STORAGE_KEY = "milenote_maintenance_show_disabled"
const HIDE_UNRECORDED_STORAGE_KEY = "milenote_maintenance_hide_unrecorded"
const UNGROUP_STORAGE_KEY = "milenote_maintenance_ungroup"
const SORT_MODE_STORAGE_KEY = "milenote_maintenance_sort_mode"
// 絞り込みモーダルの選択状態もlocalStorageに保存
const CATEGORY_FILTERS_STORAGE_KEY = "milenote_maintenance_category_filters"
const CAR_FILTERS_STORAGE_KEY = "milenote_maintenance_car_filters"

type SortMode = "distance" | "deadline"

// カードグリッドの列数計算とボタン位置合わせで使用
const CARD_WIDTH = 300
const CARD_GAP = 16
const MAX_GRID_COLUMNS = 4

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

  // 表示設定用ステート
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false)
  // メンテナンス基準でオフにした項目もこの一覧では表示するかの切り替え
  const [showDisabled, setShowDisabled] = useState(false)
  // 未記録の項目を一覧から非表示にするかの切り替え
  const [hideUnrecorded, setHideUnrecorded] = useState(false)
  // カテゴリごとのグループ化を解除し、1つの一覧としてまとめて表示するかの切り替え
  const [isUngrouped, setIsUngrouped] = useState(false)
  // 記録済み項目の並び順（残り距離が少ない順 / 期限が近い順）
  const [sortMode, setSortMode] = useState<SortMode>("distance")

  // 表示設定、絞り込みをlocalStorageから復元
  useEffect(() => {
    setShowDisabled(localStorage.getItem(SHOW_DISABLED_STORAGE_KEY) === "true")
    setHideUnrecorded(localStorage.getItem(HIDE_UNRECORDED_STORAGE_KEY) === "true")
    setIsUngrouped(localStorage.getItem(UNGROUP_STORAGE_KEY) === "true")
    const savedSortMode = localStorage.getItem(SORT_MODE_STORAGE_KEY)
    if (savedSortMode === "distance" || savedSortMode === "deadline") setSortMode(savedSortMode)
    try {
      const savedCategory = localStorage.getItem(CATEGORY_FILTERS_STORAGE_KEY)
      if (savedCategory) setCategoryFilters(JSON.parse(savedCategory))
      const savedCar = localStorage.getItem(CAR_FILTERS_STORAGE_KEY)
      if (savedCar) setCarFilters(JSON.parse(savedCar))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(CATEGORY_FILTERS_STORAGE_KEY, JSON.stringify(categoryFilters))
  }, [categoryFilters])

  useEffect(() => {
    localStorage.setItem(CAR_FILTERS_STORAGE_KEY, JSON.stringify(carFilters))
  }, [carFilters])

  const handleShowDisabledChange = (checked: boolean) => {
    setShowDisabled(checked)
    localStorage.setItem(SHOW_DISABLED_STORAGE_KEY, String(checked))
  }

  const handleHideUnrecordedChange = (checked: boolean) => {
    setHideUnrecorded(checked)
    localStorage.setItem(HIDE_UNRECORDED_STORAGE_KEY, String(checked))
  }

  const handleSortModeChange = (mode: SortMode) => {
    setSortMode(mode)
    localStorage.setItem(SORT_MODE_STORAGE_KEY, mode)
  }

  const handleUngroupedChange = (checked: boolean) => {
    setIsUngrouped(checked)
    localStorage.setItem(UNGROUP_STORAGE_KEY, String(checked))
  }

  // カードグリッドの列数は実測した横幅から決定
  const gridWrapperRef = useRef<HTMLDivElement>(null)
  const [gridColumns, setGridColumns] = useState(1)

  useEffect(() => {
    const el = gridWrapperRef.current
    if (!el) return

    // カード半分分の余白ができる余裕がなければ列を増やさない
    const computeColumns = (width: number) => {
      let cols = 1
      for (let n = 2; n <= MAX_GRID_COLUMNS; n++) {
        const requiredWidth = n * CARD_WIDTH + (n - 1) * CARD_GAP + CARD_WIDTH / 2
        if (width >= requiredWidth) cols = n
      }
      return cols
    }

    const observer = new ResizeObserver((entries) => {
      setGridColumns(computeColumns(entries[0].contentRect.width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading])

  const gridStyle = { gridTemplateColumns: gridColumns === 1 ? "1fr" : `repeat(${gridColumns}, ${CARD_WIDTH}px)` }
  // カード列の右端にボタンをそろえるため、グリッドの実際の表示幅と同じ幅に制限
  const gridContentWidth = gridColumns > 1 ? gridColumns * CARD_WIDTH + (gridColumns - 1) * CARD_GAP : undefined

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

  // オフ/未記録の項目の表示切り替えを適用したアラート
  const visibleAlerts = alerts.filter((a) => (showDisabled || !a.isDisabled) && (!hideUnrecorded || a.hasRecord))

  // カテゴリ、車の絞り込みを適用したアラート
  const filteredAlerts = visibleAlerts.filter((a) =>
    (categoryFilters.length === 0 || categoryFilters.includes(maintNameToCategory[a.maintName])) &&
    (carFilters.length === 0 || carFilters.includes(a.carId))
  )

  // 選択中の並び順を適用したアラート
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (a.isDisabled !== b.isDisabled) return a.isDisabled ? 1 : -1
    if (a.hasRecord && !b.hasRecord) return -1
    if (!a.hasRecord && b.hasRecord) return 1
    if (!a.hasRecord || !b.hasRecord) return 0
    return sortMode === "distance" ? a.kmRemaining - b.kmRemaining : a.monthsRemaining - b.monthsRemaining
  })

  // 絞り込み中の選択数（バッジ表示用）
  const activeFilterCount = categoryFilters.length + carFilters.length

  // 初回ローディング画面とデータ取得を連動させる
  usePageLoadingGate(!loading)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: userData } = await supabase.from("users").select("maint_settings").eq("id", user.id).single()
      // 保存済み設定に無い項目も既定値で補って表示
      const maintSettings: MaintSettings = { ...DEFAULT_MAINT_SETTINGS, ...(userData?.maint_settings || {}) }

      const { data: carsData } = await supabase.from("cars").select("id, name, current_odo").eq("user_id", user.id).eq("status", "active").eq("is_display_home", true)
      const { data: recordsData } = await supabase.from("records").select("car_id, sub_category, date, odo_at_record, interval_months, cars!inner(status)").eq("user_id", user.id).in("cars.status", ["active", "archived"])

      if (carsData) setCars(carsData)
      if (carsData && recordsData) {
        // オフにした項目も一覧側の表示切り替えで出し分けられるよう、生成時点では除外しない
        setAlerts(generateMaintAlerts(carsData, recordsData as MaintAlertRecord[], maintSettings, { includeDisabled: true }))
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return (
    <main className="p-4 space-y-6">
      <header className="pt-4 pb-2">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors">
          <span className="font-bold text-xs">{t("home.back_to_home")}</span>
        </Link>
      </header>
      <div className="space-y-3" ref={gridWrapperRef}>
        {/* 並び替えトグル、絞り込み、表示設定ボタン（実データ表示時と同じくカード列の右端にそろえる） */}
        <div className="flex items-start justify-between gap-2" style={{ maxWidth: gridContentWidth }}>
          <Skeleton className="h-[30px] w-40 rounded-full" />
          <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
            <Skeleton className="h-7 w-9 rounded-lg" />
            <Skeleton className="h-7 w-28 rounded-lg" />
          </div>
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <SkeletonText size="sm" className="w-24 px-1 mb-2" />
              <div className="grid gap-3 md:gap-4" style={gridStyle}>
                {[...Array(gridColumns)].map((_, j) => (
                  <div key={j} className="rounded-xl bg-white dark:bg-card ring-1 ring-slate-300 dark:ring-border overflow-hidden py-4">
                    <div className="p-3.5 flex items-start gap-3">
                      <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
                      <div className="min-w-0 flex-1">
                        <SkeletonText size="10px" className="w-16" />
                        {/* 実カードはこのブロックが leading-tight のため行間を明示する */}
                        <div className="mt-0.5">
                          <SkeletonText size="11px" leading="tight" className="w-32" />
                          <SkeletonText size="lg" leading="tight" className="mt-0.5 w-24" />
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                          <SkeletonText size="10px" className="w-24" />
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
      </div>
    </main>
  )

  return (
    <main className="p-4 space-y-6">
      <header className="pt-4 pb-2">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors">
          <span className="font-bold text-xs">{t("home.back_to_home")}</span>
        </Link>
      </header>

      <div className="space-y-3" ref={gridWrapperRef}>

      {/* 並び替えトグル、絞り込み、表示設定ボタン（最終列のカード幅にそろえる） */}
      {alerts.length > 0 && (
        <div className="flex items-start justify-between gap-2" style={{ maxWidth: gridContentWidth }}>
          <SegmentedToggle
            value={sortMode}
            onChange={handleSortModeChange}
            options={[
              { value: "distance", label: t("home.sort_distance") },
              { value: "deadline", label: t("home.sort_deadline") },
            ]}
          />
          <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              title={t("records.filter_title")}
              className="relative h-7 flex items-center px-2.5 rounded-lg border bg-white text-slate-600 border-slate-300 hover:text-slate-700 hover:border-slate-400 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground transition-colors"
            >
              <SlidersHorizontal size={15} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-slate-400 text-white dark:bg-surface-2 dark:text-foreground/80 text-[9px] font-bold tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsDisplaySettingsOpen(true)}
              title={t("home.display_settings_title")}
              className="h-7 flex items-center gap-1.5 px-2.5 rounded-lg border text-[11px] font-bold bg-white text-slate-600 border-slate-300 hover:text-slate-700 hover:border-slate-400 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground transition-colors"
            >
              <Settings2 size={15} />
              {t("home.display_settings_title")}
            </button>
          </div>
        </div>
      )}

      {/* 表示設定モーダル */}
      {isDisplaySettingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4" onClick={() => setIsDisplaySettingsOpen(false)}>
          <Card className="border-none bg-white dark:bg-card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-800 dark:text-foreground">
                <Settings2 size={20} />
                <h2 className="text-lg font-bold">{t("home.display_settings_title")}</h2>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-border px-3 py-2.5">
                <div className="min-w-0 flex items-start gap-2.5">
                  <EyeOff size={18} className="shrink-0 mt-0.5 text-slate-500 dark:text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-foreground">{t("home.show_disabled_maint")}</p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">{t("home.show_disabled_maint_desc")}</p>
                  </div>
                </div>
                <Switch checked={showDisabled} onCheckedChange={handleShowDisabledChange} className="shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-border px-3 py-2.5">
                <div className="min-w-0 flex items-start gap-2.5">
                  <FileX size={18} className="shrink-0 mt-0.5 text-slate-500 dark:text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-foreground">{t("home.hide_unrecorded_maint")}</p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">{t("home.hide_unrecorded_maint_desc")}</p>
                  </div>
                </div>
                <Switch checked={hideUnrecorded} onCheckedChange={handleHideUnrecordedChange} className="shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-border px-3 py-2.5">
                <div className="min-w-0 flex items-start gap-2.5">
                  <LayoutList size={18} className="shrink-0 mt-0.5 text-slate-500 dark:text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-foreground">{t("home.ungroup_maint")}</p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">{t("home.ungroup_maint_desc")}</p>
                  </div>
                </div>
                <Switch checked={isUngrouped} onCheckedChange={handleUngroupedChange} className="shrink-0" />
              </div>

              <div className="flex justify-center pt-6">
                <Button
                  variant="outline"
                  className="px-10 font-bold bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background dark:bg-foreground dark:text-background dark:border-foreground dark:hover:bg-foreground/90"
                  onClick={() => setIsDisplaySettingsOpen(false)}
                >
                  {t("common.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* カテゴリ、車の絞り込みモーダル */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4" onClick={() => setIsFilterOpen(false)}>
          <Card className="border-none bg-white dark:bg-card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-800 dark:text-foreground">
                <SlidersHorizontal size={20} />
                <h2 className="text-lg font-bold">{t("records.filter_title")}</h2>
              </div>

              {/* カテゴリ絞り込み */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 dark:text-muted-foreground">{t("records.category")}</p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    {...chipTapHandlers(() => setCategoryFilters([]))}
                    aria-pressed={categoryFilters.length === 0}
                    className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-colors touch-manipulation ${
                      categoryFilters.length === 0
                        ? "bg-black text-white border-black dark:bg-foreground dark:text-background dark:border-foreground"
                        : "bg-white text-slate-600 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
                    }`}
                  >
                    {t("records.filter_all")}
                    <span className="ml-1.5 tabular-nums opacity-60">{visibleAlerts.length}</span>
                  </button>
                  {MAINT_CATEGORIES.map((category) => {
                    const active = categoryFilters.includes(category.key)
                    const count = visibleAlerts.filter((a) => maintNameToCategory[a.maintName] === category.key).length
                    if (count === 0) return null
                    return (
                      <button
                        key={category.key}
                        type="button"
                        {...chipTapHandlers(() => toggleCategoryFilter(category.key))}
                        aria-pressed={active}
                        className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-colors touch-manipulation ${
                          active
                            ? "bg-black text-white border-black dark:bg-foreground dark:text-background dark:border-foreground"
                            : "bg-white text-slate-600 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
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
                  <p className="text-xs font-bold text-slate-600 dark:text-muted-foreground">{t("records.filter_car")}</p>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      {...chipTapHandlers(() => setCarFilters([]))}
                      aria-pressed={carFilters.length === 0}
                      className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-colors touch-manipulation ${
                        carFilters.length === 0
                          ? "bg-black text-white border-black dark:bg-foreground dark:text-background dark:border-foreground"
                          : "bg-white text-slate-600 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
                      }`}
                    >
                      {t("records.filter_all")}
                      <span className="ml-1.5 tabular-nums opacity-60">{visibleAlerts.length}</span>
                    </button>
                    {cars.map((car) => {
                      const active = carFilters.includes(car.id)
                      const count = visibleAlerts.filter((a) => a.carId === car.id).length
                      return (
                        <button
                          key={car.id}
                          type="button"
                          {...chipTapHandlers(() => toggleCarFilter(car.id))}
                          aria-pressed={active}
                          className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-colors touch-manipulation ${
                            active
                              ? "bg-black text-white border-black dark:bg-foreground dark:text-background dark:border-foreground"
                              : "bg-white text-slate-600 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
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

              <div className="flex justify-center pt-6">
                <Button
                  variant="outline"
                  className="px-10 font-bold bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background dark:bg-foreground dark:text-background dark:border-foreground dark:hover:bg-foreground/90"
                  onClick={() => setIsFilterOpen(false)}
                >
                  {t("common.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {cars.length === 0 ? (
        <Card className="border-none bg-white dark:bg-card p-10 text-center">
          <CarFront className="mx-auto h-12 w-12 text-slate-200 dark:text-muted-foreground mb-3" />
          <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground mb-4 tracking-tighter">{t("home.no_cars_registered")}</p>
          <Link href="/garage"><Button className="font-bold text-xs px-6 tracking-wide">{t("home.register")}</Button></Link>
        </Card>
      ) : alerts.length === 0 ? (
        <Card className="border-none bg-white dark:bg-card p-6 text-center">
          <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground tracking-wide">{t("home.no_alerts")}</p>
        </Card>
      ) : filteredAlerts.length === 0 ? (
        <Card className="border-none bg-white dark:bg-card p-6 text-center">
          <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground tracking-wide">{t("home.no_filtered_alerts")}</p>
        </Card>
      ) : isUngrouped ? (
        <div className="grid gap-3 md:gap-4 items-stretch mt-6" style={gridStyle}>
          {sortedAlerts.map((alert) => (
            <MaintAlertCard key={alert.id} alert={alert} className="h-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {MAINT_CATEGORIES.map((category) => {
            const items = category.items.flatMap((maintName) => sortedAlerts.filter((a) => a.maintName === maintName))
            if (items.length === 0) return null
            return (
              <div key={category.key}>
                <p className="text-sm font-bold text-slate-500 dark:text-muted-foreground tracking-wide mb-2 px-1">
                  {t(`mypage.maint_category_${category.key}`)}
                </p>
                <div className="grid gap-3 md:gap-4 items-stretch" style={gridStyle}>
                  {items.map((alert) => (
                    <MaintAlertCard key={alert.id} alert={alert} className="h-full" />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      </div>
    </main>
  )
}
