"use client"

import React, { useState } from "react"
import { createClient } from "@/utils/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/lib/i18n"
import { Eye, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogActionButton } from "@/components/ui/dialog"
import Footer from "@/components/ui/Footer"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorPopup, setErrorPopup] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    // 生のエラー文言は出さず、汎用メッセージを表示
    if (error) {
      setErrorPopup(t("login.login_failed"))
      setLoading(false)
      return
    }
    // 成功時はローディング表示のまま遷移させる
    router.push("/")
  }

  // パスワードリセットモーダルを開く
  const openResetModal = () => {
    setResetEmail(email)
    setResetSent(false)
    setResetOpen(true)
  }

  // パスワードリセットメール送信
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) return
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    // メールアドレスの登録有無を漏らさないため、結果に関わらず送信完了の表示にする
    setResetLoading(false)
    setResetSent(true)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8 bg-white dark:bg-background">
      {/* エラーポップアップ */}
      <Dialog open={errorPopup !== null} onOpenChange={(open) => { if (!open) setErrorPopup(null) }}>
        <DialogContent>
          <DialogTitle>{t("login.error_title")}</DialogTitle>
          <DialogDescription className="mt-2 leading-relaxed">{errorPopup}</DialogDescription>
          <DialogFooter>
            <DialogActionButton onClick={() => setErrorPopup(null)}>OK</DialogActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* パスワードリセットモーダル */}
      {/* 入力中の内容を失わないよう、画面外のタップでは閉じない */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogTitle>{t("reset.request_title")}</DialogTitle>
          {resetSent ? (
            <>
              <DialogDescription className="mt-2 leading-relaxed whitespace-pre-line">{t("reset.sent_message")}</DialogDescription>
              <DialogFooter>
                <DialogActionButton onClick={() => setResetOpen(false)}>OK</DialogActionButton>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleResetRequest}>
              <DialogDescription className="mt-2 leading-relaxed">{t("reset.request_description")}</DialogDescription>
              <div className="mt-4 space-y-2">
                <Label htmlFor="reset-email">{t("login.email")}</Label>
                <Input id="reset-email" type="email" placeholder="example@mail.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required className="border-slate-300 dark:border-border" />
              </div>
              <DialogFooter>
                <DialogActionButton type="submit" disabled={resetLoading}>
                  {resetLoading ? t("login.processing") : t("reset.send")}
                </DialogActionButton>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="w-full max-w-sm">
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold text-center">Milenote</h1>
          <p className="text-sm text-slate-600 dark:text-muted-foreground text-center">{t("login.subtitle")}</p>
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
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 dark:text-muted-foreground dark:hover:text-foreground transition-colors" tabIndex={-1}>
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
            <button
              type="button"
              onClick={openResetModal}
              className="mt-2 text-xs text-slate-500 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors underline underline-offset-2"
            >
              {t("login.forgot_password")}
            </button>
          </div>
        </form>
      </div>
      <Footer className="absolute bottom-0 left-0 right-0 pb-6" />
    </div>
  )
}