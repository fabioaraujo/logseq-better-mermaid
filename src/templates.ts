import { escapeHtml } from './html'

export function loadingTemplate(id: string): string {
  return `<div id="${id}" class="better-mermaid"><div class="better-mermaid__state">正在渲染 Mermaid…</div></div>`
}

export function emptyTemplate(id: string): string {
  return `<div id="${id}" class="better-mermaid"><div class="better-mermaid__state">在这个块下面添加一个 <code>\`\`\`mermaid</code> 代码块即可生成图表。</div></div>`
}

export function errorTemplate(id: string, message: string): string {
  return `<div id="${id}" class="better-mermaid"><div class="better-mermaid__state better-mermaid__error"><strong>Mermaid 语法错误</strong>${escapeHtml(message.slice(0, 800))}</div></div>`
}

export function diagramTemplate(id: string, svg: string, maxHeight: number): string {
  const imageSource = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return `
    <div id="${id}" class="better-mermaid" data-zoom="1">
      <div class="better-mermaid__frame" style="max-height:${maxHeight}px">
        <div class="better-mermaid__toolbar" aria-label="Mermaid 图表工具栏">
          <button class="better-mermaid__button" data-on-click="zoomOut" data-diagram-id="${id}" title="缩小">−</button>
          <button class="better-mermaid__button" data-on-click="resetZoom" data-diagram-id="${id}" title="适应宽度">适应</button>
          <button class="better-mermaid__button" data-on-click="zoomIn" data-diagram-id="${id}" title="放大">＋</button>
          <button class="better-mermaid__button" data-on-click="toggleSource" data-diagram-id="${id}" title="收起或展开 Mermaid 源码">源码</button>
          <button class="better-mermaid__button" data-on-click="exportSvg" data-diagram-id="${id}">SVG</button>
          <button class="better-mermaid__button" data-on-click="exportPng" data-diagram-id="${id}">PNG</button>
        </div>
        <div class="better-mermaid__canvas"><img src="${imageSource}" alt="Mermaid diagram" /></div>
      </div>
    </div>`
}
