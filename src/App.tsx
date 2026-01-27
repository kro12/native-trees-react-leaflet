
import React, { useState, useEffect, useMemo, useRef, type JSX } from "react";
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
import { treeColors, genusDisplayNames, speciesInfo, type TreeGenus } from "./constants";
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

// 1️⃣ Define the shape of habitat properties
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

// 2️⃣ Define the habitat feature type
type HabitatFeature = Feature<any, HabitatProperties>;

// 3️⃣ Define the habitat collection type
type HabitatCollection = FeatureCollection<any, HabitatProperties>;


function App() {
 const [habitats, setHabitats] = useState<HabitatCollection | null>(null);
  const [counties, setCounties] = useState<string[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<string>("All");
  const [currentZoom, setCurrentZoom] = useState<number>(8);
  const [shouldPulse, setShouldPulse] = useState<boolean>(false);
  const prevZoomRef = useRef<number>(8);

  // Species filter state
  const [availableSpecies, setAvailableSpecies] = useState<string[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [speciesDropdownOpen, setSpeciesDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const habitatsRes = await fetch("/NSNW_Woodland_Habitats_2010.json");
        if (!habitatsRes.ok) throw new Error(`Habitats: ${habitatsRes.status}`);

        const habitatsData: HabitatCollection = await habitatsRes.json();
        // alternative syntax: const habitatsData = await habitatsRes.json() as HabitatCollection;
        console.log("✅ Loaded:", habitatsData.features?.length, "polygons");

        console.log("🔄 Converting ITM → WGS84...");
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
        console.log("🌳 Species distribution:", speciesCounts);

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
        console.error("❌ Load failed:", err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const prev = prevZoomRef.current;

    if (prev < 11 && currentZoom >= 11) {
      console.log("🎯 Crossed into polygon view - triggering pulse");

      setTimeout(() => {
        setShouldPulse(true);

        setTimeout(() => {
          setShouldPulse(false);
        }, 2000);
      }, 500);
    }

    prevZoomRef.current = currentZoom;
  }, [currentZoom]);

  const filteredHabitats = useMemo(() => {
    if (!habitats) return null;

    let filtered = habitats.features;

    // Filter by county
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
          center={[centroid[1], centroid[0]]}
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

  const toggleSpecies = (genus: TreeGenus) => {
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
      <div style={{ padding: "10px", background: "#f0f0f0", zIndex: 1000 }}>
        <label>County: </label>
        <select
          value={selectedCounty}
          onChange={(e) => setSelectedCounty(e.target.value)}
          style={{ marginRight: "20px", padding: "5px" }}
        >
          {counties.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Species filter dropdown */}
        <div className="species-filter">
          <button
            onClick={() => setSpeciesDropdownOpen(!speciesDropdownOpen)}
            style={{ padding: "5px 10px", cursor: "pointer" }}
          >
            Species ({selectedSpecies.length}/{availableSpecies.length}) ▾
          </button>
          <div
            className={`species-dropdown ${speciesDropdownOpen ? "open" : ""}`}
          >
            <label
              className="species-checkbox"
              style={{
                fontWeight: "bold",
                borderBottom: "1px solid #ccc",
                paddingBottom: "5px",
              }}
            >
              <input
                type="checkbox"
                checked={selectedSpecies.length === availableSpecies.length}
                onChange={toggleAllSpecies}
              />
              Select All
            </label>
            {availableSpecies.map((genus) => (
              <label key={genus} className="species-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSpecies.includes(genus)}
                  onChange={() => toggleSpecies(genus as TreeGenus)}
                />
                <span
                  style={{
                    display: "inline-block",
                    width: "12px",
                    height: "12px",
                    backgroundColor: treeColors[genus],
                    marginRight: "5px",
                    border: "1px solid #000",
                  }}
                ></span>
                {genusDisplayNames[genus] || genus}
              </label>
            ))}
          </div>
        </div>

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