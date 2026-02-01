import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import type { Feature, Point } from 'geojson'
import type { SpeciesInfo } from '../../constants'

vi.mock('../../utils', () => ({
  getColorForSpecies: vi.fn(() => 'rgb(1, 2, 3)'),
  withBaseUrl: (path: string) => path,
}))

import { getColorForSpecies } from '../../utils'
import DetailedPopupCard from '../detailed_popup_card'

interface HabitatProperties {
  cleanedSpecies?: string
  _genus: string | null
  COUNTY: string | string[]
  SITE_NAME?: string
  AREA: number
  H_FOSSDESC?: string
  COVERAGE?: string
  SITE_CODE: number
}

type HabitatFeature = Feature<Point, HabitatProperties>

const makeFeature = (overrides?: Partial<HabitatProperties>): HabitatFeature => {
  const geometry: Point = { type: 'Point', coordinates: [0, 0] }

  return {
    type: 'Feature',
    geometry,
    properties: {
      cleanedSpecies: 'Fraxinus excelsior',
      _genus: 'Alnus',
      COUNTY: 'Dublin',
      SITE_NAME: 'My Site',
      AREA: 12345, // m^2
      H_FOSSDESC: 'Oak-birch-holly woodland',
      COVERAGE: '100',
      SITE_CODE: 76,
      ...overrides,
    },
  }
}

describe('DetailedPopupCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders site name, county, primary species, habitat, habitat composition, and area (ha)', () => {
    const feature = makeFeature()

    const speciesInfo: Record<string, SpeciesInfo> = {
      Alnus: { image: '/img.jpg', description: 'Some description' },
    }

    render(<DetailedPopupCard feature={feature} speciesInfo={speciesInfo} />)

    expect(screen.getByRole('heading', { level: 3, name: 'My Site' })).toBeInTheDocument()

    expect(screen.getByText('County:')).toBeInTheDocument()
    expect(screen.getByText('Dublin')).toBeInTheDocument()

    expect(screen.getByText('Primary Species:')).toBeInTheDocument()
    expect(screen.getByText('Fraxinus excelsior')).toBeInTheDocument()

    expect(screen.getByText('Habitat:')).toBeInTheDocument()
    expect(screen.getByText('Oak-birch-holly woodland')).toBeInTheDocument()

    expect(screen.getByText('Habitat composition:')).toBeInTheDocument()
    expect(screen.getByText(/100\s*\(%\)/)).toBeInTheDocument()

    // 12345 / 10000 = 1.2345 -> "1.23 ha"
    expect(screen.getByText('Area:')).toBeInTheDocument()
    expect(screen.getByText('1.23 ha')).toBeInTheDocument()
  })

  it('falls back to "NSNW Site <SITE_CODE>" when SITE_NAME is missing', () => {
    const feature = makeFeature({ SITE_NAME: undefined, SITE_CODE: 76 })

    render(<DetailedPopupCard feature={feature} speciesInfo={{}} />)

    expect(screen.getByRole('heading', { level: 3, name: 'NSNW Site 76' })).toBeInTheDocument()
  })

  it('falls back to "Undefined" when cleanedSpecies is missing', () => {
    const feature = makeFeature({ cleanedSpecies: undefined })

    render(<DetailedPopupCard feature={feature} speciesInfo={{}} />)

    // "Undefined" appears in the species <span>
    expect(screen.getByText('Undefined')).toBeInTheDocument()
  })

  it('joins COUNTY when it is an array', () => {
    const feature = makeFeature({ COUNTY: ['Cork', 'Kerry'] })

    render(<DetailedPopupCard feature={feature} speciesInfo={{}} />)

    expect(screen.getByText('Cork, Kerry')).toBeInTheDocument()
  })

  it('falls back to "Unknown" when COUNTY is an empty string', () => {
    const feature = makeFeature({ COUNTY: '' })

    render(<DetailedPopupCard feature={feature} speciesInfo={{}} />)

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('calls getColorForSpecies with the rendered species and applies it to the species span', () => {
    const feature = makeFeature({ cleanedSpecies: 'Betula pubescens' })

    render(<DetailedPopupCard feature={feature} speciesInfo={{}} />)

    expect(getColorForSpecies).toHaveBeenCalledTimes(1)
    expect(getColorForSpecies).toHaveBeenCalledWith('Betula pubescens')

    const speciesEl = screen.getByText('Betula pubescens')
    expect(speciesEl).toHaveStyle({ color: 'rgb(1, 2, 3)' })
    expect(speciesEl).toHaveStyle({ fontWeight: 'bold' })
  })

  it('renders image + description when _genus exists and speciesInfo has an entry', () => {
    const feature = makeFeature({ _genus: 'Alnus', cleanedSpecies: 'Fraxinus excelsior' })

    const speciesInfo: Record<string, SpeciesInfo> = {
      Alnus: { image: '/alnus.jpg', description: 'A nice tree.' },
    }

    render(<DetailedPopupCard feature={feature} speciesInfo={speciesInfo} />)

    const img = screen.getByRole('img', { name: 'Fraxinus excelsior' })
    expect(img).toHaveAttribute('src', '/alnus.jpg')
    expect(screen.getByText('A nice tree.')).toBeInTheDocument()
  })

  it('does not render image/description when _genus is null', () => {
    const feature = makeFeature({ _genus: null })

    const speciesInfo: Record<string, SpeciesInfo> = {
      Alnus: { image: '/alnus.jpg', description: 'A nice tree.' },
    }

    render(<DetailedPopupCard feature={feature} speciesInfo={speciesInfo} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByText('A nice tree.')).not.toBeInTheDocument()
  })

  it('does not render image/description when _genus exists but speciesInfo lacks that key', () => {
    const feature = makeFeature({ _genus: 'MissingGenus' })

    render(<DetailedPopupCard feature={feature} speciesInfo={{}} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('hides the image when it errors', () => {
    const feature = makeFeature({ _genus: 'Alnus', cleanedSpecies: 'Fraxinus excelsior' })

    const speciesInfo: Record<string, SpeciesInfo> = {
      Alnus: { image: '/broken.jpg', description: 'A nice tree.' },
    }

    render(<DetailedPopupCard feature={feature} speciesInfo={speciesInfo} />)

    const img = screen.getByRole('img', { name: 'Fraxinus excelsior' })
    fireEvent.error(img)

    expect(img).toHaveStyle({ display: 'none' })
  })
})
