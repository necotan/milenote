import useSWR from "swr"
import { getSupabaseBrowserClient } from "@/utils/supabase"
import type { OdoLog } from "@/lib/types"

// car側のstatus絞り込みはuseCarsの結果と突き合わせて呼び出し側で行う
export function useOdoLogs(userId: string | null | undefined) {
  const { data, isLoading, error, mutate } = useSWR(
    userId ? ["odo_logs", userId] : null,
    async ([, uid]: [string, string]) => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.from("odo_logs").select("*").eq("user_id", uid)
      if (error) throw error
      return (data ?? []) as OdoLog[]
    }
  )

  return { odoLogs: data ?? [], isLoading, error, mutate }
}
