import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

interface Props {
  setCurrentZoom: (zoom: number) => void
}

export function ZoomTracker({ setCurrentZoom }: Props) {
  const map = useMap()

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const handleZoom = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setCurrentZoom(map.getZoom())
      }, 150)
    }

    map.on('zoomend', handleZoom)
    return () => {
      clearTimeout(timeoutId)
      map.off('zoomend', handleZoom)
    }
  }, [map, setCurrentZoom])

  return null
}

export default ZoomTracker
