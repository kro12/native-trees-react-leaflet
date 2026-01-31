import { useEffect, useId } from 'react'
import { treeColors, genusDisplayNames } from '../constants'

interface Props {
  selectedSpecies: string[]
  availableSpecies: string[]
  speciesDropdownOpen: boolean
  toggleSpecies: (genus: string) => void
  toggleAllSpecies: () => void
  setSpeciesDropdownOpen: (open: boolean) => void
  disabled: boolean
}

const SpeciesFilter = ({
  selectedSpecies,
  availableSpecies,
  speciesDropdownOpen,
  toggleSpecies,
  toggleAllSpecies,
  setSpeciesDropdownOpen,
  disabled,
}: Props) => {
  const dropdownId = useId()

  useEffect(() => {
    if (disabled && speciesDropdownOpen) {
      setSpeciesDropdownOpen(false)
    }
  }, [disabled, speciesDropdownOpen, setSpeciesDropdownOpen])

  return (
    <div className="species-filter">
      <button
        onClick={() => setSpeciesDropdownOpen(!speciesDropdownOpen)}
        style={{ padding: '5px 10px', cursor: 'pointer' }}
        disabled={disabled}
        aria-disabled={disabled}
        aria-expanded={speciesDropdownOpen}
        aria-controls={dropdownId}
      >
        Species ({selectedSpecies.length}/{availableSpecies.length}) ▾
      </button>
      <div
        id={dropdownId}
        className={`species-dropdown ${speciesDropdownOpen ? 'open' : ''}`}
        aria-hidden={!speciesDropdownOpen}
      >
        <label
          className="species-checkbox"
          style={{
            fontWeight: 'bold',
            borderBottom: '1px solid #ccc',
            paddingBottom: '5px',
          }}
        >
          <input
            type="checkbox"
            checked={selectedSpecies.length === availableSpecies.length}
            onChange={toggleAllSpecies}
            disabled={disabled}
            aria-disabled={disabled}
          />
          Select All
        </label>
        {availableSpecies.map((genus) => (
          <label key={genus} className="species-checkbox">
            <input
              type="checkbox"
              checked={selectedSpecies.includes(genus)}
              onChange={() => toggleSpecies(genus)}
              disabled={disabled}
              aria-disabled={disabled}
            />
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                backgroundColor: treeColors[genus],
                marginRight: '5px',
                border: '1px solid #000',
              }}
            ></span>
            {genusDisplayNames[genus] || genus}
          </label>
        ))}
      </div>
    </div>
  )
}

export default SpeciesFilter
