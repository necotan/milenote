import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// SWRのフェッチャーなど、レンダーをまたいで同一インスタンスを参照したい箇所向けのシングルトン
let browserClient: SupabaseClient | undefined

export const getSupabaseBrowserClient = () => {
  if (!browserClient) browserClient = createClient()
  return browserClient
}