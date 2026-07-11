"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, X, Pencil, Trash2, Pause, Play, ChevronDown, ChevronUp, Info, RepeatIcon } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n"
import { CATEGORIES } from "@/app/records/page"
import { SUB_CATEGORIES } from "@/lib/subcategories"

// 頻度の選択肢
const FREQUENCY_OPTIONS = [
  { value: "weekly",       labelKey: "records.freq_weekly" },
  { value: "monthly",      labelKey: "records.freq_monthly" },
  { value: "bimonthly",    labelKey: "records.freq_bimonthly" },
  { value: "quarterly",    labelKey: "records.freq_quarterly" },
  { value: "semiannually", labelKey: "records.freq_semiannually" },
  { value: "yearly",       labelKey: "records.freq_yearly" },
]

// 折りたたみバナーコンポーネント
const AutoRecordBanner = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 overflow-hidden mb-5">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/30 dark:hover:bg-card/30 transition-colors"
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60">
          <Info size={13} className="text-blue-600 dark:text-blue-300 shrink-0" />
        </div>
        <span className="flex-1 text-sm font-semibold text-blue-800 dark:text-blue-200">
          {t("records.recurring_banner_title")}
        </span>
        {open
          ? <ChevronUp size={15} className="text-blue-400 dark:text-blue-300 shrink-0" />
          : <ChevronDown size={15} className="text-blue-400 dark:text-blue-300 shrink-0" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          <div className="border-t border-blue-100 dark:border-blue-900 pt-3">
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              {t("records.recurring_banner_body")}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// 定期費用入力フォームコンポーネント
const RecurringForm = ({
  onSubmit, submitLabel, resetForm,
  carId, setCarId, cars,
  category, setCategory, subCategory, setSubCategory,
  amount, setAmount, frequency, setFrequency,
  nextBillingDate, setNextBillingDate, memo, setMemo,
  isEdit,
}: any) => {
  const { t } = useTranslation()

  return (
    <Card className="border-none shadow-lg bg-white dark:bg-card mb-6">
      <CardContent className="p-6 relative">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-400 dark:text-muted-foreground" onClick={resetForm}>
          <X className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-foreground mb-1">
          {isEdit ? t("records.edit_recurring") : t("records.add_recurring")}
        </h2>
        <p className="text-xs text-slate-400 dark:text-muted-foreground mb-6 flex items-center gap-1">
          <RepeatIcon size={11} />
          {t("records.recurring_form_hint")}
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* --- 対象車 & カテゴリ --- */}
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

          {/* --- 支払情報セクション --- */}
          <div className="rounded-xl bg-slate-50 dark:bg-muted border border-slate-200 dark:border-border p-4 space-y-4">
            <p className="text-[11px] font-bold text-slate-400 dark:text-muted-foreground uppercase tracking-wider">支払情報</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("records.amount_yen")} <span className="text-red-500">{t("common.required")}</span></Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  placeholder="5000"
                  className="bg-white dark:bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("records.frequency")} <span className="text-red-500">{t("common.required")}</span></Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="w-full bg-white dark:bg-card"><SelectValue placeholder={t("records.frequency")} /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {isEdit ? t("records.next_billing_date") : t("records.first_billing_date")}
                <span className="text-red-500 ml-1">{t("common.required")}</span>
              </Label>
              <Input
                type="date"
                value={nextBillingDate}
                onChange={e => setNextBillingDate(e.target.value)}
                required
                className="bg-white dark:bg-card"
              />
              {!isEdit && (
                <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                  ※ 過去の日付を設定すると、保存時に過去分がまとめて自動記録されます
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("common.memo")}</Label>
            <Textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder={t("records.memo_placeholder")} className="resize-none" />
          </div>

          <div className="pt-2 flex justify-center">
            <Button type="submit" className="px-12 font-bold">{submitLabel}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ステータスバッジコンポーネント
const StatusBadge = ({ isActive }: { isActive: boolean }) => {
  const { t } = useTranslation()
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 whitespace-nowrap shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
        {t("records.status_active")}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 whitespace-nowrap shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
      {t("records.status_paused")}
    </span>
  )
}

// 頻度ラベル取得ヘルパー関数
const getFrequencyLabel = (freq: string, t: (key: string) => string): string => {
  const opt = FREQUENCY_OPTIONS.find(o => o.value === freq)
  return opt ? t(opt.labelKey) : freq
}

// ローディング中のスケルトンカード
const RecurringCardSkeleton = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-card rounded-xl shadow-sm dark:border dark:border-border overflow-hidden relative">
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
        <div className="p-4 flex gap-3 items-start">
          <Skeleton className="w-12 h-12 rounded-full shrink-0 mt-1" />
          <div className="flex-1 min-w-0 pr-24 space-y-2">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

// データが存在しない場合の空状態コンポーネント
const EmptyState = ({ onAdd }: { onAdd: () => void }) => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-muted flex items-center justify-center mb-4">
        <RepeatIcon size={28} className="text-slate-300" />
      </div>
      <p className="text-slate-600 dark:text-muted-foreground font-semibold mb-1">{t("records.no_recurring")}</p>
      <p className="text-sm text-slate-400 dark:text-muted-foreground mb-6 w-[260px]">{t("records.no_recurring_desc")}</p>
      <Button onClick={onAdd} size="sm" className="font-bold gap-1.5">
        <Plus size={14} />
        {t("records.add_recurring")}
      </Button>
    </div>
  )
}

// メインコンポーネント (RecurringTab)
export default function RecurringTab({ cars, onRecordsChanged }: { cars: any[], onRecordsChanged?: () => void }) {
  const [costs, setCosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const supabase = createClient()
  const { t } = useTranslation()

  const [carId, setCarId] = useState(cars.length > 0 ? cars[0].id : "")
  const [category, setCategory] = useState("other")
  const [subCategory, setSubCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [nextBillingDate, setNextBillingDate] = useState(new Date().toISOString().split('T')[0])
  const [memo, setMemo] = useState("")

  useEffect(() => {
    if (SUB_CATEGORIES[category]) {
      setSubCategory(SUB_CATEGORIES[category][0])
    } else {
      setSubCategory("")
    }
    if (!editId && ["tax", "insurance"].includes(category)) {
      setFrequency("yearly")
    }
  }, [category])

  const fetchData = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (user) {
      const { data } = await supabase
        .from("recurring_costs")
        .select(`*, cars(name)`)
        .eq("user_id", user.id)
        .order("next_billing_date", { ascending: true })
      if (data) setCosts(data)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const resetForm = () => {
    setIsAdding(false)
    setEditId(null)
    setAmount("")
    setMemo("")
    setCategory("other")
    setFrequency("monthly")
    setNextBillingDate(new Date().toISOString().split('T')[0])
    if (cars.length > 0) setCarId(cars[0].id)
  }

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const advanceByFrequency = (d: Date, freq: string) => {
    if (freq === "weekly")        d.setDate(d.getDate() + 7)
    else if (freq === "monthly")      d.setMonth(d.getMonth() + 1)
    else if (freq === "bimonthly")    d.setMonth(d.getMonth() + 2)
    else if (freq === "quarterly")    d.setMonth(d.getMonth() + 3)
    else if (freq === "semiannually") d.setMonth(d.getMonth() + 6)
    else if (freq === "yearly")       d.setFullYear(d.getFullYear() + 1)
  }

  const handleSave = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!carId) return alert(t("records.select_car_alert"))

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editId) {
      const { error } = await supabase.from("recurring_costs").update({
        car_id: carId, category, sub_category: subCategory || null,
        amount: parseInt(amount), frequency, next_billing_date: nextBillingDate, memo,
      }).eq("id", editId)
      if (error) return toast.error(t("common.error_occurred") + ": " + error.message)
      toast.success(t("records.recurring_updated"))
    } else {
      // 初回支払日が今日以前なら、過去分の日付リストと正しい次回支払日を先に計算する
      const today = new Date()
      const cursor = new Date(nextBillingDate + "T00:00:00")
      const pastDates: string[] = []

      while (cursor <= today && pastDates.length < 120) {
        pastDates.push(toDateStr(cursor))
        advanceByFrequency(cursor, frequency)
      }

      // 次回支払日：過去分があれば計算済みの cursor、なければ入力値そのまま
      const resolvedNextBillingDate = pastDates.length > 0 ? toDateStr(cursor) : nextBillingDate

      const { error } = await supabase.from("recurring_costs").insert({
        car_id: carId, category, sub_category: subCategory || null,
        amount: parseInt(amount), frequency,
        next_billing_date: resolvedNextBillingDate,
        memo, user_id: user.id,
      })
      if (error) return toast.error(t("common.error_occurred") + ": " + error.message)

      // 過去分を自動記録
      if (pastDates.length > 0) {
        const autoPrefix = t("records.auto_recorded") || "自動記録"
        const targetCar = cars.find((c: any) => c.id === carId)
        const fallbackOdo = targetCar?.current_odo ?? 0
        let insertedCount = 0
        for (const dateStr of pastDates) {
          const { error: recErr } = await supabase.from("records").insert({
            user_id: user.id, car_id: carId, category,
            sub_category: subCategory || null,
            amount: parseInt(amount),
            odo_at_record: fallbackOdo,
            date: dateStr,
            memo: `${autoPrefix}${memo || ""}`,
          })
          if (!recErr) insertedCount++
        }
        toast.success(`定期費用を登録しました。過去${insertedCount}件の記録を自動作成しました。`)
        onRecordsChanged?.()
      } else {
        toast.success(t("records.recurring_saved"))
      }
    }

    resetForm()
    fetchData()
  }

  const handleStartEdit = (cost: any) => {
    setEditId(cost.id)
    setIsAdding(false)
    setCarId(cost.car_id)
    setCategory(cost.category)
    setSubCategory(cost.sub_category || "")
    setAmount(String(cost.amount))
    setFrequency(cost.frequency)
    setNextBillingDate(cost.next_billing_date)
    setMemo(cost.memo || "")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("records.confirm_delete_recurring") || "削除しますか？")) return

    // 楽観的UI: 先にローカル状態から削除
    const prevCosts = costs
    setCosts(prev => prev.filter(c => c.id !== id))

    const { error } = await supabase.from("recurring_costs").delete().eq("id", id)
    if (error) {
      // 失敗時はロールバック
      setCosts(prevCosts)
      toast.error(t("common.delete_failed"))
    } else {
      toast.success(t("records.recurring_deleted"))
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    // 楽観的UI: 先にローカル状態を反転
    const prevCosts = costs
    setCosts(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c))

    const { error } = await supabase.from("recurring_costs").update({ is_active: !currentStatus }).eq("id", id)
    if (error) {
      // 失敗時はロールバック
      setCosts(prevCosts)
      toast.error(t("common.error_occurred"))
    }
  }

  return (
    <div className="space-y-2">
      {/* 自動記録バナー */}
      <AutoRecordBanner />

      {/* 追加ボタン（コスト一覧がある場合のみ右上に表示） */}
      {!isAdding && !editId && cars.length > 0 && costs.length > 0 && (
        <div className="flex justify-end mt-8 mb-8">
          <Button onClick={() => setIsAdding(true)} size="sm" className="font-bold gap-1">
            <Plus className="h-4 w-4" /> {t("records.add_recurring")}
          </Button>
        </div>
      )}

      {/* フォーム */}
      {(isAdding || editId) && (
        <RecurringForm
          onSubmit={handleSave}
          submitLabel={editId ? t("common.update") : t("common.save")}
          resetForm={resetForm}
          isEdit={!!editId}
          carId={carId} setCarId={setCarId} cars={cars}
          category={category} setCategory={setCategory}
          subCategory={subCategory} setSubCategory={setSubCategory}
          amount={amount} setAmount={setAmount}
          frequency={frequency} setFrequency={setFrequency}
          nextBillingDate={nextBillingDate} setNextBillingDate={setNextBillingDate}
          memo={memo} setMemo={setMemo}
        />
      )}

      {/* ローディング中のスケルトン */}
      {loading && !isAdding && !editId && costs.length === 0 && (
        <RecurringCardSkeleton />
      )}

      {/* 空状態 */}
      {!loading && !isAdding && !editId && costs.length === 0 && (
        <EmptyState onAdd={() => setIsAdding(true)} />
      )}

      {/* 定期費用カード一覧 */}
      <div className="space-y-3">
        {costs.map(cost => {
          const cat = CATEGORIES[cost.category] || CATEGORIES.other
          const Icon = cat.icon

          return (
            <Card
              key={cost.id}
              className={`border-none shadow-sm overflow-hidden transition-opacity relative ${cost.is_active ? 'bg-white dark:bg-card' : 'bg-slate-50 dark:bg-muted opacity-60'}`}
            >
              <CardContent className="p-0">
                {/* アクションボタン（右上に常時表示） */}
                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                  <button
                    onClick={() => toggleActive(cost.id, cost.is_active)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      cost.is_active
                        ? 'border-slate-300 dark:border-border text-slate-500 dark:text-muted-foreground hover:text-slate-700 hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-muted'
                        : 'border-slate-300 dark:border-border text-slate-500 dark:text-muted-foreground hover:text-green-500 hover:border-green-300 hover:bg-green-50'
                    }`}
                    title={cost.is_active ? t("records.pause_recurring") : t("records.resume_recurring")}
                  >
                    {cost.is_active ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => handleStartEdit(cost)}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-border text-slate-500 dark:text-muted-foreground hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(cost.id)}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-border text-slate-500 dark:text-muted-foreground hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="p-4 flex gap-3 items-start">
                  <div className={`p-3 rounded-full shrink-0 mt-1 ${cat.bg} ${cat.color}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0 pr-24">
                    {/* 金額 */}
                    <h3 className="font-bold text-slate-800 dark:text-foreground text-lg mb-1">
                      ¥{cost.amount.toLocaleString()}
                      <span className="text-xs text-slate-400 dark:text-muted-foreground font-medium ml-1">
                        / {getFrequencyLabel(cost.frequency, t)}
                      </span>
                    </h3>

                    {/* ジャンルタグ + ステータスバッジ */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold bg-slate-100 dark:bg-surface-2 text-slate-500 dark:text-muted-foreground px-2 py-1 rounded-md whitespace-nowrap">
                        {t(`categories.${cost.category}`)}
                      </span>
                      {cost.sub_category && (
                        <span className="text-[10px] font-bold border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground px-2 py-1 rounded-md whitespace-nowrap">
                          {t(`subcategories.${cost.sub_category}`)}
                        </span>
                      )}
                      <StatusBadge isActive={cost.is_active} />
                    </div>

                    {/* 車名 */}
                    <div className="text-[11px] text-slate-500 dark:text-muted-foreground font-bold mb-2">
                      {cost.cars.name}
                    </div>

                    {/* 次回支払日 */}
                    <p className="text-[11px] font-medium text-slate-400 dark:text-muted-foreground mb-2">
                      {t("records.next_billing_date")}: {cost.next_billing_date.replace(/-/g, '/')}
                    </p>

                    {cost.memo && (
                      <p className="text-sm text-slate-600 dark:text-muted-foreground bg-slate-50 dark:bg-muted p-2 rounded-md whitespace-pre-wrap inline-block mt-1 w-full">
                        {cost.memo}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
