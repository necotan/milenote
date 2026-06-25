// 外部リンク用URLのスキームを検証する
// http / https 以外（javascript: data: vbscript: 等）を弾き、href に直接埋め込んだときの自己XSS、スキームインジェクションを防ぐ
// 安全なら正規化したURL文字列を、危険または不正なら null を返す
export function getSafeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return null
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null
  }

  return parsed.href
}
