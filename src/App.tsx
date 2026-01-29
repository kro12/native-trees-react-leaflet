import { useState, useEffect, useMemo, useRef, type JSX } from "react";
import { createRoot } from "react-dom/client";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import {
  speciesInfo,
  POLYGON_PULSE_DELAY,
  titleLayers,
  type TileLayersMap, type HabitatFeature, type HabitatCollection,
} from "./constants";
import {
  cleanTreeSpecies,
  deriveCounties,
  reprojectFeature,
  getCentroid,
  getColorForSpecies,
  getDarkerShade,
  getGenusFromSpecies,
} from "./utils";
import "leaflet/dist/leaflet.css";
import CountyZoomer from "./components/county_zoomer";
import ZoomTracker from "./components/zoom_tracker";
import DetailedPopupCard from "./components/detailed_popup_card";
import SpeciesFilter from "./components/species_filter";
import MapRefCapture from "./components/map_ref_capture";

function App() {
  const [habitats, setHabitats] = useState<HabitatCollection | null>(null);
  const [counties, setCounties] = useState<string[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [currentZoom, setCurrentZoom] = useState<number>(8);
  const [shouldPulse, setShouldPulse] = useState<boolean>(false);
  const [isFlashing, _] = useState(false);
  const [baseLayer, setBaseLayer] = useState<keyof TileLayersMap>("satellite");
  const [panelPosition, setPanelPosition] = useState({ x: 10, y: 10 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });


  const prevZoomRef = useRef<number>(8);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  // Species filter state
  const [availableSpecies, setAvailableSpecies] = useState<string[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [speciesDropdownOpen, setSpeciesDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const habitatsRes = await fetch("/data/NSNW_Woodland_Habitats_2010.json");
        if (!habitatsRes.ok) throw new Error(`Habitats: ${habitatsRes.status}`);

        const habitatsData: HabitatCollection = await habitatsRes.json();
        console.log("Loaded:", habitatsData.features?.length, "polygons");

        console.log("Converting ITM → WGS84...");
        habitatsData.features = habitatsData.features.map(reprojectFeature) as HabitatFeature[];

        habitatsData.features?.forEach((f) => {
          const raw = f.properties.NS_SPECIES || f.properties.NSNW_DESC || "";
          f.properties.cleanedSpecies = cleanTreeSpecies([raw])[0] || "Unknown";
          f.properties._centroid = getCentroid(f.geometry.coordinates);
          f.properties._genus = getGenusFromSpecies(
            f.properties.cleanedSpecies
          );
        });

        const speciesCounts: Record<string, number> = {};
        habitatsData.features.forEach((f) => {
          const sp = f.properties.cleanedSpecies;
          speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;
        });
        console.log("Species distribution:", speciesCounts);

        const genera = new Set<string>();
        habitatsData.features.forEach((f) => {
          const genus = f.properties._genus;
          if (genus) genera.add(genus);
        });

        const speciesList = Array.from(genera).sort();
        setAvailableSpecies(speciesList);
        setSelectedSpecies(speciesList);

        setHabitats(habitatsData);
        const allCounties = deriveCounties(habitatsData);
        setCounties(["All", ...allCounties]);
      } catch (err) {
        console.error("Load failed:", err);
      }
    };
    loadData();
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

  const flashPolygons = () => {
    const gj = geoJsonRef.current;
    if (!gj) return;

    const flashes = 3;
    const onMs = 250;
    const offMs = 200;

    const originals = new Map<L.Layer, L.PathOptions>();

    gj.eachLayer((layer) => {
      if ("setStyle" in layer) {
        const path = layer as L.Path;
        originals.set(layer, { ...(path.options as L.PathOptions) });
      }
    });

    let i = 0;

    const flashOn = () => {
      gj.eachLayer((layer) => {
        if ("setStyle" in layer) {
          (layer as L.Path).setStyle({
            weight: 5,
            opacity: 1,
            fillOpacity: 0.75,
            color: "#ffffff",
          });
          (layer as any).bringToFront?.();
        }
      });
    };

    const flashOff = () => {
      gj.eachLayer((layer) => {
        if ("setStyle" in layer) {
          const original = originals.get(layer);
          if (original) (layer as L.Path).setStyle(original);
        }
      });
    };

    const run = () => {
      if (i >= flashes) {
        flashOff();
        return;
      }
      flashOn();
      window.setTimeout(() => {
        flashOff();
        i += 1;
        window.setTimeout(run, offMs);
      }, onMs);
    };

    run();
  };

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

  const styleFeature = (feature?: HabitatFeature): L.PathOptions => {
    if (!feature) return { fillColor: "#808080", weight: 1, opacity: 0.5 };

    const species = feature.properties.cleanedSpecies || "Unknown";
    const color = getColorForSpecies(species);
    const borderColor = getDarkerShade(color);

    return {
      fillColor: color,
      weight: 1.5,
      opacity: 0.9,
      color: borderColor,
      fillOpacity: 0.5,
      className: shouldPulse ? "pulse-polygon" : "",
    };
  };

  const clusterMarkers = useMemo<JSX.Element[] | null>(() => {
    if (!filteredHabitats || currentZoom >= 11) return null;

    return filteredHabitats.features.map((feature, idx) => {
      const centroid = feature.properties._centroid;
      const color = getColorForSpecies(
        feature.properties.cleanedSpecies || "Unknown"
      );

      return (
        <CircleMarker
          key={`marker-${
            feature.properties.SITE_NAME || idx
          }-${selectedSpecies.join(",")}`}
          center={centroid as [number, number]}
          radius={6}
          fillColor={color}
          color="#000"
          weight={1}
          fillOpacity={0.8}
        >
          <Popup>
            <DetailedPopupCard feature={feature} speciesInfo={speciesInfo} />
          </Popup>
        </CircleMarker>
      );
    });
  }, [filteredHabitats, currentZoom, selectedSpecies]);

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
        center={[53.35, -7.5]}
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
                {filteredHabitats?.features?.length || 0} sites found
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
              (filteredHabitats?.features?.length || 0) > 0 && (
                <button
                  className="highlight-btn-full"
                  onClick={flashPolygons}
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

        {currentZoom < 11 && clusterMarkers && (
          <MarkerClusterGroup
            key={`cluster-${selectedSpecies.join(",")}`}
            chunkedLoading
            maxClusterRadius={50}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            iconCreateFunction={(cluster: any) => {
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
            {clusterMarkers}
          </MarkerClusterGroup>
        )}

        {currentZoom >= 11 && filteredHabitats && (
          <GeoJSON
            ref={geoJsonRef}
            key={`habitats-${selectedCounty}-${selectedSpecies.join(",")}-${
              shouldPulse ? "pulse" : "normal"
            }`}
            data={filteredHabitats}
            style={styleFeature}
            onEachFeature={(feature, layer) => {
              layer.on({
                mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle({
                    weight: 3,
                    fillOpacity: 0.7,
                  });
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle({
                    weight: 1.5,
                    fillOpacity: 0.5,
                  });
                },
              });

              const popupElement = document.createElement("div");
              const root = createRoot(popupElement);
              root.render(
                <DetailedPopupCard
                  feature={feature}
                  speciesInfo={speciesInfo}
                />
              );

              layer.bindPopup(popupElement);
            }}
          />
        )}
      </MapContainer>
    </>
  );
}

export default App;
