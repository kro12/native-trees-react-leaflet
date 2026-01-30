// src/hooks/tests/useFlashPolygons.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type L from 'leaflet'

import { useFlashPolygons } from '../useFlashPolygons'

interface PathLayerStub {
  options: L.PathOptions
  setStyle: (opts: L.PathOptions) => void
  bringToFront?: () => void
}

interface NonPathLayerStub {
  foo: 'bar'
}

interface GeoJsonStub {
  eachLayer: (cb: (layer: unknown) => void) => void
}

const createGeoJsonRefWithLayers = (
  layers: (PathLayerStub | NonPathLayerStub)[]
): React.RefObject<L.GeoJSON | null> => {
  const gj: GeoJsonStub = {
    eachLayer: (cb) => {
      layers.forEach((l) => cb(l))
    },
  }

  return { current: gj as unknown as L.GeoJSON }
}

describe('useFlashPolygons', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('does nothing when geoJsonRef.current is null', () => {
    const geoJsonRef: React.RefObject<L.GeoJSON | null> = { current: null }

    const { result } = renderHook(() => useFlashPolygons(geoJsonRef))

    act(() => {
      result.current.flash()
    })

    expect(result.current.isFlashing).toBe(false)
  })

  it('sets isFlashing true immediately, then false after all flashes complete', () => {
    const layer: PathLayerStub = {
      options: { weight: 2, opacity: 0.5, color: '#123456', fillOpacity: 0.1 },
      setStyle: vi.fn(),
      bringToFront: vi.fn(),
    }

    const geoJsonRef = createGeoJsonRefWithLayers([layer])

    const { result } = renderHook(() => useFlashPolygons(geoJsonRef))

    act(() => {
      result.current.flash()
    })
    expect(result.current.isFlashing).toBe(true)

    // Total finish time: 3*(250+200) + 200 = 1550ms
    act(() => {
      vi.advanceTimersByTime(1550)
    })

    expect(result.current.isFlashing).toBe(false)
  })

  it('applies flash style then restores original style', () => {
    const layer: PathLayerStub = {
      options: { weight: 2, opacity: 0.5, color: '#123456', fillOpacity: 0.1 },
      setStyle: vi.fn(),
      bringToFront: vi.fn(),
    }

    const geoJsonRef = createGeoJsonRefWithLayers([layer])
    const { result } = renderHook(() => useFlashPolygons(geoJsonRef))

    act(() => {
      result.current.flash()
    })

    // flashOn happens synchronously
    expect(layer.setStyle).toHaveBeenCalledWith(
      expect.objectContaining({
        weight: 5,
        opacity: 1,
        fillOpacity: 0.75,
        color: '#ffffff',
      })
    )
    expect(layer.bringToFront).toHaveBeenCalledTimes(1)

    // after onMs (250), flashOff restores original
    act(() => {
      vi.advanceTimersByTime(250)
    })

    expect(layer.setStyle).toHaveBeenCalledWith(
      expect.objectContaining({
        weight: 2,
        opacity: 0.5,
        color: '#123456',
        fillOpacity: 0.1,
      })
    )
  })

  it('ignores layers that do not have setStyle', () => {
    const pathLayer: PathLayerStub = {
      options: { color: '#00ff00' },
      setStyle: vi.fn(),
    }
    const nonPathLayer: NonPathLayerStub = { foo: 'bar' }

    const geoJsonRef = createGeoJsonRefWithLayers([pathLayer, nonPathLayer])
    const { result } = renderHook(() => useFlashPolygons(geoJsonRef))

    act(() => {
      result.current.flash()
    })

    expect(pathLayer.setStyle).toHaveBeenCalled()
  })

  it('does not throw if bringToFront is missing', () => {
    const layer: PathLayerStub = {
      options: { color: '#00ff00' },
      setStyle: vi.fn(),
    }

    const geoJsonRef = createGeoJsonRefWithLayers([layer])
    const { result } = renderHook(() => useFlashPolygons(geoJsonRef))

    expect(() => {
      act(() => {
        result.current.flash()
      })
    }).not.toThrow()
  })
})
