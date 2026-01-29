interface Props {
  x: number
  y: number
  lat: number
  lng: number
  onClose: () => void
}

const ContextMenu = ({ x, y, lat, lng, onClose }: Props) => {
  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
    onClose()
  }

  const openInGoogleStreetView = () => {
    window.open(`https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`, '_blank')
    onClose()
  }

  return (
    <div
      className="context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 10000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <ul>
        <li onClick={openInGoogleMaps}>Open in Google Maps</li>
        <li onClick={openInGoogleStreetView}>Open Street View</li>
      </ul>
    </div>
  )
}

export default ContextMenu
