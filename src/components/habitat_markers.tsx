import { useMemo, type JSX } from 'react'
import { CircleMarker, Popup } from 'react-leaflet'
import DetailedPopupCard from './detailed_popup_card'
import { type HabitatCollection, speciesInfo } from '../constants'
import { getColorForSpecies } from '../utils'

interface Props {
  filteredHabitats: HabitatCollection | null
  currentZoom: number
  selectedSpecies: string[]
}

const HabitatMarkers = ({
  filteredHabitats,
  currentZoom,
  selectedSpecies,
}: Props): JSX.Element[] | null => {
  console.log('🗺️ HabitatMarkers rendering:', {
    featureCount: filteredHabitats?.features?.length ?? 0,
    firstCentroid: filteredHabitats?.features?.[0]?.properties?._centroid,
    selectedSpecies: selectedSpecies.length,
  })
  const markers = useMemo(() => {
    if (!filteredHabitats || currentZoom >= 11) return null

    return filteredHabitats.features.map((feature, idx) => {
      const centroid = feature.properties._centroid as [number, number]
      const leafletCenter: [number, number] = [centroid[1], centroid[0]]
      const species = feature.properties.cleanedSpecies || 'Unknown'
      const color = getColorForSpecies(species)
      const siteName = feature.properties.SITE_NAME ?? idx

      return (
        <CircleMarker
          key={`marker-${siteName}-${selectedSpecies.join(',')}`}
          center={leafletCenter}
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
      )
    })
  }, [filteredHabitats, currentZoom, selectedSpecies])
  console.log('🗺️ HabitatMarkers - markers about to render:', {
    featuresToRender: filteredHabitats?.features?.length ?? 0,
    zoom: currentZoom,
    // Add your actual marker count here:
    actualMarkersRendered: markers?.length ?? 0,
  })

  return markers
}

export default HabitatMarkers
