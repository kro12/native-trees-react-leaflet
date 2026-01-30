import type { HabitatCollection } from '../../constants'

export const makeHabitats = (): HabitatCollection => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: null as unknown as HabitatCollection['features'][number]['geometry'],
      properties: {
        COUNTY: 'Dublin',
        _genus: 'Alnus',
        cleanedSpecies: 'Alnus glutinosa',
        SITE_NAME: 'Site 1',
        AREA: 10000,
        _centroid: [0, 0], // required by HabitatProperties
      },
    },
    {
      type: 'Feature',
      geometry: null as unknown as HabitatCollection['features'][number]['geometry'],
      properties: {
        COUNTY: 'Dublin',
        _genus: 'Betula',
        cleanedSpecies: 'Betula pubescens',
        SITE_NAME: 'Site 2',
        AREA: 20000,
        _centroid: [0, 0],
      },
    },
    {
      type: 'Feature',
      geometry: null as unknown as HabitatCollection['features'][number]['geometry'],
      properties: {
        COUNTY: 'Cork',
        _genus: 'Alnus',
        cleanedSpecies: 'Alnus glutinosa',
        SITE_NAME: 'Site 3',
        AREA: 15000,
        _centroid: [0, 0],
      },
    },
  ],
})
