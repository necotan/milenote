"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, FileText, BarChart2, CarFront, User, LogOut } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { isHomeSubRoute } from "@/utils/homeSubRoutes"
import { signOutAndClearUser } from "@/lib/hooks/useSupabaseUser"

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { t } = useTranslation()

    const navItems = [
        { key: "home", href: "/", icon: Home },
        { key: "records", href: "/records", icon: FileText },
        { key: "stats", href: "/stats", icon: BarChart2 },
        { key: "garage", href: "/garage", icon: CarFront },
        { key: "mypage", href: "/mypage", icon: User },
    ]

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-page p-6 z-10">
            <div className="mb-12 px-2 pt-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-foreground">Milenote</h1>
            </div>
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.key === "home" && isHomeSubRoute(pathname))
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${isActive
                                    ? "bg-white dark:bg-card text-slate-900 dark:text-foreground font-semibold" // アクティブ時は白背景（ダークはカード色）で強調表示
                                    : "text-slate-600 hover:bg-white/50 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-card/50 dark:hover:text-foreground font-medium"
                                }`}
                        >
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-sm">{t(`nav.${item.key}`)}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="mt-auto pt-8 border-t border-slate-300 dark:border-border">
                <button
                    onClick={async () => {
                        await signOutAndClearUser()
                        router.push("/login")
                    }}
                    className="flex w-full items-center gap-4 px-4 py-3.5 rounded-xl transition-all text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-muted-foreground dark:hover:bg-red-950/40 dark:hover:text-red-400 font-medium"
                >
                    <LogOut size={20} />
                    <span className="text-sm">{t("common.logout")}</span>
                </button>
            </div>
        </aside>
    )
}