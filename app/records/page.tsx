"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X, Fuel, Wrench, Settings, Receipt, Shield, FileText, CarFront, Pencil, Trash2, Ticket, ChevronLeft, ChevronRight, Hammer, ClipboardList, Droplets } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n"
import { usePageLoadingGate } from "@/lib/loadingGate"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SegmentedToggle } from "@/components/ui/SegmentedToggle"
import RecurringTab from "@/components/RecurringTab"
import { SUB_CATEGORIES } from "@/lib/subcategories"

export const CATEGORIES: Record<string, any> = {
  fuel: { icon: Fuel, color: "text-blue-500", bg: "bg-blue-50" },
  maintenance: { icon: Wrench, color: "text-orange-500", bg: "bg-orange-50" },
  inspection: { icon: ClipboardList, color: "text-teal-500", bg: "bg-teal-50" },
  repair: { icon: Hammer, color: "text-rose-500", bg: "bg-rose-50" },
  custom: { icon: Settings, color: "text-purple-500", bg: "bg-purple-50" },
  carwash: { icon: Droplets, color: "text-cyan-500", bg: "bg-cyan-50" },
  highway: { icon: Ticket, color: "text-indigo-500", bg: "bg-indigo-50" },
  tax: { icon: Receipt, color: "text-red-500", bg: "bg-red-50" },
  insurance: { icon: Shield, color: "text-green-500", bg: "bg-green-50" },
  other: { icon: FileText, color: "text-slate-500", bg: "bg-slate-50" },
}

// 給油フォーム内の自動計算ハンドラー（コンポーネント外に定義）
type FuelCalcField = "amount" | "fuelUnitPrice" | "fuelAmount"

// スケルトンUIコンポーネント
const RecordSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 flex gap-4 items-start">
          {/* アイコン */}
          <div className="w-12 h-12 rounded-full bg-slate-100 skeleton shrink-0 mt-1" />
          <div className="flex-1 min-w-0 pr-14 space-y-2">
            {/* 金額 */}
            <div className="h-6 w-28 bg-slate-100 rounded-lg skeleton" />
            {/* タグ */}
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-slate-100 rounded-md skeleton" />
              <div className="h-5 w-20 bg-slate-100 rounded-md skeleton" />
            </div>
            {/* 車名・ODO */}
            <div className="h-4 w-36 bg-slate-100 rounded skeleton" />
            {/* 日付 */}
            <div className="h-3 w-24 bg-slate-100 rounded skeleton" />
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
  const isEv = selectedCar?.fuel_type === "EV"
  return (
  <Card className="border-none shadow-lg bg-white">
    <CardContent className="p-6 relative">
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-400" onClick={resetForm}>
        <X className="h-4 w-4" />
      </Button>
      <h2 className="text-xl font-extrabold text-slate-800 mb-6">
        {editRecordId ? t("records.edit_record") : t("records.new_record")}
      </h2>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
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
          <div className="space-y-2 w-1/2 pr-1.5">
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
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label>{t("records.odometer_km")} <span className="text-slate-400 font-normal text-xs">{t("records.optional")}</span></Label>
          <Input type="number" value={odoAtRecord} onChange={e => setOdoAtRecord(e.target.value)} placeholder="52500" />
        </div>

        {category === "fuel" ? (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Fuel size={15} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-600">{isEv ? t("records.charge_info") : t("records.fuel_info")}</span>
            </div>

            {/* 単価 */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">{isEv ? t("records.unit_price_kwh") : t("records.unit_price")}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={fuelUnitPrice}
                  onChange={e => onFuelFieldChange("fuelUnitPrice", e.target.value)}
                  placeholder={isEv ? "30" : "170"}
                  className="bg-white border-slate-200 focus:border-slate-400 pr-12 placeholder:text-slate-300"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">{isEv ? t("records.unit_yen_per_kwh") : t("records.unit_yen_per_l")}</span>
              </div>
            </div>

            {/* リットル / kWh */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">{isEv ? t("records.charge_amount") : t("records.fuel_amount")}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={fuelAmount}
                  onChange={e => onFuelFieldChange("fuelAmount", e.target.value)}
                  placeholder={isEv ? "30.0" : "40.0"}
                  className="bg-white border-slate-200 focus:border-slate-400 pr-8 placeholder:text-slate-300"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">{isEv ? t("records.unit_kwh") : t("records.unit_l")}</span>
              </div>
            </div>

            {/* 区切り線 */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] text-slate-400 font-bold">=</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* 総額 */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">{t("records.total_amount")} <span className="text-red-400">{t("common.required")}</span></Label>
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={e => onFuelFieldChange("amount", e.target.value)}
                  required
                  placeholder="6800"
                  className="bg-white border-slate-200 focus:border-slate-400 font-bold text-slate-800 pr-8 placeholder:text-slate-300"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">{t("records.unit_yen")}</span>
              </div>
            </div>
          </div>
        ) : category === "highway" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("records.entry_ic")} <span className="text-slate-400 font-normal text-[10px]">{t("records.optional")}</span></Label>
                <Input type="text" value={entryIc} onChange={e => setEntryIc(e.target.value)} placeholder="" className="placeholder:text-slate-300" />
              </div>
              <div className="space-y-2">
                <Label>{t("records.exit_ic")} <span className="text-slate-400 font-normal text-[10px]">{t("records.optional")}</span></Label>
                <Input type="text" value={exitIc} onChange={e => setExitIc(e.target.value)} placeholder="" className="placeholder:text-slate-300" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("records.amount_yen")} <span className="text-red-500">{t("common.required")}</span></Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="1320" className="placeholder:text-slate-300" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>{t("records.amount_yen")} <span className="text-red-500">{t("common.required")}</span></Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="5000" />
          </div>
        )}

        <div className="space-y-2">
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

  // カテゴリをユーザーが手動で切り替えたときだけサブカテゴリをデフォルト値にリセットする
  // （編集開始時の setCategory にも反応してしまうと、保存済みのサブカテゴリが上書きされてしまうため）
  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    setSubCategory(SUB_CATEGORIES[newCategory] ? SUB_CATEGORIES[newCategory][0] : "")
  }

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: carsData } = await supabase.from("cars").select("*").eq("user_id", user.id).eq("status", "active")
      if (carsData) {
        setCars(carsData)
        if (carsData.length === 1) setCarId(carsData[0].id)
      }

      const { data: recordsData } = await supabase
        .from("records")
        .select(`*, cars(name, fuel_type)`)
        .eq("user_id", user.id)
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

      let finalMemo = memo
      if (category === "highway" && (entryIc || exitIc)) {
        finalMemo = `${t("records.route_label")}${entryIc || t("records.not_entered")} ➡ ${exitIc || t("records.not_entered")}\n${memo}`
      }

      const { error: recordError } = await supabase.from("records").insert({
        user_id: user.id,
        car_id: carId,
        category,
        sub_category: subCategory || null,
        amount: parseInt(amount),
        odo_at_record: odoAtRecord ? parseInt(odoAtRecord) : fallbackOdo,
        fuel_amount: category === "fuel" ? parseFloat(fuelAmount) : null,
        date,
        memo: finalMemo,
      })

      if (recordError) return toast.error(t("common.error_occurred") + ": " + recordError.message)

      await recalcCarOdo(carId)

      toast.success(t("records.saved"))
      resetForm()
      fetchData()
    } finally {
      setIsSubmitting(false)
    }
  }

  // 記録編集モードの開始
  const handleStartEdit = (record: any) => {
    setEditRecordId(record.id)
    setIsAdding(false)
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
    
    // 高速料金のメモ復元処理
    if (record.category === "highway" && record.memo) {
      const match = record.memo.match(/^【区間】(.*?) ➡ (.*?)\n([\s\S]*)$/)
      if (match) {
        setEntryIc(match[1] === "未入力" ? "" : match[1])
        setExitIc(match[2] === "未入力" ? "" : match[2])
        setMemo(match[3])
      } else {
        const fallbackMatch = record.memo.match(/^【区間】(.*?) ➡ (.*?)$/)
        if (fallbackMatch) {
          setEntryIc(fallbackMatch[1] === "未入力" ? "" : fallbackMatch[1])
          setExitIc(fallbackMatch[2] === "未入力" ? "" : fallbackMatch[2])
          setMemo("")
        } else {
          // Try English format too
          const enMatch = record.memo.match(/^Route: (.*?) ➡ (.*?)\n([\s\S]*)$/)
          if (enMatch) {
            setEntryIc(enMatch[1] === "N/A" ? "" : enMatch[1])
            setExitIc(enMatch[2] === "N/A" ? "" : enMatch[2])
            setMemo(enMatch[3])
          } else {
            setEntryIc("")
            setExitIc("")
            setMemo(record.memo)
          }
        }
      }
    } else {
      setEntryIc("")
      setExitIc("")
      setMemo(record.memo || "")
    }
  }

  // 記録データの更新処理
  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRecordId) return

    setIsSubmitting(true)
    try {
      const targetCar = cars.find(c => c.id === carId)
      const fallbackOdo = targetCar ? targetCar.current_odo : 0

      let finalMemo = memo
      if (category === "highway" && (entryIc || exitIc)) {
        finalMemo = `${t("records.route_label")}${entryIc || t("records.not_entered")} ➡ ${exitIc || t("records.not_entered")}\n${memo}`
      }

      const { error } = await supabase.from("records").update({
        car_id: carId,
        category,
        sub_category: subCategory || null,
        amount: parseInt(amount),
        odo_at_record: odoAtRecord ? parseInt(odoAtRecord) : fallbackOdo,
        fuel_amount: category === "fuel" ? parseFloat(fuelAmount) : null,
        date,
        memo: finalMemo,
      }).eq("id", editRecordId)

      if (error) {
        toast.error(t("common.error_occurred") + ": " + error.message)
      } else {
        await recalcCarOdo(carId)
        toast.success(t("records.updated"))
        resetForm()
        fetchData()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 記録データの削除処理
  const handleDeleteRecord = async (recordId: string) => {
    const confirmed = window.confirm(t("records.confirm_delete"))
    if (!confirmed) return

    const targetRecord = records.find(r => r.id === recordId)
    const { error } = await supabase.from("records").delete().eq("id", recordId)
    if (error) {
      toast.error(t("common.delete_failed") + ": " + error.message)
    } else {
      if (targetRecord) await recalcCarOdo(targetRecord.car_id)
      toast.success(t("records.deleted"))
      fetchData()
    }
  }


  return (
    <main className="p-4 space-y-6">
      <header className="pt-4 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t("records.title")}</h1>
        <p className="text-xs font-bold text-slate-400 tracking-wider mt-1">{t("records.subtitle")}</p>
      </header>

      {loading && <RecordSkeleton />}

      {!loading && cars.length === 0 && (
        <Card className="border-none shadow-sm bg-white p-10 text-center mt-10">
          <CarFront className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium mb-4">{t("records.register_car_first_line1")}<br/>{t("records.register_car_first_line2")}</p>
          <Link href="/garage"><Button className="font-bold">{t("records.go_to_garage")}</Button></Link>
        </Card>
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
                  <Button onClick={() => setIsAdding(true)} size="sm" className="font-bold">
                    <Plus className="mr-1 h-4 w-4" /> {t("records.add_record")}
                  </Button>
                </div>
                {viewMode === "month" && (
                  <div className="flex items-center justify-center gap-4">
                    <button onClick={goToPrevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                      <ChevronLeft size={18} className="text-slate-600" />
                    </button>
                    <span className="font-bold text-slate-700 min-w-[120px] text-center">
                      {monthLabel}
                    </span>
                    <button
                      onClick={goToNextMonth}
                      disabled={selectedYearMonth >= currentYM}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30"
                    >
                      <ChevronRight size={18} className="text-slate-600" />
                    </button>
                  </div>
                )}
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
        <p className="text-center text-slate-500 py-20">{t("records.no_records_line1")}<br/>{t("records.no_records_line2")}</p>
      )}

      {!loading && !isAdding && !editRecordId && records.length > 0 && displayedRecords.length === 0 && (
        <p className="text-center text-slate-400 py-20 font-medium">
          {t("records.no_records_in_month", { label: monthLabel })}
        </p>
      )}

      {!loading && !isAdding && !editRecordId && displayedRecords.length > 0 && (
        <div className="space-y-4">
          {displayedRecords.map((record) => {
            const cat = CATEGORIES[record.category] || CATEGORIES.other
            const Icon = cat.icon
            
            return (
              <Card key={record.id} className="border-none shadow-sm bg-white overflow-hidden relative">
                <CardContent className="p-0">
                  {/* 編集・削除ボタン（右上に常時表示） */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(record)}
                      className="p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      title={t("common.edit")}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteRecord(record.id)}
                      className="p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
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
                      <h3 className="font-bold text-slate-800 text-lg mb-1">¥{record.amount.toLocaleString()}</h3>
                      
                      {/* ジャンルタグ */}
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mb-2 flex-wrap">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">{t(`categories.${record.category}`)}</span>
                        {record.sub_category && (
                          <span className="border border-slate-200 text-slate-600 px-2 py-1 rounded-md">
                            {t(`subcategories.${record.sub_category}`)}
                          </span>
                        )}
                      </div>

                      {/* 車名・走行距離 */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-1">
                        <span className="font-bold">{record.cars.name}</span>
                        {record.odo_at_record != null && (
                          <span>{record.odo_at_record.toLocaleString()} {t("common.km_unit")}</span>
                        )}
                      </div>

                      {/* 日付 */}
                      <p className="text-[11px] font-medium text-slate-400 mb-2">{record.date.replace(/-/g, '/')}</p>

                      {record.category === "fuel" && record.fuel_amount && (
                        <p className="text-xs text-slate-500 mb-2">
                          {record.cars?.fuel_type === "EV" ? t("records.charge_amount_label") : t("records.fuel_amount_label")} <span className="font-bold text-slate-700">{record.fuel_amount} {record.cars?.fuel_type === "EV" ? t("records.unit_kwh") : t("records.unit_l")}</span>
                        </p>
                      )}
                      {record.memo && (
                        <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-md whitespace-pre-wrap inline-block">
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