import { useRef } from "react"
import type { PointerEvent } from "react"

const IGNORE_CLICK_AFTER_TOUCH_MS = 700

// タッチ/ペンは pointerup（実際に触れた要素で発火する）で即時処理し、その直後に届くclickは無視する
export function useChipTapHandlers() {
  const lastChipTouchAt = useRef(0)
  return (toggle: () => void) => ({
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === "mouse") return
      lastChipTouchAt.current = Date.now()
      toggle()
    },
    onClick: () => {
      if (Date.now() - lastChipTouchAt.current < IGNORE_CLICK_AFTER_TOUCH_MS) return
      toggle()
    },
  })
}
