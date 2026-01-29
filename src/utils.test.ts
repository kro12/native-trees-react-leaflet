import { describe, it, expect } from 'vitest'
import { cleanTreeSpecies, getGenusFromSpecies, getColorForSpecies, getDarkerShade } from './utils'

describe('utils', () => {
  it('cleanTreeSpecies maps abbreviations via speciesMap', () => {
    expect(cleanTreeSpecies(['F. excelsior'])).toEqual(['Fraxinus excelsior'])
  })

  it('cleanTreeSpecies filters Not Determined', () => {
    expect(cleanTreeSpecies(['Not Determined'])).toEqual([])
  })

  it('getGenusFromSpecies extracts genus', () => {
    expect(getGenusFromSpecies('Quercus robur')).toBe('Quercus')
  })

  it('getColorForSpecies returns grey for Unknown', () => {
    expect(getColorForSpecies('Unknown')).toBe('#808080')
  })

  it('getDarkerShade falls back when missing', () => {
    expect(getDarkerShade('#does-not-exist')).toBe('#333333')
  })
})
