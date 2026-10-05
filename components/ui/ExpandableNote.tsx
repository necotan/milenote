"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

// Tailwind がクラスを検出できるように、行数ごとのクラス名は完全な文字列で列挙する
const LINE_CLAMP_CLASS = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
} as const

type NoteLines = keyof typeof LINE_CLAMP_CLASS

// 閉じているときの表示行数の既定値
const DEFAULT_NOTE_LINES: NoteLines = 1

const BOX_CLASS = "text-sm text-slate-600 dark:text-muted-foreground bg-slate-50 dark:bg-muted p-2 rounded-md whitespace-pre-wrap"

type ExpandableNoteProps = {
  note: string
  lines?: NoteLines
}

// 長いメモを指定行数で省略し、省略されているときだけタップで全文を開閉できるメモ表示
function ExpandableNote({ note, lines = DEFAULT_NOTE_LINES }: ExpandableNoteProps) {
  const [open, setOpen] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)

  // p と button の切り替えでテキスト要素が作り直されるため、truncated も依存に含めて監視し直す
  useEffect(() => {
    const el = textRef.current
    if (!el) return

    const measure = () => {
      // 開いている間は line-clamp が外れて判定できないため、省略状態を維持する
      if (open) return
      // line-clamp は折り返して縦方向に溢れるため、高さと幅の両方で判定する
      setTruncated(el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [note, lines, open, truncated])

  const clampClass = open ? undefined : LINE_CLAMP_CLASS[lines]

  if (!truncated) {
    return (
      <p className={BOX_CLASS}>
        <span ref={textRef} className={cn("block", clampClass)}>
          {note}
        </span>
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className={cn(
        BOX_CLASS,
        "flex w-full cursor-pointer items-start gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <span ref={textRef} className={cn("min-w-0 flex-1", clampClass)}>
        {note}
      </span>
      <ChevronDown
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0 text-slate-400 transition-transform dark:text-muted-foreground/70",
          open && "rotate-180"
        )}
      />
    </button>
  )
}

export { ExpandableNote }
