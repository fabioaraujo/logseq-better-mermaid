import '@logseq/libs'

import { exportPng, exportSvg } from './export'
import { stableId } from './html'
import { renderMermaid, type MermaidEngine } from './renderer'
import { readSettings, settingsSchema } from './settings'
import { findMermaidSource, isBetterMermaidMacro } from './source'
import { styles } from './styles'
import {
  diagramTemplate,
  emptyTemplate,
  errorTemplate,
  loadingTemplate,
} from './templates'
import type {
  DiagramRegistration,
  DiagramSnapshot,
  ThemeMode,
} from './types'

const registrations = new Map<string, DiagramRegistration>()
const snapshots = new Map<string, DiagramSnapshot>()
const generations = new Map<string, number>()
let currentTheme: ThemeMode = 'light'
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let mermaidEngine: MermaidEngine

function provide(registration: DiagramRegistration, template: string) {
  if (!parent.document.getElementById(registration.slot)) {
    registrations.delete(registration.id)
    snapshots.delete(registration.id)
    generations.delete(registration.id)
    return false
  }
  logseq.provideUI({
    key: registration.key,
    slot: registration.slot,
    reset: true,
    template,
  })
  return true
}

function nextGeneration(id: string) {
  const generation = (generations.get(id) ?? 0) + 1
  generations.set(id, generation)
  return generation
}

function isCurrent(id: string, generation: number) {
  return generations.get(id) === generation
}

async function renderRegistration(registration: DiagramRegistration) {
  const generation = nextGeneration(registration.id)
  if (!provide(registration, loadingTemplate(registration.id))) return

  const source = await findMermaidSource(
    registration.blockUuid,
    (uuid, options) => logseq.Editor.getBlock(uuid, options),
  )
  if (!isCurrent(registration.id, generation)) return

  if (!source) {
    snapshots.delete(registration.id)
    provide(registration, emptyTemplate(registration.id))
    return
  }

  try {
    const settings = readSettings(logseq.settings ?? {})
    const svg = await renderMermaid(
      source,
      settings,
      currentTheme,
      mermaidEngine,
    )
    if (!isCurrent(registration.id, generation)) return

    const snapshot: DiagramSnapshot = {
      ...registration,
      source,
      svg,
      title: 'Mermaid diagram',
    }
    snapshots.set(registration.id, snapshot)
    provide(
      registration,
      diagramTemplate(registration.id, svg, settings.maxHeight),
    )
  } catch (error) {
    if (!isCurrent(registration.id, generation)) return
    const message = error instanceof Error ? error.message : String(error)
    snapshots.delete(registration.id)
    provide(registration, errorTemplate(registration.id, message))
  }
}

function refreshAll(delay = 120) {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined
    for (const registration of registrations.values()) {
      void renderRegistration(registration)
    }
  }, delay)
}

function findDiagramElement(id: string): HTMLElement | null {
  return parent.document.getElementById(id)
}

function setZoom(id: string, nextZoom: number) {
  const root = findDiagramElement(id)
  const canvas = root?.querySelector<HTMLElement>('.better-mermaid__canvas')
  if (!root || !canvas) return

  const zoom = Math.min(4, Math.max(0.25, nextZoom))
  root.dataset.zoom = String(zoom)
  canvas.style.zoom = String(zoom)
}

function changeZoom(id: string, delta: number) {
  const root = findDiagramElement(id)
  const current = Number(root?.dataset.zoom ?? 1)
  setZoom(id, current + delta)
}

async function main() {
  const host = logseq.Experiments.ensureHostScope() as unknown as {
    mermaid?: MermaidEngine
  }
  await logseq.Experiments.loadScripts('vendor/mermaid.min.js')
  for (let attempt = 0; attempt < 100 && !host.mermaid; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  if (!host.mermaid) {
    throw new Error('Mermaid engine was not loaded into the Logseq host window.')
  }
  mermaidEngine = host.mermaid

  logseq.provideStyle(styles)

  const userConfig = await logseq.App.getUserConfigs()
  currentTheme = userConfig.preferredThemeMode === 'dark' ? 'dark' : 'light'

  logseq.provideModel({
    zoomIn(event: { dataset: DOMStringMap }) {
      changeZoom(event.dataset.diagramId ?? '', 0.25)
    },
    zoomOut(event: { dataset: DOMStringMap }) {
      changeZoom(event.dataset.diagramId ?? '', -0.25)
    },
    resetZoom(event: { dataset: DOMStringMap }) {
      setZoom(event.dataset.diagramId ?? '', 1)
    },
    exportSvg(event: { dataset: DOMStringMap }) {
      const snapshot = snapshots.get(event.dataset.diagramId ?? '')
      if (!snapshot) return
      exportSvg(snapshot.svg, snapshot.source)
    },
    async exportPng(event: { dataset: DOMStringMap }) {
      const snapshot = snapshots.get(event.dataset.diagramId ?? '')
      if (!snapshot) return
      try {
        const settings = readSettings(logseq.settings ?? {})
        await exportPng(snapshot.svg, snapshot.source, settings.pngScale)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logseq.UI.showMsg(`PNG 导出失败：${message}`, 'error')
      }
    },
  })

  logseq.Editor.registerSlashCommand('Better Mermaid: 插入图表', async (event) => {
    await logseq.Editor.insertAtEditingCursor('{{renderer :better-mermaid}}')
    await logseq.Editor.insertBlock(
      event.uuid,
      '```mermaid\nflowchart LR\n  A[想法] --> B[Better Mermaid]\n```',
      { sibling: false },
    )
  })

  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const [type] = payload.arguments
    if (!isBetterMermaidMacro(type)) return

    const id = `better-mermaid-${stableId(`${slot}:${payload.uuid}`)}`
    const registration: DiagramRegistration = {
      id,
      key: id,
      slot,
      blockUuid: payload.uuid,
    }
    registrations.set(id, registration)
    void renderRegistration(registration)
  })

  logseq.DB.onChanged(() => refreshAll())
  logseq.App.onThemeModeChanged(({ mode }) => {
    currentTheme = mode
    refreshAll(0)
  })
  logseq.App.onCurrentGraphChanged(() => {
    registrations.clear()
    snapshots.clear()
    generations.clear()
  })
  logseq.onSettingsChanged(() => refreshAll(0))

  logseq.UI.showMsg('Better Mermaid 已加载', 'success')
}

logseq.useSettingsSchema(settingsSchema)
logseq.ready(main).catch((error) => {
  console.error('[Better Mermaid] Failed to start', error)
})
