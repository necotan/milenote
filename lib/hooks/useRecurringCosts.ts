import useSWR from "swr"
import { getSupabaseBrowserClient } from "@/utils/supabase"
import type { RecurringCost } from "@/lib/types"

export function useRecurringCosts(userId: string | null | undefined) {
  const { data, isLoading, error, mutate } = useSWR(
    userId ? ["recurring_costs", userId] : null,
    async ([, uid]: [string, string]) => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.from("recurring_costs").select("*").eq("user_id", uid)
      if (error) throw error
      return (data ?? []) as RecurringCost[]
    }
  )

  return { recurringCosts: data ?? [], isLoading, error, mutate }
}
