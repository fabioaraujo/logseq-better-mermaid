export type ViewerController = {
  fit: () => void
  zoomBy: (factor: number) => void
  resizeHeight: (delta: number) => void
}

type ViewerState = {
  scale: number
  minScale: number
  x: number
  y: number
  viewportHeight: number
}

const controllers = new WeakMap<HTMLElement, ViewerController>()
const savedStates = new Map<string, ViewerState>()

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
  const viewKey = root.dataset.viewKey ?? root.id
  const state: ViewerState = savedStates.get(viewKey) ?? {
    scale: 1,
    minScale: 0.1,
    x: 0,
    y: 0,
    viewportHeight: 120,
  }
  let dragStart: { pointerX: number; pointerY: number; x: number; y: number } | null = null

  function render() {
    viewport.style.height = `${Math.ceil(state.viewportHeight)}px`
    canvas.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`
    if (scaleLabel) scaleLabel.textContent = `${Math.round(state.scale * 100)}%`
    savedStates.set(viewKey, { ...state })
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
    state.viewportHeight = viewportHeight
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

  function resizeHeight(delta: number) {
    const newHeight = Math.max(96, viewport.clientHeight + delta)
    viewport.style.height = `${newHeight}px`
    state.viewportHeight = newHeight
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
    resizeHeight(delta) {
      resizeHeight(delta)
    },
  }
  controllers.set(root, controller)

  viewport.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY)
    },
    { capture: true, passive: false },
  )
  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    dragStart = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: state.x,
      y: state.y,
    }
    viewport.classList.add('is-dragging')
    viewport.setPointerCapture(event.pointerId)
  }, { capture: true })
  viewport.addEventListener('pointermove', (event) => {
    if (!dragStart) return
    event.preventDefault()
    event.stopPropagation()
    state.x = dragStart.x + event.clientX - dragStart.pointerX
    state.y = dragStart.y + event.clientY - dragStart.pointerY
    render()
  }, { capture: true })
  const stopDragging = (event: PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    dragStart = null
    viewport.classList.remove('is-dragging')
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId)
    }
  }
  viewport.addEventListener('pointerup', stopDragging, { capture: true })
  viewport.addEventListener('pointercancel', stopDragging, { capture: true })
  viewport.addEventListener('dblclick', fit)

  root.addEventListener('click', (event) => {
    const button = event.target as HTMLElement
    const onClick = button.dataset['onClick']
    if (!onClick) return

    switch (onClick) {
      case 'resizeHeight':
        resizeHeight(20)
        break
    }
  })

  requestAnimationFrame(() => {
    if (savedStates.has(viewKey)) render()
    else fit()
  })
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
