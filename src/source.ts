import type { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import type { BlockLike } from './types'

const MERMAID_FENCE =
  /```mermaid(?:[ \t]+[^\n]*)?[ \t]*\r?\n?([\s\S]*?)```/i
const ANY_FENCE = /```(?:[^\n]*)?[ \t]*\r?\n?([\s\S]*?)```/

export function getBlockText(block: BlockLike): string {
  return block.fullTitle ?? block.title ?? block.content ?? ''
}

export function extractMermaidSource(raw: string): string | null {
  const mermaidMatch = raw.match(MERMAID_FENCE)
  if (mermaidMatch?.[1]?.trim()) return mermaidMatch[1].trim()

  // A child created by older Mermaid plugins was occasionally saved as a
  // generic fence. Accept it only when the entire child is a code fence.
  const genericMatch = raw.trim().match(ANY_FENCE)
  if (genericMatch?.[1]?.trim()) return genericMatch[1].trim()

  return null
}

function isBlockEntity(value: unknown): value is BlockEntity {
  return Boolean(value && typeof value === 'object' && 'uuid' in value)
}

export async function findMermaidSource(
  rootUuid: string,
  getBlock: (
    uuid: string,
    options?: { includeChildren: boolean },
  ) => Promise<BlockEntity | null>,
): Promise<{ source: string; blockUuid: string } | null> {
  const root = await getBlock(rootUuid, { includeChildren: true })
  if (!root) return null

  const rootSource = extractMermaidSource(getBlockText(root))
  if (rootSource) return { source: rootSource, blockUuid: String(root.uuid) }

  for (const child of root.children ?? []) {
    const resolved = isBlockEntity(child)
      ? child
      : await getBlock(String(child[1] ?? child[0]), { includeChildren: true })
    if (!resolved) continue

    const source = extractMermaidSource(getBlockText(resolved))
    if (source) return { source, blockUuid: String(resolved.uuid) }
  }

  return null
}

export function isBetterMermaidMacro(type: string | undefined): boolean {
  return (
    type === ':better-mermaid' ||
    type === ':better_mermaid' ||
    Boolean(type?.startsWith(':mermaid_'))
  )
}
