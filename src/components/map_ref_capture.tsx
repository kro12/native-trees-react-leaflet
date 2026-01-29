import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

function MapRefCapture({ mapRef }: { mapRef: React.RefObject<L.Map | null> }) {
  const map = useMap()

  useEffect(() => {
    mapRef.current = map
  }, [map, mapRef])

  return null
}

export default MapRefCapture
