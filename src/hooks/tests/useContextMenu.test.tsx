// src/hooks/tests/useContextMenu.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import L from 'leaflet'

import { useContextMenu } from '../useContextMenu'

type ContextMenuEventStub = Pick<L.LeafletMouseEvent, 'latlng' | 'originalEvent'>

const makeLeafletContextMenuEvent = (args: {
  lat: number
  lng: number
  x: number
  y: number
}): ContextMenuEventStub => {
  const originalEvent = new MouseEvent('contextmenu', {
    bubbles: true,
    clientX: args.x,
    clientY: args.y,
  })

  return {
    latlng: new L.LatLng(args.lat, args.lng),
    originalEvent,
  }
}

describe('useContextMenu', () => {
  it('starts with menuPosition null', () => {
    const { result } = renderHook(() => useContextMenu())
    expect(result.current.menuPosition).toBeNull()
  })

  it('handleContextMenu sets menuPosition from Leaflet event', () => {
    const { result } = renderHook(() => useContextMenu())

    const e = makeLeafletContextMenuEvent({ lat: 52.5278, lng: -6.8556, x: 111, y: 222 })

    act(() => {
      result.current.handleContextMenu(e as L.LeafletMouseEvent)
    })

    expect(result.current.menuPosition).toEqual({
      x: 111,
      y: 222,
      lat: 52.5278,
      lng: -6.8556,
    })
  })

  it('closeMenu clears menuPosition', () => {
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      const e = makeLeafletContextMenuEvent({ lat: 1, lng: 2, x: 10, y: 20 })
      result.current.handleContextMenu(e as L.LeafletMouseEvent)
    })

    act(() => {
      result.current.closeMenu()
    })

    expect(result.current.menuPosition).toBeNull()
  })

  it('closes the menu when the document is clicked', () => {
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      const e = makeLeafletContextMenuEvent({ lat: 1, lng: 2, x: 10, y: 20 })
      result.current.handleContextMenu(e as L.LeafletMouseEvent)
    })
    expect(result.current.menuPosition).not.toBeNull()

    act(() => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(result.current.menuPosition).toBeNull()
  })

  it('adds document click listener when opened and removes it when closed', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const { result } = renderHook(() => useContextMenu())

    act(() => {
      const e = makeLeafletContextMenuEvent({ lat: 1, lng: 2, x: 10, y: 20 })
      result.current.handleContextMenu(e as L.LeafletMouseEvent)
    })
    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function))

    act(() => {
      result.current.closeMenu()
    })
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
  })

  it('removes listener on unmount while open (effect cleanup)', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const { result, unmount } = renderHook(() => useContextMenu())

    act(() => {
      const e = makeLeafletContextMenuEvent({ lat: 1, lng: 2, x: 10, y: 20 })
      result.current.handleContextMenu(e as L.LeafletMouseEvent)
    })

    unmount()
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
  })
})
