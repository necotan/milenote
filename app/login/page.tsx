"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/lib/i18n"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else router.push("/")
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-white">
      <div className="w-full max-w-sm">
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold text-center">Milenote</h1>
          <p className="text-sm text-slate-500 text-center">{t("login.subtitle")}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input id="email" type="email" placeholder="example@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="border-slate-300" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("login.password")}</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder={t("login.password_placeholder")} value={password} onChange={(e) => setPassword(e.target.value)} required className="border-slate-300 pr-10" />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
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
    </div>
  )
}