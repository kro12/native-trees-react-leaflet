import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { HabitatIndex } from '../utils'
import type { ReactNode } from 'react'

// Define proper types for mock components
interface MapContainerProps {
  children: ReactNode
  [key: string]: unknown
}

interface GeoJSONProps {
  data?: {
    features?: unknown[]
  }
  [key: string]: unknown
}

interface MarkerClusterProps {
  children: ReactNode
}

interface ControlPanelProps {
  isLoadingIndex: boolean
}

// Mock the utility functions - use factory function with vi.fn() inside
vi.mock('../utils', () => ({
  loadHabitatData: vi.fn(),
  deriveStyleFeature: vi.fn(() => ({
    fillColor: '#808080',
    weight: 1,
    opacity: 0.5,
  })),
}))

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }: MapContainerProps) => (
    <div data-testid="map-container" {...props}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  GeoJSON: ({ data }: GeoJSONProps) => (
    <div data-testid="geojson" data-features={data?.features?.length || 0} />
  ),
}))

// Mock react-leaflet-cluster
vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: MarkerClusterProps) => (
    <div data-testid="marker-cluster-group">{children}</div>
  ),
}))

// Mock child components
vi.mock('../components/county_zoomer', () => ({
  default: () => <div data-testid="county-zoomer" />,
}))

vi.mock('../components/zoom_tracker', () => ({
  default: () => <div data-testid="zoom-tracker" />,
}))

vi.mock('../components/detailed_popup_card', () => ({
  default: () => <div data-testid="detailed-popup-card" />,
}))

vi.mock('../components/map_ref_capture', () => ({
  default: () => <div data-testid="map-ref-capture" />,
}))

vi.mock('../components/habitat_markers', () => ({
  default: () => <div data-testid="habitat-markers" />,
}))

vi.mock('../components/control_panel', () => ({
  default: ({ isLoadingIndex }: ControlPanelProps) => (
    <div data-testid="control-panel">{isLoadingIndex && <span>Loading counties...</span>}</div>
  ),
}))

vi.mock('../components/context_menu', () => ({
  default: () => <div data-testid="context-menu" />,
}))

// Mock custom hooks
vi.mock('../hooks/useContextMenu', () => ({
  useContextMenu: () => ({
    menuPosition: null,
    handleContextMenu: vi.fn(),
    closeMenu: vi.fn(),
  }),
}))

vi.mock('../hooks/useControlPanelLogic', () => ({
  useControlPanelLogic: () => ({
    baseLayer: 'satellite',
    filteredHabitats: null,
    selectedCounty: '',
    setSelectedCounty: vi.fn(),
    isLoadingCounty: false,
    counties: [],
    selectedSpecies: [],
    availableSpecies: [],
    speciesDropdownOpen: false,
    setSpeciesDropdownOpen: vi.fn(),
    toggleAllSpecies: vi.fn(),
    toggleSpecies: vi.fn(),
    setBaseLayer: vi.fn(),
    flash: vi.fn(),
    isFlashing: false,
    handleMouseDown: vi.fn(),
    handlePanelMouseEnter: vi.fn(),
    handlePanelMouseLeave: vi.fn(),
    disabled: false,
    panelPosition: { x: 50, y: 10 },
  }),
}))

// Mock leaflet
vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn((options) => options),
  },
}))

// Import App AFTER all mocks
import App from '../App'
import { loadHabitatData } from '../utils'

describe('App Component', () => {
  const mockHabitatIndex: HabitatIndex = {
    counties: ['Cork', 'Dublin', 'Galway'],
    availableSpecies: ['Quercus', 'Fraxinus', 'Betula'],
    files: {
      Cork: '/data/habitats/cork.json',
      Dublin: '/data/habitats/dublin.json',
      Galway: '/data/habitats/galway.json',
    },
  }

  const mockHabitatData = {
    counties: ['Cork', 'Dublin', 'Galway'],
    availableSpecies: ['Quercus', 'Fraxinus', 'Betula'],
    index: mockHabitatIndex,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Cast the mocked function and set default implementation
    vi.mocked(loadHabitatData).mockResolvedValue(mockHabitatData)
  })

  describe('Initial Rendering', () => {
    it('should render the loading state initially', () => {
      // Override with never-resolving promise for this test
      vi.mocked(loadHabitatData).mockImplementation(() => new Promise(() => {}))

      render(<App />)

      expect(screen.getByText('Loading habitat index...')).toBeInTheDocument()
    })

    it('should render the map container', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument()
      })
    })

    it('should render all child components', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('control-panel')).toBeInTheDocument()
        expect(screen.getByTestId('zoom-tracker')).toBeInTheDocument()
        expect(screen.getByTestId('county-zoomer')).toBeInTheDocument()
        expect(screen.getByTestId('map-ref-capture')).toBeInTheDocument()
        expect(screen.getByTestId('marker-cluster-group')).toBeInTheDocument()
      })
    })
  })

  describe('Data Loading', () => {
    it('should call loadHabitatData on mount', async () => {
      render(<App />)

      await waitFor(() => {
        expect(loadHabitatData).toHaveBeenCalledTimes(1)
      })
    })

    it('should hide loading message after data loads successfully', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.queryByText('Loading habitat index...')).not.toBeInTheDocument()
      })
    })

    it('should handle loading errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(loadHabitatData).mockRejectedValue(new Error('Network error'))

      render(<App />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load habitat index:',
          expect.any(Error)
        )
      })

      consoleErrorSpy.mockRestore()
    })

    it('should set isLoadingIndex to false after loading completes', async () => {
      render(<App />)

      await waitFor(() => {
        const controlPanel = screen.getByTestId('control-panel')
        expect(controlPanel).not.toHaveTextContent('Loading counties...')
      })
    })

    it('should set isLoadingIndex to false even when loading fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(loadHabitatData).mockRejectedValue(new Error('Network error'))

      render(<App />)

      await waitFor(() => {
        expect(screen.queryByText('Loading habitat index...')).not.toBeInTheDocument()
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Component Rendering', () => {
    it('should not render GeoJSON when zoom is below 11', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.queryByTestId('geojson')).not.toBeInTheDocument()
      })
    })

    it('should render tile layer', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('tile-layer')).toBeInTheDocument()
      })
    })

    it('should render marker cluster group', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('marker-cluster-group')).toBeInTheDocument()
      })
    })

    it('should not render context menu when menuPosition is null', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty counties list', async () => {
      vi.mocked(loadHabitatData).mockResolvedValue({
        counties: [],
        availableSpecies: [],
        index: { ...mockHabitatIndex, counties: [] },
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('control-panel')).toBeInTheDocument()
      })
    })

    it('should handle empty habitat data', async () => {
      vi.mocked(loadHabitatData).mockResolvedValue({
        counties: [],
        availableSpecies: [],
        index: mockHabitatIndex,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument()
      })
    })
  })
})
