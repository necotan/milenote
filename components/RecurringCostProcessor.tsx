"use client"

import { useEffect, useRef } from "react"
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

      // Fetch due recurring costs
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
        // While multiple months might have passed, for simplicity, we process one cycle at a time.
        // If it's way overdue, it will process one record per page load, or we can use a loop.
        // Let's use a loop to catch up if multiple billing cycles have passed.
        
        let currentNextDate = new Date(cost.next_billing_date)
        let cyclesProcessed = 0

        while (currentNextDate <= today && cyclesProcessed < 120) { // max 120 cycles at once to prevent infinite loop
          const currentNextDateStr = `${currentNextDate.getFullYear()}-${String(currentNextDate.getMonth() + 1).padStart(2, '0')}-${String(currentNextDate.getDate()).padStart(2, '0')}`
          
          const autoPrefix = t("records.auto_recorded") || "【自動記録】"
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

          // Calculate next billing date
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
        // Notify user. (Use Japanese for now if translation isn't available)
        toast.success(`${processedCount}件の定期費用を自動記録しました`)
      }
    }

    processRecurringCosts()
  }, [supabase, t])

  return null
}
