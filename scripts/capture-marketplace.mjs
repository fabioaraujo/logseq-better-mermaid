import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

import { _electron as electron } from 'playwright-core'

const projectPath = resolve(import.meta.dirname, '..')
const actualHome = homedir()
const isolatedHome = await mkdtemp(join(tmpdir(), 'better-mermaid-home-'))
const profile = await mkdtemp(join(tmpdir(), 'better-mermaid-profile-'))
const graphPath = await mkdtemp(join(tmpdir(), 'better-mermaid-showcase-'))
const recoveryPath = join(isolatedHome, 'global-config-recovery')
const pluginsRoot = join(actualHome, '.logseq', 'plugins')
const pluginRecoveryPath = await mkdtemp(
  join(actualHome, '.logseq', '.better-mermaid-capture-recovery-'),
)
const outputPath = join(
  projectPath,
  'test-results',
  'e2e',
  'marketplace-showcase.png',
)
const pluginsConfigPath = join(actualHome, '.logseq', 'config', 'plugins.edn')
const preferencesPath = join(actualHome, '.logseq', 'preferences.json')

const digest = (contents) =>
  createHash('sha256').update(contents).digest('hex')

const originalPluginsConfig = await readFile(pluginsConfigPath)
const originalPreferences = await readFile(preferencesPath)
const cleanPreferences = {
  ...JSON.parse(originalPreferences.toString('utf8')),
  theme: null,
  themes: { mode: 'light', light: null, dark: null },
  externals: [projectPath],
}

await mkdir(join(graphPath, 'journals'), { recursive: true })
await mkdir(join(projectPath, 'test-results', 'e2e'), { recursive: true })
await mkdir(recoveryPath, { recursive: true })
await Promise.all([
  writeFile(join(recoveryPath, 'plugins.edn'), originalPluginsConfig),
  writeFile(join(recoveryPath, 'preferences.json'), originalPreferences),
])
await writeFile(
  join(graphPath, 'journals', '2026_07_22.md'),
  [
    '- {{renderer :better-mermaid}}',
    '  - ```mermaid',
    '    flowchart LR',
    '      Capture["Capture ideas"] --> Shape{"Shape knowledge"}',
    '      Shape --> Link["Link notes"]',
    '      Shape --> Explore["Explore context"]',
    '      Link & Explore --> Connect["Connect the dots"]',
    '      Connect --> Publish["Publish clearly"]',
    '    ```',
    '',
  ].join('\n'),
)

let app
let configRestored = false
const movedPlugins = []

try {
  const pluginEntries = await readdir(pluginsRoot)
  for (const entry of pluginEntries) {
    if (entry === 'logseq-better-mermaid') continue
    await rename(join(pluginsRoot, entry), join(pluginRecoveryPath, entry))
    movedPlugins.push(entry)
  }

  await writeFile(pluginsConfigPath, '{}\n')
  await writeFile(
    preferencesPath,
    `${JSON.stringify(cleanPreferences, null, 2)}\n`,
  )

  app = await electron.launch({
    executablePath: '/Applications/Logseq.app/Contents/MacOS/Logseq',
    args: [`--user-data-dir=${profile}`, '--disable-gpu', '--headless=new'],
    env: { ...process.env, HOME: isolatedHome },
    timeout: 30_000,
  })

  const window = await app.firstWindow({ timeout: 30_000 })
  window.setDefaultTimeout(20_000)
  await window.setViewportSize({ width: 1600, height: 1000 })
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
    .waitFor({ state: 'hidden' })

  let loadedPluginFrame
  for (let attempt = 0; attempt < 100; attempt += 1) {
    loadedPluginFrame = window
      .frames()
      .find((frame) => frame.url().includes(projectPath))
    if (loadedPluginFrame) break
    await window.waitForTimeout(100)
  }
  assert(
    loadedPluginFrame,
    `plugin did not start: ${window.frames().map((frame) => frame.url())}`,
  )

  const diagram = window.locator('.better-mermaid').first()
  const image = diagram.getByRole('img', { name: 'Mermaid diagram' })
  await image.waitFor({ state: 'visible' })
  await window.waitForFunction(
    () => {
      const image = document.querySelector('.better-mermaid img')
      return image instanceof HTMLImageElement && image.naturalWidth > 100
    },
  )

  const pluginFrames = window
    .frames()
    .slice(1)
    .map((frame) => frame.url())
    .filter((url) => url !== 'about:blank')
  assert.equal(
    pluginFrames.length,
    1,
    `expected one plugin frame: ${pluginFrames}`,
  )
  assert(pluginFrames[0]?.includes(projectPath))

  await diagram.hover()
  await diagram.getByRole('button', { name: '−' }).click()
  const viewport = diagram.locator('.better-mermaid__viewport')
  const viewportBounds = await viewport.boundingBox()
  assert(viewportBounds)
  const dragX = viewportBounds.x + viewportBounds.width / 2
  const dragY = viewportBounds.y + viewportBounds.height / 2
  await window.mouse.move(dragX, dragY)
  await window.mouse.down()
  await window.mouse.move(dragX, dragY + 28, { steps: 5 })
  await window.mouse.up()
  await window.screenshot({
    path: outputPath,
    animations: 'disabled',
    clip: { x: 250, y: 60, width: 1100, height: 650 },
  })
  console.log(
    JSON.stringify({ status: 'passed', outputPath, pluginFrames }, null, 2),
  )
} finally {
  if (app) await app.close()

  for (const entry of movedPlugins.reverse()) {
    await rename(join(pluginRecoveryPath, entry), join(pluginsRoot, entry))
  }
  await Promise.all([
    writeFile(pluginsConfigPath, originalPluginsConfig),
    writeFile(preferencesPath, originalPreferences),
  ])
  const [restoredPluginsConfig, restoredPreferences] = await Promise.all([
    readFile(pluginsConfigPath),
    readFile(preferencesPath),
  ])
  assert.equal(digest(restoredPluginsConfig), digest(originalPluginsConfig))
  assert.equal(digest(restoredPreferences), digest(originalPreferences))
  configRestored = true

  const graphCacheDirectory = join(actualHome, '.logseq', 'graphs')
  const graphCacheEntries = await readdir(graphCacheDirectory).catch(() => [])
  await Promise.all(
    graphCacheEntries
      .filter((entry) => entry.includes(basename(graphPath)))
      .map((entry) => unlink(join(graphCacheDirectory, entry))),
  )
  await Promise.all([
    configRestored
      ? rm(isolatedHome, { recursive: true, force: true })
      : Promise.resolve(),
    rm(profile, { recursive: true, force: true }),
    rm(graphPath, { recursive: true, force: true }),
    rm(pluginRecoveryPath, { recursive: true, force: true }),
  ])
}
