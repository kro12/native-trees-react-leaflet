import { useState, useCallback, useEffect } from 'react'

interface ContextMenuPosition {
  x: number
  y: number
  lat: number
  lng: number
}

export const useContextMenu = () => {
  const [menuPosition, setMenuPosition] = useState<ContextMenuPosition | null>(null)

  const handleContextMenu = useCallback((e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng
    const { clientX: x, clientY: y } = e.originalEvent

    setMenuPosition({ x, y, lat, lng })
  }, [])

  const closeMenu = useCallback(() => {
    setMenuPosition(null)
  }, [])

  useEffect(() => {
    if (menuPosition) {
      document.addEventListener('click', closeMenu)
      return () => document.removeEventListener('click', closeMenu)
    }
  }, [menuPosition, closeMenu])

  return { menuPosition, handleContextMenu, closeMenu }
}
