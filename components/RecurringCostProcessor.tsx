"use client"

import { useEffect, useRef } from "react"
import { mutate as globalMutate } from "swr"
import { createClient } from "@/utils/supabase"
import { useTranslation } from "@/lib/i18n"
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

      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayStr = `${year}-${month}-${day}`

      // 支払日を過ぎた定期費用を取得
      const { data: costs, error } = await supabase
        .from("recurring_costs")
        .select("*, cars!inner(current_odo, status)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .in("cars.status", ["active", "archived"])
        .lte("next_billing_date", todayStr)

      if (error || !costs || costs.length === 0) return

      let processedCount = 0

      for (const cost of costs) {
        // 複数サイクル分の未処理があればループでまとめて追いつかせる（無限ループ防止に上限120回）

        let currentNextDate = new Date(cost.next_billing_date)
        let cyclesProcessed = 0

        while (currentNextDate <= today && cyclesProcessed < 120) {
          const currentNextDateStr = `${currentNextDate.getFullYear()}-${String(currentNextDate.getMonth() + 1).padStart(2, '0')}-${String(currentNextDate.getDate()).padStart(2, '0')}`
          
          const autoPrefix = t("records.auto_recorded")
          const finalMemo = `${autoPrefix}${cost.memo || ""}`

          const { error: insertError } = await supabase.from("records").insert({
            user_id: user.id,
            car_id: cost.car_id,
            category: cost.category,
            sub_category: cost.sub_category,
            amount: cost.amount,
            odo_at_record: cost.cars?.current_odo ?? 0,
            date: currentNextDateStr,
            memo: finalMemo,
          })

          if (insertError) break

          // 次回請求日を計算
          if (cost.frequency === "weekly") {
            currentNextDate.setDate(currentNextDate.getDate() + 7)
          } else if (cost.frequency === "monthly") {
            currentNextDate.setMonth(currentNextDate.getMonth() + 1)
          } else if (cost.frequency === "bimonthly") {
            currentNextDate.setMonth(currentNextDate.getMonth() + 2)
          } else if (cost.frequency === "quarterly") {
            currentNextDate.setMonth(currentNextDate.getMonth() + 3)
          } else if (cost.frequency === "semiannually") {
            currentNextDate.setMonth(currentNextDate.getMonth() + 6)
          } else if (cost.frequency === "yearly") {
            currentNextDate.setFullYear(currentNextDate.getFullYear() + 1)
          }
          
          cyclesProcessed++
          processedCount++
        }

        if (cyclesProcessed > 0) {
          const nextDateStr = `${currentNextDate.getFullYear()}-${String(currentNextDate.getMonth() + 1).padStart(2, '0')}-${String(currentNextDate.getDate()).padStart(2, '0')}`
          await supabase.from("recurring_costs")
            .update({ next_billing_date: nextDateStr })
            .eq("id", cost.id)
        }
      }

      if (processedCount > 0) {
        toast.success(t("records.auto_recorded_toast", { count: processedCount }))
        // 自動生成した記録・更新した次回請求日をキャッシュに反映する
        await globalMutate(["records", user.id])
        await globalMutate(["recurring_costs", user.id])
      }
    }

    processRecurringCosts()
  }, [supabase, t])

  return null
}
