"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/utils/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CarFront } from "lucide-react"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n"
import { usePageLoadingGate } from "@/lib/loadingGate"
import { MAINT_CATEGORIES } from "@/lib/subcategories"
import { generateMaintAlerts, DEFAULT_MAINT_SETTINGS, type MaintSettings, type MaintAlertItem, type MaintAlertCar, type MaintAlertRecord } from "@/lib/maintenanceAlerts"
import { MaintAlertCard } from "@/components/MaintenanceAlertViews"

export default function MaintenancePage() {
  const [cars, setCars] = useState<MaintAlertCar[]>([])
  const [alerts, setAlerts] = useState<MaintAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { t } = useTranslation()

  // 初回ローディング画面とデータ取得を連動させる
  usePageLoadingGate(!loading)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: userData } = await supabase.from("users").select("maint_settings").eq("id", user.id).single()
      const maintSettings: MaintSettings =
        userData?.maint_settings && Object.keys(userData.maint_settings).length > 0 ? userData.maint_settings : DEFAULT_MAINT_SETTINGS

      const { data: carsData } = await supabase.from("cars").select("id, name, current_odo").eq("user_id", user.id).eq("status", "active").eq("is_display_home", true)
      const { data: recordsData } = await supabase.from("records").select("car_id, sub_category, date, odo_at_record, cars!inner(status)").eq("user_id", user.id).in("cars.status", ["active", "archived"])

      if (carsData) setCars(carsData)
      if (carsData && recordsData) {
        setAlerts(generateMaintAlerts(carsData, recordsData as MaintAlertRecord[], maintSettings))
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return (
    <main className="p-4 space-y-6 max-w-4xl">
      <header className="pt-4 pb-2">
        <Skeleton className="h-4 w-24" />
      </header>
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-24 ml-1 mb-2" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="rounded-xl bg-white dark:bg-card shadow-[0_2px_12px_rgba(0,0,0,0.02)] ring-1 ring-slate-200/50 dark:ring-border overflow-hidden py-4">
                  <div className="p-3.5 flex items-start gap-3">
                    <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-2.5 w-16" />
                      <div className="mt-0.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="mt-0.5 h-7 w-24" />
                      </div>
                      <div className="flex flex-col gap-1.5 mt-1">
                        <Skeleton className="h-2.5 w-24" />
                        <Skeleton className="h-1.5 w-[80%] rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )

  return (
    <main className="p-4 space-y-6 max-w-4xl">
      <header className="pt-4 pb-2">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors">
          <span className="font-bold text-xs">{t("home.back_to_home")}</span>
        </Link>
      </header>

      {cars.length === 0 ? (
        <Card className="border-none shadow-sm bg-white dark:bg-card p-10 text-center">
          <CarFront className="mx-auto h-12 w-12 text-slate-200 dark:text-muted-foreground mb-3" />
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground mb-4 tracking-tighter">{t("home.no_cars_registered")}</p>
          <Link href="/garage"><Button className="font-bold text-xs px-6 tracking-widest">{t("home.register")}</Button></Link>
        </Card>
      ) : alerts.length === 0 ? (
        <Card className="border-none shadow-sm bg-white dark:bg-card p-6 text-center">
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground tracking-widest">{t("home.no_alerts")}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {MAINT_CATEGORIES.map((category) => {
            const items = category.items.flatMap((maintName) => alerts.filter((a) => a.maintName === maintName))
            if (items.length === 0) return null
            return (
              <div key={category.key}>
                <p className="text-[11px] font-bold text-slate-400 dark:text-muted-foreground tracking-wide mb-2 px-1">
                  {t(`mypage.maint_category_${category.key}`)}
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-stretch">
                  {items.map((alert) => (
                    <MaintAlertCard key={alert.id} alert={alert} className="h-full" />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
