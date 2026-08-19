import * as React from "react"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"

function Input({ className, type, onInvalid, onChange, onBlur, "aria-invalid": ariaInvalid, ...props }: React.ComponentProps<"input">) {
  const { t } = useTranslation()
  const [validationMessage, setValidationMessage] = React.useState("")

  const handleInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
    e.preventDefault()
    // フォーム内で最初の不正なフィールドにのみツールチップを表示する
    const target = e.currentTarget
    const invalidEls = target.form?.querySelectorAll(":invalid")
    const isFirst = !invalidEls || invalidEls[0] === target
    if (isFirst) {
      setValidationMessage(target.validity.valueMissing ? t("common.validation_required") : t("common.validation_invalid"))
      target.focus()
    }
    onInvalid?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e)
    if (validationMessage && e.currentTarget.checkValidity()) {
      setValidationMessage("")
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setValidationMessage("")
    onBlur?.(e)
  }

  return (
    <div className="relative w-full">
      <input
        type={type}
        data-slot="input"
        aria-invalid={validationMessage ? true : ariaInvalid}
        onInvalid={handleInvalid}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
      {validationMessage && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 flex items-center gap-2 rounded-lg border border-input bg-popover dark:bg-surface-2 px-3 py-2 text-sm text-popover-foreground shadow-lg whitespace-nowrap animate-in fade-in-0 zoom-in-95">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-destructive text-[10px] font-bold leading-none text-white">
            !
          </span>
          {validationMessage}
        </div>
      )}
    </div>
  )
}

export { Input }
