export type ViewerController = {
  fit: () => void
  zoomBy: (factor: number) => void
}

type ViewerState = {
  scale: number
  minScale: number
  x: number
  y: number
}

const controllers = new WeakMap<HTMLElement, ViewerController>()

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function bindViewer(root: HTMLElement): ViewerController | null {
  const existing = controllers.get(root)
  if (existing) return existing

  const viewportCandidate = root.querySelector<HTMLElement>(
    '.better-mermaid__viewport',
  )
  const canvasCandidate = root.querySelector<HTMLElement>(
    '.better-mermaid__canvas',
  )
  const imageCandidate = root.querySelector<HTMLImageElement>(
    '.better-mermaid__image',
  )
  const scaleLabel = root.querySelector<HTMLElement>('.better-mermaid__scale')
  if (!viewportCandidate || !canvasCandidate || !imageCandidate) return null
  const viewport = viewportCandidate
  const canvas = canvasCandidate
  const image = imageCandidate

  const diagramWidth = Number(image.dataset.width) || 300
  const diagramHeight = Number(image.dataset.height) || 150
  const maxHeight = Number(viewport.dataset.maxHeight) || 720
  const state: ViewerState = { scale: 1, minScale: 0.1, x: 0, y: 0 }
  let dragStart: { pointerX: number; pointerY: number; x: number; y: number } | null = null

  function render() {
    canvas.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`
    if (scaleLabel) scaleLabel.textContent = `${Math.round(state.scale * 100)}%`
  }

  function fit() {
    const availableWidth = Math.max(120, viewport.clientWidth - 24)
    const availableHeight = Math.max(96, maxHeight - 24)
    const scale = Math.min(
      1,
      availableWidth / diagramWidth,
      availableHeight / diagramHeight,
    )
    state.scale = scale
    state.minScale = Math.max(0.05, scale * 0.35)
    const fittedWidth = diagramWidth * scale
    const fittedHeight = diagramHeight * scale
    const viewportHeight = clamp(fittedHeight + 24, 96, maxHeight)
    viewport.style.height = `${Math.ceil(viewportHeight)}px`
    state.x = Math.max(12, (viewport.clientWidth - fittedWidth) / 2)
    state.y = Math.max(12, (viewportHeight - fittedHeight) / 2)
    render()
  }

  function zoomAt(factor: number, clientX: number, clientY: number) {
    const bounds = viewport.getBoundingClientRect()
    const pointerX = clientX - bounds.left
    const pointerY = clientY - bounds.top
    const nextScale = clamp(state.scale * factor, state.minScale, 6)
    const ratio = nextScale / state.scale
    state.x = pointerX - (pointerX - state.x) * ratio
    state.y = pointerY - (pointerY - state.y) * ratio
    state.scale = nextScale
    render()
  }

  const controller: ViewerController = {
    fit,
    zoomBy(factor) {
      const bounds = viewport.getBoundingClientRect()
      zoomAt(
        factor,
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      )
    },
  }
  controllers.set(root, controller)

  viewport.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY)
    },
    { passive: false },
  )
  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    dragStart = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: state.x,
      y: state.y,
    }
    viewport.classList.add('is-dragging')
    viewport.setPointerCapture(event.pointerId)
  })
  viewport.addEventListener('pointermove', (event) => {
    if (!dragStart) return
    state.x = dragStart.x + event.clientX - dragStart.pointerX
    state.y = dragStart.y + event.clientY - dragStart.pointerY
    render()
  })
  const stopDragging = (event: PointerEvent) => {
    dragStart = null
    viewport.classList.remove('is-dragging')
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId)
    }
  }
  viewport.addEventListener('pointerup', stopDragging)
  viewport.addEventListener('pointercancel', stopDragging)
  viewport.addEventListener('dblclick', fit)

  requestAnimationFrame(fit)
  return controller
}

export function getSvgDimensions(svg: string): { width: number; height: number } {
  const viewBox = svg.match(
    /viewBox=["']\s*[-+\d.e]+[\s,]+[-+\d.e]+[\s,]+([-+\d.e]+)[\s,]+([-+\d.e]+)\s*["']/i,
  )
  const width = Number(viewBox?.[1])
  const height = Number(viewBox?.[2])
  if (width > 0 && height > 0) return { width, height }
  return { width: 300, height: 150 }
}
