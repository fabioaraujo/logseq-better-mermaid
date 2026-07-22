import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
await mkdir(resolve(root, 'vendor'), { recursive: true })
await copyFile(
  resolve(root, 'node_modules/mermaid/dist/mermaid.min.js'),
  resolve(root, 'vendor/mermaid.min.js'),
)
