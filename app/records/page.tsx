"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/NumberInput"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X, Fuel, Wrench, Settings, Receipt, Shield, FileText, CarFront, Pencil, Trash2, Ticket, ChevronLeft, ChevronRight, ArrowRight, Hammer, ClipboardList, Droplets, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n"
import { usePageLoadingGate } from "@/lib/loadingGate"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SegmentedToggle } from "@/components/ui/SegmentedToggle"
import { Skeleton, SkeletonTabs } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import RecurringTab from "@/components/RecurringTab"
import { SUB_CATEGORIES } from "@/lib/subcategories"

export const CATEGORIES: Record<string, any> = {
  fuel: { icon: Fuel, color: "text-blue-500", bg: "bg-blue-50 dark:bg-surface-2" },
  maintenance: { icon: Wrench, color: "text-orange-500", bg: "bg-orange-50 dark:bg-surface-2" },
  inspection: { icon: ClipboardList, color: "text-teal-500", bg: "bg-teal-50 dark:bg-surface-2" },
  repair: { icon: Hammer, color: "text-rose-500", bg: "bg-rose-50 dark:bg-surface-2" },
  custom: { icon: Settings, color: "text-purple-500", bg: "bg-purple-50 dark:bg-surface-2" },
  carwash: { icon: Droplets, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-surface-2" },
  highway: { icon: Ticket, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-surface-2" },
  tax: { icon: Receipt, color: "text-red-500", bg: "bg-red-50 dark:bg-surface-2" },
  insurance: { icon: Shield, color: "text-green-500", bg: "bg-green-50 dark:bg-surface-2" },
  other: { icon: FileText, color: "text-slate-500 dark:text-muted-foreground", bg: "bg-slate-50 dark:bg-surface-2" },
}

// 給油フォーム内の自動計算ハンドラー（コンポーネント外に定義）
type FuelCalcField = "amount" | "fuelUnitPrice" | "fuelAmount"

// スケルトンUIコンポーネント
const RecordSkeleton = () => (
  <div className="space-y-4">
    <SkeletonTabs className="mb-6" />
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-card rounded-xl shadow-sm dark:border dark:border-border overflow-hidden">
        <div className="p-4 flex gap-4 items-start">
          {/* アイコン */}
          <Skeleton className="w-12 h-12 rounded-full shrink-0 mt-1" />
          <div className="flex-1 min-w-0 pr-14 space-y-2">
            {/* 金額 */}
            <Skeleton className="h-6 w-28 rounded-lg" />
            {/* タグ */}
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            {/* 車名・ODO */}
            <Skeleton className="h-4 w-36" />
            {/* 日付 */}
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

// 新規追加 or 編集に使うフォームのJSX
const RecordForm = ({
  onSubmit,
  submitLabel,
  isSubmitting,
  resetForm,
  editRecordId,
  carId, setCarId,
  cars,
  category, setCategory,
  subCategory, setSubCategory,
  amount, setAmount,
  date, setDate,
  odoAtRecord, setOdoAtRecord,
  fuelAmount,
  fuelUnitPrice,
  memo, setMemo,
  onFuelFieldChange,
  entryIc, setEntryIc,
  exitIc, setExitIc,
}: any) => {
  const { t } = useTranslation()
  // 選択中の車がEVのとき、給油フォームを充電(kWh建て)表示に切り替える
  const selectedCar = cars.find((c: { id: string; fuel_type?: string }) => c.id === carId)
  const isEv = selectedCar?.fuel_type === "ev"
  return (
  <Card className="border-none shadow-lg bg-white dark:bg-card">
    <CardContent className="p-6 relative">
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-400 dark:text-muted-foreground" onClick={resetForm}>
        <X className="h-4 w-4" />
      </Button>
      <h2 className="text-xl font-extrabold text-slate-800 dark:text-foreground mb-6">
        {editRecordId ? t("records.edit_record") : t("records.new_record")}
      </h2>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-x-8 sm:max-w-[50rem]">
          <div className="space-y-2">
            <Label>{t("common.target_car")} <span className="text-red-500">{t("common.required")}</span></Label>
            <Select value={carId} onValueChange={setCarId} required>
              <SelectTrigger className="w-full"><SelectValue placeholder={t("common.select_car")} /></SelectTrigger>
              <SelectContent>
                {cars.map((car: any) => <SelectItem key={car.id} value={car.id}>{car.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("records.category")} <span className="text-red-500">{t("common.required")}</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full"><SelectValue placeholder={t("records.category")} /></SelectTrigger>
              <SelectContent>
                {Object.keys(CATEGORIES).map(key => (
                  <SelectItem key={key} value={key}>{t(`categories.${key}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {SUB_CATEGORIES[category] && (
          <div className="space-y-2 w-1/2 pr-1.5 sm:pr-0 sm:max-w-sm">
            <Label>{t("records.subcategory")}</Label>
            <Select value={subCategory} onValueChange={setSubCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("common.please_select")} />
              </SelectTrigger>
              <SelectContent>
                {SUB_CATEGORIES[category].map(sub => (
                  <SelectItem key={sub} value={sub}>{t(`subcategories.${sub}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("records.date")} <span className="text-red-500">{t("common.required")}</span></Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="max-w-40" />
        </div>

        <div className="space-y-2">
          <Label>{t("records.odometer_km")} <span className="text-slate-400 dark:text-muted-foreground font-normal text-xs">{t("records.optional")}</span></Label>
          <NumberInput value={odoAtRecord} onValueChange={setOdoAtRecord} placeholder="52,500" className="max-w-40" />
        </div>

        {category === "fuel" ? (
          <div className="rounded-2xl bg-slate-50 dark:bg-muted border border-slate-200 dark:border-border p-4 space-y-4 sm:max-w-sm">
            <div className="flex items-center gap-2 mb-1">
              <Fuel size={15} className="text-slate-400 dark:text-muted-foreground" />
              <span className="text-sm font-bold text-slate-600 dark:text-muted-foreground">{isEv ? t("records.charge_info") : t("records.fuel_info")}</span>
            </div>

            {/* 単価 */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600 dark:text-muted-foreground">{isEv ? t("records.unit_price_kwh") : t("records.unit_price")}</Label>
              <div className="relative max-w-40">
                <NumberInput
                  decimal
                  value={fuelUnitPrice}
                  onValueChange={value => onFuelFieldChange("fuelUnitPrice", value)}
                  placeholder={isEv ? "30" : "170"}
                  className="bg-white dark:bg-card border-slate-200 dark:border-border focus:border-slate-400 pr-12 placeholder:text-slate-300 dark:placeholder:text-muted-foreground"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-muted-foreground pointer-events-none">{isEv ? t("records.unit_yen_per_kwh") : t("records.unit_yen_per_l")}</span>
              </div>
            </div>

            {/* リットル / kWh */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600 dark:text-muted-foreground">{isEv ? t("records.charge_amount") : t("records.fuel_amount")}</Label>
              <div className="relative max-w-40">
                <NumberInput
                  decimal
                  value={fuelAmount}
                  onValueChange={value => onFuelFieldChange("fuelAmount", value)}
                  placeholder={isEv ? "30.0" : "40.0"}
                  className="bg-white dark:bg-card border-slate-200 dark:border-border focus:border-slate-400 pr-8 placeholder:text-slate-300 dark:placeholder:text-muted-foreground"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-muted-foreground pointer-events-none">{isEv ? t("records.unit_kwh") : t("records.unit_l")}</span>
              </div>
            </div>

            {/* 区切り線 */}
            <div className="flex items-center gap-2 max-w-40">
              <div className="flex-1 h-px bg-slate-200 dark:bg-border" />
              <span className="text-[10px] text-slate-400 dark:text-muted-foreground font-bold">=</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-border" />
            </div>

            {/* 総額 */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600 dark:text-muted-foreground">{t("records.total_amount")} <span className="text-red-400">{t("common.required")}</span></Label>
              <div className="relative max-w-40">
                <NumberInput
                  value={amount}
                  onValueChange={value => onFuelFieldChange("amount", value)}
                  required
                  placeholder="6,800"
                  className="bg-white dark:bg-card border-slate-200 dark:border-border focus:border-slate-400 font-bold text-slate-800 dark:text-foreground pr-8 placeholder:text-slate-300 dark:placeholder:text-muted-foreground"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-muted-foreground pointer-events-none">{t("records.unit_yen")}</span>
              </div>
            </div>
          </div>
        ) : category === "highway" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:gap-x-8 sm:max-w-[50rem]">
              <div className="space-y-2">
                <Label>{t("records.entry_ic")} <span className="text-slate-400 dark:text-muted-foreground font-normal text-[10px]">{t("records.optional")}</span></Label>
                <Input type="text" value={entryIc} onChange={e => setEntryIc(e.target.value)} placeholder="" className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label>{t("records.exit_ic")} <span className="text-slate-400 dark:text-muted-foreground font-normal text-[10px]">{t("records.optional")}</span></Label>
                <Input type="text" value={exitIc} onChange={e => setExitIc(e.target.value)} placeholder="" className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("records.amount_yen")} <span className="text-red-500">{t("common.required")}</span></Label>
              <NumberInput value={amount} onValueChange={setAmount} required placeholder="1,320" className="max-w-40 placeholder:text-slate-300 dark:placeholder:text-muted-foreground" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>{t("records.amount_yen")} <span className="text-red-500">{t("common.required")}</span></Label>
            <NumberInput value={amount} onValueChange={setAmount} required placeholder="5,000" className="max-w-40" />
          </div>
        )}

        <div className="space-y-2 sm:max-w-[50rem]">
          <Label>{t("common.memo")}</Label>
          <Textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder={t("records.memo_placeholder")} className="resize-none" />
        </div>

        <div className="pt-4 flex justify-center">
          <Button type="submit" className="px-12 font-bold" disabled={isSubmitting}>
            {isSubmitting ? t("common.saving") : submitLabel}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
)}

function RecordsPageInner() {
  const [cars, setCars] = useState<any[]>([])
  const[records, setRecords] = useState<any[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  // 編集モード用
  const [editRecordId, setEditRecordId] = useState<string | null>(null)
  const supabase = createClient()
  const { t, locale } = useTranslation()

  // 初回ローディング画面とデータ取得を連動させる
  usePageLoadingGate(!loading)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [carId, setCarId] = useState("")
  const [category, setCategory] = useState("fuel")
  const [subCategory, setSubCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [odoAtRecord, setOdoAtRecord] = useState("")
  const [fuelAmount, setFuelAmount] = useState("")
  const [fuelUnitPrice, setFuelUnitPrice] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [memo, setMemo] = useState("")

  // 高速料金用ステート
  const [entryIc, setEntryIc] = useState("")
  const [exitIc, setExitIc] = useState("")

  // 月別・全期間 表示切り替え
  const currentYM = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()
  const [viewMode, setViewMode] = useState<"month" | "all">("month")
  const [selectedYearMonth, setSelectedYearMonth] = useState(currentYM)

  useEffect(() => {
    const saved = localStorage.getItem("records_view_mode") as "month" | "all"
    if (saved === "month" || saved === "all") setViewMode(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem("records_view_mode", viewMode)
  }, [viewMode])

  const goToPrevMonth = () => {
    const [y, m] = selectedYearMonth.split('-').map(Number)
    const d = new Date(y, m - 2)
    setSelectedYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const goToNextMonth = () => {
    const [y, m] = selectedYearMonth.split('-').map(Number)
    const d = new Date(y, m)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (next <= currentYM) setSelectedYearMonth(next)
  }
  const [displayYear, displayMonth] = selectedYearMonth.split('-').map(Number)
  const monthLabel = locale === "en"
    ? new Date(displayYear, displayMonth - 1).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : `${displayYear}年${displayMonth}月`
  const displayedRecords = viewMode === "month"
    ? records.filter(r => r.date.startsWith(selectedYearMonth))
    : records

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

  // 絞り込みチップに出す車の一覧（元愛車の記録も含めるため cars ではなく records から導出する）
  const filterCars: { id: string; name: string }[] = []
  records.forEach((r) => {
    if (!filterCars.some((c) => c.id === r.car_id)) filterCars.push({ id: r.car_id, name: r.cars?.name ?? "" })
  })

  // カテゴリ、車の絞り込みを適用した記録（月別/全期間の表示範囲が母数）
  const filteredRecords = displayedRecords.filter((r) =>
    (categoryFilters.length === 0 || categoryFilters.includes(r.category)) &&
    (carFilters.length === 0 || carFilters.includes(r.car_id))
  )

  // 絞り込み中の選択数（バッジ表示用）
  const activeFilterCount = categoryFilters.length + carFilters.length

  // カテゴリをユーザーが手動で切り替えたときだけサブカテゴリをデフォルト値にリセットする
  // （編集開始時の setCategory にも反応してしまうと、保存済みのサブカテゴリが上書きされてしまうため）
  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    setSubCategory(SUB_CATEGORIES[newCategory] ? SUB_CATEGORIES[newCategory][0] : "")
  }

  // showLoading=false でスケルトンを出さずにサイレント再取得
  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: carsData } = await supabase.from("cars").select("*").eq("user_id", user.id).eq("status", "active")
      if (carsData) {
        setCars(carsData)
        if (carsData.length === 1) setCarId(carsData[0].id)
      }

      const { data: recordsData } = await supabase
        .from("records")
        .select(`*, cars!inner(name, fuel_type, status)`)
        .eq("user_id", user.id)
        .in("cars.status", ["active", "archived"])
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
      if (recordsData) setRecords(recordsData)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() },[])

  // URLパラメータで給油フォームを自動展開
  const searchParams = useSearchParams()
  useEffect(() => {
    if (!loading && searchParams.get("action") === "add") {
      const cat = searchParams.get("category") || "fuel"
      handleCategoryChange(cat)
      setIsAdding(true)
      // スクロールをページ上部へ
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [loading])

  // 給油フィールドの相互自動計算ハンドラー
  const handleFuelFieldChange = (field: FuelCalcField, value: string) => {
    const toNum = (v: string) => parseFloat(v)
    if (field === "fuelUnitPrice") {
      setFuelUnitPrice(value)
      const price = toNum(value)
      const liters = toNum(fuelAmount)
      const total = toNum(amount)
      if (!isNaN(price) && !isNaN(liters)) {
        setAmount(Math.round(price * liters).toString())
      } else if (!isNaN(price) && !isNaN(total)) {
        setFuelAmount((total / price).toFixed(2))
      }
    } else if (field === "fuelAmount") {
      setFuelAmount(value)
      const liters = toNum(value)
      const price = toNum(fuelUnitPrice)
      const total = toNum(amount)
      if (!isNaN(liters) && !isNaN(price)) {
        setAmount(Math.round(liters * price).toString())
      } else if (!isNaN(liters) && !isNaN(total)) {
        setFuelUnitPrice((total / liters).toFixed(2))
      }
    } else if (field === "amount") {
      setAmount(value)
      const total = toNum(value)
      const price = toNum(fuelUnitPrice)
      const liters = toNum(fuelAmount)
      if (!isNaN(total) && !isNaN(price)) {
        setFuelAmount((total / price).toFixed(2))
      } else if (!isNaN(total) && !isNaN(liters)) {
        setFuelUnitPrice((total / liters).toFixed(2))
      }
    }
  }

  // フォームのリセット
  const resetForm = () => {
    setIsAdding(false)
    setEditRecordId(null)
    // フォームを閉じて一覧に戻るとき、フォーム下部までスクロールした位置が残らないようにページトップへ戻す
    window.scrollTo({ top: 0 })
    setAmount(""); setOdoAtRecord(""); setFuelAmount(""); setFuelUnitPrice(""); setMemo("")
    setEntryIc(""); setExitIc("")
    setCategory("fuel")
    setSubCategory("")
    const firstCarId = cars.length === 1 ? cars[0].id : ""
    setCarId(firstCarId)
  }

  // 車の総走行距離(current_odo)を残っている記録の最大ODOに合わせて再計算する
  // 記録の削除・編集で過大なODO値（桁間違いなど）が残らないようにするための処理
  // 記録が無くなった場合や記録より大きい場合は購入時ODO(purchase_odo)を下限とする
  const recalcCarOdo = async (targetCarId: string) => {
    const targetCar = cars.find(c => c.id === targetCarId)
    const baseOdo = targetCar?.purchase_odo || 0
    const { data: remaining } = await supabase
      .from("records")
      .select("odo_at_record")
      .eq("car_id", targetCarId)
    const maxRecordOdo = remaining && remaining.length > 0
      ? Math.max(...remaining.map((r: { odo_at_record: number | null }) => r.odo_at_record ?? 0))
      : 0
    await supabase.from("cars").update({ current_odo: Math.max(maxRecordOdo, baseOdo) }).eq("id", targetCarId)
  }

  // 記録データの保存処理
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!carId) return alert(t("records.select_car_alert"))

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const targetCar = cars.find(c => c.id === carId)
      const fallbackOdo = targetCar ? targetCar.current_odo : 0

      const { error: recordError } = await supabase.from("records").insert({
        user_id: user.id,
        car_id: carId,
        category,
        sub_category: subCategory || null,
        amount: parseInt(amount),
        odo_at_record: odoAtRecord ? parseInt(odoAtRecord) : fallbackOdo,
        fuel_amount: category === "fuel" ? parseFloat(fuelAmount) : null,
        date,
        memo: memo || null,
        entry_ic: category === "highway" ? (entryIc || null) : null,
        exit_ic: category === "highway" ? (exitIc || null) : null,
      })

      if (recordError) return toast.error(t("common.error_occurred") + ": " + recordError.message)

      await recalcCarOdo(carId)

      toast.success(t("records.saved"))
      resetForm()
      fetchData(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 記録編集モードの開始
  const handleStartEdit = (record: any) => {
    setEditRecordId(record.id)
    setIsAdding(false)
    // 一覧の下のほうで編集を開始してもフォームが先頭から見えるようにページトップへ戻す
    window.scrollTo({ top: 0, behavior: "smooth" })
    setCarId(record.car_id)
    setCategory(record.category)
    setSubCategory(record.sub_category || "")
    setAmount(String(record.amount))
    setOdoAtRecord(record.odo_at_record ? String(record.odo_at_record) : "")
    const liters = record.fuel_amount ? parseFloat(record.fuel_amount) : null
    const total = record.amount ? record.amount : null
    setFuelAmount(liters ? String(liters) : "")
    setFuelUnitPrice(liters && total ? (total / liters).toFixed(2) : "")
    setDate(record.date)
    
    if (record.category === "highway") {
      setEntryIc(record.entry_ic || "")
      setExitIc(record.exit_ic || "")
    } else {
      setEntryIc("")
      setExitIc("")
    }
    setMemo(record.memo || "")
  }

  // 記録データの更新処理
  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRecordId) return

    setIsSubmitting(true)
    try {
      const targetCar = cars.find(c => c.id === carId)
      const fallbackOdo = targetCar ? targetCar.current_odo : 0

      const { error } = await supabase.from("records").update({
        car_id: carId,
        category,
        sub_category: subCategory || null,
        amount: parseInt(amount),
        odo_at_record: odoAtRecord ? parseInt(odoAtRecord) : fallbackOdo,
        fuel_amount: category === "fuel" ? parseFloat(fuelAmount) : null,
        date,
        memo: memo || null,
        entry_ic: category === "highway" ? (entryIc || null) : null,
        exit_ic: category === "highway" ? (exitIc || null) : null,
      }).eq("id", editRecordId)

      if (error) {
        toast.error(t("common.error_occurred") + ": " + error.message)
      } else {
        await recalcCarOdo(carId)
        toast.success(t("records.updated"))
        resetForm()
        fetchData(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 記録データの削除処理
  const handleDeleteRecord = async () => {
    if (!deleteRecordId) return
    setIsDeleting(true)
    const targetRecord = records.find(r => r.id === deleteRecordId)
    const { error } = await supabase.from("records").delete().eq("id", deleteRecordId)
    if (error) {
      toast.error(t("common.delete_failed") + ": " + error.message)
    } else {
      if (targetRecord) await recalcCarOdo(targetRecord.car_id)
      toast.success(t("records.deleted"))
      // 一覧からは即時に取り除き、ODO再計算後の車データはサイレント再取得で同期
      setRecords(prev => prev.filter(r => r.id !== deleteRecordId))
      fetchData(false)
    }
    setIsDeleting(false)
    setDeleteRecordId(null)
  }


  return (
    <main className="p-4 space-y-6">
      <header className="pt-4 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">{t("records.title")}</h1>
        <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground tracking-wider mt-1">{t("records.subtitle")}</p>
      </header>

      {loading && <RecordSkeleton />}

      {!loading && cars.length === 0 && (
        <div className="text-center py-20">
          <CarFront className="mx-auto h-12 w-12 text-slate-300 dark:text-muted-foreground mb-3" />
          <p className="text-slate-500 dark:text-muted-foreground font-medium mb-4">{t("records.register_car_first_line1")}<br/>{t("records.register_car_first_line2")}</p>
          <Link href="/garage"><Button className="font-bold">{t("records.go_to_garage")}</Button></Link>
        </div>
      )}

      {!loading && cars.length > 0 && (
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="manual" className="font-bold">{t("records.tab_manual")}</TabsTrigger>
            <TabsTrigger value="recurring" className="font-bold">{t("records.tab_recurring")}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-6 outline-none">
            {!isAdding && !editRecordId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SegmentedToggle
                    value={viewMode}
                    onChange={setViewMode}
                    options={[
                      { value: "month", label: t("records.view_by_month") },
                      { value: "all", label: t("records.view_all") },
                    ]}
                  />
                  <div className="flex items-center gap-4">
                    {/* 絞り込みボタン（記録があるときのみ表示、絞り込み中は選択数をバッジ表示） */}
                    {records.length > 0 && (
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
                    )}
                    <Button onClick={() => setIsAdding(true)} size="sm" className="font-bold">
                      <Plus className="mr-1 h-4 w-4" /> {t("records.add_record")}
                    </Button>
                  </div>
                </div>
                {viewMode === "month" && (
                  <div className="flex items-center justify-center gap-4">
                    <button onClick={goToPrevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-muted transition-colors">
                      <ChevronLeft size={18} className="text-slate-600 dark:text-muted-foreground" />
                    </button>
                    <span className="font-bold text-slate-700 dark:text-foreground min-w-[120px] text-center">
                      {monthLabel}
                    </span>
                    <button
                      onClick={goToNextMonth}
                      disabled={selectedYearMonth >= currentYM}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-muted transition-colors disabled:opacity-30"
                    >
                      <ChevronRight size={18} className="text-slate-600 dark:text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* カテゴリ・車の絞り込みモーダル */}
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
                        {/* すべて */}
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
                          <span className="ml-1.5 tabular-nums opacity-60">{displayedRecords.length}</span>
                        </button>
                        {/* 各カテゴリチップ */}
                        {Object.keys(CATEGORIES).map((key) => {
                          const active = categoryFilters.includes(key)
                          const count = displayedRecords.filter((r) => r.category === key).length
                          return (
                            <button
                              key={key}
                              type="button"
                              {...chipTapHandlers(() => toggleCategoryFilter(key))}
                              aria-pressed={active}
                              className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-colors touch-manipulation ${
                                active
                                  ? "bg-slate-800 text-white border-slate-800 dark:bg-foreground dark:text-background dark:border-foreground"
                                  : "bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
                              }`}
                            >
                              {t(`categories.${key}`)}
                              <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 車絞り込み */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground">{t("records.filter_car")}</p>
                      <div className="flex flex-wrap gap-2.5">
                        {/* すべて */}
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
                          <span className="ml-1.5 tabular-nums opacity-60">{displayedRecords.length}</span>
                        </button>
                        {/* 各車チップ */}
                        {filterCars.map((car) => {
                          const active = carFilters.includes(car.id)
                          const count = displayedRecords.filter((r) => r.car_id === car.id).length
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
                    <Button variant="outline" className="w-full font-bold" onClick={() => setIsFilterOpen(false)}>
                      {t("common.close")}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

      {isAdding && <RecordForm
          onSubmit={handleAddRecord} 
          submitLabel={t("records.save_record")}
          isSubmitting={isSubmitting}
          resetForm={resetForm}
          editRecordId={editRecordId}
          carId={carId} setCarId={setCarId}
          cars={cars}
          category={category} setCategory={handleCategoryChange}
          subCategory={subCategory} setSubCategory={setSubCategory}
          amount={amount} setAmount={setAmount}
          date={date} setDate={setDate}
          odoAtRecord={odoAtRecord} setOdoAtRecord={setOdoAtRecord}
          fuelAmount={fuelAmount} setFuelAmount={setFuelAmount}
          fuelUnitPrice={fuelUnitPrice} setFuelUnitPrice={setFuelUnitPrice}
          memo={memo} setMemo={setMemo}
          onFuelFieldChange={handleFuelFieldChange}
          entryIc={entryIc} setEntryIc={setEntryIc}
          exitIc={exitIc} setExitIc={setExitIc}
      />}
      {editRecordId && <RecordForm 
          onSubmit={handleUpdateRecord} 
          submitLabel={t("common.update")}
          isSubmitting={isSubmitting}
          resetForm={resetForm}
          editRecordId={editRecordId}
          carId={carId} setCarId={setCarId}
          cars={cars}
          category={category} setCategory={handleCategoryChange}
          subCategory={subCategory} setSubCategory={setSubCategory}
          amount={amount} setAmount={setAmount}
          date={date} setDate={setDate}
          odoAtRecord={odoAtRecord} setOdoAtRecord={setOdoAtRecord}
          fuelAmount={fuelAmount} setFuelAmount={setFuelAmount}
          fuelUnitPrice={fuelUnitPrice} setFuelUnitPrice={setFuelUnitPrice}
          memo={memo} setMemo={setMemo}
          onFuelFieldChange={handleFuelFieldChange}
          entryIc={entryIc} setEntryIc={setEntryIc}
          exitIc={exitIc} setExitIc={setExitIc}
      />}

      {!loading && !isAdding && !editRecordId && records.length === 0 && cars.length > 0 && (
        <p className="text-center text-slate-500 dark:text-muted-foreground py-20">{t("records.no_records_line1")}<br/>{t("records.no_records_line2")}</p>
      )}

      {!loading && !isAdding && !editRecordId && records.length > 0 && displayedRecords.length === 0 && (
        <p className="text-center text-slate-400 dark:text-muted-foreground py-20 font-medium">
          {t("records.no_records_in_month", { label: monthLabel })}
        </p>
      )}

      {!loading && !isAdding && !editRecordId && displayedRecords.length > 0 && filteredRecords.length === 0 && (
        <p className="text-center text-slate-400 dark:text-muted-foreground py-20 font-medium">
          {t("records.no_filtered_records")}
        </p>
      )}

      {!loading && !isAdding && !editRecordId && filteredRecords.length > 0 && (
        <div className="space-y-4">
          {filteredRecords.map((record) => {
            const cat = CATEGORIES[record.category] || CATEGORIES.other
            const Icon = cat.icon

            return (
              <Card key={record.id} className="border-none shadow-sm bg-white dark:bg-card overflow-hidden relative">
                <CardContent className="p-0">
                  {/* 編集・削除ボタン（右上に常時表示） */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(record)}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-border text-slate-500 dark:text-muted-foreground hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      title={t("common.edit")}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteRecordId(record.id)}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-border text-slate-500 dark:text-muted-foreground hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
                      title={t("common.delete")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="p-4 flex gap-4 items-start">
                    <div className={`p-3 rounded-full shrink-0 mt-1 ${cat.bg} ${cat.color}`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1 min-w-0 pr-14">
                      {/* 金額 */}
                      <h3 className="font-bold text-slate-800 dark:text-foreground text-lg mb-1">¥{record.amount.toLocaleString()}</h3>
                      
                      {/* ジャンルタグ */}
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-muted-foreground mb-2 flex-wrap">
                        <span className="bg-slate-100 dark:bg-surface-2 px-2 py-1 rounded-md">{t(`categories.${record.category}`)}</span>
                        {record.sub_category && (
                          <span className="border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground px-2 py-1 rounded-md">
                            {t(`subcategories.${record.sub_category}`)}
                          </span>
                        )}
                      </div>

                      {/* 車名・走行距離 */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-muted-foreground mb-1">
                        <span className="font-bold">{record.cars.name}</span>
                        {record.odo_at_record != null && (
                          <span>{record.odo_at_record.toLocaleString()} {t("common.km_unit")}</span>
                        )}
                      </div>

                      {/* 日付 */}
                      <p className="text-[11px] font-medium text-slate-400 dark:text-muted-foreground mb-2">{record.date.replace(/-/g, '/')}</p>

                      {record.category === "fuel" && record.fuel_amount && (
                        <p className="text-xs text-slate-500 dark:text-muted-foreground mb-2">
                          {record.cars?.fuel_type === "ev" ? t("records.charge_amount_label") : t("records.fuel_amount_label")} <span className="font-bold text-slate-700 dark:text-foreground">{record.fuel_amount} {record.cars?.fuel_type === "ev" ? t("records.unit_kwh") : t("records.unit_l")}</span>
                        </p>
                      )}
                      {record.category === "highway" && (record.entry_ic || record.exit_ic) && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-muted-foreground mb-2">
                          <span>{t("records.route_display_label")}</span>
                          <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-foreground">
                            {record.entry_ic || t("records.not_entered")}
                            <ArrowRight size={12} className="shrink-0" />
                            {record.exit_ic || t("records.not_entered")}
                          </span>
                        </div>
                      )}
                      {record.memo && (
                        <p className="text-sm text-slate-600 dark:text-muted-foreground bg-slate-50 dark:bg-muted p-2 rounded-md whitespace-pre-wrap inline-block">
                          {record.memo}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
          </TabsContent>

          <TabsContent value="recurring" className="outline-none">
            <RecurringTab cars={cars} onRecordsChanged={fetchData} />
          </TabsContent>
        </Tabs>
      )}

      <ConfirmDialog
        open={deleteRecordId !== null}
        onOpenChange={(open) => { if (!open) setDeleteRecordId(null) }}
        title={t("common.confirm_delete_title")}
        message={t("records.confirm_delete")}
        loading={isDeleting}
        onConfirm={handleDeleteRecord}
      />
    </main>
  )
}

export default function RecordsPage() {
  return (
    <Suspense>
      <RecordsPageInner />
    </Suspense>
  )
}