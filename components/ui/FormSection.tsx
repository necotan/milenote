import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// カードを入れ子にせず、見出しと上側の区切り線でグループを分ける
function FormSection({
  icon: Icon,
  title,
  divided = false,
  className,
  children,
}: {
  icon?: LucideIcon
  title?: ReactNode
  // true のとき上側に区切り線を引き、直前のグループと分ける
  // "mobile" は2カラムの右列用で、縦積みになるスマホ表示のときだけ区切る
  divided?: boolean | "mobile"
  className?: string
  children: ReactNode
}) {
  return (
    <section
      data-slot="form-section"
      className={cn(
        "space-y-4",
        divided && "border-t border-slate-200 dark:border-border pt-6",
        divided === "mobile" && "mt-6 sm:mt-0 sm:border-t-0 sm:pt-0",
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2">
          {Icon && <Icon size={15} className="text-slate-500 dark:text-muted-foreground" />}
          <h3 className="text-sm font-bold text-slate-600 dark:text-muted-foreground">{title}</h3>
        </div>
      )}
      {children}
    </section>
  )
}

export { FormSection }
