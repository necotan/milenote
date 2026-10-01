"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import ja from "./locales/ja.json"
import en from "./locales/en.json"

export type Locale = "ja" | "en"
type Messages = { [key: string]: string | Messages }
const locales: Record<Locale, Messages> = { ja, en }

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
      // SSR の初期HTMLと一致させるため、保存済みの言語はマウント後に反映する
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    let value: string | Messages | undefined = locales[locale]
    for (const k of keys) {
      value = typeof value === "object" ? value[k] : undefined
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

export function formatDateLocale(dateStr: string | null, locale: Locale): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (locale === "en") {
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** ロケールに応じた年月のフォーマット（monthは1始まり） */
export function formatYearMonthLocale(year: number, month: number, locale: Locale): string {
  if (locale === "en") {
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", { year: "numeric", month: "short" })
  }
  return `${year}年${month}月`
}

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
