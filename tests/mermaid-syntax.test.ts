import mermaid from 'mermaid'

import { validateSource } from '../src/renderer'

const diagrams = {
  flowchart: 'flowchart LR\n  A[中文] --> B[Logseq]',
  sequence: 'sequenceDiagram\n  用户->>Logseq: 创建图表\n  Logseq-->>用户: SVG',
  class: 'classDiagram\n  class Note {\n    +String title\n  }',
  state: 'stateDiagram-v2\n  [*] --> Writing\n  Writing --> Done',
  er: 'erDiagram\n  PAGE ||--o{ BLOCK : contains',
  gantt: 'gantt\n  title 发布计划\n  section 插件\n  开发 :a1, 2026-07-01, 3d',
  mindmap: 'mindmap\n  root((知识库))\n    Logseq\n    Mermaid',
  timeline: 'timeline\n  2025 : 旧插件\n  2026 : Better Mermaid',
  pie: 'pie title 图表\n  "成功" : 90\n  "其他" : 10',
  gitGraph: 'gitGraph\n  commit\n  branch feature\n  commit\n  checkout main\n  merge feature',
}

describe('Mermaid 11 syntax coverage', () => {
  it.each(Object.entries(diagrams))('parses %s diagrams', async (_name, source) => {
    await expect(validateSource(source, mermaid)).resolves.toBeUndefined()
  })

  it('reports invalid syntax', async () => {
    await expect(
      validateSource('flowchart LR\n  A --', mermaid),
    ).rejects.toBeDefined()
  })
})
