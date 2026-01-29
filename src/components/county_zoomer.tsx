import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Feature } from "geojson";

interface Props {
  filteredHabitats: {
    features: Feature[]
  } | null;
  selectedCounty: string;
}

function CountyZoomer({ filteredHabitats, selectedCounty }: Props) {
  const map = useMap();

  useEffect(() => {
    if (!filteredHabitats || filteredHabitats.features.length === 0) return;

    // Zooming to selected County
    if (selectedCounty === "All") {
      map.flyTo([53.35, -7.5], 8, { duration: 1 });
      return;
    }

    const bounds = L.latLngBounds([]);

    filteredHabitats.features.forEach((feature) => {
      const geom = feature.geometry;
      
      if (!geom) return;

      if (geom.type === "Polygon") {
        const coords = geom.coordinates[0];
        coords.forEach((coord) => {
          bounds.extend([coord[1], coord[0]]);
        });
      } else if (geom.type === "MultiPolygon") {
        geom.coordinates.forEach((polygon) => {
          polygon[0].forEach((coord) => {
            bounds.extend([coord[1], coord[0]]);
          });
        });
      } else if (geom.type === "Point") {
        bounds.extend([geom.coordinates[1], geom.coordinates[0]]);
      }
    });

    if (bounds.isValid()) {
      map.flyToBounds(bounds, {
        padding: [50, 50],
        maxZoom: 11,
        duration: 1,
      });
    }
  }, [selectedCounty, filteredHabitats, map]);

  return null;
}

export default CountyZoomer;
