import {
  speciesMap,
  darkerShadeColourMap,
  treeColors,
  COUNTIES_GEOJSON_URL,
  type CountiesGeoJSON,
  type CountyProperties,
  type HabitatCollection,
  type HabitatFeature,
  type CountyFeature,
} from './constants'
import type { Feature, Geometry, GeoJsonProperties, Position } from 'geojson'

import proj4 from 'proj4'

// Irish Grid projection
proj4.defs(
  'EPSG:29903',
  '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=1.000035 +x_0=200000 +y_0=250000 +ellps=mod_airy +towgs84=482.5,-130.6,564.6,-1.042,-0.214,-0.631,8.15 +units=m +no_defs'
)

// Irish Transverse Mercator (ITM)
proj4.defs(
  'EPSG:2157',
  '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=0.99982 +x_0=600000 +y_0=750000 +ellps=GRS80 +units=m +no_defs'
)

// need this when served after deplpoyment - as Vite will auto handle asset urls, but we gotta take care of regular urls
const withBaseUrl = (path: string): string => {
  const base = import.meta.env.BASE_URL
  const clean = path.replace(/^\/+/, '')
  return `${base}${clean}`
}

interface HabitatIndex {
  counties: string[]
  availableSpecies: string[]
  files: Record<string, string> // countyName -> "/data/habitats/<CountyFile>.json"
}

const loadHabitatIndex = async (): Promise<HabitatIndex> => {
  const res = await fetch(withBaseUrl(`/data/index.json`))
  if (!res.ok) throw new Error(`Habitat index: ${res.status}`)
  return (await res.json()) as HabitatIndex
}

const enrichHabitats = (habitatsData: HabitatCollection): HabitatCollection => {
  console.log(`Loaded ${habitatsData.features.length} habitats for county`)
  const geometryTypes = new Set(habitatsData.features.map((f) => f.geometry.type))
  console.log('Geometry types found:', Array.from(geometryTypes))

  console.log('Converting ITM → WGS84...')

  // Chain reprojection + enrichment with proper typing
  habitatsData.features = habitatsData.features
    .map((feature: HabitatFeature) => reprojectFeature(feature))
    .map((feature: HabitatFeature) => {
      const raw = feature.properties.NS_SPECIES ?? feature.properties.NSNW_DESC ?? ''
      feature.properties.cleanedSpecies = cleanTreeSpecies([raw])[0] ?? 'Unknown'
      feature.properties._centroid = getCentroid(feature.geometry.coordinates)
      feature.properties._genus = getGenusFromSpecies(feature.properties.cleanedSpecies)
      return feature
    })

  const speciesCounts: Record<string, number> = {}
  habitatsData.features.forEach((f) => {
    const sp = f.properties.cleanedSpecies
    speciesCounts[sp] = (speciesCounts[sp] || 0) + 1
  })
  console.log('Species distribution:', speciesCounts)

  return habitatsData
}

const cleanTreeSpecies = (raw: string[]): string[] => {
  if (!raw || !Array.isArray(raw)) return []

  return raw
    .filter((s) => s && !s.includes('Not Determined'))
    .flatMap((s) => {
      const trimmed = s.trim()

      // First try exact match in speciesMap
      if (speciesMap[trimmed]) {
        return [speciesMap[trimmed]]
      }

      // Split compound descriptions (e.g., "Fraxinus excelsior - Hedera helix")
      const parts = trimmed.split(/\s*[-/]\s*/).filter(Boolean)
      for (const part of parts) {
        const partTrimmed = part.trim()
        if (speciesMap[partTrimmed]) {
          return [speciesMap[partTrimmed]]
        }
      }

      // If no map match, try to find genus match
      for (const [key, value] of Object.entries(speciesMap)) {
        if (key.length <= 2) continue // Skip abbreviations
        if (trimmed.includes(key)) {
          return [value]
        }
      }

      return [trimmed] // Return as-is if no match found
    })
    .filter(Boolean)
}

const convertCoord = (coord: Position, fromEPSG = 'EPSG:29903'): Position => {
  try {
    return proj4(fromEPSG, 'EPSG:4326', coord)
  } catch (e) {
    console.error('Conversion failed:', coord, e)
    return coord
  }
}

const getCentroid = (coordinates: Position[][]): Position => {
  const ring = coordinates[0]
  let latSum = 0
  let lngSum = 0
  ring.forEach((coord) => {
    lngSum += coord[0]
    latSum += coord[1]
  })
  return [lngSum / ring.length, latSum / ring.length]
}

/**
 * reprojectFeature
 *
 * Purpose:
 * - Reproject a GeoJSON Feature from a source CRS (fromEPSG) to WGS84 (EPSG:4326),
 *   while preserving both the feature's properties type and geometry type.
 *
 * Key changes and rationale:
 * 1) Introduced generic type parameters <G, P> for geometry and properties.
 *    - G extends GeoJSON.Geometry to allow any valid geometry type (Point, Polygon, etc.)
 *    - P for properties interface (CountyProperties, HabitatProperties, etc.)
 *    This ensures we preserve the exact feature shape through reprojection.
 *
 * 2) Preserve type safety across the reprojection pipeline:
 *    - By keeping both generics, downstream code that expects
 *      Feature<Polygon, HabitatProperties> or Feature<Geometry, CountyProperties>
 *      continues to type-check without widening or unsafe casts.
 *
 * 3) Flexible source CRS handling:
 *    - The fromEPSG parameter defaults to 'EPSG:29903' (Irish Transverse Mercator)
 *      for backward compatibility with existing habitat data workflows.
 *    - Counties use 'EPSG:2157' (ITM - Irish Transverse Mercator 1965).
 *
 * 4) Consistent geometry mutation:
 *    - Mutates coordinates in place for performance.
 *    - Handles Point, Polygon (rings), and MultiPolygon geometries.
 *
 * Usage examples:
 * - Reproject habitat features (Polygon geometry, HabitatProperties):
 *   habitatsData.features.map(f => reprojectFeature(f)) // types inferred
 * - Reproject county features (explicit types):
 *   reprojectFeature<GeoJSON.Geometry, CountyProperties>(feature, 'EPSG:2157')
 */
const reprojectFeature = <G extends Geometry = Geometry, P = GeoJsonProperties>(
  feature: Feature<G, P>,
  fromEPSG = 'EPSG:29903'
): Feature<G, P> => {
  const geom = feature.geometry
  if (!geom) return feature

  // Type-cast coordinates to Position types for strict type safety
  if (geom.type === 'Point') {
    geom.coordinates = convertCoord(geom.coordinates, fromEPSG)
  } else if (geom.type === 'Polygon') {
    geom.coordinates = geom.coordinates.map((ring) =>
      ring.map((coord) => convertCoord(coord, fromEPSG))
    )
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates = geom.coordinates.map((polygon) =>
      polygon.map((ring) => ring.map((coord) => convertCoord(coord, fromEPSG)))
    )
  }

  return feature
}

// Helper to get genus from species name
const getGenusFromSpecies = (speciesName: string) => {
  if (!speciesName || speciesName === 'Unknown') return null

  for (const genus of Object.keys(treeColors)) {
    if (speciesName.includes(genus)) {
      return genus
    }
  }

  return null
}

const getColorForSpecies = (speciesName: string) => {
  if (!speciesName || speciesName === 'Unknown') return '#808080'

  for (const [genus, color] of Object.entries(treeColors)) {
    if (speciesName.includes(genus)) {
      return color
    }
  }

  return '#808080'
}

const getDarkerShade = (color: string) => {
  return darkerShadeColourMap[color] || '#333333'
}

// ideally I would convert all references in source data to lowercase and title case at the point of ingestion, but this is a quick fix to ensure we can handle the existing data with mixed formats
export const titleCaseCounty = (raw: string | string[]): string =>
  Array.isArray(raw)
    ? (raw[0]
        ?.toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())
        ?.trim() ?? '')
    : raw
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .trim()

const loadHabitatsForCounty = async (
  county: string,
  index: HabitatIndex
): Promise<HabitatCollection> => {
  const standardisedCounty = titleCaseCounty(county)
  const file = index.files[standardisedCounty]
  const url = withBaseUrl(file)
  console.log(`Loading habitats for county: ${standardisedCounty} from URL: ${url}`)
  if (!url) throw new Error(`No habitat file for county: ${standardisedCounty}`)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Habitats (${standardisedCounty}): ${res.status}`)

  const data = (await res.json()) as unknown

  if (!data || typeof data !== 'object' || !('features' in data)) {
    throw new Error(`Invalid habitat data format for standardisedCounty: ${standardisedCounty}`)
  }

  return enrichHabitats(data as HabitatCollection)
}

const loadHabitatData = async (): Promise<{
  counties: string[]
  availableSpecies: string[]
  index: HabitatIndex
}> => {
  const index = await loadHabitatIndex()

  return {
    counties: index.counties,
    availableSpecies: index.availableSpecies,
    index,
  }
}

const deriveStyleFeature = (shouldPulse: boolean, feature?: HabitatFeature): L.PathOptions => {
  if (!feature) return { fillColor: '#808080', weight: 1, opacity: 0.5 }

  const species = feature.properties.cleanedSpecies || 'Unknown'
  const color = getColorForSpecies(species)
  const borderColor = getDarkerShade(color)

  return {
    fillColor: color,
    weight: 1.5,
    opacity: 0.9,
    color: borderColor,
    fillOpacity: 0.5,
    className: shouldPulse ? 'pulse-polygon' : '',
  }
}

const loadCountiesData = async (): Promise<CountiesGeoJSON> => {
  try {
    const url = withBaseUrl(COUNTIES_GEOJSON_URL)
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`Failed to load counties data: ${res.status}`)
      return { type: 'FeatureCollection', features: [] }
    }
    const data = (await res.json()) as CountiesGeoJSON

    // Reproject counties from EPSG:2157 (ITM) to WGS84
    // Explicitly preserve CountyProperties
    data.features = data.features.map((feature) =>
      reprojectFeature<Geometry, CountyProperties>(feature, 'EPSG:2157')
    ) as CountyFeature[]

    return data
  } catch (error) {
    console.error('Error loading counties data:', error)
    return { type: 'FeatureCollection', features: [] }
  }
}

export {
  cleanTreeSpecies,
  reprojectFeature,
  getGenusFromSpecies,
  getColorForSpecies,
  getDarkerShade,
  getCentroid,
  deriveStyleFeature,
  loadHabitatsForCounty,
  loadHabitatData,
  loadHabitatIndex,
  withBaseUrl,
  loadCountiesData,
  type HabitatIndex,
  type HabitatCollection,
}
