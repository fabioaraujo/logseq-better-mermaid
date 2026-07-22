import { fileNameFromSource } from './html'

function saveBlob(blob: Blob, fileName: string) {
  // Blob URLs are scoped to the plugin iframe's opaque file origin. Create
  // the final blob in Logseq's host window so a host-owned download link can
  // actually open it.
  const hostWindow = parent as unknown as typeof globalThis
  const hostBlob = new hostWindow.Blob([blob], { type: blob.type })
  const url = hostWindow.URL.createObjectURL(hostBlob)
  const anchor = parent.document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  parent.document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => hostWindow.URL.revokeObjectURL(url), 1_000)
}

export function normalizeSvg(svg: string): string {
  const parser = new DOMParser()
  const document = parser.parseFromString(svg, 'image/svg+xml')
  const root = document.documentElement

  if (root.nodeName.toLowerCase() === 'parsererror') {
    throw new Error('Mermaid 生成了无效的 SVG。')
  }

  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  root.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  return new XMLSerializer().serializeToString(root)
}

export function exportSvg(svg: string, source: string) {
  const normalized = normalizeSvg(svg)
  saveBlob(
    new Blob([normalized], { type: 'image/svg+xml;charset=utf-8' }),
    fileNameFromSource(source, 'svg'),
  )
}

function parseSvgSize(svgElement: SVGSVGElement) {
  const viewBox = svgElement.viewBox.baseVal
  const width =
    viewBox?.width || Number.parseFloat(svgElement.getAttribute('width') ?? '') || 800
  const height =
    viewBox?.height || Number.parseFloat(svgElement.getAttribute('height') ?? '') || 600

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('无法确定图表尺寸。')
  }
  return { width, height }
}

export async function exportPng(svg: string, source: string, scale: number) {
  const normalized = normalizeSvg(svg)
  const parsed = new DOMParser().parseFromString(normalized, 'image/svg+xml')
  const svgElement = parsed.documentElement as unknown as SVGSVGElement
  const { width, height } = parseSvgSize(svgElement)
  const safeScale = Math.min(6, Math.max(1, scale))
  const maxPixels = 32_000_000
  const requestedPixels = width * height * safeScale * safeScale
  const memoryScale =
    requestedPixels > maxPixels
      ? Math.sqrt(maxPixels / (width * height))
      : safeScale

  const image = new Image()
  image.decoding = 'async'
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalized)}`
  await image.decode()

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * memoryScale)
  canvas.height = Math.ceil(height * memoryScale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前环境无法创建 PNG 画布。')

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('PNG 编码失败。'))),
      'image/png',
    )
  })
  saveBlob(pngBlob, fileNameFromSource(source, 'png'))
}
