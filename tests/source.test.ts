import type { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import {
  extractMermaidSource,
  findMermaidSource,
  isBetterMermaidMacro,
} from '../src/source'

describe('extractMermaidSource', () => {
  it('extracts a multiline Mermaid fence without flattening the source', () => {
    expect(
      extractMermaidSource(
        '```mermaid\nsequenceDiagram\n  用户->>Logseq: 画图\n```',
      ),
    ).toBe('sequenceDiagram\n  用户->>Logseq: 画图')
  })

  it('accepts Mermaid fence options', () => {
    expect(extractMermaidSource('```mermaid example\ngraph LR\nA-->B\n```')).toBe(
      'graph LR\nA-->B',
    )
  })

  it('accepts an old generic fenced child for migration', () => {
    expect(extractMermaidSource('```\ngraph TD\nA-->B\n```')).toBe(
      'graph TD\nA-->B',
    )
  })

  it('does not mistake ordinary text for a diagram', () => {
    expect(extractMermaidSource('graph LR A-->B')).toBeNull()
  })
})

describe('findMermaidSource', () => {
  it('finds the first Mermaid child returned by Logseq', async () => {
    const root = {
      uuid: 'root',
      title: '{{renderer :better-mermaid}}',
      children: [
        {
          uuid: 'child',
          title: '```mermaid\nmindmap\n  root((知识))\n```',
        },
      ],
    } as unknown as BlockEntity
    const getBlock = vi.fn(async () => root)

    await expect(findMermaidSource('root', getBlock)).resolves.toEqual({
      source: 'mindmap\n  root((知识))',
      blockUuid: 'child',
    })
    expect(getBlock).toHaveBeenCalledWith('root', { includeChildren: true })
  })

  it('resolves tuple children used by some Logseq API versions', async () => {
    const root = {
      uuid: 'root',
      title: '{{renderer :better-mermaid}}',
      children: [['uuid', 'child']],
    } as unknown as BlockEntity
    const child = {
      uuid: 'child',
      title: '```mermaid\ntimeline\n  2026 : Better Mermaid\n```',
    } as unknown as BlockEntity
    const getBlock = vi.fn(async (uuid: string) =>
      uuid === 'root' ? root : child,
    )

    await expect(findMermaidSource('root', getBlock)).resolves.toEqual({
      source: 'timeline\n  2026 : Better Mermaid',
      blockUuid: 'child',
    })
  })
})

describe('isBetterMermaidMacro', () => {
  it.each([
    ':better-mermaid',
    ':better_mermaid',
    ':mermaid_66b0fcff-ea9e-4909-9aab-554186001e73',
  ])('supports %s', (macro) => {
    expect(isBetterMermaidMacro(macro)).toBe(true)
  })

  it('ignores unrelated renderers', () => {
    expect(isBetterMermaidMacro(':youtube')).toBe(false)
  })
})
