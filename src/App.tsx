
import { useState, useEffect, useMemo, useRef, type JSX } from "react";
import type { Feature, FeatureCollection, Position } from "geojson";
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
import { speciesInfo, POLYGON_PULSE_DELAY } from "./constants";
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
import './App.css'

// Define the shape of habitat properties
type HabitatProperties = {
  NS_SPECIES?: string;
  NSNW_DESC?: string;
  COUNTY: string | string[];
  SITE_NAME?: string;
  AREA: number;
  cleanedSpecies: string;
  _centroid: Position;
  _genus: string | null;
};

// Define the habitat feature type
type HabitatFeature = Feature<any, HabitatProperties>;

// Define the habitat collection type
type HabitatCollection = FeatureCollection<any, HabitatProperties>;


function App() {
 const [habitats, setHabitats] = useState<HabitatCollection | null>(null);
  const [counties, setCounties] = useState<string[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [currentZoom, setCurrentZoom] = useState<number>(8);
  const [shouldPulse, setShouldPulse] = useState<boolean>(false);
  const prevZoomRef = useRef<number>(8);
  const mapRef = useRef<L.Map | null>(null)

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
        // alternative syntax: const habitatsData = await habitatsRes.json() as HabitatCollection;
        console.log("Loaded:", habitatsData.features?.length, "polygons");

        console.log("Converting ITM → WGS84...");
        habitatsData.features = habitatsData.features.map(reprojectFeature) as HabitatFeature[];

        habitatsData.features?.forEach((f) => {
          const raw = f.properties.NS_SPECIES || f.properties.NSNW_DESC || "";
          f.properties.cleanedSpecies = cleanTreeSpecies([raw])[0] || "Unknown";
          f.properties._centroid = getCentroid(f.geometry.coordinates);
          f.properties._genus = getGenusFromSpecies(
            f.properties.cleanedSpecies
          ); // Store genus
        });

        // Get unique species with counts
        // Quercus: 45, Betula: 32, etc.
        const speciesCounts: Record<string, number> = {};
        habitatsData.features.forEach((f) => {
          const sp = f.properties.cleanedSpecies;
          speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;
        });
        console.log("Species distribution:", speciesCounts);

        // Extract unique genera for filter (exclude Unknown/null)
        const genera = new Set<string>();
        habitatsData.features.forEach((f) => {
          const genus = f.properties._genus;
          if (genus) genera.add(genus);
        });

        const speciesList = Array.from(genera).sort();
        setAvailableSpecies(speciesList);
        setSelectedSpecies(speciesList); // All selected by default

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
      
      // Check if click is outside the species filter dropdown
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
      // Reset to full Ireland view
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

  // Filter by county - REQUIRE selection
  if (!selectedCounty || selectedCounty === "") {
    return {
      ...habitats,
      features: [], // Return empty if no county selected
    };
  }

  if (selectedCounty !== "All") {
    filtered = filtered.filter((f) => {
      const county = f.properties.COUNTY;
      if (Array.isArray(county)) return county.includes(selectedCounty);
      return county === selectedCounty;
    });
  }

  // Filter by species using stored genus
  if (
    selectedSpecies.length > 0 &&
    selectedSpecies.length < availableSpecies.length
  ) {
    filtered = filtered.filter((f) => {
      const genus = f.properties._genus;
      return genus && selectedSpecies.includes(genus);
    });
  }

  console.log(
    "🔍 Filtered to:",
    filtered.length,
    "sites. Selected:",
    selectedSpecies
  );

  return {
    ...habitats,
    features: filtered,
  };
}, [habitats, selectedCounty, selectedSpecies, availableSpecies]);


  // const filteredHabitats = useMemo(() => {
  //   if (!habitats) return null;

  //   let filtered = habitats.features;

  //   // Filter by county
  //   if (selectedCounty !== "All") {
  //     filtered = filtered.filter((f) => {
  //       const county = f.properties.COUNTY;
  //       if (Array.isArray(county)) return county.includes(selectedCounty);
  //       return county === selectedCounty;
  //     });
  //   }

  //   // Filter by species using stored genus
  //   if (
  //     selectedSpecies.length > 0 &&
  //     selectedSpecies.length < availableSpecies.length
  //   ) {
  //     filtered = filtered.filter((f) => {
  //       const genus = f.properties._genus;
  //       return genus && selectedSpecies.includes(genus);
  //     });
  //   }

  //   return {
  //     ...habitats,
  //     features: filtered,
  //   };
  // }, [habitats, selectedCounty, selectedSpecies, availableSpecies]);

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
      // Prevent unchecking the last species
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
      // Keep first one selected instead of going to zero
      setSelectedSpecies([availableSpecies[0]]);
    } else {
      setSelectedSpecies([...availableSpecies]);
    }
  };

  if (!habitats) {
    return (
      <div style={{ padding: "20px", fontSize: "18px" }}>
        Converting coordinates...
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ 
        padding: "10px", 
        background: "#f0f0f0", 
        zIndex: 1000,
        position: "relative"
      }}>
        <label>County: </label>
        <select
          value={selectedCounty}
          onChange={(e) => setSelectedCounty(e.target.value)}
          style={{ marginRight: "20px", padding: "5px" }}
        >
          <option value="">-- Select a County --</option>
          {counties.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <span
          style={{ marginLeft: "10px", fontSize: "12px", fontWeight: "bold" }}
        >
          {!selectedCounty || selectedCounty === "" 
            ? "← Select a county to view sites"
            : `${filteredHabitats?.features?.length || 0} sites`
          }
        </span>


        {/* Species filter dropdown */}
        <SpeciesFilter
          selectedSpecies={selectedSpecies}
          availableSpecies={availableSpecies}
          speciesDropdownOpen={speciesDropdownOpen}
          setSpeciesDropdownOpen={setSpeciesDropdownOpen}
          toggleAllSpecies={toggleAllSpecies}
          toggleSpecies={toggleSpecies}
        />

        <span
          style={{ marginLeft: "10px", fontSize: "12px", fontWeight: "bold" }}
        >
          {filteredHabitats?.features?.length || 0} sites
        </span>
      </div>

      <MapContainer
        center={[53.35, -7.5]}
        zoom={8}
        style={{ flex: 1 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
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
              const size = 30 + Math.min(count / 10, 20);
              return L.divIcon({
                html: `<div style="
                  background: #228B22;
                  color: white;
                  border-radius: 50%;
                  width: ${size}px;
                  height: ${size}px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: ${count > 99 ? "11px" : "13px"};
                  border: 2px solid white;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                ">${count}</div>`,
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
    </div>
  );
}


export default App