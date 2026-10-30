import type { CSSProperties } from "react"

export type CarImageTransform = {
  image_position_x?: number | null
  image_position_y?: number | null
  image_scale?: number | null
}

export const DEFAULT_IMAGE_POSITION_X = 50
export const DEFAULT_IMAGE_POSITION_Y = 50
export const DEFAULT_IMAGE_SCALE = 1

export const MIN_IMAGE_SCALE = 1
export const MAX_IMAGE_SCALE = 3

export const clampImagePosition = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_IMAGE_POSITION_X
  return Math.round(Math.min(100, Math.max(0, value)))
}

export const clampImageScale = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_IMAGE_SCALE
  const clamped = Math.min(MAX_IMAGE_SCALE, Math.max(MIN_IMAGE_SCALE, value))
  return Math.round(clamped * 100) / 100
}

// 車両画像の表示スタイルを生成（プレビュー、ガレージ、ホームで共用し見え方を一致させる）
// NULL は ?? でデフォルトに（0 を誤変換しないよう || は使用しない）、transform-origin も位置に合わせズーム位置を安定させる
export const getCarImageStyle = (car: CarImageTransform): CSSProperties => {
  const x = car.image_position_x ?? DEFAULT_IMAGE_POSITION_X
  const y = car.image_position_y ?? DEFAULT_IMAGE_POSITION_Y
  const scale = car.image_scale ?? DEFAULT_IMAGE_SCALE
  return {
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${scale})`,
    transformOrigin: `${x}% ${y}%`,
  }
}