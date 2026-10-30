"use client"

import { useLayoutEffect, useMemo, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CarFront, ChevronLeft, Gauge, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ListGroup } from "@/components/ui/ListGroup"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogActionButton } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { DatePicker } from "@/components/ui/date-picker"
import { NumberInput } from "@/components/ui/NumberInput"
import { IconButton } from "@/components/ui/IconButton"
import { useTranslation, formatDateLocale } from "@/lib/i18n"
import { usePageLoadingGate } from "@/lib/loadingGate"
import { useSupabaseUser } from "@/lib/hooks/useSupabaseUser"
import { useCars } from "@/lib/hooks/useCars"
import { useOdoLogs } from "@/lib/hooks/useOdoLogs"
import { useChipTapHandlers } from "@/lib/hooks/useChipTapHandlers"
import { updateOdoLog, deleteOdoLog, type OdoSaveResult } from "@/lib/carOdo"
import { scrollToPageTop } from "@/utils/pageScroll"
import type { OdoLog } from "@/lib/types"

function OdoHistoryPageInner() {
  const { t, locale } = useTranslation()
  const searchParams = useSearchParams()

  const { user, isLoading: userLoading } = useSupabaseUser()
  const userId = user?.id ?? null
  const { cars: allCars, isLoading: carsLoading, mutate: mutateCars } = useCars(userId)
  const { odoLogs, isLoading: odoLogsLoading, mutate: mutateOdoLogs } = useOdoLogs(userId)

  const loading = userLoading || (!!userId && (carsLoading || odoLogsLoading))
  usePageLoadingGate(!loading)

  // Next.js の遷移時のスクロールはページの要素を画面内に入れるだけで、ホームのスクロール位置が少し残ったまま表示されるため
  // リンク側で scroll={false} にして、描画前にページトップへ戻す
  useLayoutEffect(() => {
    scrollToPageTop()
  }, [])

  // 履歴の編集は推定や current_odo に影響するため、入力の対象と同じく使用中の車だけにする
  const cars = useMemo(() => allCars.filter(c => c.status === "active"), [allCars])

  const [selectedCarId, setSelectedCarId] = useState("")
  const queryCarId = searchParams.get("car")
  const carId = [selectedCarId, queryCarId].find(id => id && cars.some(c => c.id === id)) ?? cars[0]?.id ?? ""
  const car = cars.find(c => c.id === carId)

  const logsByYear = useMemo(() => {
    const sorted = odoLogs.filter(l => l.car_id === carId).sort((a, b) => b.date.localeCompare(a.date))
    const groups: { year: string; items: { log: OdoLog; diff: number | null }[] }[] = []
    sorted.forEach((log, i) => {
      const older = sorted[i + 1]
      const year = log.date.slice(0, 4)
      const item = { log, diff: older ? log.odo - older.odo : null }
      const last = groups[groups.length - 1]
      if (last && last.year === year) last.items.push(item)
      else groups.push({ year, items: [item] })
    })
    return groups
  }, [odoLogs, carId])

  const [editTarget, setEditTarget] = useState<OdoLog | null>(null)
  const [editDate, setEditDate] = useState("")
  const [editOdo, setEditOdo] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<OdoLog | null>(null)
  const [busy, setBusy] = useState(false)

  const chipTapHandlers = useChipTapHandlers()

  const showError = (result: Exclude<OdoSaveResult, { ok: true }>) => {
    if (result.reason === "duplicate_date") toast.error(t("odo_history.duplicate_date"))
    else if (result.reason === "failed") toast.error(t("common.error_occurred") + ": " + result.message)
  }

  const startEdit = (log: OdoLog) => {
    setEditTarget(log)
    setEditDate(log.date)
    setEditOdo(String(log.odo))
  }

  const handleSaveEdit = async () => {
    if (!editTarget || !car) return
    const odo = parseInt(editOdo)
    if (isNaN(odo) || odo < 0 || !editDate) {
      toast.error(t("home.update_odo_invalid"))
      return
    }
    setBusy(true)
    const result = await updateOdoLog(car, editTarget, { date: editDate, odo })
    if (result.ok) {
      await Promise.all([mutateCars(), mutateOdoLogs()])
      setEditTarget(null)
      toast.success(t("odo_history.updated"))
    } else {
      showError(result)
    }
    setBusy(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget || !car) return
    setBusy(true)
    const result = await deleteOdoLog(car, deleteTarget)
    if (result.ok) {
      await Promise.all([mutateCars(), mutateOdoLogs()])
      setDeleteTarget(null)
      toast.success(t("odo_history.deleted"))
    } else {
      showError(result)
    }
    setBusy(false)
  }

  const header = (
    <header className="pt-4 pb-2">
      <Link
        href="/"
        aria-label={t("home.back_to_home")}
        title={t("home.back_to_home")}
        className="relative size-10 flex items-center justify-center rounded-full after:absolute after:-inset-1.5 after:rounded-full after:content-[''] bg-white text-slate-600 hover:text-slate-800 dark:bg-card dark:text-muted-foreground dark:hover:text-foreground transition-all active:scale-90"
      >
        <ChevronLeft size={22} className="-translate-x-px" />
      </Link>
    </header>
  )

  if (loading) return (
    <main className="p-4 space-y-6 max-w-2xl">
      {header}
      {[...Array(2)].map((_, i) => (
        <div key={i}>
          <SkeletonText size="sm" className="w-12 px-1 mb-2" />
          <Card className="border-none bg-white dark:bg-card px-4 py-1">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <SkeletonText size="11px" className="w-24" />
                  <SkeletonText size="base" className="w-28" />
                </div>
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="size-8 rounded-full" />
              </div>
            ))}
          </Card>
        </div>
      ))}
    </main>
  )

  return (
    <main className="p-4 space-y-6 max-w-2xl">
      {header}

      {!car ? (
        <Card className="border-none bg-white dark:bg-card p-10 text-center">
          <CarFront className="mx-auto h-12 w-12 text-slate-200 dark:text-muted-foreground mb-3" />
          <p className="text-xs font-medium text-slate-500 dark:text-muted-foreground mb-4 tracking-tighter">{t("home.no_cars_registered")}</p>
          <Link href="/garage"><Button className="font-bold text-xs px-6">{t("home.register")}</Button></Link>
        </Card>
      ) : (
        <>
          {cars.length > 1 && (
            <div className="flex flex-wrap gap-2.5">
              {cars.map((c) => {
                const active = c.id === carId
                return (
                  <button
                    key={c.id}
                    type="button"
                    {...chipTapHandlers(() => setSelectedCarId(c.id))}
                    aria-pressed={active}
                    className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-colors touch-manipulation ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white text-slate-600 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
                    }`}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          )}

          {logsByYear.length === 0 ? (
            // 上のヘッダー(セーフエリア含む)と下部ナビの分を除いた高さの中で、上下中央に置く
            <div className="flex flex-col items-center justify-center text-center min-h-[calc(100svh-16rem)]">
              <Gauge className="mx-auto h-12 w-12 text-slate-300 dark:text-muted-foreground mb-3" />
              <p className="text-slate-600 dark:text-muted-foreground font-medium">{t("odo_history.empty")}</p>
            </div>
          ) : (
            logsByYear.map((group) => (
              <section key={group.year}>
                <p className="text-sm font-bold text-slate-500 dark:text-muted-foreground mb-2 px-1">{t("common.year_suffix", { year: group.year })}</p>
                <Card className="border-none bg-white dark:bg-card px-4 py-1">
                  <ListGroup>
                    {group.items.map(({ log, diff }) => (
                      <div key={log.id} className="py-3 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-slate-500 dark:text-muted-foreground">{formatDateLocale(log.date, locale)}</p>
                          <p className="text-base font-bold text-slate-800 dark:text-foreground tabular-nums">
                            {log.odo.toLocaleString()} <span className="text-[11px]">{t("common.km_unit")}</span>
                            {diff !== null && (
                              <span className="ml-2 text-[11px] font-medium text-slate-500 dark:text-muted-foreground">
                                {t("odo_history.diff_from_previous", { km: (diff > 0 ? "+" : "") + diff.toLocaleString() })}
                              </span>
                            )}
                          </p>
                        </div>
                        <IconButton aria-label={t("common.edit")} title={t("common.edit")} onClick={() => startEdit(log)}>
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton tone="destructive" aria-label={t("common.delete")} title={t("common.delete")} onClick={() => setDeleteTarget(log)}>
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    ))}
                  </ListGroup>
                </Card>
              </section>
            ))
          )}
        </>
      )}

      <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open && !busy) setEditTarget(null) }}>
        <DialogContent showCloseButton={false} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogTitle className="pr-0">{t("odo_history.edit_title")}</DialogTitle>
          <DialogDescription className="mt-2 text-xs text-slate-600 dark:text-muted-foreground leading-relaxed">{t("odo_history.edit_desc")}</DialogDescription>

          <div className="mt-4 space-y-2">
            <label className="block text-[11px] font-medium leading-none text-slate-600 dark:text-muted-foreground">{t("odo_history.date")}</label>
            <DatePicker value={editDate} onChange={setEditDate} disabled={busy} className="bg-white dark:bg-card border-slate-200 dark:border-border" />
          </div>

          <div className="mt-4 space-y-2">
            <label className="block text-[11px] font-medium leading-none text-slate-600 dark:text-muted-foreground">{t("common.odometer")}</label>
            <div className="relative max-w-40">
              <NumberInput
                value={editOdo}
                onValueChange={setEditOdo}
                disabled={busy}
                className="pr-10 bg-white dark:bg-card border-slate-200 dark:border-border"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-500 dark:text-muted-foreground pointer-events-none">{t("common.km_unit")}</span>
            </div>
          </div>

          <DialogFooter>
            <DialogActionButton variant="outline" disabled={busy} onClick={() => setEditTarget(null)}>
              {t("common.cancel")}
            </DialogActionButton>
            <DialogActionButton disabled={busy} onClick={handleSaveEdit}>
              {busy ? t("common.saving") : t("common.save")}
            </DialogActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={t("odo_history.delete_title")}
        message={deleteTarget ? t("odo_history.delete_message", { date: formatDateLocale(deleteTarget.date, locale), odo: deleteTarget.odo.toLocaleString() }) : ""}
        loading={busy}
        onConfirm={handleDelete}
      />
    </main>
  )
}

export default function OdoHistoryPage() {
  return (
    <Suspense>
      <OdoHistoryPageInner />
    </Suspense>
  )
}
