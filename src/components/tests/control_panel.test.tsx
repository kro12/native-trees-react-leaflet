import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ControlPanel from '../control_panel'
import type { useControlPanelLogic } from '../../hooks/useControlPanelLogic'

// Don't mock SpeciesFilter - use the real component
describe('ControlPanel Component', () => {
  const mockControlPanel: ReturnType<typeof useControlPanelLogic> = {
    panelPosition: { x: 50, y: 10 },
    disabled: false,
    handlePanelMouseEnter: vi.fn(),
    handlePanelMouseLeave: vi.fn(),
    handleMouseDown: vi.fn(),
    selectedCounty: '',
    setSelectedCounty: vi.fn(),
    isLoadingCounty: false,
    counties: ['Cork', 'Dublin', 'Galway', 'Kerry'],
    filteredHabitats: null,
    selectedSpecies: ['Quercus', 'Fraxinus'],
    availableSpecies: ['Quercus', 'Fraxinus', 'Betula'],
    speciesDropdownOpen: false,
    setSpeciesDropdownOpen: vi.fn(),
    toggleAllSpecies: vi.fn(),
    toggleSpecies: vi.fn(),
    baseLayer: 'satellite',
    setBaseLayer: vi.fn(),
    flash: vi.fn(),
    isFlashing: false,
    currentZoom: 8,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the control panel with title', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      expect(screen.getByText('Ancient Woodland Inventory 2010')).toBeInTheDocument()
    })

    it('should render county dropdown', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      expect(screen.getByText('County')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should render base layer buttons', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      expect(screen.getByText('Base Map')).toBeInTheDocument()
      expect(screen.getByText('Street')).toBeInTheDocument()
      expect(screen.getByText('Satellite')).toBeInTheDocument()
      expect(screen.getByText('Terrain')).toBeInTheDocument()
    })

    it('should render species filter component', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      // Check for species filter by text content
      expect(screen.getByText(/Species \(/)).toBeInTheDocument()
    })
  })

  describe('County Selection', () => {
    it('should show default placeholder when no county selected', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      expect(screen.getByText('-- Select a County --')).toBeInTheDocument()
    })

    it('should show loading placeholder when loading index', () => {
      render(<ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={true} />)

      expect(screen.getByText('-- Loading counties... --')).toBeInTheDocument()
    })

    it('should call setSelectedCounty when county is selected', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'Cork' } })

      expect(mockControlPanel.setSelectedCounty).toHaveBeenCalledWith('Cork')
    })

    it('should show "Select a county" message when no county selected', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      expect(
        screen.getByText('Select option/click County bounds to view sites')
      ).toBeInTheDocument()
    })

    it('should show loading message when loading county data', () => {
      const loadingPanel = {
        ...mockControlPanel,
        selectedCounty: 'Cork',
        isLoadingCounty: true,
      }

      render(<ControlPanel controlPanel={loadingPanel} currentZoom={8} isLoadingIndex={false} />)

      expect(screen.getByText('Loading sites…')).toBeInTheDocument()
    })

    it('should show site count when habitats are loaded', () => {
      const panelWithHabitats = {
        ...mockControlPanel,
        selectedCounty: 'Cork',
        filteredHabitats: {
          type: 'FeatureCollection' as const,
          features: Array(5).fill({}),
        },
      }

      render(
        <ControlPanel controlPanel={panelWithHabitats} currentZoom={8} isLoadingIndex={false} />
      )

      expect(screen.getByText('5 sites found')).toBeInTheDocument()
    })

    it('should show 0 sites when filteredHabitats is null', () => {
      const panelWithNull = {
        ...mockControlPanel,
        selectedCounty: 'Cork',
        filteredHabitats: null,
      }

      render(<ControlPanel controlPanel={panelWithNull} currentZoom={8} isLoadingIndex={false} />)

      // When null, it shows 0 sites found (based on the actual component behavior)
      expect(screen.getByText('0 sites found')).toBeInTheDocument()
    })
  })

  describe('Base Layer Selection', () => {
    it('should have satellite layer selected by default', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      const satelliteButton = screen.getByText('Satellite')
      expect(satelliteButton).toHaveClass('active')
    })

    it('should call setBaseLayer with "street" when street is clicked', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      const streetButton = screen.getByText('Street')
      fireEvent.click(streetButton)

      expect(mockControlPanel.setBaseLayer).toHaveBeenCalledWith('street')
    })

    it('should call setBaseLayer with "terrain" when terrain is clicked', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      const terrainButton = screen.getByText('Terrain')
      fireEvent.click(terrainButton)

      expect(mockControlPanel.setBaseLayer).toHaveBeenCalledWith('terrain')
    })

    it('should disable base layer buttons when panel is disabled', () => {
      const disabledPanel = {
        ...mockControlPanel,
        disabled: true,
      }

      render(<ControlPanel controlPanel={disabledPanel} currentZoom={8} isLoadingIndex={false} />)

      expect(screen.getByText('Street').closest('button')).toBeDisabled()
      expect(screen.getByText('Satellite').closest('button')).toBeDisabled()
      expect(screen.getByText('Terrain').closest('button')).toBeDisabled()
    })
  })

  describe('Highlight Button', () => {
    it('should not show highlight button when no county selected', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      expect(screen.queryByText(/Highlight All Sites/)).not.toBeInTheDocument()
    })

    it('should not show highlight button when zoom is below 11', () => {
      const panelWithHabitats = {
        ...mockControlPanel,
        selectedCounty: 'Cork',
        filteredHabitats: {
          type: 'FeatureCollection' as const,
          features: Array(5).fill({}),
        },
      }

      render(
        <ControlPanel controlPanel={panelWithHabitats} currentZoom={10} isLoadingIndex={false} />
      )

      expect(screen.queryByText(/Highlight All Sites/)).not.toBeInTheDocument()
    })

    it('should show highlight button when conditions are met', () => {
      const panelWithHabitats = {
        ...mockControlPanel,
        selectedCounty: 'Cork',
        filteredHabitats: {
          type: 'FeatureCollection' as const,
          features: Array(5).fill({}),
        },
      }

      render(
        <ControlPanel controlPanel={panelWithHabitats} currentZoom={11} isLoadingIndex={false} />
      )

      expect(screen.getByText('💡 Highlight All Sites')).toBeInTheDocument()
    })

    it('should call flash when highlight button is clicked', () => {
      const panelWithHabitats = {
        ...mockControlPanel,
        selectedCounty: 'Cork',
        filteredHabitats: {
          type: 'FeatureCollection' as const,
          features: Array(5).fill({}),
        },
      }

      render(
        <ControlPanel controlPanel={panelWithHabitats} currentZoom={11} isLoadingIndex={false} />
      )

      const highlightButton = screen.getByText('💡 Highlight All Sites')
      fireEvent.click(highlightButton)

      expect(mockControlPanel.flash).toHaveBeenCalled()
    })

    it('should show "Highlighting..." when flashing', () => {
      const panelFlashing = {
        ...mockControlPanel,
        selectedCounty: 'Cork',
        isFlashing: true,
        filteredHabitats: {
          type: 'FeatureCollection' as const,
          features: Array(5).fill({}),
        },
      }

      render(<ControlPanel controlPanel={panelFlashing} currentZoom={11} isLoadingIndex={false} />)

      expect(screen.getByText('Highlighting...')).toBeInTheDocument()
    })
  })

  describe('Panel Interactions', () => {
    it('should call handlePanelMouseEnter on mouse enter', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      // The handlers are on the div with className="control-panel"
      const panel = document.querySelector('.control-panel') as HTMLElement

      fireEvent.mouseEnter(panel)
      expect(mockControlPanel.handlePanelMouseEnter).toHaveBeenCalled()
    })

    it('should call handlePanelMouseLeave on mouse leave', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      // The handlers are on the div with className="control-panel"
      const panel = document.querySelector('.control-panel') as HTMLElement

      fireEvent.mouseLeave(panel)
      expect(mockControlPanel.handlePanelMouseLeave).toHaveBeenCalled()
    })

    it('should have correct panel position styles', () => {
      const panelWithPosition = {
        ...mockControlPanel,
        panelPosition: { x: 100, y: 200 },
      }

      render(
        <ControlPanel controlPanel={panelWithPosition} currentZoom={8} isLoadingIndex={false} />
      )

      // The position styles are on the outer div with className="map-controls-left"
      const panel = document.querySelector('.map-controls-left') as HTMLElement
      expect(panel).toHaveStyle({ top: '200px', left: '100px' })
    })
  })

  describe('Species Filter Integration', () => {
    it('should render species filter with correct count', () => {
      render(
        <ControlPanel controlPanel={mockControlPanel} currentZoom={8} isLoadingIndex={false} />
      )

      // The actual component shows "Species (2/3) ▾"
      expect(screen.getByText(/Species \(2\/3\)/)).toBeInTheDocument()
    })

    it('should disable species filter when panel is disabled', () => {
      const disabledPanel = {
        ...mockControlPanel,
        disabled: true,
      }

      render(<ControlPanel controlPanel={disabledPanel} currentZoom={8} isLoadingIndex={false} />)

      const speciesButton = screen.getByText(/Species \(/).closest('button')
      expect(speciesButton).toBeDisabled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty county list', () => {
      const panelWithNoCounties = {
        ...mockControlPanel,
        counties: [],
      }

      render(
        <ControlPanel controlPanel={panelWithNoCounties} currentZoom={8} isLoadingIndex={false} />
      )

      const select = screen.getByRole('combobox')
      const options = select.querySelectorAll('option')
      // Should only have the placeholder option
      expect(options.length).toBe(1)
    })

    it('should handle empty species list', () => {
      const panelWithNoSpecies = {
        ...mockControlPanel,
        availableSpecies: [],
        selectedSpecies: [],
      }

      render(
        <ControlPanel controlPanel={panelWithNoSpecies} currentZoom={8} isLoadingIndex={false} />
      )

      // Check that species filter shows 0/0
      expect(screen.getByText(/Species \(0\/0\)/)).toBeInTheDocument()
    })
  })
})
