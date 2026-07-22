import { getSvgDimensions } from '../src/viewer'

describe('getSvgDimensions', () => {
  it('uses the Mermaid SVG viewBox dimensions', () => {
    expect(
      getSvgDimensions('<svg width="100%" viewBox="0 0 1280.5 420"></svg>'),
    ).toEqual({ width: 1280.5, height: 420 })
  })

  it('falls back when an SVG has no usable viewBox', () => {
    expect(getSvgDimensions('<svg></svg>')).toEqual({ width: 300, height: 150 })
  })
})
