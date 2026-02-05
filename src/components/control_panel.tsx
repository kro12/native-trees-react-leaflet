import SpeciesFilter from './species_filter'

import type { useControlPanelLogic } from '../hooks/useControlPanelLogic'

interface Props {
  controlPanel: ReturnType<typeof useControlPanelLogic>
  currentZoom: number
  isLoadingIndex: boolean
}

const ControlPanel = ({ controlPanel, currentZoom, isLoadingIndex }: Props) => {
  const {
    panelPosition,
    disabled,
    handlePanelMouseEnter,
    handlePanelMouseLeave,
    handleMouseDown,
    selectedCounty,
    setSelectedCounty,

    isLoadingCounty,
    counties,
    filteredHabitats,
    selectedSpecies,
    availableSpecies,
    speciesDropdownOpen,
    setSpeciesDropdownOpen,
    toggleAllSpecies,
    toggleSpecies,
    baseLayer,
    setBaseLayer,
    flash,
    isFlashing,
  } = controlPanel
  return (
    <div
      className="map-controls-left leaflet-control"
      style={{
        left: `${panelPosition.x}px`,
        top: `${panelPosition.y}px`,
      }}
    >
      <div
        className="control-panel"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          if (!(e.target as HTMLElement).closest('.drag-handle')) {
            e.stopPropagation()
          }
        }}
        onMouseEnter={handlePanelMouseEnter}
        onMouseLeave={handlePanelMouseLeave}
      >
        <div
          className="drag-handle leaflet-drag-target"
          onMouseDown={handleMouseDown}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <div className="drag-dots"></div>
          <h3 className="panel-title">Ancient Woodland Inventory 2010</h3>
        </div>

        <div className="control-section">
          <label htmlFor="county-select">County</label>
          <select
            id="county-select"
            value={selectedCounty}
            disabled={disabled}
            onChange={(e) => {
              console.log('County selected:', e.target.value)
              setSelectedCounty(e.target.value)
            }}
          >
            <option value="">
              {isLoadingIndex ? '-- Loading counties... --' : '-- Select a County --'}
            </option>
            {counties.map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {!selectedCounty || selectedCounty === '' ? (
          <div className="info-text">Select option/click County bounds to view sites</div>
        ) : isLoadingCounty ? (
          <div className="info-text">Loading sites…</div>
        ) : (
          <div className="site-count-badge">
            {filteredHabitats?.features?.length ?? 0} sites found
          </div>
        )}

        <div className="control-section">
          <SpeciesFilter
            selectedSpecies={selectedSpecies}
            availableSpecies={availableSpecies}
            speciesDropdownOpen={speciesDropdownOpen}
            setSpeciesDropdownOpen={setSpeciesDropdownOpen}
            toggleAllSpecies={toggleAllSpecies}
            toggleSpecies={toggleSpecies}
            disabled={disabled}
          />
        </div>

        <div className="control-section">
          <label>Base Map</label>
          <div className="layer-buttons">
            <button
              className={`layer-btn ${baseLayer === 'street' ? 'active' : ''}`}
              onClick={() => setBaseLayer('street')}
              disabled={disabled}
            >
              Street
            </button>
            <button
              className={`layer-btn ${baseLayer === 'satellite' ? 'active' : ''}`}
              onClick={() => setBaseLayer('satellite')}
              disabled={disabled}
            >
              Satellite
            </button>
            <button
              className={`layer-btn ${baseLayer === 'terrain' ? 'active' : ''}`}
              onClick={() => setBaseLayer('terrain')}
              disabled={disabled}
            >
              Terrain
            </button>
          </div>
        </div>

        {selectedCounty &&
          selectedCounty !== '' &&
          currentZoom >= 11 &&
          (filteredHabitats?.features?.length ?? 0) > 0 && (
            <button
              className="highlight-btn-full"
              onClick={flash}
              disabled={disabled || isFlashing}
            >
              {isFlashing ? 'Highlighting...' : '💡 Highlight All Sites'}
            </button>
          )}
      </div>
    </div>
  )
}

export default ControlPanel
