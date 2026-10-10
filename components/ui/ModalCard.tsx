"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@/lib/i18n"
import { useDimmedPageBackground } from "@/lib/hooks/useDimmedPageBackground"

// オーバーレイの backdrop-brightness-40 と同じ値
const OVERLAY_BRIGHTNESS = 40

// 絞り込み・表示設定用のモーダル
// 外側のタップまたは保存ボタンで閉じる
function ModalCard({
  open,
  onClose,
  icon: Icon,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  icon?: LucideIcon
  title: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  useDimmedPageBackground(open, OVERLAY_BRIGHTNESS)

  if (!open) return null

  return (
    <div className="fixed inset-0 backdrop-brightness-40 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <Card className="border-none bg-white dark:bg-card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-slate-800 dark:text-foreground">
            {Icon && <Icon size={20} />}
            <h2 className="text-lg font-bold">{title}</h2>
          </div>

          {children}

          <div className="flex justify-center pt-6">
            <Button
              className="px-10 font-bold hover:bg-primary/90"
              onClick={onClose}
            >
              {t("common.save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export { ModalCard }
