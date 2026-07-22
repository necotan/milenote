"use client"

import { useEffect, useState, useRef } from "react"
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react"
import { createClient } from "@/utils/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/NumberInput"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { User, LogOut, Wrench, LayoutTemplate, Globe, Accessibility, Download, Car, Bell, BarChart3, GripVertical, ChevronRight, Droplet, Filter, Cog, Snowflake, RefreshCw, BatteryFull, Disc, ClipboardCheck, AtSign, Info } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import { useTranslation } from "@/lib/i18n"
import { usePageLoadingGate } from "@/lib/loadingGate"
import { recordsToCsv, downloadCsv, buildExportFilename } from "@/lib/csvExport"
import type { ExportRecord } from "@/lib/csvExport"
import Footer from "@/components/ui/Footer"
import { MAINT_CATEGORIES } from "@/lib/subcategories"

type MaintSetting = { km: number; months: number; months_only?: boolean; enabled?: boolean }
type MaintSettings = Record<string, MaintSetting>

const DEFAULT_MAINT_SETTINGS: MaintSettings = {
  "oil_change": { km: 5000, months: 6 },
  "oil_filter_change": { km: 10000, months: 12 },
  "transmission_oil_change": { km: 40000, months: 24 },
  "tire_rotation": { km: 5000, months: 6 },
  "battery_change": { km: 30000, months: 24 },
  "brake_pad_change": { km: 50000, months: 48 },
  "coolant_change": { km: 40000, months: 24 },
  "inspection_12m": { km: 0, months: 12, months_only: true },
  "inspection_24m": { km: 0, months: 24, months_only: true },
  "periodic_inspection": { km: 0, months: 6, months_only: true },
}

// メンテナンス基準設定UIのアイコン、プリセット値
const MAINT_ITEM_ICON: Record<string, LucideIcon> = {
  oil_change: Droplet,
  oil_filter_change: Filter,
  transmission_oil_change: Cog,
  coolant_change: Snowflake,
  tire_rotation: RefreshCw,
  battery_change: BatteryFull,
  brake_pad_change: Disc,
  inspection_12m: ClipboardCheck,
  inspection_24m: ClipboardCheck,
  periodic_inspection: ClipboardCheck,
}

const MAINT_PRESETS: Record<string, { km?: number[]; months: number[] }> = {
  oil_change: { km: [3000, 5000, 10000], months: [3, 6, 12] },
  oil_filter_change: { km: [5000, 10000, 15000], months: [6, 12, 24] },
  transmission_oil_change: { km: [20000, 40000, 60000], months: [12, 24, 36] },
  coolant_change: { km: [20000, 40000, 60000], months: [12, 24, 36] },
  tire_rotation: { km: [5000, 10000, 15000], months: [6, 12, 18] },
  battery_change: { km: [20000, 30000, 40000], months: [12, 24, 36] },
  brake_pad_change: { km: [30000, 50000, 70000], months: [24, 48, 60] },
  inspection_12m: { months: [6, 12, 24] },
  inspection_24m: { months: [12, 24, 36] },
  periodic_inspection: { months: [3, 6, 12] },
}

const THEME_OPTIONS: { value: "light" | "dark"; labelKey: string }[] = [
  { value: "light", labelKey: "mypage.theme_light" },
  { value: "dark", labelKey: "mypage.theme_dark" },
]

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

// 距離、期間のプリセットチップとカスタム値入力
function ChipPresetRow({
  value,
  presets,
  suffix,
  customLabel,
  onChange,
}: {
  value: number
  presets: number[]
  suffix: string
  customLabel: string
  onChange: (value: number) => void
}) {
  const [customOpen, setCustomOpen] = useState(false)
  const isPreset = presets.includes(value)

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => { setCustomOpen(false); onChange(p) }}
          className={`px-3 h-8 rounded-full text-xs font-bold border-2 transition-colors ${
            !customOpen && value === p
              ? "bg-slate-900 dark:bg-primary text-white dark:text-primary-foreground border-slate-900 dark:border-primary"
              : "bg-white dark:bg-card text-slate-600 dark:text-muted-foreground border-neutral-300 dark:border-neutral-600"
          }`}
        >
          {p.toLocaleString()}{suffix}
        </button>
      ))}
      {customOpen || !isPreset ? (
        <div className="relative">
          <NumberInput
            autoFocus={customOpen}
            value={value ? String(value) : ""}
            onValueChange={(raw) => onChange(parseInt(raw) || 0)}
            onFocus={() => setCustomOpen(true)}
            className="h-8 w-28 md:w-24 text-base md:text-xs font-bold text-center pr-8 rounded-full border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-card text-slate-700 dark:text-foreground outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-muted-foreground pointer-events-none">{suffix}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className="px-3 h-8 rounded-full text-xs font-bold border border-dashed border-neutral-300 dark:border-neutral-600 text-slate-500 dark:text-muted-foreground"
        >
          {customLabel}
        </button>
      )}
    </div>
  )
}

function MaintenanceItemRow({
  itemKey,
  setting,
  onOpenEdit,
  onToggleEnabled,
  t,
}: {
  itemKey: string
  setting: MaintSetting
  onOpenEdit: () => void
  onToggleEnabled: (enabled: boolean) => void
  t: TranslateFn
}) {
  const isEnabled = setting.enabled !== false
  const isMonthsOnly = !!setting.months_only
  const Icon = MAINT_ITEM_ICON[itemKey]
  const itemName = t(`subcategories.${itemKey}`)

  const summary = isEnabled
    ? isMonthsOnly
      ? t("mypage.maint_summary_months_only", { months: setting.months })
      : t("mypage.maint_summary", { km: setting.km.toLocaleString(), months: setting.months })
    : t("mypage.maint_disabled_desc")

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={onOpenEdit}
        className="flex-1 min-w-0 flex items-center gap-3 text-left"
      >
        <Icon size={18} className={isEnabled ? "text-slate-500 dark:text-muted-foreground" : "text-slate-300 dark:text-muted-foreground/70"} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${isEnabled ? "text-slate-800 dark:text-foreground" : "text-slate-400 dark:text-foreground/70"}`}>
            {itemName}
          </p>
          <p className="text-xs text-slate-400 dark:text-muted-foreground truncate">{summary}</p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-slate-300 dark:text-muted-foreground" />
      </button>
      <Switch checked={isEnabled} onCheckedChange={onToggleEnabled} className="shrink-0" />
    </div>
  )
}

// メンテナンス基準の距離、期間を編集するポップアップ
function MaintEditDialog({
  itemKey,
  setting,
  open,
  onOpenChange,
  onSave,
  t,
}: {
  itemKey: string | null
  setting: MaintSetting | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (key: string, km: number, months: number) => Promise<boolean>
  t: TranslateFn
}) {
  const [draftKm, setDraftKm] = useState(0)
  const [draftMonths, setDraftMonths] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && setting) {
      setDraftKm(setting.km)
      setDraftMonths(setting.months)
    }
  }, [open, setting])

  if (!itemKey || !setting) return null
  const isMonthsOnly = !!setting.months_only
  const presets = MAINT_PRESETS[itemKey]
  const itemName = t(`subcategories.${itemKey}`)

  const handleSave = async () => {
    setSaving(true)
    const ok = await onSave(itemKey, draftKm, draftMonths)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next) }}>
      <DialogContent>
        <DialogTitle>{t("mypage.maint_edit_title", { name: itemName })}</DialogTitle>
        <div className="mt-6 space-y-6">
          {!isMonthsOnly && presets?.km && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-slate-400 dark:text-muted-foreground">{t("mypage.maint_distance_label")}</p>
              <ChipPresetRow
                value={draftKm}
                presets={presets.km}
                suffix={t("common.km_unit")}
                customLabel={t("mypage.maint_custom")}
                onChange={setDraftKm}
              />
            </div>
          )}
          {presets?.months && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-slate-400 dark:text-muted-foreground">{t("mypage.maint_period_label")}</p>
              <ChipPresetRow
                value={draftMonths}
                presets={presets.months}
                suffix={t("common.months_unit")}
                customLabel={t("mypage.maint_custom")}
                onChange={setDraftMonths}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// プロフィールの項目行
function ProfileFieldRow({
  icon: Icon,
  label,
  value,
  placeholder,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value: string
  placeholder: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-lg border border-slate-200 dark:border-border px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-surface-2/40 transition-colors"
    >
      <Icon size={16} className="shrink-0 text-slate-400 dark:text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 dark:text-muted-foreground">{label}</p>
        <p className={`text-sm font-bold truncate ${value ? "text-slate-800 dark:text-foreground" : "text-slate-300 dark:text-muted-foreground/70"}`}>
          {value || placeholder}
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-slate-300 dark:text-muted-foreground" />
    </button>
  )
}

// プロフィール項目（表示名、ユーザーID）を編集するポップアップ
function ProfileFieldDialog({
  field,
  initialValue,
  open,
  onOpenChange,
  onSave,
  t,
}: {
  field: "display_name" | "user_id" | null
  initialValue: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (field: "display_name" | "user_id", value: string) => Promise<boolean>
  t: TranslateFn
}) {
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setDraft(initialValue)
  }, [open, initialValue])

  if (!field) return null
  const label = field === "display_name" ? t("mypage.display_name") : t("mypage.user_id")

  const handleSave = async () => {
    setSaving(true)
    const ok = await onSave(field, draft)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next) }}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogTitle>{t("mypage.edit_field_title", { name: label })}</DialogTitle>
        <div className="mt-6 space-y-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="milenote_user"
            className="bg-white dark:bg-card border-slate-200 dark:border-border h-10 text-base md:text-sm focus-visible:ring-1 focus-visible:ring-slate-300"
          />
          {field === "user_id" && (
            <p className="text-xs text-slate-400 dark:text-muted-foreground">{t("signup.user_id_hint")}</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function MyPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [maintSettings, setMaintSettings] = useState<MaintSettings>(DEFAULT_MAINT_SETTINGS)
  const [maintDialogKey, setMaintDialogKey] = useState<string | null>(null)
  const [profileDialogField, setProfileDialogField] = useState<"display_name" | "user_id" | null>(null)
  const [homeOrder, setHomeOrder] = useState<string[]>(["cars", "summary", "alerts"])
  const [isColorful, setIsColorful] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const [themeMounted, setThemeMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { t, locale, setLocale } = useTranslation()

  // maint_settingsは1カラムのjsonbのため、トグル/ポップアップ保存の両方で最新値とロールバック先を参照する
  const maintSettingsRef = useRef<MaintSettings>(maintSettings)
  const lastPersistedMaintRef = useRef<MaintSettings>(maintSettings)
  const maintSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    maintSettingsRef.current = maintSettings
  }, [maintSettings])

  // 初回ローディング画面とデータ取得を連動させる
  usePageLoadingGate(!loading)

  // next-themesのtheme値はSSR/初回マウント時にundefinedになるためハイドレーション後に表示を確定させる
  useEffect(() => {
    setThemeMounted(true)
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data } = await supabase.from("users").select("*").eq("id", user.id).single()
        if (data) {
          setUsername(data.username || "")
          setDisplayName(data.display_name || "")
          // デフォルトをベースにDBの保存値を上書きマージ（未保存の新項目はデフォルト値で表示）
          const mergedMaintSettings = data.maint_settings
            ? { ...DEFAULT_MAINT_SETTINGS, ...data.maint_settings }
            : DEFAULT_MAINT_SETTINGS
          setMaintSettings(mergedMaintSettings)
          maintSettingsRef.current = mergedMaintSettings
          lastPersistedMaintRef.current = mergedMaintSettings
        }
      }
      setLoading(false)
    }
    fetchProfile()

    // localStorageからホーム画面の並び順を取得
    const savedOrder = localStorage.getItem("home_layout")
    if (savedOrder) {
      try {
        setHomeOrder(JSON.parse(savedOrder))
      } catch {}
    }

    // グラフのカラーモード設定を取得
    setIsColorful(localStorage.getItem("milenote_colorful_pie") === "true")
  }, [supabase])

  const handleColorfulChange = (val: boolean) => {
    setIsColorful(val)
    localStorage.setItem("milenote_colorful_pie", String(val))
  }

  const persistMaintSettings = async (next: MaintSettings): Promise<boolean> => {
    if (!userId) return false
    const { error } = await supabase.from("users").update({ maint_settings: next }).eq("id", userId)
    if (error) {
      toast.error(t("common.error_occurred") + ": " + error.message)
      return false
    }
    return true
  }

  // トグルの連打で古い書き込みが後から完了し新しい変更を上書きしないよう、短いdebounceでまとめて保存する
  const scheduleMaintSave = (next: MaintSettings) => {
    if (maintSaveTimer.current) clearTimeout(maintSaveTimer.current)
    maintSaveTimer.current = setTimeout(async () => {
      const ok = await persistMaintSettings(next)
      if (ok) {
        lastPersistedMaintRef.current = next
      } else {
        setMaintSettings(lastPersistedMaintRef.current)
        maintSettingsRef.current = lastPersistedMaintRef.current
      }
    }, 400)
  }

  const handleMaintToggle = (key: string, enabled: boolean) => {
    const next = { ...maintSettingsRef.current, [key]: { ...maintSettingsRef.current[key], enabled } }
    setMaintSettings(next)
    maintSettingsRef.current = next
    scheduleMaintSave(next)
  }

  // ポップアップの保存ボタン押下時、保留中のdebounceを打ち切り、即座に反映する
  const handleMaintDialogSave = async (key: string, km: number, months: number): Promise<boolean> => {
    if (maintSaveTimer.current) {
      clearTimeout(maintSaveTimer.current)
      maintSaveTimer.current = null
    }
    const next = { ...maintSettingsRef.current, [key]: { ...maintSettingsRef.current[key], km, months } }
    setMaintSettings(next)
    maintSettingsRef.current = next
    const ok = await persistMaintSettings(next)
    if (ok) {
      lastPersistedMaintRef.current = next
      toast.success(t("mypage.settings_saved"))
    } else {
      setMaintSettings(lastPersistedMaintRef.current)
      maintSettingsRef.current = lastPersistedMaintRef.current
    }
    return ok
  }

  const handleProfileFieldSave = async (field: "display_name" | "user_id", value: string): Promise<boolean> => {
    if (!userId) return false
    if (field === "user_id" && value && !/^[a-zA-Z0-9_]+$/.test(value)) {
      toast.error(t("signup.invalid_user_id"))
      return false
    }
    const column = field === "display_name" ? "display_name" : "username"
    const { error } = await supabase.from("users").update({ [column]: value }).eq("id", userId)
    if (error) {
      if (field === "user_id" && error.code === "23505") {
        toast.error(t("signup.user_id_taken"))
      } else {
        toast.error(t("common.error_occurred") + ": " + error.message)
      }
      return false
    }
    if (field === "display_name") setDisplayName(value)
    else setUsername(value)
    toast.success(t("mypage.settings_saved"))
    return true
  }

  const sectionIcons: Record<string, ReactNode> = {
    cars: <Car size={16} />,
    alerts: <Bell size={16} />,
    summary: <BarChart3 size={16} />,
  }

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)
  // ドロップ直後の1フレームだけアニメーションを止め、位置の飛びを防ぐカード
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null)
  const dragInfo = useRef<{ startY: number; startIndex: number; step: number } | null>(null)
  const rowRefs = useRef<Array<HTMLDivElement | null>>([])

  const handleDragStart = (e: ReactPointerEvent<HTMLSpanElement>, index: number) => {
    const el = rowRefs.current[index]
    // カードの高さと行間（space-y-2 = 8px）を1段分の移動量とする
    const step = el ? el.getBoundingClientRect().height + 8 : 56
    dragInfo.current = { startY: e.clientY, startIndex: index, step }
    setDragId(homeOrder[index])
    setDragOffset(0)
    setTargetIndex(index)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleDragMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (!dragInfo.current) return
    const { startY, startIndex, step } = dragInfo.current
    // 先頭カードより上・末尾カードより下へはみ出さないよう移動量を制限する
    const minOffset = -startIndex * step
    const maxOffset = (homeOrder.length - 1 - startIndex) * step
    const offset = Math.max(minOffset, Math.min(e.clientY - startY, maxOffset))
    setDragOffset(offset)
    const target = Math.max(0, Math.min(startIndex + Math.round(offset / step), homeOrder.length - 1))
    setTargetIndex(target)
  }

  const handleDragEnd = () => {
    const movedId = dragId
    if (dragInfo.current && targetIndex !== null && targetIndex !== dragInfo.current.startIndex) {
      const { startIndex } = dragInfo.current
      setHomeOrder((prev) => {
        const next = [...prev]
        const [moved] = next.splice(startIndex, 1)
        next.splice(targetIndex, 0, moved)
        // 並び順はローカルストレージのみで完結するため、確定した瞬間に自動保存する
        localStorage.setItem("home_layout", JSON.stringify(next))
        return next
      })
      // ドロップ直後はアニメーションを止めて、確定位置にそのまま着地させる
      setJustDroppedId(movedId)
      requestAnimationFrame(() => setJustDroppedId(null))
    }
    dragInfo.current = null
    setDragId(null)
    setDragOffset(0)
    setTargetIndex(null)
  }

  const carsFirst = homeOrder.indexOf("cars") === 0
  const summaryFirst = homeOrder.indexOf("summary") < homeOrder.indexOf("alerts")

  const buildHomeOrder = (carPosition: "left" | "right", firstContent: "summary" | "alerts"): string[] => {
    const secondContent = firstContent === "summary" ? "alerts" : "summary"
    return carPosition === "left" ? ["cars", firstContent, secondContent] : [firstContent, secondContent, "cars"]
  }

  const handleCarPositionChange = (position: "left" | "right") => {
    const next = buildHomeOrder(position, summaryFirst ? "summary" : "alerts")
    setHomeOrder(next)
    localStorage.setItem("home_layout", JSON.stringify(next))
  }

  const handleContentOrderChange = (firstContent: "summary" | "alerts") => {
    const next = buildHomeOrder(carsFirst ? "left" : "right", firstContent)
    setHomeOrder(next)
    localStorage.setItem("home_layout", JSON.stringify(next))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from("records")
        .select("date, category, sub_category, amount, odo_at_record, fuel_amount, memo, cars!inner(name, fuel_type, status)")
        .eq("user_id", user.id)
        .in("cars.status", ["active", "archived"])
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        toast.error(t("common.error_occurred") + ": " + error.message)
        return
      }
      const records = (data || []) as unknown as ExportRecord[]
      if (records.length === 0) {
        toast.error(t("mypage.export_no_data"))
        return
      }
      const csv = recordsToCsv(records, t)
      downloadCsv(buildExportFilename(), csv)
      toast.success(t("mypage.export_success"))
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <main className="p-4 space-y-6 max-w-5xl mx-auto">
      <header className="pt-4 pb-2 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">{t("mypage.title")}</h1>
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground tracking-wider mt-1">{t("mypage.subtitle")}</p>
        </div>
      </header>
      <div className="space-y-8">
        {/* プロフィールカードスケルトン */}
        <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border shadow-sm overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 p-6 bg-slate-50/50 dark:bg-muted/50 space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="md:w-2/3 p-6 space-y-5">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-2 max-w-md">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-border px-6 py-3 flex justify-between items-center">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
        {/* メンテナンス設定カードスケルトン */}
        <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border shadow-sm overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 p-6 bg-slate-50/50 dark:bg-muted/50 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="md:w-2/3 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <div className="flex gap-3">
                      <Skeleton className="h-9 flex-1 rounded-lg" />
                      <Skeleton className="h-9 flex-1 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-border px-6 py-3 flex justify-between items-center">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  )

  return (
    <main className="p-4 space-y-6 max-w-5xl mx-auto">
      <header className="pt-4 pb-2 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">{t("mypage.title")}</h1>
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground tracking-wider mt-1">{t("mypage.subtitle")}</p>
        </div>
      </header>

      <div className="space-y-8">
        {/* プロフィール設定 */}
        <Card className="border border-slate-200 dark:border-border shadow-sm bg-white dark:bg-card overflow-hidden rounded-xl">
          <div className="md:flex">
            {/* 左側：説明 */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 dark:border-border bg-white dark:bg-card">
              <h2 className="text-base font-bold text-slate-800 dark:text-foreground flex items-center gap-2 mb-2">
                <User size={18} className="text-slate-500 dark:text-muted-foreground" /> {t("mypage.profile")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed">
                {t("mypage.profile_desc")}
              </p>
            </div>

            {/* 右側：タップで編集ポップアップを開く項目行 */}
            <div className="md:w-2/3 p-6 space-y-3">
              <ProfileFieldRow
                icon={User}
                label={t("mypage.display_name")}
                value={displayName}
                placeholder="milenote_user"
                onClick={() => setProfileDialogField("display_name")}
              />
              <ProfileFieldRow
                icon={AtSign}
                label={t("mypage.user_id")}
                value={username}
                placeholder="milenote_user"
                onClick={() => setProfileDialogField("user_id")}
              />
            </div>
          </div>
        </Card>

        {/* メンテナンス基準設定 */}
        <Card className="border border-slate-200 dark:border-border shadow-sm bg-white dark:bg-card overflow-hidden rounded-xl">
          <div className="md:flex">
            {/* 左側：説明 */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 dark:border-border bg-white dark:bg-card">
              <h2 className="text-base font-bold text-slate-800 dark:text-foreground flex items-center gap-2 mb-2">
                <Wrench size={18} className="text-slate-500 dark:text-muted-foreground" /> {t("mypage.maintenance_settings")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed mb-4">
                {t("mypage.maintenance_desc")}
              </p>
            </div>

            {/* 右側：カテゴリ別の折りたたみリスト */}
            <div className="md:w-2/3 p-6">
              <div className="space-y-5">
                {MAINT_CATEGORIES.map((category) => (
                  <div key={category.key}>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-muted-foreground tracking-wide mb-2 px-1">
                      {t(`mypage.maint_category_${category.key}`)}
                    </p>
                    <div className="rounded-xl border border-slate-200 dark:border-border divide-y divide-slate-100 dark:divide-border overflow-hidden">
                      {category.items.map((key) => (
                        <MaintenanceItemRow
                          key={key}
                          itemKey={key}
                          setting={maintSettings[key] ?? DEFAULT_MAINT_SETTINGS[key]}
                          onOpenEdit={() => setMaintDialogKey(key)}
                          onToggleEnabled={(v) => handleMaintToggle(key, v)}
                          t={t}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* 言語設定 */}
        <Card className="border border-slate-200 dark:border-border shadow-sm bg-white dark:bg-card overflow-hidden rounded-xl">
          <div className="md:flex">
            {/* 左側：説明 */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 dark:border-border bg-white dark:bg-card">
              <h2 className="text-base font-bold text-slate-800 dark:text-foreground flex items-center gap-2 mb-2">
                <Globe size={18} className="text-slate-500 dark:text-muted-foreground" /> {t("mypage.language")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed mb-4">
                {t("mypage.language_desc")}
              </p>
            </div>

            {/* 右側：言語選択UI */}
            <div className="md:w-2/3 p-6">
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-surface-2 p-1">
                <button
                  onClick={() => setLocale("ja")}
                  className={`px-5 py-1.5 rounded-md text-sm font-bold transition-all ${
                    locale === "ja"
                      ? "bg-white dark:bg-surface-3 text-slate-900 dark:text-foreground shadow-sm"
                      : "text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground"
                  }`}
                >
                  {t("mypage.language_ja")}
                </button>
                <button
                  onClick={() => setLocale("en")}
                  className={`px-5 py-1.5 rounded-md text-sm font-bold transition-all ${
                    locale === "en"
                      ? "bg-white dark:bg-surface-3 text-slate-900 dark:text-foreground shadow-sm"
                      : "text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground"
                  }`}
                >
                  {t("mypage.language_en")}
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* アクセシビリティ */}
        <Card className="border border-slate-200 dark:border-border shadow-sm bg-white dark:bg-card overflow-hidden rounded-xl">
          <div className="md:flex">
            {/* 左側：説明 */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 dark:border-border bg-white dark:bg-card">
              <h2 className="text-base font-bold text-slate-800 dark:text-foreground flex items-center gap-2 mb-2">
                <Accessibility size={18} className="text-slate-500 dark:text-muted-foreground" /> {t("mypage.accessibility")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed mb-4">
                {t("mypage.accessibility_desc")}
              </p>
            </div>

            {/* 右側：カラーモード選択UI */}
            <div className="md:w-2/3 p-6">
              <Label className="text-slate-700 dark:text-foreground font-bold text-xs flex items-center gap-1">
                {t("mypage.chart_color_mode")}
                <span title={t("mypage.chart_color_mode_tooltip")}>
                  <Info size={13} className="text-slate-400 dark:text-muted-foreground cursor-help" />
                </span>
              </Label>
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-surface-2 p-1 mt-2">
                <button
                  onClick={() => handleColorfulChange(false)}
                  className={`px-5 py-1.5 rounded-md text-sm font-bold transition-all ${
                    !isColorful
                      ? "bg-white dark:bg-surface-3 text-slate-900 dark:text-foreground shadow-sm"
                      : "text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground"
                  }`}
                >
                  {t("mypage.chart_color_basic")}
                </button>
                <button
                  onClick={() => handleColorfulChange(true)}
                  className={`px-5 py-1.5 rounded-md text-sm font-bold transition-all ${
                    isColorful
                      ? "bg-white dark:bg-surface-3 text-slate-900 dark:text-foreground shadow-sm"
                      : "text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground"
                  }`}
                >
                  {t("mypage.chart_color_colorful")}
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-foreground mt-1.5">
                {isColorful ? t("mypage.chart_color_colorful_note") : t("mypage.chart_color_basic_note")}
              </p>

              <div className="mt-6">
                <Label className="text-slate-700 dark:text-foreground font-bold text-xs">{t("mypage.theme_mode")}</Label>
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-surface-2 p-1 mt-2">
                  {THEME_OPTIONS.map(({ value, labelKey }) => {
                    const active = themeMounted && resolvedTheme === value
                    return (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={`px-5 py-1.5 rounded-md text-sm font-bold transition-all ${
                          active
                            ? "bg-white dark:bg-surface-3 text-slate-900 dark:text-foreground shadow-sm"
                            : "text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground"
                        }`}
                      >
                        {t(labelKey)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ホーム画面のカスタマイズ */}
        <Card className="border border-slate-200 dark:border-border shadow-sm bg-white dark:bg-card overflow-hidden rounded-xl">
          <div className="md:flex">
            {/* 左側：説明 */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 dark:border-border bg-white dark:bg-card">
              <h2 className="text-base font-bold text-slate-800 dark:text-foreground flex items-center gap-2 mb-2">
                <LayoutTemplate size={18} className="text-slate-500 dark:text-muted-foreground" /> {t("mypage.home_order")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed mb-4">
                {t("mypage.home_order_desc")}
              </p>
            </div>

            {/* 右側：並び替えUI */}
            <div className="md:w-2/3 p-6">
              {/* スマートフォン表示時 */}
              <div className="lg:hidden">
              <div className="space-y-2 max-w-md">
                {homeOrder.map((sectionId, index) => {
                  const isDragging = dragId === sectionId
                  // ドラッグ中の見た目の移動量を算出
                  let translateY = 0
                  if (isDragging) {
                    translateY = dragOffset
                  } else if (dragInfo.current && targetIndex !== null) {
                    const { startIndex, step } = dragInfo.current
                    // ドラッグ中のカードが入る隙間を作るため、間のカードをずらす
                    if (startIndex < targetIndex && index > startIndex && index <= targetIndex) {
                      translateY = -step
                    } else if (startIndex > targetIndex && index < startIndex && index >= targetIndex) {
                      translateY = step
                    }
                  }
                  return (
                    <div
                      key={sectionId}
                      ref={(el) => {
                        rowRefs.current[index] = el
                      }}
                      style={{
                        transform: isDragging ? `translateY(${translateY}px) scale(1.02)` : `translateY(${translateY}px)`,
                        transition: isDragging || justDroppedId === sectionId ? "none" : "transform 200ms ease",
                        zIndex: isDragging ? 10 : 0,
                      }}
                      className={`relative flex items-center gap-3 bg-white dark:bg-surface-2 border p-3 rounded-lg select-none ${
                        isDragging
                          ? "border-slate-400 dark:border-ring shadow-lg ring-2 ring-slate-300 dark:ring-surface-border"
                          : "border-slate-200 dark:border-surface-3 shadow-sm"
                      }`}
                    >
                      {/* セクションアイコン */}
                      <span className="flex items-center justify-center h-8 w-8 shrink-0 rounded-lg bg-slate-100 dark:bg-surface-3 text-slate-600 dark:text-foreground">
                        {sectionIcons[sectionId]}
                      </span>
                      {/* ラベル */}
                      <span className="flex-1 min-w-0 text-sm font-bold text-slate-700 dark:text-foreground truncate">{t(`mypage.home_sections.${sectionId}`)}</span>
                      {/* ドラッグハンドル */}
                      <span
                        onPointerDown={(e) => handleDragStart(e, index)}
                        onPointerMove={handleDragMove}
                        onPointerUp={handleDragEnd}
                        onPointerCancel={handleDragEnd}
                        role="button"
                        aria-label={t("mypage.drag_handle")}
                        className="flex items-center justify-center h-8 w-8 shrink-0 rounded-lg text-slate-400 dark:text-muted-foreground touch-none cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical size={18} />
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* 上が一番上に表示される旨の補足 */}
              <p className="mt-3 text-[11px] text-slate-400 dark:text-muted-foreground font-medium">{t("mypage.home_order_hint")}</p>
              </div>

              {/* PC表示時 */}
              <div className="hidden lg:block max-w-md">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-bold text-slate-600 dark:text-muted-foreground">{t("mypage.home_order_pc_car_position")}</span>
                  <div className="inline-flex bg-slate-100 dark:bg-surface-2 rounded-lg p-1 shrink-0">
                    {(["left", "right"] as const).map((position) => {
                      const active = carsFirst ? position === "left" : position === "right"
                      return (
                        <button
                          key={position}
                          onClick={() => handleCarPositionChange(position)}
                          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                            active
                              ? "bg-white dark:bg-surface-3 text-slate-900 dark:text-foreground shadow-sm"
                              : "text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground"
                          }`}
                        >
                          {t(`mypage.home_order_pc_car_${position}`)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-600 dark:text-muted-foreground">{t("mypage.home_order_pc_content_order")}</span>
                  <div className="inline-flex bg-slate-100 dark:bg-surface-2 rounded-lg p-1 shrink-0">
                    {(["summary", "alerts"] as const).map((content) => {
                      const active = summaryFirst ? content === "summary" : content === "alerts"
                      return (
                        <button
                          key={content}
                          onClick={() => handleContentOrderChange(content)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            active
                              ? "bg-white dark:bg-surface-3 text-slate-900 dark:text-foreground shadow-sm"
                              : "text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground"
                          }`}
                        >
                          {sectionIcons[content]}
                          {content === "summary" ? t("home.this_month_cost") : t("mypage.home_sections.alerts")}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* データのエクスポート */}
        <Card className="border border-slate-200 dark:border-border shadow-sm bg-white dark:bg-card overflow-hidden rounded-xl">
          <div className="p-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-foreground flex items-center gap-2 mb-2">
              <Download size={18} className="text-slate-500 dark:text-muted-foreground" /> {t("mypage.export")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed">
              {t("mypage.export_desc")}
            </p>
          </div>

          {/* 下部：エクスポートボタンエリア */}
          <div data-slot="card-footer" className="border-t border-slate-100 dark:border-border p-6 flex justify-end">
            <Button
              onClick={handleExportCsv}
              disabled={exporting}
              className="shrink-0 px-4 h-8 text-[11px] font-bold bg-slate-900 dark:bg-primary text-white dark:text-primary-foreground hover:bg-slate-800 dark:hover:bg-primary/90 rounded-lg shadow-sm"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {exporting ? t("mypage.exporting") : t("mypage.export_button")}
            </Button>
          </div>
        </Card>
      </div>

      <ProfileFieldDialog
        field={profileDialogField}
        initialValue={profileDialogField === "display_name" ? displayName : username}
        open={profileDialogField !== null}
        onOpenChange={(open) => { if (!open) setProfileDialogField(null) }}
        onSave={handleProfileFieldSave}
        t={t}
      />
      <MaintEditDialog
        itemKey={maintDialogKey}
        setting={maintDialogKey ? (maintSettings[maintDialogKey] ?? DEFAULT_MAINT_SETTINGS[maintDialogKey]) : null}
        open={maintDialogKey !== null}
        onOpenChange={(open) => { if (!open) setMaintDialogKey(null) }}
        onSave={handleMaintDialogSave}
        t={t}
      />

      {/* ログアウトボタン (スマホ版のみ表示、PC版はサイドバーに移動予定) */}
      <div className="md:hidden pt-8 flex justify-center mb-8">
        <Button variant="outline" className="px-8 h-9 font-bold rounded-lg bg-white dark:bg-card border-slate-200 dark:border-border shadow-sm text-slate-400 dark:text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors text-xs" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          {t("common.logout")}
        </Button>
      </div>

      <Footer className="pt-4 pb-8" />
    </main>
  )
}