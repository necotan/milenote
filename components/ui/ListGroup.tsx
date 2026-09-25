import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

// 行ごとに枠線を付けず、行間のヘアラインだけでまとまりを表す
function ListGroup({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div data-slot="list-group" className={cn("divide-y divide-slate-200 dark:divide-border", className)}>
      {children}
    </div>
  )
}

// タイトル、補足、スイッチを横に並べた設定行
function SwitchRow({
  id,
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  className,
}: {
  id?: string
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <div data-slot="switch-row" className={cn("flex items-center justify-between gap-3 py-3", className)}>
      <label htmlFor={id} className={cn("min-w-0 flex items-start gap-2.5", id && "cursor-pointer")}>
        {Icon && <Icon size={18} className="shrink-0 mt-0.5 text-slate-500 dark:text-muted-foreground" />}
        <span className="min-w-0 space-y-0.5">
          <span className="block text-sm font-bold text-slate-700 dark:text-foreground">{title}</span>
          {description && (
            <span className="block text-xs text-slate-500 dark:text-muted-foreground">{description}</span>
          )}
        </span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="shrink-0" />
    </div>
  )
}

export { ListGroup, SwitchRow }
