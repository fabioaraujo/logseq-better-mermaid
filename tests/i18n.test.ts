import { setLocale, t } from '../src/i18n'

describe('i18n', () => {
  it('uses English as the general fallback', () => {
    setLocale('fr-FR')
    expect(t('edit')).toBe('Edit')
  })

  it('distinguishes simplified and traditional Chinese', () => {
    setLocale('zh-CN')
    expect(t('source')).toBe('源码')
    setLocale('zh-TW')
    expect(t('source')).toBe('原始碼')
  })
})
