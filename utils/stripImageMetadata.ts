// 画像のメタデータ（GPS位置情報や撮影日時を含む）を除去する
// canvas で描画し直して再エンコードすることで、ピクセル以外の情報をすべて落とす
// public な cars バケットに保存するため、アップロード前に必ず通して位置情報の漏えいを防ぐ

const OUTPUT_MIME = "image/jpeg"
const OUTPUT_EXT = "jpg"
const OUTPUT_QUALITY = 0.92

export type StrippedImage = {
  file: File
  ext: string
}

// 渡された画像ファイルからメタデータを除去した新しいファイルを返す
// 画像の向きは EXIF の情報を参照して自動的に補正される
export const stripImageMetadata = async (file: File): Promise<StrippedImage> => {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })

  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    throw new Error("canvas context unavailable")
  }

  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_MIME, OUTPUT_QUALITY)
  })
  if (!blob) throw new Error("image encode failed")

  const baseName = file.name.replace(/\.[^./\\]+$/, "")
  const cleaned = new File([blob], `${baseName}.${OUTPUT_EXT}`, { type: OUTPUT_MIME })
  return { file: cleaned, ext: OUTPUT_EXT }
}
