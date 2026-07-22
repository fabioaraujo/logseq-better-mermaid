import type { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin'

import type { PluginSettings, ThemeMode } from './types'
import { t } from './i18n'

export const settingsSchema: SettingSchemaDesc[] = [
  {
    key: 'theme',
    type: 'enum',
    default: 'follow-logseq',
    title: t('themeTitle'),
    description: t('themeDescription'),
    enumChoices: ['follow-logseq', 'default', 'dark', 'neutral', 'forest', 'base'],
    enumPicker: 'select',
  },
  {
    key: 'securityLevel',
    type: 'enum',
    default: 'strict',
    title: t('securityTitle'),
    description: t('securityDescription'),
    enumChoices: ['strict', 'loose'],
    enumPicker: 'select',
  },
  {
    key: 'maxHeight',
    type: 'number',
    default: 720,
    title: t('maxHeightTitle'),
    description: t('maxHeightDescription'),
  },
  {
    key: 'pngScale',
    type: 'number',
    default: 2,
    title: t('pngScaleTitle'),
    description: t('pngScaleDescription'),
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
