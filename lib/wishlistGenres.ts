// wishlists.genre の識別子スラッグ定義

export type WishlistGenreSlug =
  | "wheels"
  | "exhaust_intake"
  | "aero_exterior"
  | "suspension"
  | "interior"
  | "other"

export const WISHLIST_GENRES: WishlistGenreSlug[] = [
  "wheels", "exhaust_intake", "aero_exterior", "suspension", "interior", "other"
]

// 旧日本語識別子からスラッグの互換マップ
export const LEGACY_JP_TO_SLUG: Record<string, WishlistGenreSlug> = {
  "ホイール": "wheels",
  "マフラー・吸排気": "exhaust_intake",
  "エアロ・外装": "aero_exterior",
  "足回り・車高調": "suspension",
  "インテリア・内装": "interior",
  "その他": "other",
}

const ALL_SLUGS: ReadonlySet<string> = new Set(Object.values(LEGACY_JP_TO_SLUG))

export function toWishlistGenreSlug(value: string): string
export function toWishlistGenreSlug(value: string | null | undefined): string | null | undefined
export function toWishlistGenreSlug(value: string | null | undefined): string | null | undefined {
  if (!value) return value
  if (ALL_SLUGS.has(value)) return value
  return LEGACY_JP_TO_SLUG[value] ?? value
}
