import { resolveMermaidTheme } from './settings'
import type { PluginSettings, ThemeMode } from './types'

export type MermaidEngine = Pick<
  typeof import('mermaid').default,
  'initialize' | 'parse' | 'render'
>

let renderSequence = 0
let renderQueue = Promise.resolve()

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export async function validateSource(
  source: string,
  engine: MermaidEngine,
): Promise<void> {
  await engine.parse(source)
}

export function renderMermaid(
  source: string,
  settings: PluginSettings,
  themeMode: ThemeMode,
  engine: MermaidEngine,
): Promise<string> {
  const operation = renderQueue.then(async () => {
    engine.initialize({
      startOnLoad: false,
      securityLevel: settings.securityLevel,
      theme: resolveMermaidTheme(settings.theme, themeMode),
      suppressErrorRendering: true,
      htmlLabels: false,
      flowchart: { useMaxWidth: true },
    })

    await validateSource(source, engine)
    renderSequence += 1
    const { svg } = await engine.render(
      `better-mermaid-${renderSequence}`,
      source,
    )
    return svg
  })

  // A failed render must not poison subsequent queued renders.
  renderQueue = operation.then(
    () => undefined,
    () => undefined,
  )
  return operation.catch((error) => {
    throw new Error(errorMessage(error))
  })
}
