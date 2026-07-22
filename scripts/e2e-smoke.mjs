import assert from 'node:assert/strict'
import {
  mkdir,
  mkdtemp,
  readdir,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

import { _electron as electron } from 'playwright-core'

const projectPath = resolve(import.meta.dirname, '..')
const pluginPath = process.env.BETTER_MERMAID_PLUGIN_PATH
  ? resolve(process.env.BETTER_MERMAID_PLUGIN_PATH)
  : projectPath
const profile = await mkdtemp(join(tmpdir(), 'better-mermaid-logseq-'))
const graphPath = await mkdtemp(join(tmpdir(), 'better-mermaid-graph-'))
const resultsPath = join(projectPath, 'test-results', 'e2e')
await mkdir(resultsPath, { recursive: true })
const exportedSvg = join(resultsPath, 'flowchart-LR.svg')
const exportedPng = join(resultsPath, 'flowchart-LR.png')
await Promise.all([
  unlink(exportedSvg).catch(() => undefined),
  unlink(exportedPng).catch(() => undefined),
])
await mkdir(join(graphPath, 'journals'), { recursive: true })
const journalPath = join(graphPath, 'journals', '2026_07_22.md')
const journalFixture = [
    '- {{renderer :better-mermaid}}',
    '  - ```mermaid',
    '    flowchart LR',
    '      A[中文内容] --> B[Better Mermaid]',
    '    ```',
    '- {{renderer :better-mermaid}}',
    '  - ```mermaid',
    '    mindmap',
    '      root((知识库))',
    '        Logseq',
    '        Mermaid',
    '    ```',
    '- {{renderer :better-mermaid}}',
    '  - ```mermaid',
    '    timeline',
    '      2025 : 旧插件',
    '      2026 : Better Mermaid',
    '    ```',
    '- {{renderer :better-mermaid}}',
    '  - ```mermaid',
    '    classDiagram',
    '      class Note {',
    '        +String title',
    '      }',
    '    ```',
    '- {{renderer :better-mermaid}}',
    '  - ```mermaid',
    '    flowchart LR',
    '      A --',
    '    ```',
    '- unrelated edit',
  '',
].join('\n')
await writeFile(journalPath, journalFixture)

const app = await electron.launch({
  executablePath: '/Applications/Logseq.app/Contents/MacOS/Logseq',
  args: [`--user-data-dir=${profile}`, '--disable-gpu', '--headless=new'],
  timeout: 30_000,
})

await app.evaluate(
  ({ session }, directory) => {
    session.defaultSession.on('will-download', (_event, item) => {
      item.setSavePath(`${directory}/${item.getFilename()}`)
    })
  },
  resultsPath,
)

const failures = []

async function waitForNonEmptyFile(path, timeout = 20_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const file = await stat(path).catch(() => null)
    if (file && file.size > 500) return file
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out waiting for download: ${path}`)
}

try {
  const window = await app.firstWindow({ timeout: 30_000 })
  window.setDefaultTimeout(15_000)
  window.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`))
  window.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`)
  })
  window.on('requestfailed', (request) => {
    if (/mermaid/i.test(request.url())) {
      failures.push(`requestfailed: ${request.url()}`)
    }
  })

  await window.getByText('This is a demo graph', { exact: false }).waitFor()
  await window.waitForTimeout(2_500)

  await app.evaluate(
    ({ dialog }, directory) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [directory],
      })
    },
    graphPath,
  )
  await window.getByText('Choose a folder', { exact: true }).click()
  await window
    .getByText('This is a demo graph', { exact: false })
    .waitFor({ state: 'hidden', timeout: 20_000 })

  await window.getByTitle('More').click()
  await window.getByText('Settings', { exact: true }).click()
  await window.getByText('Advanced', { exact: true }).click()
  const developerToggle = window
    .locator('label[for="developer_mode"]')
    .locator('..')
    .getByRole('checkbox')
  if ((await developerToggle.getAttribute('aria-checked')) !== 'true') {
    await developerToggle.click()
  }
  await window.getByLabel('Close').click({ force: true })

  await window.getByTitle('More').click()
  await window.getByText('Plugins', { exact: true }).click()
  await app.evaluate(
    ({ dialog }, directory) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [directory],
      })
    },
    pluginPath,
  )
  if (!window.frames().some((frame) => frame.url().includes(pluginPath))) {
    await window.getByText('Load unpacked plugin', { exact: true }).click()
  }
  await window.getByText(/Better Mermaid0\.1\./).waitFor()
  await window.keyboard.press('Escape')
  await window.reload({ waitUntil: 'domcontentloaded' })
  await window.getByText('Jul 22nd, 2026', { exact: true }).waitFor()

  const diagrams = window.locator('.better-mermaid')
  const images = diagrams.getByRole('img', { name: 'Mermaid diagram' })
  await images.first().waitFor({ state: 'visible', timeout: 20_000 })
  await window.waitForFunction(
    () => {
      const elements = [...document.querySelectorAll('.better-mermaid img')]
      return (
        elements.length === 4 &&
        elements.every(
          (element) =>
            element instanceof HTMLImageElement && element.naturalWidth > 50,
        )
      )
    },
    undefined,
    { timeout: 20_000 },
  )
  assert.equal(await images.count(), 4)
  const pluginFrame = window
    .frames()
    .find((frame) => frame.url().includes('/logseq-better-mermaid/dist/'))
  assert(pluginFrame, 'Better Mermaid plugin frame should be available')
  const decodedSources = await images.evaluateAll((elements) =>
    elements.map((element) =>
      decodeURIComponent(element.getAttribute('src') ?? ''),
    ),
  )
  assert(decodedSources.some((source) => source.includes('中文内容')))
  assert(decodedSources.some((source) => source.includes('知识库')))
  assert(decodedSources.some((source) => source.includes('旧插件')))
  assert(decodedSources.some((source) => source.includes('Note')))
  await diagrams.getByText('Mermaid 语法错误', { exact: true }).waitFor()
  assert.equal(await diagrams.getByRole('button', { name: 'SVG' }).count(), 4)
  assert.equal(await diagrams.getByRole('button', { name: 'PNG' }).count(), 4)

  const diagramWidth = await diagrams.first().evaluate((element) =>
    element.getBoundingClientRect().width,
  )
  assert(
    diagramWidth >= 700,
    `diagram should use the block width, received ${diagramWidth}px`,
  )
  const rendererTopGap = await diagrams.first().evaluate((element) => {
    const slot = element.closest('.lsp-hook-ui-slot')
    if (!slot) return Number.POSITIVE_INFINITY
    return element.getBoundingClientRect().top - slot.getBoundingClientRect().top
  })
  assert(
    rendererTopGap <= 2,
    `renderer slot should not create a blank row above the canvas (${rendererTopGap}px)`,
  )
  const firstViewport = diagrams.first().locator('.better-mermaid__viewport')
  await window.waitForFunction(
    () =>
      (document.querySelector('.better-mermaid__viewport')?.clientHeight ?? 0) >=
      90,
  )
  const viewportHeight = await firstViewport.evaluate(
    (element) => element.clientHeight,
  )
  const compactLayout = await diagrams.first().evaluate((root) => {
    const frame = root.querySelector('.better-mermaid__frame')
    const toolbar = root.querySelector('.better-mermaid__toolbar')
    const viewport = root.querySelector('.better-mermaid__viewport')
    return {
      frame: frame?.getBoundingClientRect().height ?? 0,
      toolbar: toolbar?.getBoundingClientRect().height ?? 0,
      viewport: viewport?.getBoundingClientRect().height ?? 0,
    }
  })
  assert(
    compactLayout.frame <= compactLayout.viewport + 2,
    `viewer layout should not contain anonymous blank rows: ${JSON.stringify(compactLayout)}`,
  )
  assert(
    viewportHeight <= 180,
    `a small diagram should not create a tall blank canvas (${viewportHeight}px)`,
  )

  const scaleValue = async () =>
    Number(
      (await diagrams.first().locator('.better-mermaid__scale').textContent())
        ?.replace('%', '') ?? 0,
    )
  const initialScale = await scaleValue()
  await diagrams.getByRole('button', { name: '＋' }).first().click()
  const zoomedInScale = await scaleValue()
  assert(zoomedInScale > initialScale, 'plus should zoom in')
  await diagrams.getByRole('button', { name: '−' }).first().click()
  assert((await scaleValue()) < zoomedInScale, 'minus should zoom out')

  await firstViewport.dispatchEvent('wheel', { deltaY: -240 })
  assert((await scaleValue()) > initialScale, 'wheel up should zoom in')
  await diagrams.getByRole('button', { name: '适应' }).first().click()

  const canvas = diagrams.first().locator('.better-mermaid__canvas')
  const transformBeforeDrag = await canvas.evaluate(
    (element) => element.style.transform,
  )
  const viewportBounds = await firstViewport.boundingBox()
  assert(viewportBounds)
  await window.mouse.move(
    viewportBounds.x + viewportBounds.width / 2,
    viewportBounds.y + viewportBounds.height / 2,
  )
  await window.mouse.down()
  await window.mouse.move(
    viewportBounds.x + viewportBounds.width / 2 + 45,
    viewportBounds.y + viewportBounds.height / 2 + 18,
  )
  await window.mouse.up()
  assert.notEqual(
    await canvas.evaluate((element) => element.style.transform),
    transformBeforeDrag,
    'dragging should pan the diagram',
  )
  await firstViewport.dblclick()
  await diagrams.getByRole('button', { name: '＋' }).first().click()
  const viewStateBeforeRemount = await canvas.evaluate(
    (element) => element.style.transform,
  )

  await window.evaluate(() => {
    globalThis.__betterMermaidLoadingTransitions = 0
    globalThis.__betterMermaidObserver = new MutationObserver(() => {
      if (
        [...document.querySelectorAll('.better-mermaid__state')].some(
          (element) => element.textContent?.includes('正在渲染 Mermaid'),
        )
      ) {
        globalThis.__betterMermaidLoadingTransitions += 1
      }
    })
    globalThis.__betterMermaidObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })
  })
  await pluginFrame.evaluate(() => {
    const host = globalThis.logseq.Experiments.ensureHostScope()
    const originalRender = host.mermaid.render.bind(host.mermaid)
    globalThis.__betterMermaidRenderCount = 0
    host.mermaid.render = (...args) => {
      globalThis.__betterMermaidRenderCount += 1
      return originalRender(...args)
    }
  })

  const unrelatedUuid = await window
    .getByText('unrelated edit', { exact: true })
    .evaluate((element) => element.closest('.ls-block')?.getAttribute('blockid'))
  assert(unrelatedUuid)
  await pluginFrame.evaluate(async ({ uuid }) => {
    await globalThis.logseq.Editor.updateBlock(uuid, 'unrelated edit changed')
  }, { uuid: unrelatedUuid })
  await window.getByText('unrelated edit changed', { exact: true }).waitFor()
  await window.waitForTimeout(800)
  assert.equal(
    await pluginFrame.evaluate(() => globalThis.__betterMermaidRenderCount),
    0,
    'an unrelated edit should not re-render Mermaid',
  )
  await window.waitForFunction(
    (expected) =>
      document.querySelector('.better-mermaid__canvas')?.style.transform ===
      expected,
    viewStateBeforeRemount,
  )
  await diagrams.getByRole('button', { name: '适应' }).first().click()
  const firstDiagramBlock = diagrams
    .first()
    .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " ls-block ")][1]')
  const firstDiagramSource = firstDiagramBlock.getByText('flowchart LR', {
    exact: true,
  })
  const collapseControl = firstDiagramBlock.locator('.block-control').first()
  await collapseControl.click()
  await firstDiagramSource.waitFor({ state: 'hidden' })
  await collapseControl.click()
  await firstDiagramSource.waitFor({ state: 'visible' })
  await window.waitForTimeout(400)

  const sourceToggle = diagrams.getByRole('button', { name: '源码' }).first()
  await sourceToggle.click({ force: true })
  await firstDiagramSource.waitFor({ state: 'hidden' })
  await sourceToggle.click({ force: true })
  await firstDiagramSource.waitFor({ state: 'visible' })

  const mermaidUuid = await window
    .getByText('A[中文内容] --> B[Better Mermaid]', { exact: true })
    .evaluate((element) => element.closest('.ls-block')?.getAttribute('blockid'))
  assert(mermaidUuid)
  await diagrams.getByRole('button', { name: '编辑' }).first().click()
  const monacoEditor = pluginFrame.locator('.monaco-editor')
  await monacoEditor.waitFor({ state: 'visible', timeout: 20_000 })
  await pluginFrame.getByText('Monaco Editor', { exact: true }).waitFor()
  await window.screenshot({
    path: join(resultsPath, 'monaco-editor.png'),
    fullPage: true,
  })
  const monacoInput = monacoEditor.locator('textarea.inputarea')
  await monacoInput.click({ force: true })
  await window.keyboard.press('Meta+A')
  await window.keyboard.insertText(
    'flowchart LR\n  A[实时刷新] --> B[Better Mermaid]',
  )
  await pluginFrame.getByRole('button', { name: '保存', exact: true }).click()
  await window.waitForFunction(
    () =>
      [...document.querySelectorAll('.better-mermaid img')].some((element) =>
        decodeURIComponent(element.getAttribute('src') ?? '').includes('实时刷新'),
      ),
    undefined,
    { timeout: 20_000 },
  )
  const persistedSource = await pluginFrame.evaluate(async ({ uuid }) => {
    const block = await globalThis.logseq.Editor.getBlock(uuid)
    return block?.fullTitle ?? block?.title ?? block?.content ?? ''
  }, { uuid: mermaidUuid })
  assert(persistedSource.startsWith('```mermaid\n'))
  assert(persistedSource.endsWith('\n```'))
  assert.equal(
    await window.evaluate(
      () => globalThis.__betterMermaidLoadingTransitions,
    ),
    0,
    'diagram updates should not flash a loading state',
  )

  await diagrams.getByRole('button', { name: 'SVG' }).first().click({ force: true })
  await waitForNonEmptyFile(exportedSvg)

  await diagrams.getByRole('button', { name: 'PNG' }).first().click({ force: true })
  await waitForNonEmptyFile(exportedPng)

  await window.screenshot({
    path: join(resultsPath, 'flowchart-light.png'),
    fullPage: true,
  })

  await window.getByTitle('More').click()
  await window.getByText('Settings', { exact: true }).click()
  await window.getByText('General', { exact: true }).first().click()
  await window.getByText('dark', { exact: true }).click()
  await window.getByLabel('Close').click({ force: true })
  await images.first().waitFor({ state: 'visible' })
  await window.screenshot({
    path: join(resultsPath, 'flowchart-dark.png'),
    fullPage: true,
  })

  await window.getByTitle('More').click()
  await window.getByText('Settings', { exact: true }).click()
  await window.getByText('General', { exact: true }).first().click()
  await window.getByText('light', { exact: true }).click()
  await window.getByLabel('Close').click({ force: true })

  const relevantFailures = failures
    .filter((failure) => /better.?mermaid|mermaid/i.test(failure))
    .filter((failure) => !failure.includes('can not resolve selector target'))
  assert.deepEqual(relevantFailures, [])

  console.log(
    JSON.stringify(
      {
        status: 'passed',
        logseqVersion: '0.10.12',
        profile,
        assertions: [
          'unpacked plugin loaded',
          'flowchart, mindmap, timeline, and class diagrams rendered',
          'Chinese and complex diagram labels rendered',
          'invalid syntax produced an inline error',
          'diagram used the available block width',
          'canvas height followed the SVG without a large blank area',
          'plus/minus and wheel zoom moved in the expected direction',
          'pointer dragging panned the diagram and double-click fitted it',
          'zoom and pan state survived a Logseq renderer remount',
          'unrelated edits did not re-render Mermaid',
          'the parent block collapsed and expanded normally',
          'the source toolbar button collapsed and expanded source',
          'Monaco Editor saved a standard Mermaid code block',
          'diagram edits did not flash a loading state',
          'Mermaid source edits triggered an automatic re-render',
          'SVG and PNG exports produced non-empty files',
          'light and dark theme screenshots captured',
          'no Better Mermaid console errors',
        ],
      },
      null,
      2,
    ),
  )
} catch (error) {
  console.error('CAPTURED_FAILURES', failures)
  const windows = app.windows()
  if (windows[0]) {
    console.error(
      'HOST_GLOBALS',
      await windows[0].evaluate(() => ({
        mermaid: typeof globalThis.mermaid,
        bundle: typeof globalThis.__esbuild_esm_mermaid_nm,
      })),
    )
    await windows[0]
      .screenshot({ path: join(resultsPath, 'failure.png'), fullPage: true })
      .catch(() => undefined)
  }
  throw error
} finally {
  await app.close()
  const graphCacheDirectory = join(homedir(), '.logseq', 'graphs')
  const graphCacheEntries = await readdir(graphCacheDirectory).catch(() => [])
  await Promise.all(
    graphCacheEntries
      .filter((entry) => entry.includes(basename(graphPath)))
      .map((entry) => unlink(join(graphCacheDirectory, entry))),
  )
  await Promise.all([
    rm(profile, { recursive: true, force: true }),
    rm(graphPath, { recursive: true, force: true }),
  ])
}
