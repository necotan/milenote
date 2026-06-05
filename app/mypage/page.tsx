"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { User, LogOut, Save, Settings, Wrench, ArrowUp, ArrowDown, LayoutTemplate, Globe, Accessibility } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"

const DEFAULT_MAINT_SETTINGS = {
  "オイル交換": { km: 5000, months: 6 },
  "オイルフィルター交換": { km: 10000, months: 12 },
  "タイヤローテーション": { km: 5000, months: 6 },
  "バッテリー交換": { km: 30000, months: 24 },
}

export default function MyPage() {
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [maintSettings, setMaintSettings] = useState<any>(DEFAULT_MAINT_SETTINGS)
  const [homeOrder, setHomeOrder] = useState<string[]>(["summary", "alerts", "cars"])
  const [isColorful, setIsColorful] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { t, locale, setLocale } = useTranslation()

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from("users").select("*").eq("id", user.id).single()
        if (data) {
          setUsername(data.username || "")
          setDisplayName(data.display_name || "")
          // DBに設定があれば読み込み、なければデフォルト
          if (data.maint_settings) {
            setMaintSettings(data.maint_settings)
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
      } catch(e) {}
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

  const moveHomeOrder = (index: number, direction: -1 | 1) => {
    const newOrder = [...homeOrder]
    if (index + direction < 0 || index + direction >= newOrder.length) return
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + direction]
    newOrder[index + direction] = temp
    setHomeOrder(newOrder)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) return (
    <main className="p-4 space-y-6 max-w-5xl mx-auto">
      <header className="pt-4 pb-2">
        <div className="h-8 w-32 bg-slate-100 rounded-lg animate-pulse" />
      </header>
      <div className="space-y-8">
        {/* プロフィールカードスケルトン */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 p-6 bg-slate-50/50 space-y-2">
              <div className="h-5 w-24 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="md:w-2/3 p-6 space-y-5">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-2 max-w-md">
                  <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 w-full bg-slate-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 px-6 py-3 flex justify-between items-center">
            <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        </div>
        {/* メンテナンス設定カードスケルトン */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 p-6 bg-slate-50/50 space-y-2">
              <div className="h-5 w-32 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="md:w-2/3 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                    <div className="flex gap-3">
                      <div className="h-9 flex-1 bg-slate-100 rounded-lg animate-pulse" />
                      <div className="h-9 flex-1 bg-slate-100 rounded-lg animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 px-6 py-3 flex justify-between items-center">
            <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  )

  return (
    <main className="p-4 space-y-6 max-w-5xl mx-auto">
      <header className="pt-4 pb-2 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t("mypage.title")}</h1>
          <p className="text-xs font-bold text-slate-400 tracking-wider mt-1">{t("mypage.subtitle")}</p>
        </div>
      </header>

      <div className="space-y-8">
        {/* プロフィール設定 */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
          <div className="md:flex">
            {/* 左側：説明 */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
                <User size={18} className="text-slate-500" /> {t("mypage.profile")}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t("mypage.profile_desc")}
              </p>
            </div>

            {/* 右側：入力フォーム */}
            <div className="md:w-2/3 p-6 space-y-5">
              <div className="space-y-2 max-w-md">
                <Label className="text-slate-700 font-bold text-xs">{t("mypage.display_name")}</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="milenote_user" className="bg-white border-slate-200 h-10 text-sm focus-visible:ring-1 focus-visible:ring-slate-300" />
              </div>

              <div className="space-y-2 max-w-md">
                <Label className="text-slate-700 font-bold text-xs">{t("mypage.user_id")}</Label>
                <div className="flex h-10 w-full overflow-hidden rounded-md border border-slate-200 focus-within:ring-1 focus-within:ring-slate-300">
                  <span className="flex items-center justify-center bg-slate-50 border-r border-slate-200 text-slate-400 px-3 text-sm font-bold min-w-[40px]">@</span>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="milenote_user" className="border-none bg-white h-full w-full focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" />
                </div>
                <p className="text-xs text-slate-400">{t("signup.user_id_hint")}</p>
              </div>
            </div>
          </div>

          {/* 下部：保存ボタンエリア */}
          <div data-slot="card-footer" className="border-t border-slate-100 p-6 flex flex-col items-end gap-4 md:flex-row md:justify-between md:items-end md:gap-6">
            <p className="w-full md:w-auto text-[11px] text-slate-500 font-medium">{t("mypage.save_note")}</p>
            <Button onClick={handleUpdate} disabled={saving} className="shrink-0 px-4 h-8 text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-sm">
              {saving ? t("common.saving") : t("mypage.save_button")}
            </Button>
          </div>
        </Card>

        {/* メンテナンス基準設定 */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
          <div className="md:flex">
            {/* 左側：説明 */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
                <Wrench size={18} className="text-slate-500" /> {t("mypage.maintenance_settings")}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                {t("mypage.maintenance_desc")}
              </p>
            </div>

            {/* 右側：入力フォーム */}
            <div className="md:w-2/3 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {Object.keys(DEFAULT_MAINT_SETTINGS).map((key) => {
                  const isEnabled = maintSettings[key]?.enabled !== false
                  return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className={`text-xs font-bold ${isEnabled ? "text-slate-700" : "text-slate-400"}`}>{t(`maintenance_items.${key}`)}</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">{isEnabled ? t("mypage.notify_on") : t("mypage.notify_off")}</span>
                        <Switch checked={isEnabled} onCheckedChange={(v) => handleMaintToggle(key, v)} />
                      </div>
                    </div>
                    <div className={`flex gap-3 transition-opacity ${isEnabled ? "" : "opacity-40"}`}>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          value={maintSettings[key]?.km || ""}
                          onChange={(e) => handleMaintChange(key, "km", e.target.value)}
                          disabled={!isEnabled}
                          className="h-9 text-sm bg-white border-slate-200 pr-8 focus-visible:ring-1 focus-visible:ring-slate-300"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">{t("common.km_unit")}</span>
                      </div>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          value={maintSettings[key]?.months || ""}
                          onChange={(e) => handleMaintChange(key, "months", e.target.value)}
                          disabled={!isEnabled}
                          className="h-9 text-sm bg-white border-slate-200 pr-10 focus-visible:ring-1 focus-visible:ring-slate-300"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">{t("common.months_unit")}</span>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 下部：保存ボタンエリア */}
          <div data-slot="card-footer" className="border-t border-slate-100 p-6 flex flex-col items-end gap-4 md:flex-row md:justify-between md:items-end md:gap-6">
            <p className="w-full md:w-auto text-[11px] text-slate-500 font-medium">{t("mypage.save_together_note")}</p>
            <Button onClick={handleUpdate} disabled={saving} className="shrink-0 px-4 h-8 text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-sm">
              {saving ? t("common.saving") : t("mypage.save_button")}
            </Button>
          </div>
        </Card>

        {/* 言語設定 */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
          <div className="md:flex">
            {/* 左側：説明 */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
                <Globe size={18} className="text-slate-500" /> {t("mypage.language")}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                {t("mypage.language_desc")}
              </p>
            </div>

            {/* 右側：言語選択UI */}
            <div className="md:w-2/3 p-6">
              <div className="flex gap-3 max-w-sm">
                <button
                  onClick={() => setLocale("ja")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    locale === "ja"
                      ? "border-slate-400 bg-slate-50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <span className="text-lg">🇯🇵</span>
                  <span className={`text-sm font-bold ${locale === "ja" ? "text-slate-800" : "text-slate-500"}`}>日本語</span>
                </button>
                <button
                  onClick={() => setLocale("en")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    locale === "en"
                      ? "border-slate-400 bg-slate-50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <span className="text-lg">🇺🇸</span>
                  <span className={`text-sm font-bold ${locale === "en" ? "text-slate-800" : "text-slate-500"}`}>English</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* アクセシビリティ */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
          <div className="md:flex">
            {/* 左側：説明 */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
                <Accessibility size={18} className="text-slate-500" /> {t("mypage.accessibility")}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                {t("mypage.accessibility_desc")}
              </p>
            </div>

            {/* 右側：カラーモード選択UI */}
            <div className="md:w-2/3 p-6">
              <Label className="text-slate-700 font-bold text-xs">{t("mypage.chart_color_mode")}</Label>
              <div className="flex gap-3 max-w-sm mt-2">
                <button
                  onClick={() => handleColorfulChange(false)}
                  className={`flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    !isColorful
                      ? "border-slate-400 bg-slate-50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex gap-1">
                    {["#0ea5e9", "#2563eb", "#6366f1", "#38bdf8", "#1e3a8a"].map(c => (
                      <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <span className={`text-sm font-bold ${!isColorful ? "text-slate-800" : "text-slate-500"}`}>{t("mypage.chart_color_basic")}</span>
                </button>
                <button
                  onClick={() => handleColorfulChange(true)}
                  className={`flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    isColorful
                      ? "border-slate-400 bg-slate-50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex gap-1">
                    {["#3b82f6", "#f97316", "#a855f7", "#ef4444", "#22c55e"].map(c => (
                      <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <span className={`text-sm font-bold ${isColorful ? "text-slate-800" : "text-slate-500"}`}>{t("mypage.chart_color_colorful")}</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* ホーム画面のカスタマイズ */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
          <div className="md:flex">
            {/* 左側：説明 */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
                <LayoutTemplate size={18} className="text-slate-500" /> {t("mypage.home_order")}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                {t("mypage.home_order_desc")}
              </p>
            </div>

            {/* 右側：並び替えUI */}
            <div className="md:w-2/3 p-6">
              <div className="space-y-2 max-w-sm">
                {homeOrder.map((sectionId, index) => (
                  <div key={sectionId} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                    <span className="text-sm font-bold text-slate-700">{t(`mypage.home_sections.${sectionId}`)}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-slate-800 border-slate-200"
                        onClick={() => moveHomeOrder(index, -1)}
                        disabled={index === 0}
                      >
                        <ArrowUp size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-slate-800 border-slate-200"
                        onClick={() => moveHomeOrder(index, 1)}
                        disabled={index === homeOrder.length - 1}
                      >
                        <ArrowDown size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 下部：保存ボタンエリア */}
          <div data-slot="card-footer" className="border-t border-slate-100 p-6 flex flex-col items-end gap-4 md:flex-row md:justify-between md:items-end md:gap-6">
            <p className="w-full md:w-auto text-[11px] text-slate-500 font-medium">{t("mypage.order_local_note")}</p>
            <Button onClick={handleUpdate} disabled={saving} className="shrink-0 px-4 h-8 text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-sm">
              {saving ? t("common.saving") : t("mypage.save_button")}
            </Button>
          </div>
        </Card>
      </div>

      {/* ログアウトボタン (スマホ版のみ表示、PC版はサイドバーに移動予定) */}
      <div className="md:hidden pt-8 flex justify-center mb-8">
        <Button variant="ghost" className="px-6 font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors text-xs" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          {t("common.logout")}
        </Button>
      </div>
    </main>
  )
}