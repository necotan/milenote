import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

// 見た目は32pxのまま、押せる範囲は疑似要素で44px四方に広げる
// tone はホバー時の色で、destructive は削除、positive は再開などに使用する
function IconButton({
  tone = "default",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { tone?: "default" | "destructive" | "positive" }) {
  return (
    <button
      type={type}
      data-slot="icon-button"
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all after:absolute after:-inset-1.5 active:scale-90 dark:bg-surface-2 dark:text-muted-foreground",
        tone === "default" && "hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-surface-3 dark:hover:text-foreground",
        tone === "destructive" && "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400",
        tone === "positive" && "hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/40 dark:hover:text-green-400",
        className
      )}
      {...props}
    />
  )
}

export { IconButton }
