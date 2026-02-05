import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

interface Props {
  onHome: () => void
}

export default function HomeControl({ onHome }: Props) {
  const map = useMap()

  useEffect(() => {
    const Home = L.Control.extend({
      options: { position: 'topleft' },

      onAdd: () => {
        const container = L.DomUtil.create(
          'div',
          'leaflet-bar leaflet-control leaflet-control-custom'
        )

        const btn = L.DomUtil.create('a', '', container)
        btn.href = '#'
        btn.title = 'Home'
        btn.setAttribute('role', 'button')
        btn.setAttribute('aria-label', 'Home')
        btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9L12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
        `
        L.DomEvent.disableClickPropagation(container)
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.preventDefault(e)
          onHome()
        })

        return container
      },
    })

    const control = new Home()
    control.addTo(map)
    return () => {
      control.remove()
    }
  }, [map, onHome])

  return null
}
