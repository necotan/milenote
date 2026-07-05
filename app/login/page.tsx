"use client"

import React, { useState } from "react"
import { createClient } from "@/utils/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/lib/i18n"
import { Eye, EyeOff, X } from "lucide-react"
import Footer from "@/components/ui/Footer"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorPopup, setErrorPopup] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    // 生のエラー文言は出さず、汎用メッセージを表示
    if (error) setErrorPopup(t("login.login_failed"))
    else router.push("/")
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8 bg-white dark:bg-background">
      {/* エラーポップアップ */}
      {errorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card rounded-2xl shadow-xl p-6 mx-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-foreground">{t("login.error_title")}</h3>
              <button
                onClick={() => setErrorPopup(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-muted-foreground dark:hover:text-foreground transition-colors -mt-1 -mr-1"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-muted-foreground leading-relaxed">{errorPopup}</p>
            <Button
              className="w-full mt-4 font-bold"
              onClick={() => setErrorPopup(null)}
            >
              OK
            </Button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm">
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold text-center">Milenote</h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground text-center">{t("login.subtitle")}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input id="email" type="email" placeholder="example@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="border-slate-300 dark:border-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("login.password")}</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder={t("login.password_placeholder")} value={password} onChange={(e) => setPassword(e.target.value)} required className="border-slate-300 dark:border-border pr-10" />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-muted-foreground dark:hover:text-foreground transition-colors" tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 pt-2">
            <Button className="font-bold min-w-[200px]" type="submit" disabled={loading}>
              {loading ? t("login.processing") : t("login.login")}
            </Button>
            <Button variant="outline" className="min-w-[200px]" type="button" onClick={() => router.push("/login/signup")}>
              {t("login.signup")}
            </Button>
          </div>
        </form>
      </div>
      <Footer className="absolute bottom-0 left-0 right-0 pb-6" />
    </div>
  )
}