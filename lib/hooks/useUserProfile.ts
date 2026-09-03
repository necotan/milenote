import useSWR from "swr"
import { getSupabaseBrowserClient } from "@/utils/supabase"
import type { UserProfile } from "@/lib/types"

export function useUserProfile(userId: string | null | undefined) {
  const { data, isLoading, error, mutate } = useSWR(
    userId ? ["user_profile", userId] : null,
    async ([, uid]: [string, string]) => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.from("users").select("*").eq("id", uid).single()
      if (error) throw error
      return data as UserProfile
    }
  )

  return { profile: data ?? null, isLoading, error, mutate }
}
