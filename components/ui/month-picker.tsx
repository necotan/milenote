"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { CalendarDays } from "lucide-react"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"
import { getDefaultWheelYearRange } from "@/lib/date/calendar"
import { YearMonthWheel } from "@/components/ui/YearMonthWheel"

interface MonthPickerProps {
  value: string | null
  onChange: (value: string) => void
  clearable?: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  "aria-label"?: string
  minYear?: number
  maxYear?: number
}

function parseYearMonth(value: string | null | undefined): { year: number; month: number } | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) - 1 }
}

function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`
}

function MonthPicker({
  value,
  onChange,
  clearable = false,
  placeholder,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
  minYear,
  maxYear,
}: MonthPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const parsed = parseYearMonth(value)
  const now = new Date()
  const current = parsed ?? { year: now.getFullYear(), month: now.getMonth() }

  const defaultRange = getDefaultWheelYearRange()
  const wheelMinYear = minYear ?? defaultRange.minYear
  const wheelMaxYear = maxYear ?? defaultRange.maxYear

  const label = value
    ? t("common.year_month", { year: current.year, month: current.month + 1 })
    : (placeholder ?? t("common.please_select"))

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          disabled={disabled}
          data-slot="month-picker-trigger"
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
            className
          )}
        >
          <span className={cn(!value && "text-muted-foreground")}>{label}</span>
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="month-picker-content"
          sideOffset={4}
          align="start"
          className="z-50 w-[280px] rounded-lg border border-input bg-popover p-3 text-popover-foreground shadow-lg dark:bg-surface-2 data-open:animate-in data-open:fade-in-0 data-open:ease-out data-open:duration-200 data-closed:animate-out data-closed:fade-out-0 data-closed:ease-in data-closed:duration-150"
        >
          <YearMonthWheel
            year={current.year}
            month={current.month}
            minYear={wheelMinYear}
            maxYear={wheelMaxYear}
            onConfirm={(year, month) => {
              onChange(formatYearMonth(year, month))
              setOpen(false)
            }}
            onReset={() => {}}
            clearable={clearable}
            onClear={() => {
              onChange("")
              setOpen(false)
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export { MonthPicker }
