import '@logseq/libs'

import { exportPng, exportSvg } from './export'
import { stableId } from './html'
import { setLocale, t } from './i18n'
import { renderMermaid, type MermaidEngine } from './renderer'
import { readSettings, settingsSchema } from './settings'
import {
  findMermaidSource,
  getBlockText,
  isBetterMermaidMacro,
  replaceMermaidSource,
} from './source'
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
import { bindViewer } from './viewer'

const registrations = new Map<string, DiagramRegistration>()
const snapshots = new Map<string, DiagramSnapshot>()
const diagramCache = new Map<
  string,
  { renderKey: string; source: string; svg: string; maxHeight: number }
>()
const errorCache = new Map<string, { renderKey: string; message: string }>()
const generations = new Map<string, number>()
const renderKeys = new Map<string, string>()
const pendingRefreshes = new Set<string>()
let currentTheme: ThemeMode = 'light'
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let mermaidEngine: MermaidEngine

function forgetRegistration(id: string) {
  registrations.delete(id)
  snapshots.delete(id)
  generations.delete(id)
  renderKeys.delete(id)
  pendingRefreshes.delete(id)
}

function provide(registration: DiagramRegistration, template: string) {
  if (!parent.document.getElementById(registration.slot)) {
    forgetRegistration(registration.id)
    return false
  }
  logseq.provideUI({
    key: registration.key,
    slot: registration.slot,
    reset: true,
    template,
  })
  setTimeout(() => {
    const root = findDiagramElement(registration.id)
    if (root) bindViewer(root)
  }, 0)
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
  const sourceResult = await findMermaidSource(
    registration.blockUuid,
    (uuid, options) => logseq.Editor.getBlock(uuid, options),
  )
  if (!isCurrent(registration.id, generation)) return

  if (!sourceResult) {
    if (renderKeys.get(registration.id) === 'empty') return
    snapshots.delete(registration.id)
    renderKeys.set(registration.id, 'empty')
    provide(registration, emptyTemplate(registration.id))
    return
  }

  registration.sourceBlockUuid = sourceResult.blockUuid
  const settings = readSettings(logseq.settings ?? {})
  const renderKey = JSON.stringify({
    source: sourceResult.source,
    settings,
    theme: currentTheme,
  })
  if (renderKeys.get(registration.id) === renderKey) return

  const cached = diagramCache.get(registration.blockUuid)
  const cachedError = errorCache.get(registration.blockUuid)
  if (cachedError?.renderKey === renderKey) {
    snapshots.delete(registration.id)
    renderKeys.set(registration.id, renderKey)
    provide(
      registration,
      errorTemplate(registration.id, cachedError.message),
    )
    return
  }
  if (cached?.renderKey === renderKey) {
    const snapshot: DiagramSnapshot = {
      ...registration,
      renderKey,
      source: cached.source,
      svg: cached.svg,
      title: 'Mermaid diagram',
    }
    snapshots.set(registration.id, snapshot)
    renderKeys.set(registration.id, renderKey)
    provide(
      registration,
      diagramTemplate(
        registration.id,
        cached.svg,
        cached.maxHeight,
        registration.blockUuid,
      ),
    )
    return
  }

  // On the first render we give immediate feedback. During subsequent edits,
  // keep the old image in place and replace it only when the new SVG is ready.
  if (!renderKeys.has(registration.id)) {
    if (cached) {
      const snapshot: DiagramSnapshot = {
        ...registration,
        renderKey: cached.renderKey,
        source: cached.source,
        svg: cached.svg,
        title: 'Mermaid diagram',
      }
      snapshots.set(registration.id, snapshot)
      renderKeys.set(registration.id, cached.renderKey)
      if (
        !provide(
          registration,
          diagramTemplate(
            registration.id,
            cached.svg,
            cached.maxHeight,
            registration.blockUuid,
          ),
        )
      ) {
        return
      }
    } else if (cachedError) {
      renderKeys.set(registration.id, cachedError.renderKey)
      if (
        !provide(
          registration,
          errorTemplate(registration.id, cachedError.message),
        )
      ) {
        return
      }
    } else if (!provide(registration, loadingTemplate(registration.id))) {
      return
    }
  }

  try {
    const svg = await renderMermaid(
      sourceResult.source,
      settings,
      currentTheme,
      mermaidEngine,
    )
    if (!isCurrent(registration.id, generation)) return

    const snapshot: DiagramSnapshot = {
      ...registration,
      renderKey,
      source: sourceResult.source,
      svg,
      title: 'Mermaid diagram',
    }
    snapshots.set(registration.id, snapshot)
    diagramCache.set(registration.blockUuid, {
      renderKey,
      source: sourceResult.source,
      svg,
      maxHeight: settings.maxHeight,
    })
    errorCache.delete(registration.blockUuid)
    renderKeys.set(registration.id, renderKey)
    provide(
      registration,
      diagramTemplate(
        registration.id,
        svg,
        settings.maxHeight,
        registration.blockUuid,
      ),
    )
  } catch (error) {
    if (!isCurrent(registration.id, generation)) return
    const message = error instanceof Error ? error.message : String(error)
    snapshots.delete(registration.id)
    diagramCache.delete(registration.blockUuid)
    errorCache.set(registration.blockUuid, { renderKey, message })
    renderKeys.set(registration.id, renderKey)
    provide(registration, errorTemplate(registration.id, message))
  }
}

function refreshAll(delay = 120) {
  for (const id of registrations.keys()) pendingRefreshes.add(id)
  scheduleRefresh(delay)
}

function refreshChanged(changedBlockUuids: Set<string>, delay = 180) {
  for (const registration of registrations.values()) {
    if (
      changedBlockUuids.has(registration.blockUuid) ||
      (registration.sourceBlockUuid &&
        changedBlockUuids.has(registration.sourceBlockUuid))
    ) {
      pendingRefreshes.add(registration.id)
    }
  }
  if (pendingRefreshes.size > 0) scheduleRefresh(delay)
}

function scheduleRefresh(delay: number) {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined
    const ids = [...pendingRefreshes]
    pendingRefreshes.clear()
    for (const id of ids) {
      const registration = registrations.get(id)
      if (registration) void renderRegistration(registration)
    }
  }, delay)
}

function findDiagramElement(id: string): HTMLElement | null {
  return parent.document.getElementById(id)
}

function viewerFor(id: string) {
  const root = findDiagramElement(id)
  return root ? bindViewer(root) : null
}

async function openSourceEditor(id: string) {
  const registration = registrations.get(id)
  const snapshot = snapshots.get(id)
  if (!registration?.sourceBlockUuid || !snapshot) return

  const sourceBlockUuid = registration.sourceBlockUuid
  try {
    const { openMonacoEditor } = await import('./monaco')
    logseq.setMainUIInlineStyle({
      position: 'fixed',
      zIndex: 10000,
      inset: 0,
      width: '100vw',
      height: '100vh',
    })
    logseq.showMainUI({ autoFocus: true })
    openMonacoEditor({
      source: snapshot.source,
      dark: currentTheme === 'dark',
      async onSave(source) {
        const block = await logseq.Editor.getBlock(sourceBlockUuid)
        if (!block) throw new Error(t('sourceMissing'))
        await logseq.Editor.updateBlock(
          sourceBlockUuid,
          replaceMermaidSource(getBlockText(block), source),
        )
      },
      onClose() {
        logseq.hideMainUI({ restoreEditingCursor: false })
      },
    })
  } catch (error) {
    logseq.hideMainUI({ restoreEditingCursor: false })
    const message = error instanceof Error ? error.message : String(error)
    logseq.UI.showMsg(`${t('editorOpenFailed')}: ${message}`, 'error')
  }
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
  setLocale(userConfig.preferredLanguage)
  currentTheme = userConfig.preferredThemeMode === 'dark' ? 'dark' : 'light'

  logseq.provideModel({
    zoomIn(event: { dataset: DOMStringMap }) {
      viewerFor(event.dataset.diagramId ?? '')?.zoomBy(1.25)
    },
    zoomOut(event: { dataset: DOMStringMap }) {
      viewerFor(event.dataset.diagramId ?? '')?.zoomBy(0.8)
    },
    resetZoom(event: { dataset: DOMStringMap }) {
      viewerFor(event.dataset.diagramId ?? '')?.fit()
    },
    editSource(event: { dataset: DOMStringMap }) {
      void openSourceEditor(event.dataset.diagramId ?? '')
    },
    async toggleSource(event: { dataset: DOMStringMap }) {
      const registration = registrations.get(event.dataset.diagramId ?? '')
      if (!registration) return
      await logseq.Editor.setBlockCollapsed(registration.blockUuid, 'toggle')
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
        logseq.UI.showMsg(`${t('pngExportFailed')}: ${message}`, 'error')
      }
    },
  })

  logseq.Editor.registerSlashCommand(t('slashInsert'), async (event) => {
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

    for (const existing of registrations.values()) {
      if (
        existing.blockUuid === payload.uuid &&
        !parent.document.getElementById(existing.slot)
      ) {
        forgetRegistration(existing.id)
      }
    }

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

  logseq.DB.onChanged(({ blocks }) => {
    const changedBlockUuids = new Set(blocks.map((block) => String(block.uuid)))
    if (changedBlockUuids.size > 0) refreshChanged(changedBlockUuids)
  })
  logseq.App.onThemeModeChanged(({ mode }) => {
    currentTheme = mode
    refreshAll(0)
  })
  logseq.App.onCurrentGraphChanged(() => {
    registrations.clear()
    snapshots.clear()
    diagramCache.clear()
    errorCache.clear()
    generations.clear()
    renderKeys.clear()
    pendingRefreshes.clear()
  })
  logseq.onSettingsChanged(() => refreshAll(0))

  logseq.UI.showMsg(t('loaded'), 'success')
}

logseq.useSettingsSchema(settingsSchema)
logseq.ready(main).catch((error) => {
  console.error('[Better Mermaid] Failed to start', error)
})
