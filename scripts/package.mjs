import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'

import { zipSync } from 'fflate'

const root = resolve(import.meta.dirname, '..')
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const files = {}

async function addPath(path) {
  const entries = await readdir(path, { withFileTypes: true })
  for (const entry of entries) {
    const absolute = join(path, entry.name)
    if (entry.isDirectory()) {
      await addPath(absolute)
    } else if (entry.isFile()) {
      files[relative(root, absolute)] = new Uint8Array(await readFile(absolute))
    }
  }
}

for (const file of ['package.json', 'icon.svg', 'README.md', 'LICENSE']) {
  files[basename(file)] = new Uint8Array(await readFile(join(root, file)))
}
await addPath(join(root, 'dist'))
await addPath(join(root, 'vendor'))

const releaseDirectory = join(root, 'release')
await mkdir(releaseDirectory, { recursive: true })
const releasePath = join(
  releaseDirectory,
  `logseq-better-mermaid-${manifest.version}.zip`,
)
await writeFile(releasePath, zipSync(files, { level: 9 }))
console.log(releasePath)
