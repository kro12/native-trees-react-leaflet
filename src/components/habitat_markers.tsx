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
  const markers = useMemo(() => {
    if (!filteredHabitats || currentZoom >= 11) return null

    return filteredHabitats.features.map((feature, idx) => {
      const centroid = feature.properties._centroid as [number, number]
      const species = feature.properties.cleanedSpecies || 'Unknown'
      const color = getColorForSpecies(species)
      const siteName = feature.properties.SITE_NAME ?? idx

      return (
        <CircleMarker
          key={`marker-${siteName}-${selectedSpecies.join(',')}`}
          center={centroid}
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

  return markers
}

export default HabitatMarkers
