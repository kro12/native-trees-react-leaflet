import { useState, useRef, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import {
  speciesInfo,
  titleLayers,
  POLYGON_PULSE_DELAY,
  DEFAULT_MAP_COORDS,
  type HabitatFeature,
  type MarkerClusterType,
} from './constants'
import { deriveStyleFeature, loadHabitatData, type HabitatIndex } from './utils'
import 'leaflet/dist/leaflet.css'
import CountyZoomer from './components/county_zoomer'
import ZoomTracker from './components/zoom_tracker'
import DetailedPopupCard from './components/detailed_popup_card'
import MapRefCapture from './components/map_ref_capture'
import HabitatMarkers from './components/habitat_markers'
import ControlPanel from './components/control_panel'
import { useContextMenu } from './hooks/useContextMenu'
import ContextMenu from './components/context_menu'
import { useControlPanelLogic } from './hooks/useControlPanelLogic'

function App() {
  const [habitatIndex, setHabitatIndex] = useState<HabitatIndex | null>(null)
  const [counties, setCounties] = useState<string[]>([])
  const [availableSpecies, setAvailableSpecies] = useState<string[]>([])
  const [isLoadingIndex, setIsLoadingIndex] = useState(true)
  const [currentZoom, setCurrentZoom] = useState(8)
  const [shouldPulse, setShouldPulse] = useState(false)
  const prevZoomRef = useRef(8)
  const mapRef = useRef<L.Map | null>(null)
  const geoJsonRef = useRef<L.GeoJSON | null>(null)

  const { menuPosition, handleContextMenu, closeMenu } = useContextMenu()

  // All control panel logic in one hook
  const controlPanel = useControlPanelLogic({
    mapRef,
    currentZoom,
    geoJsonRef,
    habitatIndex,
    counties,
    availableSpecies,
    isLoadingIndex,
  })

  // Pulse effect when crossing zoom threshold
  useEffect(() => {
    const prev = prevZoomRef.current
    if (prev < 11 && currentZoom >= 11) {
      console.log('Crossed into polygon view - triggering pulse')
      setTimeout(() => {
        setShouldPulse(true)
        setTimeout(() => {
          setShouldPulse(false)
        }, 2000)
      }, POLYGON_PULSE_DELAY)
    }

    prevZoomRef.current = currentZoom
  }, [currentZoom])

  // Load habitat index on mount (app-level concern)
  useEffect(() => {
    const loadIndex = async () => {
      try {
        const {
          counties: countyList,
          availableSpecies: speciesList,
          index,
        } = await loadHabitatData()

        setHabitatIndex(index)
        setCounties(countyList)
        setAvailableSpecies(speciesList)
      } catch (err) {
        console.error('Failed to load habitat index:', err)
      } finally {
        setIsLoadingIndex(false)
      }
    }
    void loadIndex()
  }, [])

  // Type-safe access to tile layer
  const currentTileLayer = titleLayers[controlPanel.baseLayer as keyof typeof titleLayers]

  return (
    <>
      {isLoadingIndex && <div className="loading-overlay">Loading habitat index...</div>}

      <ControlPanel
        controlPanel={controlPanel}
        currentZoom={currentZoom}
        isLoadingIndex={isLoadingIndex}
      />

      <MapContainer
        center={DEFAULT_MAP_COORDS}
        zoom={8}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        zoomControl={true}
      >
        <MapRefCapture mapRef={mapRef} />
        <ZoomTracker setCurrentZoom={setCurrentZoom} />
        <CountyZoomer
          selectedCounty={controlPanel.selectedCounty}
          filteredHabitats={controlPanel.filteredHabitats}
        />

        <TileLayer attribution={currentTileLayer.attribution} url={currentTileLayer.url} />

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={50}
          iconCreateFunction={(cluster: MarkerClusterType) => {
            const count = cluster.getChildCount()
            const size = count < 10 ? 34 : count < 100 ? 38 : 42
            return L.divIcon({
              html: `
        <div class="cluster-bubble" style="width: ${size}px; height: ${size}px;">
          <span class="cluster-count">${count}</span>
        </div>
      `,
              className: 'custom-cluster',
              iconSize: [size, size],
            })
          }}
        >
          <HabitatMarkers
            filteredHabitats={controlPanel.filteredHabitats}
            currentZoom={currentZoom}
            selectedSpecies={controlPanel.selectedSpecies}
          />
        </MarkerClusterGroup>

        {currentZoom >= 11 && controlPanel.filteredHabitats && (
          <GeoJSON
            ref={geoJsonRef}
            data={controlPanel.filteredHabitats}
            style={(feature) => deriveStyleFeature(shouldPulse, feature as HabitatFeature)}
            onEachFeature={(feature, layer) => {
              if (!('setStyle' in layer)) return
              const pathLayer = layer as L.Path

              pathLayer.on({
                mouseover: () => {
                  pathLayer.setStyle({
                    weight: 3,
                    fillOpacity: 0.7,
                  })
                },
                mouseout: () => {
                  pathLayer.setStyle({
                    weight: 1.5,
                    fillOpacity: 0.5,
                  })
                },
              })

              const popupElement = document.createElement('div')
              const root = createRoot(popupElement)
              root.render(
                <DetailedPopupCard feature={feature as HabitatFeature} speciesInfo={speciesInfo} />
              )

              pathLayer.bindPopup(popupElement)

              layer.on({
                contextmenu: handleContextMenu,
              })
            }}
          />
        )}

        {menuPosition && (
          <ContextMenu
            x={menuPosition.x}
            y={menuPosition.y}
            lat={menuPosition.lat}
            lng={menuPosition.lng}
            onClose={closeMenu}
          />
        )}
      </MapContainer>
    </>
  )
}

export default App
