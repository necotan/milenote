"use client"

import { useEffect, useRef } from "react"
import { mutate as globalMutate } from "swr"
import { createClient } from "@/utils/supabase"
import { useTranslation } from "@/lib/i18n"
import { toISODate } from "@/lib/date/calendar"
import { toast } from "sonner"

export default function RecurringCostProcessor() {
  const processed = useRef(false)
  const supabase = createClient()
  const { t } = useTranslation()

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const processRecurringCosts = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.rpc("process_due_recurring_costs", {
        p_today: toISODate(new Date()),
        p_memo_prefix: t("records.auto_recorded"),
      })
      const processedCount = typeof data === "number" ? data : 0

      if (error || processedCount === 0) return

      toast.success(t("records.auto_recorded_toast", { count: processedCount }))
      // rpc でサーバー側が追加・更新した行は SWR のキャッシュに入っていないため、再取得させる
      await globalMutate(["records", user.id])
      await globalMutate(["recurring_costs", user.id])
    }

    processRecurringCosts()
  }, [supabase, t])

  return null
}
