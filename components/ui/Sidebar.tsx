"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FileText, BarChart2, CarFront, User, LogOut } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

export default function Sidebar() {
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
        // サイドバーの背景をメインコンテンツと同じにし、区切り線をなくします
        <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-slate-50 dark:bg-background p-6 z-10">
            <div className="mb-12 px-2 pt-2">
                <h1 className="text-3xl font-black tracking-widest text-slate-900 dark:text-foreground">Milenote</h1>
            </div>
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${isActive
                                    ? "bg-white dark:bg-card shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-none text-slate-900 dark:text-foreground font-bold" // アクティブ時は白背景とドロップシャドウで強調表示
                                    : "text-slate-500 hover:bg-white/50 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-card/50 dark:hover:text-foreground font-medium"
                                }`}
                        >
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-sm tracking-widest">{t(`nav.${item.key}`)}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* ログアウトボタン (PC版設定) */}
            <div className="mt-auto pt-8 border-t border-slate-200/50 dark:border-border">
                <button
                    onClick={async () => {
                        const { createClient } = await import("@/utils/supabase")
                        const supabase = createClient()
                        await supabase.auth.signOut()
                        window.location.href = "/login"
                    }}
                    className="flex w-full items-center gap-4 px-4 py-3.5 rounded-xl transition-all text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-muted-foreground dark:hover:bg-red-950/40 dark:hover:text-red-400 font-medium"
                >
                    <LogOut size={20} />
                    <span className="text-sm tracking-widest">{t("common.logout")}</span>
                </button>
            </div>
        </aside>
    )
}