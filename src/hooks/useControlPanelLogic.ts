import { useState, useEffect, useMemo, useCallback } from 'react'
import type L from 'leaflet'
import { loadHabitatsForCounty, type HabitatIndex, type HabitatCollection } from '../utils'
import { useFlashPolygons } from './useFlashPolygons'

interface Props {
  mapRef: React.RefObject<L.Map | null>
  currentZoom: number
  geoJsonRef: React.RefObject<L.GeoJSON | null>
  habitatIndex: HabitatIndex | null
  counties: string[]
  availableSpecies: string[]
  isLoadingIndex: boolean
}

export const useControlPanelLogic = ({
  mapRef,
  currentZoom,
  geoJsonRef,
  counties,
  habitatIndex,
  availableSpecies,
  isLoadingIndex,
}: Props) => {
  // State
  const [habitats, setHabitats] = useState<HabitatCollection | null>(null)
  const [selectedCounty, setSelectedCounty] = useState('')
  const [isLoadingCounty, setIsLoadingCounty] = useState(false)
  const [baseLayer, setBaseLayer] = useState('satellite')
  const [panelPosition, setPanelPosition] = useState({ x: 50, y: 10 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Species filter state
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([])
  const [speciesDropdownOpen, setSpeciesDropdownOpen] = useState(false)

  const panelDisabled = isLoadingIndex || isLoadingCounty || !habitatIndex

  const { flash, isFlashing } = useFlashPolygons(geoJsonRef)

  // Initialize selected species when availableSpecies changes
  useEffect(() => {
    setSelectedSpecies(availableSpecies)
  }, [availableSpecies])

  // Load habitats when county changes
  useEffect(() => {
    const loadCounty = async () => {
      if (!selectedCounty || selectedCounty === '') {
        setHabitats(null)
        return
      }

      if (!habitatIndex) return

      setIsLoadingCounty(true)

      try {
        const habitatsData = await loadHabitatsForCounty(selectedCounty.toLowerCase(), habitatIndex)
        setHabitats(habitatsData)
      } catch (err) {
        console.error(`Failed to load habitats for county "${selectedCounty}":`, err)
        setHabitats(null)
      } finally {
        setIsLoadingCounty(false)
      }
    }

    void loadCounty()
  }, [selectedCounty, habitatIndex])

  // Close species dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.species-filter')) {
        setSpeciesDropdownOpen(false)
      }
    }

    if (speciesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [speciesDropdownOpen])

  // Reset map view when county cleared
  useEffect(() => {
    if (!selectedCounty || selectedCounty === '') {
      if (mapRef.current) {
        mapRef.current.setView([53.35, -7.5], 8)
      }
    }
  }, [selectedCounty, mapRef])

  // Close dropdown when panel disabled
  useEffect(() => {
    if (panelDisabled && speciesDropdownOpen) {
      setSpeciesDropdownOpen(false)
    }
  }, [panelDisabled, speciesDropdownOpen])

  // Filter habitats by county and species
  const filteredHabitats = useMemo(() => {
    if (!habitats) return null

    let filtered = habitats.features

    if (!selectedCounty || selectedCounty === '') {
      return {
        ...habitats,
        features: [],
      }
    }

    if (selectedCounty !== 'All') {
      filtered = filtered.filter((f) => {
        const county = f.properties.COUNTY
        if (Array.isArray(county)) return county.includes(selectedCounty)
        return county === selectedCounty
      })
    }

    if (selectedSpecies.length > 0 && selectedSpecies.length < availableSpecies.length) {
      filtered = filtered.filter((f) => {
        const genus = f.properties._genus
        return genus && selectedSpecies.includes(genus)
      })
    }

    return {
      ...habitats,
      features: filtered,
    }
  }, [habitats, selectedCounty, selectedSpecies, availableSpecies])

  // Handlers
  const toggleSpecies = (genus: string) => {
    setSelectedSpecies((prev) => {
      if (prev.includes(genus) && prev.length === 1) {
        return prev
      }

      return prev.includes(genus) ? prev.filter((s) => s !== genus) : [...prev, genus]
    })
  }

  const toggleAllSpecies = () => {
    if (selectedSpecies.length === availableSpecies.length) {
      setSelectedSpecies([availableSpecies[0]])
    } else {
      setSelectedSpecies([...availableSpecies])
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      e.preventDefault()
      e.stopPropagation()

      if (mapRef.current) {
        mapRef.current.dragging.disable()
      }

      setIsDragging(true)
      setDragOffset({
        x: e.clientX - panelPosition.x,
        y: e.clientY - panelPosition.y,
      })
    }
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault()
        e.stopPropagation()
        setPanelPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        })
      }
    },
    [isDragging, dragOffset]
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      if (mapRef.current) {
        mapRef.current.dragging.enable()
      }
      setIsDragging(false)
    }
  }, [isDragging, mapRef])

  const handlePanelMouseEnter = () => {
    if (mapRef.current) {
      mapRef.current.dragging.disable()
    }
  }

  const handlePanelMouseLeave = () => {
    if (mapRef.current && !isDragging) {
      mapRef.current.dragging.enable()
    }
  }

  // Attach/detach drag listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return {
    // State values
    panelPosition,
    selectedCounty,
    isLoadingCounty,
    counties,
    filteredHabitats,
    selectedSpecies,
    availableSpecies,
    speciesDropdownOpen,
    baseLayer,
    currentZoom,

    // State setters
    setSelectedCounty,
    setSpeciesDropdownOpen,
    setBaseLayer,

    // Action handlers
    toggleAllSpecies,
    toggleSpecies,
    flash,
    isFlashing,
    handleMouseDown,
    handlePanelMouseEnter,
    handlePanelMouseLeave,

    disabled: panelDisabled,
  }
}
