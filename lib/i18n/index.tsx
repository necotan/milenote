"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import ja from "./locales/ja.json"
import en from "./locales/en.json"

export type Locale = "ja" | "en"
const locales: Record<Locale, any> = { ja, en }

type I18nContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ja")

  useEffect(() => {
    const saved = localStorage.getItem("milenote_locale") as Locale | null
    if (saved && locales[saved]) {
      setLocaleState(saved)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("milenote_locale", newLocale)
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".")
    let value: any = locales[locale]
    for (const k of keys) {
      value = value?.[k]
    }
    if (typeof value !== "string") return key
    if (params) {
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v)),
        value
      )
    }
    return value
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) throw new Error("useTranslation must be used within LanguageProvider")
  return context
}

/** ロケールに応じた日付フォーマット */
export function formatDateLocale(dateStr: string | null, locale: Locale): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (locale === "en") {
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** ロケールに応じた経過月数のフォーマット */
export function formatMonthsPassedLocale(dateStr: string | null, locale: Locale): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  const today = new Date()
  const months = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth())
  if (months < 0) return "-"
  const y = Math.floor(months / 12)
  const m = months % 12
  if (locale === "en") {
    return y > 0 ? `${y}y ${m}m` : `${m} months`
  }
  return y > 0 ? `${y}年${m}ヶ月` : `${m}ヶ月`
}
