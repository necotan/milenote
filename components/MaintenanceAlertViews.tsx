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
      <Card className={`border-none shadow-sm bg-white dark:bg-card ${className}`}>
        <CardContent className="p-3.5 flex items-start gap-3">
          <div className="p-2.5 rounded-2xl shrink-0 bg-slate-50 dark:bg-surface-2 text-slate-400 dark:text-muted-foreground">
            <alert.icon size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest truncate">{alert.carName}</p>
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
          <Link
            href={`/records?action=add&category=${MAINT_TYPE_CATEGORY[alert.maintName] || "maintenance"}&sub_category=${alert.maintName}`}
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-surface-border bg-white dark:bg-surface-2 hover:bg-slate-50 dark:hover:bg-surface-3 text-slate-600 dark:text-foreground text-[10px] font-bold tracking-wider transition-colors ${reserveButtonSpace ? 'mt-9' : ''}`}
          >
            {t("home.record_now")}
          </Link>
        </CardContent>
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

export function MaintAlertRow({ alert }: { alert: MaintAlertItem }) {
  const { t } = useTranslation()
  const name = t(`subcategories.${alert.maintName}`)

  if (!alert.hasRecord) {
    return (
      <div className="flex items-start gap-3 px-4 pt-4 pb-5">
        <alert.icon size={18} className="shrink-0 mt-0.5 text-slate-300 dark:text-muted-foreground/70" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-slate-300 dark:text-muted-foreground/70 uppercase tracking-widest truncate">{alert.carName}</p>
          <div className="mt-0.5 leading-tight lg:flex lg:items-baseline lg:gap-2">
            <p className="text-sm font-bold truncate text-slate-400 dark:text-foreground/70 lg:min-w-0">{name}</p>
            {/* 高さを揃える不可視スペーサー（PC環境） */}
            <p className="hidden lg:block text-lg font-black tracking-widest lg:shrink-0 invisible" aria-hidden="true">-</p>
          </div>
          <Link
            href={`/records?action=add&category=${MAINT_TYPE_CATEGORY[alert.maintName] || "maintenance"}&sub_category=${alert.maintName}`}
            className="mt-1.5 inline-flex shrink-0 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-surface-border bg-white dark:bg-surface-2 hover:bg-slate-50 dark:hover:bg-surface-3 text-slate-600 dark:text-foreground text-xs font-bold transition-colors"
          >
            {t("records.add_record")}
          </Link>
          {/* 高さを揃える不可視スペーサー（PC環境） */}
          <div className="hidden lg:block mt-1.5 w-[80%] h-1.5 rounded-full invisible" aria-hidden="true" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 pt-4 pb-5">
      <alert.icon size={18} className={`shrink-0 mt-0.5 ${alert.color}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest truncate">{alert.carName}</p>
        <div className={`mt-0.5 leading-tight lg:flex lg:items-baseline lg:gap-2 ${alert.isUrgent ? 'text-red-600' : 'text-slate-800 dark:text-foreground'}`}>
          <p className="text-sm font-bold truncate lg:min-w-0">{name}{alert.isOver ? t("home.alert_overdue") : t("home.alert_remaining")}</p>
          <p className="text-lg font-black tracking-widest lg:shrink-0">{alert.displayValue}<span className="text-[10px] ml-0.5">{alert.isOver ? (alert.isMonthsOnly ? t("common.months_unit") : "") + t("home.exceeded") : (alert.isMonthsOnly ? t("common.months_unit") : t("common.km_unit"))}</span></p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-muted-foreground font-bold tracking-wide mt-1">
          <CalendarDays size={10} /> {t("home.months_since_last", { months: alert.monthsPassed })}
        </div>
        <div className="mt-1.5 w-[80%] bg-slate-100 dark:bg-surface-3 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-out ${alert.isUrgent ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : alert.progressPercent > 80 ? 'bg-orange-400' : 'bg-blue-400'}`}
            style={{ width: `${alert.progressPercent}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}
