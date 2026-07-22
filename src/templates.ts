import { escapeHtml } from './html'
import { getSvgDimensions } from './viewer'

export function loadingTemplate(id: string): string {
  return `<div id="${id}" class="better-mermaid"><div class="better-mermaid__state">正在渲染 Mermaid…</div></div>`
}

export function emptyTemplate(id: string): string {
  return `<div id="${id}" class="better-mermaid"><div class="better-mermaid__state">在这个块下面添加一个 <code>\`\`\`mermaid</code> 代码块即可生成图表。</div></div>`
}

export function errorTemplate(id: string, message: string): string {
  return `<div id="${id}" class="better-mermaid"><div class="better-mermaid__state better-mermaid__error"><strong>Mermaid 语法错误</strong>${escapeHtml(message.slice(0, 800))}</div></div>`
}

export function diagramTemplate(
  id: string,
  svg: string,
  maxHeight: number,
  viewKey: string,
): string {
  const imageSource = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  const { width, height } = getSvgDimensions(svg)
  return `
    <div id="${id}" class="better-mermaid" data-view-key="${viewKey}">
      <div class="better-mermaid__frame">
        <div class="better-mermaid__toolbar" aria-label="Mermaid 图表工具栏">
          <button class="better-mermaid__button" data-on-click="zoomOut" data-diagram-id="${id}" title="缩小">−</button>
          <button class="better-mermaid__button better-mermaid__fit" data-on-click="resetZoom" data-diagram-id="${id}" title="适应画布">适应</button>
          <button class="better-mermaid__button" data-on-click="zoomIn" data-diagram-id="${id}" title="放大">＋</button>
          <span class="better-mermaid__scale">100%</span>
          <span class="better-mermaid__separator"></span>
          <button class="better-mermaid__button" data-on-click="editSource" data-diagram-id="${id}" title="在代码编辑器中编辑 Mermaid">编辑</button>
          <button class="better-mermaid__button" data-on-click="toggleSource" data-diagram-id="${id}" title="显示或隐藏下面的源码块">源码</button>
          <button class="better-mermaid__button" data-on-click="exportSvg" data-diagram-id="${id}">SVG</button>
          <button class="better-mermaid__button" data-on-click="exportPng" data-diagram-id="${id}">PNG</button>
        </div>
        <div class="better-mermaid__viewport" data-max-height="${maxHeight}" title="滚轮缩放 · 拖动平移 · 双击适应">
          <div class="better-mermaid__canvas"><img class="better-mermaid__image" draggable="false" data-width="${width}" data-height="${height}" width="${width}" height="${height}" src="${imageSource}" alt="Mermaid diagram" /></div>
        </div>
      </div>
    </div>`
}
