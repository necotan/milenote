"use client"

import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@/lib/i18n"
import { MAINT_TYPE_CATEGORY } from "@/lib/subcategories"
import type { MaintAlertItem } from "@/lib/maintenanceAlerts"

export function MaintAlertCard({ alert, className = "", reserveButtonSpace = false }: { alert: MaintAlertItem; className?: string; reserveButtonSpace?: boolean }) {
  const { t } = useTranslation()

  if (!alert.hasRecord) {
    return (
      <Card className={`relative border-none shadow-sm bg-white dark:bg-card ${className}`}>
        <CardContent className="p-3.5 flex items-start gap-3">
          <div className="p-2.5 rounded-2xl shrink-0 bg-slate-50 dark:bg-surface-2 text-slate-400 dark:text-muted-foreground">
            <alert.icon size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest truncate pr-16">{alert.carName}</p>
            <div className="mt-0.5 leading-tight text-slate-500 dark:text-muted-foreground">
              <p className="text-[11px] font-bold tracking-wider">{t(`subcategories.${alert.maintName}`)}</p>
              <p className="text-lg font-black tracking-widest">{t("home.unrecorded")}</p>
            </div>
            {/* 記録済みカードと縦サイズを揃えるための不可視スペーサー */}
            <div className="flex flex-col gap-1.5 mt-1 invisible" aria-hidden="true">
              <div className="flex items-center gap-1 text-[10px] font-bold tracking-wide">
                <CalendarDays size={10} /> -
              </div>
              <div className="w-[80%] h-1.5 rounded-full" />
            </div>
          </div>
        </CardContent>
        {/* ホームの「すべて見る」と同じ配置（reserveButtonSpaceは重なり回避用） */}
        <Link
          href={`/records?action=add&category=${MAINT_TYPE_CATEGORY[alert.maintName] || "maintenance"}&sub_category=${alert.maintName}`}
          className={`absolute z-10 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-surface-border bg-white dark:bg-surface-2 hover:bg-slate-50 dark:hover:bg-surface-3 text-slate-600 dark:text-foreground text-[10px] font-bold tracking-wider transition-colors ${reserveButtonSpace ? 'top-12 right-3' : 'top-3 right-3'}`}
        >
          {t("home.record_now")}
        </Link>
      </Card>
    )
  }

  return (
    <Card className={`border-none shadow-sm bg-white dark:bg-card ${className}`}>
      <CardContent className="p-3.5 flex items-start gap-3">
        <div className={`p-2.5 rounded-2xl shrink-0 ${alert.isUrgent ? 'bg-red-50 dark:bg-red-950/40' : 'bg-slate-50 dark:bg-surface-2'} ${alert.color}`}>
          <alert.icon size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest truncate ${reserveButtonSpace ? 'pr-16' : ''}`}>{alert.carName}</p>
          <div className={`mt-0.5 leading-tight ${alert.isUrgent ? 'text-red-600' : 'text-slate-800 dark:text-foreground'}`}>
            <p className="text-[11px] font-bold tracking-wider">{t(`subcategories.${alert.maintName}`)}{alert.isOver ? t("home.alert_overdue") : t("home.alert_remaining")}</p>
            <p className="text-lg font-black tracking-widest">{alert.displayValue}<span className="text-[10px] ml-0.5">{alert.isOver ? (alert.isMonthsOnly ? t("common.months_unit") : "") + t("home.exceeded") : (alert.isMonthsOnly ? t("common.months_unit") : t("common.km_unit"))}</span></p>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-muted-foreground font-bold tracking-wide">
              <CalendarDays size={10} /> {t("home.months_since_last", { months: alert.monthsPassed })}
            </div>
            <div className="w-[80%] bg-slate-100 dark:bg-surface-3 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-out ${alert.isUrgent ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : alert.progressPercent > 80 ? 'bg-orange-400' : 'bg-blue-400'}`}
                style={{ width: `${alert.progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
