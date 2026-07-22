import type { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin'

import type { PluginSettings, ThemeMode } from './types'

export const settingsSchema: SettingSchemaDesc[] = [
  {
    key: 'theme',
    type: 'enum',
    default: 'follow-logseq',
    title: '图表主题',
    description: '默认跟随 Logseq 的明暗主题；Mermaid frontmatter 仍可覆盖单张图。',
    enumChoices: ['follow-logseq', 'default', 'dark', 'neutral', 'forest', 'base'],
    enumPicker: 'select',
  },
  {
    key: 'securityLevel',
    type: 'enum',
    default: 'strict',
    title: '安全级别',
    description: 'strict 最安全；loose 允许 HTML 标签和可点击链接，仅用于可信笔记。',
    enumChoices: ['strict', 'loose'],
    enumPicker: 'select',
  },
  {
    key: 'maxHeight',
    type: 'number',
    default: 720,
    title: '最大显示高度',
    description: '超过此高度后图表区域可滚动，单位为像素。',
  },
  {
    key: 'pngScale',
    type: 'number',
    default: 2,
    title: 'PNG 导出倍率',
    description: '建议 2；更高倍率更清晰，但会消耗更多内存。',
  },
]

export function readSettings(raw: Record<string, unknown>): PluginSettings {
  const maxHeight = Number(raw.maxHeight)
  const pngScale = Number(raw.pngScale)

  return {
    theme: (raw.theme as PluginSettings['theme']) || 'follow-logseq',
    securityLevel: raw.securityLevel === 'loose' ? 'loose' : 'strict',
    maxHeight: Number.isFinite(maxHeight) && maxHeight >= 200 ? maxHeight : 720,
    pngScale:
      Number.isFinite(pngScale) && pngScale >= 1 && pngScale <= 6 ? pngScale : 2,
  }
}

export function resolveMermaidTheme(
  setting: PluginSettings['theme'],
  logseqTheme: ThemeMode,
) {
  if (setting === 'follow-logseq') {
    return logseqTheme === 'dark' ? 'dark' : 'default'
  }
  return setting
}
