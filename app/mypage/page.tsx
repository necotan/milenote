"use client"

import { useEffect, useState, useRef } from "react"
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react"
import { createClient } from "@/utils/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { User, LogOut, Wrench, LayoutTemplate, Globe, Accessibility, Download, Car, Bell, BarChart3 } from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import { useTranslation } from "@/lib/i18n"
import { usePageLoadingGate } from "@/lib/loadingGate"
import { recordsToCsv, downloadCsv, buildExportFilename } from "@/lib/csvExport"
import type { ExportRecord } from "@/lib/csvExport"
import Footer from "@/components/ui/Footer"

const DEFAULT_MAINT_SETTINGS = {
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

const THEME_OPTIONS: { value: "light" | "dark"; labelKey: string }[] = [
  { value: "light", labelKey: "mypage.theme_light" },
  { value: "dark", labelKey: "mypage.theme_dark" },
]

export default function MyPage() {
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [maintSettings, setMaintSettings] = useState<any>(DEFAULT_MAINT_SETTINGS)
  const [homeOrder, setHomeOrder] = useState<string[]>(["summary", "alerts", "cars"])
  const [isColorful, setIsColorful] = useState(false)
  const { theme, setTheme } = useTheme()
  const [themeMounted, setThemeMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { t, locale, setLocale } = useTranslation()

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
        const { data } = await supabase.from("users").select("*").eq("id", user.id).single()
        if (data) {
          setUsername(data.username || "")
          setDisplayName(data.display_name || "")
          // デフォルトをベースにDBの保存値を上書きマージ（未保存の新項目はデフォルト値で表示）
          if (data.maint_settings) {
            setMaintSettings({ ...DEFAULT_MAINT_SETTINGS, ...data.maint_settings })
          }
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

  const handleUpdate = async () => {
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error(t("signup.invalid_user_id"))
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase
        .from("users")
        .update({
          username,
          display_name: displayName,
          maint_settings: maintSettings // メンテナンス設定も一緒に保存
        })
        .eq("id", user.id)

      // ホーム画面の並び順をローカルストレージに保存
      localStorage.setItem("home_layout", JSON.stringify(homeOrder))

      if (error) {
        toast.error(t("common.error_occurred") + ": " + error.message)
      } else {
        toast.success(t("mypage.settings_saved"))
      }
    }
    setSaving(false)
  }

  const handleMaintChange = (key: string, field: "km" | "months", value: string) => {
    setMaintSettings((prev: any) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: parseInt(value) || 0
      }
    }))
  }

  const handleMaintToggle = (key: string, enabled: boolean) => {
    setMaintSettings((prev: any) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled
      }
    }))
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

  const handleDragStart = (e: ReactPointerEvent<HTMLDivElement>, index: number) => {
    const el = rowRefs.current[index]
    // カードの高さと行間（space-y-2 = 8px）を1段分の移動量とする
    const step = el ? el.getBoundingClientRect().height + 8 : 56
    dragInfo.current = { startY: e.clientY, startIndex: index, step }
    setDragId(homeOrder[index])
    setDragOffset(0)
    setTargetIndex(index)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
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
        .select("date, category, sub_category, amount, odo_at_record, fuel_amount, memo, cars(name, fuel_type)")
        .eq("user_id", user.id)
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
      <header className="pt-4 pb-2">
        <div className="h-8 w-32 bg-slate-100 dark:bg-muted rounded-lg skeleton" />
      </header>
      <div className="space-y-8">
        {/* プロフィールカードスケルトン */}
        <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border shadow-sm overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 p-6 bg-slate-50/50 dark:bg-muted/50 space-y-2">
              <div className="h-5 w-24 bg-slate-100 dark:bg-muted rounded skeleton" />
              <div className="h-3 w-full bg-slate-100 dark:bg-muted rounded skeleton" />
              <div className="h-3 w-4/5 bg-slate-100 dark:bg-muted rounded skeleton" />
            </div>
            <div className="md:w-2/3 p-6 space-y-5">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-2 max-w-md">
                  <div className="h-3 w-16 bg-slate-100 dark:bg-muted rounded skeleton" />
                  <div className="h-10 w-full bg-slate-100 dark:bg-muted rounded-lg skeleton" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-border px-6 py-3 flex justify-between items-center">
            <div className="h-3 w-48 bg-slate-100 dark:bg-muted rounded skeleton" />
            <div className="h-8 w-16 bg-slate-100 dark:bg-muted rounded-lg skeleton" />
          </div>
        </div>
        {/* メンテナンス設定カードスケルトン */}
        <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border shadow-sm overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 p-6 bg-slate-50/50 dark:bg-muted/50 space-y-2">
              <div className="h-5 w-32 bg-slate-100 dark:bg-muted rounded skeleton" />
              <div className="h-3 w-full bg-slate-100 dark:bg-muted rounded skeleton" />
              <div className="h-3 w-4/5 bg-slate-100 dark:bg-muted rounded skeleton" />
            </div>
            <div className="md:w-2/3 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 bg-slate-100 dark:bg-muted rounded skeleton" />
                    <div className="flex gap-3">
                      <div className="h-9 flex-1 bg-slate-100 dark:bg-muted rounded-lg skeleton" />
                      <div className="h-9 flex-1 bg-slate-100 dark:bg-muted rounded-lg skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-border px-6 py-3 flex justify-between items-center">
            <div className="h-3 w-48 bg-slate-100 dark:bg-muted rounded skeleton" />
            <div className="h-8 w-16 bg-slate-100 dark:bg-muted rounded-lg skeleton" />
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

            {/* 右側：入力フォーム */}
            <div className="md:w-2/3 p-6 space-y-5">
              <div className="space-y-2 max-w-md">
                <Label className="text-slate-700 dark:text-foreground font-bold text-xs">{t("mypage.display_name")}</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="milenote_user" className="bg-white dark:bg-card border-slate-200 dark:border-border h-10 text-sm focus-visible:ring-1 focus-visible:ring-slate-300" />
              </div>

              <div className="space-y-2 max-w-md">
                <Label className="text-slate-700 dark:text-foreground font-bold text-xs">{t("mypage.user_id")}</Label>
                <div className="flex h-10 w-full overflow-hidden rounded-md border border-slate-200 dark:border-border focus-within:ring-1 focus-within:ring-slate-300">
                  <span className="flex items-center justify-center bg-slate-50 dark:bg-muted border-r border-slate-200 dark:border-border text-slate-400 dark:text-muted-foreground px-3 text-sm font-bold min-w-[40px]">@</span>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="milenote_user" className="border-none bg-white dark:bg-card h-full w-full focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" />
                </div>
                <p className="text-xs text-slate-400 dark:text-muted-foreground">{t("signup.user_id_hint")}</p>
              </div>
            </div>
          </div>

          {/* 下部：保存ボタンエリア */}
          <div data-slot="card-footer" className="border-t border-slate-100 dark:border-border p-6 flex flex-col items-end gap-4 md:flex-row md:justify-between md:items-end md:gap-6">
            <p className="w-full md:w-auto text-[11px] text-slate-500 dark:text-muted-foreground font-medium">{t("mypage.save_note")}</p>
            <Button onClick={handleUpdate} disabled={saving} className="shrink-0 px-4 h-8 text-[11px] font-bold bg-slate-900 dark:bg-primary text-white dark:text-primary-foreground hover:bg-slate-800 dark:hover:bg-primary/90 rounded-lg shadow-sm">
              {saving ? t("common.saving") : t("mypage.save_button")}
            </Button>
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

            {/* 右側：入力フォーム */}
            <div className="md:w-2/3 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {Object.keys(DEFAULT_MAINT_SETTINGS).map((key) => {
                  const isEnabled = maintSettings[key]?.enabled !== false
                  const isMonthsOnly = !!(DEFAULT_MAINT_SETTINGS as Record<string, { km: number; months: number; months_only?: boolean }>)[key]?.months_only
                  return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className={`text-xs font-bold ${isEnabled ? "text-slate-700 dark:text-foreground" : "text-slate-400 dark:text-muted-foreground"}`}>{t(`subcategories.${key}`)}</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-muted-foreground">{isEnabled ? t("mypage.notify_on") : t("mypage.notify_off")}</span>
                        <Switch checked={isEnabled} onCheckedChange={(v) => handleMaintToggle(key, v)} />
                      </div>
                    </div>
                    <div className={`flex gap-3 transition-opacity ${isEnabled ? "" : "opacity-40"}`}>
                      {!isMonthsOnly && (
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            value={maintSettings[key]?.km || ""}
                            onChange={(e) => handleMaintChange(key, "km", e.target.value)}
                            disabled={!isEnabled}
                            className="h-9 text-sm bg-white dark:bg-card border-slate-200 dark:border-border pr-8 focus-visible:ring-1 focus-visible:ring-slate-300"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-muted-foreground pointer-events-none">{t("common.km_unit")}</span>
                        </div>
                      )}
                      <div className={`relative ${isMonthsOnly ? "w-full" : "flex-1"}`}>
                        <Input
                          type="number"
                          value={maintSettings[key]?.months || ""}
                          onChange={(e) => handleMaintChange(key, "months", e.target.value)}
                          disabled={!isEnabled}
                          className="h-9 text-sm bg-white dark:bg-card border-slate-200 dark:border-border pr-10 focus-visible:ring-1 focus-visible:ring-slate-300"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-muted-foreground pointer-events-none">{t("common.months_unit")}</span>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 下部：保存ボタンエリア */}
          <div data-slot="card-footer" className="border-t border-slate-100 dark:border-border p-6 flex flex-col items-end gap-4 md:flex-row md:justify-between md:items-end md:gap-6">
            <p className="w-full md:w-auto text-[11px] text-slate-500 dark:text-muted-foreground font-medium">{t("mypage.save_together_note")}</p>
            <Button onClick={handleUpdate} disabled={saving} className="shrink-0 px-4 h-8 text-[11px] font-bold bg-slate-900 dark:bg-primary text-white dark:text-primary-foreground hover:bg-slate-800 dark:hover:bg-primary/90 rounded-lg shadow-sm">
              {saving ? t("common.saving") : t("mypage.save_button")}
            </Button>
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
              <Label className="text-slate-700 dark:text-foreground font-bold text-xs">{t("mypage.chart_color_mode")}</Label>
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

              <div className="mt-6">
                <Label className="text-slate-700 dark:text-foreground font-bold text-xs">{t("mypage.theme_mode")}</Label>
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-surface-2 p-1 mt-2">
                  {THEME_OPTIONS.map(({ value, labelKey }) => {
                    const active = themeMounted && theme === value
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
                      onPointerDown={(e) => handleDragStart(e, index)}
                      onPointerMove={handleDragMove}
                      onPointerUp={handleDragEnd}
                      onPointerCancel={handleDragEnd}
                      role="button"
                      aria-label={t("mypage.drag_handle")}
                      style={{
                        transform: isDragging ? `translateY(${translateY}px) scale(1.02)` : `translateY(${translateY}px)`,
                        transition: isDragging || justDroppedId === sectionId ? "none" : "transform 200ms ease",
                        zIndex: isDragging ? 10 : 0,
                      }}
                      className={`relative flex items-center gap-3 bg-white dark:bg-surface-2 border p-3 rounded-lg select-none touch-none cursor-grab active:cursor-grabbing ${
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
                    </div>
                  )
                })}
              </div>
              {/* 上が一番上に表示される旨の補足 */}
              <p className="mt-3 text-[11px] text-slate-400 dark:text-muted-foreground font-medium">{t("mypage.home_order_hint")}</p>
            </div>
          </div>

          {/* 下部：保存ボタンエリア */}
          <div data-slot="card-footer" className="border-t border-slate-100 dark:border-border p-6 flex flex-col items-end gap-4 md:flex-row md:justify-between md:items-end md:gap-6">
            <p className="w-full md:w-auto text-[11px] text-slate-500 dark:text-muted-foreground font-medium">{t("mypage.order_local_note")}</p>
            <Button onClick={handleUpdate} disabled={saving} className="shrink-0 px-4 h-8 text-[11px] font-bold bg-slate-900 dark:bg-primary text-white dark:text-primary-foreground hover:bg-slate-800 dark:hover:bg-primary/90 rounded-lg shadow-sm">
              {saving ? t("common.saving") : t("mypage.save_button")}
            </Button>
          </div>
        </Card>

        {/* データのエクスポート */}
        <Card className="border border-slate-200 dark:border-border shadow-sm bg-white dark:bg-card overflow-hidden rounded-xl">
          <div className="md:flex">
            {/* 左側：説明 */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 dark:border-border bg-white dark:bg-card">
              <h2 className="text-base font-bold text-slate-800 dark:text-foreground flex items-center gap-2 mb-2">
                <Download size={18} className="text-slate-500 dark:text-muted-foreground" /> {t("mypage.export")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed mb-4">
                {t("mypage.export_desc")}
              </p>
            </div>

            {/* 右側：エクスポートボタン */}
            <div className="md:w-2/3 p-6 flex items-center">
              <Button
                onClick={handleExportCsv}
                disabled={exporting}
                className="px-5 h-10 text-sm font-bold bg-slate-900 dark:bg-primary text-white dark:text-primary-foreground hover:bg-slate-800 dark:hover:bg-primary/90 rounded-lg shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? t("mypage.exporting") : t("mypage.export_button")}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* ログアウトボタン (スマホ版のみ表示、PC版はサイドバーに移動予定) */}
      <div className="md:hidden pt-8 flex justify-center mb-8">
        <Button variant="ghost" className="px-6 font-bold text-slate-400 dark:text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors text-xs" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          {t("common.logout")}
        </Button>
      </div>

      <Footer className="pt-4 pb-8" />
    </main>
  )
}