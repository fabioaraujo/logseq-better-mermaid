import { escapeHtml } from './html'
import { t } from './i18n'
import { getSvgDimensions } from './viewer'

export function loadingTemplate(id: string): string {
  return `<div id="${id}" class="better-mermaid"><div class="better-mermaid__state better-mermaid__loading">${t('loading')}</div></div>`
}

export function emptyTemplate(id: string): string {
  return `<div id="${id}" class="better-mermaid"><div class="better-mermaid__state">${t('empty')}</div></div>`
}

export function errorTemplate(id: string, message: string): string {
  return `<div id="${id}" class="better-mermaid"><div class="better-mermaid__state better-mermaid__error"><strong>${t('syntaxError')}</strong>${escapeHtml(message.slice(0, 800))}</div></div>`
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
        <div class="better-mermaid__toolbar" aria-label="${t('toolbar')}">
          <button class="better-mermaid__button" data-on-click="zoomOut" data-diagram-id="${id}" title="${t('zoomOut')}">−</button>
          <button class="better-mermaid__button better-mermaid__fit" data-on-click="resetZoom" data-diagram-id="${id}" title="${t('fitTitle')}">${t('fit')}</button>
          <button class="better-mermaid__button" data-on-click="zoomIn" data-diagram-id="${id}" title="${t('zoomIn')}">＋</button>
          <span class="better-mermaid__scale">100%</span>
          <span class="better-mermaid__separator"></span>
          <button class="better-mermaid__button" data-on-click="editSource" data-diagram-id="${id}" title="${t('editTitle')}">${t('edit')}</button>
          <button class="better-mermaid__button" data-on-click="toggleSource" data-diagram-id="${id}" title="${t('sourceTitle')}">${t('source')}</button>
          <button class="better-mermaid__button" data-on-click="exportSvg" data-diagram-id="${id}">SVG</button>
          <button class="better-mermaid__button" data-on-click="exportPng" data-diagram-id="${id}">PNG</button>
          <span class="better-mermaid__separator"></span>
          <button class="better-mermaid__button" data-on-click="resizeHeight" data-diagram-id="${id}" title="Aumentar altura">↓</button>
        </div>
        <div class="better-mermaid__viewport" data-max-height="${maxHeight}" title="${t('viewportHint')}">
          <div class="better-mermaid__canvas"><img class="better-mermaid__image" draggable="false" data-width="${width}" data-height="${height}" width="${width}" height="${height}" src="${imageSource}" alt="Mermaid diagram" /></div>
        </div>
      </div>
    </div>`
}
