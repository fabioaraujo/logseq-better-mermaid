const messages = {
  en: {
    loading: 'Rendering Mermaid…',
    empty: 'Add a ```mermaid code block below this block to render a diagram.',
    syntaxError: 'Mermaid syntax error',
    toolbar: 'Mermaid diagram toolbar',
    zoomOut: 'Zoom out', fit: 'Fit', fitTitle: 'Fit canvas', zoomIn: 'Zoom in',
    edit: 'Edit', editTitle: 'Edit Mermaid in Monaco Editor',
    source: 'Source', sourceTitle: 'Show or hide the source block below',
    viewportHint: 'Wheel to zoom · Drag to pan · Double-click to fit',
    slashInsert: 'Better Mermaid: Insert diagram',
    loaded: 'Better Mermaid loaded',
    pngExportFailed: 'PNG export failed', editorOpenFailed: 'Failed to open Monaco Editor',
    sourceMissing: 'Mermaid source block not found',
    editorTitle: 'Mermaid source', editorName: 'Monaco Editor',
    editorHint: '⌘/Ctrl + Enter to save · Esc to close',
    editorStatus: 'The diagram is re-rendered automatically after saving',
    cancel: 'Cancel', save: 'Save', saving: 'Saving…',
    themeTitle: 'Diagram theme',
    themeDescription: 'Follow Logseq by default; Mermaid frontmatter can override individual diagrams.',
    securityTitle: 'Security level',
    securityDescription: 'strict is safest; loose allows HTML and clickable links in trusted notes.',
    maxHeightTitle: 'Maximum canvas height', maxHeightDescription: 'Maximum diagram canvas height in pixels.',
    pngScaleTitle: 'PNG export scale', pngScaleDescription: '2 is recommended. Higher values use more memory.',
  },
  'zh-CN': {
    loading: '正在渲染 Mermaid…', empty: '在这个块下面添加一个 ```mermaid 代码块即可生成图表。',
    syntaxError: 'Mermaid 语法错误', toolbar: 'Mermaid 图表工具栏',
    zoomOut: '缩小', fit: '适应', fitTitle: '适应画布', zoomIn: '放大',
    edit: '编辑', editTitle: '在 Monaco Editor 中编辑 Mermaid',
    source: '源码', sourceTitle: '显示或隐藏下面的源码块',
    viewportHint: '滚轮缩放 · 拖动平移 · 双击适应', slashInsert: 'Better Mermaid: 插入图表',
    loaded: 'Better Mermaid 已加载', pngExportFailed: 'PNG 导出失败',
    editorOpenFailed: '打开 Monaco Editor 失败', sourceMissing: '找不到 Mermaid 源码块',
    editorTitle: 'Mermaid 源码', editorName: 'Monaco Editor',
    editorHint: '⌘/Ctrl + Enter 保存 · Esc 关闭', editorStatus: '保存后自动重新渲染图表',
    cancel: '取消', save: '保存', saving: '正在保存…',
    themeTitle: '图表主题', themeDescription: '默认跟随 Logseq；Mermaid frontmatter 仍可覆盖单张图。',
    securityTitle: '安全级别', securityDescription: 'strict 最安全；loose 允许可信笔记使用 HTML 和可点击链接。',
    maxHeightTitle: '画布最大高度', maxHeightDescription: '图表画布的最大高度，单位为像素。',
    pngScaleTitle: 'PNG 导出倍率', pngScaleDescription: '建议使用 2；更高倍率会消耗更多内存。',
  },
  'zh-TW': {
    loading: '正在渲染 Mermaid…', empty: '在這個區塊下方加入 ```mermaid 程式碼區塊即可產生圖表。',
    syntaxError: 'Mermaid 語法錯誤', toolbar: 'Mermaid 圖表工具列',
    zoomOut: '縮小', fit: '適應', fitTitle: '適應畫布', zoomIn: '放大',
    edit: '編輯', editTitle: '在 Monaco Editor 中編輯 Mermaid',
    source: '原始碼', sourceTitle: '顯示或隱藏下方的原始碼區塊',
    viewportHint: '滾輪縮放 · 拖曳平移 · 雙擊適應', slashInsert: 'Better Mermaid: 插入圖表',
    loaded: 'Better Mermaid 已載入', pngExportFailed: 'PNG 匯出失敗',
    editorOpenFailed: '無法開啟 Monaco Editor', sourceMissing: '找不到 Mermaid 原始碼區塊',
    editorTitle: 'Mermaid 原始碼', editorName: 'Monaco Editor',
    editorHint: '⌘/Ctrl + Enter 儲存 · Esc 關閉', editorStatus: '儲存後自動重新渲染圖表',
    cancel: '取消', save: '儲存', saving: '正在儲存…',
    themeTitle: '圖表主題', themeDescription: '預設跟隨 Logseq；Mermaid frontmatter 仍可覆寫單張圖。',
    securityTitle: '安全層級', securityDescription: 'strict 最安全；loose 允許可信任筆記使用 HTML 與可點擊連結。',
    maxHeightTitle: '畫布最大高度', maxHeightDescription: '圖表畫布的最大高度，單位為像素。',
    pngScaleTitle: 'PNG 匯出倍率', pngScaleDescription: '建議使用 2；更高倍率會消耗更多記憶體。',
  },
} as const

export type MessageKey = keyof (typeof messages)['en']
type Locale = keyof typeof messages
let locale: Locale = 'en'

export function setLocale(language: string | undefined) {
  const normalized = language?.toLowerCase() ?? ''
  locale = normalized.startsWith('zh')
    ? /(?:tw|hk|hant)/.test(normalized) ? 'zh-TW' : 'zh-CN'
    : 'en'
}

export function t(key: MessageKey): string {
  return messages[locale][key] ?? messages.en[key]
}

setLocale(globalThis.navigator?.language)
