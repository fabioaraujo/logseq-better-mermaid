import { readSettings, resolveMermaidTheme } from '../src/settings'

describe('readSettings', () => {
  it('returns safe defaults', () => {
    expect(readSettings({})).toEqual({
      theme: 'follow-logseq',
      securityLevel: 'strict',
      maxHeight: 720,
      pngScale: 2,
    })
  })

  it('rejects unsafe or unreasonable numeric values', () => {
    expect(
      readSettings({ securityLevel: 'anything', maxHeight: 10, pngScale: 99 }),
    ).toMatchObject({ securityLevel: 'strict', maxHeight: 720, pngScale: 2 })
  })
})

describe('resolveMermaidTheme', () => {
  it('follows Logseq dark mode', () => {
    expect(resolveMermaidTheme('follow-logseq', 'dark')).toBe('dark')
  })

  it('preserves an explicit Mermaid theme', () => {
    expect(resolveMermaidTheme('forest', 'dark')).toBe('forest')
  })
})
