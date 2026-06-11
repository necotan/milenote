"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/lib/i18n"
import { Eye, EyeOff, ArrowLeft, X } from "lucide-react"
import Footer from "@/components/ui/Footer"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorPopup, setErrorPopup] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    if (!email || !password || !userId) return

    if (password.length < 6) {
      setErrorPopup(t("signup.password_too_short"))
      return
    }

    // ユーザーIDのフォーマットチェック（英数字とアンダースコアのみ）
    if (!/^[a-zA-Z0-9_]+$/.test(userId)) {
      setErrorPopup(t("signup.invalid_user_id"))
      return
    }

    setLoading(true)

    try {
      // ユーザーIDの重複チェック
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", userId)
        .maybeSingle()

      if (existingUser) {
        setErrorPopup(t("signup.user_id_taken"))
        setLoading(false)
        return
      }

      // Supabase Auth でアカウント作成
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: userId,
            username: userId,
          }
        }
      })

      if (error) {
        // メール重複などのエラーハンドリング
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          setErrorPopup(t("signup.email_taken"))
        } else {
          setErrorPopup(error.message)
        }
      } else {
        alert(t("login.confirmation_sent"))
        router.push("/login")
      }
    } catch (err) {
      setErrorPopup(t("common.error_occurred"))
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-white relative">
      {/* エラーポップアップ */}
      {errorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl p-6 mx-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">{t("signup.error_title")}</h3>
              <button
                onClick={() => setErrorPopup(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors -mt-1 -mr-1"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{errorPopup}</p>
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
        <div className="space-y-1 mb-6 text-center">
          <h1 className="text-2xl font-bold">Milenote</h1>
          <p className="text-sm text-slate-500">{t("signup.subtitle")}</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          {/* メールアドレス */}
          <div className="space-y-2">
            <Label htmlFor="signup-email">
              {t("login.email")} <span className="text-red-500">{t("common.required")}</span>
            </Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-slate-300"
            />
          </div>

          {/* ユーザーID */}
          <div className="space-y-2">
            <Label htmlFor="signup-userid">
              {t("signup.user_id")} <span className="text-red-500">{t("common.required")}</span>
            </Label>
            <div className="flex h-10 w-full overflow-hidden rounded-md border border-slate-300 focus-within:ring-1 focus-within:ring-slate-400">
              <span className="flex items-center justify-center bg-slate-50 border-r border-slate-300 text-slate-400 px-3 text-sm font-bold min-w-[40px]">@</span>
              <Input
                id="signup-userid"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="milenote_user"
                required
                className="border-none bg-white h-full w-full focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-400">{t("signup.user_id_hint")}</p>
          </div>

          {/* パスワード */}
          <div className="space-y-2">
            <Label htmlFor="signup-password">
              {t("login.password")} <span className="text-red-500">{t("common.required")}</span>
            </Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder={t("signup.password_placeholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-slate-300 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* 登録ボタンと戻るボタン */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <Button className="font-bold min-w-[200px]" type="submit" disabled={loading}>
              {loading ? t("login.processing") : t("signup.create_account")}
            </Button>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="font-bold text-xs">{t("signup.back_to_login")}</span>
            </button>
          </div>
        </form>
      </div>
      <Footer className="absolute bottom-0 left-0 right-0 pb-6" />
    </div>
  )
}
