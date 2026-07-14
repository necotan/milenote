"use client"

import React, { Suspense, useState } from "react"
import { createClient } from "@/utils/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/lib/i18n"
import { Eye, EyeOff, X } from "lucide-react"
import Footer from "@/components/ui/Footer"

function ResetPasswordContent() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errorPopup, setErrorPopup] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { t } = useTranslation()

  const tokenHash = searchParams.get("token_hash")

  // パスワード更新処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenHash) return

    if (password.length < 6) {
      setErrorPopup(t("signup.password_too_short"))
      return
    }
    if (password !== confirmPassword) {
      setErrorPopup(t("reset.password_mismatch"))
      return
    }

    setLoading(true)

    // フォーム送信時に初めてトークンを検証
    if (!verified) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash: tokenHash,
      })
      if (verifyError) {
        // 期限切れ、使用済みトークン
        setLinkInvalid(true)
        setLoading(false)
        return
      }
      setVerified(true)
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      if (updateError.code === "same_password") {
        setErrorPopup(t("reset.same_password"))
      } else {
        setErrorPopup(t("common.error_occurred"))
      }
      setLoading(false)
      return
    }

    setLoading(false)
    setSucceeded(true)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8 bg-white dark:bg-background">
      {/* エラーポップアップ */}
      {errorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border shadow-xl p-6 mx-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-foreground">{t("reset.error_title")}</h3>
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

      {/* 更新完了ポップアップ */}
      {succeeded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border shadow-xl p-6 mx-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-slate-800 dark:text-foreground mb-3">{t("reset.success_title")}</h3>
            <p className="text-sm text-slate-600 dark:text-muted-foreground leading-relaxed">{t("reset.success_message")}</p>
            <Button
              className="w-full mt-4 font-bold"
              onClick={() => router.push("/")}
            >
              OK
            </Button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm">
        <div className="space-y-1 mb-6 text-center">
          <h1 className="text-2xl font-bold">Milenote</h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground">{t("reset.new_password_title")}</p>
        </div>

        {!tokenHash || linkInvalid ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-slate-600 dark:text-muted-foreground leading-relaxed">{t("reset.invalid_link")}</p>
            <Button variant="outline" className="min-w-[200px]" onClick={() => router.push("/login")}>
              {t("signup.back_to_login")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("reset.new_password")}</Label>
              <div className="relative">
                <Input id="new-password" type={showPassword ? "text" : "password"} placeholder={t("login.password_placeholder")} value={password} onChange={(e) => setPassword(e.target.value)} required className="border-slate-300 dark:border-border pr-10" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-muted-foreground dark:hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("reset.confirm_password")}</Label>
              <div className="relative">
                <Input id="confirm-password" type={showConfirm ? "text" : "password"} placeholder={t("login.password_placeholder")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="border-slate-300 dark:border-border pr-10" />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-muted-foreground dark:hover:text-foreground transition-colors" tabIndex={-1}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 pt-2">
              <Button className="font-bold min-w-[200px]" type="submit" disabled={loading}>
                {loading ? t("login.processing") : t("reset.update")}
              </Button>
            </div>
          </form>
        )}
      </div>
      <Footer className="absolute bottom-0 left-0 right-0 pb-6" />
    </div>
  )
}

export default function ResetPasswordPage() {
  // useSearchParams を使うため Suspense でラップする
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}
