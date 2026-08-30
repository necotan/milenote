"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { CalendarDays } from "lucide-react"

import { cn } from "@/lib/utils"
import { useTranslation, formatDateLocale } from "@/lib/i18n"
import { parseISODate, toISODate, getDefaultWheelYearRange } from "@/lib/date/calendar"
import { Calendar } from "@/components/ui/calendar"
import { YearMonthWheel } from "@/components/ui/YearMonthWheel"

type DatePickerVariant = "input" | "inline"

interface DatePickerProps {
  value: string | null
  onChange: (value: string) => void
  variant?: DatePickerVariant
  placeholder?: string
  formatLabel?: (iso: string) => string
  disabled?: boolean
  className?: string
  id?: string
  "aria-label"?: string
  minYear?: number
  maxYear?: number
}

function DatePicker({
  value,
  onChange,
  variant = "input",
  placeholder,
  formatLabel,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
  minYear,
  maxYear,
}: DatePickerProps) {
  const { locale, t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<"days" | "wheel">("days")
  const selectedDate = React.useMemo(() => parseISODate(value), [value])
  const [displayMonth, setDisplayMonth] = React.useState<Date>(() => selectedDate ?? new Date())
  const openValueRef = React.useRef(value)

  const defaultRange = getDefaultWheelYearRange()
  const wheelMinYear = minYear ?? defaultRange.minYear
  const wheelMaxYear = maxYear ?? defaultRange.maxYear

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setMode("days")
      setDisplayMonth(selectedDate ?? new Date())
      openValueRef.current = value
    }
  }

  const handleSelectDay = (date: Date) => {
    onChange(toISODate(date))
  }

  const handleToday = () => {
    onChange(toISODate(new Date()))
    setOpen(false)
  }

  const handleReset = () => {
    onChange(openValueRef.current ?? "")
    setOpen(false)
  }

  const label = value
    ? formatLabel
      ? formatLabel(value)
      : formatDateLocale(value, locale)
    : (placeholder ?? t("common.please_select"))

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        {variant === "input" ? (
          <button
            type="button"
            id={id}
            aria-label={ariaLabel}
            disabled={disabled}
            data-slot="date-picker-trigger"
            className={cn(
              "flex h-9 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
              className
            )}
          >
            <span className={cn(!value && "text-muted-foreground")}>{label}</span>
            <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ) : (
          <button
            type="button"
            id={id}
            aria-label={ariaLabel}
            disabled={disabled}
            data-slot="date-picker-trigger"
            className="transition-opacity hover:opacity-70 active:opacity-50 disabled:pointer-events-none disabled:opacity-50"
          >
            <span className={cn(className, !value && "text-muted-foreground")}>{label}</span>
          </button>
        )}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="date-picker-content"
          sideOffset={4}
          align={variant === "input" ? "center" : "end"}
          collisionPadding={24}
          className="z-50 w-[320px] rounded-lg border border-input bg-popover p-3 text-popover-foreground shadow-lg dark:bg-surface-2 data-open:animate-in data-open:fade-in-0 data-open:ease-out data-open:duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:ease-in data-closed:duration-100"
        >
          {mode === "days" ? (
            <>
              <Calendar
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                selected={selectedDate}
                onSelect={handleSelectDay}
                onOpenWheel={() => setMode("wheel")}
              />
              <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                <button
                  type="button"
                  onClick={handleToday}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("common.today")}
                </button>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("common.reset")}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <YearMonthWheel
              year={displayMonth.getFullYear()}
              month={displayMonth.getMonth()}
              minYear={wheelMinYear}
              maxYear={wheelMaxYear}
              onConfirm={(year, month) => {
                setDisplayMonth(new Date(year, month, 1))
                setMode("days")
              }}
              onReset={() => setMode("days")}
            />
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export { DatePicker }
