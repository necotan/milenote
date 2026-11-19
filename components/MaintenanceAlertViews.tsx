"use client"

import Link from "next/link"
import { CalendarDays, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { pluralKey, useTranslation } from "@/lib/i18n"
import { MAINT_TYPE_CATEGORY } from "@/lib/subcategories"
import type { MaintAlertItem } from "@/lib/maintenanceAlerts"

export function MaintAlertCard({ alert, className = "", reserveButtonSpace = false }: { alert: MaintAlertItem; className?: string; reserveButtonSpace?: boolean }) {
  const { t } = useTranslation()

  if (!alert.hasRecord) {
    return (
      <Card className={`relative border-none bg-white dark:bg-card ${alert.isDisabled ? "opacity-50" : ""} ${className}`}>
        <CardContent className="p-3.5 flex items-start gap-3">
          <div className="p-2.5 rounded-2xl shrink-0 bg-slate-50 dark:bg-surface-2 text-slate-500 dark:text-muted-foreground">
            <alert.icon size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-slate-500 dark:text-muted-foreground truncate pr-16">{alert.carName}</p>
            <div className="mt-0.5 leading-tight text-slate-600 dark:text-muted-foreground">
              <p className="text-[11px] font-bold">{t(`subcategories.${alert.maintName}`)}{alert.isDisabled ? ` (${t("mypage.maint_disabled_desc")})` : ""}</p>
              <p className="text-base leading-[22.5px] font-bold">{t("home.unrecorded")}</p>
            </div>
            {/* 記録済みカードと縦サイズを揃えるための不可視スペーサー */}
            <div className="flex flex-col gap-1.5 mt-1 invisible" aria-hidden="true">
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <CalendarDays size={10} /> -
              </div>
              <div className="w-[80%] h-1.5 rounded-full" />
            </div>
          </div>
        </CardContent>
        {/* ホームの「すべて見る」と同じ配置（reserveButtonSpaceは重なり回避用） */}
        <Link
          href={`/records?action=add&category=${MAINT_TYPE_CATEGORY[alert.maintName] || "maintenance"}&sub_category=${alert.maintName}`}
          className={`absolute z-10 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-slate-100 dark:bg-surface-2 hover:bg-slate-200 dark:hover:bg-surface-3 text-slate-700 dark:text-foreground text-[11px] font-semibold transition-all active:scale-95 ${reserveButtonSpace ? 'top-[50px] right-3' : 'top-3 right-3'}`}
        >
          {t("home.record_now")}
        </Link>
      </Card>
    )
  }

  const iconColor = alert.isUrgent ? 'text-red-500' : alert.progressPercent > 80 ? 'text-orange-400' : 'text-blue-400'
  const barColor = alert.isUrgent ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : alert.progressPercent > 80 ? 'bg-orange-400' : 'bg-blue-400'

  return (
    <Card className={`border-none bg-white dark:bg-card ${alert.isDisabled ? "opacity-50" : ""} ${className}`}>
      <CardContent className="p-3.5 flex items-start gap-3">
        <div className={`p-2.5 rounded-2xl shrink-0 ${alert.isUrgent ? 'bg-red-50 dark:bg-red-950/40' : 'bg-slate-50 dark:bg-surface-2'} ${iconColor}`}>
          <alert.icon size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-bold text-slate-500 dark:text-muted-foreground truncate ${reserveButtonSpace ? 'pr-16' : ''}`}>{alert.carName}</p>
          <div className="mt-0.5 leading-tight text-slate-800 dark:text-foreground">
            <p className="text-[11px] font-bold">{t(`subcategories.${alert.maintName}`)}{alert.isDisabled ? ` (${t("mypage.maint_disabled_desc")})` : (alert.isOver ? t("home.alert_overdue") : t("home.alert_remaining"))}</p>
            <p className="text-lg font-bold flex items-baseline">
              {alert.value.toLocaleString()}<span className="text-[11px] ml-0.5">{t(pluralKey(`common.${alert.unit}_unit`, alert.value))}</span>
              {alert.isOver && <TrendingUp size={16} className={`ml-1 shrink-0 self-center ${iconColor}`} aria-hidden="true" />}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-muted-foreground font-medium">
              <CalendarDays size={10} /> {t(pluralKey("home.months_since_last", alert.monthsPassed), { months: alert.monthsPassed })}
            </div>
            <div className="w-[80%] bg-slate-100 dark:bg-surface-3 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
                style={{ width: `${alert.progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
