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
        {availableSpecies.map((genus) => {
          const isChecked = selectedSpecies.includes(genus)
          const genusColor = treeColors[genus]
          const checkmarkColor = '#ffffff' // White for contrast; compute dynamically if needed

          return (
            <label
              key={genus}
              className="species-checkbox inline-flex items-center cursor-pointer select-none"
              style={{ paddingLeft: '20px', position: 'relative' }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleSpecies(genus)}
                disabled={disabled}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0,
                }}
                aria-disabled={disabled}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  backgroundColor: isChecked ? genusColor : '#f8f9fa', // Colored when checked
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s ease',
                  boxShadow: isChecked ? 'inset 0 0 0 1px rgba(255,255,255,0.2)' : 'none',
                }}
              >
                {isChecked && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: checkmarkColor,
                      textShadow: '0 0 1px rgba(0,0,0,0.5)',
                    }}
                  >
                    ✓
                  </span>
                )}
              </span>
              <span style={{ marginLeft: '8px' }}>{genusDisplayNames[genus] || genus}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default SpeciesFilter
