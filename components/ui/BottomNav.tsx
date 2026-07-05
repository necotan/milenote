"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FileText, BarChart2, CarFront, User } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

export default function BottomNav() {
  const pathname = usePathname()
  const { t } = useTranslation()

  const navItems = [
    { key: "home", href: "/", icon: Home },
    { key: "records", href: "/records", icon: FileText },
    { key: "stats", href: "/stats", icon: BarChart2 },
    { key: "garage", href: "/garage", icon: CarFront },
    { key: "mypage", href: "/mypage", icon: User },
  ]

  return (
    // PC画面 (md以上) では下部ナビゲーションを非表示にする
    // スマホでは画面下から少し浮かせ、角を丸くしたダイナミックアイランド風デザインに変更
    <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 h-16 rounded-full bg-white/90 dark:bg-card/90 backdrop-blur-md shadow-lg border border-slate-100 dark:border-border">
      <div className="flex w-full max-w-md mx-auto justify-around items-center h-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? "text-slate-900 dark:text-foreground" : "text-slate-400 hover:text-slate-600 dark:text-muted-foreground dark:hover:text-foreground"
                }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{t(`nav.${item.key}`)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}