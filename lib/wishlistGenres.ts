// wishlists.genre の識別子スラッグ定義

export type WishlistGenreSlug =
  | "wheels"
  | "exhaust_intake"
  | "aero_exterior"
  | "suspension"
  | "interior"
  | "other"

// DB の CHECK 制約（wishlists_genre_check）と一致させており、増やすときは migration も追加する
export const WISHLIST_GENRES: WishlistGenreSlug[] = [
  "wheels", "exhaust_intake", "aero_exterior", "suspension", "interior", "other"
]
