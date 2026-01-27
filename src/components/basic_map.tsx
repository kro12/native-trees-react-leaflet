import { MapContainer, TileLayer } from 'react-leaflet'

function BasicMap() {
  return (
    <div style={{ height: '90vh', width: '100%' }}>
      <MapContainer 
        center={[51.505, -0.09]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
      </MapContainer>
    </div>
  )
}


export default BasicMap
