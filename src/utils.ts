import {
  speciesMap,
  darkerShadeColourMap,
  treeColors,
  type HabitatCollection,
  type HabitatFeature,
} from './constants'
import type { Feature, Position } from 'geojson'
import proj4 from 'proj4'

// Irish Grid projection
proj4.defs(
  'EPSG:29903',
  '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=1.000035 +x_0=200000 +y_0=250000 +ellps=mod_airy +towgs84=482.5,-130.6,564.6,-1.042,-0.214,-0.631,8.15 +units=m +no_defs'
)

export interface HabitatIndex {
  counties: string[]
  availableSpecies: string[]
  files: Record<string, string> // countyName -> "/data/habitats/<CountyFile>.json"
}

export const loadHabitatIndex = async (): Promise<HabitatIndex> => {
  const res = await fetch('/data/index.json')
  if (!res.ok) throw new Error(`Habitat index: ${res.status}`)
  return (await res.json()) as HabitatIndex
}

const enrichHabitats = (habitatsData: HabitatCollection): HabitatCollection => {
  console.log('Loaded:', habitatsData.features?.length, 'polygons')
  const geometryTypes = new Set(habitatsData.features.map((f) => f.geometry.type))
  console.log('Geometry types found:', Array.from(geometryTypes))

  console.log('Converting ITM → WGS84...')
  habitatsData.features = habitatsData.features.map(reprojectFeature) as HabitatFeature[]

  habitatsData.features?.forEach((f) => {
    const raw = f.properties.NS_SPECIES ?? f.properties.NSNW_DESC ?? ''
    f.properties.cleanedSpecies = cleanTreeSpecies([raw])[0] ?? 'Unknown'
    f.properties._centroid = getCentroid(f.geometry.coordinates)
    f.properties._genus = getGenusFromSpecies(f.properties.cleanedSpecies)
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

const convertCoord = (coord: Position): Position => {
  try {
    return proj4('EPSG:29903', 'EPSG:4326', coord)
  } catch (e) {
    console.error('Conversion failed:', coord, e)
    return coord
  }
}

const reprojectFeature = (feature: Feature): Feature => {
  const geom = feature.geometry
  if (!geom) return feature

  if (geom.type === 'Point') {
    geom.coordinates = convertCoord(geom.coordinates)
  } else if (geom.type === 'Polygon') {
    geom.coordinates = geom.coordinates.map((ring) => ring.map((coord) => convertCoord(coord)))
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates = geom.coordinates.map((polygon) =>
      polygon.map((ring) => ring.map((coord) => convertCoord(coord)))
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

const getCentroid = (coordinates: Position[][]) => {
  const ring = coordinates[0]
  let latSum = 0
  let lonSum = 0

  ring.forEach((coord) => {
    lonSum += coord[0]
    latSum += coord[1]
  })

  return [latSum / ring.length, lonSum / ring.length]
}

export interface HabitatsData {
  features?: HabitatFeature[]
}

const deriveCounties = (habitatsData: HabitatsData): string[] => {
  return (
    habitatsData.features
      ?.map((f) => {
        const c = f.properties.COUNTY
        return Array.isArray(c) ? c : [c]
      })
      .flat()
      .filter(Boolean)
      .filter((c, i, self) => self.indexOf(c) === i)
      .sort() ?? []
  )
}

export const loadHabitatsForCounty = async (
  county: string,
  index: HabitatIndex
): Promise<HabitatCollection> => {
  const url = index.files[county]
  if (!url) throw new Error(`No habitat file for county: ${county}`)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Habitats (${county}): ${res.status}`)

  const data = (await res.json()) as unknown

  if (!data || typeof data !== 'object' || !('features' in data)) {
    throw new Error(`Invalid habitat data format for county: ${county}`)
  }

  return enrichHabitats(data as HabitatCollection)
}

export const loadHabitatData = async (): Promise<{
  // keep signature compatible with existing callers that expect these
  habitatsData: HabitatCollection | null
  counties: string[]
  availableSpecies: string[]
  index: HabitatIndex
}> => {
  const index = await loadHabitatIndex()

  return {
    habitatsData: null, // habitats now loaded per-county
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

export {
  cleanTreeSpecies,
  reprojectFeature,
  getGenusFromSpecies,
  getColorForSpecies,
  getDarkerShade,
  getCentroid,
  deriveCounties,
  deriveStyleFeature,
}
