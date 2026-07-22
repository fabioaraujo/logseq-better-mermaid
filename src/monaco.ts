/// <reference types="vite/client" />

import 'monaco-editor/min/vs/editor/editor.main.css'

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { t } from './i18n'

type MonacoOptions = {
  source: string
  dark: boolean
  onSave: (source: string) => Promise<void>
  onClose: () => void
}

let languageRegistered = false
let activeEditor: monaco.editor.IStandaloneCodeEditor | undefined

function ensureMermaidLanguage() {
  if (languageRegistered) return
  languageRegistered = true
  monaco.languages.register({ id: 'mermaid' })
  monaco.languages.setMonarchTokensProvider('mermaid', {
    keywords: [
      'flowchart', 'graph', 'sequenceDiagram', 'classDiagram',
      'stateDiagram-v2', 'erDiagram', 'gantt', 'mindmap', 'timeline',
      'pie', 'gitGraph', 'subgraph', 'end', 'participant', 'actor',
      'class', 'state', 'section', 'title',
    ],
    tokenizer: {
      root: [
        [/%%.*$/, 'comment'],
        [/[a-zA-Z_][\w-]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/[{}[\]()]|--?>|==?>|-.->|---/, 'operator'],
        [/\d+(?:\.\d+)?/, 'number'],
      ],
    },
  })
}

export function openMonacoEditor(options: MonacoOptions) {
  activeEditor?.dispose()
  document.body.replaceChildren()
  document.body.style.margin = '0'
  document.body.style.background = 'transparent'
  document.body.style.overflow = 'hidden'

  ;(self as unknown as { MonacoEnvironment: { getWorker: () => Worker } })
    .MonacoEnvironment = { getWorker: () => new EditorWorker() }
  ensureMermaidLanguage()

  const overlay = document.createElement('div')
  overlay.className = 'bm-monaco-overlay'
  overlay.innerHTML = `
    <section class="bm-monaco-panel" role="dialog" aria-label="${t('editorTitle')}">
      <header class="bm-monaco-header">
        <div><strong>${t('editorTitle')}</strong><span>${t('editorName')}</span></div>
        <div class="bm-monaco-hint">${t('editorHint')}</div>
      </header>
      <div class="bm-monaco-editor"></div>
      <footer class="bm-monaco-footer">
        <span class="bm-monaco-status">${t('editorStatus')}</span>
        <div><button data-action="cancel">${t('cancel')}</button><button class="primary" data-action="save">${t('save')}</button></div>
      </footer>
    </section>`
  document.body.append(overlay)

  document.getElementById('better-mermaid-monaco-style')?.remove()
  const style = document.createElement('style')
  style.id = 'better-mermaid-monaco-style'
  style.textContent = `
    .bm-monaco-overlay { position:fixed; inset:0; display:grid; place-items:center; padding:4vh 4vw; box-sizing:border-box; background:rgba(15,23,42,.34); backdrop-filter:blur(3px); font-family:Inter,system-ui,sans-serif; }
    .bm-monaco-panel { display:flex; flex-direction:column; width:min(1100px,92vw); height:min(760px,88vh); overflow:hidden; border:1px solid rgba(127,127,127,.35); border-radius:12px; background:${options.dark ? '#1e1e1e' : '#fff'}; box-shadow:0 24px 70px rgba(0,0,0,.28); }
    .bm-monaco-header,.bm-monaco-footer { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:10px 14px; color:${options.dark ? '#ddd' : '#222'}; }
    .bm-monaco-header { border-bottom:1px solid rgba(127,127,127,.25); }
    .bm-monaco-header strong { margin-right:10px; font-size:14px; }
    .bm-monaco-header span,.bm-monaco-hint,.bm-monaco-status { color:${options.dark ? '#999' : '#666'}; font-size:12px; }
    .bm-monaco-editor { flex:1; min-height:0; }
    .bm-monaco-footer { border-top:1px solid rgba(127,127,127,.25); }
    .bm-monaco-footer div { display:flex; gap:8px; }
    button { border:1px solid rgba(127,127,127,.4); border-radius:6px; padding:5px 13px; color:${options.dark ? '#ddd' : '#222'}; background:${options.dark ? '#2d2d2d' : '#fff'}; cursor:pointer; }
    button.primary { border-color:#3b82f6; color:white; background:#3b82f6; }
    button:disabled { opacity:.55; cursor:wait; }
  `
  document.head.append(style)

  const editorElement = overlay.querySelector<HTMLElement>('.bm-monaco-editor')!
  const status = overlay.querySelector<HTMLElement>('.bm-monaco-status')!
  const saveButton = overlay.querySelector<HTMLButtonElement>('[data-action="save"]')!
  activeEditor = monaco.editor.create(editorElement, {
    value: options.source,
    language: 'mermaid',
    theme: options.dark ? 'vs-dark' : 'vs',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    lineHeight: 22,
    padding: { top: 12, bottom: 12 },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    renderWhitespace: 'selection',
    tabSize: 2,
  })

  const close = () => {
    activeEditor?.dispose()
    activeEditor = undefined
    document.body.replaceChildren()
    options.onClose()
  }
  const save = async () => {
    if (!activeEditor) return
    saveButton.disabled = true
    status.textContent = t('saving')
    try {
      await options.onSave(activeEditor.getValue())
      close()
    } catch (error) {
      saveButton.disabled = false
      status.textContent = error instanceof Error ? error.message : String(error)
    }
  }

  overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', close)
  saveButton.addEventListener('click', () => void save())
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) close()
  })
  activeEditor.addCommand(monaco.KeyCode.Escape, close)
  activeEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => void save())
  activeEditor.focus()
}
