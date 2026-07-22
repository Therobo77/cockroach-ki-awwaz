const MAX_DIMENSION = 1280   // max width or height in pixels
const MAX_SIZE_KB   = 200    // target output size
const MIN_QUALITY   = 0.15   // don't go below this JPEG quality

/**
 * Compress an image File using the Canvas API.
 * Returns a JPEG data URL capped at ~MAX_SIZE_KB.
 */
export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { naturalWidth: w, naturalHeight: h } = img
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        const scale = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not available')); return }
      ctx.drawImage(img, 0, 0, w, h)

      // Reduce quality until under MAX_SIZE_KB
      let quality  = 0.85
      let dataUrl  = canvas.toDataURL('image/jpeg', quality)
      const maxLen = MAX_SIZE_KB * 1024 * 1.37  // base64 is ~37% larger

      while (dataUrl.length > maxLen && quality > MIN_QUALITY) {
        quality = Math.max(quality - 0.1, MIN_QUALITY)
        dataUrl = canvas.toDataURL('image/jpeg', quality)
      }

      resolve(dataUrl)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}

/** Human-readable byte size */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
