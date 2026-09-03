import useSWR from "swr"
import { getSupabaseBrowserClient } from "@/utils/supabase"
import type { CarRecord } from "@/lib/types"

// ユーザーの維持費記録を全件取得する（car側のstatus絞り込みはuseCarsの結果と突き合わせて呼び出し側で行う）
export function useRecords(userId: string | null | undefined) {
  const { data, isLoading, error, mutate } = useSWR(
    userId ? ["records", userId] : null,
    async ([, uid]: [string, string]) => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.from("records").select("*").eq("user_id", uid)
      if (error) throw error
      return (data ?? []) as CarRecord[]
    }
  )

  return { records: data ?? [], isLoading, error, mutate }
}
