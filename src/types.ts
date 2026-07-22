import type { BlockEntity } from '@logseq/libs/dist/LSPlugin'

export type ThemeMode = 'light' | 'dark'

export type DiagramRegistration = {
  id: string
  key: string
  slot: string
  blockUuid: string
}

export type DiagramSnapshot = DiagramRegistration & {
  source: string
  svg: string
  title: string
}

export type BlockLike = Pick<
  BlockEntity,
  'uuid' | 'title' | 'fullTitle' | 'content' | 'children'
>

export type PluginSettings = {
  theme: 'follow-logseq' | 'default' | 'dark' | 'neutral' | 'forest' | 'base'
  securityLevel: 'strict' | 'loose'
  maxHeight: number
  pngScale: number
}
