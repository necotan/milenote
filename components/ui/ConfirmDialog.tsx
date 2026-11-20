"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogActionButton } from "@/components/ui/dialog"
import { useTranslation } from "@/lib/i18n"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  loading?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!loading) onOpenChange(next) }}>
      <DialogContent showCloseButton={false}>
        <DialogTitle className="pr-0">{title}</DialogTitle>
        <DialogDescription className="mt-2 whitespace-pre-wrap">{message}</DialogDescription>
        <DialogFooter>
          <DialogActionButton variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            {t("common.cancel")}
          </DialogActionButton>
          <DialogActionButton destructive onClick={onConfirm} disabled={loading}>
            {loading ? t("common.deleting") : t("common.delete_action")}
          </DialogActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
