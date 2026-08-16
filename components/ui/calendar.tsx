"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { useTranslation, formatYearMonthLocale } from "@/lib/i18n"
import { getMonthMatrix, getWeekdayLabels, isSameDay, isToday } from "@/lib/date/calendar"

interface CalendarProps {
  month: Date
  onMonthChange: (date: Date) => void
  selected: Date | null
  onSelect: (date: Date) => void
  onOpenWheel: () => void
  minDate?: Date
  maxDate?: Date
}

function Calendar({ month, onMonthChange, selected, onSelect, onOpenWheel, minDate, maxDate }: CalendarProps) {
  const { locale, t } = useTranslation()
  const weeks = React.useMemo(() => getMonthMatrix(month.getFullYear(), month.getMonth()), [month])
  const weekdayLabels = React.useMemo(() => getWeekdayLabels(locale), [locale])

  return (
    <div data-slot="calendar">
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          aria-label={t("common.previous")}
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={onOpenWheel}
          className="text-sm font-semibold text-slate-800 dark:text-foreground hover:opacity-70 transition-opacity"
        >
          {formatYearMonthLocale(month.getFullYear(), month.getMonth() + 1, locale)}
        </button>
        <button
          type="button"
          aria-label={t("common.next")}
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-x-1" role="row">
        {weekdayLabels.map((label, i) => (
          <div
            key={i}
            role="columnheader"
            className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div role="grid">
        {weeks.map((week, wi) => (
          <div key={wi} role="row" className="grid grid-cols-7 gap-x-1 gap-y-1">
            {week.map((cell, di) => {
              const disabled = (minDate && cell.date < minDate) || (maxDate && cell.date > maxDate)
              const isSelected = selected ? isSameDay(cell.date, selected) : false
              const today = isToday(cell.date)
              return (
                <button
                  key={di}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  disabled={disabled}
                  onClick={() => onSelect(cell.date)}
                  className={cn(
                    "mx-auto flex size-9 items-center justify-center rounded-md text-sm tabular-nums transition-colors text-foreground hover:bg-accent hover:text-accent-foreground",
                    cell.outside && "text-muted-foreground/50",
                    today && !isSelected && "ring-1 ring-ring",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    disabled && "opacity-40 pointer-events-none"
                  )}
                >
                  {cell.date.getDate()}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export { Calendar }
