import { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import {
  speciesInfo,
  titleLayers,
  POLYGON_PULSE_DELAY,
  DEFAULT_MAP_COORDS,
  type TileLayersMap, type HabitatFeature, type HabitatCollection, type MarkerClusterType
} from "./constants";
import {
  loadHabitatData,
  deriveStyleFeature,
} from "./utils";

import "leaflet/dist/leaflet.css";
import CountyZoomer from "./components/county_zoomer";
import ZoomTracker from "./components/zoom_tracker";
import DetailedPopupCard from "./components/detailed_popup_card";
import SpeciesFilter from "./components/species_filter";
import MapRefCapture from "./components/map_ref_capture";
import HabitatMarkers from "./components/habitat_markers";
import { useFlashPolygons } from './hooks/useFlashPolygons';

function App() {
  const [habitats, setHabitats] = useState<HabitatCollection | null>(null);
  const [counties, setCounties] = useState<string[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [currentZoom, setCurrentZoom] = useState<number>(8);
  const [shouldPulse, setShouldPulse] = useState<boolean>(false);

  const [baseLayer, setBaseLayer] = useState<keyof TileLayersMap>("satellite");
  const [panelPosition, setPanelPosition] = useState({ x: 50, y: 10 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });


  const prevZoomRef = useRef<number>(8);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonRef = useRef<L.GeoJSON>(null);

  const { flash, isFlashing } = useFlashPolygons(geoJsonRef)

  // Species filter state
  const [availableSpecies, setAvailableSpecies] = useState<string[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [speciesDropdownOpen, setSpeciesDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const {habitatsData, counties: countyList, availableSpecies: speciesList} = await loadHabitatData()
        setHabitats(habitatsData);
        setCounties(countyList);
        setAvailableSpecies(speciesList);
        setSelectedSpecies(speciesList);
      } catch (err) {
        console.error("Load failed:", err);
      }
    };
    
    loadData().catch((err) => {
      console.error("Failed to load habitat data:", err);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (!target.closest('.species-filter')) {
        setSpeciesDropdownOpen(false);
      }
    };

    if (speciesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [speciesDropdownOpen]);

  useEffect(() => {
    if (!selectedCounty || selectedCounty === "") {
      if (mapRef.current) {
        mapRef.current.setView([53.35, -7.5], 8);
      }
    }
  }, [selectedCounty]);

  useEffect(() => {
    const prev = prevZoomRef.current;

    if (prev < 11 && currentZoom >= 11) {
      console.log("Crossed into polygon view - triggering pulse");

      setTimeout(() => {
        setShouldPulse(true);

        setTimeout(() => {
          setShouldPulse(false);
        }, 2000);
      }, POLYGON_PULSE_DELAY);
    }

    prevZoomRef.current = currentZoom;
  }, [currentZoom]);

  const filteredHabitats = useMemo(() => {
    if (!habitats) return null;

    let filtered = habitats.features;

    if (!selectedCounty || selectedCounty === "") {
      return {
        ...habitats,
        features: [],
      };
    }

    if (selectedCounty !== "All") {
      filtered = filtered.filter((f) => {
        const county = f.properties.COUNTY;
        if (Array.isArray(county)) return county.includes(selectedCounty);
        return county === selectedCounty;
      });
    }

    if (
      selectedSpecies.length > 0 &&
      selectedSpecies.length < availableSpecies.length
    ) {
      filtered = filtered.filter((f) => {
        const genus = f.properties._genus;
        return genus && selectedSpecies.includes(genus);
      });
    }

    return {
      ...habitats,
      features: filtered,
    };
  }, [habitats, selectedCounty, selectedSpecies, availableSpecies]);

  const toggleSpecies = (genus: string) => {
    setSelectedSpecies((prev) => {
      if (prev.includes(genus) && prev.length === 1) {
        return prev;
      }

      return prev.includes(genus)
        ? prev.filter((s) => s !== genus)
        : [...prev, genus];
    });
  };

  const toggleAllSpecies = () => {
    if (selectedSpecies.length === availableSpecies.length) {
      setSelectedSpecies([availableSpecies[0]]);
    } else {
      setSelectedSpecies([...availableSpecies]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      e.preventDefault();
      e.stopPropagation();
      
      // Disable Leaflet dragging
      if (mapRef.current) {
        mapRef.current.dragging.disable();
      }
      
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - panelPosition.x,
        y: e.clientY - panelPosition.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      setPanelPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      // Re-enable Leaflet dragging
      if (mapRef.current) {
        mapRef.current.dragging.enable();
      }
    }
    setIsDragging(false);
  };
  const handlePanelMouseEnter = () => {
    if (mapRef.current) {
      mapRef.current.dragging.disable();
    }
  };

  const handlePanelMouseLeave = () => {
    if (mapRef.current && !isDragging) {
      mapRef.current.dragging.enable();
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);


  return (
    <>
      {!habitats && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">
            Converting coordinates...
          </div>
        </div>
      )}

      <MapContainer
        center={DEFAULT_MAP_COORDS}
        zoom={8}
        className="map-container"
        scrollWheelZoom={true}
      >
        <TileLayer
          url={titleLayers[baseLayer].url}
          attribution={titleLayers[baseLayer].attribution}
          key={baseLayer}
        />

          <div 
            className="map-controls-left leaflet-control"
            style={{ 
              left: `${panelPosition.x}px`, 
              top: `${panelPosition.y}px` 
            }}
          >
            <div 
              className="control-panel"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                if (!(e.target as HTMLElement).closest('.drag-handle')) {
                  e.stopPropagation();
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
                onChange={(e) => setSelectedCounty(e.target.value)}
              >
                <option value="">-- Select a County --</option>
                {counties.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {!selectedCounty || selectedCounty === "" ? (
              <div className="info-text">Select a county to view sites</div>
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
              />
            </div>

            <div className="control-section">
              <label>Base Map</label>
              <div className="layer-buttons">
                <button
                  className={`layer-btn ${baseLayer === 'street' ? 'active' : ''}`}
                  onClick={() => setBaseLayer('street')}
                >
                  Street
                </button>
                <button
                  className={`layer-btn ${baseLayer === 'satellite' ? 'active' : ''}`}
                  onClick={() => setBaseLayer('satellite')}
                >
                  Satellite
                </button>
                <button
                  className={`layer-btn ${baseLayer === 'terrain' ? 'active' : ''}`}
                  onClick={() => setBaseLayer('terrain')}
                >
                  Terrain
                </button>
              </div>
            </div>

            {selectedCounty &&
              selectedCounty !== "" &&
              currentZoom >= 11 &&
              (filteredHabitats?.features?.length ?? 0) > 0 && (
                <button
                  className="highlight-btn-full"
                  onClick={flash}
                  disabled={isFlashing}
                >
                  {isFlashing ? "Highlighting..." : "💡 Highlight All Sites"}
                </button>
              )}
          </div>
        </div>

        <MapRefCapture mapRef={mapRef} />
        <ZoomTracker setCurrentZoom={setCurrentZoom} />
        <CountyZoomer
          filteredHabitats={filteredHabitats}
          selectedCounty={selectedCounty}
        />

        <MarkerClusterGroup
          key={`cluster-${selectedSpecies.join(",")}`}
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          iconCreateFunction={(cluster: MarkerClusterType) => {
            const count = cluster.getChildCount();
            const size = count < 10 ? 34 : count < 100 ? 38 : 42;

            return L.divIcon({
              html: `
                <div class="cluster-bubble cluster-bubble--countonly" style="width:${size}px;height:${size}px">
                  <span class="cluster-count">${count}</span>
                </div>
              `,
              className: "custom-cluster",
              iconSize: [size, size],
            });
          }}
        >
          <HabitatMarkers
            filteredHabitats={filteredHabitats}
            currentZoom={currentZoom}
            selectedSpecies={selectedSpecies}
          />
        </MarkerClusterGroup>


        {currentZoom >= 11 && filteredHabitats && (
          <GeoJSON
            ref={geoJsonRef}
            key={`habitats-${selectedCounty}-${selectedSpecies.join(",")}-${
              shouldPulse ? "pulse" : "normal"
            }`}
            data={filteredHabitats}
            style={(feature) => deriveStyleFeature(shouldPulse, feature as HabitatFeature)}
            onEachFeature={(feature, layer) => {
              // Type guard to ensure it's a Path layer (has setStyle)
              if (!("setStyle" in layer)) return;
              
              const pathLayer = layer as L.Path;
              
              pathLayer.on({
                mouseover: () => {
                  pathLayer.setStyle({
                    weight: 3,
                    fillOpacity: 0.7,
                  });
                },
                mouseout: () => {
                  pathLayer.setStyle({
                    weight: 1.5,
                    fillOpacity: 0.5,
                  });
                },
              });

              const popupElement = document.createElement("div");
              const root = createRoot(popupElement);
              root.render(
                <DetailedPopupCard 
                  feature={feature as HabitatFeature} 
                  speciesInfo={speciesInfo} 
                />
              );

              pathLayer.bindPopup(popupElement);
            }}
          />
        )}
      </MapContainer>
    </>
  );
}

export default App;
