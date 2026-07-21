"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!loading) onOpenChange(next) }}>
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="mt-3 whitespace-pre-wrap">{message}</DialogDescription>
        <DialogFooter>
          <Button type="button" variant="outline" size="default" className="font-bold px-4" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="default"
            variant={destructive ? "destructive" : "default"}
            className={`font-bold px-4 ${destructive ? "bg-red-600 dark:bg-red-600 border border-red-700 text-white hover:bg-red-700 dark:hover:bg-red-700" : ""}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t("common.deleting") : (confirmLabel ?? t("common.delete_action"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
