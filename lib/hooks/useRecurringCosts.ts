import useSWR from "swr"
import { getSupabaseBrowserClient } from "@/utils/supabase"
import { fetchAllRows } from "@/lib/fetchAllRows"
import type { RecurringCost } from "@/lib/types"

/** car側のstatus絞り込みはuseCarsの結果と突き合わせて呼び出し側で行う */
export function useRecurringCosts(userId: string | null | undefined) {
  const { data, isLoading, error, mutate } = useSWR(
    userId ? ["recurring_costs", userId] : null,
    async ([, uid]: [string, string]) => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await fetchAllRows(() =>
        supabase.from("recurring_costs").select("*").eq("user_id", uid).order("created_at").order("id")
      )
      if (error) throw error
      return (data ?? []) as RecurringCost[]
    }
  )

  return { recurringCosts: data ?? [], isLoading, error, mutate }
}
