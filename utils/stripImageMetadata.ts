// 画像のメタデータ（GPS位置情報や撮影日時を含む）を除去する
// canvas で描画し直して再エンコードすることで、ピクセル以外の情報をすべて落とす
// public な cars バケットに保存するため、アップロード前に必ず通して位置情報の漏えいを防ぐ
// maxBytes を指定すると、指定サイズに収まるまで品質・解像度の順で段階的に圧縮する

const OUTPUT_MIME = "image/jpeg"
const OUTPUT_EXT = "jpg"
const OUTPUT_QUALITY = 0.92
// 品質の下限
const MIN_QUALITY = 0.72
const QUALITY_STEP = 0.05
// 解像度縮小の再試行上限
const MAX_DOWNSCALE_ATTEMPTS = 3

export type StrippedImage = {
  file: File
  ext: string
}

export type StripImageOptions = {
  // 出力ファイルサイズの上限
  maxBytes?: number
}

// canvas を JPEG の Blob にエンコードする
const encodeCanvas = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("image encode failed"))),
      OUTPUT_MIME,
      quality,
    )
  })

// 渡された画像ファイルからメタデータを除去した新しいファイルを返す
// 画像の向きは EXIF の情報を参照して自動的に補正される
export const stripImageMetadata = async (file: File, options: StripImageOptions = {}): Promise<StrippedImage> => {
  const { maxBytes } = options
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })

  let canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    throw new Error("canvas context unavailable")
  }

  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  let quality = OUTPUT_QUALITY
  let blob = await encodeCanvas(canvas, quality)

  if (maxBytes !== undefined && blob.size > maxBytes) {
    // 画質劣化を最小にするため、解像度は維持したまま品質を段階的に下げて収まるか試行
    while (blob.size > maxBytes && quality - QUALITY_STEP >= MIN_QUALITY) {
      quality = Math.round((quality - QUALITY_STEP) * 100) / 100
      blob = await encodeCanvas(canvas, quality)
    }

    // 品質の下限まで下げても収まらない場合のみ解像度を縮小
    let attempts = 0
    while (blob.size > maxBytes && attempts < MAX_DOWNSCALE_ATTEMPTS) {
      // 収まる見込みのサイズ比から縮小率を見積もり、余裕を持たせる
      const scale = Math.sqrt(maxBytes / blob.size) * 0.95
      const next = document.createElement("canvas")
      next.width = Math.max(1, Math.round(canvas.width * scale))
      next.height = Math.max(1, Math.round(canvas.height * scale))

      const nextCtx = next.getContext("2d")
      if (!nextCtx) throw new Error("canvas context unavailable")

      nextCtx.imageSmoothingEnabled = true
      nextCtx.imageSmoothingQuality = "high"
      nextCtx.drawImage(canvas, 0, 0, next.width, next.height)

      canvas = next
      blob = await encodeCanvas(canvas, quality)
      attempts++
    }

    if (blob.size > maxBytes) throw new Error("image compression failed")
  }

  const baseName = file.name.replace(/\.[^./\\]+$/, "")
  const cleaned = new File([blob], `${baseName}.${OUTPUT_EXT}`, { type: OUTPUT_MIME })
  return { file: cleaned, ext: OUTPUT_EXT }
}
