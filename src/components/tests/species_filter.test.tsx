import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import SpeciesFilter from '../species_filter'
import { treeColors } from '../../constants'

describe('SpeciesFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the toggle button with selected/available counts', () => {
    render(
      <SpeciesFilter
        selectedSpecies={['Alnus']}
        availableSpecies={['Alnus', 'Betula']}
        speciesDropdownOpen={false}
        toggleSpecies={vi.fn()}
        toggleAllSpecies={vi.fn()}
        setSpeciesDropdownOpen={vi.fn()}
        disabled={false}
      />
    )

    expect(screen.getByRole('button', { name: /Species \(1\/2\) ▾/ })).toBeInTheDocument()
  })

  it('clicking the button toggles dropdown open state via setSpeciesDropdownOpen', () => {
    const setSpeciesDropdownOpen = vi.fn()

    render(
      <SpeciesFilter
        selectedSpecies={[]}
        availableSpecies={['Alnus']}
        speciesDropdownOpen={false}
        toggleSpecies={vi.fn()}
        toggleAllSpecies={vi.fn()}
        setSpeciesDropdownOpen={setSpeciesDropdownOpen}
        disabled={false}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Species \(0\/1\) ▾/ }))
    expect(setSpeciesDropdownOpen).toHaveBeenCalledTimes(1)
    expect(setSpeciesDropdownOpen).toHaveBeenCalledWith(true)
  })

  it('adds the "open" class to the dropdown when speciesDropdownOpen is true', () => {
    const { container } = render(
      <SpeciesFilter
        selectedSpecies={[]}
        availableSpecies={['Alnus']}
        speciesDropdownOpen={true}
        toggleSpecies={vi.fn()}
        toggleAllSpecies={vi.fn()}
        setSpeciesDropdownOpen={vi.fn()}
        disabled={false}
      />
    )

    const dropdown = container.querySelector('.species-dropdown')
    expect(dropdown).toBeInTheDocument()
    expect(dropdown).toHaveClass('open')
  })

  it('Select All checkbox is checked when selectedSpecies.length === availableSpecies.length', () => {
    render(
      <SpeciesFilter
        selectedSpecies={['Alnus', 'Betula']}
        availableSpecies={['Alnus', 'Betula']}
        speciesDropdownOpen={true}
        toggleSpecies={vi.fn()}
        toggleAllSpecies={vi.fn()}
        setSpeciesDropdownOpen={vi.fn()}
        disabled={false}
      />
    )

    const selectAll = screen.getByRole('checkbox', { name: /Select All/i })
    expect(selectAll).toBeChecked()
  })

  it('changing Select All calls toggleAllSpecies', () => {
    const toggleAllSpecies = vi.fn()

    render(
      <SpeciesFilter
        selectedSpecies={['Alnus']}
        availableSpecies={['Alnus', 'Betula']}
        speciesDropdownOpen={true}
        toggleSpecies={vi.fn()}
        toggleAllSpecies={toggleAllSpecies}
        setSpeciesDropdownOpen={vi.fn()}
        disabled={false}
      />
    )

    fireEvent.click(screen.getByRole('checkbox', { name: /Select All/i }))
    expect(toggleAllSpecies).toHaveBeenCalledTimes(1)
  })

  it('renders a checkbox per available species and checks based on selectedSpecies', () => {
    render(
      <SpeciesFilter
        selectedSpecies={['Alnus']}
        availableSpecies={['Alnus', 'Betula']}
        speciesDropdownOpen={true}
        toggleSpecies={vi.fn()}
        toggleAllSpecies={vi.fn()}
        setSpeciesDropdownOpen={vi.fn()}
        disabled={false}
      />
    )

    const alnus = screen.getByRole('checkbox', { name: /Alder/i })
    const betula = screen.getByRole('checkbox', { name: /Betula/i }) // fallback display

    expect(alnus).toBeChecked()
    expect(betula).not.toBeChecked()
  })

  it('clicking a species checkbox calls toggleSpecies with that genus', () => {
    const toggleSpecies = vi.fn()

    render(
      <SpeciesFilter
        selectedSpecies={[]}
        availableSpecies={['Alnus', 'Betula']}
        speciesDropdownOpen={true}
        toggleSpecies={toggleSpecies}
        toggleAllSpecies={vi.fn()}
        setSpeciesDropdownOpen={vi.fn()}
        disabled={false}
      />
    )

    fireEvent.click(screen.getByRole('checkbox', { name: /Alder/i }))
    expect(toggleSpecies).toHaveBeenCalledTimes(1)
    expect(toggleSpecies).toHaveBeenCalledWith('Alnus')

    fireEvent.click(screen.getByRole('checkbox', { name: /Betula/i }))
    expect(toggleSpecies).toHaveBeenCalledTimes(2)
    expect(toggleSpecies).toHaveBeenLastCalledWith('Betula')
  })

  it('renders species checkbox background dynamically from treeColors', () => {
    const { rerender } = render(
      <SpeciesFilter
        selectedSpecies={[]} // Unchecked first
        availableSpecies={['Alnus']}
        speciesDropdownOpen={true}
        toggleSpecies={vi.fn()}
        toggleAllSpecies={vi.fn()}
        setSpeciesDropdownOpen={vi.fn()}
        disabled={false}
      />
    )

    let label = screen.getByText(/Alnus.*Alder/i).closest('label')!
    let checkboxSpan = label!.querySelector('span')!
    expect(checkboxSpan).toHaveStyle({ backgroundColor: '#f8f9fa' }) // Neutral unchecked

    // Rerender checked
    rerender(
      <SpeciesFilter
        selectedSpecies={['Alnus']}
        availableSpecies={['Alnus']}
        speciesDropdownOpen={true}
        toggleSpecies={vi.fn()}
        toggleAllSpecies={vi.fn()}
        setSpeciesDropdownOpen={vi.fn()}
        disabled={false}
      />
    )

    label = screen.getByText(/Alnus.*Alder/i).closest('label')!
    checkboxSpan = label!.querySelector('span')!
    expect(checkboxSpan).toHaveStyle({ backgroundColor: treeColors.Alnus })
  })
})

describe('SpeciesFilter — disabled behaviour', () => {
  it('closes an already-open dropdown when disabled becomes true', () => {
    const setSpeciesDropdownOpen = vi.fn()

    const { rerender } = render(
      <SpeciesFilter
        selectedSpecies={['Alnus']}
        availableSpecies={['Alnus', 'Betula']}
        speciesDropdownOpen={true}
        toggleSpecies={vi.fn()}
        toggleAllSpecies={vi.fn()}
        setSpeciesDropdownOpen={setSpeciesDropdownOpen}
        disabled={false}
      />
    )

    // Now disable it while open
    rerender(
      <SpeciesFilter
        selectedSpecies={['Alnus']}
        availableSpecies={['Alnus', 'Betula']}
        speciesDropdownOpen={true}
        toggleSpecies={vi.fn()}
        toggleAllSpecies={vi.fn()}
        setSpeciesDropdownOpen={setSpeciesDropdownOpen}
        disabled={true}
      />
    )

    expect(setSpeciesDropdownOpen).toHaveBeenCalledWith(false)
  })

  it('adds aria attributes and disables controls when disabled', () => {
    render(
      <SpeciesFilter
        selectedSpecies={['Alnus']}
        availableSpecies={['Alnus', 'Betula']}
        speciesDropdownOpen={false}
        toggleSpecies={vi.fn()}
        toggleAllSpecies={vi.fn()}
        setSpeciesDropdownOpen={vi.fn()}
        disabled={true}
      />
    )

    const button = screen.getByRole('button', { name: /Species/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('aria-expanded', 'false')

    const checkboxes = screen.getAllByRole('checkbox', { hidden: true })
    checkboxes.forEach((cb) => {
      expect(cb).toBeDisabled()
    })
  })
})
