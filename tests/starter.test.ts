import { describe, expect, it } from 'vitest'

import { STARTER_MERMAID } from '../src/starter'

describe('starter Mermaid diagram', () => {
  it('uses a language-neutral English example', () => {
    expect(STARTER_MERMAID).toContain('A[Idea] --> B[Better Mermaid]')
    expect(STARTER_MERMAID).not.toContain('想法')
  })
})
