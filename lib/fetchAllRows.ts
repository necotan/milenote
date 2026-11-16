import type { PostgrestError } from "@supabase/supabase-js"

// Data API の Max rows（本番は1000）を超えた行はエラーなしで切り捨てられるため、range で分けて全件取る
// Max rows より大きくすると、1000行で切られたページを最終ページと誤判定して打ち切るので、Max rows 以下に保つ
const PAGE_SIZE = 1000

type RangeableQuery<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
}

// クエリビルダーは range などの呼び出しで自身を書き換えるため、使い回さずページごとに作り直す
// 並び順が無いとページ間で行が重複・欠落するので、呼び出し側で一意に決まる order を付けること
export async function fetchAllRows<T>(
  buildQuery: () => RangeableQuery<T>,
): Promise<{ data: T[]; error: null } | { data: null; error: PostgrestError }> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1)
    if (error) return { data: null, error }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null }
  }
}
