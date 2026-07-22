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
  '',
].join('\n')
await writeFile(journalPath, journalFixture)

const app = await electron.launch({
  executablePath: '/Applications/Logseq.app/Contents/MacOS/Logseq',
  args: [`--user-data-dir=${profile}`, '--disable-gpu'],
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
  if ((await window.getByText('Better Mermaid0.1.0', { exact: true }).count()) === 0) {
    await window.getByText('Load unpacked plugin', { exact: true }).click()
  }
  await window.getByText('Better Mermaid0.1.0', { exact: true }).waitFor()
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

  await writeFile(journalPath, journalFixture.replace('中文内容', '实时刷新'))
  await window.waitForFunction(
    () =>
      [...document.querySelectorAll('.better-mermaid img')].some((element) =>
        decodeURIComponent(element.getAttribute('src') ?? '').includes('实时刷新'),
      ),
    undefined,
    { timeout: 20_000 },
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

  const relevantFailures = failures.filter((failure) =>
    /better.?mermaid|mermaid/i.test(failure),
  )
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
          'file edits triggered an automatic re-render',
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
