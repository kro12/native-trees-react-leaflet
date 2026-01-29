import type {
  Feature,
  FeatureCollection,
  Position,
  Polygon, // all our Tree data is in Polygon form
} from "geojson";
/*
 * Logged the data structure using...
 * const geometryTypes = new Set(habitatsData.features.map(f => f.geometry.type));
 * console.log('Geometry types found:', Array.from(geometryTypes));
 */
import { type LatLngTuple } from 'leaflet';

export type TreeGenus = "Quercus" | "Fraxinus" | "Betula" | "Alnus" | "Corylus" | "Salix" | "Pinus" | "Ilex"

const speciesMap: Record<string,string> = {
  // Abbreviated forms
  "F. excelsior": "Fraxinus excelsior",
  "F excelsior": "Fraxinus excelsior",
  "Frax. excelsior": "Fraxinus excelsior",
  "Q. petraea": "Quercus petraea",
  "Q petraea": "Quercus petraea",
  "Q. robur": "Quercus robur",
  "Q robur": "Quercus robur",
  "B. pubescens": "Betula pubescens",
  "B pubescens": "Betula pubescens",
  "A. glutinosa": "Alnus glutinosa",
  "A glutinosa": "Alnus glutinosa",
  "C. avellana": "Corylus avellana",
  "C avellana": "Corylus avellana",
  "S. cinerea": "Salix cinerea",
  "S cinerea": "Salix cinerea",
  "P. sylvestris": "Pinus sylvestris",
  "P sylvestris": "Pinus sylvestris",
  "I. aquifolium": "Ilex aquifolium",
  "I aquifolium": "Ilex aquifolium",

  // Full genus names
  Quercus: "Quercus petraea",
  Fraxinus: "Fraxinus excelsior",
  Betula: "Betula pubescens",
  Alnus: "Alnus glutinosa",
  Corylus: "Corylus avellana",
  Salix: "Salix cinerea",
  Pinus: "Pinus sylvestris",
  Ilex: "Ilex aquifolium",

  // Handle compound descriptions
  "Fraxinus excelsior - Hedera helix": "Fraxinus excelsior",
  "Quercus petraea - Luzula": "Quercus petraea",
  "Quercus robur - Corylus": "Quercus robur",
  "Betula pubescens - Molinia": "Betula pubescens",
  "Alnus glutinosa - Filipendula": "Alnus glutinosa",
  "Salix cinerea - Galium": "Salix cinerea",
};

export interface SpeciesInfo {
  image: string
  description: string
}

const speciesInfo: Record<string, SpeciesInfo> = {
  Alnus: {
    image: "/species/alnus_glutinosa.jpg",
    description:
      "Common alder thrives in wet conditions near rivers and streams. Fast-growing native tree with distinctive cone-like fruits.",
  },
  Betula: {
    image: "/species/betula_pubescens.jpg",
    description:
      "Downy birch is a pioneer species with distinctive white bark. Tolerates poor soils and exposed conditions.",
  },
  Corylus: {
    image: "/species/corylus_avellana.jpg",
    description:
      "Hazel produces edible nuts and is often found in woodland understory. Important for wildlife and traditional crafts.",
  },
  Fraxinus: {
    image: "/species/fraxinus_excelsior.jpg",
    description:
      "Ash tree with distinctive compound leaves. Currently threatened by ash dieback disease across Europe.",
  },
  Ilex: {
    image: "/species/ilex_aquifolium.jpg",
    description:
      "Holly is an evergreen with spiny leaves and red berries. Important winter food source for birds.",
  },
  Quercus: {
    image: "/species/quercus_robur.jpg",
    description:
      "Oak species including sessile and pedunculate oak. Long-lived native trees supporting hundreds of insect species.",
  },
  Salix: {
    image: "/species/salix_cinerea.jpg",
    description:
      "Willows are fast-growing trees that prefer wet habitats. Important for stabilizing riverbanks and wetlands.",
  },
  Pinus: {
    image: "/species/pinus_sylvestris.jpg",
    description:
      "Scots pine is Ireland's only native conifer. Distinctive orange-red bark on mature trees.",
  },
};

const treeColors: Record<string, string> = {
  Quercus: "#8B4513",
  Fraxinus: "#4682B4",
  Betula: "#DAA520",
  Alnus: "#228B22",
  Ilex: "#2E7D32",
  Corylus: "#D2691E",
  Salix: "#9CCC65",
  Pinus: "#1B5E20",
};

const genusDisplayNames: Record<string, string> = {
  Alnus: "Alnus glutinosa (Alder)",
  Betula: "Betula pubescens (Birch)",
  Corylus: "Corylus avellana (Hazel)",
  Fraxinus: "Fraxinus excelsior (Ash)",
  Ilex: "Ilex aquifolium (Holl)",
  Quercus: "Quercus spp. (Oak)",
  Salix: "Salix spp. (Willow)",
  Pinus: "Pinus sylvestris (Scots Pine)",
};

const darkerShadeColourMap: Record<string,string> = {
  "#8B4513": "#5C2D0A",
  "#4682B4": "#2E5A7A",
  "#DAA520": "#B8860B",
  "#228B22": "#1A6B1A",
  "#808080": "#4A4A4A",
  "#2E7D32": "#1B5E20",
  "#D2691E": "#8B4513",
  "#9CCC65": "#689F38",
  "#1B5E20": "#0D2F10",
};

// ms delay before pulsing polygons
const POLYGON_PULSE_DELAY = 100
const DEFAULT_MAP_COORDS: LatLngTuple = [53.35, -7.5]

interface TitleLayerConfig {
  url: string
  attribution: string
  label: string
}

interface TileLayersMap {
  street: TitleLayerConfig
  satellite: TitleLayerConfig
  terrain: TitleLayerConfig
}

// Tile layer configurations
const titleLayers: TileLayersMap = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    label: "Street"
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    label: "Satellite"
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap contributors",
    label: "Terrain"
  }
};

// Define the shape of habitat properties
interface HabitatProperties {
  NS_SPECIES?: string;
  NSNW_DESC?: string;
  COUNTY: string | string[];
  SITE_NAME?: string;
  AREA: number;
  cleanedSpecies: string;
  _centroid: Position;
  _genus: string | null;
}

// Define the habitat feature type
type HabitatFeature = Feature<Polygon, HabitatProperties>;

// Define the habitat collection type
type HabitatCollection = FeatureCollection<Polygon, HabitatProperties>;

interface MarkerClusterType {
  getChildCount(): number;
}

export {
  speciesMap,
  speciesInfo,
  treeColors,
  genusDisplayNames,
  darkerShadeColourMap,
  titleLayers,
  type TileLayersMap,
  type HabitatFeature,
  type HabitatCollection,
  type MarkerClusterType,
  POLYGON_PULSE_DELAY,
  DEFAULT_MAP_COORDS,
};
