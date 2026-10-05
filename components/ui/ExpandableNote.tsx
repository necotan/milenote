"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
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
const EASE_APPLE = "cubic-bezier(0.32, 0.72, 0, 1)"
const TOGGLE_DURATION_MS = 380

type ExpandableNoteProps = {
  note: string
  lines?: NoteLines
}

// 長いメモを指定行数で省略し、省略されているときだけタップで全文を開閉できるメモ表示
function ExpandableNote({ note, lines = DEFAULT_NOTE_LINES }: ExpandableNoteProps) {
  const [open, setOpen] = useState(false)
  // 閉じるアニメーション中に line-clamp を掛けると2行目以降が先に消えるため、開閉状態とは別に持つ
  const [clamped, setClamped] = useState(true)
  const [truncated, setTruncated] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const collapsedHeightRef = useRef(0)
  const fromHeightRef = useRef<number | null>(null)

  // p と button の切り替えでテキスト要素が作り直されるため、truncated も依存に含めて監視し直す
  useEffect(() => {
    const el = textRef.current
    if (!el) return

    const measure = () => {
      // line-clamp が外れている間は判定できないため、省略状態を維持する
      if (!clamped) return
      // line-clamp は折り返して縦方向に溢れるため、高さと幅の両方で判定する
      setTruncated(el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [note, lines, clamped, truncated])

  // 閉じた状態でも1行目は見せるため、バナーの grid-template-rows 0fr/1fr ではなく実測した高さでアニメーションする
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    const from = fromHeightRef.current
    if (!wrapper || from === null) return
    fromHeightRef.current = null

    const to = open ? wrapper.getBoundingClientRect().height : collapsedHeightRef.current
    const animation = wrapper.animate(
      [{ height: `${from}px` }, { height: `${to}px` }],
      { duration: TOGGLE_DURATION_MS, easing: EASE_APPLE, fill: "forwards" }
    )
    animation.onfinish = () => {
      // fill を外す前に clamp を反映しないと、全文の高さに1フレーム戻ってちらつく
      if (!open) flushSync(() => setClamped(true))
      animation.cancel()
    }
    return () => animation.cancel()
  }, [open])

  const toggle = () => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    // 開閉の途中で再タップされても、今見えている高さから続けて動かす
    const current = wrapper.getBoundingClientRect().height
    if (clamped) collapsedHeightRef.current = current
    fromHeightRef.current = current
    if (!open) setClamped(false)
    setOpen((v) => !v)
  }

  const clampClass = clamped ? LINE_CLAMP_CLASS[lines] : undefined

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
      onClick={toggle}
      aria-expanded={open}
      className={cn(
        BOX_CLASS,
        "flex w-full cursor-pointer items-start gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <span ref={wrapperRef} className="block min-w-0 flex-1 overflow-hidden">
        <span ref={textRef} className={cn("block", clampClass)}>
          {note}
        </span>
      </span>
      <ChevronDown
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-slate-400 dark:text-muted-foreground/70"
        style={{
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: `transform ${TOGGLE_DURATION_MS}ms ${EASE_APPLE}`,
        }}
      />
    </button>
  )
}

export { ExpandableNote }
