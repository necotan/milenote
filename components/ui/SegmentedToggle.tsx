"use client"

import { useLayoutEffect, useRef } from "react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SegmentedToggleOption<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
}

export function SegmentedToggle<T extends string>({
  value, options, onChange, className,
}: {
  value: T
  options: SegmentedToggleOption<T>[]
  onChange: (value: T) => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const indicatorRef = useRef<HTMLSpanElement>(null)
  // 値が変わったときだけスライドさせ、初回配置や再計測は瞬時移動にする
  const prevValueRef = useRef<T | null>(null)

  // アクティブなボタンを実測してインジケータ位置を合わせる
  useLayoutEffect(() => {
    const activeButton = buttonRefs.current[value]
    const indicator = indicatorRef.current
    if (!activeButton || !indicator) return
    const shouldAnimate = prevValueRef.current !== null && prevValueRef.current !== value
    prevValueRef.current = value
    // 初回や再計測ではトランジションを一時的に無効化して瞬間配置する
    if (!shouldAnimate) indicator.style.transition = "none"
    indicator.style.left = `${activeButton.offsetLeft}px`
    indicator.style.width = `${activeButton.offsetWidth}px`
    indicator.style.opacity = "1"
    if (!shouldAnimate) {
      // 強制リフローしてからクラス由来のトランジションを復帰させる
      void indicator.offsetWidth
      indicator.style.transition = ""
    }
  }, [value, options])

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex items-center rounded-full bg-slate-100 dark:bg-muted p-[3px]", className)}
    >
      <span
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute top-[3px] bottom-[3px] rounded-full border border-slate-300 dark:border-surface-border bg-white dark:bg-surface-3 opacity-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      />
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => { buttonRefs.current[option.value] = el }}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            title={option.label}
            className={cn(
              "relative z-10 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              active ? "text-slate-800 dark:text-foreground" : "text-slate-500 hover:text-slate-700 dark:text-muted-foreground dark:hover:text-foreground"
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
