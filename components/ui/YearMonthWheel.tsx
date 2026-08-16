"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useTranslation, formatYearMonthLocale } from "@/lib/i18n"

const ROW_HEIGHT = 48
const CONTAINER_HEIGHT = 240
const PAD = (CONTAINER_HEIGHT - ROW_HEIGHT) / 2

interface YearMonthWheelProps {
  year: number
  /** 0始まり(JSのDate#getMonth()と同じ) */
  month: number
  minYear: number
  maxYear: number
  onConfirm: (year: number, month: number) => void
  onReset: () => void
  clearable?: boolean
  onClear?: () => void
}

function YearMonthWheel({ year, month, minYear, maxYear, onConfirm, onReset, clearable, onClear }: YearMonthWheelProps) {
  const { locale, t } = useTranslation()
  const rows = React.useMemo(() => {
    const list: { year: number; month: number }[] = []
    for (let y = minYear; y <= maxYear; y++) {
      for (let m = 0; m < 12; m++) list.push({ year: y, month: m })
    }
    return list
  }, [minYear, maxYear])

  const initialIndex = React.useMemo(
    () => Math.min(rows.length - 1, Math.max(0, (year - minYear) * 12 + month)),
    [rows.length, year, minYear, month]
  )
  const [pendingIndex, setPendingIndex] = React.useState(initialIndex)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const settleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = initialIndex * ROW_HEIGHT
    // 初回マウント時のみ中央寄せしたいため、依存配列は空
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [])

  const handleScroll = React.useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const index = Math.min(rows.length - 1, Math.max(0, Math.round(el.scrollTop / ROW_HEIGHT)))
    setPendingIndex(index)

    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const target = index * ROW_HEIGHT
      if (Math.abs(el.scrollTop - target) > 1) {
        el.scrollTo({ top: target, behavior: "smooth" })
      }
    }, 120)
  }, [rows.length])

  const handleReset = () => {
    const el = containerRef.current
    if (el) el.scrollTo({ top: initialIndex * ROW_HEIGHT, behavior: "smooth" })
    setPendingIndex(initialIndex)
    onReset()
  }

  const handleConfirm = () => {
    const row = rows[pendingIndex]
    onConfirm(row.year, row.month)
  }

  return (
    <div data-slot="year-month-wheel">
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-2 top-1/2 h-12 -translate-y-1/2 rounded-md bg-accent/40 z-0"
        />
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="relative z-10 overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          style={{ height: CONTAINER_HEIGHT }}
        >
          <div aria-hidden="true" style={{ height: PAD }} />
          {rows.map((row, i) => {
            const distance = Math.abs(i - pendingIndex)
            return (
              <div
                key={`${row.year}-${row.month}`}
                className={cn(
                  "flex items-center justify-center snap-center text-base tabular-nums transition-colors",
                  distance === 0 && "text-foreground font-semibold",
                  distance === 1 && "text-muted-foreground",
                  distance >= 2 && "text-muted-foreground/50"
                )}
                style={{ height: ROW_HEIGHT }}
              >
                {formatYearMonthLocale(row.year, row.month + 1, locale)}
              </div>
            )
          })}
          <div aria-hidden="true" style={{ height: PAD }} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 mt-1 border-t border-border">
        {clearable ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("common.clear")}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("common.reset")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  )
}

export { YearMonthWheel }
