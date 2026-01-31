// src/tests/App.test.tsx
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { makeHabitats } from './fixtures/habitats'

/**
 * IMPORTANT: Use `import type` for app types in this test suite.
 *
 * This test file mocks `../constants` at runtime using `vi.mock(...)`.
 * If we import types from that module as normal imports, Vitest will
 * try to resolve them from the mocked module — but types do not exist
 * at runtime and are not part of the mock.
 *
 * `import type` ensures:
 * - Types are used ONLY at compile time
 * - No runtime import is generated
 * - The constants mock is not affected
 * - Tests stay aligned with real app types without duplication
 *
 * This is required for type-safe integration tests with strict
 * TypeScript + ESLint rules.
 */
import type { HabitatFeature, HabitatCollection } from '../constants'

import App from '../App'

// ----------------------
// Small helper: deferred promise (lets us test "disabled while loading")
// ----------------------
function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// ----------------------
// Mock constants
// ----------------------
vi.mock('../constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../constants')>()
  return {
    ...actual,
    POLYGON_PULSE_DELAY: 0,
    DEFAULT_MAP_COORDS: [53.35, -7.5],
    titleLayers: {
      street: { url: 'street-url', attribution: 'street-attrib' },
      satellite: { url: 'sat-url', attribution: 'sat-attrib' },
      terrain: { url: 'terrain-url', attribution: 'terrain-attrib' },
    },
    speciesInfo: {
      Alnus: { image: '/alnus.jpg', description: 'Alder description' },
      Betula: { image: '/betula.jpg', description: 'Birch description' },
    },
    // IMPORTANT: SpeciesFilter needs this at runtime
    treeColors: {
      Alnus: '#ff0000',
      Betula: '#00ff00',
    },
  }
})

// ----------------------
// Mock utils (index + county loader + style)
// ----------------------
type HabitatIndex = {
  counties: string[]
  availableSpecies: string[]
  files: Record<string, string>
}

interface LoadIndexResult {
  counties: string[]
  availableSpecies: string[]
  index: HabitatIndex
}

const loadHabitatDataMock = vi.fn<() => Promise<LoadIndexResult>>()
const loadHabitatsForCountyMock =
  vi.fn<(county: string, index: HabitatIndex) => Promise<HabitatCollection>>()
const deriveStyleFeatureMock = vi.fn<(shouldPulse: boolean, feature: unknown) => unknown>(() => ({
  weight: 1,
  fillOpacity: 0.5,
}))

vi.mock('../utils', () => ({
  loadHabitatData: () => loadHabitatDataMock(),
  loadHabitatsForCounty: (county: string, index: HabitatIndex) =>
    loadHabitatsForCountyMock(county, index),
  deriveStyleFeature: (shouldPulse: boolean, feature: unknown) =>
    deriveStyleFeatureMock(shouldPulse, feature),
}))

// ----------------------
// Mock leaflet + createRoot
// ----------------------
vi.mock('leaflet', () => ({
  default: {
    divIcon: (opts: unknown) => ({ opts }),
  },
}))

const renderIntoPopupMock = vi.fn<(node: unknown) => void>()
vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render: renderIntoPopupMock }),
}))

// ----------------------
// Mock hooks
// ----------------------
const flashMock = vi.fn<() => void>()
vi.mock('../hooks/useFlashPolygons', () => ({
  useFlashPolygons: () => ({ flash: flashMock, isFlashing: false }),
}))

const handleContextMenuMock = vi.fn<(e: unknown) => void>()
const closeMenuMock = vi.fn<() => void>()

vi.mock('../hooks/useContextMenu', () => ({
  useContextMenu: () => ({
    menuPosition: null,
    handleContextMenu: handleContextMenuMock,
    closeMenu: closeMenuMock,
  }),
}))

// ----------------------
// Mock child components that touch refs/zoom
// ----------------------
type MapRef = React.MutableRefObject<{
  setView: (...args: unknown[]) => void
  dragging: { disable: () => void; enable: () => void }
} | null>

function MapRefCaptureMock({ mapRef }: { mapRef: MapRef }) {
  React.useEffect(() => {
    mapRef.current = {
      setView: vi.fn<(...args: unknown[]) => void>(),
      dragging: { disable: vi.fn<() => void>(), enable: vi.fn<() => void>() },
    }
  }, [mapRef])

  return <div data-testid="map-ref-capture" />
}
vi.mock('../components/map_ref_capture', () => ({ default: MapRefCaptureMock }))

function ZoomTrackerMock({ setCurrentZoom }: { setCurrentZoom: (z: number) => void }) {
  React.useEffect(() => {
    setCurrentZoom(11)
  }, [setCurrentZoom])

  return <div data-testid="zoom-tracker" />
}
vi.mock('../components/zoom_tracker', () => ({ default: ZoomTrackerMock }))

vi.mock('../components/county_zoomer', () => ({
  default: function CountyZoomerMock() {
    return <div data-testid="county-zoomer" />
  },
}))

vi.mock('../components/habitat_markers', () => ({
  default: function HabitatMarkersMock({
    filteredHabitats,
  }: {
    filteredHabitats: HabitatCollection | null
  }) {
    return <div data-testid="habitat-markers">{filteredHabitats?.features.length ?? 0}</div>
  },
}))

vi.mock('../components/context_menu', () => ({
  default: function ContextMenuMock() {
    return <div data-testid="context-menu" />
  },
}))

// Keep real SpeciesFilter to test click-outside behaviour
vi.mock('../components/species_filter', async () => {
  const mod = await vi.importActual<typeof import('../components/species_filter')>(
    '../components/species_filter'
  )
  return mod
})

// ----------------------
// Mock react-leaflet / cluster
// ----------------------
const tileLayerSpy = vi.fn<(props: { url: string; attribution?: string }) => void>()
type OnEachFeature = (feature: HabitatFeature, layer: FakePathLayer) => void
const geoJsonSpy =
  vi.fn<(props: { data: HabitatCollection; onEachFeature?: OnEachFeature }) => void>()
const onEachFeatureLayerBindPopupSpy = vi.fn<() => void>()

interface FakePathLayer {
  setStyle: (style: unknown) => void
  on: (handlers: Record<string, unknown>) => void
  bindPopup: (el: unknown) => void
}

function MapContainerMock({ children }: { children: React.ReactNode }) {
  return <div data-testid="map-container">{children}</div>
}

function TileLayerMock(props: { url: string; attribution?: string }) {
  tileLayerSpy(props)
  return <div data-testid="tile-layer" data-url={props.url} data-attrib={props.attribution ?? ''} />
}

function GeoJSONMock(props: { data: HabitatCollection; onEachFeature?: OnEachFeature }) {
  geoJsonSpy(props)

  React.useEffect(() => {
    if (!props.onEachFeature) return
    for (const f of props.data.features) {
      const layer: FakePathLayer = {
        setStyle: () => undefined,
        on: () => undefined,
        bindPopup: () => {
          onEachFeatureLayerBindPopupSpy()
        },
      }
      props.onEachFeature(f, layer)
    }
  }, [props])

  return <div data-testid="geojson" />
}

vi.mock('react-leaflet', () => ({
  MapContainer: MapContainerMock,
  TileLayer: TileLayerMock,
  GeoJSON: GeoJSONMock,
}))

vi.mock('react-leaflet-cluster', () => ({
  default: function ClusterMock({ children }: { children: React.ReactNode }) {
    return <div data-testid="cluster">{children}</div>
  },
}))

describe('App integration', () => {
  const index: HabitatIndex = {
    counties: ['All', 'Dublin', 'Cork'],
    availableSpecies: ['Alnus', 'Betula'],
    files: {
      Dublin: '/data/habitats/Dublin.json',
      Cork: '/data/habitats/Cork.json',
      All: '/data/habitats/All.json',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    loadHabitatDataMock.mockResolvedValue({
      counties: index.counties,
      availableSpecies: index.availableSpecies,
      index,
    })

    loadHabitatsForCountyMock.mockImplementation(async (county) => {
      if (county === 'Dublin') return makeHabitats()
      return { type: 'FeatureCollection', features: [] } as HabitatCollection
    })
  })

  it('disables county select until index loads, then shows county options', async () => {
    const deferred = createDeferred<LoadIndexResult>()
    loadHabitatDataMock.mockReturnValueOnce(deferred.promise)

    render(<App />)

    expect(screen.getByRole('button', { name: /Species/i })).toBeDisabled()
    const select = screen.getByLabelText(/County/i) as HTMLSelectElement
    expect(select).toBeDisabled()
    expect(within(select).getByRole('option', { name: /Loading counties/i })).toBeInTheDocument()

    deferred.resolve({
      counties: index.counties,
      availableSpecies: index.availableSpecies,
      index,
    })

    await waitFor(() => expect(select).not.toBeDisabled())

    const options = within(select)
      .getAllByRole('option')
      .map((o) => o.textContent)

    expect(options).toEqual(['-- Select a County --', 'All', 'Dublin', 'Cork'])
  })

  it('selecting a county loads habitats and shows site count + markers', async () => {
    render(<App />)

    expect(screen.getByRole('button', { name: /Species/i })).toBeDisabled()
    const select = screen.getByLabelText(/County/i) as HTMLSelectElement
    await waitFor(() => expect(select).not.toBeDisabled())

    fireEvent.change(select, { target: { value: 'Dublin' } })

    await waitFor(() => {
      expect(loadHabitatsForCountyMock).toHaveBeenCalledWith('Dublin', index)
    })

    expect(await screen.findByText(/2 sites found/i)).toBeInTheDocument()
    expect(screen.getByTestId('habitat-markers')).toHaveTextContent('2')
  })

  it('base map buttons update active class and TileLayer url', async () => {
    render(<App />)

    expect(screen.getByRole('button', { name: /Species/i })).toBeDisabled()
    const select = screen.getByLabelText(/County/i) as HTMLSelectElement
    await waitFor(() => expect(select).not.toBeDisabled())

    expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-url', 'sat-url')

    const streetBtn = screen.getByRole('button', { name: /Street/i })
    const satBtn = screen.getByRole('button', { name: /Satellite/i })
    const terrainBtn = screen.getByRole('button', { name: /Terrain/i })

    fireEvent.click(streetBtn)
    expect(streetBtn.className).toMatch(/active/)
    expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-url', 'street-url')
    expect(satBtn.className).not.toMatch(/active/)

    fireEvent.click(terrainBtn)
    expect(terrainBtn.className).toMatch(/active/)
    expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-url', 'terrain-url')
  })

  it('closes species dropdown on outside click', async () => {
    render(<App />)

    const select = screen.getByLabelText(/County/i) as HTMLSelectElement
    await waitFor(() => expect(select).not.toBeDisabled())

    fireEvent.click(screen.getByRole('button', { name: /Species/i }))
    expect(document.querySelector('.species-dropdown')).toHaveClass('open')

    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(document.querySelector('.species-dropdown')).not.toHaveClass('open')
    })
  })

  it('renders GeoJSON when zoom >= 11 and county selected, and binds popups', async () => {
    render(<App />)

    const select = screen.getByLabelText(/County/i) as HTMLSelectElement
    await waitFor(() => expect(select).not.toBeDisabled())

    fireEvent.change(select, { target: { value: 'Dublin' } })

    expect(await screen.findByTestId('geojson')).toBeInTheDocument()

    expect(geoJsonSpy).toHaveBeenCalled()

    await waitFor(() => {
      expect(onEachFeatureLayerBindPopupSpy).toHaveBeenCalledTimes(2)
    })

    expect(renderIntoPopupMock).toHaveBeenCalled()
  })
})
